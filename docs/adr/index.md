# 架构决策记录（ADR）

本目录保存 omnisurge fork 的持久决策。**ADR 记录"为什么这么定"，不记录批次流水、发布 SHA 或长测试日志**；这些写 `docs/evidence/`。为说明症状/机制必须引用的版本号、命令输出摘要可以保留，并标为当时快照，详细证据仍放 evidence。

## 规则

1. **一决策一文件**：文件名 `NNNN-kebab-title.md`，编号在**本仓**连续递增（从 `0001` 起，不跳号、不复用）。
2. 标题格式固定为 `# ADR NNNN：<一句话决策>`；正文必须有 `## 背景`、`## 决策`、`## 验收`、`## 边界` 四节。
3. 首行元数据必须有 `- 状态：<Status>（YYYY-MM-DD…）`，状态取 `Draft | Proposed | Accepted | Implemented | Superseded | Rejected`。
4. **只追加，不改写决定**：决定被替代时新增 ADR 并标 `Superseded`，旧文件保留；事实性修订可加 `## 修订记录`，不得改写历史结论。
5. C2/C3 变更先写 `Proposed` ADR，再改代码；实施并验证后可改为 `Implemented`/`Accepted`。
6. 引用其他仓决策必须带仓名前缀（如 `supervision-assistant ADR-0045`），不占用本仓编号。
7. 新增后必须更新本索引、文末"当前最大编号"，并在 `docs/.vitepress/config.mts` 的 `/adr/` sidebar 加条目；`npm run check:adr` 会检查文件名、缺号、未索引、标题/状态/结构、sidebar 不符。
8. 模板见 [template.md](template.md)；模板不占编号，不进入索引。

## 状态词表

| 状态 | 含义 |
|---|---|
| Draft | 草案，尚未提交决策 |
| Proposed | 已提出、待实施/待批准 |
| Accepted | 已接受，作为当前决策 |
| Implemented | 已实施并通过验收（可与 Accepted 并列说明） |
| Superseded | 已被新 ADR 取代（新 ADR 必须链接） |
| Rejected | 明确不采用，保留理由 |

## 索引

| 编号 | 标题 | 状态 |
|---|---|---|
| [0001](0001-fork-aware-update-notifier.md) | Fork 分发版的更新提示必须可识别、可关闭 | Implemented |
| [0002](0002-release-omnisurge-3.md) | 发布 1.8.8-omnisurge.3 交付 fork 更新提示修复 | Implemented |
| [0003](0003-embedded-runtime-contract.md) | 嵌入式运行环境契约（OPENCLI_HOME / OPENCLI_EXTRA_CLIS_DIR / OPENCLI_EMBEDDED） | Implemented |
| [0004](0004-embedded-host-delivery-contract.md) | 宿主内嵌 OpenCLI 运行时的交付与消费契约 | Proposed |
| [0005](0005-product-naming-and-technical-identity.md) | 产品命名与技术标识（.4 不改名） | Superseded |
| [0006](0006-release-omnisurge-4.md) | 发布 1.8.8-omnisurge.4 | Proposed |
| [0007](0007-omni-cli-brand.md) | 采用 Omni CLI 品牌（powered by Omnisurge） | Accepted |
| [0008](0008-release-omnisurge-5.md) | 发布 1.8.8-omnisurge.5 | Implemented |
| [0009](0009-release-omnisurge-6.md) | 发布 1.8.8-omnisurge.6 | Implemented |
| [0010](0010-runtime-core-dev-tool-boundary.md) | Runtime core 与开发工具共享同一执行内核 | Proposed |
| [0011](0011-runtime-core-package-profile.md) | Runtime core 的发行 profile 与包边界 | Proposed |
| [0012](0012-core-only-candidate.md) | 1.8.8-omnisurge.7 core-only 候选发布 | Superseded |
| [0013](0013-core-version-separation.md) | core-only 正式版本与完整 host 版本分离 | Accepted |

## 当前最大编号

本仓当前最大编号是 `0013`。新增决策从 `0014` 开始。
