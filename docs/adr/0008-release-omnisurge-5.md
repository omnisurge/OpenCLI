# ADR 0008：发布 1.8.8-omnisurge.5

- 状态：Implemented（2026-11-18；本地/私有 .5 正式发行；独立审查 APPROVE；安装/发布 npm/标签推送/生产未授权）
- 日期：2026-11-18
- 关联：ADR 0003（embedded runtime contract）、ADR 0006（.4 发布，未被批准）、docs/evidence/2026-11-18-release-4-independent-review.md
- 授权：所有者 2026-11-18 说“走.5吧”，随后说“那就发版吧”；本 ADR 把后者解释为本地/私有 .5 正式发行，不包含安装、npm 发布、推送标签或生产部署

## 背景

.4 的技术包已生成并核对 SHA，但独立审查给出 BLOCK：没有审查前 C3 批准、.4 未合入发布线、ADR 0003 的 flat .js 与不可读 site 两项验收未落实，且状态/证据存在过度声明。.4 已冻结，不能原地修改。

工作区已在 f2b034ef 修复两项验收缺口，并加入 src 通用性硬门禁；完整 ci:fork:full 通过（638 test files，7,508 passed / 1 skipped）。需要一个新的、从干净提交构建的候选来承载修复。

## 决策

1. 以同一上游基线 1.8.8 / 24136945 发布 1.8.8-omnisurge.5，不更换上游、不 rebase 已发布历史。
2. .5 从 release/1.8.8-omnisurge.2 线构建；该线已 fast-forward 包含 .4 代码与 f2b034ef 修复。
3. 版本只递增 fork 后缀为 .5；保持 name=@jackwener/opencli、private=true，不 npm 发布。
4. 产物只放本地私有发行目录：~/Omnisurge/releases/opencli/1.8.8-omnisurge.5/；仓库只记录 SHA、大小、条目数、命令与证据，不放 tgz。
5. .4 继续作为“技术包已验证、发版未批准”的冻结历史，不由 .5 自动追认；.5 也不自动替代 ADR 0006 对 .4 的结论。
6. .5 必须先通过 ci:fork:full、clean-tree 打包、独立审查和安全 spot check，才能把本 ADR 从 Proposed 改为 Implemented/Accepted；未完成前只能称为候选。

## 验收

- 工作区干净，HEAD 是 release/1.8.8-omnisurge.2 上的 .5 提交；package.json/package-lock.json 版本均为 1.8.8-omnisurge.5。
- ci:fork:full 全绿，cli-manifest.json 无漂移，check:genericity 通过。
- tgz 从干净提交构建；SHA256、字节数、entry 数与 package metadata 记录在 docs/evidence/release-1.8.8-omnisurge.5.md。
- 至少验证 --version 与 opencli list 的包内运行路径；不安装到全局，不触碰真实 profile。
- 独立 reviewer 对 .5 产物给出 APPROVE 或明确的剩余阻断；未批准不得写 Implemented。
- 回退路径保留 .4 tgz 与 .5 tgz；不得用旧 tgz 覆盖 .5 后假装回退。

## 边界

- 不做全局安装、不发布 npm、不推 v* 标签、不触发上游 release.yml/docs.yml。
- 不把 .5 自动 pin 到产品仓；产品适配器升级是下游动作，需另行授权。
- 未验证 Windows/Linux、daemon、真实浏览器 E2E 或真实业务命令时，证据必须写未验，不能把 macOS 单元/包级验证写成全平台证明。
- .4 的冻结产物与历史证据不改写；.5 的结论只覆盖 .5。

## 修订记录

- 2026-11-18：Proposed；所有者授权走 .5，记录范围、构建线、验收和边界。
- 2026-11-18：Accepted；.5 本地/私有候选已独立审查 APPROVE（release-reviewer，包级 P1 复核、SHA/clean build 核对通过）；不追认 .4，不授权安装/发布/标签/生产。
- 2026-11-18：Implemented；所有者“那就发版吧”，.5 转为本地/私有正式发行；仍未安装、未 npm 发布、未推标签、未生产部署。
