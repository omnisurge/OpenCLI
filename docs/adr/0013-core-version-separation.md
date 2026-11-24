# ADR 0013：core-only 正式版本与完整 host 版本分离

- 状态：Proposed（2026-11-24，等待核心包与产品 staging 复核）
- 关联：ADR 0012（被本 ADR 取代）、ADR 0003、ADR 0004、ADR 0010、ADR 0011
- 变更级别：C3

## 背景

ADR 0012 曾把 core-only 候选定为 `1.8.8-omnisurge.7`，但根包同时可以是 `1.8.8-omnisurge.7` 的完整 host。即使只发布 core tarball，同一 `@jackwener/opencli@1.8.8-omnisurge.7` 仍可能出现两种不同字节，违反可回退的发行身份。

## 决策

1. 正式 core-only 版本使用独立递增的 `1.8.8-omnisurge.8`；完整 host 的版本线保持在 `.7`，不发布完整 host `.8`。两者不得共用版本号。
2. core profile 的 package version 由 `scripts/runtime-core-version.mjs` 单一提供；`build-runtime-core`、`pack-runtime-core`、boundary check 都读取该常量。boundary check 同时拒绝 core version 等于根包 version。
3. core package 保持 `name=@jackwener/opencli`、`private=true`、`main/bin=runtime-core.js`、`engines.node=>=20.18.1`，并带 `opencliFork.coreProfile=runtime-core`。tarball 内只允许一个 core 字节版本；旧 `.7` core tarball/tag 作废。
4. core 的冻结 lock 改为 `release/inputs/runtime-core/package-lock.json@1.8.8-omnisurge.8`，其 SHA 重新记录；tarball 内使用 `npm-shrinkwrap.json`。
5. 产品 adapter 的 fork pin 改为 `.8` 对应的 core commit；产品 `pack-sccs-runtime.sh`、`release/manage.py`、release tests 必须使用 `runtime-core.js`，不复制完整 host 的 `HOST_LOCKFILE`。
6. 产品正式接入另走产品发布闸门；本 ADR 不修改产品仓 tracked 文件，不安装全局，不推送 tag。

## 验收

1. core tarball：version `1.8.8-omnisurge.8`、SHA256/bytes/entries 写入 evidence；同一源码重复 `npm pack` SHA 相同；不含 `clis/`、`browser/`、`download/`、`skills/`、`scripts/`、tests、docs。
2. `npm run check:runtime-core` 通过；boundary 拒绝同版本、拒绝 `undici`，并确认 `opencliFork.coreProfile=runtime-core`。
3. Node `20.18.1` 至少真实运行一次 core `--version` 和 SCCS smoke；若无法执行，产品只支持已验证的 Node 版本并在 evidence 标明。
4. core + adapter staging pack 通过 list/status/help/login-api --help smoke；doctor `ready_for_cli=true`；同一 core 包只对应一个 staging 产物输入。
5. `core-reviewer` 对 A-E 阻断项给出 PASS/BLOCK；ADR 0012 标 Superseded，ADR 0013 在 reviewer PASS 前保持 Proposed。
6. 产品侧拿到 `HOST_VERSION=1.8.8-omnisurge.8`、`HOST_COMMIT=0a7590fcd7fcd39e5f30b190b904bc04ffdee0e5` 和 pack diff 后才可进入正式接入。

## 边界

- 不改产品仓 tracked 文件；staging 只读产品 adapter，修改其副本。
- 不把 `.8` 宣称为 npm 发布、GitHub Release 或生产可用；不推 tag、不装全局、不碰 NAS/生产。
- 不恢复 `.7` core tag/包；`.6` 完整 host 仍是产品回退。
- 不引入 browser capability；`login`/`auth-export` 的 core-only 限制由产品侧明确接受或另开可选能力决策。
