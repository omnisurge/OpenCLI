# ADR 0009：发布 1.8.8-omnisurge.6

- 状态：Proposed（2026-11-20；所有者授权发 .6；待构建、门禁与独立审查）
- 日期：2026-11-20
- 关联：ADR 0008（.5 本地/私有发行）、ADR 0003（embedded runtime contract）、ADR 0007（Omni CLI 品牌；技术身份不变）
- 授权：所有者 2026-11-20 明确说“现在先发 .6 版本”；范围是本地/私有 .6 发行，不含全局安装、npm 发布、推送标签或生产部署

## 背景

.5 已按 ADR 0008 作为本地/私有版本发行，但其 tgz 内的 package-lock 仍是旧依赖（turndown 7.2.2 / ws 8.21.0）。之后按 supervision-assistant ADR0048 裁决一完成 fork lockfile reconcile，并新增 src/dependency-lock.test.ts 回归测试，提交为 9d7752e8。

.6 需要成为第一个把已批准依赖锁（turndown 7.2.4 / ws 8.22.0）原生带入 fork 产物的版本；.5 的 tag 和 tgz 保持不变，不能被覆盖或重新解释。

## 决策

1. 在同一上游基线 1.8.8 / 24136945 和 release/1.8.8-omnisurge.2 线上发布 1.8.8-omnisurge.6，不更换上游、不 rebase 已发布历史。
2. .6 包含 9d7752e8 的 lockfile reconcile、src/dependency-lock.test.ts 回归测试和对应证据；package.json/package-lock.json 版本均为 1.8.8-omnisurge.6。
3. 保持 name=@jackwener/opencli、private=true；不发布 npm，不改变 bin/import/package 身份；品牌仍按 ADR 0007 使用 Omni CLI 展示名。
4. 产物只放本地私有发行目录：~/Omnisurge/releases/opencli/1.8.8-omnisurge.6/；仓库只记录 SHA、大小、条目数、命令与证据，不放 tgz。
5. .5 的 tag、tgz、SHA 和历史证据保持原样；.6 不自动追认 .4，也不改写 .5。
6. .6 必须先通过 ci:fork:full、clean-tree 打包、依赖 pin 核对、至少包级 --version/list spot check，并由独立 reviewer 审查通过，才能把本 ADR 从 Proposed 改为 Implemented。

## 验收

- 工作区干净；HEAD 是 release/1.8.8-omnisurge.2 上的 .6 版本提交；package.json/package-lock.json 版本均为 1.8.8-omnisurge.6。
- package-lock 的 turndown=7.2.4、ws=8.22.0，SRI 与 supervision-assistant DEPENDENCY_PINS 的对应项一致；新增回归测试通过。
- ci:fork:full 全绿，cli-manifest.json 无漂移，check:genericity 和 check:docs 通过。
- tgz 从干净提交构建；SHA256、字节数、entry 数与 package metadata 记录在 docs/evidence/release-1.8.8-omnisurge.6.md。
- 至少验证包内 --version 与 list 的临时 HOME 运行路径；不安装到全局，不触碰真实 profile。
- 独立 reviewer 对 .6 产物给出 APPROVE 或明确的剩余阻断；未批准不得写 Implemented。
- 保留 .5 与 .4 的回退产物；不得用上游 npm 包或是旧 tgz 覆盖 .6 后假装回退。

## 边界

- 不做全局安装、不发布 npm、不推 v* 标签、不触发上游 release.yml/docs.yml。
- 不把 .6 自动 pin 到产品仓；产品适配器升级和 HOST_VERSION/HOST_COMMIT 更新是下游动作，需产品侧另行处理。
- 本版本只修复 fork lockfile 内容，不承诺产品能力分层、轻量化或品牌技术改名；这些另立 ADR。
- 未验证 Windows/Linux、daemon、真实浏览器 E2E 或真实业务命令时，证据必须写未验。

## 修订记录

- 2026-11-20：Proposed；所有者授权发 .6，记录版本、锁文件修复范围、发布线和验收边界。
