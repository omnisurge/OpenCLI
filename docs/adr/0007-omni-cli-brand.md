# ADR 0007：采用 Omni CLI 品牌（powered by Omnisurge）

- 状态：Accepted（2026-11-17，所有者明确决定使用 Omni CLI，英文标语为 powered by Omnisurge）
- 关联：ADR 0005（原命名候选，现由本 ADR 接管品牌决定）；ADR 0006（.4 已冻结，不在本 ADR 改写）；supervision-assistant ADR 0048（产品 payload 的对外显示名）
- 变更级别：C0（只记录品牌决定；实际改名/新 bin 属于后续 breaking C3，不在本批）

## 背景

所有者先询问是否改名，后在 2026-11-17 明确选择：

> Omni CLI（powered by Omnisurge）

此前 ADR 0005 的结论是 .4 保持 OpenCLI，并把 Omni CLI / Omnisurge CLI 作为未来候选。现在品牌决定已经作出，需要把它与 .4 已冻结的技术身份分开记录，避免把“对外品牌”误做成“包名/bin 破坏性改名”。

## 决策

1. **对外品牌**：产品对外显示名为 **Omni CLI**，英文标语为 **powered by Omnisurge**（不是 power by；大小写按此写法）。
2. **.4 不改写**：1.8.8-omnisurge.4 的包名、bin、tgz、SHA256 和证据保持原样；已发布产物不重新打标签、不覆盖，也不假装 .4 已经是 Omni CLI 包。
3. **技术身份暂不变**：当前发布线继续保留 @jackwener/opencli、bin opencli、@jackwener/opencli/* import 路径和 repository；这些是 adapter、skill、宿主 peerDependencies 和产品 pin 的兼容面。
4. **品牌落地位置**：产品界面、文档标题、About/页脚、产品发行说明和产品 ADR 0048 的展示名可以使用 Omni CLI；产品内部 payload 目录仍叫 opencli-runtime，不因显示名改目录。
5. **真正改名另案**：若要让包名/bin/import 也变成 omni，必须另立 breaking ADR，规划 @omnisurge/... 包名、omni/opencli 双 bin、兼容 shim、adapter/skill/宿主迁移、版本线与回退；本 ADR 不授权该动作。
6. **版本节奏**：.4 已冻结；品牌可见化进入下一批产品发行或 fork 的后续版本，不在 .4 上做半改名。

## 验收

- ADR/索引/文档中的品牌写法统一为 Omni CLI（powered by Omnisurge）；不再使用 Surge CLI。
- .4 的 package.json/name/bin/tgz/SHA 与现有证据保持一致；没有新 omni bin、没有 npm publish、没有 tag。
- 产品侧引用本 ADR 时，只改展示名，不改 payload 目录和 pin；技术改名必须引用新的 breaking ADR。

## 边界

- 不做商标/法律检索；正式对外前由所有者完成名称检索。
- 不改 supervision-assistant 产品代码、release manager 或真实用户数据；产品品牌落地需产品仓自己的授权与证据。
- 不把“品牌已定”解释为“技术标识已迁移”；当前兼容面保持不变。
- 不在本 ADR 内处理 .5 版本号或发布；版本动作另行授权。

## 修订记录

- 2026-11-17：Accepted；记录所有者选择 Omni CLI（powered by Omnisurge），.4 保持冻结，技术改名另案。
