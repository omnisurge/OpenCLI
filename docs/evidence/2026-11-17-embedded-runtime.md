# 嵌入式运行时契约验收（2026-11-17）

- 日期：2026-11-17
- 分支与 commit：feat/embedded-runtime-contract，基于 915e5711（.3 发行提交）；本批代码/文档在提交前按此工作树验收
- 变更级别：C2
- ADR：[ADR 0003](../adr/0003-embedded-runtime-contract.md)（Proposed）、[ADR 0004](../adr/0004-embedded-host-delivery-contract.md)（Proposed）、[ADR 0005](../adr/0005-product-naming-and-technical-identity.md)（Proposed）
- 目标/范围：实现 OPENCLI_HOME、OPENCLI_EXTRA_CLIS_DIR、OPENCLI_EMBEDDED 三条运行时契约；补齐状态路径、额外目录失败可见性、宿主模块解析验收、doctor/daemon 的 embedded 提示；不安装、不发布 npm、不 tag。

## 变更清单

- src/embedded-runtime.ts：新增 opencliRoot / extraClisDirs / isEmbeddedRuntime；OPENCLI_HOME trim + 绝对化，extra dirs trim/去空/解析/去重。
- src/discovery.ts：extra dir 改为 readdir + 失败 warn；无 site 子目录的 flat 布局显式告警。
- 14 个运行时文件：状态路径改经 opencliRoot()（clis/plugins/monorepos/lock/sites/cache/profile/network-cache/verify/auth/apps/artifact/update-check/shim）。
- src/doctor.ts、src/browser/daemon-lifecycle.ts：embedded 下不再输出上游 npm/GitHub 安装建议，改为产品发行提示。
- 测试：src/embedded-runtime.test.ts、src/discovery.extra.test.ts；doctor.test.ts 与 update-check.register.test.ts 补 embedded 用例。
- ADR 0003/0004/0005/0006、index/sidebar、package.json patches；version bump 到 1.8.8-omnisurge.4。

## 执行的门禁

| 命令 | 结果 | 备注 |
|---|---|---|
| npx tsc --noEmit | 通过 | exit 0 |
| npm test | 通过 | 638 files；7506 passed / 1 skipped |
| npm run check:adr | 通过 | 6 ADR |
| npm run check:docs | 通过 | 243 docs / 6 ADR / 4 evidence；VitePress 构建完成 |
| npm run build + git diff --exit-code HEAD -- cli-manifest.json | 通过 | manifest 1366 entries，无漂移 |
| npm run ci:fork:full | 通过 | 638 files；7506 passed / 1 skipped；tsc/docs/build/manifest/unit/extension/adapter 全绿 |

## 真实路径 spot check

环境：HOME=$(mktemp -d)、OPENCLI_HOME=TMP/oh、OPENCLI_EMBEDDED=1、无全局 opencli、无 ~/.opencli；运行构建产物 node dist/src/main.js list --format json。

- exit 0；stdout 1,431,240 bytes；stderr 0 bytes。
- $HOME/.opencli 不存在；OPENCLI_HOME 下生成 clis/、node_modules/@jackwener/opencli、package.json。
- 无 update-check.json；embedded 更新链未触发。
- 额外目录：临时 EXTRA/sccs/hello.js（真实 import @jackwener/opencli/registry）经 OPENCLI_EXTRA_CLIS_DIR=EXTRA 加载，list --format json 出现 sccs/hello；stderr 0，无 Failed to load module；无 update 缓存。
- 单元测试覆盖：missing dir、file-not-dir、flat plugin 目录、真实 registry import fixture；doctor embedded 不输出上游安装/下载建议；update-check embedded 不注册 exit handler、不 fetch。

## 未验边界与风险

- 未验证真实 daemon/extension 链路；固定端口 19825 与全局 opencli 的 daemon 共存问题未解决，宿主必须避免混用（ADR 0004）。
- 未验证 Windows/Linux、跨平台 Node、真实 Browser Bridge 扩展安装。
- 未验证产品 supervision-assistant payload 组装/调用接线/真实 SCCS 平台；ADR 0004 阶段 2-5 属产品仓 follow-up。
- 产品 adapter peerDependencies/opencli-plugin.json 仍精确 pin 1.8.8-omnisurge.2；.4 消费前需产品侧更新 pin（ADR 0004 已记录联动）。
- 未迁移旧 ~/.opencli 数据；切换形态后首次使用要求重新登录（产品 ADR 0048 风险）。
- 未全局安装 .4；真实全局 opencli 仍是 .2。

## 回退

- 本批为工作树/分支变更，未替换全局安装、未发布 npm、未推 tag；回退为丢弃本分支/回滚提交。
- .3 tgz 保留不覆盖；产品若已 pin .3 不受影响。

## 结论

三条运行时契约、状态路径、额外目录失败可见性、宿主 registry import、embedded doctor 提示与目标单测/单文件路径验收通过。未达到产品端到端内嵌验收，未验证真实 daemon/extension/平台；不把本证据外推为 supervision-assistant 已完成内嵌。
