# extra dir 验收修复与 fork 通用性门禁（2026-11-18）

- 分支：feat/embedded-runtime-contract
- 基线/HEAD：95bdbccf（.4 代码提交 fa1e00e9；本批在工作区修复，尚未提交/发版）
- 变更级别：C2（修复嵌入运行时的错误可见性行为，沿用 ADR 0003 契约，不新增产品契约）
- ADR：ADR 0003（嵌入运行时契约，已有）；adr: none — 本批无新的机制取舍
- 目标：修复独立审查发现的 ADR 0003 两项验收缺口，同时建立 fork 核心的通用性门禁，防止为单一产品私有化 src/。

## 变更

- src/discovery.ts：
  - 额外目录存在 site 子目录时，根级 flat .js 仍发出可见 warn，不再静默忽略；
  - 单个 site 子目录不可读时只跳过该 site，其他 site 继续加载；模块读取/加载异常按文件 warn。
- src/discovery.extra.test.ts：
  - 新增 mixed flat + site、不可读 site 两个回归用例；
  - fixture site 从 sccs 改为 sample，避免把下游适配器名写进核心测试。
- scripts/check-fork-genericity.mjs：扫描 src/（tracked + untracked）中的下游产品/适配器名、私有域名、凭据环境变量；命中即失败。
- package.json：新增 check:genericity；scripts/ci-fork.sh 在 fast/full 非 docs 模式执行。
- AGENTS.md：更新过期分支/版本表（.4、feat/embedded-runtime-contract、11 个 fork 提交），新增核心通用性硬约束。

## 通用性审计（A）

命令与结果：

- grep -rIn -E 'sccs|supervision|jlt01|监理' src → 修复前仅 src/discovery.extra.test.ts 的 sccs fixture；改名为 sample 后 0 命中。
- git diff --name-only 2413694..HEAD | grep -i sccs → 空。
- ls clis | grep -i sccs → 空；clis 目录仍为 182 个内置适配器，未被改。
- package.json.opencliFork.patches：non-browser-trace、public-error-output-redaction、immutable-error-trace-receipts、framework-diagnostics-redaction、workflow-fork-guards、fork-aware-update-notifier、embedded-runtime-contract，均为通用名称。
- 分发形态：name=@jackwener/opencli、private=true、未 npm publish、本地/私有 tgz。
- npm run check:genericity → OK（207 个 src 文件；覆盖 src 下所有 tracked/untracked 文本文件，跳过二进制）。

## 下游产品排查（B，只读，不在本仓修改）

产品仓 supervision-assistant 仍有下游侧 ~/.opencli 硬编码（feedback.js、connect-webview.js 等）和完整 182 clis 载荷；这些属于下游产品仓，未在本仓修改。本仓的通用边界由 check:genericity 保证：下游必须通过 OPENCLI_EXTRA_CLIS_DIR、adapter 或宿主 payload 接入，不能要求修改 src/。

## 门禁

- npx vitest run src/discovery.extra.test.ts → 6/6 通过；不可读 site 用例含真实 registry import 的 getRegistry().get('sample/hello') 正向断言。
- npm run check:genericity → OK（207 个 src 文件；覆盖 src 下所有 tracked/untracked 文本文件，跳过二进制）。
- npm run check:adr → 通过（7 ADR）；npm run check:docs → 通过（247 docs / 7 ADR / 7 evidence，VitePress build 5.10s）。
- npm run ci:fork:full → 通过：638 test files，7,508 passed / 1 skipped；tsc、genericity、docs、build/manifest、unit、extension、adapter 全绿；cli-manifest.json 无漂移。
- 负向烟测：临时 src/__generic_gate_fixture.ts 写入 sccs，check:genericity 返回 exit 1 并指出文件行；fixture 已删除。
- 独立复审：release-reviewer 对工作区修复给出 FIX_VERIFIED_WITH_REMAINING_RELEASE_BLOCKERS；指出不可读 site 用例缺正向断言与通用性门禁覆盖说明，两项已补强；.4 冻结包仍非发版批准。

## 未验边界与风险

- .4 冻结包仍是旧代码；本修复未重打 .4，需新版本候选（.5）或所有者书面豁免，且需重新独立审查。
- 本批工作区改动未提交；未安装/未发布/未推标签。
- 产品仓 ~/.opencli 下游硬编码未改；产品内嵌端到端仍属下游范围。
- Windows/Linux、daemon、浏览器扩展未验，与 ADR 0003 边界一致。

## 回退

- 代码修复回退为丢弃本批工作区改动/回退提交；不影响 .4 冻结产物与全局安装。
- 新增 check:genericity 若误报，应修正规则或在 ADR 记录豁免，不得直接删除门禁。

## 结论

ADR 0003 的两个错误可见性缺口已在工作区修复并有定向回归；src/ 通用性有硬门禁。因 .4 冻结，本批不构成 .4 发版修复，需新版本候选并复审。
