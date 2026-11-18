# 验收与发布证据

本目录保存 omnisurge fork 的批次验收与发行证据。**证据回答"这一批实际跑过什么"，不回答"打算怎么做"**；设计与决定分别进 guide/ADR。

## 规则

1. **C1/C2/C3 一批一文件**：`YYYY-MM-DD-<slug>.md` 或 `release-<version>.md`；新批次新建文件。C0 可在 PR 记录 docs gate 结果，不强制文件。
2. **冻结**：验收/发布完成后不改写；后续批次追加新文件，不覆盖旧结论。
3. 必须写：目标/范围、分支与 commit、变更级别、ADR 链接（C2/C3 必填；无则 `adr: none — 原因`）、执行的门禁与结果、真实路径 spot check、未验边界与风险、回退方法、结论。
4. **只写证据，不写秘值**：凭据、token、密码、真实用户/工程数据、完整环境变量值一律不进证据。
5. 结论不得超出证据：没跑过的路径写"未验"，不写"应该可用"；失败也保留，不美化。
6. 证据是发布/合并的依据之一；没有证据的 C1/C2/C3 不算完成，C0 至少要在 PR 记录门禁结果。

## 索引

| 文件 | 范围 | 日期 |
|---|---|---|
| [2026-11-17-docs-governance.md](2026-11-17-docs-governance.md) | omnisurge fork 文档治理、门禁与发布守卫 | 2026-11-17 |
| [2026-11-17-fork-update-notifier.md](2026-11-17-fork-update-notifier.md) | fork 分发版不输出上游升级提示 + 通用 opt-out | 2026-11-17 |
| [2026-11-17-embedded-runtime.md](2026-11-17-embedded-runtime.md) | 嵌入式运行时契约、状态根、extra dir、embedded 诊断 | 2026-11-17 |
| [release-1.8.8-omnisurge.3.md](release-1.8.8-omnisurge.3.md) | 1.8.8-omnisurge.3 本地/私有发行包 | 2026-11-17 |
| [release-1.8.8-omnisurge.4.md](release-1.8.8-omnisurge.4.md) | 1.8.8-omnisurge.4 本地/私有发行包（嵌入式契约） | 2026-11-17 |
| [2026-11-18-release-4-independent-review.md](2026-11-18-release-4-independent-review.md) | 1.8.8-omnisurge.4 独立发版审查（BLOCK） | 2026-11-18 |
| [2026-11-18-embedded-extra-dir-genericity.md](2026-11-18-embedded-extra-dir-genericity.md) | extra dir 验收修复与 fork 通用性门禁 | 2026-11-18 |

## 模板

[template.md](template.md)
