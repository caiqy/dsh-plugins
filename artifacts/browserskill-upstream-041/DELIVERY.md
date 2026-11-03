# BrowserSkill 0.4.1：仅 DSH 插件增强

本记录保存候选 04 的源码、开发检查与真实浏览器证据。正式检查、独立 Verifier、用户结果接受及归档以 Comet Runtime 记录为准，源码提交和候选构建本身不代表验收完成。**候选 03 的定制扩展与配套插件已撤回，不能加载或安装。** 浏览器扩展、bsk CLI/daemon 和协议保持官方原版。

## 候选 04 与源码

- 包：[@caiqy/browser-skill-dsh-plugin@0.4.1-dsh.1](candidate-04/caiqy-browser-skill-dsh-plugin-0.4.1-dsh.1.tgz)，141,007 bytes，16 entries。
- SHA256：`26ee94324c96d95a069ec4d9656f502dd380e9bfce3d431840e2809ea58c374f`。
- SRI：`sha512-zRTfxLBNxNZCX+8m2BeCTksZJEl8eGZon6JwqY1ybYN1xCvwJBxr7s3jKkhsdOG1HCQOIY/MOMgsJMdKcaNp0A==`。
- [npm pack 回执](candidate-04/plugin-pack-receipt.json)、[初始源码回执](candidate-04/source-provenance.json)、[最终源码回执](candidate-04/source-provenance-final.json)、[逐报告及有效覆盖审计](candidate-04/live-report-audit-final.json)。
- 官方固定来源：[`dsh-plugin-v0.4.1`](https://github.com/Tencent/BrowserSkill/tree/dsh-plugin-v0.4.1)，`b8f2d4f0fa35c8c7c866229e1cf3b3329ae39de5`。
- 长期分支 `dsh/plugin-parity-0.3.3`，最终源码 `feaa7f60498f43bd6baf21575407ee797ced01c2`。合并提交 `985ea589902b387de1a96366c89ef95765d936f8`；`22f1b63a3b6e83119a698ffd9f68c74ce2c9db93` 撤销全部扩展定制；`abc7d02da2a35cfd70e20eb3bba83d797b062ed8` 恢复官方组件说明；`0814f3354b945c27ff2707b7d9ccbd8c4b7cca0c` 修正隐身测试的公开接口调用；最终提交修正 HTML 报告脱敏。后两次仅改实跑脚本，不改变 tgz 内容。
- extension、CLI/daemon/protocol、vom/i18n、Cargo 的已跟踪源码相对官方固定提交无差异，相关路径无额外未跟踪源码。旧忽略构建产物只作撤回历史保存，从未加载。
- 实跑配套：CLI、daemon、扩展均为官方 0.4.1，协议 1.8；Chrome `2303ebf6` / 155、Edge `d408371e` / 156，均无版本偏差。

## 已确认范围

[brief](../../docs/comet/changes/browserskill-upstream-041/brief.md) 和[完整目标规格](../../docs/comet/changes/browserskill-upstream-041/specs/browserskill-dsh-capabilities/spec.md) 的 A1–A21 已完整确认。复用官方 evaluate/upload/download、共享控制、drag/step/view/incognito/dialog；保留七类插件增强与所有相关位置参数的字面量保护。**增强只修改 DSH 插件及必要发布、测试和文档适配，不定制浏览器扩展或 bsk。**

用户已接受：官方后台 fullPage 不保证等效，Edge 上传在控制撤销时可能返回不确定结果。限制不算功能成功，也不能豁免参数错误、其他错误、未执行用例或清理失败。unknown 不重放；约定范围内 fresh-sync 只读核对一次后停止。不自动置顶、录像保活、改设置或绕过守卫。

## 开发检查与实跑边界

插件生产源码完整回归为 32 文件、779 pass；10 个默认 browser skip 不计为浏览器通过。官方组件说明修订后，技能 5/5、完整插件构建、实际打包及 9 个技能资源/无关 cwd 检查通过，入口 4,391 bytes。实跑脚本的脱敏、结果完整性、限制分类和失败优先级均留有可运行断言。正式重复检查由 Runtime 执行并记录。

以下 14 份报告均绑定同一 tgz SHA256，经 packed apply→六个公开工具→真实 runner/官方 CLI/daemon/扩展。只在自有 Agent Window 操作无敏感 fixture。宿主注册、模型元数据和附件接口为 fixture，**不代表已安装到在用 Desktop，不证明实际 Desktop UI 或真实附件授权服务通过**。所有报告最终 `sessions=0`、`pendingCleanup=0`。

## 常规功能的有效证据

Chrome、Edge 各有 18 组常规功能的通过证据：control、wait、evaluate、取消、超时、三类上传、本地缺失文件拒绝、下载、HTML、emulate、hover、drag、step、view、incognito、dialog。审计按功能指向原始报告及定向补测，没有把历史失败改成通过。

| 报告 | 归档结果与补测关系 |
| --- | --- |
| [Chrome 原始常规](candidate04-live-chrome-main/report.json) | 可见 16 项通过，隐身脚本断言失败；HTML 节点被旧脱敏器移除，不能用该文件替代 HTML 明确证据 |
| [Chrome 隐身定向](candidate04-live-chrome-incognito-regular-tab/report.json) | 对正常 Agent tab 的借用经公开工具拒绝，`permission_denied/incognito_borrow_disabled`；补充[较早隐身补测](candidate04-live-chrome-incognito/report.json)也保留 |
| [Edge 原始常规](candidate04-live-edge-main/report.json) | 归档可见 14 项通过；原 outcome 为 passed，但旧脱敏器移除了 HTML 节点，HTML 另行补证 |
| [Edge 隐身定向](candidate04-live-edge-incognito-regular-tab/report.json) | 正常 Agent tab 借用被公开工具以 `incognito_borrow_disabled` 拒绝 |
| [Edge 单文件上传](candidate04-live-edge-upload-single/report.json) | 实际文件名与内容通过，无 unknown |
| [Edge 多文件上传](candidate04-live-edge-upload-multiple/report.json) | 实际文件名与内容通过，无 unknown |
| [Edge drop 上传](candidate04-live-edge-upload-drop/report.json) | 实际文件名与内容通过，无 unknown |
| [Chrome HTML](candidate04-live-chrome-html/report.json) | 完整导出 5,784 bytes，截断 1,024 bytes，UTF-8 中文/emoji、字节、truncated、拒绝覆盖断言通过 |
| [Edge HTML](candidate04-live-edge-html/report.json) | 完整导出 5,764 bytes，截断 1,024 bytes，同项断言通过 |

本轮 Edge 三类上传成功只证明这些 fixture 操作成功，**不代表普遍修复官方控制撤销问题**。HTML 报告现保留 feature 结果、字节和截断字段，同时去除 HTML/text 正文。旧报告未重写。

## 整页截图与未达成项

**本轮没有整页截图成功报告，也没有新的 fullPage PNG/像素成功证据。** current/follow、附件、排他导出和失败清理的插件正向处理有回归覆盖；实际浏览器拒绝另行记录。

| 报告 | 实际结论 |
| --- | --- |
| [Chrome 普通整页截图](candidate04-live-chrome-screenshot/report.json) | 原样保留 failed：`cdp_failed/page_hidden/effect_state:unknown`；前后台探针不可用，既不计成功，也不计合格后台限制证据 |
| [Edge 普通整页截图](candidate04-live-edge-screenshot/report.json) | accepted-limitations，passed=false；有自有窗口非前台证据及官方可见性拒绝 |
| [Chrome 非活动后台目标](candidate04-live-chrome-background/report.json) | accepted-limitations，passed=false；目标非活动、同 Agent Window 兄弟 tab 活动、Windows 布尔证据及官方拒绝均保存 |
| [Edge 非活动后台目标](candidate04-live-edge-background/report.json) | 同上；保留拒绝，不宣称后台等效成功 |

Chrome 普通截图的测量失败未被重分类。相同 PowerShell helper 的独立只读探针耗时 1,455 ms，未复现 5 秒超时，因此没有放宽 timeout 或重试未知截图操作。独立后台报告提供已确认范围内的限制证据。

## 安装与回退

在用 Desktop 未安装新包、未重启；没有发布、推送、触发远端 CI 或改写历史 tag。当前交付不包含定制扩展；候选 03 的 ZIP、目录、proof 和插件包仅作撤回证据。父仓库 gitlink 以实际 Git 记录为准。

若另获在用 profile 安装授权，先备份实际配置与原包，确认无未完成任务，再使用已验证 tarball；页面刷新不能证明插件已加载。回退到旧公开 `0.3.3-dsh.3` 时成套恢复其官方 0.3.3 CLI、daemon 和扩展。改用官方 0.4.1 DSH 插件前停用增强包以免重复注册，七类增强不保证保留。不手改已安装 node_modules。

[历史 0.3.3 交付记录](../browserskill-dsh-enhancement/DELIVERY.md)保持原样。正式检查与用户结果接受由 Comet 另行记录；开发检查、实跑组数和限制声明都不能代替该步骤。
