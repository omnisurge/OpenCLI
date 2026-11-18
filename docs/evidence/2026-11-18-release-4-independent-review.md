# 1.8.8-omnisurge.4 独立发版审查（2026-11-18）

- 审查对象：omnisurge/OpenCLI fork 的 1.8.8-omnisurge.4，只审 OmniCLI 自身
- 审查者：独立只读 release-reviewer（不是实现者；本次审查不是历史已有批准）
- 审查时 HEAD：95bdbccf，.4 代码提交 fa1e00e9
- 审查方式：只读检查仓库 ADR/证据、git 历史、tgz/SHA/package 元数据；未安装、未发布、未推标签
- 结论：**BLOCK**

## 审查前是否存在发版批准

没有。.4 的 release evidence 与 embedded evidence 均无独立审查记录；此前的 c2-reviewer 只覆盖 .3 的 update-notifier C2，governance-reviewer 只覆盖 C1 文档治理。本次是第一个覆盖 .4 的独立审查，不能倒推为“之前已有批准”。

## 阻断项

| 级别 | 发现 |
|---|---|
| P0 | 审查前无独立 C3 发版批准；仓库内无可核验的所有者发版授权记录 |
| P1 | .4 来自 feat/embedded-runtime-contract，未合入发布线，无 PR/合并记录 |
| P1 | ADR 0003 两项验收未落实：flat .js 在存在 site 目录时静默忽略；不可读 site 会拖垮整个 extra dir |
| P2 | ADR 0003/0006 状态与修订记录不一致；tgz 在 commit 前打包，build provenance 不能仅靠 git 复现；干净 install/回退未实际验证 |
| P2 | 证据写“无全局 opencli”，实际全局仍为 .2；应写“调用/路径未使用全局 opencli” |
| Info | ADR 0004 仍 Proposed 不是 .4 阻断，属宿主产品消费面；.4 不能作为产品端到端已完成证明 |

## 技术产物核对

- SHA256SUMS 通过；tgz 2,299,793 bytes、1,678 entries。
- 包内 package.json 的 version/private/opencliFork/patches 与证据一致。
- 1,460 个 tracked 文件匹配 fa1e00e9；218 个 dist/ 文件匹配当前构建；cli-manifest.json 1,366 条且无漂移。
- 结论：包本身没有发现版本/SHA/元数据错包，但“技术包验证”不等于“C3 发版批准”。

## 处置

阻断项未清零前，不得把 .4 报为发版批准或安装就绪。代码修复（ADR 0003 两项）另见 [extra-dir/genericity evidence](2026-11-18-embedded-extra-dir-genericity.md)；.4 已冻结，修复需新版本候选或所有者书面豁免。

## 修复复审（2026-11-18）

- 同一 release-reviewer 对工作区修复做只读复审：结论 FIX_VERIFIED_WITH_REMAINING_RELEASE_BLOCKERS。flat .js 告警、不可读 site 隔离已核实；定向测试 6/6、tsc、check:genericity、check:adr 通过。
- 复审指出不可读 site 用例缺正向加载断言、通用性门禁覆盖范围需要澄清；两项已在工作区补强（getRegistry 正向断言、src 全文本扫描 207 文件）。
- .4 冻结包未重打，仍不能作为发版批准；剩余 C3 事项见修复证据与本节结论。

## 边界

审查未重跑全量测试；全量门禁结果引用 .4 证据与修复证据。未安装、未发布、未推标签、未修改源码。
