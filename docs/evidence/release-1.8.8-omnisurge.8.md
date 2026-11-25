# Release 1.8.8-omnisurge.8（runtime-core only）

- 日期：2026-11-25
- 变更级别：C3（发行）
- ADR：0013 core-only 版本分离；0012 已 Superseded
- 范围：core-only / browserless 的 runtime-core 发行物；不改变完整 host .6 回退线，不发布 npm，不运行上游 release workflow，不安装全局。

## 身份

- 分支：runtime-core-profile
- 被标记提交：0a7590fcd7fcd39e5f30b190b904bc04ffdee0e5
- Tag：v1.8.8-omnisurge.8（annotated tag object 1210864086cac640f80fdb8c4d2210ba2882ea61）
- 证据 docs HEAD：d94244552ef495d902ff025a564864315bdada7f
- 产物：opencli-runtime-core-1.8.8-omnisurge.8.tgz
- SHA256：d44aa9bccd50ed5e8543fcc239fa636dc43298245caf070258cf734ec6203d24
- bytes / entries：29,982 / 28
- package version：1.8.8-omnisurge.8；main/bin=runtime-core.js；engines.node=>=20.18.1；opencliFork.coreProfile=runtime-core

## 发布前门禁

- npm run ci:fork:full：PASS（fork gate: full OK；unit 7518 passed / 1 skipped；extension/adapter 640 test files passed；docs/VitePress build passed）。
- 被标记提交的 .github/workflows/release.yml 命中 github.repository_owner == 'jackwener' 守卫；fork 不运行 npm publish。
- 根 package.json 保持完整 host .7；core version 由 scripts/runtime-core-version.mjs 单独提供 .8，符合 ADR 0013。
- 重建 npm run build:runtime-core && npm run pack:runtime-core 得到同一 SHA/bytes/entries。

## 发布与远端核验

- 本地稳定目录：~/Omnisurge/releases/opencli/1.8.8-omnisurge.8/，含 tgz、SHA256SUMS、README.md。
- 已 push tag 到 fork（git@github.com:omnisurge/OpenCLI.git）。
- 远端 refs：
  - refs/tags/v1.8.8-omnisurge.8 = 1210864086cac640f80fdb8c4d2210ba2882ea61
  - peeled refs/tags/v1.8.8-omnisurge.8^{} = 0a7590fcd7fcd39e5f30b190b904bc04ffdee0e5
- GitHub Release：https://github.com/omnisurge/OpenCLI/releases/tag/v1.8.8-omnisurge.8
- 从 GitHub Release 重新下载资产后核验：SHA256 d44aa9...、29,982 bytes、28 entries；asset API digest 与之一致。不是只信本地文件。

## 未验 / 边界

- 未全局安装、未替换用户 opencli、未做真实业务命令验收；本次是发行物发布，不是本机安装。
- core-only 明确无 browser bridge/SCCS 业务或认证 UI；sccs connect、真实 SCCS 登录/业务由产品侧另行验收。
- 完整 host .6 保持独立回退线；未删除旧 host 构建输入或发行物。
- 未运行上游 .github/workflows/release.yml，未发布 npm。

## 回退

- 本 core-only 回退使用上一版 core tar 或完整 host .6；不得用上游 npm 包冒充 fork 回退。
- 回退安装需单独授权并记录，不在本证据中执行。

## 结论

1.8.8-omnisurge.8 已按 tag/远端 release 核验发布；core tar 与 tag 均冻结。产品侧可引用该 tag 的不可变 artifact 或冻结副本；产品安装、SCCS 真实业务和生产上线不在本结论内。
