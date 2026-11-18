# 1.8.8-omnisurge.5 本地/私有发行证据

- 状态：候选（独立审查通过前不构成发版批准）
- 分支：release/1.8.8-omnisurge.2
- 代码基线：f2b034ef（extra dir/genericity 修复）；版本准备提交 0bd3037f（本文件所在提交）
- 产物构建源：0bd3037f，构建时工作区干净；npm pack 的 prepare/build 未改变 cli-manifest.json（构建后 diff 为 0）
- 变更级别：C3（版本/打包）；继承 C2 修复
- ADR：ADR 0008（.5 发布，Proposed）；ADR 0003（两项缺口修复）
- 授权：所有者 2026-11-18 明确“走.5吧”；范围仅本地/私有 .5 候选，不含安装/npm/标签/生产

## 产物

- 文件：/Users/panhaowei/Omnisurge/releases/opencli/1.8.8-omnisurge.5/jackwener-opencli-1.8.8-omnisurge.5.tgz
- SHA256：7b44118dbd794778a4c3d8afae41a097b129dfcfb1b6b0f59d9f1ab4a39f5c54
- 大小：2,300,737 bytes
- 条目数：1,679
- SHA256SUMS：同目录 SHA256SUMS；shasum -a 256 -c 通过
- package 元数据：name=@jackwener/opencli，version=1.8.8-omnisurge.5，private=true，opencliFork.distribution=omnisurge
- patches：non-browser-trace、public-error-output-redaction、immutable-error-trace-receipts、framework-diagnostics-redaction、workflow-fork-guards、fork-aware-update-notifier、embedded-runtime-contract
- 产物未包含 docs/evidence；发布目录只放 tgz、SHA256SUMS 与说明

## 执行的门禁

| 命令 | 结果 |
|---|---|
| npm run ci:fork:full | 通过；638 test files，7,508 passed / 1 skipped；tsc、docs、build/manifest、genericity、unit、extension、adapter 全绿 |
| npm run check:adr | 通过；8 ADR |
| npm run check:docs | 通过；249 docs / 8 ADR / 8 evidence；VitePress build 5.86s |
| npm run check:genericity | 通过；207 个 src 文件 |
| npm run build + git diff --exit-code HEAD -- cli-manifest.json | 通过；manifest 1,366 entries，无漂移 |
| npm pack + SHA256SUMS | 通过；SHA256 与产物一致 |

## 真实路径 spot check

- tgz 解包到临时目录，node_modules 仅做只读 symlink（不是安装）。
- 临时 HOME、OPENCLI_HOME、OPENCLI_CACHE_DIR、OPENCLI_CONFIG_DIR、OPENCLI_EMBEDDED=1、OPENCLI_EXTRA_CLIS_DIR：
  - node package/dist/src/main.js --version → 1.8.8-omnisurge.5
  - node package/dist/src/main.js list --format json → exit 0，1,367 commands（基线 1,366 + probe/hello），probe/hello 存在
  - stderr 出现 flat 文件 warning 与不可读 site warning，但其他 site 仍加载，exit 0
  - HOME/.opencli 不存在；OPENCLI_HOME 仅有 package.json、clis、node_modules，无 update-check.json
- 未执行全局安装；未执行 npm publish、GitHub Release、tag push 或上游 release/docs workflow。

## 未验边界与风险

- 独立审查尚未进行；ADR 0008 在审查通过前保持 Proposed。本文件不能单独作为发版批准。
- 未做全局安装/干净 install-from-tgz；未验证安装后回退；未跑真实业务命令。
- 未验证 daemon/extension 实链路、Windows/Linux、真实浏览器 E2E；仅 macOS 本机与临时 HOME。
- 未把 .5 pin 到产品仓；产品内嵌端到端和 SCCS 适配器升级属下游动作。
- .4 冻结产物与历史证据未改写；.5 不自动追认 .4。

## 回退方法

- 保留 .4 tgz 与 SHA256；若 .5 不可用，重新使用 .4 包并记录版本/命令，不覆盖历史证据。
- 源码回退到 f2b034ef 或 .4 代码提交 fa1e00e9；不得用上游 npm 包假装回退。

## 结论

1.8.8-omnisurge.5 本地/私有候选已从干净提交构建，版本、SHA256、SHA256SUMS、embedded list、extra dir 两项修复和全量门禁通过。尚未独立审查、未安装、未发布 npm、未打标签，因此不能声称发版批准或用户终端已获得 .5。
