# 1.8.8-omnisurge.6 本地/私有发行证据

- 状态：本地/私有 .6 已正式发行；安装/发布 npm/标签推送/生产未授权
- 分支：release/1.8.8-omnisurge.2
- 代码基线：9d7752e8（lockfile reconcile + regression test）；版本准备提交 01a202e2
- 产物构建源：01a202e2，构建时工作区干净；npm pack 的 prepare/build 未改变 cli-manifest.json（构建后 diff 为 0）
- 变更级别：C3（版本/打包）；包含 C1 lockfile reconcile
- ADR：ADR 0009（.6 发布，Implemented；仅本地/私有发行）；ADR 0008（.5 历史）
- 授权：所有者 2026-11-20 明确说“现在先发.6版本”；范围为本地/私有 .6 发行，不含安装/npm/推送标签/生产
- 本地 tag：v1.8.8-omnisurge.6（本证据提交；仅本地，未推送）

## 产物

- 文件：/Users/panhaowei/Omnisurge/releases/opencli/1.8.8-omnisurge.6/jackwener-opencli-1.8.8-omnisurge.6.tgz
- SHA256：b42fb5602d7d60d330004888496a944bdcc6770482971c84be664a045a14ca94
- 大小：2,300,739 bytes
- 条目数：1,679
- SHA256SUMS：同目录；shasum -a 256 -c 通过
- package 元数据：name=@jackwener/opencli，version=1.8.8-omnisurge.6，private=true，opencliFork.distribution=omnisurge
- patches：non-browser-trace、public-error-output-redaction、immutable-error-trace-receipts、framework-diagnostics-redaction、workflow-fork-guards、fork-aware-update-notifier、embedded-runtime-contract
- 产物不含 docs/evidence，也不含 SCCS adapter；SCCS 仍由 supervision-assistant 产品侧装配

## 执行的门禁

| 命令 | 结果 |
|---|---|
| npm run ci:fork:full | 通过；639 test files，7,509 passed / 1 skipped；tsc、docs、build/manifest、genericity、unit、extension、adapter 全绿 |
| npm run check:adr | 通过；9 ADR |
| npm run check:docs | 通过；252 docs / 9 ADR / 10 evidence；VitePress build 通过 |
| npm run check:genericity | 通过；208 个 src 文件 |
| npm run build + git diff --exit-code HEAD -- cli-manifest.json | 通过；manifest 1,366 entries，无漂移 |
| npm pack + SHA256SUMS | 通过；SHA256 与产物一致 |

## 依赖 pin 核对

- package.json：turndown ^7.2.4，ws ^8.22.0
- package-lock.json：turndown 7.2.4，ws 8.22.0，SRI 与 supervision-assistant DEPENDENCY_PINS 对应项一致
- 全部 16 个 DEPENDENCY_PINS 对照：16/16 OK
- .5 的旧 lock（turndown 7.2.2 / ws 8.21.0）不在 .6 源树；.5 tag/tgz 保持原样

## 包级 spot check

- tgz 解包到临时目录；临时 HOME、OPENCLI_HOME、OPENCLI_CACHE_DIR、OPENCLI_CONFIG_DIR、OPENCLI_EMBEDDED=1；node_modules 仅通过本仓 symlink 只读复用（不是安装）
- node package/dist/src/main.js --version → 1.8.8-omnisurge.6
- node package/dist/src/main.js list --format json → exit 0，1,366 commands
- HOME/.opencli 不存在
- 另以 .6 host tgz + 本仓 package-lock.json 在临时目录执行 npm ci --omit=dev --ignore-scripts：成功，实际 turndown=7.2.4、ws=8.22.0

## 独立审查

- 审查者：release-reviewer，只读；审查范围仅 .6 本地/私有候选
- 结论：APPROVE（仅 .6 本地/私有候选；`.4`/安装/生产仍不批准）
- 核对：HEAD 01a202e2 工作区干净；包内非 dist 1,461/1,461 文件匹配 01a202e2，dist 218/218 匹配本机构建；SHA/大小/entries 与证据一致；turndown/ws 与 DEPENDENCY_PINS 16/16 匹配；包级 --version/list 通过；.5 tag/tgz/evidence 无变化；.6 包内无 sccs/supervision 路径
- 非阻断建议：ADR 0009 原“tgz 内 package-lock”措辞已修正为“.5 源树 lock”；未提交 evidence 状态已在本记录中正式化

## 未验边界与风险

- 未执行全局安装、npm publish、GitHub Release、tag push 或上游 release/docs workflow。
- 未验证 Windows/Linux、daemon/extension 实链路、真实浏览器 E2E 或真实业务命令。
- 未执行 supervision-assistant 的实际 pack-sccs-runtime.sh；产品侧 HOST_VERSION/HOST_COMMIT 更新和 SCCS payload repack 属下游动作。
- .6 只覆盖 fork lockfile 修复和版本打包，不包含产品能力分层、轻量化或品牌技术改名。

## 回退方法

- .5 tgz 与 SHA256 保留在 ~/Omnisurge/releases/opencli/1.8.8-omnisurge.5/；若 .6 不可用，重新使用 .5 包并记录版本/命令，不覆盖历史证据。
- 源码可回退到 0207ccc7（.5 tag）或 9d7752e8 之前；不得用上游 npm 包假装回退。

## 结论

1.8.8-omnisurge.6 已在干净提交 01a202e2 上构建，版本、SHA256、SHA256SUMS、依赖 pin、全量门禁和包级 --version/list spot check 已记录；独立 release-reviewer 已给出 APPROVE（仅本地/私有候选），因此作为本地/私有正式发行。未安装到全局、未发布 npm、未推送标签，不能声称终端已获得 .6。
