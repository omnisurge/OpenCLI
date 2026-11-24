# 2026-11-24 runtime core 正式候选收口

目标/范围：把 `runtime-core-profile` 从 core + embedded-SCCS 的 staging 收口为 **独立版本号的 core-only 正式候选**；不改产品仓 tracked 文件，不安装全局、不推 tag、不碰 NAS/生产。
分支与 commit：`runtime-core-profile`；core 版本分离提交 `0a7590fc`。`.7` core 候选及其 tag 作废。
变更级别：C3
ADR：ADR 0013（core 版本分离，Proposed）；ADR 0012 已标 Superseded。

## 变更清单

- 正式 core 版本定为 `1.8.8-omnisurge.8`，完整 host 仍为 `.7`；不使用 `-core` 后缀，因为产品 adapter 的 `hostRequirement` 正则只接受 `-omnisurge.<n>`，独立递增 `.8` 无需修改产品 host 版本解析。
- `scripts/runtime-core-version.mjs` 为唯一版本源；`build-runtime-core`、`pack-runtime-core`、boundary check 读取它。
- boundary check 增加：core version 必须等于 `CORE_VERSION`，且不得等于根 package version（当前根 `.7`）。
- `release/inputs/runtime-core/package-lock.json` 与 `SHA256SUMS` 冻结为 `.8`。
- ADR 0012 标 Superseded；新增 ADR 0013，索引/sidebar 同步。

## 正式 core tarball

- 路径：`.../dist/opencli-runtime-core-1.8.8-omnisurge.8.tgz`
- SHA256：`d44aa9bccd50ed5e8543fcc239fa636dc43298245caf070258cf734ec6203d24`
- bytes：`29,982`
- entries：`28`
- package：`@jackwener/opencli@1.8.8-omnisurge.8`，`private=true`，`main/bin=runtime-core.js`，`engines.node=>=20.18.1`，`opencliFork.coreProfile=runtime-core`
- 两次 `npm run pack:runtime-core` 字节相同（`cmp` SAME）
- 内容边界：不含 `clis/`、`browser/`、`download/`、`skills/`、`scripts/`、tests、docs；依赖仅 `commander`、`js-yaml`、`cli-table3`，lock 为 tarball 内 `npm-shrinkwrap.json`。

## embedded-SCCS staging pack（产品脚本副本验证）

- 路径：`.../.scratch/sccs-runtime-core-formal-20261124/product-root/release/dist/sccs-runtime-1.8.8-omnisurge.8.tgz`
- SHA256：`784b31700a7d2195ce25d25f79c3817f47dd0c5b58ab054226dad2881127b40e`
- bytes：`4,548,817`；entries：`4,670`（core 179，adapter 4,490）
- 产品脚本副本：`product-root/release/pack-sccs-runtime.sh`；两次打包字节相同（`tar --format=ustar` + `gzip -n`，固定 mtime）。
- 产品 diff 还包含 adapter package-lock peer `.8`、README/docs 的 `runtime-core.js` 路径；pack 脚本补 `opencli-host-release.json.commit`/`runtime-core-profile` patch 断言与 core `--version` smoke。
- core 断言：文件名、SHA256、entries=28、package version/main/bin/coreProfile；不复制完整 host `HOST_LOCKFILE`。
- adapter 副本 pin：`1.8.8-omnisurge.8` / `0a7590fc...`；package peer/opencli-plugin/opencli-host-release/setup-check 同步；peer link 仍为 `../../../../opencli-runtime`。
- 挂载环境：`OPENCLI_HOME=<private>`、`OPENCLI_EXTRA_CLIS_DIR=<payload>/sccs-adapter`、`OPENCLI_EMBEDDED=1`。
- doctor：`ok=true`、`ready_for_cli=true`、`ready_for_agent=true`、`ready_for_business=false`（无登录，符合隔离 smoke）。
- 产品 lifecycle 测试副本：`python3 -m unittest -v release.tests.test_lifecycle`，21/21 OK；`manage.py`/test 已改为 `runtime-core.js`。

## 真实路径 spot check

Node `v20.18.1`（npx 缓存的真实 Node 20 二进制）对 staging pack 执行：

```text
runtime-core.js --version        -> 1.8.8-omnisurge.8, exit 0
sccs --help                      -> PASS
list sccs --format json          -> PASS
sccs status --json               -> PASS (disconnected, exit 0)
sccs login-api --help            -> PASS
doctor --host-bin runtime-core.js-> ok=true, ready_for_cli=true
```

Node 24.14.0 同样通过；`sccs login` / `sccs auth-export` 在 core-only 下：

```text
exit 69, BROWSER_CAPABILITY_UNAVAILABLE
```

## 门禁

- `npx tsc --noEmit`：通过
- `npm run check:runtime-core`：26 JS files，deps 仅三项
- `npx vitest run src/runtime-core.test.ts`：9/9（含 `--json` 快捷方式与命令自带 json 参数回归）
- `npm run check:adr`：OK（13 ADR）
- `npm run ci:fork:full`：EXIT=0，640 files / 7,518 passed / 1 skipped；覆盖 tsc、genericity、docs、build/manifest、约定基线与 npm test
- `npm run check:docs`：EXIT=0（260 docs / 13 ADR / 14 evidence；VitePress build 完成）

## Browser 结论

- 产品接受 `sccs login` / `sccs auth-export` 在 core-only 下不可用；业务登录路径使用 `sccs login-api`（`sccs-dsh-login` 走它）。
- 不提供可选 browser capability：代价是把 browser/download 依赖树、Chromium/daemon 或平台 WebView 适配重新塞回 core，包体和攻击面回到完整 host；如产品确需这两条旧命令，另开 ADR，不在本候选暗含。
- `sccs connect` 虽 `browser:false`，但真实连接依赖系统 WebView；本批只验证 `--help`，产品若使用需在目标 OS 另做真实连接验收。

## 独立复核（core-reviewer）

- 结论：**PASS（仅限 core-only `.8` 正式候选；不等于发布/上线）**。
- 第 1 项 adapter pin：PASS（staging 已对齐、doctor 通过；产品 patch 已含 package-lock/README/docs 修正；产品 tracked 文件仍未改）。
- 第 2 项 staging fail-open/复现：PASS（两次字节相同；无 `|| true`；`npm ci`、SHA、entries、identity fail-closed；残余收紧项已在 product handoff 标注）。
- 第 3 项 `.7` 双字节：PASS（core `.8` 独立递增，boundary 拒绝同版本；完整 host `.7` 未构建/未发布）。
- 第 4 项产品 pack 路径：PASS（staging 已验证；产品正式仓仍待应用 patch）。
- 第 5 项 ADR：PASS（0012 Superseded；0013 复核后改 Accepted）。
- 复核后仍需产品侧完成：应用 `product-core-only.patch`、跑产品测试、真实 SCCS 验收；这些不阻断 core 候选，但阻断产品发布。

## 未验边界与风险

- 真实 SCCS `login-api`、`sccs-dsh-login`、业务写命令未执行；无真实凭据/账号；本批只验证 `login-api --help`。
- 产品 staging 副本未回写产品仓；产品正式接入需应用 `product-core-only.patch` 并跑产品自己的测试。
- `sccs connect` 真实 WebView 未验（macOS/Windows/Linux）。
- 产品仓 tracked 文件未改；只提供 staging diff，产品正式接入尚未发生。
- 完整 host `.7` 仍是根 package 版本，但未构建/未发布；禁止发布完整 host `.7` 的同版本字节。
- core tarball 可字节复现；staging pack 已用固定 mtime + gzip -n 复现，仍依赖 macOS `tar` 行为，其他平台打包需产品侧复核。

## 回退

- 产品继续使用 `.6` 完整 host（`dffe8ba1`）和旧 payload；本候选未安装。
- 删除 staging `.8` pack 和 core `.8` tarball 即可回到无候选状态；不涉及产品 tracked 文件。
- `.7` core tarball/tag 作废，不得回退到 `.7`。

## 结论

**候选状态，不是发布。** core tarball 和 staging pack 可交付；正式产品接入仍以产品侧应用 diff、真实 SCCS 验收和 core-reviewer 复核为前提。
