# Runtime core 与开发工具边界探查

- 日期：2026-11-20
- 分支与 commit：release/1.8.8-omnisurge.2；探查基线 dffe8ba1（.6 本地/私有发行）
- 变更级别：C1（只读探查；本文件为文档，无运行时代码/包/产品变更）
- ADR：ADR 0010、ADR 0011（均 Proposed；本文只提供事实，不授权实现）
- 目标 / 范围：确认开发工具 + runtime core 是否能降低嵌入成本；量化 host 与 SCCS adapter 的依赖闭包、体积和最小运行路径
- 负责人 / 审查者：lead；未做独立审查（探查批次）

## 探查方法

1. 静态 import 闭包：从 src/commanderAdapter.ts、src/execution.ts、src/discovery.ts、src/plugin.ts 递归解析相对 import。
2. 字节统计：用 find 与 stat 统计 dist/src、dist/src/browser、dist/src/download、clis；用 du -sk 统计 node_modules。
3. 命令面：用 .6 host 包 + supervision-assistant 的 adapters/sccs 做临时目录 probe，设置 OPENCLI_EXTRA_CLIS_DIR，只导入 discovery + registry，不导入 main/cli。
4. 执行检查：直接调用 sccs/status 的 browser:false func，确认不需要浏览器模块；不访问真实 SCCS 网络。

## 事实

### 1. host 静态耦合

- src/cli.ts 约 3,508 行；直接 import 17 个 ./browser/* 模块。
- src/main.ts 通过动态 import 加载 cli.ts；只要走完整 CLI，浏览器模块就会进入闭包。
- src/commanderAdapter.ts 的静态闭包：68 个源码文件，其中 23 个 browser/download 文件。
- src/execution.ts 的静态闭包：64 个源码文件，其中 23 个 browser/download 文件。
- src/discovery.ts：12 个源码文件，0 个 browser/download 文件。
- src/plugin.ts：16 个源码文件，0 个 browser/download 文件，但经 src/utils.ts 静态引入 turndown。

结论：当前 host 不是删掉 clis 目录就变 core；main -> cli -> browser，以及 commanderAdapter -> execution -> browser 都是静态路径。

### 2. 体积

截至 2026-11-20：

| 目录/文件 | 字节 | 说明 |
|---|---:|---|
| dist/src | 2,101,036 | 含测试编译 |
| dist/src 中 *.test.js | 917,680 | 运行包不需要 |
| dist/src/browser | 629,564 | 可选浏览器能力 |
| dist/src/download | 78,901 | 可选下载能力 |
| clis | 10,972,004 | 181 个站点目录、1,976 个文件 |
| 1.8.8-omnisurge.6 tgz | 2,300,739 | npm pack 压缩包；未解压 |

host 依赖（du -sk KB，未压缩）：

| 依赖 | KB | 归属 |
|---|---:|---|
| @mixmark-io/domino | 8,820 | turndown/文章下载 |
| undici | 2,068 | 网络层 |
| js-yaml | 1,024 | manifest/配置 |
| commander | 240 | CLI 参数 |
| cli-table3 | 68 | 输出 |
| turndown | 208 | 文章下载 |
| @mozilla/readability | 188 | 文章抽取 |
| ws | 196 | browser/daemon |

结论：体积主因是全部 clis + 文章下载依赖（domino 约 8.8 MB + turndown/readability），浏览器本身约 0.63 MB，不是主因。

### 3. SCCS adapter 事实

- 源码目录：supervision-assistant 仓的 adapters/sccs。
- 文件：239 个（不含 node_modules）；顶层 JS 57 个。
- 对 host 的 import：34 处 @jackwener/opencli/errors，27 处 @jackwener/opencli/registry；没有其他 host 子路径。
- 直接依赖：@modelcontextprotocol/sdk、yaml、zod；源码快照 node_modules 约 39 MB（含依赖展开，不等于产品 payload）。
- adapter 注册命令：临时 probe 得到 335 个 sccs 命令；其中 browser:true 仅 2 个（login、auth-export），browser:false 333 个。

### 4. 最小 discovery/execution probe

临时目录使用 .6 host tgz + adapters/sccs 副本，设置 OPENCLI_EXTRA_CLIS_DIR；probe 只 import host 的 dist/src/discovery.js 与 dist/src/registry.js，不 import main/cli。

- discoverExtraClisDirs()：35 ms，335 个 sccs 命令。
- sccs/status 直接执行 func：0 ms，返回 disconnected，平台 darwin；全程未加载 browser 模块。
- 该 probe 证明 333 个 browser:false 命令的注册与本地 func 执行可以在 core + registry 路径完成；但参数解析、输出格式、pipeline、错误封装仍需要 core executor 提供。

### 5. 当前完整 host 启动参考

- node dist/src/main.js --version：约 0.02 s。
- node dist/src/main.js list --format json：约 0.13 s，1,366 commands。
- 启动时间不是主要成本；包体积、依赖数量、加载面和安装成本才是主要成本。

## 关键结论

1. 目标开发工具 + runtime core 可行，但必须先拆 CLI 入口与执行器的静态 browser 依赖。
2. 最小嵌入候选是 core + sccs adapter；browser 只对 login/auth-export 两个兼容命令需要，可作为可选 capability。
3. 当前 host 不能通过简单删除目录变 core；需要拆 cli.ts 的 browser 命令、execution.ts 的 browser provider、utils.ts 的 turndown，并让 core 入口不加载全部内置 clis/manifest/skills/scripts。
4. sccs adapter 的公开 API 使用非常克制（仅 registry/errors），适合保持产品所有；不需要把 SCCS 移进 core。
5. 体积收益主要来自移除全量 clis（约 10.97 MB）和文章下载依赖（domino 约 8.8 MB），其次才是 browser（约 0.63 MB）。

## 未验边界与风险

- 未实现或打包正式 runtime core；未验证真实 sccs --help、--json、pipeline 命令和参数校验。
- 未执行实际 supervision-assistant pack-sccs-runtime.sh，也未改产品 pin。
- 未验证 browser:true 的 login/auth-export 在无浏览器 capability 时的错误行为。
- 未验证 Node 版本矩阵、Windows/Linux、安装/回退和真实业务网络。
- 体积数字是当前快照；重构后需重新测量，不能把本页数字当最终包大小承诺。

## 回退

- 本批没有代码、包、产品变更；仅新增本证据和 ADR 文档。若方向被否决，删除对应文档即可，不影响 .6 产物。
- .6 发行物与 tag 保持 dffe8ba1 / b42fb560...，不因本探查改变。

## 结论

探查支持 core + sccs 作为下一阶段的最小嵌入候选，并确认需要一个共享 core 的 dev tool/runtime 分界；当前仅完成事实采集和 ADR Proposed，不执行实现。
