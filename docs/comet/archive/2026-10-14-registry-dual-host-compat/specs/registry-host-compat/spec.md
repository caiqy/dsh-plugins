# 自定义子代理注册表的双宿主支持

## 支持范围与接口选择

同一插件包支持 DSH `0.2.0-rc.2` 与 `0.2.1-alpha.2`，使用宿主提供的单一 SDK 实例及 optional peer dependencies。插件根据公开 API 是否存在选择适配路径，不要求用户设置宿主版本。仅在调用前选择接口；已选择的调用发生执行、权限、取消或清理错误时直接传播，不尝试其他派发接口。

宿主存在 startActivation 时，前台使用 caller delivery 并等待 result、检查 stopReason、释放 activation；后台使用 parent delivery 并立即返回 durable child id，由宿主继续管理，不随工具返回释放后台 activation。旧宿主前台使用 start、等待 result 并释放 holder-owned run，后台使用 startContinuable 并返回 durable child id。label、signal 和 request 按各自 API 所有权传递，保留现有模型、persona、深度、权限和 Agent frontmatter 设置。

### Scenario: 旧宿主前台委派

Acceptance: A1

WHEN 在 `0.2.0-rc.2` 的真实 SDK 组合中挂载插件并调用前台 use_agent，THEN 导入、挂载和执行成功，输出来自实际子代理；取消、异常停止、诊断和资源释放符合工具结果与宿主生命周期要求。

### Scenario: 旧宿主后台委派与精确追问

Acceptance: A2

WHEN 在旧宿主后台委派自定义 agent，THEN 调用立即返回实际 durable child id，后台工作继续；ask_agent 使用名字或 id 找到允许的后台子级，以 sendMessage 返回的 messageId 关联实际消费它的 turn，等待其回复。已结算后台子级允许 cold resume；前台 one-shot 或带前台标签的新式子级不可误选为后台目标。未知、非所属或不可续跑目标保留宿主错误。

### Scenario: 新宿主行为保持

Acceptance: A3

WHEN 同样功能在 `0.2.1-alpha.2` 中执行，THEN 使用 activation，前台结果不转为后台投递，后台不会提前 dispose，追问等待正确消息对应的回复；取消、异常停止、诊断和资源释放保持当前语义，失败不产生第二次派发。

## 历史会话与生命周期

use_agent 保持 resume 配置 auto/opt-in/off、显式 resume 和 fresh 的现有行为。仅选择该父级下同一角色最近的前台 run。中断判定覆盖未完成 turn 和 pending input，不得把更早的 completed 当成后续中断已完成。已选中目标的读取/恢复错误及占用冲突均报错。续跑重新应用 persona、模型/思考设置和工具过滤，校验所属父级与当前 live parent；一轮结束后等待必要后代并释放它们和句柄。按宿主能力使用对应的后代等待/清理 API，不得用空操作吞掉待完成工作或清理失败。调用取消及父级销毁会终止续跑；执行和清理同时失败时保留两者。

前台 cold resume 仍使用 agents.resume，保留它不受 manager 并发槽与 interrupt_agent 管理的当前限制。不要求跨宿主版本读取持久化会话，不执行 session 格式转换。

### Scenario: 两线续跑及取消

Acceptance: A4

WHEN 两个宿主分别续跑各自中断的前台会话，THEN 只继续同一历史任务并保持组合；读取失败、忙碌、取消或父级销毁不生成重复任务，后代等待与资源释放有实际可复核证据。

## 英文委派指导

可见自定义工具时保留现有英文文案：按角色优先选择自定义 agent，角色不匹配时使用可见原生工具，继承当前对话时使用 subagent_fork，独立委派一起发起并继续有用工作，独立自定义任务用 background=true，依赖结果时才前台等待，通过 ask_agent 追问。不得添加“简单任务直接处理”或其他额外委派策略。

分别识别两版宿主自己生成的原生委派段落，只替换对应段落，不修改 persona 或其他提示。以当前 scope 的真实工具可见性与 dispatch identity 判断；PTC 下查当前 scope 的工具 schema。受限制、被同名工具遮蔽或不可见时不注入；自定义工具名及时反映到文案。所有原生 schema 保持不变，卸载移除注册与提示，恢复原始宿主组装结果。

### Scenario: 两线提示词与作用域

Acceptance: A5

WHEN 两个宿主分别组装普通或 PTC 提示词，THEN 可见范围内文案与现有版本一致且能识别各自官方句型；限制、遮蔽、改名、卸载和原生 schema 均满足上述要求。

## 交付与验证

宿主 peer 版本范围明确包含两个目标 prerelease，仍由宿主提供 optional peers。文档准确描述两线差异与前台续跑限制。构建产物与最终源码同步。检查使用两套独立的实际已发布 SDK，核实版本，复用真实 services、persistence、spawn、manager 和 scope；只将模型响应脚本化，不能把 mock 新旧方法分支测试当作完整兼容证据。插件既有相关回归检查通过。

### Scenario: 同包支持与可重复证据

Acceptance: A6

WHEN 对最终候选执行类型、构建、回归和两线真实宿主检查，THEN 所有必要检查通过且明确报告 SDK 版本，打包元数据覆盖两线，编译产物与源码匹配。
