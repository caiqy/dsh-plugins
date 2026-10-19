# Outcome

补齐官方 BrowserSkill CLI 已有而 DSH 插件尚未开放的能力，在官方插件源码上维护小补丁，交付可复现构建的 DSH 插件包、回归证据及更新/回退说明。Chrome、Edge 继续使用官方扩展，复用官方运行链路。

本 change 接管此前工作，先完成 Shape 并取得用户明确确认，再进入 Build。已有代码不代表用户批准方案，也不代表实现或验收完成。

# Scope

保留六个公开工具，通过现有 action 增加 JS、文件上传/下载、整页截图、浏览器列表、更多模拟参数、悬停诊断、HTML 导出、固定等待和会话任务名。完整接口与失败行为见 [完整规格](specs/browserskill-dsh-capabilities/spec.md)。

基于官方 `dsh-plugin-v0.3.3`（`d9a78aed47874459ae1e44523a597e42dd9acf99`），保留包名及插件 ID，本地补丁版本 `0.3.3-dsh.1`。根仓库只管理 Comet 产物及子模块指针；实现、测试和打包在独立 BrowserSkill workspace 内完成。

## 目录结构

### 新建

- `docs/comet/changes/browserskill-dsh-enhancement/specs/browserskill-dsh-capabilities/spec.md` — 完整工具行为及验收场景。
- `packages/browser-skill/packages/dsh-plugin-browserskill/docs/dsh-enhancement.md` — 补丁基线、构建安装、更新/回退及实际验收范围。
- `packages/browser-skill/packages/dsh-plugin-browserskill/tests/` 内必要的定向回归文件 — 沿用现有测试框架，不另建测试基础设施。

### 修改

```text
packages/browser-skill/packages/dsh-plugin-browserskill/
├─ package.json — 本地补丁版本，保留包名、插件 ID 和依赖边界。
├─ src/
│  ├─ browser-tools.ts — 六个公开工具的 schema、action 路由和操作标记。
│  ├─ tools.ts — 共享执行入口、会话名、列表、截图、模拟、悬停和结果展示。
│  ├─ phase-one-tools-interaction.ts — JS、上传、下载。
│  ├─ phase-one-tools-navigation.ts — 固定时长等待。
│  └─ phase-one-tools-support.ts — HTML 导出回执和错误处理。
├─ tests/ — 参数映射、权限、串行、取消、结果、文件保留与包契约回归。
├─ skill/SKILL.md — 紧凑入口与新能力路由，保持现有构建预算。
├─ skill/references/ — 各工具的新参数、语义、限制与结构化调用示例。
└─ README.md / docs/development.md — 链接增强交付说明，保持源码与公开契约一致。
```

- 根仓库 `packages/browser-skill` 的 gitlink — 交付时绑定本 change 的子仓库补丁提交；不夹带其他子模块更新。
- 同一插件模块内确需同步的参数/类型、结果 renderer 与相应测试 — 仅落实已确认的接口及结果契约；生成文件走原构建。

### 删除

无。

### 明确不建

- 第二个增强插件、runner、队列、会话注册表、观察 UI — 直接扩展现有链路。
- 自定义 Rust CLI、浏览器扩展、多浏览器管理系统和自动更新服务 — 使用官方发行版与既有 browser 选择机制。
- Supervisor/children 工作区 — 多项功能共享 schema、执行入口和同一包的检查，拆分增加冲突；单个 Native change 足够。

## Source coverage

覆盖边界：完整读取用户提供的 `C:/Users/caiqy/Documents/deepseek-harness/default-workspace/browserskill-dsh-handoff-2026-10-19.md`（238 行），覆盖全文当前有效需求及必要约束。其链接、源码行号与环境记录按材料自身用途归为实现参考/历史背景，不将外链全文扩张成需求。用户原始接手要求补充了先确认后实现、desktop profile 和版本兼容性约束；本轮用户选择 Comet 与当前目录，替代旧的非工作流推进方式。以下 Spec 位置均相对 `specs/browserskill-dsh-capabilities/spec.md`。

| 来源条目与位置 | 读取状态 | 需要保留的内容 | Spec 位置 | 验收 ID | 覆盖状态 | 理由或替代关系 |
| --- | --- | --- | --- | --- | --- | --- |
| S01 §1 L7-11 | complete | 补齐 CLI 已有能力及两个小缺口，低成本跟进更新 | 接口、交付与更新 | A1-A14 | covered | 当前完整功能边界 |
| S02 §1 L12-13 | complete | 取消用户轨迹录制；不增拖拽、PDF、CDP、远程文件传输 | 非目标 | — | non-goal | 原功能 A5 已取消，非既有 video |
| S03 §1 L14-17 | complete | Chrome/Edge 并用，具体 API 先确认 | 运行与信任边界 | A1、A6、A13 | covered | 本 Shape 负责正式确认 |
| S04 §1 L17 的未实施状态 | complete | 历史交接时没有修改或分支 | — | — | superseded | 被本 brief 的接管现状替代；当前已有半成品 |
| S05 §2 L21-31 | complete | DSH 插件→官方 CLI/daemon→官方扩展；不另起浏览器控制链路 | 运行与信任边界 | A1、A13 | covered | 组件和安装边界 |
| S06 §3 L35-43 | complete | 只加 browsers 查询；list 仍列自有会话；指定 profile 映射不可自动换浏览器 | 浏览器列表 | A6 | covered | 不重做多浏览器能力 |
| S07 §4 表格 L49 | complete | JS 默认等待 Promise/按值返回，非空、错误、超时、取消 | JS | A2 | covered | 复用官方 evaluate |
| S08 §4 表格 L50 | complete | 非空 files、多文件、input/drop，复用暂存清理 | 上传 | A3 | covered | 不重写文件传输 |
| S09 §4 表格 L51 | complete | 下载 output、默认拒绝覆盖、原子提交、失败/中断 | 下载 | A4 | covered | 沿用官方传输保证 |
| S10 §4 表格 L52 | complete | 整页/范围/裁剪约束、附件预览、保留显式输出 | 截图 | A5 | covered | 普通截图不回归 |
| S11 §4 表格 L53 | complete | 浏览器列表不改变选择和会话归属 | 浏览器列表 | A6 | covered | 同 S06 |
| S12 §4 表格 L54 | complete | dpr/ua/语言/touch/点数，false、预设覆盖、off 互斥 | 设备模拟 | A7 | covered | 参数遵循官方 CLI |
| S13 §4 表格 L55 | complete | 悬停默认关闭，会触发事件，诊断真实返回，不能不安全并发 | 悬停诊断 | A8 | covered | 动态操作标记 |
| S14 §4 表格 L56 | complete | HTML 导出只返路径/字节/截断回执，明确覆盖与失败 | HTML | A9 | covered | 不重复返回 HTML 正文 |
| S15 §4 表格 L57 | complete | 固定等待与生命周期 wait 区分，校验与取消 | 固定等待 | A10 | covered | 复用官方 wait-ms |
| S16 §4 表格 L58 | complete | session.start name 保留 tracked start、日志和失败清理 | 会话名 | A11 | covered | 原恢复协议继续有效 |
| S17 §4 L60-73 | complete | 保留六工具，同步 schema/路由/展示/技能；已有 debug/video/extract/元素等待不重复实现 | 运行与信任边界、文档与包 | A1、A12 | covered | 旧 action 回归 |
| S18 §5.1 L77-90 | complete | 小补丁共享运行实例；不编辑安装产物 | 运行与信任边界、交付与更新 | A1、A14 | covered | 安装构建入口行号仅作参考 |
| S19 §5.2 L92-98 | complete | exit 0 且 ok:false 仍报告 JS 错误，保留详情及超时收尾余量 | JS | A2 | covered | 外链是实现参考 |
| S20 §5.3 L100-106 | complete | HTML --out 的 stdout 仍含正文且直接覆盖，插件应明确回执和安全落盘 | HTML | A9 | covered | 新文件独占创建，外链是参考 |
| S21 §5.4 L108-114 | complete | 官方分块/暂存/归属/原子提交/释放；路径属于 CLI 本机 | 上传、下载 | A3、A4 | covered | 不含远程浏览器传输 |
| S22 §5.5 L116-122 | complete | 录制不可直接纳入会话协议，与 video 区分 | 非目标 | — | non-goal | 保留取消理由，源码链接只作参考 |
| S23 §6 L124-153 | complete | desktop、正式 tag 与组件兼容性；原安装/CLI 路径与版本作为历史环境 | 兼容性与真实验收、交付与更新 | A13、A14 | covered | Build 重查实际 CLI/daemon/扩展，不把历史快照当实时证明 |
| S24 §6 L155-179 | complete | 在官方源码入口修改，同步公开 schema、技能与构建 | 文档与包 | A12 | covered | 文件列表是落点建议，非全部必须修改 |
| S25 §6 L181-192 | complete | 历史 Windows detached daemon 报拒绝访问；未实时验收 | — | — | background | 如遇同类错误按官方 foreground 方案处理，不视为插件新功能 |
| S26 §7 L194-205 | complete | 正式 tag 小补丁、原 ID、本地版本、可复现 tgz、manual 更新/回退，沿用官方组件 | 交付与更新 | A14 | covered | 不自动跟随 npm，不手改 node_modules |
| S27 §8 L209-217 | complete | 复用现有 typecheck/test/build、当前 Node/pnpm、SDK 用 vfox | 文档与包、交付与更新 | A12、A14 | covered | 验证命令不是已通过证据 |
| S28 §8 L219-230 | complete | schema→CLI、旧行为、JS/false/取消/传输/图片/HTML/空列表/模拟/归属/两浏览器/打包检查 | 各接口、运行与信任边界、文档与包、兼容性与真实验收 | A1-A13 | covered | 必须覆盖的测试与真实验收矩阵 |
| S29 §8 L232 | complete | 报告源码/基线/版本/安装/实测范围/更新回退 | 交付与更新 | A14 | covered | 不将未执行记为通过 |
| S30 §9 L234-238 | complete | 前述需求接续摘要 | 同 S01-S29 | A1-A14 | covered | 重复内容；“尚无实现”由接管现状替代 |
| S31 原始接手要求及本轮纠正 | complete | 先确认方案后实施、路径迁至 packages、保留半成品，用 Comet 当前目录推进 | 运行与信任边界、交付与更新 | A1、A14 | covered | 遵循本轮明确选择；既定功能范围不重问 |

# Non-goals

不做用户操作轨迹录制（原功能编号 A5）；不新增底层拖拽、PDF、任意 CDP 或远程浏览器文件传输。保留既有网络调试/视频/提取/元素等待，不重做多浏览器管理。不维护自定义 Rust/扩展发行版，不新增依赖或测试框架，不向 npm 发布，不自动合并、推送或创建 PR。

# Constraints and invariants

- 页面操作支持 session/tabId，经过原归属校验、每会话 FIFO、exec.signal、超时余量、观察面板和清理路径；不可借新增入口访问外部会话。
- JS、主动悬停、整页截图会影响页面；其工具标记与队列行为必须反映实际副作用。
- 明确输出只允许新建截图/HTML 文件；download 默认拒绝覆盖，仅显式 overwrite:true 才覆盖。保留用户输出，清理仅针对工具拥有的临时文件。
- 根 workspace 排除 BrowserSkill，使用其自身 pnpm 10.17.0 和原工具链。SDK 的安装/切换走 vfox；生成物经脚本生成。
- 完成独立验收并由用户接受结果后，才进入归档；desktop 安装、在用 profile 重启、Git 远端交付与工作区清理分别按实际明确授权执行，不能由“使用 Comet”推导授权。

# Decisions

- 用户选择 Comet Native；2026-10-19 选择 A 当前目录。父仓库 main，子仓库现有 dsh/plugin-parity-0.3.3；不重建分支、不回滚半成品。
- 接管现状：子仓库 7 个 tracked 文件有修改，254 行新增/26 行删除；包版本已改成本地版本。此前 typecheck 在 tools.ts 报 TS2322/TS2719；未提交/推送，未安装增强包/重启 desktop。这些是历史失败记录，不能复用为通过证据。
- 本 Shape 将此前提议的接口作为待完整确认方案；最终确认前不继续普通实现写入。
- 使用单个 Native change：共同修改公开 schema 和执行核心，拆为 Supervisor 子任务没有独立集成收益。
- 截图与 HTML 显式输出采用新文件独占创建；HTML 使用 Node 原生文件 API 接收官方结果，不直接使用会覆盖文件的官方 --out。下载沿用官方覆盖参数。
- 交付保留官方包名/插件 ID，本地 tgz 和补丁提交与说明先供审阅；安装 desktop/重启放在验收接受后的明确授权动作中。

# Acceptance examples

- A1：六工具及现有 action 不回归；公开 schema 经私有路由传入正确 CLI 参数。未知/外部会话被拒绝，同会话并发请求按 FIFO，工具取消、超时、观察状态与清理仍复用官方入口；有副作用的新增操作不会被声明为可安全并发。
- A2：evaluate 支持非空 expression、awaitPromise、returnByValue、timeoutMs 与 session/tabId；默认等待 Promise、按值返回；false 不丢失；普通值、Promise、页面抛错 ok:false、超时及取消均有真实结果与错误详情，exit 0 不掩盖 JS 失败。
- A3：upload 支持 target、非空本地 files[]、input/drop（默认 input）、timeoutMs 与 session/tabId；单/多文件与 drop 参数准确；复用官方分块/暂存/清理，非法参数、读取失败、中断不会伪装成功。
- A4：download 支持 target、output、overwrite、timeoutMs 与 session/tabId；默认不覆盖，显式 overwrite:true 才允许覆盖；实际内容正确，失败/中断保留真实错误，沿用官方原子提交及释放。
- A5：screenshot 增加 fullPage、scope:current/follow、timeoutMs、output；普通截图及附件预览保持有效；fullPage 与 ref/裁剪等非法组合按官方约束拒绝；显式输出仅新建且会保留，现存文件不被覆盖，临时清理不误删用户文件。
- A6：session.browsers 返回官方已连接实例信息且不创建会话；session.list 仍只列插件拥有会话。空列表和不可用错误如实返回；映射经核实的 browser ID/唯一标签继续交给现有 start，指定目标不可用时不自动换浏览器。
- A7：emulate 支持 dpr、ua、acceptLanguage、touch、maxTouchPoints，保留 device、尺寸、mobile、off；mobile:false/touch:false 明确传递，device 预设可补齐宽高且手动覆盖优先，off 与任何模拟覆盖互斥，非法数值/组合在执行前拒绝。
- A8：observe 支持 probeHover/debugSurfaces，默认关闭；开启悬停使用原队列并按会改变页面的操作处理；hoverProbe/debug/对话等官方诊断实际返回，未开启时原 observe 保持有效。
- A9：html 无 output 时保持现有正文行为；有 output 时独占新建文件，返回路径、实际 UTF-8 字节数、原始大小及截断状态，模型结果与卡片均不重复包含 HTML 正文；现存文件、目录不存在、读取/写入失败均真实报错，不误删非工具文件。
- A10：page.wait-ms 接受整数 durationMs 0..300000，拒绝越界/非整数；复用官方可取消等待，不要求创建会话，不改变原生命周期 wait；可取消且不将中断标为完成。
- A11：session.start 的 name 传给原 tracked start；命名会话正常返回，prepare/register/claim/fail、日志、启动恢复与失败清理仍有效。
- A12：技能入口/引用/公开 schema/路由/结果说明一致，新能力有结构化示例，不再错误声称完全不支持 JS；沿用原入口预算与构建器，现有包 typecheck/test/build、publint 和仓库 check-dsh-package 检查通过，tgz 引用在无关 cwd 可解析，六工具和客户端资源契约有效。
- A13：记录官方 CLI、daemon、Chrome 与 Edge 扩展的实际版本和兼容性，必要时使用匹配官方 0.3.3 CLI；两浏览器分别用实际 ID/唯一标签完成自有会话冒烟，覆盖 JS、传输、截图、HTML、模拟/悬停、等待/命名及停止清理。测试用无敏感本地数据/页面；未运行、失败、阻塞不能记为通过。
- A14：交付基于 dsh-plugin-v0.3.3 的子仓库补丁提交、0.3.3-dsh.1 tgz、可复现命令及实际检查/实测报告；说明 desktop 的安装/重载与回退官方 0.3.3、官方新 tag 重放补丁流程及 npm 官方更新会覆盖本地增强。安装/重启及远端操作只按相应明确授权执行。

# Verification expectations

Build 先审查、补齐现有半成品并修复已知类型错误；使用现有 Vitest 增加必要定向回归。最终检查交给 Runtime 管理，在 BrowserSkill 自身 workspace 执行插件 typecheck/test/build、publint 及根脚本 `node scripts/check-dsh-package.mjs`（以实施时公开脚本帮助核实参数和前置条件）。由新的只读 Verifier 覆盖 A1-A14，检查当前候选证据，真实浏览器验证使用当前候选插件而非旧安装包；可在隔离开发 profile 加载候选，不把 mock 或旧 0.3.3 工具结果冒充增强包实测。验证未通过、版本不匹配或需要安装/重启授权时如实记录并按 Runtime 处理。
