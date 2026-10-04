# 网页搜索后端插件

## 目标与边界

提供独立插件包 `dsh-plugin-web-search`，替代 DSH 内置 `web_search` 的执行后端。第一版仅实现 OpenAI `POST /v1/alpha/search`。插件不注册新的模型可见工具。

DSH 接入事实已按 `dsh-v0.2.0-rc.2` 核实。OpenAI alpha search 协议依据本地参考实现与测试，并有独立公开实现交叉印证；尚未验证真实 endpoint 的权限、模型可用性和完整错误协议，交付时如实记录。

## 宿主接入

插件向 `ctx.web.registerSearchProvider` 注册固定 ID `web-search-provider` 的后端。后端读取插件当前配置，派发给所选 provider。

bundle patch 将 `web` 条目的 `searchProvider` 设置为 `web-search-provider`，保留默认 `fetchProvider: http`。DSH patch 对 config 进行整项替换，因此显式保留 fetch 字段；用户自身更高优先级的 profile override 仍遵循宿主规则。安装说明写明 profile 显式覆盖搜索路由时需移除冲突设置或将其指向插件。

原工具的 `queries` 参数、参数校验、并发多查询合并、URL 去重、返回结果数量上限、搜索卡片和引用提示均由 DSH 自身处理。插件为每个 `WebSearchRequest` 执行一次 provider 调用并返回 `WebSearchResult`，不复制工具逻辑。

启用 bundle 才接管路由；禁用或卸载 bundle 后，宿主重建组合并恢复原 bundle 的搜索 provider 选择。插件不修改宿主源码或 registry 私有属性。

### Scenario: 原工具接入插件后端

GIVEN 宿主启用本插件且 profile 未显式覆盖其搜索路由，WHEN 模型调用原 `web_search({queries:["示例查询"]})`，THEN 请求经原工具到达插件 provider，工具名称和参数定义未增加或改变。

### Scenario: 复用多查询与结果展示

GIVEN 模拟后端返回有重复 URL 的多组结果，WHEN 原工具收到多个查询且设有结果上限，THEN 宿主仍按既有规则合并、去重、截断并生成搜索卡片与引用提示；正常 `web_fetch` 仍使用原 HTTP provider。

### Scenario: 禁用后恢复宿主路由

GIVEN base-backed 宿主通过本插件 bundle patch 选择插件 provider，WHEN 禁用或卸载插件并重新加载组合，THEN 搜索选择恢复为原宿主 bundle 的值，不残留插件写入的私有状态。

## Provider 配置与配置页

配置分为 `provider` 和 provider 专属对象。第一版下拉框仅有 `openai`；非密钥配置示意：

```yaml
provider: openai
providers:
  openai:
    endpoint: https://api.openai.com/v1/alpha/search
    model: gpt-5.6-luna
```

未来 provider 在同一内部清单中增加标识、可见字段与执行函数；字段按 provider 定义，不强制所有服务使用 endpoint、API key、model 等统一字段。第一版不引入对外 provider 注册 API、工厂体系或无法调用的占位项。

配置页挂到 `plugins.bundle.config`，位于插件自身详情页，复用 DSH 表单、按钮、输入控件和主题。包含“服务提供商”“接口地址”“API 密钥”，以及 OpenAI 专属“搜索模型”，仅渲染当前 provider 的字段，提供保存与放弃修改。

接口地址采用完整操作 URL，默认 `https://api.openai.com/v1/alpha/search`；直接使用用户填写的 URL，不重复拼接路径。保存前校验绝对 HTTP(S) URL，拒绝无效协议和 URL 内嵌用户名/密码。搜索模型默认 `gpt-5.6-luna`，来自参考插件默认值，用户可填写服务实际支持的非空模型 ID；不绑定当前聊天模型，也不声称默认模型在所有服务均可用。

provider 与非密钥字段使用宿主 volatile 配置能力，下一次搜索读取最新保存值。控件有可见标签、键盘操作和焦点；保存显示进行中、成功或具体失败，字段错误贴近输入。宿主只读或配置不可用时展示原因并禁用保存，错误不清空未保存输入。

### Scenario: OpenAI 配置可持久化并使用

GIVEN 用户打开插件详情页，WHEN 选择 OpenAI，填写完整接口 URL 和搜索模型并保存，THEN 重开后仍显示这些配置，下一次搜索使用它们；包含 `/v1/alpha/search` 的地址不会重复追加路径，空模型或无效地址不可保存。

### Scenario: Provider 专属字段

GIVEN 配置 UI 按 provider 清单生成字段，WHEN 单测使用一个仅含独立字段的 provider 元数据并切换选择，THEN 页面显示其字段、不显示 OpenAI 专属字段，切回后独立配置仍可读取。测试 provider 不进入发行包的可用 provider 列表。

### Scenario: 无效输入和保存失败

GIVEN 用户填写无效配置或宿主拒绝保存，WHEN 点击保存，THEN 显示字段错误或保存失败，不声称已生效，不丢失当前输入；表单标签、键盘焦点和保存反馈可访问。

## API 密钥

配置页通过 DSH credentials remote 写入独立引用 `DSH_WEB_SEARCH_OPENAI_API_KEY`，不覆盖聊天使用的 OpenAI 密钥。后端每次搜索调用 `ctx.credentials.resolve`；普通配置不保存密钥字面量。

密码框不回填已保存值，只显示已配置/未配置。空输入保持原密钥；来源为不可写环境变量时遵守宿主 writability 状态并显示原因。第一版无需另做删除密钥操作。

非密钥配置和 credential store 为两次持久化操作，不宣称跨存储原子性；任一拒绝准确展示。新密钥保存成功后清空输入，失败保留输入供修正。

密钥不可进入搜索结果、错误消息、普通配置响应或日志。HTTP 请求拒绝重定向，避免 Authorization 发往其他目标；上游错误正文不未经处理地转发。

### Scenario: 密钥保存与空输入

GIVEN 用户保存密钥，WHEN 重开配置页，THEN 密码框为空且显示已配置，普通配置响应不含密钥；再次只改地址且密码框留空保存时原密钥继续有效。下一次搜索解析新保存密钥，无需重启。

### Scenario: 密钥不泄露

GIVEN 模拟密钥与回显该密钥的 HTTP 错误，WHEN 搜索失败或读取配置，THEN 模型可见错误、普通配置响应与日志均不含密钥原文；3xx 响应不触发携带 Authorization 的重定向请求。

## OpenAI alpha search 协议

发送到配置的完整 URL，method 为 POST，headers 为 `Authorization: Bearer <key>` 和 `Content-Type: application/json`。请求采用已核实结构：

```json
{
  "id": "<本次独立搜索的非空标识>",
  "model": "<配置的搜索模型 ID>",
  "input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"<query>"}]}],
  "commands": {"search_query":[{"q":"<query>"}]},
  "settings": {"allowed_callers":["direct"],"external_web_access":true},
  "max_output_tokens": 2048
}
```

不发送顶层 `query`/`queries`。第一版每次独立查询生成一个非空随机 `id`，不实现上游引用续查；不把 DSH 内部 Session 类型强加到公开 `WebSearchRequest`。不发送没有协议证据的结果数量参数。

成功响应要求顶层对象有 string 类型 `output`；`results` 可省略，存在时必须为数组。`encrypted_output` 为可选不透明字段，不进入模型输出或配置。

`output` 映射到宿主 `content`，清理参考实现已识别的私有引用标记 `\uE200cite\uE202…\uE201` 及紧随的 `[wordlim: N]`。`results[]` 中仅将具有合法 HTTP(S) URL 的条目映射为来源，保留可选字符串 title；不编造或假定 snippet、日期。缺少 URL 的非网页结果忽略，仍保留正文。来源链接交由宿主渲染。最终结果数量由宿主限制。

真实 endpoint 的模型可用性、普通 API key 是否获准和官方完整契约尚未验证。第一版支持用户指定的 API key 与兼容 endpoint，不增加 ChatGPT OAuth、Account-ID 或其他鉴权模式。错误响应形状未知不阻塞通用 HTTP 错误处理。

### Scenario: 请求符合已核实协议

GIVEN 模拟 endpoint 接收请求，WHEN 搜索执行，THEN URL 等于配置的完整地址，method、Bearer 鉴权和 JSON body 符合上述结构，两个 query 字段内容一致，model 等于配置值；两个独立请求有不同的非空 id，不发送顶层 query/queries 或臆造数量参数。

### Scenario: 正常正文和来源映射

GIVEN 响应包含 output、encrypted_output 与具有 url/title 的 results，WHEN 解析，THEN 宿主 content 保留正文且清理私有引用标记，sources 只含合法 URL 与实际 title，encrypted_output 不被暴露；无 snippet 或日期时不编造字段。

### Scenario: 空结果和格式错误可区分

GIVEN 响应为 `{ "output": "", "results": [] }` 或省略 results 的合法正文，WHEN 解析，THEN 返回相应空来源结果或保留正文；缺少 output、非字符串 output、非数组 results 或非 JSON 时明确失败，不能伪装为空结果。

## 取消与失败

使用平台 fetch 并遵循宿主 AbortSignal。网络失败、HTTP 非成功、JSON 解析失败和顶层协议错误都以 `WebError` 报告。HTTP 错误保留状态码；取消使用 `WEB_ABORTED`，其他执行错误使用 `WEB_PROVIDER_ERROR`，缺少密钥显示可操作的配置错误。不自动调用宿主默认 provider、不自动重试。

### Scenario: 取消与失败

GIVEN 模拟网络失败、HTTP 401/429/500、非 JSON 或协议错误，WHEN 搜索执行，THEN 失败可识别、不返回虚假空结果、不转向默认 DeepSeek；请求取消和响应体读取期间取消都报告取消错误。

## 共享源码与交付

在当前仓库引入 `vendor/deepseek-harness` Git submodule，来源为 `https://github.com/deepseek-ai/deepseek-harness.git`，固定 `dsh-v0.2.0-rc.2` 提交 `639ed015397290b3745d163aafe02ffee4aa3f84`，匹配工作区 SDK。源码供后续插件参考，根 workspace 的 `packages/*` 只构建插件包。

交付插件源码、可构建 bundle、安装配置说明、协议证据和最小可运行验证；沿用 main 并保留无关改动。第一版不加入缓存、重试、其他 provider、上游引用续查或额外搜索工具。本轮不自动安装到在用 DSH、不发布、不推送。真实 OpenAI 调用仅在明确提供专用测试配置后执行，否则记录未执行。

### Scenario: 共享源码可复用

GIVEN 新 checkout 初始化 submodule，WHEN 查看 remote 与 HEAD，THEN 来源和固定版本可复现；根 workspace 构建不递归纳入 DSH 项目，现有示例插件仍可独立构建。

### Scenario: 构建与可运行校验

GIVEN 工作区依赖已安装，WHEN 运行插件类型检查、构建与测试，THEN 全部通过；校验覆盖协议、映射、错误、密钥保护、取消、provider 字段与原工具接入。未进行真实 OpenAI 请求时明确标记未执行，不冒充实测。

## 证据来源与实施顺序

宿主资料：

- Web seam：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/web/web/src/index.ts>
- 原工具：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/web/tool-web/src/search.ts>
- 配置 slot：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/client/ui-plugin-manager/src/client/slot-contract.ts>
- Credential seam：<https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/credentials/credentials/src/index.ts>

OpenAI 参考（作为实现证据，非新的需求来源）：

- 本地 `D:/Caiqy/Projects/Github/opencode-ide-plugin/packages/core/src/tool/websearch.ts` 的 `buildAlphaSearchRequest`、`AlphaSearchResponse`、`runAlphaSearchRequest`、`nativeSearchOutput`；本地对应 `packages/core/test/tool-websearch.test.ts`。
- 本地 `packages/opencode/src/tool/websearch.ts`：Bearer 鉴权、默认模型 `openai/gpt-5.6-luna` 和正文清理。
- 公开独立实现 `pi-codex-search-remote@0.2.0`：<https://registry.npmjs.org/pi-codex-search-remote>；其源码包由研究代理核实请求及响应结构。
- 第三份可公开复核实现：<https://github.com/kk3ya03-star/dsh-lcx-codex/blob/main/src/web-search-alpha.ts>。其中复杂续查、锁、递归解析等不属于本插件第一版范围。

确认后由当前会话按一个 Native change 实施：先固定共享源码并配置插件包依赖，再实现请求/解析和原生 provider 接入，再实现配置页和 credential 交互，最后做定向校验并由 Runtime 执行正式检查、启动新的只读 Verifier。目标紧密相关，无需 Supervisor 子任务拆分。
