# dsh-plugins

DSH（DeepSeek Harness）插件的开发工作区。每个插件是 `packages/` 下一个**互相独立**的 npm 包：独立版本、独立 `package.json`、可单独 `pnpm publish`，只是共用一次 `pnpm install` 和一套 TS 配置。

## 结构

```
packages/
  dsh-plugin-example/     ← 最小可运行样例，新插件直接复制这个目录
    src/index.ts          插件主体：export name / inject / apply
    cordis.patch.yml      注册入口（dsh.bundle.patch 指向它）
    test/smoke.test.mjs   冒烟测试：不启动 DSH 也能验证 apply 的注册行为
    tsconfig.json
tsconfig.base.json        NodeNext + strict，产物 ESM 到 lib/
pnpm-workspace.yaml       packages/* + 依赖版本 catalog
```

## 常用命令

```bash
pnpm install          # 一次装全部插件
pnpm build            # 全部构建（tsc → lib/）
pnpm typecheck        # 全部类型检查
pnpm test             # 全部冒烟测试（node --test，无框架）
```

## BrowserSkill 子仓库

`packages/browser-skill/` 是 Git submodule，fork 为 <https://github.com/caiqy/BrowserSkill>（`origin`），官方上游为 <https://github.com/Tencent/BrowserSkill>（`upstream`）。当前固定在 `dsh-plugin-v0.3.3`，提交 `d9a78aed47874459ae1e44523a597e42dd9acf99`。

它保留自己的 pnpm workspace、依赖和构建流程，显式排除在根 workspace 之外。DSH 插件源码位于 `packages/browser-skill/packages/dsh-plugin-browserskill/`；增强仅修改插件层，Chrome、Edge 继续使用官方扩展。

新 checkout 获取源码并配置官方远端：

```sh
git submodule update --init packages/browser-skill
git -C packages/browser-skill remote add upstream https://github.com/Tencent/BrowserSkill.git
```

接口方案确认后，从固定基线创建增强分支。官方升级时检查并重放仍需保留的补丁，独立验证和打包，再更新父仓库中的子模块提交；不自动跟随 fork 的 main。

## 新建一个插件

1. `cp -r packages/dsh-plugin-example packages/dsh-plugin-<名字>`
2. 改四处：`package.json` 的 `name`、`cordis.patch.yml` 的 `id` 和 `name`、`src/index.ts` 的 `export const name`、根 `package.json` 无需改（`packages/*` 自动纳入）
3. `pnpm install && pnpm build && pnpm test`
4. 按需在 `package.json` 里补 `@deepseek-ai/dsh-*` 依赖（host 提供的服务放 `peerDependencies`，同时放一份到 `devDependencies` 供编译用）

## 本地联调

本机已建好一个隔离的测试 profile `plugins-dev`（从 web 模板复制，不动 `desktop`/`web` 两个日常 profile）：

```bash
pnpm build
dsh plugin --profile plugins-dev add link:D:/Caiqy/Projects/Github/dsh-plugins/packages/dsh-plugin-example
dsh --profile plugins-dev --dump-config | Select-String example   # 确认条目进了 loader 树
dsh --profile plugins-dev                                          # 启动（占用 web 端口，先停掉日常 GUI 或加 --port）
```

`link:` 是软链，改完 `pnpm build` 重启 profile 即生效，不用重新 add。卸载：`dsh plugin --profile plugins-dev remove dsh-plugin-example`；整个测试 profile 直接删目录 `~/.dsh/profiles/plugins-dev`。

## 三条硬规则

1. **`peerDependencies` 必须写真正的 semver 范围**，不能写 `catalog:` 或 `workspace:`。`dsh plugin add` 会读它并对着当前 dsh 版本做兼容性门禁，看不懂的范围直接拒绝安装（`catalog:` 会被判为不兼容）。
2. **`catalog:` 只用在 `devDependencies`**（见 `pnpm-workspace.yaml`），升级 DSH 宿主版本只改那一处。
3. **`@deepseek-ai/*` 不能依赖 npm 的 `latest` 标签**——部分包的 `latest` 停留在远古版本（`@deepseek-ai/dsh-tools` 的 `latest` 是 `0.0.1-rc.1`，真正在用的是 `next`/`0.2.0-rc.2`）。catalog 里写死版本号。
