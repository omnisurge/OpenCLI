# ADR 0014：Omni 三层产品边界与下游外置

- 状态：Proposed（2026-11-25；所有者已确认三层方向，实施与发行另授权）
- 关联：ADR 0010（runtime core / dev tool 边界）、ADR 0011（runtime core package profile）、ADR 0013（core-only 版本分离）、ADR 0003（embedded runtime contract）、ADR 0004（host delivery contract）、ADR 0007（Omni CLI 品牌）
- 变更级别：C3（产品包、交付形态与版本边界）

## 背景

当前仓库同时存在完整 host、core-only profile 和大量站点 adapter：

- 完整 host 把核心运行时、浏览器控制、站点 adapter、开发脚本和文档打包在一起；
- core-only 1.8.8-omnisurge.8 是 browserless 的，只适合运行命令和 adapter，不提供浏览器控制；
- 仓内约有 181 个站点目录，站点/业务差异被混入产品包；
- SCCS 一类业务 CLI 是下游消费者，却被历史 full host 和产品接入当作产品的一部分。

产品目标不是交付一个站点目录，而是让下游能基于通用能力做出自己的 CLI。因此需要把“通用运行能力”“获取网站能力”“开发 CLI 的能力”和“站点业务内容”分开。

## 决策

### 1. 产品固定为三层

1. **Omni Core**
   - 通用 CLI 运行时：命令生命周期、参数/输出/错误契约、adapter 加载与执行、状态根、embedded 契约、版本兼容。
   - 不包含浏览器控制、站点 API、业务命令、SCCS 认证或任何站点专名。
2. **Omni Browser Bridge**
   - 浏览器侧能力：extension、daemon、CDP、网络请求捕获、DOM/页面观察、目标解析、profile/session 隔离。
   - 只提供通用浏览与观察能力；站点登录流程、验证码、tenant、业务 token 刷新归下游。
3. **Omni Authoring SDK**
   - CLI 开发能力：脚手架、抓包转 fixture、请求/响应契约提取、adapter 骨架生成、回放、conformance/verify、打包。
   - 负责“把网站能力变成 CLI”，不直接发布站点 adapter 或业务 CLI。

**Omni Studio** 不是第四层，而是 Core + Browser Bridge + Authoring SDK 的受控组合发行形态。**Omni Runtime** 是只有 Core 的运行形态，不要求安装浏览器。

### 2. 依赖方向单向

~~~text
Omni Core                  （叶子，不依赖其他层）
  ↑
Omni Browser Bridge        （只依赖 Core 公开契约）
  ↑
Omni Authoring SDK         （依赖 Core + Browser Bridge）
  ↑
Omni Studio                （组合发行，不新增运行时语义）

下游 site adapter / business CLI
  → 依赖 Core 的 adapter 契约
  → 需要浏览器时使用 Browser Bridge 的 capability 契约
  → 不修改 Core/Browser，不反向成为产品内置内容
~~~

硬规则：

- Core 不得 import Browser Bridge、Authoring SDK、Studio、站点 adapter 或业务 CLI；
- Browser Bridge 不得 import 站点 adapter、业务 CLI 或 Studio；
- Authoring SDK 可以依赖 Core/Browser，但不得被 Core/Browser 反向依赖；
- Studio 只做组合、安装和入口，不成为新的运行时层；
- 下游 adapter/业务 CLI 不得要求 Omni 内置其站点、凭据、tenant 或业务逻辑。

### 3. 下游 adapter 与业务 CLI 外置

- 站点 adapter 和业务 CLI 由下游独立开发、测试、发布、版本化和支持；
- Omni 产品包不包含 181 个站点目录，也不把其中任何一个作为产品承诺；
- Omni 内保留一个最小 reference adapter 和 conformance fixture，只用于验证 adapter ABI、加载、错误/输出契约，不承载真实站点业务；
- 下游通过显式安装/启用的 adapter pack 提供站点能力；不允许从任意路径静默自动加载未信任代码；
- adapter 必须有 manifest、Core 兼容范围、命令/能力声明、状态命名空间和错误契约；安装或升级必须可审计、可回退；
- 站点字段映射、站点错误、站点版本漂移由下游负责，Omni 不承诺替下游追站点。

### 4. 浏览器能力边界

- Browser Bridge 负责通用浏览器控制、网络捕获、页面观察和 session/profile 隔离；
- 下游负责具体站点的登录入口、验证码策略、tenant、业务认证和 API 语义；
- 浏览器是可选能力，不是 Core 的硬依赖；
- 现有 core-only 1.8.8-omnisurge.8 的 browserless 边界保留，不把 Browser Bridge 塞回 Core；
- Studio 可以选择安装/启动 Browser Bridge，但 Core/Runtime 在没有浏览器时仍可运行已有 CLI。

### 5. 发行与迁移

- 1.8.8-omnisurge.8 继续作为 Core 的 core-only 发行，不改变现有 tag、tar 或边界；
- Omni Studio 使用独立的发行身份和版本，不与 1.8.8-omnisurge.8 共用 core-only 语义；
- 完整 host 和站点目录不一次性删除；先以新三层发行验证下游迁移，旧 full host/旧包保留回退，验证通过后再按单独决策收缩；
- 旧的本机全局 opencli 安装不再是产品依赖或 fallback；在 Omni Studio 完成安装/冒烟/回退验证前不自动卸载，验证通过后由所有者授权退役；
- 下游业务 CLI 的版本、认证和发布节奏不受 Omni 产品版本绑定。

## 验收

1. 包依赖图符合第 2 节：Core 是叶子；Browser Bridge 不依赖站点/业务；Authoring SDK 不被 Core/Browser 反向依赖；Studio 只做组合。
2. Core 的现有 boundary check 仍拒绝 browser、站点目录、下载和站点专名；Browser Bridge 另有 boundary，拒绝站点 adapter 和业务 CLI。
3. Runtime 在无 Chrome 环境下可运行已有 CLI；Studio 能显式启动/关闭 Browser Bridge。
4. 一个外部 adapter pack 可通过显式安装被 Core 发现并执行，manifest/version/capability/输出/错误契约通过 conformance；不存在任意路径静默加载。
5. Omni 产品包中除 reference adapter 外没有站点 adapter；下游 adapter/业务 CLI 由外部发行物提供。
6. 旧全局 opencli 退役前，Omni Studio 已完成隔离安装、至少一条真实 CLI smoke、失败回退和版本核对；退役动作单独授权。
7. 文档写明 Runtime/Studio、Core/Browser/Authoring 的安装边界，以及“站点/业务由下游负责”的支持边界。

## 边界

- 本 ADR 只定产品边界，不实现 Browser Bridge、Authoring SDK、Studio、adapter ABI 或迁移脚本。
- 不改变 1.8.8-omnisurge.8 的 tag、artifact、SHA、版本或 browserless 结论。
- 不把 SCCS 业务/认证、任何站点 adapter 或业务 CLI 纳入 Core。
- 不执行全局 opencli 卸载、产品安装、发布、推送 tag 或生产动作。
- 不一次性删除 full host、站点目录或旧回退产物；收缩需单独验收和授权。
- 不涉及监理内业助手 0.60.4 或 SCCS 协同开发。
