# ADR 0011：Runtime core 的发行 profile 与包边界

- 状态：Proposed（2026-11-20；2026-11-21 core profile 实现候选；embedded-sccs/product pack 与 browser capability 未完成）
- 日期：2026-11-20
- 关联：ADR 0010（runtime core/dev tool 分界）、ADR 0007（Omni CLI 品牌）、docs/evidence/2026-11-20-runtime-core-boundary-exploration.md
- 变更级别：C3（包、profile、分发边界；本 ADR 只定候选结构，不执行改包或发版）

## 背景

ADR 0010 决定 core 与 dev tool 共享同一执行内核，但还需要明确发行物如何边界化，否则“core”会继续以完整 host 的目录结构、依赖和命令面出现。当前 npm pack 的 1.8.8-omnisurge.6 约 2.30 MB 压缩、9.5 MB 解压，并包含全部 dist（含测试编译）、clis、manifest、skills、scripts；产品还要额外安装 adapter 依赖。

本 ADR 只定义一个可验证的 profile/包边界，不决定最终对外品牌、npm 发布或产品 repack。

## 决策

1. **构建 profile**：同一源码至少提供 full、core、embedded-sccs 三个 profile。full 为开发工具全量；core 为 runtime 最小执行内核；embedded-sccs 为 core + supervision-assistant 的 sccs adapter。
2. **候选包边界**（工作名，最终技术包名另立 C3 ADR）：
   - omni-cli-core：runtime core；只含执行内核、registry/discovery、output/error、plugin contract、embedded runtime 及其必要依赖。
   - omni-cli-dev：开发工具；core + browser + download + 全部内置 adapters + adapter 开发/验证/skills。
   - omni-cli-browser：可选 runtime browser capability；只在 adapter 声明 browser:true 且产品显式安装时加载。
   - omni-cli-download：可选文章/媒体下载 capability；只在 adapter 声明需要时加载。
   - omni-cli-adapters：开发/full 使用的通用 adapters，不进入 core。
3. **core 文件边界**：core 的 npm 包不得包含 clis/、cli-manifest.json、skills/、scripts/、dist/src/browser/、dist/src/download/、*.test.js、docs/；不得包含 turndown、@mixmark-io/domino、@mozilla/readability、ws；undici 仅在显式网络 capability 下允许。
4. **产品组合**：supervision-assistant 的 release 产物使用 core + 产品仓自己的 adapters/sccs；产品 release manifest 固定 core 版本/commit、adapter 版本和 SHA256；不复制 core 源码进产品仓。
5. **版本与兼容**：core 与 dev 共享同一上游基线和 fork 版本线；可选 capability 必须与 core 的 peer 约束一致；adapter 继续使用 @jackwener/opencli/registry 与 /errors 公共导出，技术改名时另设兼容 shim。
6. **构建可复现**：profile 只按冻结输入构建；package-lock/依赖 pin 与 supervision-assistant DEPENDENCY_PINS 对齐；core package 的 SHA256 和文件清单进入产品证据。
7. **本 ADR 不执行**：不创建包、不修改 package.json/bin、不发布 npm、不推 tag、不改 supervision-assistant 或实际产品 payload。

## 验收

- 检查 core 文件清单：无 clis/、cli-manifest.json、skills/、scripts/、browser/、download/、*.test.js、docs/。
- 检查 core 生产依赖：无 turndown、domino、readability、ws；undici 只在声明的网络 capability 中；记录依赖数量和压缩/解压体积。
- embedded-sccs profile 在临时 HOME 通过 sccs --help、sccs status --json、一条 browser:false 本地命令；不创建真实用户 ~/.opencli，不触发 update-check，不访问真实 SCCS。
- browser:true 命令在 core-only 下明确失败；加入 omni-cli-browser 后该 capability 的冒烟测试通过。
- full/dev profile 保持现有 1,366 命令面和全量测试；core 变更不得以 full/profile 绿测替代。
- 产品侧使用 core + adapters/sccs 重新打包后，记录体积、依赖数量、启动时间与回退包；未完成前不替换现有 .6 payload。

## 边界

- 候选包名、品牌展示名和技术包名分离；omni-cli-* 不是已发布的 npm 包名，最终命名需单独 C3 ADR。
- 不改变 .6 的 tag/tgz/SHA；不执行产品 repack；不把本 ADR 当成实现或发布批准。
- core 不包含 SCCS 业务逻辑；SCCS adapter 仍在 supervision-assistant。
- 不因轻量化删除 browser/download 能力；它们是可选发行物，不是被淘汰能力。

## 实现例外

2026-11-21 所有者批准执行下一步后，core build profile 作为候选实现（build:runtime-core、pack:runtime-core、独立 lock、standalone 安装与边界门禁），但不代表 npm 发布、不改 .6 发行物、不执行产品 repack。本文件决策 7 中“不创建包、不修改 package.json/bin”的边界不覆盖本次候选构建；embedded-sccs profile、browser capability 正向和正式产品切换仍未完成，ADR 状态仍保持 Proposed。

## 修订记录

- 2026-11-20：Proposed；定义 full/core/embedded-sccs profile 与候选包边界，未实现。
- 2026-11-21：core build profile 实现候选（build:runtime-core/pack:runtime-core、独立 lock、standalone 安装、边界门禁通过）；embedded-sccs 属产品 pack，browser capability 正向未验，状态保持 Proposed。
