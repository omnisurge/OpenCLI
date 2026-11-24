# 2026-11-24-runtime-core-0.7-candidate

- 日期：2026-11-24
- 分支与 commit：工作分支 `runtime-core-profile`（基于 `release/1.8.8-omnisurge.2`）；core 候选实现/ADR 提交 `d6f58c62`，coreProfile 元数据提交 `0acd5637`；本文件提交后形成最终候选 HEAD
- 变更级别：C3
- ADR：[0012-core-only-candidate](../adr/0012-core-only-candidate.md)；关联 ADR 0003/0004/0010/0011
- 目标 / 范围：确认 `1.8.8-omnisurge.7` core-only 候选；收口未提交的 core commander/boundary 修改；补 engines；重建 core tarball；做 embedded-sccs staging pack 与 SCCS smoke
- 负责人 / 审查者：Lead 执行；独立 reviewer 待完成（本文件不代替 review）

## 变更清单

- `package.json` / `package-lock.json` / `release/inputs/runtime-core/package-lock.json`：版本改为 `1.8.8-omnisurge.7`；冻结核心的输入 lock 重新计算 SHA256。
- `scripts/build-runtime-core.mjs`：core profile 继承根包 `engines`。
- `scripts/check-runtime-core-boundary.mjs`：禁止 `undici`；要求 `engines.node === ">=20.18.1"`。
- `src/runtime-commander.ts`：core 子命令新增 `--json` 快捷方式（命令自身已有 `json` 参数时不覆盖）。
- `src/runtime-core.test.ts`：新增 `--json` 回归测试。
- `docs/adr/0012-core-only-candidate.md`、ADR 索引、VitePress sidebar：登记候选决定。

## 执行的门禁

| 命令 | 结果 | 备注 |
|---|---|---|
| `npx tsc --noEmit` | 通过 | 代码提交前 |
| `npx vitest run src/runtime-core.test.ts` | 通过 | 8 tests |
| `npm run build:runtime-core` | 通过 | clean commit 后重建 |
| `npm run check:runtime-core` | 通过 | 26 JS files；deps=commander,js-yaml,cli-table3 |
| `npm run ci:fork` | 通过 | 96 files / 1,556 passed / 1 skipped |
| `npm run ci:fork:full` | 通过 | 640 files / 7,517 passed / 1 skipped；manifest 无 diff |
| `npm run check:adr` | 通过 | 12 ADR |
| `npm run check:docs` | 通过 | 258 docs / 12 ADR / 13 evidence；VitePress build 通过 |

## core 产物

- 路径：`/Users/panhaowei/Development/OpenCLI/.agents/worktrees/runtime-core-profile/dist/opencli-runtime-core-1.8.8-omnisurge.7.tgz`
- SHA256：`e05610973985b4a39e1415a163701165d2609aacf07f988f619af287665bf33c`
- 字节数：29,982
- entries：28（tarball 内 `package/…`）
- package：`@jackwener/opencli@1.8.8-omnisurge.7`、private、`main=runtime-core.js`、`bin={opencli,opencli-core}`、`engines.node=>=20.18.1`、`opencliFork.coreProfile=runtime-core`
- 依赖：`commander ^14.0.3`、`js-yaml ^4.3.2`、`cli-table3 ^0.6.5`
- lock：tarball 内含 `npm-shrinkwrap.json`；构建目录另有 `package-lock.json`；两者均来自冻结输入，`npm ci --omit=dev --ignore-scripts` 实测安装 10 packages。
- 边界：core 内无 `clis/`、`browser/`、`download/`、`skills/`、`scripts/`、docs、tests、`cli-manifest.json`。
- 旧产物：`dist/opencli-runtime-core-1.8.8-omnisurge.6.tgz` 的旧 SHA `f7d4...` 不再作为候选；`.6` 完整 host 发行物保持不变。

## embedded-sccs staging pack

本批没有改产品仓 tracked 文件；使用产品仓 `adapters/sccs` 和新的 staging 脚本：

- 脚本：`/Users/panhaowei/Development/supervision-assistant/.scratch/sccs-runtime-core-20261124/pack-sccs-runtime-core.sh`
- 旧 staging 包（core 尚未加 coreProfile，仅历史）：`.../sccs-runtime-1.8.8-omnisurge.7.tgz`（SHA256 `2d86639e8e77c736cf335d4dd1b77d209c177c828ff1a5f0a8708fdb9cf1f14f`，5,042,114 bytes，4,670 entries；adapter doctor 因旧 pin 失败）
- 最终 staging 候选（fail-closed 脚本 + adapter pin 副本）：`.../sccs-runtime-1.8.8-omnisurge.7-pinned-candidate.tgz`（SHA256 `5c9fb4fb2f26bea2e4c987ec6f54ac9450cd44c008b60655c9ec6fa597e5e34b`，4,984,578 bytes，4,668 entries；adapter 副本 pin `.7`/`e365f9a9`，doctor `ready_for_cli=true`）
- 结构：`payload/opencli-runtime/` 来自 core tarball，`payload/sccs-adapter/sccs/` 来自产品 adapter；core 部分的顶层为 runtime JS、`node_modules`、`package.json`、`npm-shrinkwrap.json`，共 179 entries。
- peer link：`payload/sccs-adapter/sccs/node_modules/@jackwener/opencli -> ../../../../opencli-runtime`，解析到同一 realpath。
- mount：`OPENCLI_EXTRA_CLIS_DIR=<payload>/sccs-adapter`、`OPENCLI_HOME=<private home>/opencli`、`OPENCLI_EMBEDDED=1`。
- 产品脚本 `release/pack-sccs-runtime.sh` 仍指向完整 host 的 `dist/src/main.js`；本 staging 脚本证明 core 路径可行，但产品正式脚本/项目 pin 尚未合并。

## 真实路径 spot check

命令均在 staging payload 的隔离 `HOME` 下执行：

```text
runtime-core.js --version                  -> 1.8.8-omnisurge.7, exit 0
sccs --help                                -> usage + command list, exit 0
sccs status --json                         -> connected=false / disconnected, exit 0
list sccs --format json                    -> SCCS command registry JSON, exit 0
sccs list --json                           -> error: unknown command 'list', exit 1
sccs login-api --help                      -> browser:false command help, exit 0
sccs login --help                          -> help, exit 0
sccs auth-export --help                    -> help, exit 0
sccs connect --help                        -> help, exit 0
sccs login                                 -> BROWSER_CAPABILITY_UNAVAILABLE, exit 69
sccs auth-export                           -> BROWSER_CAPABILITY_UNAVAILABLE, exit 69
```

产品 adapter 当前 `scripts/opencli-host-release.json` 仍 pin `.6`/`dffe8ba1`；用该原样 adapter 跑 `sccs-setup.mjs doctor --host-bin .../runtime-core.js --json` 返回 `host_requirement.matches=false`、exit 1。把 adapter 副本的 `opencli-host-release.json` 改为 `.7`/`e365f9a9` 并补 `runtime-core-profile`，同时把 package/opencli-plugin peer 与 setup-check 改为 `.7` 后，`sccs-runtime-1.8.8-omnisurge.7-pinned-candidate.tgz` 的 doctor 返回 `ok=true`，`opencli_ok/plugin_ok/cli_ok/ready_for_cli/ready_for_agent=true`，`ready_for_business=false`（隔离 HOME 无登录，符合预期）。这说明产品 adapter 的 host pin 元数据必须先更新；本批没有改产品 source。

`sccs list` 不是实际命令；根命令 `list sccs` 才是发现入口。`sccs status` 的 `connected=false` 是隔离 HOME 无凭据的预期结果，不是登录失败；真实 `login-api`/业务命令未执行。

## 独立审查

- 2026-11-24 `core-reviewer`：**BLOCK**。核对了 core tarball SHA/内容/边界与 `--json`/engines 修改，但指出产品 adapter 仍 pin `.6`（原样 staging doctor exit 1）、staging 脚本 fail-open/不可复现、`.7` 同版本完整 host 与 core 双字节风险、产品 `pack-sccs-runtime.sh` 未适配 `runtime-core.js`、ADR 0012 的 package-lock/分支表述不一致。
- 2026-11-24 `core-reviewer-fast`：**APPROVE**（仅 core 候选代码范围；明确产品 adapter pin 是正式产品门槛，不是本候选代码 blocker）。
- 两个结论不一致，且 `core-reviewer` 的阻断项未全部处置；因此 ADR 0012 保持 Proposed，本批不能称为正式候选完成。

## 未验边界与风险

- 未执行真实 SCCS `login-api`、`sccs-dsh-login`、`connect` 或任何业务读写；无真实凭据，未验证 DSH 凭据/tenant/会话过期路径。
- 只在 macOS arm64 + Node v24.14.0 实测；Node 20.18.1 最低版本、Windows/Linux 未验。
- browser:true 的 `sccs login`/`sccs auth-export` 只验证了明确的 BROWSER_CAPABILITY_UNAVAILABLE 门禁；未提供可选 browser capability。
- product `pack-sccs-runtime.sh` 未改；staging pack 未合并进产品发布流程，产品 `HOST_VERSION/HOST_COMMIT` 未改。
- 产品 adapter 的 `opencli-host-release.json`、`opencli-plugin.json`、`package.json` peerDependencies 与 `setup-check.mjs` 仍含 `.6`/`.5` 旧 pin；未修改，正式 pack 前必须更新并重跑 doctor。
- 独立审查未完成；ADR 0012 仍为 Proposed。
- 未安装全局、未 npm 发布、未推标签、未替换生产 payload。

## 回退

- 产品当前完整 host：`~/Omnisurge/releases/opencli/1.8.8-omnisurge.6/jackwener-opencli-1.8.8-omnisurge.6.tgz`（SHA256 `b42fb5602d7d60d330004888496a944bdcc6770482971c84be664a045a14ca94`）。
- core 候选回退：不切换产品 pin；保留 `.6` 完整 host payload 作为回退。
- staging pack 可删除；不改 `.6` tag/tgz/SHA。

## 结论

`.7` 的 core-only 包已在 clean commit 后重建，core + SCCS staging load/smoke 通过；但产品正式接入、真实 SCCS、浏览器能力、独立审查仍有 BLOCK/未闭合项，因此只能判定为 **部分完成（正式候选，不是发布）**，不能称为正式交付。
