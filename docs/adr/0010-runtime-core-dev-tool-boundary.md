# ADR 0010：Runtime core 与开发工具共享同一执行内核

- 状态：Proposed（2026-11-20；探查完成，未实现）
- 日期：2026-11-20
- 关联：ADR 0003（embedded runtime contract）、ADR 0007（Omni CLI 品牌）、docs/evidence/2026-11-20-runtime-core-boundary-exploration.md
- 变更级别：C3（运行时/分发边界；本 ADR 只定方向，不执行版本或打包动作）

## 背景

当前产品把完整 OpenCLI host 连同全部内置 clis、browser、download 和开发期资源一起嵌入。探查显示：完整 host 的 clis 约 10.97 MB，文章下载依赖 @mixmark-io/domino 约 8.8 MB，而 browser dist 只有约 0.63 MB；问题不是浏览器太大，而是运行时和开发时能力没有边界。

同时，src/cli.ts 直接 import 17 个 browser 模块，src/commanderAdapter.ts 与 src/execution.ts 的静态闭包都包含 23 个 browser/download 文件。简单删除目录不能得到 runtime core。

SCCS adapter 只 import @jackwener/opencli/registry 与 @jackwener/opencli/errors；335 个命令中只有 login、auth-export 两个 browser:true。它适合作为产品侧 adapter，而不是平台 core 的一部分。

## 决策

1. **一个 core，两种消费方式**：runtime core 与开发工具（dev tool）共享同一套 registry、discovery、execution、output/error、plugin contract 和 embedded runtime 语义；dev tool 是 core 的超集，另加开发/验证/浏览器/下载/全量 adapters，不能另写一套实现。
2. **runtime core 的职责**：命令注册与发现（含 OPENCLI_EXTRA_CLIS_DIR）、参数准备、执行器、pipeline、输出格式、错误信封、插件契约、embedded runtime、必要配置/状态根。
3. **默认不进入 runtime core 的能力**：browser/CDP/daemon、download/文章抽取、skills、全部内置 clis、adapter 开发/verify 工具、update-check。它们属于 dev tool 或可选 runtime capability。
4. **可选 capability 必须可声明、可拒绝**：adapter 声明 browser:true 时，runtime 若未安装 browser capability，必须以明确错误退出，不能静默降级或偷偷加载浏览器；browser:false 命令不得加载 browser 模块。
5. **adapter 归属**：SCCS adapter 继续留在 supervision-assistant，只依赖 core 的公开 registry/errors 契约；不得在 core 内写 SCCS 专名、私有逻辑或凭据假设。
6. **产品嵌入形态**：supervision-assistant 的目标 profile 是 core + sccs adapter；完整 host 只作为开发工具，不作为产品默认 payload。
7. **本 ADR 不执行实现**：不改 src、不改 package、不改产品仓、不做包名改名或发布；后续实现需单独授权并由独立 ADR/证据承接。

## 验收

- 从 runtime core 入口做静态 import 闭包检查：不得出现 src/browser/**、src/download/**、turndown、ws；undici 只在显式网络 capability 下允许。
- core + sccs profile 能 discovery 到 sccs 的 browser:false 命令，并至少通过 help、status、--json 和一条无网络/无浏览器命令的临时 HOME spot check。
- browser:true 的 login/auth-export 在未安装 browser capability 时给出明确可恢复错误；安装可选 browser 后才允许执行。
- sccs adapter 的 host import 审计只允许 @jackwener/opencli/registry 与 @jackwener/opencli/errors，不出现 core 私有路径。
- dev tool 保持完整命令面和现有门禁；core 的体积、依赖数、启动/加载面与完整 host 分开记录，不以 dev tool 绿测替代 core 验证。

## 边界

- 不实现 runtime core；不拆包、不发版、不安装、不改产品 pin。
- 不改变 @jackwener/opencli 的当前技术身份；品牌按 ADR 0007，技术包名改名另立 C3 ADR。
- 不把“core 化”解释为删除 browser 功能；browser/download 作为 optional capability 保留。

## 修订记录

- 2026-11-20：Proposed；基于 runtime core 边界探查记录方向，未实现。
