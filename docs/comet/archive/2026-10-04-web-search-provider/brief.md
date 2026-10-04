# Outcome

开发独立 DSH 网页搜索插件，接管内置 `web_search` 后端。模型继续使用原工具和参数；第一版支持 OpenAI `POST /v1/alpha/search`，后续 provider 可有不同配置字段。

# Scope

- 新增 `dsh-plugin-web-search` 包，注册原生 `ctx.web` provider；bundle patch 将搜索路由指向插件。
- 插件详情页提供服务商选择、完整接口 URL、API 密钥，OpenAI 另有搜索模型字段；第一版仅 OpenAI 可选。
- 配置字段和保存值按 provider 隔离；复用宿主 volatile 配置、credentials、UI slots 与表单。
- 实现已核实的 alpha search 请求及 output/results 映射，明确记录非官方协议与真实调用未验证的边界。
- 引入共享 DSH Git submodule，匹配当前 SDK，供后续插件持续参考。

# Non-goals

- 不新增模型可见工具，不修改宿主工具内部。
- 不实现其他 provider、缓存、自动重试、自动回退、上游引用续查、ChatGPT OAuth 或新 SDK。
- 本轮不发布、不推送、不自动安装到在用 DSH，也不改用户现有搜索密钥或 endpoint。

# Acceptance examples

完整验收位于 `specs/web-search-provider/spec.md` 的 14 个 Scenario，覆盖原工具接入、多查询及展示、禁用恢复、配置持久化、provider 专属字段、保存失败与可访问性、密钥保存与保护、请求协议、结果映射、空结果与格式错误、取消及失败、共享源码、构建与校验。

# Constraints and invariants

- 当前 pnpm 独立插件工作区与无关未提交改动保留。
- 不复制原工具的多查询合并、数量限制与引用展示；provider 遵循 AbortSignal。
- 错误明确失败，不伪装无结果；密钥不进入普通配置、结果和日志。
- DSH 搜索 seam、配置 slot 与 credential seam 已按 `dsh-v0.2.0-rc.2` 复核。
- alpha search 参考契约来自可运行实现和测试，不宣称官方公开保证；未知 snippet、日期、错误结构不编造。

# Decisions

- 用户选择当前目录，沿用 main，不创建分支或 worktree。
- 方案提交确认：注册固定 ID `web-search-provider` 的原生 provider，由 bundle patch 接管搜索；fetch 保留默认 http，禁用 bundle 后由宿主组合恢复原路由。
- 配置采用完整接口 URL，默认 `https://api.openai.com/v1/alpha/search`；OpenAI 搜索模型默认 `gpt-5.6-luna`（参考实现默认，可修改，不绑定聊天模型）。
- 独立 credential 引用为 `DSH_WEB_SEARCH_OPENAI_API_KEY`，密码框留空保持原密钥；非密钥配置与 credential 为两次保存，失败准确反馈。
- 协议调查已解决 Q1：主线程复核本地 `opencode-ide-plugin` 的请求构造、Bearer 鉴权、响应 schema、测试与正文清理，研究代理另以 `pi-codex-search-remote@0.2.0` 交叉验证。第一版映射 output 及 url/title，不要求不存在证据的 snippet。
- 每次独立搜索使用独立非空随机 id，固定 max_output_tokens=2048，不发送未经核实的数量参数。
- 共享源码采用 `vendor/deepseek-harness` Git submodule，固定 `dsh-v0.2.0-rc.2` 的 `639ed015397290b3745d163aafe02ffee4aa3f84`，不纳入根 workspace 构建。
- 紧密相关的目标使用一个 Native change，由当前会话实施，无需 Supervisor 拆分。

# Open questions

无未决功能问题。真实服务的 API key 权限、默认模型可用性与完整错误协议未验证；第一版允许用户填写兼容 endpoint 和实际模型，自动检查用已核实契约的模拟 HTTP 服务，交付明确说明真实调用的验证状态。

# Verification expectations

- 可运行测试覆盖请求 URL/headers/body/独立 id、正文与来源映射、私有标记清理、空结果与畸形响应、HTTP 错误、取消、重定向拒绝、密钥不泄露。
- 集成校验原 `web_search` 到插件路由、多查询与数量限制、fetch 路由及插件禁用后恢复。
- UI 验证 provider 字段、配置和模型保存、重开保留、密码框不回显和留空不删除、失败反馈与基础可访问性。
- 类型检查、构建与测试通过；新的只读 Verifier 独立判断全部验收项。
- 真实 OpenAI 请求只有明确提供专用测试配置后执行，否则标记未执行，不算实测通过。
