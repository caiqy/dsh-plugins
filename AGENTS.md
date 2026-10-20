# AGENTS.md

## 项目定位

这是 DeepSeek Harness（DSH）插件开发工作区。插件按包独立版本、构建和发布；根目录是私有 pnpm workspace，不是 DSH 宿主应用。

默认用中文沟通和编写项目说明，沿用所改文件的代码风格。先确认改动所属包与 Git 仓库，保留用户已有的未提交改动。

## 目录与阅读入口

| 路径 | 职责与入口 | 工作区边界 |
| --- | --- | --- |
| [packages/dsh-plugin-example/](packages/dsh-plugin-example/) | 最小插件模板；从 [src/index.ts](packages/dsh-plugin-example/src/index.ts) 和 [冒烟测试](packages/dsh-plugin-example/test/smoke.test.mjs) 开始 | 根 workspace，普通目录 |
| [packages/dsh-plugin-web-search/](packages/dsh-plugin-web-search/) | 替换宿主搜索 provider，含配置 UI；先读 [README](packages/dsh-plugin-web-search/README.md) | 根 workspace，普通目录 |
| [packages/dsh-subagent-registry/](packages/dsh-subagent-registry/) | 自定义子代理派发、续跑、后台追问及 Web 预设管理；先读 [README](packages/dsh-subagent-registry/README.md) | Git submodule，同时纳入根 workspace；自有依赖和 TS 配置 |
| [packages/browser-skill/](packages/browser-skill/) | BrowserSkill fork；DSH 插件在 [packages/dsh-plugin-browserskill/](packages/browser-skill/packages/dsh-plugin-browserskill/) | Git submodule，明确排除在根 workspace 外；自有 pnpm workspace |
| [vendor/deepseek-harness/](vendor/deepseek-harness/) | 共享宿主源码参考；用途和升级约定见 [vendor/README.md](vendor/README.md) | 本地 checkout（已忽略，不入库），不参与根构建 |
| [docs/comet/specs/](docs/comet/specs/) | 已沉淀的功能规格 | 历史变更记录在 [docs/comet/archive/](docs/comet/archive/) |
| [.comet/config.yaml](.comet/config.yaml) | Comet 项目配置，启用 Native，产物根目录为 `docs` | 工作流配置不等于当前有活跃需求 |
| [.dsh/](.dsh/)、[.codex/](.codex/)、[.agents/](.agents/) | 本项目宿主配置、Hook 与 Comet 路由脚本 | 按当前任务需要读取，不当作插件业务源码 |

根命令、依赖版本和共享编译约定分别以 [package.json](package.json)、[pnpm-workspace.yaml](pnpm-workspace.yaml)、[tsconfig.base.json](tsconfig.base.json) 为准。子包自身的配置优先于根配置；不要假设所有包使用相同 SDK 或工具链。

## 环境与常用命令

根项目声明 Node.js `>=20`、pnpm `9.15.9`；注册表包要求 Node.js `>=22.19.0`，因此开发整个根 workspace 使用 Node.js `>=22.19.0`。BrowserSkill 单独声明 pnpm `10.17.0`。安装或切换 SDK 使用 `vfox`。

以下命令在仓库根目录执行：

```sh
pnpm install
pnpm -r list --depth -1
pnpm build
pnpm typecheck
pnpm test
```

- 根 `build`、`test` 包含注册表，均不包含 BrowserSkill 和 vendor 宿主。
- 根 `typecheck` 不覆盖注册表：它没有同名脚本，必须另跑下面的 `check`。
- 示例插件、Web Search 等测试会读取 `lib/`，先构建再测试。不要用旧产物证明源码正确。

按改动范围选择检查：

```sh
# 示例插件
pnpm --filter dsh-plugin-example typecheck
pnpm --filter dsh-plugin-example build
pnpm --filter dsh-plugin-example test

# Web Search：包括后端与客户端 bundle
pnpm --filter @caiqy/dsh-plugin-web-search typecheck
pnpm --filter @caiqy/dsh-plugin-web-search build
pnpm --filter @caiqy/dsh-plugin-web-search test

# 子代理注册表：check 同时检查 TS 与客户端构建
pnpm -C packages/dsh-subagent-registry check
pnpm -C packages/dsh-subagent-registry build
pnpm -C packages/dsh-subagent-registry test

# BrowserSkill：在其独立 workspace 中安装和执行
pnpm -C packages/browser-skill install
pnpm -C packages/browser-skill --filter @caiqy/browser-skill-dsh-plugin typecheck
pnpm -C packages/browser-skill --filter @caiqy/browser-skill-dsh-plugin build
pnpm -C packages/browser-skill --filter @caiqy/browser-skill-dsh-plugin test
```

注册表的真实宿主验证另有 `test:host` 和 `test:hosts`，所需隔离 SDK、环境变量见其 [开发说明](packages/dsh-subagent-registry/README.md#开发)。Web Search 的 `test:live` 依赖测试端点和凭据，属于真实网络调用；仅在任务需要且已获授权时运行，环境变量见其 [协议与验证](packages/dsh-plugin-web-search/README.md#协议与验证)。

文档改动只检查事实、路径和 diff；代码改动执行受影响包的必要检查。报告实际执行结果，区分单元验证、宿主验证和真实 UI/网络验证，未执行的检查不能写成通过。

## 实现与依赖约定

- 优先使用宿主公开扩展点与已有实现。新增插件以 [示例插件](packages/dsh-plugin-example/) 为起点，不修改宿主来迁就插件。
- 示例和 Web Search 继承根 TS 配置：严格模式、ESM、NodeNext，源码在 `src/`，产物在 `lib/`。这些包的相对 TS 导入使用 `.js`；注册表使用 `.ts` 并由自己的编译配置重写，遵循包内现有方式。
- `lib/`、`node_modules/`、`.tmp/`、tarball 等是生成物或临时内容；修改源码和构建脚本，不手改产物，不提交凭据或测试密钥。
- 插件服务通过 `inject` 声明，入口导出 `name` / `apply`；工具、监听器等资源按宿主生命周期注册并释放，参考示例中的 `ctx.effect`。
- 修改插件名称或入口时，同时核对包名、Cordis entry id、导出的插件名、`dsh.bundle.patch`、`exports` 和客户端 loader id，保持各字段符合现有加载契约；这些字段不一定使用同一个字符串。
- `peerDependencies` 必须是真实 semver 范围，不能写 `catalog:` 或 `workspace:`，宿主安装器需要读取它进行兼容性判断。
- 根 workspace 的共享 SDK 版本放在 [catalog](pnpm-workspace.yaml)，`catalog:` 仅用于 `devDependencies`。不要用 `@deepseek-ai/*` 的 npm `latest` 推断宿主版本。
- 根 catalog 不是子仓库的统一升级指令。注册表保留宿主 SDK 的 optional peer 契约及依赖闭包链接机制，避免安装第二份宿主类型/服务；具体要求见其 [依赖契约](packages/dsh-subagent-registry/README.md#deepseek-ai-依赖契约为什么是-optional-peer)。变更前直接核对该文档与包配置。
- 新增非平凡逻辑需留下最小可运行回归检查，优先复用所在包现有测试方式，不另引入测试框架。

## 按任务定位源码

### Web Search

阅读顺序：[插件接入](packages/dsh-plugin-web-search/src/index.ts) → [provider 定义与验证](packages/dsh-plugin-web-search/src/providers.ts) → [HTTP 协议及响应映射](packages/dsh-plugin-web-search/src/openai.ts)。配置界面在 [client.tsx](packages/dsh-plugin-web-search/src/client.tsx)，状态逻辑在 [client-model.ts](packages/dsh-plugin-web-search/src/client-model.ts)，客户端打包在 [build.mjs](packages/dsh-plugin-web-search/build.mjs)。

通过 `ctx.web.registerSearchProvider` 接入现有 `web_search`，工具注册、多查询及数量限制由宿主管理。[bundle patch](packages/dsh-plugin-web-search/cordis.patch.yml) 选择搜索 provider 并保留 HTTP fetch。扩展时继续使用此边界；凭据交给宿主 credentials，错误和响应不得泄露密钥，保留取消与重定向保护。

### 子代理注册表

从 [src/index.ts](packages/dsh-subagent-registry/src/index.ts) 看接入；派发在 [tool-run-agent.ts](packages/dsh-subagent-registry/src/tool-run-agent.ts)，宿主适配在 [host-compat.ts](packages/dsh-subagent-registry/src/host-compat.ts)，续跑在 [resume.ts](packages/dsh-subagent-registry/src/resume.ts)，后台追问在 [interactive.ts](packages/dsh-subagent-registry/src/interactive.ts)。预设文件存储、RPC、页面分别见 [preset-store.ts](packages/dsh-subagent-registry/src/preset-store.ts)、[presets-rpc.ts](packages/dsh-subagent-registry/src/presets-rpc.ts)、[客户端入口](packages/dsh-subagent-registry/src/client/index.ts)。

修改 agent 格式或用户配置时，核对 [AGENT-FORMAT](packages/dsh-subagent-registry/docs/AGENT-FORMAT.md) 与包内 [配置技能](packages/dsh-subagent-registry/skills/dsh-subagent-registry-config/SKILL.md)。前台中断续跑与后台追问是不同路径；宿主接口失败不得改用另一个接口重复派发。兼容性结论以当前子仓库代码和实际发布 SDK 测试为准。

### BrowserSkill

先读 [插件 README](packages/browser-skill/packages/dsh-plugin-browserskill/README.md) 和 [开发说明](packages/browser-skill/packages/dsh-plugin-browserskill/docs/development.md)。增强范围默认限于 DSH 插件层，Chrome/Edge 继续使用官方扩展，遵循 [根 README 的子仓库约定](README.md#browserskill-子仓库)。修改公开工具时同步核对 [tool-names.json](packages/browser-skill/packages/dsh-plugin-browserskill/src/tool-names.json)、客户端视图、包内 skill 与测试。保留会话所有权、取消、清理和本地 HTTP 路由的信任边界。

## Git、联调与工作流边界

- 开始先看 `git status --short` 和 `git submodule status`；子模块关系以 [.gitmodules](.gitmodules) 为准。修改子模块前查看其自己的状态和更具体的指引，父仓库只记录子模块提交指针；按任务范围分别处理提交，不自动升级或重置子模块。
- [vendor/deepseek-harness/](vendor/deepseek-harness/) 是本地参考 checkout（忽略不入库），用于核对宿主契约，默认不直接修改。升级宿主需同时核对 SDK、peer 范围与 [vendor/README.md](vendor/README.md) 记录的固定版本，不自动跟随上游分支。
- 本地联调优先使用隔离 profile `plugins-dev`，流程见 [本地联调说明](README.md#本地联调)。安装或更新插件、重启在用 profile、发布 npm 包属于额外操作，按用户授权执行；普通开发与文档任务不默认包含这些动作。
- 客户端改动必须运行包内完整构建；源码或类型检查通过不代表已运行宿主加载了新 bundle。实际 UI 验证需确认目标 profile 加载了新产物，再刷新或按宿主要求重载。
- 使用 Comet 时，先读取项目配置和当前 selection，再遵循选中 change 的阶段规则；Native 正式产物位于 `docs/comet/changes/<change>/`，运行时数据位于 `.comet/runtime/native/`。没有活跃 change 的普通任务不必创建 change，不手工修改 Runtime 状态，不把 archive 当作当前任务。
- 有 CodeGraph 索引时优先使用其探索入口；无索引时按包范围搜索，避开依赖、构建产物及无关子模块。项目结构或脚本变化后同步更新本文件，详细契约仍链接到各包说明，避免复制易过期的版本和配置表。
