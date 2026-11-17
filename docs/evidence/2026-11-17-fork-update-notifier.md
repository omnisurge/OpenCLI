# 2026-11-17 fork-aware update notifier

## 目标/范围

实现 ADR 0001：fork 分发版不再输出指向上游 npm/GitHub Releases 的升级提示；所有分发版都可用 OPENCLI_NO_UPDATE_NOTIFIER 关闭 notice 注册。只改 package 身份读取与 update-check 的提示短路/注册入口，不改后台拉取、缓存协议、拉取频率或上游 URL。

- 分支：fix/fork-update-notifier（基于 C1 提交 98c9dc40；C2 实现提交：5cf9ee18；本证据随 C2 文档提交）
- 变更级别：C2
- ADR：[docs/adr/0001-fork-aware-update-notifier.md](../adr/0001-fork-aware-update-notifier.md)（Implemented）

## 变更清单

- src/version.ts：纳入可测试的 parseDistribution；从已解析的 package.json 导出 PKG_DISTRIBUTION；无字段、空串、空白、非字符串或读失败均 fail-open 为 undefined（上游）。
- src/update-check.ts：buildUpdateNotices 的 isForkDistribution 改为必填并在生产调用点传入；fork 时在生成任何行之前返回 {}；registerUpdateNoticeOnExit 增加 OPENCLI_NO_UPDATE_NOTIFIER 非空短路。
- src/update-check.test.ts：package stamp、fork fixture（1.8.8-omnisurge.2 vs 2.0.3，CLI+extension）、无 stamp 上游回归、env 不注册 exit hook、parseDistribution fail-open。
- src/update-check.register.test.ts：动态 mock node:fs 注入 package stamp 与 cache，注册并捕获真实 exit handler；fork 包断言无 stderr，无 stamp 包断言 CLI+extension 两行。锁定生产调用链与上游方向（删除传参、强制 fork 常量或恒 return 都会红）。
- package.json：opencliFork.patches 登记 fork-aware-update-notifier；版本不变。

## 执行的门禁与结果

- npx tsc --noEmit：通过。
- npx vitest run src/update-check.test.ts src/update-check.register.test.ts：18 passed（16 + 2）。
- npm run build：通过；git diff --exit-code HEAD -- cli-manifest.json 通过。
- npm run ci:fork:full：通过；636 test files、7492 passed、1 skipped；包含 build、manifest、约定基线与全部测试（最终代码）。
- 文档门禁（full gate 内调用）：check:docs 通过，236 docs / 1 ADR / 2 evidence；VitePress 构建通过。

## 真实路径 spot check

~~~text
TMP=$(mktemp -d)
mkdir -p "$TMP/.opencli"
NOW=$(node -e 'process.stdout.write(String(Date.now()))')
printf '{"lastCheck":%s,"latestVersion":"2.0.3","latestExtensionVersion":"2.1.0","currentExtensionVersion":"2.0.0","extensionLastSeenAt":%s}' "$NOW" "$NOW" \
  > "$TMP/.opencli/update-check.json"
env -u CI -u CONTINUOUS_INTEGRATION -u OPENCLI_NO_UPDATE_NOTIFIER HOME="$TMP" \
  node dist/src/main.js --help
~~~

实际 seed（2026-11-17 快照）：

~~~json
{"lastCheck":1794901099969,"latestVersion":"2.0.3","latestExtensionVersion":"2.1.0","currentExtensionVersion":"2.0.0","extensionLastSeenAt":1794901099969}
~~~

fork 结果：exit 0；stdout 3649 bytes；stderr 0 bytes；未出现 Update available 或 Extension update available。未用 --version 作探针。

同一 cache 的上游对照（内置 buildUpdateNotices，isForkDistribution: false）返回两条非空行，证明抑制来自 fork 判定而非空缓存/环境：

~~~json
{"cli":"\n  Update available: v1.8.8-omnisurge.2 → v2.0.3\n  Run: npm install -g @jackwener/opencli\n","extension":"\n  Extension update available: v2.0.0 → v2.1.0\n  Download: https://github.com/jackwener/opencli/releases\n"}
~~~

## 独立审查

- 审查者：c2-reviewer（独立子代理，只读审查；未继承本会话）
- 首轮结论：无 P0；1 条 P1（生产调用链未被测试锁定，删除传参仍绿）与 5 条 P2（正向 hook、fail-open 解析、证据 seed、ADR/证据收尾、doctor 残留）。
- 处置：P1 已用必填参数 + fork/upstream 双向注册级集成测试修复；P2 的正向 hook、parseDistribution、seed/上游对照、ADR/证据收尾均已补；doctor 作为范围外残留记录。
- 复核结论：P1 闭合，无新 P0/P1；复核新增的“上游方向未锁定”P2 已用无 stamp 注册测试修复，变异验证（删传参/强制常量/恒 return/parser 恒返回）均能变红。
- C2 commit 仍等待所有者指令；证据不虚构 SHA。

## 未验边界与风险

- 只验证 macOS 本机 build；未验证 Windows/Linux、全局安装后的 opencli、daemon/extension 实际链路。
- 未单独构建上游无 stamp 的二进制做端到端对照；上游路径由纯函数回归、注册级 mock package 与同一 cache 对照覆盖，但非独立二进制。
- 未 bump 版本、未打包发行、未推标签；版本/发行另走 C3 与所有者授权；本机全局安装仍是旧包，C2 改动不会自动到达用户。
- 后台拉取仍会访问 registry/GitHub；本 ADR 不关闭数据采集，只关闭提示行/注册。
- opencli doctor 等命令仍可能输出上游安装/下载建议；不在 ADR 0001 范围，未改，需后续 backlog/ADR。
- C2 实现提交：5cf9ee18；本证据在紧随其后的文档提交中冻结；证据提交自身的 SHA 不写入本文。

## 回退

- 还原 src/version.ts、src/update-check.ts、src/update-check.test.ts、src/update-check.register.test.ts、package.json 的对应改动，删除本证据与索引行；无缓存协议或数据迁移。
- 运行时如需立即关闭提示，可设置 OPENCLI_NO_UPDATE_NOTIFIER=1，无需回退代码。

## 结论

fork 身份下 CLI 与 extension 两条升级提示都被抑制；env 提供硬开关；上游无 stamp 路径保持原行为。目标测试 18 passed、build、full gate（7492 passed）、真实 --help 探针与同一 cache 上游对照通过；独立复核 P1 闭合、无新 P0/P1。跨平台/发行/doctor 残留见上。
