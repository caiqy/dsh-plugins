---
generated_from_state_version: 22
---

# 验证

## 当前结果

- 结果: **已归档**
- 验证情况: **已完成检查，验证结果已确认**
- 目标周期: 3
- 迭代: 1
- 验证器尝试次数: 2
- 完成时间: 2026-10-19T06:47:01.191Z
- 摘要: 通过（pass）：本轮只读独立核验A10 passed。已补齐当前桌面客户端实际加载已发布0.14.0且渲染子智能体入口的实机证据，并核对候选绑定检查、双宿主闭包、npm生命周期安装、包内客户端/声明及生效边界。未修改实现、未Git提交、未覆盖安装、未archive。

## 验收

| 编号 | 结果 | 来源 | 验收项 | 原因 |
| --- | --- | --- | --- | --- |
| A1 | passed | brief.md | A1：打开管理页自动读取实际配置目录，显示正常角色、错误文件和诊断；区分加载中、空目录和读取失败，不补默认预设，保留已有排序。 | 独立核对 src/preset-store.ts:160-217 与 src/client/presets-state.ts、PresetsPage.tsx：打开页经实际配置目录读取，列出有效条目和带诊断的错误文件，沿用 listAgents 排序，不在 list 路径补种默认角色；加载、空列表、目录错误有独立状态。test/preset-store.test.mjs、test/client-presets.test.mjs:18-19,104-111 的对应断言包含在当前 candidate 的 passed Runtime unit-tests 中。 |
| A2 | passed | brief.md | A2：两版宿主通过 sidebar.panellist 注册独立“子智能体”左侧导航入口，并在 main 工作区打开完整管理页；创建、复制、编辑、修复是独立视图而非列表行内表单；高级字段折叠，主题 token、键盘可达性、字段标签与窄屏布局由真实 SDK 闭包中的编译工厂及组件/DOM/CSS 测试覆盖（不要求双版本真实 GUI 截图）。 | 按 brief.md:110 当前标准验收。src/client/index.ts:63-68 独立注册 main 与 sidebar.panellist，标签“子智能体”；PresetsPage.tsx 使用列表/创建/复制/编辑/修复独立模式、原生高级 details、标签、键盘可达原生控件与窄屏 CSS。test/client-presets.test.mjs:115-141,198-227 独立核对编译组件、DOM样式插入、折叠和所有字段 label；test/host-client.test.mjs:11-32 在真实两个 SDK 的 ModuleLoader 物化同一交付工厂。复用当前 passed host-matrix 与 unit-tests，不声称做了两版真实GUI截图或真实浏览器React渲染。 |
| A3 | passed | brief.md | A3：空白创建及复制覆盖全部支持字段与正文、继承语义及模型目录/自定义路由；新名称安全且唯一，旧内部名称只读、不能通过修复改成另一个标识；错误字段就地提示，不覆盖源或重名文件。 | 独立追踪 PresetsController.start/field/saveRequest 与 preset-store.saveInput/validateId/patchSource：空白创建、复制保留全部支持字段与正文，缺省字段不强制写覆盖值，模型目录失败仍保留自定义路由；既有内部名只读且服务端按文件身份校验。test/client-presets.test.mjs:20-28,39-46,64-85,218-227,268-274 与 preset-store 测试覆盖复制不改源、安全唯一标识、继承及字段定位错误；当前 unit-tests passed。 |
| A4 | passed | brief.md | A4：错误角色仍列出原因；修复页显示完整原文，按运行时规则验证并纠正目标文件身份；错误保存不生效，原文和草稿保留。 | src/preset-store.ts:114-121 将解析错误附到条目而非过滤；保存原文仍调用运行时 parseAgentMarkdown 并验证目标身份，修复不能改成另一标识。客户端错误条目进入 repair 并保留完整 source；test/client-presets.test.mjs:80-97 与 preset-store 修复/无效源/身份测试核对原文草稿、错误保存不落盘及确认后的修复。复用当前 passed unit-tests。 |
| A5 | passed | brief.md | A5：保存失败、版本冲突和取消放弃/刷新确认保留草稿；管理页内会丢弃输入的动作先确认。切到宿主其他页不弹确认，回到管理页继续当前客户端草稿。重启客户端或卸载插件不保证草稿恢复。 | src/client/index.ts:55-65 令 controller 生命周期归插件实例；页面切换卸载不销毁草稿，插件 dispose 才清理。PresetsController 对刷新、放弃、切换编辑目标先确认，失败/conflict/取消确认不清草稿。test/client-presets.test.mjs:29-46,47-63,89-91,104-111 明确断言取消刷新、失去React订阅再open、保存冲突和取消修复确认后草稿仍在；当前 unit-tests passed。 |
| A6 | passed | brief.md | A6：删除有具体目标及共享影响确认且只删除该文件；CRUD经宿主身份/Origin保护并验证输入和配置目录边界；无认证或非法路径/链接请求不修改文件，读写/删除错误明确可见。 | src/presets-rpc.ts:7-43 通过公开 Connection 精确路由继承宿主身份及Host/Origin栅栏，并验证JSON/envelope/操作参数；preset-store 校验id、配置目录内目标、lstat/O_NOFOLLOW及文件身份，删除确认包含具体文件和共享目录影响。test/host-presets.test.mjs:116-120 在两套真实HTTP Connection中验证401/403且原文件字节不变，preset-store 覆盖路径穿越/链接/输入和I/O错误；当前 host-matrix 与 unit-tests passed。 |
| A7 | passed | brief.md | A7：结构化更新保留额外字段、注释及未编辑正文；不能安全更新时引导原文编辑；保存和删除检测外部变化，创建不覆盖，失败不留下半写文件且草稿保留。 | 独立核对 preset-store.document/patchSource 与 save/remove：局部更新保留未知字段、注释及未编辑正文；不安全结构强制原文模式；读入版本及提交前再次核对版本，创建以link原子独占发布、编辑先写临时文件再rename并清理，删除校验版本。对应CRLF/注释/正文/冲突/并发创建/失败清理测试和客户端草稿失败断言在当前 passed unit-tests。此结论不宣称最终版本检查与rename/unlink之间实现了跨进程CAS，剩余竞态列入risks。 |
| A8 | passed | brief.md | A8：新建、保存、删除、打开页面和手动刷新同步列表及模型名册，后续模型请求无重启生效；正在执行的工具调用和后代任务不被中断；权限、scope及PTC可见性保持。 | src/presets-rpc.ts:27-34 在list/save/remove后刷新名册，src/index.ts:183-224 串行刷新并仅替换变化的use_agent定义，执行时仍按磁盘读取；不会重建ask_agent或取消既有任务。test/host-presets.test.mjs:131-161 验证后续native/PTC schema更新、ask注册稳定、存活前台/后台/后代不中断；两版 host-activation/host-lifecycle 覆盖权限、scope和叶子限制。复用当前 passed host-matrix，PTC断言限可见性并非真实PTC代码执行。 |
| A9 | passed | brief.md | A9：显示名增加、清除或修改前确认历史按名续跑/追问影响；不改历史记录，现有前台/后台/续跑/追问、叶子工具限制及英文指导回归通过。 | preset-store 保存对显示名增加/修改/清除要求 confirmDisplayName，客户端先展示历史按名续跑/追问影响确认，未确认不发保存，且无历史记录重写路径。test/client-presets.test.mjs:47-61,86-96 覆盖表单/原文确认；现有 display-name、resume、skill 与双宿主 activation/lifecycle 测试覆盖前台/后台/续跑/追问、英文指导、叶子工具边界及取消树隔离。当前 unit-tests 与 host-matrix passed。 |
| A10 | passed | brief.md | A10：同一编译包在真实0.2.0-rc.2及0.2.1-alpha.2闭包验证新增功能及既有生命周期回归，包内客户端和声明齐全、npm 安装生命周期开启可加载；当前桌面客户端实际加载已发布 0.14.0（同一子智能体功能已上线）并记录构建、发布、重启生效边界，本地候选覆盖安装不作为归档前提，经过Comet独立全项验收。 | 独立核验通过。候选独立仓库 packages/dsh-subagent-registry HEAD=669e166，工作区 clean，包版本0.13.2；本轮 candidateId 与 Runtime state.json 的绑定一致，check/unit-tests/host-matrix/pack/whitespace 均为 runtime passed、exitCode=0，复用有效回执。已读 host-matrix 日志及测试，确认同一 lib/client.js 编译工厂在真实0.2.0-rc.2、0.2.1-alpha.2隔离发布SDK的ModuleLoader加载，activation/lifecycle/presets/client四组通过；已读 packaged-install.test.mjs:43-64及unit-tests日志:198，确认npm install未禁用生命周期且无消费者SDK副本；亲自列出候选tgz，确认lib/client.js、lib/types/client/index.d.ts、lib/index.d.ts及postinstall目标随包交付。实机证据：两张提供截图SHA-256与任务给定值完全一致且入口可见；另于2026-10-19T14:44:53+08:00独立PrintWindow(handle=8655450，owner PID15356)成功，1936x1048截图TEMP/verifier-a10-window-de72d009-0c10-4c78-8dd5-56bf0cd59818.png的SHA-256为9875A4C59BC9B484BB9DC29868554AB4E49276A73F13A7F363887AF4766ACF05，亲自查看仍见子智能体入口。Win32_Process确认PID5688为PID15356的desktop host子进程，命令行明确使用C:/Users/caiqy/.dsh/profiles/desktop，StartTime=2026-10-19 12:40:45，晚于安装日志文件时间2026-10-18 10:24:10；该日志:12-13记录0.13.2升级0.14.0。profile/package.json:5,47及已安装package.json:3,177-180确认启用0.14.0及客户端导出；pnpm-lock.yaml:68-69的integrity与npm registry 0.14.0发布元数据完全一致。已读已安装lib/client.js:794-855，入口由该包sidebar.panellist注册；已安装与候选的整个lib/client.js统一CRLF后完全相同（长度均74016），四个客户端源码及preset-contract.ts同样相同，证实同一子智能体功能。上述运行进程、实际渲染、profile及发布来源构成当前桌面实际加载已发布0.14.0的证据闭环。构建和安装后重启边界见README.md:57、build-client.mjs:29-49及brief.md:105、spec.md:109；按现行A10不覆盖安装候选。A1-A9沿用Runtime已有passed结论，本轮仅提交A10。 |

## 检查

| 检查 | 命令 | 工作目录 | 状态 | 退出码 | 耗时 |
| --- | --- | --- | --- | ---: | ---: |
| TypeScript check and client artifact | run check | packages/dsh-subagent-registry | passed | 0 | 4763 ms |
| Unit, client and packaged-install suite | test | packages/dsh-subagent-registry | passed | 0 | 10811 ms |
| Dual published-SDK closures (activation, lifecycle, presets, client module loader) | test/host-matrix.test.mjs host-activation host-lifecycle host-presets host-client | packages/dsh-subagent-registry | passed | 0 | 6744 ms |
| Pack local candidate tarball | pack --pack-destination ../../.tmp --json | packages/dsh-subagent-registry | passed | 0 | 1168 ms |
| Whitespace validity | diff --check | . | passed | 0 | 252 ms |

### Builder 报告的证据

以下为 Builder 报告，不等同于 Runtime 检查凭据或独立验收结果。

- pnpm run check: passed — Client types and factory build passed; 74016 bytes (no files written)
- pnpm test: passed — preset-store, client-presets and packaged-install suites passed
- node test/host-matrix.test.mjs host-activation host-lifecycle host-presets host-client: passed — host-matrix: PASS on 0.2.0-rc.2 and 0.2.1-alpha.2 closures; host-presets and host-client included explicitly
- pnpm pack --pack-destination ../../.tmp --json: passed — tarball aiwayds-dsh-subagent-registry-0.13.2.tgz regenerated from the current lib
- node test/package-compat.test.mjs: failed — pre-existing defect in the test itself: readdirSync(lib/) walks entries as files, but lib/client and lib/types are directories (EISDIR); not caused by this change; excluded from the Runtime plan
- 已知限制: Running desktop client loads published @aiwayds/dsh-subagent-registry 0.14.0; the local 0.13.2 candidate tarball was not installed over it, so the npm install/restart effect path is documented but not performed against the live client.
- 已知限制: No real browser GUI clicking/screenshots were performed; client behavior is covered by the compiled-factory ModuleLoader test and DOM-level client-presets tests.
- 已知限制: Host-matrix model responses are scripted fixtures; no external model or real PTC execution was used.
- 已知限制: test/package-compat.test.mjs has a pre-existing directory-walk defect (EISDIR on lib/client and lib/types) and is excluded from the formal plan; packaged-install inside pnpm test covers tarball installation and shipped scripts.
- 已知限制: preset-store.ts:162,259-261,284-285 cross-process create/update races were not exercised; atomic link publish and version rechecks are covered only by unit tests.

## 阻塞项

_无。_

## 风险与跳过的工作

- 实机观察覆盖已发布0.14.0的入口渲染；未在当前桌面执行候选覆盖安装或CRUD交互，符合当前A10约定。两个SDK闭包的ModuleLoader和组件测试不等同双版本真实GUI实测。
- 复用的host-matrix使用脚本化模型及后代fixture，未执行外部模型或真实PTC代码；PTC证据限工具schema/可见性。
- 既有test/package-compat.test.mjs的EISDIR缺陷未修复、未列入正式计划；本轮复用已通过的packaged-install并亲自核对tarball客户端、声明和postinstall目标，未将该失败脚本记为通过。

## 之前的迭代

| 目标周期 | 迭代 | 尝试 | 结果 | 未解决项 | 摘要 | 完成时间 |
| ---: | ---: | ---: | --- | --- | --- | --- |
| 1 | 1 | 0 | recovery | — | Native confirmed acceptance criteria changed | 2026-10-19T06:04:33.056Z |
| 2 | 1 | 0 | recovery | — | Builder handoff Runtime checks failed: pack, package-compat | 2026-10-19T06:08:49.089Z |
| 2 | 2 | 1 | blocked | A2, A10 | 独立只读裁定：blocked，8 passed、2 blocked、0 failed。亲自读取全部指定实现和测试、brief/spec、当前5项及历史6份Runtime日志；未改仓库、未运行测试/构建/pack。插件独立仓库HEAD669e166且工作区clean；当前候选与state.json绑定的4be3fddc检查一致，check/unit-tests/host-matrix/pack/whitespace均runtime passed exitCode0。A1：preset-store.ts:203-218、presets-state.ts:80-101、preset-store.test.mjs:23-24,119-136,253-261支持实际目录、诊断/空/失败/顺序及不植入。A3：presets-state.ts:37-50,104-119、PresetsPage.tsx:425-477、preset-store.test.mjs:25-107及client-presets.test.mjs:19-77支持字段/继承/复制/自定义模型/固定身份/错误。A4：preset-store.test.mjs:117-145与client-presets.test.mjs:79-97支持完整原文、同解析器/身份、非法保存不写及草稿保留。A5：presets-state.ts:63-175、client/index.ts:55-62、client-presets.test.mjs:30-60支持插件生命周期草稿、失败/冲突/取消确认保留。A6：presets-rpc.ts:14-41、host-presets.test.mjs:116-120、preset-store.test.mjs:60-107,173-193,234-258支持真实401/403、输入/路径/链接和错误边界；删除具体目标/共享影响为PresetsPage.tsx:488-489。A7：preset-store.ts:194-285、preset-store.test.mjs:42-58,138-170,195-247与客户端失败测试支持局部保真、原文回退、版本冲突、独占创建/失败清理。A8：index.ts:183-226、presets-rpc.ts:27-34、host-presets.test.mjs:122-159及双宿主host-matrix日志:10,22支持真实cache失效、下一native/PTC schema、稳定ask和活跃子孙不受中断。A9：presets-state.ts:143-175、preset-store.ts:233-238、PresetsPage.tsx:488-489、client-presets.test.mjs:48-61,82-96支持显示名确认；unit-tests.log:14-111及host-matrix.log:2-8,14-20支持前后台/续跑/追问/叶子限制/英文指导。A2与A10缺失的实机证据不能由现有通过日志替代。 | 2026-10-19T06:21:30.143Z |
| 2 | 2 | 1 | recovery | — | Revise A2 and A10 to evidence available in this environment per user decision; then re-verify and archive | 2026-10-19T06:26:02.924Z |
| 3 | 1 | 1 | blocked | A10 | 需整改（blocked）：按当前brief独立完成A1–A10核对，A1–A9 passed；A10仅当前桌面已发布0.14.0的实际客户端加载证据无法验证，双宿主回归、npm安装、客户端/声明及53文件交付比对均有通过证据。没有实现改动、Git提交、候选覆盖安装或archive；未将Builder声明或安装状态冒充实机加载。 | 2026-10-19T06:40:43.726Z |
| 3 | 1 | 1 | recovery | — | A10 evidence supplied: running desktop host (pid 5688, started 2026-10-19 12:40 after the 2026-10-18 install of published 0.14.0) shows the 0.14.0 client sidebar entry 子智能体 in a live window capture; see .tmp/a10-load-evidence.md, .tmp/dsh-window.png, .tmp/dsh-sidebar.png | 2026-10-19T06:42:44.282Z |
| 3 | 1 | 2 | pass | — | 通过（pass）：本轮只读独立核验A10 passed。已补齐当前桌面客户端实际加载已发布0.14.0且渲染子智能体入口的实机证据，并核对候选绑定检查、双宿主闭包、npm生命周期安装、包内客户端/声明及生效边界。未修改实现、未Git提交、未覆盖安装、未archive。 | 2026-10-19T06:47:01.191Z |



## 结论

通过（pass）：本轮只读独立核验A10 passed。已补齐当前桌面客户端实际加载已发布0.14.0且渲染子智能体入口的实机证据，并核对候选绑定检查、双宿主闭包、npm生命周期安装、包内客户端/声明及生效边界。未修改实现、未Git提交、未覆盖安装、未archive。
