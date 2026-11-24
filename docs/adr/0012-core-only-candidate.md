# ADR 0012：1.8.8-omnisurge.7 core-only 候选发布

- 状态：Proposed（2026-11-24，依据所有者要求确认 core-only 正式候选）
- 关联：ADR 0003（embedded runtime contract）、ADR 0004（embedded host delivery）、ADR 0010（runtime core/dev-tool boundary）、ADR 0011（runtime core package profile）
- 变更级别：C3

## 背景

当前产品 pin 的是 `1.8.8-omnisurge.6` 完整 host；SCCS adapter 通过 fork 的 `OPENCLI_EXTRA_CLIS_DIR` 挂载。核心目标是把产品嵌入的 runtime 收敛为 core-only：不含 `clis/`、`browser/`、`download/` 等无关部分，同时保留 SCCS adapter 的加载与命令注册能力。

上一批已经完成 runtime-core 实现候选（ADR 0010/0011），但该候选仍使用 `.6` 版本号，且 core profile 产物没有 `engines`，工作区还有未收口的 core commander/boundary 修改。把 core 与同版本完整 host 混用会造成同一个 `@jackwener/opencli@1.8.8-omnisurge.6` 对应两种不同字节，无法作为可回退的正式候选。因此需要单独的候选版本号。

## 决策

1. 在既有 `release/1.8.8-omnisurge.2` 线上新增本地/私有 core-only 候选版本 `1.8.8-omnisurge.7`；不改变 `.6` 的 tag、tgz、SHA 或历史证据。
2. `.7` 的 runtime-core profile 仍使用 `name=@jackwener/opencli`、`private=true`，入口和 bin 均为 `runtime-core.js`；package `engines.node` 固定为根包一致的 `>=20.18.1`。
3. 本批将三项未提交的 core 修改纳入候选：core commander 的 `--json` 快捷方式及回归测试；boundary 对 `undici` 和 `engines` 的检查。它们是候选可执行性和边界的组成部分，不改变完整 host 的发布历史。
4. core 产物只含 runtime-core 需要的 JS、`package.json`、`package-lock.json`、`npm-shrinkwrap.json` 和三项目录依赖；不打包 `clis/`、`browser/`、`download/`、`skills/`、`scripts/`、tests、docs 或 `cli-manifest.json`。
5. 本批只做 Omni CLI 侧候选和 embedded-sccs staging pack；不改产品仓的 `HOST_VERSION/HOST_COMMIT`、不改产品正式 payload、不安装到全局、不发布 npm、不推送 `v*` 标签。产品切换需要在 independent review、产品侧 pack 脚本与回归通过后另走产品发布门禁。
6. 候选的正式化必须完成：干净工作区、`ci:fork:full`、core tarball 重建与 SHA 重录、SCCS `--help/list/status` 真实 smoke、embedded-sccs staging pack、独立 reviewer APPROVE；未满足前状态保持 Proposed。

## 验收

1. `git status --short` 在候选提交后为空；HEAD 在 `release/1.8.8-omnisurge.2` 上，`package.json` 与 `package-lock.json` 版本均为 `1.8.8-omnisurge.7`。
2. `npx tsc --noEmit`、core 目标测试、`npm run build:runtime-core`、`npm run check:runtime-core`、`npm run ci:fork:full` 全部通过；target test 至少覆盖 `--json`。
3. core tarball 的 package metadata 含 `engines.node >=20.18.1`、`main=runtime-core.js`、`bin.opencli=runtime-core.js`；entry 数、SHA256、bytes 写入 `docs/evidence/`。
4. embedded staging payload 的 `payload/opencli-runtime` 来自 core tarball，`payload/sccs-adapter/sccs` 来自产品 adapter；peer link 解析到同一 core realpath；`runtime-core.js sccs --help`、`list sccs --format json`、`sccs status --json` 通过。
5. 独立 reviewer 对候选范围给出 APPROVE 或明确阻断；阻断未处置不得改状态或宣布正式交付。

## 边界

- 不把 `.7` 宣称为 npm 发布、GitHub Release 或生产可用；不推标签、不安装全局、不改产品正式 pin。
- 不因 core 不含 browser 就删除或否定完整 host 的 browser/download 能力；browser:true 命令仍由完整开发工具或未来的可选 browser capability 提供。
- 不改 `.6` 的 tag/tgz/SHA；不把 `.6` 产品回退包替换为 `.7`。
- 不写产品私有域名、凭据或真实业务数据进 core；SCCS 业务逻辑仍留在产品 adapter。
- embedded-sccs staging pack 不写回产品仓 tracked 文件；产品正式 pack 仍需产品侧独立审查与授权。

## 修订记录

- 2026-11-24：Proposed；所有者要求确认 core-only 正式候选，定义 `.7` 版本、engines、边界、staging 验证和产品切换闸门。
