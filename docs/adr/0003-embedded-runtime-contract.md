# ADR 0003：嵌入式运行环境契约（OPENCLI_HOME / OPENCLI_EXTRA_CLIS_DIR / OPENCLI_EMBEDDED）

- 状态：Implemented（2026-11-17，依据 supervision-assistant 嵌入运行需求立项；本 ADR 是 supervision-assistant ADR 0048 的阶段 1 前置；实现/验收见 docs/evidence/2026-11-17-embedded-runtime.md）
- 关联：ADR 0001（fork-aware-update-notifier，OPENCLI_NO_UPDATE_NOTIFIER 先例）；supervision-assistant ADR 0048（accepted，内嵌 OpenCLI 运行时；其阶段 1 引用本 ADR）
- 变更级别：C2（改变环境变量契约、状态路径与嵌入模式下的用户可见诊断输出），先 ADR 后实现

## 背景

### 症状 / 现状

OpenCLI 作为嵌入宿主（如 supervision-assistant 把 OpenCLI 运行时纳入产品 payload）使用时，运行状态目录与进程行为仍按「独立 CLI」假设硬编码到 ~/.opencli：

- ~/.opencli 派生路径散布在十余个调用点（discovery、update-check、main、cli、execution、adapter-shadow、electron-apps、commands/auth、plugin、browser/{profile,network-cache,verify-fixture}、observation/artifact）；
- 用户适配器目录只有 ~/.opencli/clis 一个；宿主随产品分发的适配器无法以只读外挂方式被发现；
- 更新提示链（exit notice + 后台 npm/GitHub 拉取）在嵌入进程里对宿主用户无意义且产生非宿主网络的出站请求；OPENCLI_NO_UPDATE_NOTIFIER（ADR 0001）只关 exit notice，不关后台拉取；
- 嵌入模式下 doctor/daemon 的生命周期提示仍可能指向上游 npm/GitHub，宿主用户会得到错误的安装建议。

### 机制

- 既有环境变量各自只覆盖单点：OPENCLI_CONFIG_DIR（artifact/profile）、OPENCLI_CACHE_DIR（browser cache）互不统领；其余路径不受任何变量影响。
- discoverClis(...dirs) 已支持多目录扫描（manifest 快路径 + fs 回退）；缺的是额外目录来源、失败可见性、以及额外目录中适配器的模块解析约定。
- main.ts 无条件调用 registerUpdateNoticeOnExit() 与 checkForUpdateBackground()；前者内部才做 isCI/opt-out 判断，后者只在 isCI 与 24h 节流前无条件发起 fetch。
- supervision-assistant ADR 0048 已决定：产品以子进程调用内嵌 fork，不把 OpenCLI 当库 import；产品 release 的 payload/opencli-runtime 与 payload/sccs-adapter 分目录存放；状态根必须是产品数据目录下的私有根。

## 决策

### 1. OPENCLI_HOME：统一状态根

新增 src/embedded-runtime.ts 导出 opencliRoot(defaultHome?)：

- OPENCLI_HOME 非空（trim 后）：返回 trim 后并按进程 cwd 解析的绝对路径；不展开 ~，不做 realpath/符号链接归一。
- 未设置或只含空白：返回 defaultHome ?? os.homedir() 拼接的 .opencli；未设时逐字节保持现状（fail-open 硬要求）。
- 宿主应传绝对路径；相对路径按进程 cwd 解析。OpenCLI 不替宿主创建根目录，目录创建/权限由具体写入点按既有行为处理。

所有运行时状态的默认值必须经 opencliRoot() 解析：

| 状态 | 默认位置 / 说明 |
|---|---|
| user clis | opencliRoot()/clis |
| plugins / monorepos / plugins.lock.json | opencliRoot()/...；plugin.ts 保留 getHomeDir() 作为默认 home 传入 opencliRoot(getHomeDir()) |
| sites / browser cache / browser profile / network cache / verify fixtures | opencliRoot()/... |
| auth-refresh.json | opencliRoot()/auth-refresh.json |
| apps.yaml | opencliRoot()/apps.yaml |
| observation artifacts | OPENCLI_CONFIG_DIR || opencliRoot()/... |
| update-check cache | opencliRoot()/update-check.json |
| user compat shim | opencliRoot()/node_modules/@jackwener/opencli |

OPENCLI_CONFIG_DIR、OPENCLI_CACHE_DIR 在各自站点保持显式覆盖，优先级 CONFIG/CACHE > HOME > 默认；未设置时必须回落到 opencliRoot()，不能各自回落到 os.homedir()/.opencli。

### 2. OPENCLI_EXTRA_CLIS_DIR：额外只读适配器目录

解析：

- path.delimiter 分隔；每段 trim、去空段、按解析后的路径去重。
- 不展开 ~、不做 realpath/符号链接归一；相对路径按进程 cwd 解析，宿主应传绝对路径。
- 目录由宿主拥有并信任。只读是「OpenCLI 不写入该目录」，不是代码沙箱；适配器仍是可执行 JS，宿主必须只声明可信目录。

布局与加载：

- 额外目录与内置 clis 同形：`<dir>/<site>/*.js`；manifest 快路径的位置由 getCliManifestPath 决定，即 `<dir>/../cli-manifest.json`（不是 `<dir>/cli-manifest.json`）。
- 额外目录不是 plugin-flat 目录。SCCS 适配器当前是根目录平铺的 plugin 布局，产品打包时必须重排为 `<extra>/sccs/*.js`（或提供等价的 site 子目录），不能把 plugin 根目录直接交给本变量。
- 顺序：builtin -> user -> extra -> plugins；extra 同名命令覆盖 builtin/user，不覆盖 plugins。registerCommand 后注册者胜。
- 缺失、非目录、不可读、站点子目录不可读、manifest/模块加载异常都必须 log.warn 并跳过该目录/该站点；不能让启动崩溃。
- 不复制、不在额外目录中创建 shim；compat shim 仍只在 opencliRoot() 下创建。

模块解析（宿主义务）：

- 额外目录中的适配器会 import @jackwener/opencli/registry、@jackwener/opencli/errors 等公开导出。Node 从适配器文件位置向上解析，不会自动看到 payload/opencli-runtime/package。
- 宿主必须在额外目录或其祖先提供可解析的 node_modules/@jackwener/opencli（symlink、junction 或等价物），并保证它与当前运行的 runtime package 是同一 realpath；否则跨包 CliError instanceof 会退化为 UNKNOWN，命令可能静默失败。
- OpenCLI 不替宿主写只读额外目录；该解析物由产品 release 组装阶段准备。验收必须包含一个真实 import registry/errors 的 fixture 适配器。

### 3. OPENCLI_EMBEDDED：嵌入主开关

- 非空（trim 后）即嵌入模式；跳过 registerUpdateNoticeOnExit() 与 checkForUpdateBackground()。
- OPENCLI_NO_UPDATE_NOTIFIER 保持独立有效，两者是或关系。
- embedded 模式下的 doctor / daemon-lifecycle 等诊断不得输出 npm install -g @jackwener/opencli 或上游 GitHub Releases 下载建议；应提示用户通过宿主产品更新/获取扩展。
- 子进程继承环境；daemon/extension 不因 embedded 自动禁用。固定 daemon 端口 19825 与 OPENCLI_DAEMON_PORT 的限制不在本 ADR 内解决；宿主必须避免与全局 opencli 的 daemon 混用，ADR 0004 记录该边界。
- 不抑制业务网络（SCCS 等仍可联网），只关闭更新链和错误的安装提示。

### 4. 不做的部分

- 不改任何上游 URL/常量、不改缓存协议、不改 clis/* 适配器内容。
- 不做版本/打包/安装/发布动作；这些由 ADR 0004（宿主交付契约）和发布 ADR 处理。
- 不引入 supervision-assistant 专属逻辑；本契约是通用嵌入能力。
- 不把 OpenCLI 库化 import；宿主以子进程方式运行（产品 ADR 0048）。

## 验收（实施完成后必须可证伪）

1. 纯函数单测：opencliRoot 的默认/覆盖/空白/相对路径；extraClisDirs 的 delimiter/空段/去重/相对路径；isEmbeddedRuntime 开/关。任一判定写反 → 红。
2. extra dir：临时目录放 clis 形状的最小 .js 适配器 → 命令入册；缺失目录、文件而非目录、不可读目录、不可读 site 子目录 → log.warn 且不抛；flat .js 顶层文件 → 可见告警/不静默丢命令；真实 import registry/errors 的 fixture → 加载成功。
3. 状态矩阵：设置 HOME/OPENCLI_HOME 后逐项断言 clis/plugins/sites/profile/cache/auth/apps/artifact/update-check 等落在新根；不得写入 $HOME/.opencli。
4. embedded：OPENCLI_EMBEDDED=1 时 list 不注册 exit notice、不写 update-check 缓存、不发后台 fetch；`--help` 只确认进程可启动（走快速路径，不作为适配器清单验收）；doctor 输出不含上游 npm/GitHub 安装建议。
5. 真实路径：`HOME=$(mktemp -d)` + `OPENCLI_HOME=<tmp>/oh` + 无全局 opencli + 无 ~/.opencli 跑构建产物 list（另跑 `--help` 仅确认启动）；断言状态只落新根。
6. fail-open：不设三个变量时行为与 HEAD 一致（缓存落 $HOME/.opencli、exit notice 按 ADR 0001 注册）。
7. 文档：ADR/index/sidebar/最大编号、package.json patches、docs/evidence 同批更新；npm run check:adr / check:docs 绿。

## 边界

- 只覆盖三个环境变量契约、状态路径、嵌入诊断文案与文档/证据/索引登记；不改 clis/* 适配器内容、不改 daemon 协议、不改 e2e。
- OPENCLI_HOME 不改 cli.ts 的 ~/ 路径参数展开（用户参数语义，不是状态根）与 scripts/fetch-adapters.js（上游同步脚本，非运行路径）。
- 嵌入模式只抑制更新提示链和错误安装提示；不抑制其他 stdout/stderr 输出。
- 固定 daemon 端口/全局 daemon 共存、Windows/Linux 宿主、扩展安装/升级不在本 ADR 验收范围；ADR 0004 记录未验边界。

## 修订记录

- 2026-11-17：Proposed；补 supervision-assistant ADR 0048 关联、状态矩阵、extra dir 布局/模块解析/错误处理、doctor/daemon 文案、验收与边界。
- 2026-11-17：Implemented；三条运行时契约与定向验收完成，随 .4 交付。
- 2026-11-18：独立审查发现 flat .js 与不可读 site 两项验收缺口；在 feat/embedded-runtime-contract 工作区修复并补回归测试。.4 冻结包未重建，发版需新版本候选并复审。
