# 2026-11-17 omnisurge fork 文档治理与开发门禁

## 目标/范围

把 omnisurge OpenCLI fork 的开发文档、ADR/证据层、门禁与 fork 发布安全约束补齐，使后续改动有稳定的流程入口。范围仅限治理文档、脚本与 GitHub Actions 配置；**未改 CLI 源码、输出、退出码、公共 API 或缓存协议**。

- 分支：`release/1.8.8-omnisurge.2`
- 基线 HEAD：`faa6eaeb`（本批改动尚未提交；以下结果均基于该 HEAD 上的工作区）
- 变更级别：C1（内部文档/门禁/工作流安全守卫）
- ADR：`adr: none — 本批没有 CLI 运行时机制取舍；release/docs 守卫是既有 fork 边界的执行，登记为 package.json 的 workflow-fork-guards，验收记录即本文件。ADR 0001 是另行立项的 update notifier，本批未实现。`

## 变更清单

- 新增 `AGENTS.md`：fork 边界、C0–C3 分级、强制流程、文档/ADR/证据规则、门禁、发布回退、分支与纪律。
- 新增/更新 `docs/developer/`：`documentation.md`（文档地图与写作规则）、`development-process.md`（分支、流程、验证矩阵、评审、DoD）、`fork-release.md`（打包/安装/标签/回退/上游升级）。
- 新增 `docs/adr/index.md`、`docs/adr/template.md`、`docs/evidence/index.md`、`docs/evidence/template.md`；ADR 0001 为既有 update-notifier 决策，本批未实现。
- 新增 `scripts/check-docs.mjs` 与 `scripts/ci-fork.sh`；package.json 增加 `check:adr`、`check:docs`、`ci:fork`、`ci:fork:docs`、`ci:fork:full`。
- 新增 `.github/workflows/fork-ci.yml`：非 main/dev 的 push/PR 跑 fast；release/* push 与 v* tag 跑 full；`permissions: contents: read`。
- `.github/workflows/release.yml`、`docs.yml` 增加仓库守卫 `github.repository_owner == 'jackwener' && github.event.repository.name == 'OpenCLI'`，防止 fork 触发 npm publish 或上游站点 dispatch；package.json `opencliFork.patches` 登记 `workflow-fork-guards`。
- 更新 VitePress developer/adr/evidence sidebar、README/README.zh-CN/CONTRIBUTING/TESTING/PR 模板指针；修正 TESTING 中 adapter 测试扩展名与 CI 触发描述。

## 执行的门禁与结果

- `npm run check:docs`：通过；179/179 adapter 文档覆盖；本文件写入前 234 docs / 1 ADR / 0 evidence，写入后 235 docs / 1 ADR / 1 evidence；VitePress build 4.78s。
- `npm run ci:fork:docs`：通过（与上同一文档门禁）。
- `npm run ci:fork`：通过；91 个测试文件、1523 passed、1 skipped。
- `npm run ci:fork:full`：通过；635 个测试文件、7484 passed、1 skipped；包含 build、`git diff --exit-code HEAD -- cli-manifest.json` 与约定基线。
- `node scripts/check-docs.mjs` 增强后通过；用临时 fixture 验证 evidence 未入索引、developer 页缺 sidebar、非法 ADR 文件名三类违规均被拒绝，fixture 已删除。
- YAML 解析通过：`fork-ci.yml`、`release.yml`、`docs.yml`；守卫表达式与 job 对应关系已核对；`fork-ci.yml` 的 release/tag 分支走 `--full`。
- `npm pack --dry-run`：生成 `jackwener-opencli-1.8.8-omnisurge.2.tgz`，2,296,347 bytes、1,676 entries；docs 未进入包，`cli-manifest.json` 无漂移（dry-run，未安装）。
- `git diff --check`：通过。

## 真实路径 spot check

- VitePress 本地构建成功，`/developer/`、`/adr/`、`/evidence/` 及新增页均有构建产物；未部署。
- 文档 checker 的负向 fixture 验证的是门禁本身，不是 CLI 业务路径；本批未改 CLI，因此没有可归因于本批的业务命令行为变化。
- 未执行全局安装、真实 opencli 业务命令、浏览器 E2E 或标签推送。

## 独立审查与处置

- `governance-reviewer` 独立审查完成，无 P0；指出 5 个 P1 与 5 个 P2。
- 已修：标签条件统一为“被标记提交含守卫 **且** 授权”，并加入 `git show <commit>:.github/workflows/release.yml` 核对；PR 模板与证据政策区分 C0/C1；checker 增加 developer sidebar、ADR 文件名、索引标题、evidence index、根文档链接与读失败检查；TESTING adapter 扩展名改为 find/实际 .js；发布线/版本说明统一。
- 已修 P2：CI 触发描述、fork-ci release/tag full 与 read 权限、npm pack 唯一目录与 exact tgz、ADR 版本快照例外、回退证据新建而非改写冻结文件。
- 未新建 ADR 0002：守卫是既有 fork 边界的执行，不是新的 CLI 契约；按 C1 以本证据 + package patch 记录。若后续把守卫策略扩展为新的分发机制，另开 ADR。

## 未验边界与风险

- **GitHub Actions 未在 GitHub 上实际执行**：fork-ci、release/docs 守卫只做了 YAML/表达式静态核对；没有真实 fork CI run、tag run 或上游 run。
- **标签未推送**：当前 HEAD `faa6eaeb` 的已提交 `release.yml` 不含守卫，守卫只在本工作区；在提交并核对 tagged commit 前推 `v*` 仍会触发未加固的上游发布链。本批没有推标签。
- 未做全局安装/回退、未跑浏览器 E2E、未部署 VitePress、未提交/推送。
- `npm pack` 仅 dry-run；未验证安装后的 `opencli --version`/业务命令。
- `CHANGELOG.md` 最新条目仍为 1.8.4，与当前 1.8.8 线存在既有缺口；本批未补写，避免编造 release notes。

## 回退方法

- 回退本批：还原上述文档/脚本/工作流/package.json/sidebar/README 指针改动；删除新增的 `AGENTS.md`、`docs/adr/`、`docs/evidence/`、`scripts/check-docs.mjs`、`scripts/ci-fork.sh`、`.github/workflows/fork-ci.yml`。
- 无运行时数据、安装包或服务需要回退；未推标签，无需撤销远端标签。
- 若未来已推标签才发现守卫缺失：不要强推；按所有者决定处理，并保留证据。

## 结论

文档地图、ADR/证据层、C0–C3 流程、fast/full 门禁与 fork CI 已落地；C1 范围内通过本地门禁。发布链守卫只有在**提交并包含在被标记提交**后才有效；GitHub Actions、标签、安装、E2E 与部署均未验，不能把本证据当作发布就绪证明。
