# 共享上游源码

`deepseek-harness` 是供本仓库所有插件复用的 Git submodule，不参与根 pnpm workspace 的 `packages/*` 构建。

- 上游：<https://github.com/deepseek-ai/deepseek-harness>
- 固定标签：`dsh-v0.2.0-rc.2`
- 固定提交：`639ed015397290b3745d163aafe02ffee4aa3f84`
- 用途：参考插件扩展点、类型、UI primitives、bundle patch 和宿主测试；插件实现放在根 `packages/`，不直接修改上游。

新 checkout 获取源码：

```sh
git submodule update --init vendor/deepseek-harness
```

宿主升级时同时核对根 workspace catalog、插件 peerDependencies 与子模块固定提交，升级由一个明确任务处理；不要自动跟随上游 master。
