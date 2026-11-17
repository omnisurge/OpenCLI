# ADR 0005：产品命名与技术标识（.4 不改名）

- 状态：Proposed（2026-11-17，所有者提出 Surge CLI / Omni CLI 选项；待最终品牌确认）
- 关联：AGENTS.md §1.1（分发身份硬约束）；ADR 0004（宿主消费契约）；supervision-assistant ADR 0048（payload 仍称 opencli-runtime）
- 变更级别：C0（本 ADR 本身仅记录命名决定；若未来改技术标识则为 breaking C3，不在本批）

## 背景

我们已 fork OpenCLI 并准备长期自行维护。所有者询问是否把产品改名为 Surge CLI 或 Omni CLI。

现状：

- 包名 @jackwener/opencli、bin opencli、imports @jackwener/opencli/*、repository omnisurge/OpenCLI 是插件、skill、宿主、peerDependencies 和现有安装的共同契约；
- AGENTS.md §1.1 明确不得改变分发身份（name 保持、private、不得改 repository 指回上游）；
- supervision-assistant ADR 0048 的内嵌 payload 仍以 opencli-runtime 命名，并 pin fork 版本与 adapter 版本；
- 内嵌形态下终端用户通常直接使用产品，不需要看到 OpenCLI 名称；
- Surge 已与既有网络工具/部署工具品牌高度重合，作为 CLI 名辨识度风险高；Omni 更贴合 Omnisurge，但过于通用，单独使用缺少区分度。

## 决策

1. **.4 不改名**：保留 @jackwener/opencli、opencli、@jackwener/opencli/*、repository 与现有 skill/适配器兼容面。.4 的显示名也保持 OpenCLI。
2. 不在 .4 引入 omni/surge 新 bin、新包名、新 import 路径或双入口；内嵌 payload 继续叫 opencli-runtime。
3. 如果未来要建立独立产品品牌，优先候选是 **Omni CLI**（副标 by Omnisurge）或 **Omnisurge CLI**，不使用 Surge CLI；需另立 breaking ADR，规划：
   - 新包名 @omnisurge/...
   - omni/opencli 双 bin 过渡
   - @jackwener/opencli 兼容 shim
   - adapter/skill/宿主迁移
   - 版本线与回退
4. 在品牌未定前，不改 README 标题/CLI help/package 描述；避免半改名状态。

## 验收

- .4 包名、bin、exports、repository、插件 peer 解析与现有测试全部保持；无 omni/surge 新入口。
- 若未来改名，必须另批提供迁移矩阵、双入口兼容测试、回退方案与 owner 明确授权；本 ADR 不授权该动作。

## 边界

- 本 ADR 不处理商标注册/法律检索；若品牌正式对外，需所有者完成名称检索。
- 不改 supervision-assistant 的 product 名或 payload 目录名。
- 不把「fork 自主发展」解释为必须换技术标识；fork 的独立发展由 ADR 0003/0004 与发布流程承载。

## 修订记录

- 2026-11-17：Proposed；决定 .4 保持 OpenCLI，未来品牌候选 Omni CLI/Omnisurge CLI，不采用 Surge CLI；技术改名另立 breaking ADR。
