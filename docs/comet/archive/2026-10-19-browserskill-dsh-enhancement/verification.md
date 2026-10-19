---
generated_from_state_version: 12
---

# 验证

## 当前结果

- 结果: **已归档**
- 验证情况: **已完成检查，验证结果已确认**
- 目标周期: 1
- 迭代: 3
- 验证器尝试次数: 1
- 完成时间: 2026-10-19T08:48:31.653Z
- 摘要: 通过。作为本轮新的只读Verifier，先提交启动回执，再独立完整读取brief/目标Spec、基线至候选代码与测试、Runtime候选绑定和最终日志、当前tgz的双浏览器真实调用报告，最后核对Builder交接。A1-A14恰好各判断一次，全部passed，未发现Blocker。有效Runtime检查为87071a6d同一轮四项passed/exit0；前两轮publint/归档匹配失败已与本候选最终结果区分，未重复运行现有有效完整检查。源码HEAD、staged gitlink、交付SHA256及packed apply报告一致；除公开verifier-started回执和本系统Temp结果JSON外未修改实现、正式文档或Runtime文件。真实宿主GUI/附件服务与安装重启的限制如实保留，未擅自accept-result或归档。

## 验收

| 编号 | 结果 | 来源 | 验收项 | 原因 |
| --- | --- | --- | --- | --- |
| A1 | passed | brief.md | A1：六工具及现有 action 不回归；公开 schema 经私有路由传入正确 CLI 参数。未知/外部会话被拒绝，同会话并发请求按 FIFO，工具取消、超时、观察状态与清理仍复用官方入口；有副作用的新增操作不会被声明为可安全并发。 | 独立核对官方基线 d9a78aed47874459ae1e44523a597e42dd9acf99 至 HEAD cb389bb4a31cfa200ba179e9279e2f6a347509d4 的完整变更。D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/browser-tools.ts 保留六工具与原 action 分派，新增 action 委托原私有定义；src/tools.ts:95-162 仍经 registry.assertUsable、queue.run、exec.signal、观察 begin/end 和原 runner。evaluate、upload/download、主动悬停及 fullPage 等副作用操作未标记可安全并发。tests/enhancement.test.ts:146-159、238-300 覆盖外部会话拒绝、FIFO 和取消，原会话/HTTP/观察/清理回归纳入本候选 Runtime 604/604 通过记录。 |
| A2 | passed | brief.md | A2：evaluate 支持非空 expression、awaitPromise、returnByValue、timeoutMs 与 session/tabId；默认等待 Promise、按值返回；false 不丢失；普通值、Promise、页面抛错 ok:false、超时及取消均有真实结果与错误详情，exit 0 不掩盖 JS 失败。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/phase-one-tools-interaction.ts:24-81 核对非空表达式、session/tabId、显式 true/false、官方 timeout 与收尾余量；src/tools.ts:149-152 在观察结束前拒绝 exit0 的 ok:false 并保留整个异常结构；src/runner.ts 将全局 --json 放在 positional -- 前。tests/enhancement.test.ts:87-131、328-377 验证参数及失败语义。Chrome run4 和 Edge run6 报告通过当前 tgz 公开 evaluate 实测普通值、Promise、两个 false、页面异常、150ms 超时和执行中取消，错误与预期匹配。 |
| A3 | passed | brief.md | A3：upload 支持 target、非空本地 files[]、input/drop（默认 input）、timeoutMs 与 session/tabId；单/多文件与 drop 参数准确；复用官方分块/暂存/清理，非法参数、读取失败、中断不会伪装成功。 | 公开 upload 路由至 D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/phase-one-tools-interaction.ts，校验 target、非空 files[] 和 input/drop，重复 --file、timeout、tabId 经共享执行器进入未修改的官方上传暂存/分块/归属/清理链路。tests/enhancement.test.ts:133-185、216-300 覆盖非法输入、foreign session、argv、读取错误和中断。artifacts/browserskill-dsh-enhancement/live-phase-5-chrome-upload/report.json 与 live-phase-6-edge/report.json 的单文件、多文件 input、drop 均逐个 File.text 校验通过；Chrome run4 权限失败保留为失败，由同 SHA256 包的 run5 补齐。 |
| A4 | passed | brief.md | A4：download 支持 target、output、overwrite、timeoutMs 与 session/tabId；默认不覆盖，显式 overwrite:true 才允许覆盖；实际内容正确，失败/中断保留真实错误，沿用官方原子提交及释放。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/phase-one-tools-interaction.ts 的 download 要求 target/output，仅 overwrite===true 添加 --overwrite，使用官方 download --out 和既有 runner/signal；官方下载的临时文件、原子提交与释放实现未改。tests/enhancement.test.ts:187-236、262-300 验证默认/false/true、失败详情及取消。Chrome run4 和 Edge run6 实测下载内容正确、默认现存路径报错且旧内容保留、显式覆盖内容正确。 |
| A5 | passed | brief.md | A5：screenshot 增加 fullPage、scope:current/follow、timeoutMs、output；普通截图及附件预览保持有效；fullPage 与 ref/裁剪等非法组合按官方约束拒绝；显式输出仅新建且会保留，现存文件不被覆盖，临时清理不误删用户文件。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/tools.ts:1060-1136 核对 fullPage/ref 互斥、scope/timeout 对 fullPage 的官方约束、原附件保存与读取、COPYFILE_EXCL 显式输出及 finally 仅清理 CLI scratch。tests/tools.test.ts 的截图回归覆盖普通附件、非法组合、输出保护和临时清理，已纳入 Runtime 604/604。两浏览器报告 current/follow 整页真实 PNG、renderer image block、现存输出哈希不变及 stop 后输出保留；Chrome 969×2296、Edge 961×2296。真实 DSH 附件服务/UI 的边界另列风险。 |
| A6 | passed | brief.md | A6：session.browsers 返回官方已连接实例信息且不创建会话；session.list 仍只列插件拥有会话。空列表和不可用错误如实返回；映射经核实的 browser ID/唯一标签继续交给现有 start，指定目标不可用时不自动换浏览器。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/tools.ts 的 session.browsers 直返官方 browsers JSON，不调用 tracked start 或注册会话；session.list 仍以插件 registry 为边界。tests/tools.test.ts 覆盖正常/空列表/CLI失败及 owned list。真实 packed apply 报告首先确认 connected 实例并精确 start.browser：Chrome 2303ebf6/chrome、Edge daae7a27/edge-gmail3，断言返回 browserInstanceId 一致；离线 Edge 历史失败没有被换浏览器掩盖，恢复原 ID 后才完成 run6。 |
| A7 | passed | brief.md | A7：emulate 支持 dpr、ua、acceptLanguage、touch、maxTouchPoints，保留 device、尺寸、mobile、off；mobile:false/touch:false 明确传递，device 预设可补齐宽高且手动覆盖优先，off 与任何模拟覆盖互斥，非法数值/组合在执行前拒绝。 | 独立比对 D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/tools.ts 的 assist.emulate 与 crates/bsk-cli/src/cli/emulate.rs：dpr/ua/acceptLanguage/touch/maxTouchPoints 路由一致，false 分别映射 --no-mobile/--no-touch；device 可补齐单独覆盖的尺寸，off 对参数存在性互斥且包含 false，尺寸/有限正 DPR/触点数/语言依赖在调用前校验。tests/tools.test.ts 覆盖这些合法与非法分支；Chrome/Edge 实测 UA、DPR、navigator.maxTouchPoints 读回正确，off 清除通过。 |
| A8 | passed | brief.md | A8：observe 支持 probeHover/debugSurfaces，默认关闭；开启悬停使用原队列并按会改变页面的操作处理；hoverProbe/debug/对话等官方诊断实际返回，未开启时原 observe 保持有效。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/browser-tools.ts 与 src/tools.ts 核对 observe 的 probeHover/debugSurfaces 默认未启用，仅显式值添加官方参数；probeHover 以有副作用操作处理并走原会话 FIFO，cursor 组合约束与 tabId 保留。hoverProbe/debug/dialogs 等官方字段映射及 renderer 未丢弃，原默认 observe 回归通过。两浏览器报告均有实际 hoverProbe performed/revealed_content 与 debug surface_probes，脚本同时断言公开输出和 renderer 的 hoverProbe 文本。 |
| A9 | passed | brief.md | A9：html 无 output 时保持现有正文行为；有 output 时独占新建文件，返回路径、实际 UTF-8 字节数、原始大小及截断状态，模型结果与卡片均不重复包含 HTML 正文；现存文件、目录不存在、读取/写入失败均真实报错，不误删非工具文件。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/phase-one-tools-support.ts:350-377 保持 get-html 内联；output 使用 Node open(wx)，返回 path、Buffer.byteLength 的 writtenBytes、官方原始 byteSize/truncated，导出对象不带 html，模型/卡片复用同一结果。tests/enhancement.test.ts:381-474 验证多字节/截断、正文去重、EEXIST/ENOENT、write/close失败及写入中取消，只删除本操作已创建的文件并保留原错误。两浏览器实际 HTML 导出为4830/4831 UTF-8 bytes且现存路径受保护。 |
| A10 | passed | brief.md | A10：page.wait-ms 接受整数 durationMs 0..300000，拒绝越界/非整数；复用官方可取消等待，不要求创建会话，不改变原生命周期 wait；可取消且不将中断标为完成。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/phase-one-tools-navigation.ts 的 wait-ms 在调用前检查整数0..300000，直接使用官方 daemon wait-ms 和原 signal/runner 超时余量，不解析或创建 session；原生命周期 wait 路由保持。tests/enhancement.test.ts:262-333 验证0/1/300000、负值/越界/小数/NaN/Infinity/缺值及中断。Chrome run4 与 Edge run6 的公开工具调用记录包含无会话0/20ms和执行中取消，取消记录为错误而非完成。 |
| A11 | passed | brief.md | A11：session.start 的 name 传给原 tracked start；命名会话正常返回，prepare/register/claim/fail、日志、启动恢复与失败清理仍有效。 | D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/src/tools.ts:254-268 只将非空 name 加入原 SessionStarts.start 的 --name 参数，保留 reconcile/begin、request-id、prepare/register/claim/fail 及 journal/归属清理，没有新 start 快捷路径。原恢复、失败、并发上限及停止回归列入604/604通过记录；tests/tools.test.ts 新增命名参数/标题与空名校验。Chrome/Edge 真实 tracked start 返回指定实例、自有会话正常工作并停止，标题含请求名。未声称人工读取历史 UI 名称。 |
| A12 | passed | brief.md | A12：技能入口/引用/公开 schema/路由/结果说明一致，新能力有结构化示例，不再错误声称完全不支持 JS；沿用原入口预算与构建器，现有包 typecheck/test/build、publint 和仓库 check-dsh-package 检查通过，tgz 引用在无关 cwd 可解析，六工具和客户端资源契约有效。 | 独立核对六工具 schema/私有路由/renderer 与 D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/skill/SKILL.md、skill/references/interaction-details.md、screenshots-and-canvas.md、tabs-and-profiles.md 一致，JS 支持与结构化例子已同步；入口4109 UTF-8 bytes，保留原4500预算和7资源构建契约。Runtime 本候选最终87071a6d日志及state.json:25-117：typecheck exit0(6673ms)、604/604 test exit0(10779ms)、build+publint@0.3.25+check-dsh-package exit0(7366ms)、归档匹配 exit0(309ms)。异 cwd 包加载、六工具与客户端资源检查通过；没有重跑这些有效检查。 |
| A13 | passed | brief.md | A13：记录官方 CLI、daemon、Chrome 与 Edge 扩展的实际版本和兼容性，必要时使用匹配官方 0.3.3 CLI；两浏览器分别用实际 ID/唯一标签完成自有会话冒烟，覆盖 JS、传输、截图、HTML、模拟/悬停、等待/命名及停止清理。测试用无敏感本地数据/页面；未运行、失败、阻塞不能记为通过。 | 已有原始工具输出经独立会话证据读取确认：父会话 session-3e0cdb6c-6654-409a-981c-1d4f5f31de39 的 seq1400(2026-10-19T08:22:20Z) 为 bsk0.3.3、daemon_version0.3.3、protocol1.3；两浏览器报告连接字段为浏览器155.0.0.0、扩展0.3.3、无skew。D:/Caiqy/Projects/Github/dsh-plugins/artifacts/browserskill-dsh-enhancement/live-phase-4-chrome/report.json 的七组与 live-phase-5-chrome-upload/report.json 的三组补测合并覆盖10/10；live-phase-6-edge/report.json 为10/10、failures空、39次公开工具调用。三份报告同SHA256，实际ID分别2303ebf6/daae7a27，packed apply使用默认真实runner，停止后owned list为空且截图保留。脚本使用无敏感本地HTTP/文本数据；宿主fixture边界真实列明。 |
| A14 | passed | brief.md | A14：交付基于 dsh-plugin-v0.3.3 的子仓库补丁提交、0.3.3-dsh.1 tgz、可复现命令及实际检查/实测报告；说明 desktop 的安装/重载与回退官方 0.3.3、官方新 tag 重放补丁流程及 npm 官方更新会覆盖本地增强。安装/重启及远端操作只按相应明确授权执行。 | 独立核对子仓库干净、HEAD cb389bb4a31cfa200ba179e9279e2f6a347509d4，root staged gitlink绑定相同提交；实现6ea57e9223f0ef082db1c729da4bc7af3e7aa7a9基于dsh-plugin-v0.3.3/d9a78ae。D:/Caiqy/Projects/Github/dsh-plugins/artifacts/browserskill-dsh-enhancement/DELIVERY.md:3-13 包含两个patch、0.3.3-dsh.1 tgz与SHA256 81d7eec2d2315b0e95d5170d5a09e4c45d2269ed17c8f702485ecc71028e40b9；Runtime对14个归档文件验证匹配，仅规范化纯字符串CSS classMap键序。packages/browser-skill/packages/dsh-plugin-browserskill/docs/dsh-enhancement.md:42-101 提供独立workspace复现、desktop安装/重载、回退官方0.3.3、新stable tag重放及npm官方更新覆盖说明。未安装/重启desktop或执行push/merge/npm发布，符合分别授权边界。 |

## 检查

| 检查 | 命令 | 工作目录 | 状态 | 退出码 | 耗时 |
| --- | --- | --- | --- | ---: | ---: |
| BrowserSkill plugin typecheck | -NoProfile -Command & corepack pnpm --filter @wxg-prc-cpg/browser-skill-dsh-plugin run typecheck; exit $LASTEXITCODE | packages/browser-skill | passed | 0 | 6673 ms |
| BrowserSkill complete plugin tests | -NoProfile -Command & corepack pnpm --filter @wxg-prc-cpg/browser-skill-dsh-plugin run test; exit $LASTEXITCODE | packages/browser-skill | passed | 0 | 10779 ms |
| Build client and runtime, publint and upstream archive validation | -NoProfile -Command & corepack pnpm --filter @wxg-prc-cpg/browser-skill-dsh-plugin run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; & corepack pnpm dlx publint@0.3.25 run '../../artifacts/browserskill-dsh-enhancement/wxg-prc-cpg-browser-skill-dsh-plugin-0.3.3-dsh.1.tgz'; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; & node scripts/check-dsh-package.mjs; exit $LASTEXITCODE | packages/browser-skill | passed | 0 | 7366 ms |
| Delivered tgz matches current build and has expected SHA256 | --input-type=module -e import assert from 'node:assert/strict'; import {readFileSync,mkdtempSync,readdirSync,rmSync} from 'node:fs'; import {tmpdir} from 'node:os'; import {join} from 'node:path'; import {execFileSync} from 'node:child_process'; import {createHash} from 'node:crypto'; const tgz='../../artifacts/browserskill-dsh-enhancement/wxg-prc-cpg-browser-skill-dsh-plugin-0.3.3-dsh.1.tgz'; assert.equal(createHash('sha256').update(readFileSync(tgz)).digest('hex'),'81d7eec2d2315b0e95d5170d5a09e4c45d2269ed17c8f702485ecc71028e40b9'); const scratch=mkdtempSync(join(tmpdir(),'bsk-archive-match-')); let count=0; try {execFileSync('tar',['-xzf',tgz,'-C',scratch]); const walk=(relative='')=>{for(const entry of readdirSync(join(scratch,'package',relative),{withFileTypes:true})){const path=join(relative,entry.name); if(entry.isDirectory())walk(path); else{const a=readFileSync(join(scratch,'package',path)),b=readFileSync(join('packages/dsh-plugin-browserskill',path));if(path.replaceAll('\\','/')==='lib/client.cjs'){let maps=0;const normalize=(text)=>text.replace(/var (\w+_module_css_default) = (\{[\s\S]*?\});/g,(_,name,json)=>{const entries=Object.entries(JSON.parse(json));assert(entries.every(([,v])=>typeof v==='string'));maps++;return 'var '+name+' = '+JSON.stringify(Object.fromEntries(entries.sort(([x],[y])=>x.localeCompare(y))))+';';});assert.equal(normalize(a.toString('utf8')),normalize(b.toString('utf8')),'client differs beyond CSS map key ordering');assert(maps>0&&maps%2===0);console.log('CSS map key order canonicalized: '+maps/2);}else assert(a.equals(b),path+' differs from current source/build');count++;}}};walk();assert(count>=14);console.log('Delivered archive matches current build: '+count+' files; SHA256 verified');} finally {rmSync(scratch,{recursive:true,force:true});} | packages/browser-skill | passed | 0 | 309 ms |

### Builder 报告的证据

以下为 Builder 报告，不等同于 Runtime 检查凭据或独立验收结果。

- 定向回归与类型检查: passed — runner/tools 157/157；enhancement 41/41；当前 tsc --noEmit通过。之前开发期typecheck失败已修，未将旧失败记为成功。
- 技能契约及构建: passed — skill5/5、bundle脚本及6/6自检通过；入口4109bytes；build成功，候选从生成物打包。
- 双浏览器候选真实冒烟: passed — Chrome run4+run5合并、Edge run6分别10/10；同tgz SHA256一致，全部自有会话停止；每次失败/预期错误如实保留。
- 正式完整检查: not-run — 交给Runtime冻结候选后的verification_checks执行；开发期反馈不当正式证据。
- 已知限制: 真实操作均由候选公开工具经共享runner执行；ctx注册、附件持久保存及image模型metadata为宿主接口fixture，未验收真实desktop GUI/附件service。
- 已知限制: 正式desktop安装/重启、远端push/merge/发布未执行，须各自明确授权。
- 已知限制: Chrome历史run4上传因文件网址权限失败；用户开启后同包run5三组补测通过，报告必须合并判读而不能把run4单份当全部通过。

## 阻塞项

_无。_

## 风险与跳过的工作

- [Suggestion] D:/Caiqy/Projects/Github/dsh-plugins/packages/browser-skill/packages/dsh-plugin-browserskill/scripts/test-enhancement-live.mjs:28、70-93：注册ctx、image模型metadata及本地附件存储为明确宿主seam fixture。真实PNG字节、renderer image block和CLI/daemon/扩展链路有实测；实际desktop GUI、真实DSH附件服务与附件授权的集成效果无法验证，本轮没有将其计为通过的实测范围。
- [Suggestion] D:/Caiqy/Projects/Github/dsh-plugins/artifacts/browserskill-dsh-enhancement/DELIVERY.md:28、36：未安装增强包到desktop、未重启profile；历史UI显示的会话名称未人工读回。已验证name传入真实tracked start、返回正确实例和终端标题；正式安装后UI效果仍需相应明确授权后的验证。
- [Suggestion] D:/Caiqy/Projects/Github/dsh-plugins/artifacts/browserskill-dsh-enhancement/live-phase-4-chrome/report.json：该份报告整体保留上传权限失败，不能单独称全部通过；本轮Chrome通过结论依赖同一候选SHA256的live-phase-5-chrome-upload/report.json三项补测。文件上传仍依赖官方扩展的文件网址权限。
- [Suggestion] D:/Caiqy/Projects/Github/dsh-plugins/.comet/runtime/native/changes/browserskill-dsh-enhancement/state.json:107：交付归档与当前重新构建产物对比仅对客户端纯字符串CSS classMap对象键序做排序；因此不宣称客户端bundle原始字节完全可复现，其余包文件及客户端代码严格比对，交付tgz自身SHA256固定且通过。
- [Suggestion] 兼容性证据限本次实际官方CLI/daemon/Chrome和Edge扩展0.3.3、浏览器155.0.0.0；未来官方tag或宿主版本的兼容性未验证。未执行远端push/merge、npm发布、结果接受或归档。

## 之前的迭代

| 目标周期 | 迭代 | 尝试 | 结果 | 未解决项 | 摘要 | 完成时间 |
| ---: | ---: | ---: | --- | --- | --- | --- |
| 1 | 1 | 0 | recovery | — | Builder handoff Runtime checks failed: plugin-build-package, delivered-archive-match | 2026-10-19T08:31:57.777Z |
| 1 | 2 | 0 | recovery | — | Builder handoff Runtime checks failed: plugin-build-package | 2026-10-19T08:35:50.659Z |
| 1 | 3 | 1 | pass | — | 通过。作为本轮新的只读Verifier，先提交启动回执，再独立完整读取brief/目标Spec、基线至候选代码与测试、Runtime候选绑定和最终日志、当前tgz的双浏览器真实调用报告，最后核对Builder交接。A1-A14恰好各判断一次，全部passed，未发现Blocker。有效Runtime检查为87071a6d同一轮四项passed/exit0；前两轮publint/归档匹配失败已与本候选最终结果区分，未重复运行现有有效完整检查。源码HEAD、staged gitlink、交付SHA256及packed apply报告一致；除公开verifier-started回执和本系统Temp结果JSON外未修改实现、正式文档或Runtime文件。真实宿主GUI/附件服务与安装重启的限制如实保留，未擅自accept-result或归档。 | 2026-10-19T08:48:31.653Z |



## 结论

通过。作为本轮新的只读Verifier，先提交启动回执，再独立完整读取brief/目标Spec、基线至候选代码与测试、Runtime候选绑定和最终日志、当前tgz的双浏览器真实调用报告，最后核对Builder交接。A1-A14恰好各判断一次，全部passed，未发现Blocker。有效Runtime检查为87071a6d同一轮四项passed/exit0；前两轮publint/归档匹配失败已与本候选最终结果区分，未重复运行现有有效完整检查。源码HEAD、staged gitlink、交付SHA256及packed apply报告一致；除公开verifier-started回执和本系统Temp结果JSON外未修改实现、正式文档或Runtime文件。真实宿主GUI/附件服务与安装重启的限制如实保留，未擅自accept-result或归档。
