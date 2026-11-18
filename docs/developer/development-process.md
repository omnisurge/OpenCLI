# 开发流程（omnisurge fork）

本页是"怎么做"的运行流程。硬约束见 `AGENTS.md`，文档规则见 [文档体系](documentation.md)，发行步骤见 [Fork 发行与回退](fork-release.md)。

## 1. 角色与责任

| 角色 | 责任 |
|---|---|
| 所有者 | 划定范围；授权发布/安装/破坏性动作；接受或拒绝结果 |
| 实现者 | 变更分级、ADR、实现、验证、证据、PR |
| 独立审查者 | C2/C3 的独立视角；检查范围、证据、回退与未验项；不审查自己的实现 |

没有独立审查的 C2/C3 不得报"发布就绪"；所有者书面豁免必须写进证据。C0/C1 可以由实现者自审，但仍要跑门禁。

## 2. 分支模型

| 分支/标签 | 用途 | 规则 |
|---|---|---|
| `main` | 上游镜像 | 不直接提交 fork 开发；仅用于对照/同步上游 |
| `release/1.8.8-omnisurge.<n>` | fork 发布线（集成分支） | 当前 `release/1.8.8-omnisurge.2`；同一上游基线的后续发行可在该线递增版本，需要并行维护时才切新 `...<n>`；C2/C3 经 PR 进入 |
| `fix/<slug>` / `feat/<slug>` / `docs/<slug>` | 主题分支 | 从当前发布线切；PR 回发布线 |
| `v<version>` 标签 | fork 发行标记 | 仅在**被标记提交**含仓库守卫且所有者授权后创建；见 §7 |

- 上游升级：从新 upstream tag/commit 开新 `release/<upstreamVersion>-omnisurge.1`，不复用旧线、不 rebase 已发布线。
- 提交用 Conventional Commits（`fix(scope): …`、`docs(adr): …`），一个提交只做一件事，fork 补丁保持可单独回退。
- 不 force-push 发布线；不把上游历史与 fork 补丁混成不可拆的提交。

## 3. 变更分级

完整定义见 `AGENTS.md` §3。开工前先定级，并写进 PR/证据：

| 级别 | 典型改动 | ADR | 最小门禁 |
|---|---|---|---|
| C0 | 文档、导航、注释、治理说明 | 规则变化才需要 | `npm run ci:fork:docs` |
| C1 | 测试、内部重构、无外部行为变化 | 有机制取舍才补 | `npx tsc --noEmit` + 目标测试 |
| C2 | 输出/退出码/错误面/cache/公共 API/安全 | **先写 ADR** | `npm run ci:fork` + 真实命令 + 证据 |
| C3 | 版本/打包/发布/上游基线/破坏性变更 | ADR + 所有者授权 | `npm run ci:fork:full` + 发布证据 |

无法判断时按更高一级处理；不要把 C2 写成 C1 逃避 ADR。

## 4. 标准循环

### 4.0 范围与契约

- 读 `AGENTS.md`、相关 ADR、目标文件与测试。
- 记录：目标上游版本/commit、用户路径、受影响命令、预期行为、明确不做的部分。
- 用只读命令核对事实：

```bash
git rev-parse --abbrev-ref HEAD
git log --oneline -5
git show origin/main:package.json | head -20
opencli --version
```

### 4.1 ADR（C2/C3）

- 从 [ADR 模板](../adr/template.md) 复制为 `docs/adr/<下一个编号>-<slug>.md`，状态先写 `Proposed`。
- 背景写症状与机制（可附代码行号/命令输出摘要），决策写选型与不做的部分，验收写可证伪的口径，边界写不改什么。
- 更新 [ADR 索引](../adr/index.md) 与最大编号；跑 `npm run check:adr`。
- ADR 先于代码；实现中若发现决定不成立，停手改 ADR 再继续，不"先改完再补文档"。

### 4.2 实现

- 从发布线切主题分支；只改本批清单内文件，fork 补丁保持最小。
- 新增/修改工作流、缓存协议、错误出口等 fork 补丁时，在 `package.json` 的 `opencliFork.patches` 加稳定名称。
- 代码与测试同批提交；不把根 `dist/` 生成物入库，不手改 `cli-manifest.json`。
- 依赖升级与 lockfile 同批提交；先 `npm ci`，再跑 full gate；不引入未审计的安装脚本或新源。

### 4.3 验证

- 按 §5 的矩阵跑最小充分集；提交 PR 前至少跑 `npm run ci:fork`（文档-only 用 `ci:fork:docs`）。
- 真实路径：跑至少一条实际 `opencli` 命令；浏览器/daemon/扩展路径跑 E2E 或明确写未验。
- 失败先定位：不得改断言、删测试、刷 baseline 或绕过门禁。
- 记录命令、版本、输出摘要、未验项与风险；未验不能写成"应该没问题"。

### 4.4 证据

C1/C2/C3 在 `docs/evidence/` 新建本批文件（模板见 [evidence/template.md](../evidence/template.md)）；C0 可在 PR 记录 docs gate 结果，不强制文件。

- 至少包含：范围、分支与 commit、变更级别、ADR 链接（或 `adr: none — 原因`）、门禁结果、真实 spot check、未验边界、回退、结论。
- 冻结后不改写；后续批次新建文件。

### 4.5 独立审查（C2/C3）

审查者按 §6 清单看，不只看测试是否绿。阻断项未处置不得合并/发布。

### 4.6 合并与发布

- PR 回发布线；合并后保留 fork 补丁的可回退性。
- C3/发行批次按 [fork-release.md](fork-release.md) 执行；发布另需所有者授权。

## 5. 验证矩阵

| 改动类型 | 最小本地门禁 | 额外要求 |
|---|---|---|
| C0 文档 | `npm run ci:fork:docs` | ADR/证据链接有效；sidebar/索引入口已接 |
| C1 内部实现 | `npx tsc --noEmit` + 目标 `npx vitest run <file>` | PR 前补 `npm run ci:fork` |
| C2 CLI 行为/输出 | `npm run ci:fork` + 目标测试 | 至少一条真实命令；证据 |
| 适配器/清单 | `npm run build` + `git diff --exit-code HEAD -- cli-manifest.json` + `npm run test:adapter` | 列投影/ID 规则按需跑 check 脚本 |
| 核心通用性 | `npm run check:genericity` | `src/` 只放通用运行时；下游专名/私有域名/凭据假设必须留在 adapter/host |
| 浏览器/daemon/扩展 | 对应 unit + `npm run test:e2e`（或 headed 手验） | 无法跑时写未验、原因、风险 |
| 工作流/发布配置 | YAML/语法检查 + `npm run check:docs`（涉及文档时） | 不得触发上游发布链 |
| 发布批次 | `npm run ci:fork:full` | 打包/安装/回退证据 + 所有者授权 |

- `npm run ci:fork` = `npx tsc --noEmit` + `npm run check:genericity` + `npm run check:docs` + unit project。
- `npm run ci:fork:full` = 快速门禁 + `npm run build` + manifest 漂移 + 两个 baseline 检查 + `npm test`。
- `npm run ci:fork:docs` 只跑文档门禁；不能替代代码门禁。

## 6. 审查清单

- [ ] 变更级别正确；C2/C3 有 ADR 且已索引/状态正确。
- [ ] 范围只含本批清单；fork 补丁最小、可单独回退；未顺带重构上游。
- [ ] 测试覆盖症状与边界；没有删断言/放宽断言/刷 baseline。
- [ ] 门禁结果真实；manifest 未漂移；真实路径有 spot check 或明确未验。
- [ ] 文档同批更新；ADR/证据链接有效；sidebar/索引已接；无死链/孤儿页。
- [ ] 未改变分发身份（name/private/repository）；未尝试 npm 发布/上游发布链。
- [ ] 无秘值/真实数据；错误输出已脱敏。
- [ ] 回退方法可执行；未验边界与风险写明。
- [ ] PR 模板检查项逐项确认。

阻断项：门禁失败、缺证据、秘值、manifest 手改/漂移、分发身份变化、未处置的审查意见、声称"已根治"但只有止血。

## 7. Fork CI 现状

| 工作流 | 触发 | 对当前 fork 线的意义 |
|---|---|---|
| `ci.yml` | push/PR 到 `main`、`dev` | 继承上游；`release/*` 提交不触发 |
| `doc-check.yml` | PR 到 `main`、`dev` | 同上；文档门禁需本地跑 |
| `e2e-headed.yml` | push `main`/`dev`、`v*` tag、每日 | release 分支 push 不触发；`v*` tag 会触发（只跑测试） |
| `release.yml` | `v*` tag | **上游发布链**；fork 推送标签前，被标记提交必须含仓库守卫且所有者授权 |
| `docs.yml` | push `main` 的 docs 路径 | 只 dispatch 上游站点；fork 无文档部署 |
| `fork-ci.yml`（本仓新增） | 非 `main`/`dev` 的 push/PR；`release/*` push 与 `v*` tag 跑 full | 其他分支跑快速门禁；release/tag 跑 `ci:fork:full`；本地 `ci:fork` 是权威补充 |

GitHub Actions 在 fork 上是否启用/可用不作为唯一保证；**本地门禁 + 证据**才是交付依据。

## 8. 热修

- 定义：线上/使用中的阻断问题，需缩短流程。
- 允许：最小修复 + 目标测试 + 真实 spot check；同批记录证据。
- 必须：24 小时内补 ADR（若涉及 C2 决定）与完整验证；写明未闭合项、回退、后续任务。
- 禁止：用"热修"跳过 ADR/证据/审查长期化；禁止把止血写成根治。

## 9. 完成定义（DoD）

- [ ] 验收口径来自 ADR/任务，且逐条有证据。
- [ ] 适用门禁全绿；失败已调查，非绕过。
- [ ] 真实路径已验，或未验项有原因/风险/后续。
- [ ] 文档、ADR、证据同批更新并接入索引/sidebar。
- [ ] 独立审查（C2/C3）完成；阻断项清零。
- [ ] 无秘值/真实数据；分发身份未变；回退可执行。
- [ ] PR 描述包含级别、命令、未验项与回退。

## 10. 常见反模式

- 拿上一次绿测/旧 SHA 当本批证据。
- 手改 `cli-manifest.json` 或 baseline 让门禁变绿。
- 只跑 docs build 就宣称代码可发布，或只跑单测就宣称真实路径可用。
- 为过审删测试/改断言/吞异常。
- 在 fork 里执行 npm publish、推 `v*` 标签或 dispatch 上游站点。
- 把"应该可以"写成"已验证"。
- 文档留在工作区不入库、不接 sidebar、不进索引。
