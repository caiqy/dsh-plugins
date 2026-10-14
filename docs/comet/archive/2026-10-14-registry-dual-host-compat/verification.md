---
generated_from_state_version: 18
---

# 验证

## 当前结果

- 结果: **已归档**
- 验证情况: **已完成检查，验证结果已确认**
- 目标周期: 4
- 迭代: 2
- 验证器尝试次数: 1
- 完成时间: 2026-10-14T06:58:44.217Z
- 摘要: 全新独立只读 Verifier 已登记启动，并在读取 Builder 交接前独立审查完整 brief/Spec、全部 A1-A6、核心实现/调用点及测试断言，随后核对当前 candidate b636547e-bf83-4ab5-8c93-8929e5b6ad7b、state15/iteration2/attempt1 的七项正式 Runtime 成功记录、双 published SDK 版本、compiler/peer/archive 绑定及当前归档字节一致性，最后对照交接。A1-A6 各恰好一项 passed，没有 failed/blocked，也没有缺失或失效证据需要 request-checks；复用本候选证据，未重跑完整计划或旧 Temp probe。实现保持只读，正式状态/报告仅由公开 CLI 维护；本提交不 accept-result、不归档。

## 验收

| 编号 | 结果 | 来源 | 验收项 | 原因 |
| --- | --- | --- | --- | --- |
| A1 | passed | brief.md | A1：在真实 `0.2.0-rc.2` SDK 服务组合中，插件可以导入并挂载；前台 use_agent 返回正确输出；取消能够结束执行并释放资源；异常停止和诊断不得显示为成功。 | 独立读取 brief、Spec 和 rc.2 前台调用链后，核对 Runtime hosts 正式日志及 host-activation.test.mjs 的真实 0.2.0-rc.2 SDK 组合：同一 compiled 插件可导入/挂载，legacy 前台通过真实 spawn 返回输出；取消释放执行，token-limit/error 仍带异常停止诊断而非成功。源码 capability 分支与 settleForegroundRun 的终止处理吻合；相关 unit 正式记录通过。 |
| A2 | passed | brief.md | A2：在真实 `0.2.0-rc.2` SDK 服务组合中，后台派发返回正确 durable child id，主调用不等待任务完成；ask_agent 可按名称或 id 追问，并等待该条消息实际消费的回复，包括已结算子代理的 cold resume；前台 run 不被误选为后台目标。 | rc.2 真实 SDK fixture 断言后台立即返回 startContinuable 的 durable childId，主调用不等待完成；按 id 和名称追问均覆盖结算后 cold resume，较新的 one-shot 前台不遮蔽后台目标。独立核对 interactive.ts 的 accepted messageId 与 turn 消费/结算关联，以及 interactive units 对竞争消息、错误/超时的断言，均有本候选 Runtime hosts/unit 通过记录。 |
| A3 | passed | brief.md | A3：在真实 `0.2.1-alpha.2` SDK 服务组合中，现有前台、后台、追问、取消及失败诊断行为不回退；继续使用 activation 且不在失败后重复派发。 | 0.2.1-alpha.2 真实 SDK fixture 与正式 hosts 日志覆盖前台、后台、追问、取消和失败诊断。独立核对 tool-run-agent.ts：startActivation 存在时继续 activation 路径，其拒绝直接传播，不捕获后回退到 start，避免重复派发；agent-options 等正式 unit 断言 activation 失败时无 legacy start。后代等待继续使用新版原生 waitForChildren/drainDescendants。 |
| A4 | passed | brief.md | A4：两个支持线都可续跑中断的前台会话，保留 persona、模型/思考设置和叶子工具限制；恢复失败或并发占用不会自动创建重复任务；取消、后代等待/清理和父级销毁时的资源释放正确。 | 独立审查 resume.ts、host-compat.ts 及所有调用点，核对 host-lifecycle.test.mjs 在两个真实 published SDK 服务/manager/spawn/persistence 组合的正式成功记录：fresh tree 等待后才返回最终 suffix；中断后的前台恢复保持同 childId/persona/model/high thinking；busy 时不增加 child；exact forest 取消保留 unrelated parent；parent disposal 后相关 agents/sessions 释放。host-activation 与 resume/host-compat units 补足叶子工具限制、恢复失败不 new、错误诊断与清理路径。每 freshScenario 只创建一次 grand，旧临时 fixture 无限循环及 EEXIST 历史未作为通过证据。 |
| A5 | passed | brief.md | A5：两个支持线的英文委派指导保持现有文案；当前作用域的工具限制、遮蔽、改名及 PTC 下的可见性正确，卸载恢复宿主指导，不改变原生工具 schema，不包含“简单任务直接处理”的新增策略。 | 独立对照 delegation-guidance.ts 的英文正文与既有文案，变更仅扩展官方句型识别，未增加简单任务直接处理策略。两个真实 SDK 的 host-activation fixture 断言当前作用域 deny/shadow/rename、普通/PTC presentation 可见性、卸载恢复宿主指导，以及原生工具 schema/context/variables 保持；相应正式 hosts 和 guidance units 通过。PTC 验证限于 presentation，未声称程序执行覆盖。 |
| A6 | passed | brief.md | A6：同一发布包的宿主依赖声明接受 `0.2.0-rc.2` 和 `0.2.1-alpha.2`，保持 optional peers；编译产物与源码一致，双线检查实际报告并核实各自 SDK 版本，现有相关回归检查通过。 | 独立核对 package.json optional peers 与 package-compat.test.mjs：声明范围接受两条指定 prerelease 支持线。matrix 默认运行 host-activation 与 host-lifecycle，registerHooks/独立进程将同一 compiled 插件锚定到对应 published SDK 闭包；核对各服务实际版本及 npm 锁定来源为 0.2.0-rc.2/0.2.1-alpha.2。当前冻结候选 types/build/unit/hosts/pack/archive/diff 七项均 passed/exit0；正式 archive 校验 lib，另以只读检查确认归档全部 53 文件与当前候选字节一致。归档 SHA1 a97536254120614757420b0feb5ff0d1d9003abd 和 SHA512 integrity sha512-GUvxaMb9jlrC7uCtRlVmZ6yxURlTFw/KowbZ4S5sxOj75UMakY05sW0VLM8srGEY8jD51yrsI+r0IRUXECSUVA== 与 Runtime pack 完全一致。 |

## 检查

| 检查 | 命令 | 工作目录 | 状态 | 退出码 | 耗时 |
| --- | --- | --- | --- | ---: | ---: |
| Final TypeScript check | check | packages/dsh-subagent-registry | passed | 0 | 3190 ms |
| Final compiled artifacts | build | packages/dsh-subagent-registry | passed | 0 | 2881 ms |
| All unit and lifecycle regression checks | test | packages/dsh-subagent-registry | passed | 0 | 4536 ms |
| Two actual published host SDKs | test:hosts | packages/dsh-subagent-registry | passed | 0 | 7751 ms |
| Pack final local candidate | pack --ignore-scripts --pack-destination ../../.tmp --json | packages/dsh-subagent-registry | passed | 0 | 2864 ms |
| Packed optional peers and exact build contents | test/package-compat.test.mjs | packages/dsh-subagent-registry | passed | 0 | 563 ms |
| Whitespace validity | diff --check | packages/dsh-subagent-registry | passed | 0 | 128 ms |

### Builder 报告的证据

以下为 Builder 报告，不等同于 Runtime 检查凭据或独立验收结果。

- Both published SDK lifecycle regression: passed — pwsh-296: node test/host-matrix.test.mjs host-lifecycle, actual services and scripted model; no product code edits
- Whitespace: passed — git diff --check
- 已知限制: 模型响应与后代创建由fixture脚本化；使用实际发布SDK服务/持久化/manager/spawn，未调用外部模型，PTC只验证presentation不执行程序。
- 已知限制: 前台cold resume使用agents.resume，不占manager capacity且不受interrupt_agent管理；不迁移跨宿主session。
- 已知限制: 当前客户端仍安装0.13.1-local.4；本次不切换安装、不publish/push。

## 阻塞项

_无。_

## 风险与跳过的工作

- 模型响应和后代发起由 fixture 脚本化；实际使用发布 SDK 的服务、persistence、spawn 与 manager，未调用外部 LLM。本结论不包含外部模型端到端网络行为。
- PTC 仅验证 presentation 与工具可见性，未执行 PTC 程序。
- 前台 cold resume 直接使用 agents.resume，不占 manager capacity，且不受 interrupt_agent 管理；不包含跨版本 session 迁移。这是已声明边界，不能扩展为对应功能保证。
- 验收对象为本地 0.13.1-local.5 候选和归档；当前客户端仍为 local.4。本轮没有安装、publish 或 push，验收通过不代表当前客户端已切换。

## 之前的迭代

| 目标周期 | 迭代 | 尝试 | 结果 | 未解决项 | 摘要 | 完成时间 |
| ---: | ---: | ---: | --- | --- | --- | --- |
| 1 | 0 | 0 | recovery | — | Capability association revoked through comet native spec disassociate | 2026-10-14T03:35:15.239Z |
| 2 | 0 | 0 | recovery | — | Native formal documents are invalid (spec-document-missing: specs/web-search-provider/spec.md) | 2026-10-14T03:45:08.335Z |
| 3 | 0 | 0 | recovery | — | Capability association and untouched proposal web-search-provider revoked through comet native spec disassociate | 2026-10-14T05:03:54.233Z |
| 4 | 1 | 1 | execution-error | — | 用户明确要求停止并重新派发；平台确认 b61ea87d-1070-4951-9e5a-ff6c9ba03144 已停止且没有结论。保留当前候选与七项通过的 Runtime 检查，重新启动全新的独立只读 Verifier。 | 2026-10-14T06:16:31.483Z |
| 4 | 1 | 2 | execution-error | — | Native Verifier-requested check execution failed: EEXIST: file already exists, open 'D:\Caiqy\Projects\Github\dsh-plugins\.comet\runtime\native\changes\registry-dual-host-compat\logs\checks\7e2694d7-a098-4090-9125-fa6b94d9a9bd-verifier-real-lifecycle.log' | 2026-10-14T06:31:47.480Z |
| 4 | 1 | 2 | recovery | — | 真实生命周期补查未完成，回 Build 定位探针等待并补齐证据，保持已确认A1-A6不变 | 2026-10-14T06:44:23.276Z |
| 4 | 2 | 1 | pass | — | 全新独立只读 Verifier 已登记启动，并在读取 Builder 交接前独立审查完整 brief/Spec、全部 A1-A6、核心实现/调用点及测试断言，随后核对当前 candidate b636547e-bf83-4ab5-8c93-8929e5b6ad7b、state15/iteration2/attempt1 的七项正式 Runtime 成功记录、双 published SDK 版本、compiler/peer/archive 绑定及当前归档字节一致性，最后对照交接。A1-A6 各恰好一项 passed，没有 failed/blocked，也没有缺失或失效证据需要 request-checks；复用本候选证据，未重跑完整计划或旧 Temp probe。实现保持只读，正式状态/报告仅由公开 CLI 维护；本提交不 accept-result、不归档。 | 2026-10-14T06:58:44.217Z |



## 结论

全新独立只读 Verifier 已登记启动，并在读取 Builder 交接前独立审查完整 brief/Spec、全部 A1-A6、核心实现/调用点及测试断言，随后核对当前 candidate b636547e-bf83-4ab5-8c93-8929e5b6ad7b、state15/iteration2/attempt1 的七项正式 Runtime 成功记录、双 published SDK 版本、compiler/peer/archive 绑定及当前归档字节一致性，最后对照交接。A1-A6 各恰好一项 passed，没有 failed/blocked，也没有缺失或失效证据需要 request-checks；复用本候选证据，未重跑完整计划或旧 Temp probe。实现保持只读，正式状态/报告仅由公开 CLI 维护；本提交不 accept-result、不归档。
