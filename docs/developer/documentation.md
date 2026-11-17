# 文档体系与写作规则（Docs Map）

本页是 omnisurge fork 的**文档地图与唯一写作规则**。判断"该改哪一份"先看本页；通用开发约束在 `AGENTS.md`，具体流程在 [开发流程](development-process.md)，决定与验收分别进 ADR/证据。**同一事实只在一个权威位置维护**，其他页只链接，不复制。

## 1. 入口

| 文档 | 作用 |
|---|---|
| `AGENTS.md` | 通用开发规则与硬约束（项目章程） |
| `docs/developer/development-process.md` | 端到端开发流程、分支、验收矩阵、完成定义 |
| `docs/developer/documentation.md` | 本页：文档分层、写作规则、VitePress 机制、文档门禁 |
| `docs/developer/fork-release.md` | fork 打包、安装、验证、回退运行手册 |
| `docs/developer/testing.md` | 测试结构、命令与本地验证策略 |
| `docs/developer/contributing.md` | 上游贡献指南 + fork 约束指针 |
| `docs/adr/index.md` | 架构决策索引、编号与状态规则 |
| `docs/evidence/index.md` | 验收/发布证据索引与冻结规则 |
| `CONTRIBUTING.md` | 上游贡献指南基线（fork 额外约束见 AGENTS） |
| `TESTING.md` | 测试分层与运行命令基线 |

## 2. 分层

| 层 | 目录 | 回答的问题 | 生命周期 | 权威性 |
|---|---|---|---|---|
| 指南 guide | `docs/guide/`、`docs/advanced/`、`docs/adapters/` | 怎么用、怎么接站点 | 就地修订 | 当前用法 |
| 开发者 developer | `docs/developer/` | 当前流程、架构、测试、文档规则 | 就地修订 | 当前流程 |
| 约定 conventions | `docs/conventions/` | 跨适配器的命名/ID/审计规则 | 就地修订 | 当前约定 |
| 决策 ADR | `docs/adr/` | 为什么这么定 | **只追加，不改写** | 决策记录 |
| 证据 evidence | `docs/evidence/` | 这一批实际跑过什么 | **冻结** | 验收事实 |
| 设计/计划 | `docs/design/`、`docs/superpowers/` | 当时的设计与计划 | 只读参考 | 非当前事实 |
| 中文镜像 | `docs/zh/` | 上游英文页的部分中文版 | 跟随上游 | 允许滞后/部分 |
| 首页 | `docs/index.md`、`docs/comparison.md` | 对外介绍 | 就地修订 | 当前介绍 |

设计稿与计划不是当前契约：实现前以代码、目标上游版本与 spec/guide 为准；旧设计只用于追溯。

## 3. 放哪一份

1. 要改变"必须怎样"（契约、不变量、安全边界）→ 改对应 guide/developer/conventions 页；若存在多个可行方案且选定一个，再补 ADR。
2. 要记录"为什么选这个方案"→ 新增 `docs/adr/NNNN-*.md`，并在 [ADR 索引](../adr/index.md) 登记。
3. 要写"怎么操作"（安装、发布、排障）→ 改 `docs/guide/` 或 `docs/developer/fork-release.md`。
4. 要交一批的验收结论 → 新增 `docs/evidence/<日期或版本>-*.md`，写在 [证据索引](../evidence/index.md)。
5. 调查完、结论已回灌到 guide/ADR → 设计/计划页可留在 `docs/design/` 或 `docs/superpowers/` 作历史参考；**不要把未回灌的结论当当前事实**。
6. 只改措辞/导航/链接 → C0 文档变更；仍要跑 `npm run check:docs`。

## 4. ADR 规则

完整规则与索引见 [docs/adr/index.md](../adr/index.md)，模板见 [docs/adr/template.md](../adr/template.md)。

- 一决策一文件；文件名 `NNNN-kebab-title.md`；标题 `# ADR NNNN：…`；编号在**本仓**连续递增。
- 状态只用 `Draft | Proposed | Accepted | Implemented | Superseded | Rejected`；C2/C3 决策先 `Proposed` 再实现。
- 必填结构：状态、背景、决策、验收、边界；决定被替代时新开 ADR 并标 `Superseded`，不改写旧决定（事实性修订可记"修订记录"）。
- ADR 只写决定与可证伪的验收口径；批次流水、发布 SHA、长测试日志、批次清单写 evidence。为说明症状/机制必须引用的版本号、命令输出摘要可以保留并标为当时快照，详细证据仍放 evidence。
- 引用其他仓决策必须带仓名前缀（如 `supervision-assistant ADR-0045`），不占用本仓编号。
- 新增 ADR 后必须同步索引、"当前最大编号"与 `/adr/` sidebar；门禁会检查文件名、缺号、未索引、标题/状态/结构与 sidebar。

## 5. 证据规则

完整规则见 [docs/evidence/index.md](../evidence/index.md)，模板见 [docs/evidence/template.md](../evidence/template.md)。

- C1/C2/C3 一批/一次发布一文件；C0 可在 PR 记录 docs gate 结果，不强制文件。命名 `YYYY-MM-DD-<slug>.md` 或 `release-<version>.md`。
- 必须写：目标/范围、分支与 commit、变更级别、ADR 链接（或 `adr: none — 原因`）、执行的门禁与结果、真实路径 spot check、未验边界、回退方法、结论。
- 冻结后不改写；新批次新文件。不写秘值、凭据、真实工程数据。
- 证据只证明"跑过什么"；不把旧批次的绿测复制成新批次结论。

## 6. VitePress 机制

- 配置：`docs/.vitepress/config.mts`；站点 base `/docs/`；根 locale 英文，`docs/zh` 为部分中文镜像；本地搜索已启用。
- 页面路由由文件路径决定：`docs/developer/documentation.md` → `/developer/documentation`；目录索引用 `index.md`（`/adr/`、`/evidence/`）。
- **sidebar 是手工维护的**：新增 developer 页或 ADR 页必须同时改 `config.mts`；`scripts/check-docs.mjs` 会拒绝漏接的 developer/ADR 页与 evidence 目录索引。
- `editLink` 与社交链接指向上游 `jackwener/opencli`；fork 未部署自己的文档站点前，不要声称文档已发布。上游 `docs.yml` 只 dispatch 上游站点，fork 不使用。
- 本地构建：`npm run docs:build`；预览：`npm run docs:dev` / `docs:preview`。构建会检查页面链接；sidebar、ADR 页与 evidence index 由 `scripts/check-docs.mjs` 校验，构建失败即门禁失败。
- 死链：VitePress 构建 + `scripts/check-docs.mjs` 双重校验；不要用 `ignoreDeadLinks` 掩盖。

## 7. 新增/修改文档检查清单

1. 选层：按 §3 判断放 guide / developer / conventions / adr / evidence，不新建无归类的顶层目录。
2. 命名：小写 kebab-case；ADR 用四位编号；证据用日期或版本前缀。
3. 链接：相对链接指向真实文件/目录；外部链接用完整 URL；不要写死 `/Users/...` 本机路径。
4. 接入：developer 页与 ADR 页加入 `config.mts` sidebar；evidence 目录索引加入 sidebar，单条证据从 evidence index 链接；治理文档加入本页入口表；适配器页更新 `docs/adapters/index.md` 与 sidebar。
5. 语言：治理文档中文；对外页跟随上游英文；中文镜像只改有人维护的页。
6. 事实：数量/版本改为命令或标注截至日期；改完顺手修正本页附近的过期数字。
7. 门禁：`npm run check:docs`；纯文档改动用 `npm run ci:fork:docs`。
8. 交付：PR 描述写变更级别（C0/C1/C2/C3）、ADR/证据链接、跑过的命令与未验项。

## 8. 保鲜规则

- **不写硬编码数量**：测试文件数、适配器数、版本号会漂移；用 `find … | wc -l`、`opencli list`，或写"截至 YYYY-MM-DD"并附核对命令。
- 每次触碰一页，至少核对本页的版本、命令、相邻链接是否仍成立；不要顺手改无关页制造大 diff。
- 测试/发布类数字以证据文件为准；guide 只写稳定结论。
- 稳定版发布时更新 `CHANGELOG.md`；历史缺口不得编造，补写必须基于 release notes/提交记录。
- 文档漂移是缺陷：发现"文档与代码/命令输出不一致"，按 C0 先修文档或按 C2 开 ADR，不留给下一个人。

## 9. 文档门禁

| 命令 | 检查 |
|---|---|
| `bash scripts/check-doc-coverage.sh --strict` | 每个适配器目录是否有对应文档页 |
| `node scripts/check-docs.mjs` | 文档归类、相对链接、治理页 sidebar/入口、evidence index、ADR 编号/标题/状态/结构/索引/最大编号 |
| `npm run docs:build` | VitePress 构建、页面与 sidebar/链接可用性 |
| `npm run check:docs` | 以上三项的组合 |
| `npm run check:adr` | 仅 ADR 结构与索引（含 `/adr/` sidebar） |
| `npm run ci:fork:docs` | 文档改动的最小本地门禁 |

文档门禁依赖 bash（macOS/Linux/WSL；Windows 用 Git Bash/WSL）。

## 10. 禁止

- 同一规则在两处维护、互相矛盾。
- 孤儿页（构建得到但无 sidebar/索引入口）、死链、指向本机绝对路径的链接。
- 手改 `scripts/*-baseline.json` 让门禁变绿。
- 把草稿/未回灌结论放进 guide 当当前事实。
- 在文档、ADR、证据中写秘值、token、密码、真实用户数据。
- 未部署就声称"文档已上线"，或把上游站点当 fork 站点。
