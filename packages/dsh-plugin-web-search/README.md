# @caiqy/dsh-plugin-web-search

替换 DSH 内置 `web_search` 的搜索后端。第一版支持 OpenAI `/v1/alpha/search` 和采用相同协议的兼容接口；不增加模型工具。`web_fetch` 继续使用宿主默认 HTTP 后端。

## 安装

从 npm 安装公开发行版：

```sh
dsh plugin --profile desktop add @caiqy/dsh-plugin-web-search@0.1.1
```

也可以在 DSH 的插件市场添加本仓库索引源：

```text
https://raw.githubusercontent.com/caiqy/dsh-plugins/main/index.json
```

从源码构建时，在仓库根目录安装依赖，再构建与打包：

```sh
pnpm install
pnpm --filter @caiqy/dsh-plugin-web-search build
pnpm -C packages/dsh-plugin-web-search pack
```

将生成的 tarball 安装到所需 profile，例如：

```sh
dsh plugin --profile desktop add ./packages/dsh-plugin-web-search/caiqy-dsh-plugin-web-search-0.1.1.tgz
```

在 DSH 的插件详情页打开本插件配置，填写并保存。是否需要重新加载由宿主插件管理器提示决定；本仓库的开发任务不会自动安装或修改你的在用 profile。

## 配置

选择 OpenAI 后显示以下专属字段：

| 字段 | 含义 |
| --- | --- |
| 接口地址 | 完整操作 URL，默认 `https://api.openai.com/v1/alpha/search`，直接请求，不追加路径。 |
| 搜索模型 | 该搜索服务支持的模型 ID，默认 `gpt-5.6-luna`；与聊天模型独立，可修改。 |
| API 密钥 | 单独保存到宿主 credentials，引用名为 `DSH_WEB_SEARCH_OPENAI_API_KEY`；留空保持已有值。 |

非密钥配置位于本插件 `web-search-provider` 条目，模型只属于 OpenAI：

```yaml
provider: openai
providers:
  openai:
    endpoint: https://api.openai.com/v1/alpha/search
    model: gpt-5.6-luna
```

provider 的字段定义位于 `src/providers.ts`。以后新增 provider 时分别增加其配置 schema、字段和执行函数；不需要模型的服务不会继承 OpenAI 的模型字段。第一版下拉框仅提供已经实现的 OpenAI。

密码框不会回填密钥，只报告已配置/未配置状态。环境变量来源不可写时遵循宿主限制。非密钥设置先保存，密钥另行保存；部分失败会分别报告，保留未保存输入，重试不会重复已经接受的设置。

## 接管与恢复

bundle patch 选择 `web.searchProvider: web-search-provider`，并保留 `fetchProvider: http`。原 `web_search` 的参数、多查询合并、数量上限和结果卡片均由宿主处理。

用户 profile 中显式写入的 `web.config` 比 bundle patch 优先。如果安装后仍调用默认搜索服务，请检查该覆盖并在需要时将 `searchProvider` 设为 `web-search-provider`，同时保留自己的 fetch 配置。禁用或卸载 bundle 并让宿主重载组合后，会恢复其原 bundle 路由；插件不改宿主源码或工具注册表。

## 协议与验证

发送 POST + Bearer 鉴权，查询位于 `input[].content[].text` 和 `commands.search_query[].q`，附带当前 provider 的 `model`、每次独立请求随机 `id`、`settings.allowed_callers: [direct]`、`external_web_access: true` 和 `max_output_tokens: 2048`。

读取响应的字符串 `output` 和可选 `results[]`。只映射合法 HTTP(S) `url` 与可选 `title`，清理私有引用标记；不假定 snippet 或日期存在，不暴露 `encrypted_output`。HTTP 错误、JSON 错误和取消明确失败；不自动回退或重试，带密钥的请求不跟随重定向，错误不转发可能包含密钥的上游正文。

协议参考：[OpenCode 参考实现](../../../opencode-ide-plugin/packages/core/src/tool/websearch.ts)、[pi-codex-search-remote](https://registry.npmjs.org/pi-codex-search-remote)、[另一公开实现](https://github.com/kk3ya03-star/dsh-lcx-codex/blob/main/src/web-search-alpha.ts)。OpenCode 相对链接仅适用于本机同级 checkout；公开实现是可携带的证据。

可运行校验：

```sh
pnpm --filter @caiqy/dsh-plugin-web-search typecheck
pnpm --filter @caiqy/dsh-plugin-web-search build
pnpm --filter @caiqy/dsh-plugin-web-search test
```

真实调用入口从测试进程环境读取 `DSH_SEARCH_TEST_ENDPOINT`（完整 URL）、`DSH_SEARCH_TEST_KEY`、`DSH_SEARCH_TEST_MODEL`：

```sh
pnpm --filter @caiqy/dsh-plugin-web-search test:live
```

本次经用户授权读取全局 OpenCode 配置，使用 `gpt-6-luna` 实测通过：1.225 秒返回 7,991 字符正文和 5 个来源，来源主机为 `docs.python.org`、`www.python.org`、`wiki.python.org`。密钥未打印或复制到仓库；这个模型只用于本次实测，不是插件的通用模型配置。

## 已知限制

Alpha search 的公开实现提供协议依据，普通 OpenAI API key 权限、模型支持范围和完整官方契约不能由一次兼容服务实测保证。默认模型来自参考实现，请按实际服务修改。本插件不支持 ChatGPT OAuth、引用续查、其他 provider、缓存或重试。

UI 已覆盖状态逻辑、发行 bundle factory 和 React 渲染校验，尚未安装到在用 DSH 完成真实浏览器页面检查。当前 GUI 的认证页面不可直接进入；没有将 SSR 校验当作宿主浏览器实测。
