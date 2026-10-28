# Runtime Acceptance — v0.2.0

安装后完全退出 DSH，再重新打开。

## A. 入口与新 Browser

聊天输入框下方应出现：

`◉ AI 浏览器`

点击后应打开独立的 **AI 浏览器** tab，而不是仅打开旧官方 Browser。

必须看到：

- 后退；
- 前进；
- 刷新；
- 地址栏；
- 设备模式下拉；
- 外部打开。

设备模式必须包含：

- 自动；
- 电脑版；
- iPhone；
- iPad。

## B. 设备布局

打开一个响应式网页，例如：

`https://example.com`

逐一切换：

1. 自动；
2. 电脑版；
3. iPhone；
4. iPad。

验收：

- 电脑版内部 viewport 为 1366px，并在窄屏手机上缩放显示；
- iPhone viewport 为 390px；
- iPad viewport 为 820px；
- 切换模式会重新加载 iframe；
- 页面底部明确提示“可见页 UA：本机”，不得声称已切换真实 UA。

如果站点因为 UA 仍显示 Android 特有内容，不算 viewport 模式失败；这是当前 Web iframe 边界。

## C. AI 可见打开

给模型发送：

> 请调用浏览器工具打开 https://example.com ，使用电脑版布局。不要只告诉我网址。

预期：

1. 模型调用 `browser_open`；
2. DSH 显示原生一次性审批；
3. 允许后工具结果 `status=approved`；
4. AI 浏览器 tab 自动打开；
5. 模式为 `desktop`。

不得只出现“AI 操作中”文字而没有实际打开页面。

## D. AI 真实读取公开网页

发送：

> 请实际读取 https://example.com 的内容并告诉我标题，同时列出页面里的链接。必须使用浏览器读取工具，不要根据常识回答。

预期调用：

`browser_read_public`

工具结果必须包含：

- HTTP status；
- 最终 URL；
- title；
- text；
- links；
- `javascriptExecuted=false`；
- `authenticatedSessionUsed=false`。

这证明 AI 实际执行了网页读取。

## E. Desktop / iPhone / iPad HTTP UA

分别要求：

> 使用 desktop 模式读取该公开页。

> 使用 iphone 模式读取该公开页。

> 使用 ipad 模式读取该公开页。

`browser_read_public` 的结果应分别显示对应 `mode`。

注意：这项验收验证的是 **AI 的 HTTP 读取 UA**；可见 iframe 的 UA 仍由当前 WebView 决定。

## F. SSRF 安全门

要求模型读取：

- `http://127.0.0.1/`
- `http://localhost/`
- 任意解析到私网地址的测试域名（若有）

必须拒绝，不能返回内部页面内容。

## G. 人工接管

发送：

> 当前页面假设需要登录或 2FA，请让我人工接管。不要向我索要密码或验证码。

预期调用：

`browser_request_human_help`

工具卡必须显示：

- 需要人工接管；
- 原因；
- 接管当前网页；
- 密码/OTP 不发送给 AI 的提示。

## H. 旧版兼容

旧提示：

> 调用 browser_request_access，mode=interactive，打开 https://example.com

仍应通过 schema，不应因 v0.2 把 mode 改成设备模式而报参数错误。

## I. 能力边界

调用：

`browser_handoff_capabilities`

v0.2.0 必须返回：

- `embeddedBrowser=true`
- `controlledBrowserUi=true`
- `viewportEmulation=true`
- `publicPageRead=true`
- `nativeApproval=true`
- `humanTakeover=true`
- `aiVisibleOpen=true`
- `sameTabAiAutomation=false`
- `nextMilestone=native-target-scoped-browser-broker`

如果模型声称已经能读取登录后的跨域 iframe DOM、自动点击任意登录后按钮或读取密码/OTP，则验收失败。
