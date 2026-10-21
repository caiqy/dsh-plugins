# DSH 工具箱

包名：`@caiqy/dsh-plugin-toolbox`。在 DSH 的设置侧栏增加独立的 **DSH 工具箱** 菜单，实用功能集中在这里管理，每项各有开关与操作。开关通过宿主配置自动保存，重新启动后保留。

## 当前功能

### 1. 修复 VS Code 打开失败（默认开启）

适用于 Windows DSH Desktop。

DSH Desktop 使用 Electron 的 Node 模式运行宿主。右上角“用 VS Code 打开”启动 `Code.exe` 时，继承的 `ELECTRON_RUN_AS_NODE=1` 会使编辑器进入 Node 模式，从而打开失败。此功能只在宿主以 detached、ignore stdio 方式将单个现有目录传给 `Code.exe` / `Code - Insiders.exe` 时，移除该子进程环境中的这一变量。

开关关闭、插件停用或卸载时撤销修复。开关保存后无需重启整个 DSH。VS Code CLI、其他应用和宿主自身环境保留原有行为。

### 2. 重启 DSH Desktop（优雅重启 + 超时兜底）

适用于 Windows DSH Desktop，在“设置 → DSH 工具箱”提供一键「立即重启」操作卡片。

- **静默无黑框**：通过 WMI 独立进程创建并指定 `ShowWindow = 0 (SW_HIDE)` 及 `windowsHide`，彻底避免启动辅助程序时的黑框闪烁。
- **优雅关闭**：通过 Windows Restart Manager (`RmShutdown`) 触发 Desktop 正常退出，等待主进程与 Host 优雅关闭释放所有端口和文件锁。
- **超时兜底**：提供「允许超时强制关闭」开关（默认关闭）。当优雅退出超过 10 秒未响应时，若开启该选项则强制结束残留进程，确保成功重启。
- **纯净环境拉起**：辅助程序在确认旧实例彻底退出后，清理继承的 Node 模式环境变量（`ELECTRON_RUN_AS_NODE`），拉起全新的 `DeepSeek Harness.exe`，并进行启动存活自检与失败重试。
- **零官方文件修改**：完全在外部完成进程编排与状态维护，不修改任何官方安装文件或代码。

## 发布与安装

发布使用仓库的 `publish-toolbox.yml` 工作流和 npm Trusted Publishing（OIDC）；Windows runner 先验证 PowerShell 辅助程序，Linux runner 再构建、测试并打包，包内必须含 `res/restart-worker.ps1`。首次发布 `0.2.2` 用于初始化 npm 包；后续版本由 GitHub Actions 发布，不向 CI 复制本机凭据。

从 npm 安装公开版本：

```sh
dsh plugin --profile desktop add @caiqy/dsh-plugin-toolbox@dsh
```

```sh
pnpm release toolbox 0.2.3 --check  # 只构建、测试、打包
pnpm release toolbox 0.2.3          # 发布已提交并推送的版本
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
dsh plugin --profile desktop add ./.tmp/toolbox-dist/caiqy-dsh-plugin-toolbox-0.2.3.tgz
```

安装后在 **设置 → DSH 工具箱** 中管理功能。

手动配置对应 entry id / namespace 为 `toolbox`：

```yaml
- id: toolbox
  name: '@caiqy/dsh-plugin-toolbox'
  config:
    fixVsCodeLaunch: true
    allowForceRestart: false
```

## 开发约定

后端在 `src/index.ts` 的 `Config` 增加逐项布尔字段，默认值明确，必须声明 `.volatile()`，否则宿主不会向设置页面暴露字段。动态配置由 Cordis 原地更新稳定引用；启动包装每次读取 `.get()`，关闭开关即不再修改启动环境，无需重载插件。插件停用时通过 `ctx.effect` 撤销包装。

独立辅助程序位于 `res/restart-worker.ps1`，打包时包含在 npm 包的 `res` 目录中。宿主通过 `/api/toolbox/restart` 端点响应前端请求，执行身份与环境校验、创建临时运行区并向辅助程序发出握手信号。设置页面在 `src/client.tsx` 统一渲染各项开关、重启卡片及操作确认态。

Windows PowerShell 5.1 中 `FILETIME` 必须使用 `System.Runtime.InteropServices.ComTypes.FILETIME` 全名；其 `Set-Content -Encoding UTF8` 会产生 BOM，读取 `result.json` 时需要移除 BOM，才能及时显示真实错误。`tests/restart-worker.test.mjs` 在实际 Windows PowerShell 下编译随包接口并执行辅助程序的 `-ValidateOnly` 模式，覆盖就绪握手及错误解析；该模式在就绪后退出，不发出关闭请求或拉起应用。宿主调度函数也支持 `initiateRestart({ validateOnly: true })`，用于验证完整 WMI 启动链路。只读验证通过不代表完整关闭再拉起已通过。
