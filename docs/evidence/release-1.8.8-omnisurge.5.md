# 1.8.8-omnisurge.5 本地/私有发行证据

- 状态：候选（独立审查通过前不构成发版批准）
- 分支：release/1.8.8-omnisurge.2
- 代码基线：f2b034ef（.4 代码 fa1e00e9 + extra dir/genericity 修复）；.5 准备提交见下方“版本提交”
- 变更级别：C3（版本/打包）；继承 C2 修复
- ADR：ADR 0008（.5 发布）；ADR 0003 的两项缺口修复
- 授权：所有者 2026-11-18 明确“走.5吧”；范围仅本地/私有 .5 候选，不含安装/npm/标签/生产
- 产物：待构建（本次发布目录：~/Omnisurge/releases/opencli/1.8.8-omnisurge.5/）

## 目标与范围

从干净的 .5 提交构建 fork 包，承载 .4 审查发现的两项修复与通用性门禁；不改变上游基线，不改分发身份，不把 .5 自动 pin 到产品仓。

## 变更清单

- package.json / package-lock.json：1.8.8-omnisurge.5
- ADR 0008：.5 发布决定与授权边界
- 继承 f2b034ef：ADR 0003 extra dir 可见性修复、src 通用性门禁、.4 审查记录
- 本文件：artifact SHA/大小/entry、门禁、spot check、未验边界

## 门禁（构建后回填）

- 待运行：npm run ci:fork:full
- 待运行：npx tsc --noEmit（已含于 full）
- 待运行：npm run check:genericity
- 待运行：npm run check:docs / check:adr
- 待运行：git diff --exit-code HEAD -- cli-manifest.json
- 待运行：npm pack 与 SHA256

## 真实路径 spot check（构建后回填）

- 待运行：解包/受控路径运行 --version、list；不安装全局，不读真实 profile。

## 未验边界与风险

- 独立审查尚未进行；未审查前 ADR 0008 保持 Proposed。
- 未做全局安装、未发布 npm、未推标签、未触碰 NAS/生产。
- Windows/Linux、真实浏览器 E2E、真实业务命令未由本批证明。
- .4 冻结产物不变；.5 不自动追认 .4。

## 回退方法

- 保留 .4 的 tgz 与 SHA；若 .5 不可用，重新使用 .4 包并记录版本/命令，不覆盖历史证据。
- 源码回退到 f2b034ef 或 .4 代码提交 fa1e00e9；不得用上游 npm 包假装回退。

## 结论

候选准备中；只有本文件回填 artifact 与独立审查 APPROVE 后，才能把 ADR 0008 标为 Implemented/Accepted。
