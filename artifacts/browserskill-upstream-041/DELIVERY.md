# BrowserSkill 0.4.1：仅 DSH 插件增强

本记录保存候选 04、源码与真实浏览器证据。用户已明确接受当前结果及已披露限制；Comet Runtime 已完成归档（stateVersion 17，Run completed，A1–A21 全部通过）。[正式验收报告](../../docs/comet/archive/2026-11-03-browserskill-upstream-041/verification.md)与[归档状态](../../docs/comet/archive/2026-11-03-browserskill-upstream-041/comet-state.yaml)保留完整依据。**候选 03 的定制扩展与配套插件已撤回，不能加载或安装。** 浏览器扩展、bsk CLI/daemon 和协议保持官方原版。

## 固定候选与源码

- 包：[@caiqy/browser-skill-dsh-plugin@0.4.1-dsh.1](candidate-04/caiqy-browser-skill-dsh-plugin-0.4.1-dsh.1.tgz)，141,007 bytes，16 entries。
- SHA256：`26ee94324c96d95a069ec4d9656f502dd380e9bfce3d431840e2809ea58c374f`。
- SRI：`sha512-zRTfxLBNxNZCX+8m2BeCTksZJEl8eGZon6JwqY1ybYN1xCvwJBxr7s3jKkhsdOG1HCQOIY/MOMgsJMdKcaNp0A==`。
- [npm pack 回执](candidate-04/plugin-pack-receipt.json)、[首轮源码回执](candidate-04/source-provenance-final.json)、[补验源码回执](candidate-04/source-provenance-coverage.json)、[常规功能审计](candidate-04/live-report-audit-final.json)、[最终四格 scope 审计](candidate-04/scope-audit-unique.json)。
- 官方固定来源：[`dsh-plugin-v0.4.1`](https://github.com/Tencent/BrowserSkill/tree/dsh-plugin-v0.4.1)，`b8f2d4f0fa35c8c7c866229e1cf3b3329ae39de5`。
- 长期分支 `dsh/plugin-parity-0.3.3`；首轮源码 `feaa7f60498f43bd6baf21575407ee797ced01c2`，补验源码 `8558a89fbc1eb2cc303ef17b9845c81615f4de11`。二者只相差实跑脚本，插件生产源码、测试、技能、包与官方组件未变；tgz 未重新构建或替换。
- 合并提交 `985ea589902b387de1a96366c89ef95765d936f8`；`22f1b63a3b6e83119a698ffd9f68c74ce2c9db93` 撤销全部扩展定制。相关官方组件路径已跟踪和未跟踪源码差异均为 0。旧忽略构建产物只作撤回历史保存，从未加载。
- 实跑配套：CLI、daemon、扩展均为官方 0.4.1，协议 1.8；Chrome `2303ebf6` / 155、Edge `d408371e` / 156，无版本偏差。

源码及固定 tgz 的追溯链成立，但**严格字节复现尚未证明**：重建 client.cjs 与候选包有一条 CSS 规则和 CSS module 键序差异，窄范围规范化后相同；差异根因和全部 CSS 影响尚未实证排除。不能将规范化相同表述为原始字节一致。本记录所有实跑均使用上列固定 SHA256 包。

## 已确认范围

[brief](../../docs/comet/archive/2026-11-03-browserskill-upstream-041/brief.md) 和[完整规格](../../docs/comet/archive/2026-11-03-browserskill-upstream-041/specs/browserskill-dsh-capabilities/spec.md) A1–A21 已确认。复用官方 evaluate/upload/download、共享控制、drag/step/view/incognito/dialog；保留七类插件增强及位置参数字面量保护。**增强只修改 DSH 插件及必要发布、测试、文档适配，不定制扩展或 bsk。**

用户接受官方后台 fullPage 不保证等效，Edge 上传在控制撤销时可能返回不确定结果。这些限制不算功能成功，不能豁免未执行用例、其他错误或清理失败。unknown 不重放；只进行约定的一次 fresh-sync 只读核对后停止。不自动置顶、录像保活、改设置或绕守卫。

## 检查及实跑边界

第一轮 Runtime 正式检查实际通过：32 测试文件通过、779 测试通过；10 个默认 browser skip 不计真实浏览器通过。类型检查、构建、真实 CLI parser 回归、9 个 packed 技能资源及无关 cwd apply 通过，入口 4,391 bytes。独立 Verifier Action18 正式结论为 19 passed、A5/A13 failed（[原始提交输出导出](candidate-04/verifier-01-output.json)），原因是没有 follow 实派与普通 Chrome 条件探针缺失，Runtime 返回 Build12。

补验只改测试脚本。三项可重复检查验证：生产源码/固定包/官方组件未变；隐私、scope、nonce 和唯一窗口分类断言；四份新 scope 报告的真实派发、条件、无后续 unknown 动作和清理。既有正式完整回归按未变源码复用，不以旧开发自评代替正式检查。第二轮 Runtime 三项检查全部通过，全新独立 Verifier Action21 对 A1–A21 逐项验收通过；用户已明确接受并授权本地归档、提交。官方限制、重建差异与 fixture/Desktop 边界仍保留，详见正式验收报告。

共保存 22 份报告：首轮 14 份、窗口测量修订前 4 份、唯一目标窗口补验 4 份；原始失败从未改写。均以 packed apply→六个公开工具→真实 runner/官方 CLI/daemon/扩展操作自有 Agent Window 的无敏感 fixture。宿主注册、模型元数据和附件接口为 fixture，**不代表安装到在用 Desktop，不证明实际 Desktop UI 或真实附件授权服务通过**。全部报告终态 `sessions=0`、`pendingCleanup=0`。

## 常规功能证据

Chrome、Edge 各 18 组普通功能有有效通过证据：control、wait、evaluate、取消、超时、三类上传、缺失文件拒绝、下载、HTML、emulate、hover、drag、step、view、incognito、dialog。

| 报告 | 实际结果及补测关系 |
| --- | --- |
| [Chrome 原始常规](candidate04-live-chrome-main/report.json) | 16 项通过，隐身 helper 断言失败；HTML 节点被旧脱敏器移除，另补证 |
| [Chrome 隐身补验](candidate04-live-chrome-incognito-regular-tab/report.json) | 公开工具拒绝借用普通 Agent tab，`incognito_borrow_disabled`；[较早补测](candidate04-live-chrome-incognito/report.json)也保留 |
| [Edge 原始常规](candidate04-live-edge-main/report.json) | 14 项通过，HTML 证据另补；原 outcome 没有被用作缺失 HTML 的证明 |
| [Edge 隐身补验](candidate04-live-edge-incognito-regular-tab/report.json) | 普通 Agent tab 借用被公开工具拒绝 |
| [Edge 单文件](candidate04-live-edge-upload-single/report.json)、[多文件](candidate04-live-edge-upload-multiple/report.json)、[drop](candidate04-live-edge-upload-drop/report.json) | 实际文件名与内容通过，无 unknown；不宣称普遍修复官方撤销问题 |
| [Chrome HTML](candidate04-live-chrome-html/report.json)、[Edge HTML](candidate04-live-edge-html/report.json) | 完整 5,784 / 5,764 bytes，截断各 1,024 bytes；中文/emoji、字节、truncated、拒绝覆盖通过，正文未存报告 |

## 截图 scope 补验与未达成项

**没有新的 fullPage PNG/像素成功证据。** 插件正向的 current/follow、附件、排他输出、停止后保留和失败清理由回归覆盖；真实浏览器侧按已确认合同记录精确官方拒绝，不计图像功能成功。

下列四份各使用独立新 fixture/session、fresh sync 和唯一 background 标题 nonce；OS 探针遍历全部窗口且前后均恰好一个匹配，只记录计数和布尔，不输出标题/句柄。目标 tab 非活动、同 Agent Window 的兄弟 tab 活动；目标窗口前后均非前台。每份恰有一次真实 screenshot 调用，`args.scope` 与请求一致；均收到 `cdp_failed/page_hidden/effect_state:unknown`，随后只清理，不重放。

| 新报告 | scope | 结果 |
| --- | --- | --- |
| [Chrome current](candidate04-live-chrome-scope-current-unique/report.json) | current | accepted-limitations；passed=false；无 output/partial attachment，清理为 0 |
| [Chrome follow](candidate04-live-chrome-scope-follow-unique/report.json) | follow | 同上 |
| [Edge current](candidate04-live-edge-scope-current-unique/report.json) | current | 同上 |
| [Edge follow](candidate04-live-edge-scope-follow-unique/report.json) | follow | 同上 |

四份 `scriptSha256` 都是 `5e4554d734e4bd25bf56dc9cb449c4dbcda92a8b925833f65fedc8e56919b714`，与提交源码一致。[四格审计](candidate-04/scope-audit-unique.json)验证 scope、唯一窗口条件、真实错误、无 partial、unknown 后无业务动作和最终清理。Edge 两份因结果根目录拼写错误，结束后仅移动本次目录至正确位置，没有重跑或改写 JSON；原 baseline 绝对路径仍忠实保留，[迁移映射及文件哈希](candidate-04/evidence-relocation.json)指向当前文件。

以下旧截图报告原样保存，**不用于取代最终四格条件证据**：[Chrome 普通](candidate04-live-chrome-screenshot/report.json)的 OS 探针 unavailable；[Edge 普通](candidate04-live-edge-screenshot/report.json)、[Chrome 后台](candidate04-live-chrome-background/report.json)、[Edge 后台](candidate04-live-edge-background/report.json)产生于窗口匹配唯一性尚未校验的版本。进一步的 [Chrome current](candidate04-live-chrome-scope-current/report.json)在测量前提处失败且没有截图派发；[Chrome follow](candidate04-live-chrome-scope-follow/report.json)、[Edge current](candidate04-live-edge-scope-current/report.json)、[Edge follow](candidate04-live-edge-scope-follow/report.json)虽有实派，但也沿用歧义标记。它们的历史 outcome 没有改写，不能据其断定具体目标窗口状态。

定向重现仅在新的结果目录调用 `node scripts/test-enhancement-live.mjs <candidate.tgz> <new-results-dir> <chrome-id> <edge-id> chrome screenshotBackground follow`；另一浏览器或 scope 分别使用新的 invocation。环境前提不可核实时必须停止，不能抢焦点或重试原 unknown 操作。

## 安装与回退

在用 Desktop 未安装新包、未重启；没有发布、推送、触发远端 CI 或改写历史 tag。交付不含定制扩展。候选 03 的 ZIP、proof 与配套包仅作撤回历史。

另获在用 profile 安装授权后，先备份实际配置和旧包，确认无未完成任务，再用验证过的 tarball；页面刷新不能证明插件加载。回退 `0.3.3-dsh.3` 时成套恢复其官方 0.3.3 CLI、daemon、扩展。改用官方 0.4.1 DSH 插件前停用增强包，七类增强不保证保留。不手改安装目录 node_modules。

[历史 0.3.3 记录](../browserskill-dsh-enhancement/DELIVERY.md)保持原样。正式验收、用户结果接受与 Runtime 归档已完成；成果保留在父仓库 `main` 与子仓库 `dsh/plugin-parity-0.3.3`，仅本地交付，未推送或发布。
