# ADR 0006：发布 1.8.8-omnisurge.4

- 状态：Implemented（2026-11-17；本地/私有 tgz 已生成并验收；安装与标签未授权；见 docs/evidence/release-1.8.8-omnisurge.4.md）
- 关联：ADR 0003（嵌入式运行环境契约）、ADR 0004（宿主内嵌交付契约）、ADR 0005（命名与技术标识）；ADR 0002（.3 发布先例）
- 变更级别：C3（版本、打包、发行证据；不发布 npm、不运行上游 workflow、不安装）

## 背景

.3 已作为 fork 更新提示修复的本地/私有 tgz 冻结；ADR 0003 的内嵌运行时契约在 .3 之后实现，需要新的 fork 版本承载。supervision-assistant ADR 0048 需要 pin 一个已验收的 fork 版本；.4 是该 pin 候选。

本批不改变上游基线（1.8.8 / 24136945），不改变包名、bin、exports 或 repository；不把 .4 安装到全局，也不发布 npm。

## 决策

1. 版本线：1.8.8-omnisurge.3 -> 1.8.8-omnisurge.4；上游基线保持 1.8.8 / 24136945。
2. 内容：
   - ADR 0003 的嵌入式运行时契约实现：OPENCLI_HOME、OPENCLI_EXTRA_CLIS_DIR、OPENCLI_EMBEDDED；
   - extra dir 的失败处理/模块解析契约（宿主义务）与 doctor/daemon 的 embedded 提示；
   - ADR 0003/0004/0005 文档、索引与 sidebars；
   - 对应单测、真实路径验收与 evidence。
3. 发行物：npm tgz（本地/私有）1.8.8-omnisurge.4；不得覆盖或替换 .3 tgz。
4. 不安装到全局；不 npm publish；不打 tag；不运行上游 release/docs workflow。
5. 产品消费（payload/opencli-runtime、payload/sccs-adapter、adapter peer pin .4）属于 supervision-assistant ADR 0048 阶段 2-5，不在本 ADR 内宣称完成；产品侧需单独授权/证据。
6. 版本 bump 前必须：
   - 完成 ADR 0003 的验收，npx tsc --noEmit、目标单测、npm run ci:fork:full 通过；
   - npm run build 后核对 cli-manifest.json 无漂移；
   - npm run check:adr / check:docs 通过；
   - 证据文件 release-1.8.8-omnisurge.4.md 落盘并记录 SHA256、大小、条目数、未验边界。
7. 回退：保留 .3 tgz 与 SHA；.4 不覆盖 .3；若产品 pin 回退，按 ADR 0004 改回上一对 pin 重发产品 release。

## 验收

- tgz 内 package.json version=1.8.8-omnisurge.4、private=true、opencliFork.upstreamVersion/upstreamCommit 未变、patches 含 embedded-runtime-contract。
- 包内 --version 返回 .4；--help/list 可运行；无全局安装也能用临时 runtime 布局运行（依赖由临时 node_modules 提供时）。
- 真实路径：临时 HOME/OPENCLI_HOME、无全局 opencli、无 ~/.opencli，跑 --version/--help/list，状态只落 OPENCLI_HOME；embedded 无 update 缓存/上游提示。
- 产物 SHA256、大小、条目数与 evidence 一致；.3 产物未被覆盖。

## 边界

- 不验证 Windows/Linux、真实 daemon/extension、SCCS 真实平台登录/业务写入；这些写未验。
- 不验证产品 payload 组装/调用接线/E2E；由产品 ADR 0048 阶段 2-5 负责。
- 不改变技术标识（ADR 0005）；不采用 Surge CLI/Omni CLI 作为 .4 的包名/bin。
- 不发布 npm、不推送 tag、不运行上游 workflow。

## 修订记录

- 2026-11-17：Proposed；.4 发布范围、门禁、证据与回退。
