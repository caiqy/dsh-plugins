# Outcome

将官方 BrowserSkill 稳定版 0.4.1 合并到现有增强分支，增强实现严格限于 DSH 插件层。浏览器扩展和 bsk CLI/daemon/protocol 必须保持官方原版；本需求没有组件定制例外。相同最终效果优先采用官方实现；插件层不能等效实现时说明差异，由用户选择，不能转而修改官方组件。

本文件是用户最新硬约束下的完整 Shape 草稿，尚待重新确认。原含扩展定制的 A1–A21 Shape 已被取代，旧兼容候选不得加载。用户已选择继续插件层合并并明确保留官方限制；所有未达成的后台与 Edge 上传效果必须如实披露，不能算修复通过。

# Scope

## 目录结构

### 新建

- `packages/browser-skill/packages/dsh-plugin-browserskill/` 内确有必要的 DSH 适配及最小回归；复用已有官方模块，不建第二执行器。
- `artifacts/browserskill-upstream-041/` 内新的插件包、官方组件配套说明与真实报告；已撤回候选仅作历史证据。

### 修改

- BrowserSkill DSH 插件的 src/tests/scripts/skill/docs/README/package 身份及必要的 fork CI 元数据；保留 @caiqy、现有六工具及 OIDC 契约。
- 根 README/AGENTS/交付记录，以及验收通过后的父仓库 gitlink。
- 本 change 的 brief、完整目标 Spec 与 delta，在 Shape 完成前保持一致。

### 删除

- 被官方 evaluate/upload/download 覆盖的旧重复适配，不删其他增强。
- 插件文档、技能与脚本对已撤回兼容扩展的要求和加载指引。
- 撤销本轮扩展定制已完成：本地提交 `22f1b63a3b6e83119a698ffd9f68c74ce2c9db93` 将扩展恢复至官方稳定基线，保留 DSH 合并与历史提交。

### 明确不建

- 浏览器扩展、bsk CLI/daemon/protocol 的任何定制补丁；不批量采用未发布 main。
- raw CDP、未公开 daemon 接口、伪造可见性、关闭控制守卫、隐性录像或 unknown 动作重放。
- 新测试框架、通用诊断平台、自动更新或 Supervisor 子 change。

# Non-goals

不安装或重启在用 Desktop，不发布 npm、触发远端 CI、push/PR 或改写历史 tag。只使用官方配套浏览器扩展及 CLI/daemon，不再要求用户加载自定义扩展。候选实跑的宿主注册、模型与附件 fixture 不冒充实际 Desktop UI。

# Constraints and evidence

- 官方稳定提交：`b8f2d4f0fa35c8c7c866229e1cf3b3329ae39de5`。现有增强分支 `dsh/plugin-parity-0.3.3` 保持不变；DSH 合并保留，本地纠正提交为 `22f1b63a3b6e83119a698ffd9f68c74ce2c9db93`。
- 已核实扩展、CLI/daemon/protocol/Cargo 与官方稳定基线零差异；在用浏览器一直没有加载旧自定义扩展，所有旧自有会话与作业均已结束。
- Q1/Q2/Q3 仍有效：保留七类增强，采用官方结构化页面 JS 失败，接受 sync/context/observation/expect 与人工/导航撤销。
- 用户最新明确纠正：增强只能修改 DSH 插件，不能动浏览器插件和 bsk。此硬约束覆盖之前的组件兼容提案，已写入项目长期记忆及 AGENTS。
- 官方组件下旧报告仍保留：Chrome fullPage `page_hidden`；Edge fullPage 当时前台恢复后成功，三上传执行中 `control_context_invalid/effect_state:unknown`。这些失败不能算通过，尚不能从插件层承诺完全后台等效。
- 用户已反馈允许 Edge InPrivate，后续实测；不重复要求加载兼容扩展。

# Open questions

- Q6 已确认：用户选择“继续插件层合并，明确保留限制”。后台 fullPage 不承诺等效，Edge 上传 epoch 撤销不宣称已修复；保留接口与安全语义，实测中的这些未达成项单列为已接受的官方限制，不计功能成功。源码核对表明 DSH sidebar 只是普通 screenshot；remote ui.task_preview 不是现有本地 CLI/IPC 可达的等效能力，且 remote 不支持文件传输。不引入 gateway、录像或私有接口。
- 目前没有未解决的产品选择；下一步为本完整草稿的 Shape 确认。

# Acceptance examples

- A1：六工具 schema/私有 action/共享执行一致，保留所有权、非法及外部会话拒绝、FIFO、取消与超时。
- A2：evaluate 默认 true/显式 false、值/Promise/描述符正确；页面异常采用官方 ok:false/error/可选 dialogs，进程、超时、取消与 unknown 如实报告。
- A3：单文件、多文件及 drop 的 1..20、路径、模式、暂存归属与取消保持官方语义；真实 Chrome/Edge 分别核对实际文件名/内容或官方拒绝结果。成功须证明内容，Edge control_context_invalid/effect_state:unknown 单列已接受限制，重新同步只读核对后停止，不能算上传成功或已修复。
- A4：下载排他创建/显式覆盖/取消/dialog_pending 原 operation 恢复，不重复原下载。
- A5：保留 fullPage current/follow、附件及排他 output/EEXIST/停止后保留/失败清理。按实际前后台条件记录像素或官方错误；后台 page_hidden/对应中断不作等效成功，作为用户已接受的官方限制明确披露，不强制前台、不录像、不绕守卫。
- A6：browsers 无会话真实 metadata、显式核实实例、离线不换 profile，只列自有会话和 agent 标签。
- A7：emulate 全字段、预设覆盖、显式 false/off、数值校验正确；触控点关闭恢复实际原生基线。
- A8：observe 默认不探针，probe/debug/tab 及诊断结果完整，副作用并发分类不退化。
- A9：HTML 内联、UTF8 排他导出、字节/截断及失败取消清理正确。
- A10：daemon wait-ms 无会话 0..300000 整数、校验及取消正确。
- A11：start name/incognito/tracked recovery 共存；Chrome/Edge 隐身真实验证、禁借普通标签及停止清理。
- A12：@caiqy/fork、v3/v4 消息、客户端/skill/文档一致；独立 pnpm10.17 类型/构建/插件测试/实际包9资源通过，CI/OIDC 保持。
- A13：同一最终插件 tgz + 官方0.4.1组件，经 packed apply/六公开 bsk_* 真实 Chrome/Edge 验证；版本/hash/输出/清理及 fixture 边界如实记录。
- A14：官方基线/最终源码/插件 tgz/报告与回退可复现；撤回旧候选，禁止沿用旧兼容扩展证明或安装指引。
- A15：sync/context/observation/expect、target/strict、补充读取、过期/人工/导航拒绝及 bootstrap 正确，不绕守卫、不重放业务动作。
- A16：官方 drag/step/view/incognito/dialog、step 单次派发与取消回执、历史 token 隔离、operation await/cancel 保留。
- A17：实际 CLI/daemon/浏览器扩展均为官方0.4.1、协议1.8，与新插件候选配套；不掩盖 skew，不以旧报告或仅连接成功代替实测。
- A18：真实 caller→runner→CLI 证明前导连字符 expression/target/key/URL 字面量与控制 flags 顺序正确，UTF8及step取消收尾不回归。
- A19：对官方稳定基线执行差异检查，浏览器扩展与 bsk CLI/daemon/protocol/Cargo 不包含定制变更；仅 DSH 插件及必要包身份、发布和开发文档发生增强差异。
- A20：Edge 上传失效仅用官方公开信息/能力与插件层合法手段诊断；unknown 后重新同步只读核对并停止，不声称未证明的因果修复。
- A21：交付官方组件的真实身份与配套要求；最终插件包不要求自定义扩展，无授权安装/重启/外部发布动作。

# Verification expectations

Q6 已按用户选择解决；形成一致的完整目标 Spec/delta，再确认全部范围进入 Build。复用仍匹配插件源码的既有检查；文档/技能/实跑脚本移除自定义扩展依赖后重新进行必要类型、构建、测试和实际包资源检查。预期官方限制单列 limitation，不标功能 passed；CLI 参数错误、非约定错误及清理失败仍为失败，不能借限制声明豁免。

真实验收使用最终插件 packed apply→公开工具→官方CLI/daemon/扩展；后台与前台条件分别记录，不自动抢焦点，不隐性录像，不调用私有能力。未知效果不重放，失败与阻塞不计通过。最后 Runtime 检查、全新只读 Verifier 以及用户结果接受仍须完成。
