# release-1.8.8-omnisurge.3

- 日期：2026-11-17
- 分支与 commit：release/1.8.8-omnisurge.2，发行准备提交 16257c03；本证据随后续文档提交冻结
- 变更级别：C3
- ADR：[docs/adr/0002-release-omnisurge-3.md](../adr/0002-release-omnisurge-3.md)（Implemented）
- 目标/范围：把已验收的 ADR 0001 fork 更新提示修复打成 1.8.8-omnisurge.3 本地/私有 tgz；不发布 npm、不运行上游 workflow、不安装、不打标签。
- 负责人/审查者：负责人（Lead）；C2 实现已由 c2-reviewer 独立审查

## 变更清单

- package.json / package-lock.json：版本 1.8.8-omnisurge.2 → 1.8.8-omnisurge.3；name、private、opencliFork.upstreamVersion/upstreamCommit 保持不变。
- docs/adr/0002-release-omnisurge-3.md：记录本次 C3 发行范围；安装/标签明确排除。
- 发行物：jackwener-opencli-1.8.8-omnisurge.3.tgz；未修改 dist 以外的手写产物。

## 执行的门禁

| 命令 | 结果 | 备注 |
|---|---|---|
| npm run ci:fork:full | 通过 | 636 test files、7492 passed、1 skipped；含 tsc/docs/build/manifest/unit/extension/adapter |
| npm run build + manifest 核对 | 通过 | 打包阶段 prepare 重新构建；git diff --exit-code HEAD -- cli-manifest.json 通过 |
| npm run ci:fork:docs | 通过 | 文档门禁在证据落盘后复核 |
| npx vitest run src/update-check.test.ts src/update-check.register.test.ts | 18 passed | C2 目标测试，含 fork/upstream 双向注册测试 |

## 发行物

- 构建目录：/tmp/opencli-fork-release/1.8.8-omnisurge.3/jackwener-opencli-1.8.8-omnisurge.3.tgz
- durable 副本：/Users/panhaowei/Omnisurge/releases/opencli/1.8.8-omnisurge.3/jackwener-opencli-1.8.8-omnisurge.3.tgz
- SHA256：e0470749314aac7d4fc5b1fd85a417cd66c149d50fe4196e1cb597ba08c6f390
- 大小：2,296,776 bytes
- 条目数：1,676
- package 元数据：name=@jackwener/opencli，version=1.8.8-omnisurge.3，private=true，opencliFork.distribution=omnisurge
- SHA256SUMS：/Users/panhaowei/Omnisurge/releases/opencli/1.8.8-omnisurge.3/SHA256SUMS（内容与上面一致）

## 真实路径 spot check

- 当前全局 opencli 仍是 1.8.8-omnisurge.2：/Users/panhaowei/.local/node-v24.14.0-darwin-arm64/bin/opencli（symbolic link 到 ../lib/node_modules/@jackwener/opencli/dist/src/main.js）。本次未安装 .3。
- tgz 解包到临时目录，并用仓库 node_modules 做只读 symlink（不是安装）后：
  - node package/dist/src/main.js --version → 1.8.8-omnisurge.3
  - 在 HOME 下 seed latestVersion=2.0.3、最新 extension 和新鲜的 extensionLastSeenAt 后，node package/dist/src/main.js --help → exit 0、stdout 3649 bytes、stderr 0 bytes、无 Update available / Extension update available。
- 裸解包直接运行会因缺少 js-yaml 等运行依赖报 ERR_MODULE_NOT_FOUND，这是未安装依赖的预期结果；上面的 symlink 只用于验证包内代码，不算干净安装验证。

## 未验边界与风险

- 未执行全局安装；真实 opencli --help 仍指向旧 .2，用户终端尚未获得本修复。
- 未执行 npm publish、GitHub Release、tag push 或上游 release/docs workflow。
- 未验证 Windows/Linux、daemon/extension 实链路、浏览器 E2E；仅 macOS 本机。
- 未做干净 install-from-tgz 验证；安装后版本/业务命令、回退演练仍需在获得安装授权后补。
- doctor 的上游安装/下载建议仍是 ADR 0001 范围外残留。

## 回退

- 当前全局仍是 .2，不需要回退；若未来安装 .3 后需回退，重装现有 .2 全局包或从父提交 37aa5c3a 重建 .2 产物，并核对 opencli --version / list。
- 本版 tgz 与 SHA256SUMS 不覆盖；不要用上游 npm 包冒充回退。

## 结论

1.8.8-omnisurge.3 的本地/私有发行包已生成并通过包内版本、SHA256、artifact --version/--help 探针；发行门禁全绿。未安装、未发布 npm、未打标签，因此不能声称用户终端已修复。
