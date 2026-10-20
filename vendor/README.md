# 共享上游源码

`deepseek-harness` 是本地只读参考 checkout，不入库，也不参与根 pnpm workspace 的 `packages/*` 构建。

- 上游：<https://github.com/deepseek-ai/deepseek-harness>
- 固定标签：`dsh-v0.2.0-rc.2`
- 固定提交：`639ed015397290b3745d163aafe02ffee4aa3f84`
- 用途：参考插件扩展点、类型、UI primitives、bundle patch 和宿主测试；插件实现放在根 `packages/`，不直接修改上游。

新 checkout 按固定标签取源码：

```sh
git clone --branch dsh-v0.2.0-rc.2 https://github.com/deepseek-ai/deepseek-harness.git vendor/deepseek-harness
```

宿主升级时同时核对根 workspace catalog、插件 peerDependencies 与本文件记录的固定版本，升级由一个明确任务处理；不要自动跟随上游 master。
