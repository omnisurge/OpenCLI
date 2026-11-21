# Runtime core profile 实现证据

- 日期：2026-11-21
- 分支与 commit：worktree 分支 runtime-core-profile；基线 bd065353（ADR 0010/0011 Proposed）；实现提交 55aeed8e
- 变更级别：C2/C3（新增 runtime-core 入口、构建 profile、边界门禁；不改变现有 full CLI 行为）
- ADR：ADR 0010、ADR 0011（保持 Proposed；本证据只证明 core profile 实现候选，不声称 ADR 已完成）
- 目标 / 范围：实现一个可独立构建、可独立安装的 runtime-core profile，验证 core + SCCS adapter 的最小运行路径
- 负责人 / 审查者：lead；已接受独立审查意见并修复 P1/P2（见“审查处置”）

## 变更清单

- 新增 src/runtime-core.ts：无浏览器依赖的 core CLI 入口；发现 extra adapter、发出 onStartup、注册命令；遵守 ADR 0003，不向 OPENCLI_EXTRA_CLIS_DIR 写入任何文件或创建 shim。
- 新增 src/runtime-execution.ts：browser:false adapter func 的参数校验与执行；browser:true 明确返回 BROWSER_CAPABILITY_UNAVAILABLE（exit 69）；无 func 但有非浏览器 pipeline 时执行 core pipeline 子集。
- 新增 src/runtime-commander.ts：core 最小 Commander 注册层；不复用 execution.ts 的浏览器静态依赖。
- 新增 src/execution-core.ts：与 full execution.ts 共享参数 coercion/validation；runtime-execution 只保留 core 执行适配层。
- 新增 src/runtime-pipeline.ts + src/core-utils.ts：支持 fetch/select/map/filter/sort/limit 的非浏览器 pipeline 子集；browser/download pipeline step 明确拒绝。
- 修改 src/pipeline/template.ts、src/pipeline/steps/fetch.ts、src/pipeline/steps/transform.ts：改用 core-utils，避免 pipeline 子集把 turndown 拉入 core。
- 新增 src/runtime-core.test.ts：参数 coercion、browser:false 执行、browser capability 拒绝、pipeline 子集、browser-only step 拒绝、hooks（含 onStartup 契约）。
- 修复 src/version.ts：profile package.json 位于 runtime-core.js 同目录时也能读到版本，standalone 安装不再返回 0.0.0。
- 修复 src/runtime-core.ts list：按 registry value 去重，避免 aliases 造成重复行。
- 新增 tsconfig.runtime-core.json、scripts/build-runtime-core.mjs、scripts/check-runtime-core-boundary.mjs、scripts/pack-runtime-core.mjs；package.json 增加 build:runtime-core、check:runtime-core、pack:runtime-core。
- profile package.json 复制 opencliFork（根 package.json patches 登记 runtime-core-profile），并同时提供 bin.opencli 与 bin.opencli-core；新增 release/inputs/runtime-core/package-lock.json，构建时复制到 dist/runtime-core 并生成 npm-shrinkwrap.json（npm pack 会携带，保证 tgz 可 npm ci）。
- 修改 .gitignore：增加 `!docs/evidence/*.log` 以纳入全量门禁原始日志；新增 release/inputs/runtime-core/SHA256SUMS。
- 修改 src/execution.ts：抽出参数准备到 src/execution-core.ts（full 与 core 共用）；行为兼容由 full gate 验证。不修改 src/main.ts、src/cli.ts 和 product 仓；full 开发工具行为保持。

## 执行的门禁

| 命令 | 结果 | 备注 |
|---|---|---|
| npx tsc --noEmit | 通过 | 含新增 runtime 文件 |
| npx vitest run src/runtime-core.test.ts | 通过 | 7 tests |
| npm run ci:fork:full | 通过 | 640 test files，7,516 passed / 1 skipped；manifest 无漂移；原始日志见 `docs/evidence/2026-11-21-runtime-core-full-gate.log` |
| npm run check:docs | 通过 | 256 docs、11 ADR、12 evidence；VitePress build complete |
| npm run build:runtime-core | 通过 | 生成 dist/runtime-core，26 个 JS + package.json + package-lock.json + npm-shrinkwrap.json（29 个文件） |
| npm run check:runtime-core | 通过 | 26 个 JS 文件；依赖 commander、js-yaml、cli-table3；无 browser/download/turndown/ws/tests/manifest；package-lock 与 npm-shrinkwrap 均存在 |
| npm run pack:runtime-core | 通过 | 生成 dist/opencli-runtime-core-1.8.8-omnisurge.6.tgz；29.9 kB packed / 99.1 kB unpacked，28 entries；SHA256 2e5ed184b5c7789c0556a1f2a17c5fb9d333815863bc57df869880abe9192ec4 |
| 独立 npm ci（解包 tgz 后） | 通过 | tarball 内含 npm-shrinkwrap.json；解包后 `npm ci --ignore-scripts` 安装 10 packages；runtime-core --version = 1.8.8-omnisurge.6；bin.opencli/opencliFork 存在 |
| 独立 npm install tgz | 通过 | 干净临时目录安装 11 packages；runtime-core --version = 1.8.8-omnisurge.6；release/inputs/runtime-core/package-lock.json SHA256 4e0b76c1d2d2b2b33108172ff31ba001b0e3053fc1c82d39e143a6599020512a |

## 真实路径 spot check

临时 HOME + 临时 extra adapter 目录（SCCS adapter 副本）。按 ADR 0003 的 read-only extra dir 契约，fixture 在 `extra/sccs/node_modules/@jackwener/opencli` 提供 product pack 同款 peer link；runtime-core 不写 extra 目录、不创建 shim。

- node dist/runtime-core/runtime-core.js --version → 1.8.8-omnisurge.6
- list sccs --format json → exit 0，335 个 sccs 命令（去重后）
- sccs status --format json → exit 0，返回 disconnected，平台 darwin；不访问真实 SCCS 网络
- sccs login --format json → exit 69，错误码 BROWSER_CAPABILITY_UNAVAILABLE；未加载 browser 模块
- 根 help 与 sccs --help 均正常输出
- 临时 hooktest adapter 的 onStartup 在 core 入口执行后写出 startup-ok；证明 onStartup 已触发。
- 将 extra 目录整体设为只读后仍能 list/status；core 未写 extra 目录。fixture 的 peer link 位于 adapter 自己的 `sccs/node_modules/@jackwener/opencli`，与 product pack-sccs-runtime.sh 的 peer link 契约一致。

## 体积观察

- runtime-core dist：103,437 bytes（26 个 JS + package.json + package-lock.json + npm-shrinkwrap.json）；du 约 172 KB（不含依赖）；npm pack 99.1 kB unpacked（28 entries，含 npm-shrinkwrap，不含 package-lock）。
- runtime-core 生产依赖：commander、js-yaml、cli-table3；du 约 1.3 MB（未压缩）。
- 对比 .6 完整 host：dist/src 2,101,036 bytes（含测试），clis 10,972,004 bytes，browser 629,564 bytes，download 78,901 bytes。
- core profile 不包含 clis/manifest/skills/scripts/tests/browser/download/turndown/ws；体积收益主要来自这些移除。

## 未验边界与风险

- runtime-core 的 pipeline 只支持非浏览器 step 子集（fetch/select/map/filter/sort/limit）；browser/download pipeline step 会返回 CORE_PIPELINE_STEP_UNAVAILABLE，尚未实现完整可选 browser capability 的正向路径。
- 未执行 supervision-assistant 的实际 pack-sccs-runtime.sh，未改产品 HOST_VERSION/HOST_COMMIT/adapter peer；embedded-sccs profile 和 product repack 未验。
- 未验证 Windows/Linux、真实业务命令（除 sccs status）、真实网络、真实 SCCS 登录、安装/回退。
- 未验证 browser:true 命令安装可选 browser capability 后的正向路径；当前只验证了 core-only 拒绝。
- ADR 0011 的 embedded-sccs 和 browser capability 正向验收未完成，故 ADR 0010/0011 均保持 Proposed，不转 Implemented。

## 审查处置

- 已修复治理审查 P1：clean core + SCCS 在 ADR 0003 read-only extra 契约下可运行（宿主 peer link）、onStartup、core pipeline 子集、未跟踪 node_modules symlink（提交前删除）、边界门禁扩展、standalone install/版本。
- 已修复 runtime-core 审查 P1：standalone `--version` 0.0.0、profile package 缺 bin.opencli/opencliFork、profile 独立 lockfile。
- 仍需 owner 决策/后续工作：embedded-sccs product pack、可选 browser capability 正向验证、真实业务命令。

## 回退

- 本分支未改变 full CLI 行为；若 core profile 被否决，删除 worktree 分支及新增文件即可，不影响 .6 的 tag/tgz/证据。
- .6 发行物保持 dffe8ba1 / b42fb560...，不因本实现改变。

## 结论

runtime-core profile 已实现并通过 typecheck、7 个定向测试、full gate、边界门禁、standalone 安装、core + SCCS smoke 和 onStartup smoke；它是可嵌入产品的最小执行内核候选，但 embedded-sccs/product pack、可选 browser capability 和真实业务路径仍未闭合，不能称正式产品发布。
