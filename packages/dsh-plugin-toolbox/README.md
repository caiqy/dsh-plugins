# DSH 工具箱

包名：`@caiqy/dsh-plugin-toolbox`。在 DSH 的设置侧栏增加独立的 **DSH 工具箱** 菜单，实用功能集中在这里管理，每项各有开关。开关通过宿主配置自动保存，重新启动后保留。

## 当前功能

**修复 VS Code 打开失败**，默认开启，适用于 Windows DSH Desktop。

DSH Desktop 使用 Electron 的 Node 模式运行宿主。右上角“用 VS Code 打开”启动 `Code.exe` 时，继承的 `ELECTRON_RUN_AS_NODE=1` 会使编辑器进入 Node 模式，从而打开失败。此功能只在宿主以 detached、ignore stdio 方式将单个现有目录传给 `Code.exe` / `Code - Insiders.exe` 时，移除该子进程环境中的这一变量。

开关关闭、插件停用或卸载时撤销修复。开关保存后无需重启整个 DSH。VS Code CLI、其他应用和宿主自身环境保留原有行为。后续功能也必须在本菜单提供独立开关；尚未实现完整重启 DSH。

宿主没有公开的“编辑器启动前”插件接口，因此修复使用进程内的 `child_process.spawn` 包装，并同步已导入的 ESM 绑定。没有修改 Desktop 安装文件。未来宿主改用其他进程入口时，需要重新核对兼容性。

## 本地安装

本版是本地候选，尚未发布 npm 或加入市场索引。在仓库根目录构建：

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
dsh plugin --profile desktop add ./.tmp/toolbox-dist/caiqy-dsh-plugin-toolbox-0.1.1.tgz
```

安装后按宿主提示重载插件，刷新页面，在 **设置 → DSH 工具箱** 中管理功能；如果旧宿主未动态加载新客户端入口，重新打开 Desktop。首次安装与后续功能开关的生效方式不同。

手动配置对应 entry id / namespace 为 `toolbox`：

```yaml
- id: toolbox
  name: '@caiqy/dsh-plugin-toolbox'
  config:
    fixVsCodeLaunch: true
```

## 开发约定

后端在 `src/index.ts` 的 `Config` 增加逐项布尔字段，默认值明确，必须声明 `.volatile()`，否则宿主不会向设置页面暴露字段。动态配置由 Cordis 原地更新稳定引用；启动包装每次读取 `.get()`，关闭开关即不再修改启动环境，无需重载插件。插件停用时通过 `ctx.effect` 撤销包装。设置页面在 `src/client.tsx` 通过 `configForms` 读取确认值并持久化，不新增私有设置文件或 RPC。

客户端沿用宿主 Switch 和主题，支持中英文；只读或未连接状态禁用修改，保存失败时显示宿主当前值与重试提示。`tests/launch.test.mjs` 覆盖 ESM 绑定、限定启动范围、环境保留、开关生效和卸载恢复；`tests/settings.test.mjs` 防止遗漏动态字段声明；前端测试验证构建产物的菜单注册和交互状态。
