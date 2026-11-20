# OpenCLI（omnisurge fork）开发规则与指南

本文件是 omnisurge fork 的**唯一通用开发约束入口**。设计、实现、审查、发布前必须阅读；不得只凭上一次绿测或历史 ADR 开工。

- 本文件只保留跨任务适用的规则与稳定边界。当前批次状态、测试数量、发行 SHA、会话授权不写在这里；分别归 `docs/evidence/`、ADR 或任务记录。
- 冲突优先级：**代码与实测 > 目标上游版本的公开契约 > 文档**；安全与凭据边界不因文档放宽。发现文档与事实冲突，先记录并修文档/ADR，再实现。
- 当前任务范围与生产动作以所有者**当前明确授权**为准，不从历史 ADR 或上一轮任务自动继承。

## 1. 项目边界与硬约束

本仓是 [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) 的 omnisurge fork，不是独立上游产品。

| 项 | 值 |
|---|---|
| 上游 remote（`origin`） | `git@github.com:jackwener/OpenCLI.git` |
| fork remote（`fork`） | `git@github.com:omnisurge/OpenCLI.git` |
| 当前上游基线 | `1.8.8` / 上游 commit `24136945`（以 `package.json` 的 `opencliFork` 为准） |
| 当前 fork 版本 | `1.8.8-omnisurge.6`（`package.json`；本地/私有 .6 发行中；安装/发布/标签推送/生产未授权） |
| 当前工作分支 | `release/1.8.8-omnisurge.2`（.6 发行中；.4 代码提交 `fa1e00e9`，修复提交 `f2b034ef`） |
| 当前发布线 | `release/1.8.8-omnisurge.2`；`.6` 在此线发行，安装/标签推送另需授权 |
| fork 独有提交 | 以 `git log --oneline origin/main..HEAD` 为准；补丁清单见 `package.json.opencliFork.patches` |

以上为 2026-11-18 快照；版本/分支以 `package.json` 的 `opencliFork` 与 `git` 为准，变更时同步本表。

1. **不得改变分发身份**：`package.json` 的 `name` 保持 `@jackwener/opencli`，`private: true` 不得删除；不得向 npm 发布；不得把 `repository` 指回上游。
2. **不得运行上游发布链**：`.github/workflows/release.yml` 与 `docs.yml` 只属于上游；fork 推送 `v*` 标签前必须确认**被标记的提交已包含**仓库守卫，且所有者明确授权；守卫未合入或未验证前不得推标签。fork 发行是本地/私有打包，不是 npm 发布。
3. **fork 补丁保持最小**：优先修上游未修的问题，不顺手重构上游文件；改变 CLI 行为、退出码、输出、错误面、缓存协议、公共 API 或工作流的补丁，必须进 ADR/验收记录，并在 `package.json` 的 `opencliFork.patches` 登记稳定名称。
4. **不得重写上游历史**：不 rebase 已发布的 fork 线、不 force-push `release/*`；上游升级开新线，旧线保留可回退。
5. **秘值与真实数据不入库**：凭据、token、密码、用户 profile、真实工程数据一律不进仓库、日志、ADR 或证据文件；需要时只写引用名与非敏感事实。
6. **不执行未授权的生产动作**：不自动安装/替换全局 `opencli`、不重启服务、不碰 NAS/生产环境；发布、安装与回退各自取得所有者授权。
7. **生成物不手改**：根 `dist/` 是构建产物（gitignore；`extension/dist/` 按上游约定单独处理）；`cli-manifest.json` 由 `npm run build` 生成且入库，漂移门禁会拒绝手写或未重建的清单。
8. **上游升级流程**：记录新的 `upstreamVersion`/`upstreamCommit`，从新基线开新 `release/*` 线；重跑本文件 §6 的全部门禁，不把旧线绿测当新基线证明。
9. **核心保持通用**：`src/` 是 OpenCLI 通用运行时，不写下游产品/适配器专名、私有域名或凭据假设；下游改进通过 `clis/`、`OPENCLI_EXTRA_CLIS_DIR` 或宿主 payload 实现。`npm run check:genericity` 是硬门禁，不能为单一产品私有化核心。

## 2. 先确认事实与契约，不猜

- 开工前至少确认：目标上游版本/commit、受影响命令与用户路径、当前安装的 `opencli --version`、相关源码与测试、适用 ADR。
- 上游事实用 `git show origin/main:<path>`、`git describe --tags`、`git log origin/main..HEAD` 等只读命令核对；不要把记忆、旧 ADR 或旧发行包当当前事实。
- 结论必须能落到证据：命令、版本/commit、文件路径、实际输出。不能实际验证的部分写"未验"，并说明原因与风险，不写成"应该没问题"。
- 新行为先查上游是否已修；已修则优先采用上游实现，fork 只保留必要差异。

## 3. 变更分级

| 级别 | 判定 | 例子 | ADR | 证据 |
|---|---|---|---|---|
| C0 | 不改行为、不改契约 | 文档错字、导航、注释、治理说明 | 不需要（除非改变规则） | PR 记录 `ci:fork:docs` 结果（不要求证据文件） |
| C1 | 仅内部实现，外部行为不变 | 测试补充、内部重构、无输出变化的日志整理 | 不需要；有机制性取舍则补 | 证据文件 + 目标单测结果 |
| C2 | 改变用户可见行为/契约 | 退出码、输出格式、错误面、trace、缓存协议、公开 API、安全边界 | **先写 ADR 再改代码** | 验收记录 + 门禁结果 |
| C3 | 改变分发/版本/上游基线 | 版本号、打包、发布、rebase/升级上游、破坏性变更 | ADR + 所有者明确授权 | 发布证据 + 回退验证 |

C2/C3 的 ADR 状态至少 `Proposed`；实施完成并通过验证后改为 `Implemented` 或 `Accepted`（按 `docs/adr/index.md` 的词表）。本批确实没有机制性决定时，在证据文件写 `adr: none — <原因>`，不能沉默跳过。

## 4. 开发流程（强制顺序）

| 阶段 | 必须先有 | 落点 | 说明 |
|---|---|---|---|
| 0 范围与契约 | 目标版本、用户路径、边界、授权 | 任务/证据草稿 | 不确认不开工 |
| 1 ADR | C2/C3 的决定（背景/决策/验收/边界） | `docs/adr/NNNN-*.md` + 索引 | 先写决定，再改代码 |
| 2 实现 | 本批内容清单 | 主题分支 | 只做清单内的事；补丁最小 |
| 3 验证 | 适用的门禁与真实路径 | `docs/evidence/` | 写清命令、结果、未验边界 |
| 4 独立审查 | C2/C3 的独立视角 | PR/审查记录 | 自查不算独立审查；阻断未处置不发布 |
| 5 发布/合并 | 上面四项齐 | fork 打包/PR | 发布另需 §7 授权 |

- 任何阶段失败都先定位原因；不得靠改测试、删断言、刷新 baseline 或绕过门禁变绿。
- 热修可以缩短顺序，但必须在同一批补 ADR（若涉及决定）与证据，并标明未闭合项、回退和后续任务；不得把"止血"报成"根治"。
- 纯 C0 文档变更不需要 ADR，但仍要跑文档门禁并在 PR 描述写明 `C0`。

## 5. 文档规则

文档体系的唯一地图与写作规则见 [docs/developer/documentation.md](docs/developer/documentation.md)。

- **分层**：指南（怎么做）、开发者（流程/架构/测试）、约定（跨适配器规则）、ADR（为什么这么定，只追加）、证据（这一批实际验过什么，冻结）、设计/计划（历史参考）、中文镜像（跟随上游，允许部分覆盖）。
- **同一事实只有一个权威位置**：同一句话不要在两处维护；规则进本文件，流程进 `docs/developer/development-process.md`，文档规则进 `docs/developer/documentation.md`，决定进 ADR，验测结果进 evidence。
- **ADR**：一决策一文件、编号连续、只追加不改写；文件名 `NNNN-kebab-title.md`，标题 `# ADR NNNN：…`，状态取 `Draft | Proposed | Accepted | Implemented | Superseded | Rejected`；必须有背景/决策/验收/边界；索引见 [docs/adr/index.md](docs/adr/index.md)，新增后同步索引与最大编号。ADR 只写决定；批次流水、发布 SHA、长测试日志写 evidence。为说明症状/机制必须引用的版本号、命令输出摘要可以保留，并标为当时快照，详细证据仍放 evidence。
- **证据**：C1/C2/C3 每批一份、每次发布一份，放 `docs/evidence/`；C0 可在 PR 记录 docs gate 结果，不强制文件。冻结后不改写，新批次新建文件；模板见 [docs/evidence/template.md](docs/evidence/template.md)。
- **页面接入**：新增或移动文档时同步 VitePress sidebar、相关索引与链接；治理类文档（developer/adr/evidence）必须在文档地图中登记；不允许孤儿页。
- **不写硬编码数量/版本**：适配器数、测试文件数、版本号容易漂移；改用 `opencli list`、`find … | wc -l` 等命令，或标注"截至 YYYY-MM-DD"并给出核对命令。
- **语言**：VitePress 根为英文、`docs/zh` 为部分中文镜像；本 fork 的治理文档使用中文；对外适配器页优先跟随上游英文，中文镜像只覆盖有人维护的页面，不承诺全量同步。
- **发布态**：本仓 VitePress 可本地构建；`docs.yml` 只 dispatch 上游站点，fork 没有文档托管。未实际部署前不得声称"已上线"。

## 6. 测试与门禁

| 命令 | 覆盖 | 何时跑 |
|---|---|---|
| `npx tsc --noEmit` | TypeScript 类型 | 每次代码改动 |
| `npm run build` | 编译 + 生成 `cli-manifest.json` | 代码/适配器/清单改动；发布前 |
| `npm test` | unit + extension + adapter | 共享运行时、适配器、发布前 |
| `npm run test:adapter` | adapter project | 适配器迭代 |
| `npm run test:e2e` | 真实浏览器 E2E（需 Chrome） | 浏览器/daemon/扩展改动 |
| `npm run check:silent-column-drop` | 列静默丢失基线 | 适配器输出改动 |
| `npm run check:typed-error-lint` | 静默失败基线 | 错误处理改动 |
| `npm run check:docs` | 文档覆盖 + 链接/归类/sidebar/evidence/ADR + VitePress 构建 | 任何文档改动 |
| `npm run check:adr` | 仅 ADR 索引/结构/sidebar | ADR 改动 |
| `npm run check:genericity` | `src/` 不得出现下游专名/私有域名/凭据假设 | 核心代码/测试改动 |
| `npm run ci:fork` | tsc + 通用性 + docs + unit（快速门禁） | 日常提交前 |
| `npm run ci:fork:full` | 快速门禁 + build/manifest/约定基线与 `npm test` | 发布前 |
| `npm run ci:fork:docs` | 仅文档门禁 | C0 文档改动 |

- 本仓没有独立的 lint/format 脚本；格式以现有代码风格与 review 为准。不要为了“统一格式”引入新工具链或全仓重排，除非有 ADR 与本批证据。
- fast gate 是默认本地门禁；`ci:fork:full` 是发布门禁。二者不互相替代，也不替代真实命令 spot check。
- 构建后必须核对 `git diff --exit-code HEAD -- cli-manifest.json`；清单漂移先重建并提交，不能手改。
- baseline 文件（`scripts/*-baseline.json`）只有在有意清理存量时更新，并在证据中写明新增/删除的规则与理由。
- 真实路径验证：非浏览器行为至少跑一条真实命令；浏览器/daemon/扩展改动跑对应 E2E 或明确写"未验"。E2E 受地域/登录/反爬影响时，按 TESTING.md 的 warn/pass 口径记录，不伪造绿。
- 所有非零退出必须逐条调查；不得忽略、吞掉或改代码绕过。

## 7. Fork 发布与回退

完整步骤见 [docs/developer/fork-release.md](docs/developer/fork-release.md)。

- 发布前提：所有者明确授权、工作区干净、`ci:fork:full` 通过、证据文件已写、版本线正确。
- 版本：`1.8.8-omnisurge.<n>` 递增 `n`；上游基线变化时开新线，不把旧线版本号复用。
- 打包：`npm run build` → 核对 `cli-manifest.json` → `npm pack` 生成 tgz；SHA256 与命令写入 `docs/evidence/release-<version>.md`。
- 安装与验证：从 tgz 安装到受控前缀/全局（取得授权后），核对 `opencli --version`、`opencli list` 与至少一条业务命令；记录安装前后版本。
- 回退：保留上一版 tgz，重装并核对版本与关键命令；不得用上游 npm 包覆盖 fork 后假装回退。
- 标签：被标记的提交必须包含 `.github/workflows/release.yml` 的仓库守卫，且所有者授权后才推送 `v*` 标签；推送前用 `git show <tag/commit>:.github/workflows/release.yml` 核对，否则只保留本地打包与证据。
- 不运行上游 `release.yml`、不发布 npm、不触发上游 website dispatch。

## 8. 分支、提交与 PR

- `main` 是上游镜像，不直接在其上提交 fork 开发。
- 日常从 `release/<upstreamVersion>-omnisurge.<n>` 切 `fix/<slug>` / `feat/<slug>` / `docs/<slug>`；PR 回到该发布线，合并后再做发布批次。
- 提交使用 Conventional Commits，scope 用站点或模块名（如 `fix(update-check): …`、`docs(adr): …`）。
- PR 描述写清变更级别、ADR/证据链接、跑过的命令、未验边界；PR 模板的检查项必须逐项确认。
- 不 force-push 发布线；不把上游历史与 fork 补丁混在一个不可回退的提交里；补丁提交保持可单独 cherry-pick/回退。

## 9. 最小记录模板

每批 C1/C2/C3 变更在证据文件至少回答：

~~~text
目标/范围：
分支与 commit：
变更级别：
ADR（C2/C3 必填；无则 adr: none — 原因）：
变更清单：
执行的门禁与结果：
真实路径 spot check：
未验边界与风险：
回退方法：
结论（不超出证据）：
~~~

完整模板见 [docs/evidence/template.md](docs/evidence/template.md)。

## 10. 执行纪律

- 先读本文件与相关 ADR/证据，再动手；不凭记忆改行为。
- 不猜 API/不猜上游行为；查不到就记录未验，不用"应该"。
- 不把旧绿测、旧包 SHA、别人的环境当当前证据。
- 不写秘值、不读真实凭据、不碰生产 profile/NAS；发布/安装/重启各自授权。
- 不自动执行破坏性动作；失败先调查，禁止用重试、吞异常或放宽断言掩盖。
- 文档与代码同批更新；文档改动也要跑文档门禁。

## 11. 维护

- 通用规则变化只改本文件；具体流程改 `docs/developer/`，决定补 ADR，验测写 evidence。改完跑 `npm run check:docs`。
- ADR 编号只在本仓连续递增；引用其他仓的决策必须带仓名前缀（如 `supervision-assistant ADR-0045`），不占用本仓编号。
- 每次新增/修改规则，检查文档地图、ADR 索引、sidebar 与最大编号是否同步；不允许靠记忆维护。
