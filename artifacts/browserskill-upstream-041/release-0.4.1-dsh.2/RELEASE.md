# BrowserSkill DSH 0.4.1-dsh.2 公开发行

- 源码分支：`dsh/enhanced`；提交：`fb6f69ca51ed1a6e983c39ccf2553c580d1cd7a6`。本版移除 DSH 实时观察侧栏、浮窗、画中画、实时订阅和后台自动截图，保留六个 `bsk_*` 工具及主动截图的附件预览。浏览器扩展和 bsk CLI/daemon 未修改。
- [GitHub Actions 45344429599](https://github.com/caiqy/BrowserSkill/actions/runs/45344429599) 成功，固定上述源码提交；类型检查、构建、包检查和技能资源打包通过，测试 **648 passed / 11 skipped**（28 个文件通过、1 个文件跳过）。11 个跳过包含本机 bsk parser 用例及默认浏览器用例，不作为真实浏览器验证。
- npm：[`@caiqy/browser-skill-dsh-plugin@0.4.1-dsh.2`](https://www.npmjs.com/package/@caiqy/browser-skill-dsh-plugin/v/0.4.1-dsh.2)，通过 `npm-publish` 环境 OIDC 单次发布，未另推送发布 tag。`dsh` 标签为 `0.4.1-dsh.2`；`latest` 保持 `0.3.3-dsh.2`。
- npm 发布时间：`2026-11-24T07:00:58.061Z`（Asia/Shanghai 2026-11-24 15:00:58.061）；市场 `publishTimestamp` 为 `1795503658`。
- 公开归档 **91,245 bytes**，独立下载后与本次已测试 Actions artifact 逐字节一致；provenance 已生成。
- SHA256：`551dff2c0e65c5b9cb9c43411a3c721a4957f515605b09556a5454d2d697f172`。
- SHA512 SRI：`sha512-POV/cEVy5EQ2f/BSHtGYa2XbrU8+j8bFyHVngwPI0FNaHSoGT86tadlIWaaAvL7ny5jAd7UA5yd9z/2F04K7KA==`。
- [公开元数据及完整性回执](public-release.json)。市场索引通过既有 `pnpm sync:index browser-skill` 校验公开 npm 元数据及真实归档后同步，保留历史版本与其他插件；根发布/索引回归测试 **4 passed**。

本地 Windows 候选 SHA256 `8f4950b89f0d7f9a77e7d7af6636f6da84eb360d40b08bb05d3f7b18f589f433` 与 Linux Actions 发行归档不同，不混用两者哈希。此次没有新增 Desktop 或真实浏览器验证，没有安装插件或重启在用 DSH。

仍配套官方 CLI、daemon、Chrome/Edge 扩展 `0.4.1`、协议 `1.8`；不能同时启用官方 DSH 插件。[原验收及已知限制](../DELIVERY.md)保留为历史证据：后台 fullPage 不保证等效，Edge 控制 unknown 未宣称修复，跨环境字节复现未证明；已删除的 DSH 实时观察功能不再适用旧版验收结论。
