# ADR 0004：宿主内嵌 OpenCLI 运行时的交付与消费契约

- 状态：Proposed（2026-11-17；与 supervision-assistant ADR 0048 阶段 2-5 对齐）
- 关联：ADR 0003（嵌入式运行环境契约，本 ADR 的运行时前置）；supervision-assistant ADR 0048（accepted，决定产品 payload、子进程与版本 pin）；supervision-assistant ADR 0037（受管 Node 运行时）
- 变更级别：C2（定义宿主消费面与无全局安装验收；不改 OpenCLI 运行时代码）

## 背景

ADR 0003 只回答「OpenCLI 如何隔离状态、加载额外适配器、关闭更新链」。它没有回答宿主产品如何取得并启动 OpenCLI，因此单靠 ADR 0003 不能实现「用户不再需要全局安装 opencli」。

supervision-assistant ADR 0048 已决定：

- 产品 release 的 payload/opencli-runtime = OpenCLI fork 的 npm tgz 解包 + 生产依赖；
- 产品以子进程调用 node `<runtime>/dist/src/main.js`，不把 OpenCLI 当库 import；
- payload/sccs-adapter 独立于 runtime，经 OPENCLI_EXTRA_CLIS_DIR 挂载；
- OPENCLI_HOME 指向产品数据目录，OPENCLI_EMBEDDED=1；
- Node 复用产品受管 Node（ADR 0037），不塞第二份；
- release pin 一对（fork 版本, adapter 版本），升级/回退改 pin 重发；
- 外挂「全局 opencli + ~/.opencli/plugins」形态保留，产品调用层内嵌优先、外挂兜底。

本 ADR 把这些决定固化为 fork 侧的交付/消费边界，不新增第二套发行物。

## 决策

### 1. 运行形态：子进程，不是库 API

- 宿主必须通过子进程运行 node `<runtime>/dist/src/main.js`（或等价的受管 Node 入口）。
- 不把 OpenCLI import 进宿主进程；manifest、exit handler、background fetch、CLI 参数解析均按进程级假设设计。
- 子进程继承宿主注入的 OPENCLI_HOME / OPENCLI_EXTRA_CLIS_DIR / OPENCLI_EMBEDDED；不要求 PATH 上有 opencli。

### 2. Runtime payload：构建期准备，运行期不安装

- 宿主 release 的 payload/opencli-runtime 包含 OpenCLI npm tgz 解包内容（dist/src、clis/、cli-manifest.json、package.json）和生产依赖 node_modules。
- 依赖只在宿主构建/发布阶段安装；运行期不执行 npm install、postinstall、prepare、fetch-adapters 或任何上游网络拉取。
- 构建安装必须显式 --ignore-scripts（或产品既有等价离线物化机制），因为当前 package.json 的 postinstall 会执行 scripts/postinstall.js 与 scripts/fetch-adapters.js；不能让它成为隐式联网/写用户目录步骤。
- Node >=20.18.1 由宿主按 ADR 0037 提供；OpenCLI 不要求系统全局 Node 之外的安装动作，也不在 payload 里自带 Node。

### 3. Adapter payload：clis 形状 + 宿主模块解析

- OPENCLI_EXTRA_CLIS_DIR 指向的目录必须是 clis 形状：`<dir>/<site>/*.js`。SCCS 当前是 plugin-flat 布局，产品打包时必须重排为 payload/sccs-adapter/sccs/*.js（或等价的 site 子目录），并把相对 import 所需文件一并保留。
- 宿主必须在额外目录或其祖先提供 node_modules/@jackwener/opencli，指向 payload/opencli-runtime 的 package 根，且 realpath 与宿主加载的 runtime 一致；否则 adapter 的 registry/errors 解析失败或类身份不一致。
- 该 node_modules 由产品 release 组装阶段准备；OpenCLI 不写只读额外目录。产品既有 node_host/maintenance 的「只收 regular file、拒 symlink」限制需在组装后物化或使用等价真实目录，不能假设 OpenCLI 会创建 shim。
- adapter 的 peerDependencies/opencli-plugin.json 版本必须与本次 pin 的 fork 版本一致；.4 消费时产品需把 .2 的精确 pin 更新为 .4（或明确兼容范围），并跑契约测试。
- adapter 仍由产品仓拥有/发版，不进入 OpenCLI 包；OPENCLI_EXTRA_CLIS_DIR 只借用加载语义，不借同源打包。

### 4. 状态与嵌入模式

- 宿主必须设置 OPENCLI_HOME=<产品数据目录>/opencli；不得读写用户 ~/.opencli。
- 必须设置 OPENCLI_EMBEDDED=1；更新链和上游安装提示关闭（ADR 0003）。
- 凭证/缓存/session/compat shim 全部随产品数据目录；旧 ~/.opencli 数据不自动迁移，切换形态后首次使用要求重新登录（产品 ADR 0048 风险）。
- 不要求宿主清理旧 ~/.opencli；旧数据保留可回退外挂形态。

### 5. 版本 pin、API 冻结与回退

- 产品 release 清单同时 pin fork 版本与 adapter 版本；升级 fork = 改 pin + 重跑 adapter↔opencli 契约测试，不靠装上试跑。
- @jackwener/opencli/{registry,errors,types,utils,logger,...} 的 package exports 是 adapter 唯一依赖面；破坏性改动另立 ADR，不在 .4 内做。
- 回退 = 改回上一对 pin 重发产品 release；fork .4 不覆盖 .3 产物。
- 外挂形态（全局 opencli + ~/.opencli/plugins）保留：没有 payload 时产品回退现有查找链；运行报告必须记录实际形态与版本对，不把「payload 存在」当成自证式 oracle。

## 验收

在隔离环境（无全局 opencli、无 ~/.opencli、临时 HOME）验证：

1. 产品 payload 布局可启动：node `<runtime>/dist/src/main.js` --version / list（`--help` 只确认启动，走快速路径）；
2. OPENCLI_HOME 下出现预期状态，$HOME/.opencli 不存在；
3. OPENCLI_EXTRA_CLIS_DIR 的 SCCS 适配器可加载，list 显示 sccs 命令；
4. 无 update-check 缓存/后台 fetch，doctor 无上游安装/下载建议；
5. adapter↔runtime 的 list-tools 等命令 shape 断言通过；
6. 无全局 npm install/PATH 依赖；运行结束后不写产品数据目录之外。

真实 SCCS 平台 whoami/业务命令需要平台授权与会话，不能作为离线安装验收的默认步骤；没有授权时写「未验」，不以 fixture 结果冒充。

## 边界

- 本 ADR 不实现产品 release manager、调用层或 adapter 代码；这些在 supervision-assistant 仓按 ADR 0048 阶段 2-5 执行，并需该仓自己的授权/证据。
- 不解决固定 daemon 端口 19825 与全局 opencli daemon 共存；内嵌运行时与全局 CLI 的 daemon 可能互杀，宿主必须避免同时使用，根治需扩展/daemon 端口另案。
- 扩展活在用户 Chrome 中，「无安装」不覆盖扩展本身；依赖 Browser Bridge 的命令（login/auth-export 等）在无扩展环境降级，产品 README 必须说明。
- Windows/Linux 宿主、跨平台 Node 变体、真实浏览器 E2E 不在本 ADR 验收范围。
- 不改 OpenCLI npm 分发的包名/bin/repository；技术标识按 ADR 0005 处理。

## 修订记录

- 2026-11-17：Proposed；对齐 supervision-assistant ADR 0048，固化子进程、payload、adapter 形状/模块解析、--ignore-scripts、pin/回退与无安装验收。
