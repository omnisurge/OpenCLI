# fork lockfile reconcile：turndown / ws（2026-11-20）

- 范围：OpenCLI fork 的 package-lock.json 与 package.json 依赖声明
- 依据：supervision-assistant ADR0048 裁决一（docs/audit/adr0048-rulings-20261120.md）
- 变更级别：C1（依赖锁文件修复；无源码/命令面变更）
- 分支/工作区：release/1.8.8-omnisurge.2；本批为路径 A 的独立修复提交（不改 .5 tag/tgz；产品侧更新 HOST_COMMIT 后 repack）

## 变更

- turndown：lock 7.2.2 → 7.2.4；package.json ^7.2.2 → ^7.2.4
- ws：lock 8.21.0 → 8.22.0；package.json ^8.18.0 → ^8.22.0
- SRI 与 supervision-assistant maintenance/node_host.py 的 DEPENDENCY_PINS 完全一致：
  - turndown sha512-I8yFsfRzmzK0WV1pNNOA4A7y4RDfFxPRxb3t+e3ui14qSGOxGtiSP6GjeX+Y6CHb7HYaFj7ECUD7VE5kQMZWGQ==
  - ws sha512-Ydggc987+RO0AnWtZ/7Wq9FtNvcrL1b/RO0ud9mWjUPgDrsAAwQSF51sm2hm1XofbU/4jkpGEsLFsZZxU+1DOg==
- 全部 16 个 DEPENDENCY_PINS 与 fork lock 对照：16/16 OK。

## 验证

- npm install --package-lock-only --ignore-scripts turndown@7.2.4 ws@8.22.0 → lock 精确为 7.2.4 / 8.22.0
- npm ci --ignore-scripts --no-audit --no-fund → 232 packages 安装成功；实际 node_modules/turndown=7.2.4，node_modules/ws=8.22.0
- npm run ci:fork:full → 639 test files，7,509 passed / 1 skipped（含新增 src/dependency-lock.test.ts）
- git diff --exit-code HEAD -- cli-manifest.json → 无漂移
- 本批改 package.json/package-lock.json，并新增 src/dependency-lock.test.ts 作为锁文件下限回归测试；不改 adapter 或命令面
- 新增测试：src/dependency-lock.test.ts（1 test）校验 package.json 声明、lock 版本与 SRI 必须精确等于 turndown 7.2.4 / ws 8.22.0；单独运行通过

## 边界与后续

- 本文件随路径 A 的修复提交进入 release 线；.5 发布 tgz 不变，其源树内 package-lock 仍是旧内容；supervision-assistant pack-sccs-runtime.sh 会复制本仓当前 package-lock.json 并 npm ci。
- 需 supervision-assistant 侧重新执行 release/pack-sccs-runtime.sh，才生成包含新锁的 sccs-runtime-*.tgz；本批未执行该产品动作。
- 未验证产品 pack 后的实际 embedded 依赖树；验收时应以 pack 产物 node_modules 再核 7.2.4/8.22.0。
- 不改 ADR0048 pin 表；不把本批当 .5 包已重建。

## 结论

fork lockfile 已与已批准 pin 对齐，代码/命令面无变更，全量门禁通过；待产品侧 repack 后闭环。
