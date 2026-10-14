# Outcome

让同一版本的 `@aiwayds/dsh-subagent-registry` 同时支持 DSH `0.2.0-rc.2` 与 `0.2.1-alpha.2`，恢复旧支持线，同时保留当前版本的自定义角色委派、后台追问、前台续跑和英文委派提示词。

# Scope

仅修改本仓库的 `packages/dsh-subagent-registry/` 插件及本 change 的正式产物。按实际宿主能力选择新版 activation 或旧版 start/startContinuable；兼容后代等待与清理的 API 差异，保留取消、失败诊断、资源释放和权限限制。调整宿主依赖范围、测试入口、文档及随包编译产物，在两套实际发布的 SDK 服务组合上验证；不能只用伪造的函数存在性测试代替旧宿主验证。

## 目录结构

### 新建

- packages/dsh-subagent-registry/src/host-compat.ts — 集中承接两版宿主的派发、后代等待与清理差异（如现有文件内更少改动即可解决，可不新建）。
- packages/dsh-subagent-registry/test/ — 旧宿主集成入口与双线兼容检查。
- packages/dsh-subagent-registry/scripts/ — 按需增加可重复运行的隔离 SDK 检查入口。

### 修改

- packages/dsh-subagent-registry/src/ — 接入兼容路径，保持前台/后台、续跑/追问、权限和现有英文指导语义。
- packages/dsh-subagent-registry/test/ — 复用并补充既有单元和宿主集成检查。
- packages/dsh-subagent-registry/package.json、pnpm-lock.yaml — 恢复旧版宿主声明并保留新版 prerelease 支持，更新检查入口与本地版本。
- packages/dsh-subagent-registry/lib/ — 同步编译产物。
- packages/dsh-subagent-registry/README.md、README.en.md、docs/AGENT-FORMAT.md、skills/dsh-subagent-registry-config/SKILL.md、scripts/link-dsh-closure.mjs — 如实说明双支持线及宿主能力差异。

### 删除

无。

### 明确不建

- 不创建另一套代理管理器、并发队列或持久化格式；继续复用宿主服务。
- 不增加由用户选择宿主版本的配置开关；自动检测公开 API。

# Non-goals

不修改 DSH 宿主、vendor 源码、用户 agent 文件或模型配置；不新增委派策略、不改写现有英文提示词，也不重新加入“简单任务直接处理”。不承诺两个指定版本以外的全部宿主版本。不执行 npm 发布、Git push、PR 或客户端安装切换；交付为可验收的本地插件实现和测试产物。

# Constraints and invariants

- 新宿主优先使用 startActivation；旧宿主使用 start/startContinuable。已接纳任务失败后不得尝试另一接口导致重复派发。
- 已选中的历史 run 读取、恢复或占用失败必须报错，不得悄悄创建新任务；fresh 仍可明确创建新 run。
- 保持宿主管理并发与深度的现有行为。当前前台 cold resume 不受 manager capacity/interrupt 管理的限制须如实保留和说明，不扩大承诺。
- 两条支持线不要求互相读取对方产生的持久化会话；分别验证各自会话的续跑和追问，不做 session 格式迁移或降级。
- 调查证据为仓库源码、历史提交和宿主公开 SDK；它们用于实现参考，不是新增产品需求来源。

# Acceptance examples

- A1：在真实 `0.2.0-rc.2` SDK 服务组合中，插件可以导入并挂载；前台 use_agent 返回正确输出；取消能够结束执行并释放资源；异常停止和诊断不得显示为成功。
- A2：在真实 `0.2.0-rc.2` SDK 服务组合中，后台派发返回正确 durable child id，主调用不等待任务完成；ask_agent 可按名称或 id 追问，并等待该条消息实际消费的回复，包括已结算子代理的 cold resume；前台 run 不被误选为后台目标。
- A3：在真实 `0.2.1-alpha.2` SDK 服务组合中，现有前台、后台、追问、取消及失败诊断行为不回退；继续使用 activation 且不在失败后重复派发。
- A4：两个支持线都可续跑中断的前台会话，保留 persona、模型/思考设置和叶子工具限制；恢复失败或并发占用不会自动创建重复任务；取消、后代等待/清理和父级销毁时的资源释放正确。
- A5：两个支持线的英文委派指导保持现有文案；当前作用域的工具限制、遮蔽、改名及 PTC 下的可见性正确，卸载恢复宿主指导，不改变原生工具 schema，不包含“简单任务直接处理”的新增策略。
- A6：同一发布包的宿主依赖声明接受 `0.2.0-rc.2` 和 `0.2.1-alpha.2`，保持 optional peers；编译产物与源码一致，双线检查实际报告并核实各自 SDK 版本，现有相关回归检查通过。

# Verification expectations

开发期执行定向检查；最终计划由 Runtime 冻结候选后执行，包含类型检查、构建、既有回归以及两套真实 SDK 宿主集成。使用脚本化模型避免外部 API/费用，宿主服务、持久化、spawn 与 manager 均使用真实实现。新的只读 Verifier 独立核对全部验收项，区分实际证据与未验证限制。
