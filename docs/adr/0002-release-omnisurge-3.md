# ADR 0002：发布 1.8.8-omnisurge.3 交付 fork 更新提示修复

- 状态：Proposed（2026-11-17，所有者授权“先发布当前版本”；C3）
- 关联：ADR 0001 fork-aware update notifier；C2 已合入 release 线
- 变更级别：C3（版本与分发）

## 背景

ADR 0001 的实现已合入 release/1.8.8-omnisurge.2，但 package.json 仍是已使用过的 1.8.8-omnisurge.2；本机全局安装也还是旧代码。若直接复用 .2 打包，会与既有版本号冲突，且用户无法区分新旧字节。

本次发布只解决“把已验收的 fork 更新提示修复装进可分发产物”的问题，不改变上游基线。

## 决策

1. 版本递增为 1.8.8-omnisurge.3；上游仍为 1.8.8 / 24136945，opencliFork 身份与 private: true 保持不变。
2. 构建本地/私有 tgz，记录文件名、大小与 SHA256；不发布 npm，不运行上游 release.yml，不 dispatch 上游文档站点。
3. 本次授权范围为“发布产物 + 证据”；全局安装与标签各自仍需要所有者明确授权，未授权前只保留本地 tgz 与证据。
4. 发布证据写入 docs/evidence/release-1.8.8-omnisurge.3.md，包含门禁、tgz、安装未执行边界与回退。

## 验收

- npm run ci:fork:full 通过；npm run build 后 cli-manifest.json 无漂移。
- npm pack 生成的包必须显示版本 1.8.8-omnisurge.3、包名 @jackwener/opencli、private: true，并记录 SHA256。
- 文档门禁通过，ADR 索引/侧栏与发行证据同步。
- 不以“已发布”代替“已安装”：未授权的安装/标签不写入完成结论。

## 边界

- 不改变上游版本、上游 commit、分发身份或 npm 发布策略。
- 不验证 Windows/Linux、全局安装后的真实命令、浏览器 E2E；这些在证据中列未验。
- 不覆盖既有 .2 tgz/安装；回退仍使用上一版产物或旧 release 提交。

## 修订记录

- 2026-11-17：按所有者本次发布授权立项；范围限定为本地/私有 tgz。
