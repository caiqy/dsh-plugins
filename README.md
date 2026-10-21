# dsh-plugins

DSH（DeepSeek Harness）插件的开发工作区。每个插件是 `packages/` 下一个**互相独立**的 npm 包：独立版本、独立 `package.json`、可单独 `pnpm publish`，只是共用一次 `pnpm install` 和一套 TS 配置。

## 插件发行与市场索引

在 DSH 插件市场添加以下索引源：

```text
https://raw.githubusercontent.com/caiqy/dsh-plugins/main/index.json
```

索引列出公开 npm 包的固定版本：

| 插件 | npm 包 | 版本 |
| --- | --- | --- |
| BrowserSkill 增强版 | `@caiqy/browser-skill-dsh-plugin` | `0.3.3-dsh.3` |
| Web Search | `@caiqy/dsh-plugin-web-search` | `0.1.1` |

BrowserSkill 增强版要求另行安装官方 CLI 和浏览器扩展（当前配套 0.3.3），不能与官方 DSH 插件同时启用。发行使用 npm 的 `dsh` 标签和索引中的精确版本，不覆盖官方 npm 包。

发版使用 GitHub Actions + npm Trusted Publishing（OIDC），不需要在 CI 保存 npm token 或重复浏览器登录。先在对应源码仓库修改版本并推送，再在本仓库选择一个插件发版（版本号为示例）：

```sh
pnpm release web-search 0.1.2
pnpm release toolbox 0.2.2
pnpm release browser-skill 0.3.3-dsh.4

# 使用现有版本验证 Actions 构建、测试与打包，不发布。
pnpm release web-search 0.1.1 --check
pnpm release toolbox 0.2.2 --check
pnpm release browser-skill 0.3.3-dsh.3 --check
```

本机需已登录 GitHub CLI；可用 `--ref <branch-or-tag>` 指定已推送的候选。各插件在自己的源码仓库运行发布工作流，只发布所选包。也可推送 `web-search-v<version>` / `toolbox-v<version>` / `caiqy-dsh-plugin-v<version>` tag 触发，或在对应仓库 Actions 手动运行。npm 发布仍需先为每个包配置 Trusted Publisher；新连接需在页面给出的期限内（通常 48 小时）完成一次真实 OIDC 发布来激活，检查模式不能激活连接。BrowserSkill 手动运行须选择增强分支 `dsh/plugin-parity-0.3.3`，不要使用跟随上游的 `main` 发布。

工作流会类型检查、构建、测试、打包并验证真实公开 npm 包。市场索引在 Web Search / Toolbox 工作流成功后及每小时第 17、47 分钟同步；BrowserSkill 发行会由定时任务接入。也可以立即手动同步指定插件：

```sh
gh workflow run sync-market-index.yml --repo caiqy/dsh-plugins -f plugin=browser-skill
```

索引只有在公开包可下载且哈希校验通过后才更新，保留历史版本。GitHub 定时调度可能延迟，DSH 默认另缓存索引 10 分钟。认证字段、检查模式、失败重试及子模块维护要点见 [AGENTS.md 的发版说明](AGENTS.md#按插件发版github-actions)。根 workspace 不发布，BrowserSkill 保持自己的构建流程。

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

## DSH 工具箱（本地候选）

[DSH 工具箱](packages/dsh-plugin-toolbox/README.md)（`@caiqy/dsh-plugin-toolbox`）在设置中增加独立菜单，每项功能单独开关并自动保存。本版提供 Windows Desktop 的 VS Code 打开目录修复与 DSH Desktop 优雅重启（带超时兜底及无黑框静默执行），尚未发布 npm 或加入市场索引。

```sh
pnpm --filter @caiqy/dsh-plugin-toolbox typecheck
pnpm --filter @caiqy/dsh-plugin-toolbox build
pnpm --filter @caiqy/dsh-plugin-toolbox test
```

## BrowserSkill 子仓库

`packages/browser-skill/` 是 Git submodule，fork 为 <https://github.com/caiqy/BrowserSkill>（`origin`），官方上游为 <https://github.com/Tencent/BrowserSkill>（`upstream`）。长期增强分支为 `dsh/plugin-parity-0.3.3`；名称中的 `0.3.3` 表示初始基线，后续继续复用此分支。当前发行版本 `0.3.3-dsh.3` 通过 Actions OIDC 发布，对应提交 `19232997c523ec7e8e95b724feb99cb0f50d2ed0`，父仓库固定该提交。此前 `0.3.3-dsh.2` 保留 tag `caiqy-dsh-plugin-v0.3.3-dsh.2` / `91fae956183d45e3ec2de197e22cdb27f1866382`。早期本地增强版本 `0.3.3-dsh.1` 保留在 tag `dsh-plugin-v0.3.3-dsh.1` / `cb389bb4a31cfa200ba179e9279e2f6a347509d4`；官方初始基线为 `dsh-plugin-v0.3.3` / `d9a78aed47874459ae1e44523a597e42dd9acf99`。增强分支及版本 tag 均已推送到 fork。

它保留自己的 pnpm workspace、依赖和构建流程，显式排除在根 workspace 之外。DSH 插件源码位于 `packages/browser-skill/packages/dsh-plugin-browserskill/`；增强仅修改插件层，Chrome、Edge 继续使用官方扩展。

新 checkout 获取源码并配置官方远端：

```sh
git submodule update --init packages/browser-skill
git -C packages/browser-skill remote add upstream https://github.com/Tencent/BrowserSkill.git
```

维护时切换到上述长期增强分支，复用现有实现、测试和打包流程。子仓库 `main` 保持官方代码；官方发布新稳定 tag 后，将对应 tag 合入增强分支，处理实际冲突，并移除已被官方吸收的本地增强。完成类型检查、测试、构建、包检查和需要的 Chrome/Edge 冒烟后，提高版本并提交推送，选择统一命令或版本 tag 其中一种方式触发发版。手动发版后不要再推送会触发相同版本发布的 tag；源提交由子模块指针及 npm provenance 固定，已有 tag 不移动。无需为每次升级重新开发或新建维护分支。

先推送子仓库增强分支（若选择 tag 发版，再推送对应 tag），再提交父仓库的子模块指针，确保其他机器能获取对应提交。父仓库固定验收过的提交，不自动跟随分支更新。现有安装包、实测证据和回退入口见 [交付记录](artifacts/browserskill-dsh-enhancement/DELIVERY.md)；其中链接的候选期文档保留当时记录，分支维护方式以本节为准。

## 新建一个插件

1. `cp -r packages/dsh-plugin-example packages/dsh-plugin-<名字>`
2. 改四处：`package.json` 的 `name`、`cordis.patch.yml` 的 `id` 和 `name`、`src/index.ts` 的 `export const name`、根 `package.json` 无需改（`packages/*` 自动纳入）
3. `pnpm install && pnpm build && pnpm test`
4. 按需在 `package.json` 里补 `@deepseek-ai/dsh-*` 依赖（host 提供的服务放 `peerDependencies`，同时放一份到 `devDependencies` 供编译用）

## 本地联调

本机已建好一个隔离的测试 profile `plugins-dev`（从 web 模板复制，不动 `desktop`/`web` 两个日常 profile）：

```bash
pnpm build
dsh plugin --profile plugins-dev add link:./packages/dsh-plugin-example
dsh --profile plugins-dev --dump-config | Select-String example   # 确认条目进了 loader 树
dsh --profile plugins-dev                                          # 启动（占用 web 端口，先停掉日常 GUI 或加 --port）
```

`link:` 是软链，改完 `pnpm build` 重启 profile 即生效，不用重新 add。卸载：`dsh plugin --profile plugins-dev remove dsh-plugin-example`；整个测试 profile 直接删目录 `~/.dsh/profiles/plugins-dev`。

## 三条硬规则

1. **`peerDependencies` 必须写真正的 semver 范围**，不能写 `catalog:` 或 `workspace:`。`dsh plugin add` 会读它并对着当前 dsh 版本做兼容性门禁，看不懂的范围直接拒绝安装（`catalog:` 会被判为不兼容）。
2. **`catalog:` 只用在 `devDependencies`**（见 `pnpm-workspace.yaml`），升级 DSH 宿主版本只改那一处。
3. **`@deepseek-ai/*` 不能依赖 npm 的 `latest` 标签**——部分包的 `latest` 停留在远古版本（`@deepseek-ai/dsh-tools` 的 `latest` 是 `0.0.1-rc.1`，真正在用的是 `next`/`0.2.0-rc.2`）。catalog 里写死版本号。
