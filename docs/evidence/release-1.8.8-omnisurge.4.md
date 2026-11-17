# 发布 1.8.8-omnisurge.4（2026-11-17）

- 版本：1.8.8-omnisurge.4
- 分支与 commit：feat/embedded-runtime-contract，基于 915e5711（.3 发行提交）；本版在提交前的工作树打包
- 变更级别：C3（版本/打包/证据）
- ADR：[ADR 0003](../adr/0003-embedded-runtime-contract.md)（运行时契约，Implemented）、[ADR 0004](../adr/0004-embedded-host-delivery-contract.md)（宿主交付契约，Proposed）、[ADR 0005](../adr/0005-product-naming-and-technical-identity.md)（命名，Proposed）、[ADR 0006](../adr/0006-release-omnisurge-4.md)（本版发布，Implemented）
- 上游基线：1.8.8 / 24136945，未升级；fork 补丁新增 embedded-runtime-contract
- 目的：把嵌入式运行环境契约（OPENCLI_HOME / OPENCLI_EXTRA_CLIS_DIR / OPENCLI_EMBEDDED）作为 .4 交付物，不安装、不发布 npm、不推 tag

## 产物

- 文件：/Users/panhaowei/Omnisurge/releases/opencli/1.8.8-omnisurge.4/jackwener-opencli-1.8.8-omnisurge.4.tgz
- SHA256：08ee4c7c6951ed634e8f685b0f43a3a7758c4bc747a8beb465052bdba8839c44
- 大小：2,299,793 bytes
- 条目数：1,678
- SHA256SUMS：同目录 SHA256SUMS（shasum -a 256 -c 通过）
- package 元数据：name=@jackwener/opencli，version=1.8.8-omnisurge.4，private=true，opencliFork.distribution=omnisurge
- patches：non-browser-trace、public-error-output-redaction、immutable-error-trace-receipts、framework-diagnostics-redaction、workflow-fork-guards、fork-aware-update-notifier、embedded-runtime-contract

## 执行的门禁

| 命令 | 结果 |
|---|---|
| npm run ci:fork:full | 通过；638 files；7506 passed / 1 skipped；tsc、docs、build/manifest、unit、extension、adapter 全绿 |
| npm run check:adr | 通过；6 ADR |
| npm run check:docs | 通过；VitePress 构建完成 |
| npm run build + git diff --exit-code HEAD -- cli-manifest.json | 通过；manifest 1366 entries，无漂移 |

## 真实路径 spot check

- tgz 解包到临时目录，node_modules 仅做只读 symlink（不是安装）：
  - node package/dist/src/main.js --version → 1.8.8-omnisurge.4
  - 临时 HOME + OPENCLI_HOME + OPENCLI_EMBEDDED=1 下 node package/dist/src/main.js list --format json：exit 0，stdout 1,431,240 bytes，stderr 0，$HOME/.opencli 不存在，OPENCLI_HOME 内无 update-check.json
- 产物 SHA256 与 SHA256SUMS 一致。
- 未执行全局安装；未执行 npm publish、GitHub Release、tag push 或上游 release/docs workflow。

## 未验边界与风险

- 未安装到全局；现有全局 opencli 仍是 1.8.8-omnisurge.2，用户终端尚未获得本版。
- 未验证 daemon/extension 实链路、Windows/Linux、浏览器 E2E；仅 macOS 本机与临时 HOME。
- 未验证 supervision-assistant payload 组装/调用、真实 SCCS 平台；产品 ADR 0048 阶段 2-5 仍未实施，adapter peer pin 仍为 .2。
- 固定 daemon 端口 19825 与全局 opencli 共存问题未解决；宿主不得同时使用两套 daemon。
- 升级/回退只在包层验证；干净 install-from-tgz 与业务命令未验。

## 回退

- 上一版 .3 tgz 与 SHA256SUMS 保留在 /Users/panhaowei/Omnisurge/releases/opencli/1.8.8-omnisurge.3/，未被覆盖。
- 当前未安装 .4，无需回退；若安装后回退，重装 .3 并核对 opencli --version / list；不得用上游 npm 包冒充回退。

## 结论

1.8.8-omnisurge.4 的本地/私有发行包已生成，版本、SHA256、包内版本、隔离 HOME 下的 embedded list 探针和发行门禁通过。未安装、未发布 npm、未打标签，因此不能声称用户终端已获得 .4，也不能声称产品内嵌已完成。
