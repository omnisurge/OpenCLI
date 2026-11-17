# Fork 发行与回退

本页是 omnisurge fork 的发行运行手册。规则见 `AGENTS.md`，流程见 [开发流程](development-process.md)。**发布、全局安装与回退各自需要所有者明确授权；未授权只能做到"打包 + 证据"。**

## 1. 边界

- 本 fork 的 `package.json` 是 `private: true`，包名仍是 `@jackwener/opencli`；**不发布 npm**。
- 不运行上游 `.github/workflows/release.yml`，不 dispatch 上游文档站点。
- 发行物 = 本地/私有 tgz + 证据记录；需要 GitHub Release 时手工创建，不依赖上游工作流。
- 版本线 `1.8.8-omnisurge.<n>`；上游基线升级时开新线，不在旧线上改 `n` 冒充新基线。

## 2. 前置检查

1. 所有者已授权本次发行（范围、安装目标、是否打标签）。
2. 工作区干净：

```bash
git status --short
git rev-parse --abbrev-ref HEAD
```

3. 当前分支是当前发布线 `release/1.8.8-omnisurge.2`（同一上游基线的后续发行可在该线递增版本；需要并行维护时才切新 `release/1.8.8-omnisurge.<n>`），且包含本批全部提交。
4. `package.json` 的版本已升到目标 `1.8.8-omnisurge.<n>`，`opencliFork.upstreamVersion/upstreamCommit` 与基线一致。
5. **被标记的提交**已包含 `release.yml` 的仓库守卫，且所有者明确授权；守卫不在该提交或未核对时，不得推标签。

## 3. 发布步骤

### 3.1 发布前门禁

```bash
npm run ci:fork:full
```

必须全绿；任何失败先修，不带病打包。`ci:fork:full` 覆盖 build/清单/约定基线/`npm test`（unit + extension + adapter），**不包含浏览器 E2E**；涉浏览器/daemon/扩展时另跑 `npm run test:e2e` 或写明未验。真实路径 spot check 与未验项写入证据。

### 3.2 构建与清单核对

```bash
npm run build
git diff --exit-code HEAD -- cli-manifest.json
```

- 清单有漂移：确认是本批适配器变更，提交重建后的 `cli-manifest.json`；不能手改。
- 根 `dist/` 构建产物不入库；`extension/dist/` 按上游约定单独处理。

### 3.3 打包与校验和

```bash
VERSION=1.8.8-omnisurge.<n>
OUT=/tmp/opencli-fork-release/$VERSION
if [ -e "$OUT" ]; then
  echo "release dir already exists: $OUT" >&2
  exit 1
fi
mkdir -p "$OUT"
npm pack --pack-destination "$OUT"
TGZ="$OUT/jackwener-opencli-$VERSION.tgz"
test -f "$TGZ"
shasum -a 256 "$TGZ"
```

每个版本使用独立目录，避免旧 tgz 混入哈希；目录已存在时换新目录或确认清理后再打包。Linux 用 `sha256sum` 替代 `shasum -a 256`。只记录并安装上面确认存在的 exact tgz 路径、大小、SHA256。

### 3.4 安装与真实路径验证（获得授权后）

```bash
npm install -g /tmp/opencli-fork-release/1.8.8-omnisurge.<n>/jackwener-opencli-1.8.8-omnisurge.<n>.tgz
hash -r
which -a opencli
opencli --version
opencli list | head -5
opencli <至少一条业务命令>
```

- 记录安装前后版本、安装路径、命令输出摘要。
- 浏览器/登录相关命令无法验证时写"未验 + 原因"，不伪报。

### 3.5 证据

新建 `docs/evidence/release-1.8.8-omnisurge.<n>.md`，至少包含：

- 版本/分支/commit、tgz 文件名/SHA256；
- `ci:fork:full` 结果、构建与 manifest 核对；
- 安装前后 `opencli --version`、真实命令 spot check；
- 未验边界、回退方法、结论。

### 3.6 标签（条件步骤）

只有同时满足以下条件才创建并推送标签：

1. 所有者明确授权；
2. **被标记的提交**包含 `release.yml` 的仓库守卫（不是只在其他分支或工作区）；用 `git show <commit>:.github/workflows/release.yml` 核对；
3. 证据已写、工作区干净；标签必须打在这个已验证的提交上。

```bash
git show <commit>:.github/workflows/release.yml | grep -n "repository_owner == 'jackwener'"
git tag -a v1.8.8-omnisurge.<n> <commit> -m "omnisurge fork 1.8.8-omnisurge.<n>"
git push fork v1.8.8-omnisurge.<n>
```

上面的 `grep` 必须命中；未命中就停下，不推标签。

不满足时只保留本地 tgz 与证据，不推标签。需要 GitHub Release 时手工创建并附 tgz/SHA256。标签推送还会触发继承的 `e2e-headed` 测试工作流（只跑测试，不发布）；如不希望跑，先与所有者确认。

## 4. 回退

1. 保留上一版 tgz（各版本独立目录或专用备份目录），不要覆盖。
2. 重新安装上一版：

```bash
npm install -g /tmp/opencli-fork-release/<上一版 tgz>
hash -r
opencli --version
opencli list | head -5
```

3. 核对版本与至少一条关键命令；新建 `docs/evidence/<YYYY-MM-DD>-rollback-1.8.8-omnisurge.<n>.md`，在 evidence index 登记，不改冻结的原发行证据。
4. **不得**用 `npm install -g @jackwener/opencli` 冒充回退——那会装上上游包并丢掉 fork 补丁。

## 5. 上游升级（新开线）

1. 记录新 upstream tag/commit；更新 `package.json` 的 `opencliFork.upstreamVersion`/`upstreamCommit`。
2. 从新基线开 `release/<upstreamVersion>-omnisurge.1`；旧线保留，不 rebase。
3. 重放 fork 补丁（或确认上游已修），更新 `opencliFork.patches`。
4. 跑 `npm run ci:fork:full` + 真实路径；证据写新基线与旧线差异。
5. 旧线不删除，回退仍可用上一版 tgz/旧分支。

## 6. 失败处理

- 构建/测试失败：停手修，不带病发布；记录失败命令与原因。
- 打包后清单/版本不符：丢弃 tgz 重新打包；不覆盖同版本字节。
- 安装后版本不对：立即回退上一版并记录；不继续验证"新版本"。
- 标签推错：不要强推；在证据与任务记录中说明，按所有者决定处理。

## 7. 发布检查清单

- [ ] 所有者授权（安装/标签范围明确）
- [ ] 工作区干净、分支/版本正确
- [ ] `npm run ci:fork:full` 全绿
- [ ] `npm run build` + `cli-manifest.json` 无漂移
- [ ] tgz + SHA256 已记录
- [ ] 安装前后版本与真实命令已记录（或明确未验）
- [ ] 证据文件已写并链接到 PR/任务
- [ ] 回退 tgz 可用，回退步骤已写
- [ ] 分发身份未变（name/private/repository）
- [ ] 被标记提交已核对含守卫，且标签已获授权后推送
