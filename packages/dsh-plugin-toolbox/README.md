# DSH 工具箱

包名：`@caiqy/dsh-plugin-toolbox`。在 DSH 的设置侧栏增加独立的 **DSH 工具箱** 菜单，实用功能集中在这里管理，每项各有开关与操作。开关通过宿主配置自动保存，重新启动后保留。

## 当前功能

### 1. 修复 VS Code 打开失败（默认开启）

适用于 Windows DSH Desktop。

DSH Desktop 使用 Electron 的 Node 模式运行宿主。右上角“用 VS Code 打开”启动 `Code.exe` 时，继承的 `ELECTRON_RUN_AS_NODE=1` 会使编辑器进入 Node 模式，从而打开失败。此功能只在宿主以 detached、ignore stdio 方式将单个现有目录传给 `Code.exe` / `Code - Insiders.exe` 时，移除该子进程环境中的这一变量。

开关关闭、插件停用或卸载时撤销修复。开关保存后无需重启整个 DSH。VS Code CLI、其他应用和宿主自身环境保留原有行为。

### 2. 重启 DSH Desktop（优雅重启 + 超时兜底）

适用于 Windows DSH Desktop。在侧栏“更多”菜单提供「重启 DSH Desktop」快捷入口，保留“设置 → DSH 工具箱”的「立即重启」操作卡片。两个入口共用宿主确认弹窗和同一条重启请求，确认后才执行；「允许超时强制关闭」沿用工具箱中已保存的选项。请求进行中两个入口均禁止重复提交，失败后显示原因并允许重试。

“更多”入口使用宿主公开的 `sidebar.panellist.actions` 插槽，弹窗使用 `shell.overlay`、`Modal`；不修改宿主菜单或安装文件。较旧宿主未提供“更多”插槽时保留设置页入口。该菜单入口自 `0.3.0` 起提供。

- **静默无黑框**：通过 WMI 独立进程创建并指定 `ShowWindow = 0 (SW_HIDE)` 及 `windowsHide`，彻底避免启动辅助程序时的黑框闪烁。
- **优雅关闭**：通过 Windows Restart Manager (`RmShutdown`) 触发 Desktop 正常退出，等待主进程与 Host 优雅关闭释放所有端口和文件锁。
- **超时兜底**：提供「允许超时强制关闭」开关（默认关闭）。当优雅退出超过 10 秒未响应时，若开启该选项则强制结束残留进程，确保成功重启。
- **纯净环境拉起**：辅助程序在确认旧实例彻底退出后，清理继承的 Node 模式环境变量（`ELECTRON_RUN_AS_NODE`），拉起全新的 `DeepSeek Harness.exe`，并进行启动存活自检与失败重试。
- **零官方文件修改**：完全在外部完成进程编排与状态维护，不修改任何官方安装文件或代码。

### 3. 思考强度协议兼容（默认关闭，0.3.0 新增）

在设置页开启后，从下一次模型请求生效；关闭或停用插件后停止改写，无需重启。按协议和已知请求结构识别，原厂直连与兼容服务使用同样规则，不依赖域名或模型名称。

| 请求协议 | 开启后的行为 |
| --- | --- |
| OpenAI Responses | 存在末尾当前强度 `configuration_update` 时，将已映射的值提升至顶层 `reasoning.effort`，清理历史及当前更新中的 `effort`，保留其他配置 |
| Anthropic Messages | 对 adaptive thinking 的末尾空 system 强度标记，将当前值提升至 `output_config.effort`，清理全部已识别强度标记；不触碰普通消息、thinking、签名及缓存控制字段 |
| Chat Completions / DeepSeek | 已有的 `reasoning_effort`、`thinking`、`output_config` 等原生字段原样通过；不推测不同模型的档位映射 |
| Gemini / Vertex | `thinkingLevel`、`thinkingBudget`、关闭思考等原生配置原样通过 |

此开关将逐条强度历史转换为请求级参数，历史前缀会改变，缓存命中率可能降低。Anthropic 历史 thinking 是否能继续复用仍由服务端验证，保留签名字串不代表保证签名接受或缓存命中。不会删除 beta 标记或其他扩展字段；服务端若拒绝这些字段，本开关不负责自动降级。

只处理不超过 16 MiB 的缓冲 JSON 正文（字符串、UTF-8 字节），不读取 `Request` 自带的流或其他流式请求正文。未知格式、未识别档位、缺少末尾当前强度标记、压缩或已识别的签名绑定请求原样通过。改写后移除旧 `Content-Length`，由 fetch 按新正文计算；认证、取消信号和响应流保留。宿主日志以 `toolbox reasoning:` 输出协议与 `rewritten / unchanged / skipped` 原因，同类结果只记录一次，不记录正文、密钥或地址；该日志不代表服务端已采用参数。

自动检查覆盖协议样例、历史标记、开关及卸载、压缩 fetch accessor 的两种加载顺序。原厂和兼容服务的真实推理与计费档位仍需在安装后用各服务的请求记录验收。

## 0.3.0 更新（2026-11-14）

- 新增默认关闭的「思考强度协议兼容」开关；按 Responses / Messages 结构提升当前档位，保留 DeepSeek、Gemini 等原生参数。
- 增加「更多 → 重启 DSH Desktop」入口，与设置页共用确认、请求状态及已保存的强制关闭选项。
- 新增协议样例、历史配置保留、动态开关、卸载及压缩 fetch 链两种加载顺序的回归检查。

## 发布与安装

发布使用仓库的 `publish-toolbox.yml` 工作流和 npm Trusted Publishing（OIDC）；Windows runner 先验证 PowerShell 辅助程序，Linux runner 再构建、测试并打包，包内必须含 `res/restart-worker.ps1`。首次发布 `0.2.2` 用于初始化 npm 包；后续版本由 GitHub Actions 发布，不向 CI 复制本机凭据。

`0.2.3` 已通过 [GitHub Actions OIDC 发布](https://github.com/caiqy/dsh-plugins/actions/runs/39527126991)，附带 SLSA provenance，公开 tarball 与 CI 产物的 SHA-512 校验一致。

从 npm 安装公开版本：

```sh
dsh plugin --profile desktop add @caiqy/dsh-plugin-toolbox@dsh
```

```sh
pnpm release toolbox 0.3.0 --check  # 只构建、测试、打包
pnpm release toolbox 0.3.0          # 发布已提交并推送的版本
```

在仓库根目录构建与验证：

```sh
pnpm --filter @caiqy/dsh-plugin-toolbox typecheck
pnpm --filter @caiqy/dsh-plugin-toolbox build
pnpm --filter @caiqy/dsh-plugin-toolbox test
```

安装到日常 Desktop 前可以先在隔离 profile 验证：

```sh
dsh plugin --profile plugins-dev add link:./packages/dsh-plugin-toolbox
```

打包安装使用实际生成的 tarball 路径：

```sh
pnpm -C packages/dsh-plugin-toolbox pack --pack-destination ../../.tmp/toolbox-dist
dsh plugin --profile desktop add ./.tmp/toolbox-dist/caiqy-dsh-plugin-toolbox-0.3.0.tgz
```

安装后在 **设置 → DSH 工具箱** 中管理功能。

手动配置对应 entry id / namespace 为 `toolbox`：

```yaml
- id: toolbox
  name: '@caiqy/dsh-plugin-toolbox'
  config:
    fixVsCodeLaunch: true
    allowForceRestart: false
    fixReasoningEffort: false
```

## 开发约定

后端在 `src/index.ts` 的 `Config` 增加逐项布尔字段，默认值明确，必须声明 `.volatile()`，否则宿主不会向设置页面暴露字段。动态配置由 Cordis 原地更新稳定引用；启动包装每次读取 `.get()`，关闭开关即不再修改启动环境，无需重载插件。插件停用时通过 `ctx.effect` 撤销包装。

独立辅助程序位于 `res/restart-worker.ps1`，打包时包含在 npm 包的 `res` 目录中。宿主通过 `/api/toolbox/restart` 端点响应前端请求，执行身份与环境校验、创建临时运行区并向辅助程序发出握手信号。客户端在 `src/client.tsx` 注册设置页、“更多”菜单项及共享确认弹窗；两个入口复用同一份重启状态，确认时读取最新配置。

Windows PowerShell 5.1 中 `FILETIME` 必须使用 `System.Runtime.InteropServices.ComTypes.FILETIME` 全名；其 `Set-Content -Encoding UTF8` 会产生 BOM，读取 `result.json` 时需要移除 BOM，才能及时显示真实错误。`tests/restart-worker.test.mjs` 在实际 Windows PowerShell 下编译随包接口并执行辅助程序的 `-ValidateOnly` 模式，覆盖就绪握手及错误解析；该模式在就绪后退出，不发出关闭请求或拉起应用。宿主调度函数也支持 `initiateRestart({ validateOnly: true })`，用于验证完整 WMI 启动链路。只读验证通过不代表完整关闭再拉起已通过。
