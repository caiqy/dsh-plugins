# BrowserSkill DSH 工具完整目标规格

本规格描述官方插件 0.3.3 上的 DSH 接口增强。包名与插件 ID 均保持 `@wxg-prc-cpg/browser-skill-dsh-plugin`，本地版本为 `0.3.3-dsh.1`。复用官方 CLI、daemon 和 Chrome/Edge 官方扩展。以下接口是六个现有工具的扩展；未列出的既有 action 继续遵循官方行为。

## 运行与信任边界

六工具为 `bsk_session`、`bsk_page`、`bsk_inspect`、`bsk_interact`、`bsk_tabs`、`bsk_assist`。公开 schema、私有 action、工具分类、参数校验与 renderer 必须一致。页面操作支持 `session`/`tabId`，复用当前自有会话解析、每会话 FIFO、观察服务、执行超时、取消 signal 和资源清理；不得通过自行启动 CLI 绕过共享实例。会话 start 复用 tracked start，stop 保留恢复及清理协议。浏览器列表与固定等待属于 daemon 级操作，不要求创建浏览器会话。

JS、主动悬停和整页截图可能触发页面变化，操作元数据不得把这些调用声明为可安全并发；已有纯读取操作保留正常行为。HTTP 观察路由信任边界、附件授权、工具注册和客户端 loader 不变。不编辑已安装的 node_modules，不以修改 DSH 宿主解决插件接口缺口。

### Scenario: 公开调用与共享执行

Acceptance: A1

GIVEN 使用现有六工具及其新增 action，WHEN 调用有效/无效参数、未知或外部会话、同会话并发操作，以及取消和超时，THEN 参数正确传递、无效输入/会话被拒绝、执行保持 FIFO、观察与取消清理经过原链路，既有 action 不回归，副作用操作的并发标记正确。

## JS

`bsk_interact` 增加 `action: evaluate`，参数为非空 `expression`、可选 `awaitPromise`/`returnByValue`（均默认 true）、`timeoutMs`、`session`、`tabId`。显式 false 不得被真值过滤丢弃。执行返回官方结构化值；CLI exit 0 且 JSON `ok:false` 时工具必须报错并保留页面异常信息，不能向观察面板、卡片或模型报告成功。超时与中断复用原执行器，并为官方 IPC 收尾保留必要余量。

### Scenario: 执行正常值、Promise 和异常

Acceptance: A2

WHEN 分别执行正常值、Promise、抛异常、空表达式、显式 false、超时和取消，THEN 正常值/Promise 按参数返回，非法输入被拒绝，页面异常即使进程 exit 0 仍呈现失败和详情，超时/取消有真实结果。

## 上传

`bsk_interact` 增加 `action: upload`，参数为 `target`、非空本地 `files: string[]`、`mode: input|drop`（默认 input）、`timeoutMs`、`session`、`tabId`。每个文件传给官方重复 `--file`，复用其本地文件验证、分块传输、暂存归属转移与清理。路径属于 CLI 所在电脑，不支持远程浏览器文件传输。

### Scenario: 单文件、多文件与 drop

Acceptance: A3

WHEN 使用有效单/多文件及 input/drop，或空列表、无效模式、文件读取失败和取消，THEN 正确内容与参数传给官方上传链路，失败/取消真实返回且不遗留插件额外拥有的暂存资源。

## 下载

`bsk_interact` 增加 `action: download`，参数为 `target`、明确 `output`、可选 `overwrite`（默认 false）、`timeoutMs`、`session`、`tabId`。沿用官方临时文件、原子提交与传输释放；仅显式 `overwrite:true` 允许覆盖，不另造传输机制。

### Scenario: 下载及覆盖保护

Acceptance: A4

WHEN 下载至新路径、现存路径、显式覆盖，或发生失败/中断，THEN 内容正确，新路径正常保存，默认现存内容不变，显式覆盖遵循官方保证，失败/取消不报告成功。

## 截图

`bsk_inspect` 的 `action: screenshot` 增加 `fullPage`、`scope: current|follow`、`timeoutMs`、`output`，保留 `ref` 与现有截图默认。未给新增参数时保持原行为；新增组合的默认值和裁剪约束遵循官方 0.3.3，非法 fullPage/ref 等组合在执行前拒绝。

显式 output 仅允许新文件；以独占创建落实不覆盖保证，不能只先检查存在性。截图仍通过原附件保存/预览路径展示，必要时返回 PNG 路径。工具拥有的临时图可清理，用户指定输出在返回和会话结束后均保留；写入失败不能报成功或误删原文件。

### Scenario: 整页、附件与输出生命周期

Acceptance: A5

WHEN 获取普通/整页截图、current/follow、非法裁剪组合、显式新/旧输出路径，THEN 范围与校验符合官方语义，附件预览有效，新输出保留，旧文件不覆盖，临时文件按所有权清理。

## 浏览器列表

`bsk_session` 增加 `action: browsers`，直接返回官方 `browsers --json` 的已连接实例信息，包括官方实际提供的 ID、名称、扩展版本、标签、会话数和可用状态，不编造缺失字段。查询不创建会话，不改变当前浏览器。原 `action:list` 仍只列插件自有会话。

明确选择 Chrome/Edge 继续由现有 `start.browser` 完成。用户指定 profile 时必须先验证实例 ID 或唯一标签映射；目标未知/离线时报错，不能自动替换为另一浏览器。

### Scenario: 查询列表与复用选择

Acceptance: A6

WHEN 查询正常、空列表或不可用状态，THEN 返回真实信息/错误，不创建会话；再使用经核实实例调用现有 start 可选择对应 Chrome/Edge，目标不可用时停止而不换目标，自有会话 list 语义不变。

## 设备模拟

`bsk_assist` 的 `action: emulate` 增加 `dpr`、`ua`、`acceptLanguage`、`touch`、`maxTouchPoints`；保留 `device`、`width`、`height`、`mobile`、`off`、`session`、`tabId`。参数类型、数值范围和组合遵循官方 CLI。`mobile:false` 与 `touch:false` 应分别传递官方显式关闭参数。预设由官方 CLI 合并手动覆盖，手动值优先，预设可补齐未给的宽高；不能先要求用户同时给宽高而拒绝合法预设。

`off:true` 与任何预设/尺寸/移动/触摸/DPR/UA/语言/触点数覆盖互斥，校验依据参数是否存在，false 也属于明确覆盖。非法数值或组合在调用前失败。

### Scenario: 预设、手动覆盖及显式关闭

Acceptance: A7

WHEN 仅选设备、预设叠加手动覆盖、显式 mobile:false/touch:false、off 单独使用或混合非法参数，THEN 合法值及 false 正确传递、预设缺失尺寸由官方补齐、off 互斥及数值校验有效。

## 悬停诊断

`bsk_inspect` 的 `action: observe` 增加 `probeHover`、`debugSurfaces`，默认关闭；保留分页和现有深度/预算参数。开启 probeHover 实际触发主动悬停，使用共享队列并以存在页面副作用的操作处理。官方 `hoverProbe`、`debug`、`dialogs` 等可用诊断随结果返回，不能仅添加 CLI 参数后丢弃这些字段。

### Scenario: 默认观察及主动悬停结果

Acceptance: A8

WHEN 默认 observe 或显式开启悬停/诊断，THEN 默认行为不变，启用时不安全并发被避免，实际诊断出现在模型结果/对应展示中。

## HTML

`bsk_inspect` 的 `action: html` 增加 `output`，保留现有范围/大小控制与 `session`/`tabId`。未提供 output 时保持原 HTML 内容输出。提供 output 时，取得官方结果后使用 Node 原生文件能力独占创建新文件，避免官方 --out 会覆盖的行为。

导出返回文件路径、实际写入 UTF-8 字节数、官方提供的原始大小及截断状态等回执；原始大小与写入大小必须区别，不能以字符数冒充字节数。模型结果和终端卡片不再重复包含完整 HTML。现存文件、缺失父目录、读取/写入失败和取消不得伪装成功；只清理本操作确实拥有的未完成文件。

### Scenario: HTML 内联与新文件回执

Acceptance: A9

WHEN 分别不导出、导出含多字节字符/截断结果、写入现存路径或失败/取消，THEN 内联行为保持，文件内容和 UTF-8 字节数正确，回执含真实大小/截断信息且不重复正文，现存文件保留，错误真实可见。

## 固定等待

`bsk_page` 增加 `action: wait-ms`、`durationMs`（整数，0..300000）。复用官方可取消 wait-ms，daemon 级执行，不要求拥有会话，不自建等待设施。原 `wait` 继续表示导航生命周期等待。新增等待依旧可经原工具 signal 取消，必要超时应覆盖等待时长和官方收尾。

### Scenario: 等待时长和取消

Acceptance: A10

WHEN 传入 0、合法整数、负数、超过 300000、非整数或执行中取消，THEN 合法时长交给官方等待，非法时长调用前拒绝，不需创建会话，取消不报告已完成，原 wait 不回归。

## 会话名

`bsk_session` 的 `action: start` 增加 `name`，传入官方 session start --name。沿用原 SessionStarts 的 prepare/register/claim/fail、持久请求日志、失败清理、归属和启动恢复；不能新增不受追踪的 start 快捷路径。

### Scenario: 命名会话与失败恢复

Acceptance: A11

WHEN 通过已有 start 传递 name 并正常启动、失败或中断，THEN 官方会话名正确，原追踪恢复/失败清理及自有会话注册继续有效。

## 文档与包

公开名称仍由原 tool-names.json 契约维护。skill 入口保持原构建预算，详细参数和例子放入现有 references；全部例子使用结构化 bsk_* 调用，不诱导直接绕过插件。JS 已支持的描述与新文件语义必须同步。生成 skill、客户端与 lib 通过原脚本构建，不手改生成物。

复用现有 Vitest、typecheck、test、build、publint 与仓库 `scripts/check-dsh-package.mjs`；必要新增回归必须可运行，禁止为本 change 引入测试框架或无关依赖。tgz 保留 lib/skill/patch/LICENSE、客户端工具视图与模块相对资源解析，异 cwd 能加载引用。

### Scenario: 源码、技能和 tarball 一致

Acceptance: A12

WHEN 对当前候选运行包检查并从无关 cwd 检查打包资源，THEN 必要检查全部通过，六工具契约与客户端资源完整，技能入口预算/引用有效，文档与实际新能力一致。

## 兼容性与真实验收

核对实际 CLI、daemon、Chrome 和 Edge 扩展版本；官方插件 0.3.3 要求配套官方 0.3.3 能力。先前调查发现本机 CLI/daemon 为 0.3.2，不能以扩展报告协议 1.3/无偏差推断旧 CLI 可用；Build/Verify 必须重新核实，必要时使用官方 0.3.3，不维护自定义二进制。

真实冒烟使用当前候选插件及无敏感本地测试数据/页面，Chrome、Edge 分别核实实例并创建自有会话，覆盖 JS、input/drop 和多文件上传、下载及覆盖、截图及保留、HTML 回执、模拟/悬停、等待/命名和停止清理。可在隔离开发 profile 装载候选；不能用旧 desktop 插件、直接 CLI 或 mock 代替新增插件路径的真实验收。必要人工交互/版本安装或当前 profile 重启按对应明确授权处理。失败、未运行、阻塞均不能标记通过。

### Scenario: 两浏览器候选插件冒烟

Acceptance: A13

GIVEN 实际匹配的官方组件和当前候选，WHEN 在 Chrome/Edge 分别完成上述测试并停止自有会话，THEN 记录实际版本、实例、操作范围、结果和清理证据，未做项目明确保持未验证。

## 交付与更新

控制工作区为 `D:/Caiqy/Projects/Github/dsh-plugins`，用户选择 current；实现仓库为 `packages/browser-skill`，保留现有 dsh/plugin-parity-0.3.3 补丁分支，基线是官方 dsh-plugin-v0.3.3，提交 `d9a78aed47874459ae1e44523a597e42dd9acf99`。现有 7 文件半成品先审查再补齐，不回滚用户工作，不把此前失败类型检查当通过证据。该包独立 workspace 使用自己的 pnpm 10.17.0；SDK 管理遵循 vfox，根 workspace 检查不能代替插件检查。

交付包含源码补丁提交、0.3.3-dsh.1 tgz、准确的构建/打包/安装命令、真实检查与两浏览器覆盖报告、安装与生效边界。包名、Cordis ID 和客户端 loader 契约不改；本轮不发布 npm。正式 desktop 安装与重启在验收结果接受后按明确授权执行，继续使用官方 Chrome/Edge 扩展。根仓库只绑定本 change 的子模块提交，不夹带其他更新。

手动跟进官方稳定 tag：查看是否已吸收增强，重放剩余小补丁，复跑必要检查及真实验收，重新打包。明确 npm 官方版本更新会覆盖本地增强，不配置自动替换；回退使用官方 0.3.3 包/依赖基线并按宿主要求重载。Git push/merge/PR、归档结果接受和安装/重启的授权分别处理。

### Scenario: 可复现交付与回退

Acceptance: A14

WHEN 用户查看交付包和说明，THEN 可核实官方基线/本地版本/补丁提交、复现构建打包、区分实际通过与未执行验证，并按说明安装到正确 profile、跟进新 tag 或回退官方 0.3.3；未经对应明确授权不安装重启或进行远端交付。

## 非目标

不做用户操作轨迹录制（交接文档原功能编号 A5），不改变已有 video；不增加通用原生拖拽、PDF、任意 CDP、远程浏览器文件传输、自定义 Rust/浏览器扩展构建、多浏览器管理器、第二套运行实例或自动更新服务。只对现有 DSH 插件层作必要修改。

## Requirement: browserskill-current-contract 0.4.1 DSH 插件层完整有效契约（官方组件不定制）

本条取代上方所有历史 0.3.3 版本、身份和无共享控制等旧约束。增强严格限于 DSH 插件；浏览器扩展与 bsk CLI/daemon/protocol 保持官方原版。此前未归档的扩展定制提案已经撤回。用户已选择继续仅 DSH 插件合并并明确保留官方限制；下述完整契约仍待新的 Shape 确认，确认前不进入 Build。

### Outcome

将官方 BrowserSkill 稳定版 0.4.1 合并到现有增强分支，增强实现严格限于 DSH 插件层。浏览器扩展和 bsk CLI/daemon/protocol 必须保持官方原版；本需求没有组件定制例外。相同最终效果优先采用官方实现；插件层不能等效实现时说明差异，由用户选择，不能转而修改官方组件。

本文件是用户最新硬约束下的完整 Shape 草稿，尚待重新确认。原含扩展定制的 A1–A21 Shape 已被取代，旧兼容候选不得加载。用户已选择继续插件层合并并明确保留官方限制；所有未达成的后台与 Edge 上传效果必须如实披露，不能算修复通过。

### Scope

#### 目录结构

##### 新建

- `packages/browser-skill/packages/dsh-plugin-browserskill/` 内确有必要的 DSH 适配及最小回归；复用已有官方模块，不建第二执行器。
- `artifacts/browserskill-upstream-041/` 内新的插件包、官方组件配套说明与真实报告；已撤回候选仅作历史证据。

##### 修改

- BrowserSkill DSH 插件的 src/tests/scripts/skill/docs/README/package 身份及必要的 fork CI 元数据；保留 @caiqy、现有六工具及 OIDC 契约。
- 根 README/AGENTS/交付记录，以及验收通过后的父仓库 gitlink。
- 本 change 的 brief、完整目标 Spec 与 delta，在 Shape 完成前保持一致。

##### 删除

- 被官方 evaluate/upload/download 覆盖的旧重复适配，不删其他增强。
- 插件文档、技能与脚本对已撤回兼容扩展的要求和加载指引。
- 撤销本轮扩展定制已完成：本地提交 `22f1b63a3b6e83119a698ffd9f68c74ce2c9db93` 将扩展恢复至官方稳定基线，保留 DSH 合并与历史提交。

##### 明确不建

- 浏览器扩展、bsk CLI/daemon/protocol 的任何定制补丁；不批量采用未发布 main。
- raw CDP、未公开 daemon 接口、伪造可见性、关闭控制守卫、隐性录像或 unknown 动作重放。
- 新测试框架、通用诊断平台、自动更新或 Supervisor 子 change。

### Non-goals

不安装或重启在用 Desktop，不发布 npm、触发远端 CI、push/PR 或改写历史 tag。只使用官方配套浏览器扩展及 CLI/daemon，不再要求用户加载自定义扩展。候选实跑的宿主注册、模型与附件 fixture 不冒充实际 Desktop UI。

### Constraints and evidence

- 官方稳定提交：`b8f2d4f0fa35c8c7c866229e1cf3b3329ae39de5`。现有增强分支 `dsh/plugin-parity-0.3.3` 保持不变；DSH 合并保留，本地纠正提交为 `22f1b63a3b6e83119a698ffd9f68c74ce2c9db93`。
- 已核实扩展、CLI/daemon/protocol/Cargo 与官方稳定基线零差异；在用浏览器一直没有加载旧自定义扩展，所有旧自有会话与作业均已结束。
- Q1/Q2/Q3 仍有效：保留七类增强，采用官方结构化页面 JS 失败，接受 sync/context/observation/expect 与人工/导航撤销。
- 用户最新明确纠正：增强只能修改 DSH 插件，不能动浏览器插件和 bsk。此硬约束覆盖之前的组件兼容提案，已写入项目长期记忆及 AGENTS。
- 官方组件下旧报告仍保留：Chrome fullPage `page_hidden`；Edge fullPage 当时前台恢复后成功，三上传执行中 `control_context_invalid/effect_state:unknown`。这些失败不能算通过，尚不能从插件层承诺完全后台等效。
- 用户已反馈允许 Edge InPrivate，后续实测；不重复要求加载兼容扩展。

### Open questions

- Q6 已确认：用户选择“继续插件层合并，明确保留限制”。后台 fullPage 不承诺等效，Edge 上传 epoch 撤销不宣称已修复；保留接口与安全语义，实测中的这些未达成项单列为已接受的官方限制，不计功能成功。源码核对表明 DSH sidebar 只是普通 screenshot；remote ui.task_preview 不是现有本地 CLI/IPC 可达的等效能力，且 remote 不支持文件传输。不引入 gateway、录像或私有接口。
- 目前没有未解决的产品选择；下一步为本完整草稿的 Shape 确认。

### Acceptance examples

#### Scenario: A1
Acceptance: A1

六工具 schema/私有 action/共享执行一致，保留所有权、非法及外部会话拒绝、FIFO、取消与超时。
#### Scenario: A2
Acceptance: A2

evaluate 默认 true/显式 false、值/Promise/描述符正确；页面异常采用官方 ok:false/error/可选 dialogs，进程、超时、取消与 unknown 如实报告。
#### Scenario: A3
Acceptance: A3

单文件、多文件及 drop 的 1..20、路径、模式、暂存归属与取消保持官方语义；真实 Chrome/Edge 分别核对实际文件名/内容或官方拒绝结果。成功须证明内容，Edge control_context_invalid/effect_state:unknown 单列已接受限制，重新同步只读核对后停止，不能算上传成功或已修复。
#### Scenario: A4
Acceptance: A4

下载排他创建/显式覆盖/取消/dialog_pending 原 operation 恢复，不重复原下载。
#### Scenario: A5
Acceptance: A5

保留 fullPage current/follow、附件及排他 output/EEXIST/停止后保留/失败清理。按实际前后台条件记录像素或官方错误；后台 page_hidden/对应中断不作等效成功，作为用户已接受的官方限制明确披露，不强制前台、不录像、不绕守卫。
#### Scenario: A6
Acceptance: A6

browsers 无会话真实 metadata、显式核实实例、离线不换 profile，只列自有会话和 agent 标签。
#### Scenario: A7
Acceptance: A7

emulate 全字段、预设覆盖、显式 false/off、数值校验正确；触控点关闭恢复实际原生基线。
#### Scenario: A8
Acceptance: A8

observe 默认不探针，probe/debug/tab 及诊断结果完整，副作用并发分类不退化。
#### Scenario: A9
Acceptance: A9

HTML 内联、UTF8 排他导出、字节/截断及失败取消清理正确。
#### Scenario: A10
Acceptance: A10

daemon wait-ms 无会话 0..300000 整数、校验及取消正确。
#### Scenario: A11
Acceptance: A11

start name/incognito/tracked recovery 共存；Chrome/Edge 隐身真实验证、禁借普通标签及停止清理。
#### Scenario: A12
Acceptance: A12

@caiqy/fork、v3/v4 消息、客户端/skill/文档一致；独立 pnpm10.17 类型/构建/插件测试/实际包9资源通过，CI/OIDC 保持。
#### Scenario: A13
Acceptance: A13

同一最终插件 tgz + 官方0.4.1组件，经 packed apply/六公开 bsk_* 真实 Chrome/Edge 验证；版本/hash/输出/清理及 fixture 边界如实记录。
#### Scenario: A14
Acceptance: A14

官方基线/最终源码/插件 tgz/报告与回退可复现；撤回旧候选，禁止沿用旧兼容扩展证明或安装指引。
#### Scenario: A15
Acceptance: A15

sync/context/observation/expect、target/strict、补充读取、过期/人工/导航拒绝及 bootstrap 正确，不绕守卫、不重放业务动作。
#### Scenario: A16
Acceptance: A16

官方 drag/step/view/incognito/dialog、step 单次派发与取消回执、历史 token 隔离、operation await/cancel 保留。
#### Scenario: A17
Acceptance: A17

实际 CLI/daemon/浏览器扩展均为官方0.4.1、协议1.8，与新插件候选配套；不掩盖 skew，不以旧报告或仅连接成功代替实测。
#### Scenario: A18
Acceptance: A18

真实 caller→runner→CLI 证明前导连字符 expression/target/key/URL 字面量与控制 flags 顺序正确，UTF8及step取消收尾不回归。
#### Scenario: A19
Acceptance: A19

对官方稳定基线执行差异检查，浏览器扩展与 bsk CLI/daemon/protocol/Cargo 不包含定制变更；仅 DSH 插件及必要包身份、发布和开发文档发生增强差异。
#### Scenario: A20
Acceptance: A20

Edge 上传失效仅用官方公开信息/能力与插件层合法手段诊断；unknown 后重新同步只读核对并停止，不声称未证明的因果修复。
#### Scenario: A21
Acceptance: A21

交付官方组件的真实身份与配套要求；最终插件包不要求自定义扩展，无授权安装/重启/外部发布动作。

### Verification expectations

Q6 已按用户选择解决；形成一致的完整目标 Spec/delta，再确认全部范围进入 Build。复用仍匹配插件源码的既有检查；文档/技能/实跑脚本移除自定义扩展依赖后重新进行必要类型、构建、测试和实际包资源检查。预期官方限制单列 limitation，不标功能 passed；CLI 参数错误、非约定错误及清理失败仍为失败，不能借限制声明豁免。

真实验收使用最终插件 packed apply→公开工具→官方CLI/daemon/扩展；后台与前台条件分别记录，不自动抢焦点，不隐性录像，不调用私有能力。未知效果不重放，失败与阻塞不计通过。最后 Runtime 检查、全新只读 Verifier 以及用户结果接受仍须完成。

