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

## 按插件发版（GitHub Actions）

发版入口在 [scripts/release.mjs](scripts/release.mjs)，依赖本机已登录的 GitHub CLI（`gh auth login`）。每次只选择一个插件，不支持 `all` 发布；根 workspace 不发布。先在对应源码仓库修改并提交包版本、推送源码，再在根目录运行：

```sh
# 版本号为示例，必须与远端对应 package.json 一致。
pnpm release web-search 0.1.2
pnpm release browser-skill 0.3.3-dsh.4

# 先在 Actions 完整构建、测试和打包，但不发布 npm；可使用现有版本。
pnpm release web-search 0.1.1 --check
pnpm release browser-skill 0.3.3-dsh.3 --check

# 默认分支之外的候选必须显式指定已推送的 ref。
pnpm release browser-skill 0.3.3-dsh.4 --ref <branch-or-tag> --check
```

| 选择名 | 仓库 / 默认 ref | 工作流 | 自动发布 tag 前缀 |
| --- | --- | --- | --- |
| `web-search` | `caiqy/dsh-plugins` / `main` | [.github/workflows/publish-web-search.yml](.github/workflows/publish-web-search.yml) | `web-search-v` |
| `browser-skill` | `caiqy/BrowserSkill` / `dsh/plugin-parity-0.3.3` | [release-dsh-plugin.yml](packages/browser-skill/.github/workflows/release-dsh-plugin.yml) | `caiqy-dsh-plugin-v` |

也可通过 `gh workflow run` 手动运行目标工作流，填写精确 `version` 和 `dry_run`。BrowserSkill 的默认 `main` 仍跟随上游，必须指定增强分支 `--ref dsh/plugin-parity-0.3.3`（推荐使用上面的统一入口）；不要在 `main` 运行上游发布工作流。Web Search 的 Actions 网页默认 `dry_run: true`，正式发布需取消该选项。输入版本或 tag 版本必须等于提交中的包版本；工作流不会替你修改版本。CLI 正式发版显式传 `dry_run=false`，`--check` 则传 `true`。命令返回只表示已提交运行请求，用对应仓库的 `gh run list` / `gh run view` 查看真实结果。BrowserSkill 继续独立使用 pnpm 10.17.0，Web Search 使用根 pnpm 9.15.9；均只构建所选插件，不发布官方 CLI、扩展、注册表或示例插件。

认证只使用 npm Trusted Publishing（OIDC）。在两个 npm 包各自 Settings → Trusted Publisher 配置 GitHub 用户 `caiqy`、上表仓库及**工作流文件名**（不填路径），Environment 均为 `npm-publish`，明确允许直接 `npm publish`。两个源码仓库分别发布，以匹配包的 `repository.url` 和 provenance。使用 GitHub-hosted runner、Node 24、npm 11，发布 job 有 `id-token: write`；不配置 `NPM_TOKEN`，不复制本机 npm 登录态，保留账号 2FA。首次配置或更改 npm 信任关系可能仍需人工安全验证。新连接可能显示 `Pending validation`，须在 npm 页面给出的期限内（通常 48 小时）通过该 OIDC 工作流成功发布一个新版本来激活；`--check` 或本机发布不能替代验证。应在新版本已准备好时配置连接，超时后需重新配置；以页面实际状态和截止时间为准。不要在 GitHub Environment 添加 required reviewers，除非明确需要每次人工批准。

发版先类型检查、构建、测试，再 `npm pack --ignore-scripts`（BrowserSkill 另验打包技能资源）。检查通过的 tarball 会作为 Actions artifact 留存，正式发布使用同一个 tarball、公开访问及 npm `dsh` dist-tag。发布后等待精确版本可读，校验远端 SRI 和实际下载字节；不能只凭 `npm publish` 退出码判断成功。npm 版本不可覆盖，已发布版本不要重新发；如果包已经发布但后续步骤失败，单独同步索引，不通过盲目重试覆盖旧版本。

市场索引由 [.github/workflows/sync-market-index.yml](.github/workflows/sync-market-index.yml) 管理：Web Search 工作流成功后触发，每小时第 17、47 分钟也会同步两包；BrowserSkill 发布由定时同步接入，不保存跨仓库写入 token。GitHub 调度可能延迟，DSH 默认另缓存 10 分钟。需要立即刷新或只同步指定插件时：

```sh
gh workflow run sync-market-index.yml --repo caiqy/dsh-plugins -f plugin=browser-skill
# plugin 也可以为 web-search 或 all；这里只同步索引，不发布任何包。

pnpm test:release              # 原生 Node 发版/索引回归检查
pnpm sync:index web-search     # 本地校验公共 npm 并更新索引，之后自行审查提交
```

[scripts/sync-market-index.mjs](scripts/sync-market-index.mjs) 只读取白名单包的 npm `dsh` tag，验证包名、版本、DSH bundle、真实发布时间及官方 registry tarball 的 SHA-512；全部所选包验证成功后才原子写入 [index.json](index.json)，保留历史版本与未选插件。索引 job 只提交该文件；推送因分支保护或并发提交失败时应重跑同步，不要强推。自动索引不会更新 BrowserSkill 子模块指针；父仓库仍由维护者固定已验收的子仓库提交。源地址保持 GitHub Raw，不依赖 jsDelivr。

## Git、联调与工作流边界

- 开始先看 `git status --short` 和 `git submodule status`；子模块关系以 [.gitmodules](.gitmodules) 为准。修改子模块前查看其自己的状态和更具体的指引，父仓库只记录子模块提交指针；按任务范围分别处理提交，不自动升级或重置子模块。
- [vendor/deepseek-harness/](vendor/deepseek-harness/) 是本地参考 checkout（忽略不入库），用于核对宿主契约，默认不直接修改。升级宿主需同时核对 SDK、peer 范围与 [vendor/README.md](vendor/README.md) 记录的固定版本，不自动跟随上游分支。
- 本地联调优先使用隔离 profile `plugins-dev`，流程见 [本地联调说明](README.md#本地联调)。安装或更新插件、重启在用 profile、发布 npm 包属于额外操作，按用户授权执行；普通开发与文档任务不默认包含这些动作。
- 客户端改动必须运行包内完整构建；源码或类型检查通过不代表已运行宿主加载了新 bundle。实际 UI 验证需确认目标 profile 加载了新产物，再刷新或按宿主要求重载。
- 使用 Comet 时，先读取项目配置和当前 selection，再遵循选中 change 的阶段规则；Native 正式产物位于 `docs/comet/changes/<change>/`，运行时数据位于 `.comet/runtime/native/`。没有活跃 change 的普通任务不必创建 change，不手工修改 Runtime 状态，不把 archive 当作当前任务。
- 有 CodeGraph 索引时优先使用其探索入口；无索引时按包范围搜索，避开依赖、构建产物及无关子模块。项目结构或脚本变化后同步更新本文件，详细契约仍链接到各包说明，避免复制易过期的版本和配置表。
