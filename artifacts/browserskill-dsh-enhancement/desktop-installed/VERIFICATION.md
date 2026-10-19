# desktop 安装后实际调用验证

2026-10-19（Asia/Shanghai）。用户授权安装 desktop，用户自行重启，再要求实际调用正常后归档。安装包为同一 `0.3.3-dsh.1`，SHA256 `81d7eec2d2315b0e95d5170d5a09e4c45d2269ed17c8f702485ecc71028e40b9`。已核对 profile 依赖和安装版本，已安装 runtime 与验收构建的 SHA256 相同。

本次直接使用 desktop 重启后注入的六个公开 `bsk_*` 工具，未使用候选解包 apply 或宿主 fixture；原始工具回执保存在会话 `session-3e0cdb6c-6654-409a-981c-1d4f5f31de39`。当前 desktop GUI URL 为 `http://127.0.0.1:63764`。

| 浏览器 | 实例及自有会话 | 结果 |
| --- | --- | --- |
| Chrome 155.0.0.0 / 扩展 0.3.3 / 协议 1.3 | `2303ebf6`，`ofex`，name=`desktop-installed-verification-chrome` | 下述功能实际调用通过，stop 成功 |
| Edge 155.0.0.0 / 扩展 0.3.3 / 协议 1.3 | `daae7a27`，`wvrd`，name=`desktop-installed-verification-edge` | 下述功能实际调用通过，stop 成功 |

- `session.browsers` 返回两端实际版本和可用状态，无 skew；命名 tracked start 正常。
- JS 返回普通值、Promise=42、布尔 false；显式 `awaitPromise:false` / `returnByValue:false` 返回 Promise 的远程对象信息。Edge 故意抛出 `desktop verification expected exception`，工具正确失败并保留堆栈。
- 两端实际多文件 input 上传，逐个 File.text 读取并核对中英文内容；单文件 drop 成功并读取内容，页面显示拖放成功。
- 两端实际下载，保存文件均为28字节，内容为 `DSH desktop download 验证\n`。
- Chrome 应用预设及覆盖，读回指定 UA、DPR=1.5、touch=0；Edge 读回指定 UA、DPR=1.5、touch=3；均正常 off。
- 两端 observe 返回 probeHover performed 和 debug 字段；随后实际 hover 并观察到 `Hover reveal verified 悬停内容`。
- 无会话 `wait-ms` 实际等待20ms成功。
- 两端 HTML 导出均为5179 UTF-8字节，模型仅收到路径/字节回执；本地读取核对中文页底内容和文件实际大小。
- HTTP 页面整页截图 Chrome scope=current、Edge scope=follow，显式 PNG 与真实 DSH 附件图像均成功。工具结果直接附带图片，附件存储来自实际宿主。
- 双方 stop 成功，随后的 owned session list 为空。显式截图在停止后仍存在；临时 localhost 服务已结束。

## 实际截图与导出

| 产物 | 尺寸 / 字节 | 实际 DSH 附件 SHA256 |
| --- | --- | --- |
| [Chrome 整页 PNG](./chrome-fullpage.png) | 969×1461，52495 bytes | `2284d08e07147fee027ea9a8ef0bae44c0ecc9373efb0f083dcbefd745544d0e` |
| [Edge 整页 PNG](./edge-fullpage.png) | 961×1461，51497 bytes | `4a9e9422cbc0a4f46c4b6eef87e7559b5bd49711709423054e6d765ec0a62da3` |
| [Chrome HTML](./chrome-export.html) | 5179 bytes | 导出回执无正文 |
| [Edge HTML](./edge-export.html) | 5179 bytes | 导出回执无正文 |

图片实际进入 `~/.dsh/attachments/v1/objects/`，分别位于上述摘要的 `22/`、`4a/` 分桶。此表记录工具给出的附件摘要；源 PNG 与宿主规范化附件允许编码不同。

## 约束与范围

首次在 about:blank 的本地 DOM 测试页尝试整页截图，两端按官方要求报 `Full-page screenshot requires a scriptable HTTP(S) page`。改用本机临时 HTTP 页面后，两端整页截图通过；无插件代码修改。未将初次失败记为成功。

独立 Chrome 打开 desktop 网页根地址时返回 `dsh web authentication required; reopen the URL printed by dsh web.`，没有获取凭据或绕过认证，因此不宣称该独立浏览器遍历过 desktop 网页内部 UI。已验证的是实际 desktop 注入工具、实际附件保存及工具结果中的图像。历史 UI 会话名称未人工读回。

先前 Runtime 的604项完整检查、包检查及14项审核结论继续有效，本次未重复执行。根据用户明确的条件授权，验证完成后接受结果并归档；归档提交为 `4dfbd3b16e765dcc22966e69e3ba03cdc010c877`。保留源码与目录，未进行远端推送、合并或发布。
