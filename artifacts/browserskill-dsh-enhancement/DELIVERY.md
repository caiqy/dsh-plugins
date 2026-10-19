# BrowserSkill DSH 增强候选

- 官方基线：`dsh-plugin-v0.3.3` / `d9a78aed47874459ae1e44523a597e42dd9acf99`
- 长期维护分支：`packages/browser-skill` 内 [`dsh/plugin-parity-0.3.3`](https://github.com/caiqy/BrowserSkill/tree/dsh/plugin-parity-0.3.3)，后续在此分支合入官方稳定 tag、复用增强与测试
- 固定版本 tag：[`dsh-plugin-v0.3.3-dsh.1`](https://github.com/caiqy/BrowserSkill/tree/dsh-plugin-v0.3.3-dsh.1)，指向下面的最终 HEAD；分支及 tag 已推送到 fork，未创建 GitHub Release
- 实现补丁提交：`6ea57e9223f0ef082db1c729da4bc7af3e7aa7a9`
- 最终 HEAD：`cb389bb4a31cfa200ba179e9279e2f6a347509d4`（补充复现检查说明，无运行时代码变化）
- 包名：`@wxg-prc-cpg/browser-skill-dsh-plugin`
- 版本：`0.3.3-dsh.1`
- [候选 tgz](./wxg-prc-cpg-browser-skill-dsh-plugin-0.3.3-dsh.1.tgz)
- SHA256：`81d7eec2d2315b0e95d5170d5a09e4c45d2269ed17c8f702485ecc71028e40b9`
- [实现 patch](./0001-feat-dsh-expose-official-browser-capabilities-throug.patch)
- [复现说明 patch](./0002-docs-dsh-pin-temporary-package-lint-and-explain-CSS-.patch)
- [接口、复现、安装、升级和回退说明](../../packages/browser-skill/packages/dsh-plugin-browserskill/docs/dsh-enhancement.md)

六个公开工具保持原名，新增 JS、上传下载、整页截图、浏览器列表、扩展模拟、悬停诊断、HTML 导出、固定等待及会话名称。复用原共享执行器、会话归属/FIFO、取消、观察和清理；CLI、daemon 和扩展保持官方实现。

## 安装前候选真实浏览器证据

测试从上述 tgz 解包，在无关 cwd 调用包的 apply 及六个公开工具，默认真实 runner → 官方 CLI/daemon/扩展。CLI、daemon、两端扩展均为 0.3.3；浏览器 155.0.0.0、协议 1.3、无版本偏差。测试仅使用本地无敏感页面和文件。

| 浏览器 | 证据与结果 |
| --- | --- |
| Chrome 2303ebf6 / chrome | [主体报告](./live-phase-4-chrome/report.json) 的非上传七组通过；首次三组上传因扩展文件网址权限失败。用户开启权限后，[上传补测](./live-phase-5-chrome-upload/report.json) 的单文件、多文件 input 和 drop 全部通过，并读取实际 File.text 校验。合并覆盖 10/10 功能组 |
| Edge daae7a27 / edge-gmail3 | 用户恢复原实例后，[完整报告](./live-phase-6-edge/report.json) 10/10 功能组通过、failures 为空，39 次调用含预期错误 |

覆盖 JS 值/Promise/两个 false/页面异常/真实超时与取消，文件读取错误、下载新路径/默认保护/显式覆盖、fullPage current/follow/PNG 与旧路径保护、HTML UTF-8 回执与旧路径保护、模拟预设和覆盖/false/off、主动悬停诊断、daemon 等待及取消、命名 tracked start、停止与自有列表清空。Chrome 969×2296 和 Edge 961×2296 显式 PNG 均在 stop 后保留。

附件保存、注册上下文与模型元数据使用本地宿主接口 fixture；真实 PNG 字节及 renderer image block 已验证。此记录不宣称真实 desktop GUI、真实 DSH 附件服务或历史 UI 名称读回已验收。会话 name 的真实 CLI 参数、tracked start 成功和终端标题已验证。

## 正式验收与授权边界

上游 `lint:publint` 未声明工具依赖，正式检查使用临时固定版本 `publint@0.3.25`，不改项目依赖。客户端重复构建只有纯字符串 CSS classMap 的键顺序不确定；交付对比仅在这些映射排序后比较，其他客户端代码、runtime、类型、skill 和包元数据逐字节核对，tgz 的 SHA256 保持上述值。

Comet Runtime 完整 typecheck、604/604 测试、build、publint、上游包检查和交付归档一致性均通过；审核子代理逐项核对 A1–A14 全部通过。正式记录已归档至 [Comet 验收记录](../../docs/comet/archive/2026-10-19-browserskill-dsh-enhancement/verification.md)。其中安装前的测试限制是当时的历史记录，安装后补证见下文。

2026-10-19 已按用户授权将同一候选安装到 desktop，用户重启后，通过当前会话注入的公开 bsk_* 工具完成两浏览器实际调用；JS、文件传输、模拟、悬停、等待、HTML 导出、整页截图和真实 DSH 附件均通过。测试会话已停止；按用户“实际验证正常再归档”的授权完成本地 Comet 归档。

[desktop 安装后实测记录与截图](./desktop-installed/VERIFICATION.md) 单独记录本次实际宿主测试及 HTTP(S) 页面要求、网页认证范围。实际 DSH 附件已验证；独立 Chrome 访问 desktop 网页时需要认证，未读取凭据或宣称已遍历网页内部 UI。

2026-10-19 已按用户授权将长期增强分支和上述固定版本 tag 推送到 `caiqy/BrowserSkill`；未合并到官方仓库，未创建 PR、GitHub Release 或发布 npm。后续复用长期增强分支，合入官方稳定 tag 后验证和打包，维护约定见 [工作区说明](../../README.md#browserskill-子仓库)。官方 npm 更新会覆盖本地增强；安装及官方 0.3.3 回退步骤见上述交付说明。
