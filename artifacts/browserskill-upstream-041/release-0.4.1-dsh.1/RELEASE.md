# BrowserSkill DSH 0.4.1-dsh.1 公开发行

- 发布分支：`dsh/enhanced`。`main` 继续保留官方上游线；旧 `dsh/plugin-parity-0.3.3` 暂留迁移历史，不再作为默认发布入口。
- 源码提交：`3859a15a8af9ef382c9dc441a006cdd5b02f22db`，相对已验收 `8558a89fbc1eb2cc303ef17b9845c81615f4de11` 仅修改包主页与分支说明；浏览器扩展和 bsk 保持官方原版。
- [GitHub Actions](https://github.com/caiqy/BrowserSkill/actions/runs/41653164935) 已成功。类型检查、构建、778 个测试和打包技能资源通过；11 个 skip 包含本机 bsk parser 用例与默认浏览器用例，不算 CI 实跑通过。此前本地正式回归为 779 通过、10 跳过。
- npm：[`@caiqy/browser-skill-dsh-plugin@0.4.1-dsh.1`](https://www.npmjs.com/package/@caiqy/browser-skill-dsh-plugin/v/0.4.1-dsh.1)，`dsh` 标签已更新。未改动旧 `latest` 标签；DSH 市场使用精确版本及 `dsh` 发布渠道。
- 发布时间：2026-11-03 22:28:17.782（Asia/Shanghai）。npm OIDC provenance 已生成。
- 发布包为 Actions 从对应提交重新构建的归档，140,598 bytes；公开 npm 下载与该次已测试 Actions artifact 逐字节一致。
- SHA256：`399529ad999d89d5143a69ae1715be7d7da670cb4f23e37e8a1efd2905b7192c`。
- SHA512 SRI：`sha512-ZIN/OL744QV3e2fbKExID6THdGrdO8gOoZIdcanfIyfmCjAVRpPm1eLcPcxthgJ0Rdr1nx4wn0DmYVU31UeK8Q==`。
- [公开下载、元数据和完整性回执](public-release.json)。市场版本及发布时间由已验证 npm 元数据生成，保留历史版本与其他插件。

发布包与先前 Windows 候选 04 不是同一字节归档；候选 04 和其 22 份实跑报告原样保留，不把其哈希写成公开发行包哈希，也不宣称这次额外做了 Desktop 或浏览器实测。[已接受的限制与原验收记录](../DELIVERY.md)继续适用：后台 fullPage 不保证等效，Edge 控制 unknown 未宣称修复，严格跨环境字节复现未证明。

配套官方 CLI、daemon、Chrome/Edge 扩展 0.4.1，协议 1.8；不能同时启用官方 DSH 插件。此次仅发布与同步市场索引，没有安装或重启在用 Desktop。
