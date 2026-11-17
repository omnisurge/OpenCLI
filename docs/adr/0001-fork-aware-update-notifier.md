# ADR 0001：Fork 分发版的更新提示必须可识别、可关闭

- 状态：Proposed（2026-11-17，依据《SCCS-CLI使用反馈-20261116》⑤裁决立项；实施另安排）
- 关联：fork 发布身份 commit `02173a22`（package.json `opencliFork` stamp）；
  错误面收敛 `faa6eaeb`（omnisurge.2）
- 变更级别：C2（改变进程退出行为与用户可见输出），先 ADR 后实现

以下版本号、commit 与命令输出为 2026-11-17 排查时快照；详细验测记录放 `docs/evidence/`。

## 背景

### 症状

本仓（omnisurge fork，version `1.8.8-omnisurge.2`）正常退出后打印（`opencli list` / `opencli --help` 可复现；`--version` 走 fast path，不复现）：

```
Update available: v1.8.8-omnisurge.2 → v2.0.3
Run: npm install -g @jackwener/opencli
```

对 fork 用户这是**错误建议**：`npm i -g @jackwener/opencli` 装的是上游
jackwener 分发版，会覆盖 omnisurge fork 的私有补丁（non-browser trace
`90c18cac`、public-error redaction `faa6eaeb`、`opencliFork` 身份标记）。
同理 extension 提示行固定指向 `github.com/jackwener/opencli/releases`，
对 fork 同样误导。

### 机制（为什么当前退出会命中）

`src/update-check.ts`：

- `registerUpdateNoticeOnExit()`（L129–147）：入口只跳过 `isCI()` 与
  `--get-completions`，exit 回调内再跳过 `code !== 0`；随后无条件调用
  `buildUpdateNotices`，**没有任何 fork/分发版判断，也没有用户侧 opt-out**。
- `buildUpdateNotices`（L100–121）：只要缓存的 `latestVersion` 经
  `isNewer()` 判新即生成升级行；提示语与安装命令硬编码为上游 npm 包与上游
  releases URL。
- 触发提示的是上游版本确实前进，不是后缀比较出错：`isNewer()` 先
  `split('-')[0]` 剥掉 `-omnisurge.2`，`1.8.8-omnisurge.2` 与 `1.8.8`
  视为相等；当前缓存 `latestVersion` 是上游 `2.0.3`
  （`~/.opencli/update-check.json`，2026-11-17 实测），`2.0.3 > 1.8.8`
  才生成提示行。只要上游继续前进，24h 刷新后每次 exit 0 都会命中——
  对 fork 是结构性常态，但根因是「fork 版本永远低于上游」＋「提示指向
  上游包」，不是 semver 后缀解析 bug。
- 调用点：`src/main.ts:105` 动态 import、L131 `registerUpdateNoticeOnExit()`、
  L133 `checkForUpdateBackground()`；daemon 侧 `src/daemon.ts:544`
  `recordExtensionVersion` 只写缓存不打印。

上游 2.0.3（`git show origin/main:src/update-check.ts`，2026-11-17 核）同机制
未修；且上游把「无 --timeout 不默认超时」等新行为叠进同文件，本 fork 不能靠
rebase 顺手消掉这个问题。

## 决策

### 1. fork 分发版不生成 CLI 升级提示行

`buildUpdateNotices` 入口判定分发身份：`package.json` 存在
`opencliFork.distribution`（本仓为 `"omnisurge"`）即认为 fork 分发，
**跳过 `lines.cli` 生成**（上游 npm 包名对 fork 用户没有意义）。
身份来源用 `opencliFork` stamp（`02173a22` 已落），不解析 version 后缀——
后缀只是发布约定，stamp 才是声明式身份。

实现形态（供实施者，非逐字契约）：module load 时读一次 package.json 的
`opencliFork`，与 `_cache` 同级缓存；读失败/无字段 → 视为上游分发，
行为与现状一致（fail-open 对上游用户零影响）。

### 2. extension 提示行同样按身份裁决

fork 分发下 extension 升级指向 jackwener releases 同样误导——
fork 的 extension 来源与上游不同。fork 时 `lines.extension` 也跳过。
若未来 fork 自建 extension 发布渠道，再单独加 fork 专属提示，不在本次范围。

### 3. 通用 opt-out：`OPENCLI_NO_UPDATE_NOTIFIER`

无论上游还是 fork 分发，`OPENCLI_NO_UPDATE_NOTIFIER` 环境变量非空即
整体跳过 notice 注册（与 `isCI()`、`--get-completions` 并列在
`registerUpdateNoticeOnExit` 入口判断）。给自动化/嵌入场景一个
不依赖 fork 身份的硬开关——本 fork 被嵌入 omnisurge 产品（supervision-assistant
SCCS 适配器）时，退出尾部不该出现对宿主用户无意义的升级文案。

### 4. 不动的部分

- `checkForUpdateBackground()` 后台拉取与缓存写入**保留**——它只是数据采集，
  未来 fork 若建自己的通道可复用同一缓存文件；禁掉它会同时丢掉
  `recordExtensionVersion` 的 read-merge-write 对端。
- `isCI()`、`--get-completions`、`code !== 0` 三个既有跳过条件保持。
- 24h 拉取频率、cache 文件位置与 merge 协议不变——daemon/extension 共用，
  改协议属于另一个 ADR。

## 验收（实施完成后必须可证伪）

1. `update-check` 单测：fixture 取当前真实差距（`cliVersion:
   "1.8.8-omnisurge.2"`、`latestVersion: "2.0.3"`，extension 两字段同样
   设成“新于当前”），fork stamp 存在 → `buildUpdateNotices` 返回 `{}`
   （两条行都不生成）；删掉 stamp 检测或改回无条件生成 → 测试红。
   注意：fixture 若用 `latestVersion: "1.8.8"`，`isNewer()` 剥后缀后判相等，
   不改代码也会返回 `{}`（假绿），不能当验收用例。
2. `OPENCLI_NO_UPDATE_NOTIFIER=1` 环境变量 → 注册入口直接 return；
   测试可在注入 env 下断言 `process.on('exit')` 未挂钩子。
3. 无 fork stamp 的分发（上游路径）：行为与现状逐字节一致——保留一条
   「上游路径不跳过」的回归断言。
4. 本仓 `opencli --help` 实际运行：stderr 尾部不再出现 Update available 行
   （需在 `~/.opencli/update-check.json` 已有 `latestVersion` 缓存的前提下验）。
   不要用 `opencli --version` 作探针——它走 `src/main.ts` 的 fast path，在
   hook 注册前就 exit，改前改后都不打印。

## 边界

- 本 ADR 只描述修复，不含实现；实现由所有者另行安排（见 sccs 仓同批 ADR0045
  的实施分工）。
- 不改缓存协议、不动上游 npm/GitHub 常量（fork 判定在生成提示行处短路，
  不在数据源处改 URL——数据源换掉属于「fork 自建更新通道」的另一决策）。
- 不处理 upstream 2.0.3 的其他变更；本 ADR 结论只适用于 fork 线。

## 修订记录

- 2026-11-17：按代码与实测更正症状版本（`→ v2.0.3`，非 `v1.8.8`）、
  `isNewer()` 归因与函数行号；验收 #1 补充可证伪 fixture，验收 #4 标明
  不得用 `--version` 作探针。
