# dsh-browser-handoff

## v0.3.0 — OAuth / system-browser handoff

Embedded Android WebView sign-in is intentionally rejected by some identity providers, including Google in some flows. v0.3.0 does **not** try to bypass that policy by endlessly changing User-Agent strings.

When the native `browser` tool reports `action: "external"`, this plugin now renders a user-clicked **用系统浏览器打开 / Open in system browser** button in the DSH conversation. The click runs inside DSH's main Web UI; on Android, the existing native `SystemWebHost` forwards that external `window.open` navigation to the user's system browser.

Security and capability boundary:

- passwords, OTPs, account selection and payment confirmation stay in the system browser;
- no background launch is claimed before the user clicks;
- system-browser cookies are **not** assumed to be shared with the AI Browser WebView;
- a seamless return of login state requires the target site to provide an app callback/deep link or a future native target-scoped Browser Broker.

The human-handoff card also offers the system-browser button when a URL is available.

DSH 内置 **AI 浏览器 / 人工接管桥**。

## v0.2.1

v0.2 不再把“AI 操作中”当成装饰状态：模型现在拥有真实、可验证的浏览器工具，并由工具结果驱动 DSH 里的受控浏览器页面。

### 已实现

- `browser_open`
  - 模型申请打开 HTTP(S) 页面；
  - 必须经过 DSH 原生一次性审批；
  - 批准后客户端自动打开 **AI 浏览器** tab；
  - 支持 `auto / desktop / iphone / ipad` 视口预设。
- `browser_read_public`
  - AI 真实读取公开网页正文与编号链接；
  - 不依赖 iframe DOM；
  - 支持 Desktop / iPhone / iPad HTTP User-Agent；
  - 不使用用户浏览器 Cookie，不读取登录态；
  - 不执行目标页面 JavaScript；
  - 阻止 localhost、私网、保留地址与 DNS 解析到私网的目标；
  - 重定向逐跳重新校验；
  - 15 秒超时、1.5 MB 响应上限、正文 24k 字符上限。
- `browser_request_human_help`
  - 登录、CAPTCHA、2FA、账号选择、支付确认等步骤请求用户接管；
  - 密码和 OTP 只在网页中输入，不要求发进聊天。
- `browser_handoff_capabilities`
  - 向模型公开真实能力边界，避免模型假装自己已经控制跨域 iframe。
- 兼容旧版 `browser_request_access`
  - 旧的 `mode=read-only/interactive` 仍可使用；
  - 新调用应使用 `intent` 表示读写意图、`mode` 表示设备视口。

### 受控浏览器页面

插件现在注册独立的 `browser-handoff` 页面，不再只调用官方 Browser 的默认 iframe。

工具栏包含：

- 后退 / 前进（仅插件已知的显式导航历史）；
- 刷新；
- 地址栏；
- 外部浏览器打开；
- 设备布局：
  - 自动；
  - 电脑版：1366px；
  - iPhone：390px；
  - iPad：820px。

在手机上选择电脑版时，会把 1366px viewport 缩放进可用宽度，因此响应式站点会按桌面宽度布局。

## 必须区分：viewport 与 User-Agent

Web 插件可以真实改变 iframe 的 **viewport 宽度**，但不能绕过浏览器同源策略去修改跨域 iframe 的 User-Agent。

因此：

- **可见页面**：Desktop/iPhone/iPad 当前是 viewport/layout 模拟，UA 仍由手机 WebView 决定；
- **AI 公共读取**：`browser_read_public` 可以实际发送对应 Desktop/iPhone/iPad UA；
- 如果目标站点只看响应式宽度，受控浏览器会得到对应布局；
- 如果目标站点强依赖 UA，视觉页面仍可能返回 Android 版本。

插件不会把 viewport 模拟伪装成完整设备仿真。

## AI 能做什么

当前 v0.2 的真实能力：

1. AI 调用 `browser_open`，经用户批准后打开目标页；
2. AI 调用 `browser_read_public` 获取公开页面正文和链接；
3. AI 根据返回链接继续读取或打开下一页；
4. 遇到登录、验证码或必须使用用户登录态的页面时调用 `browser_request_human_help`；
5. 用户在同一个受控浏览器 UI 中完成人工步骤。

因此“AI 查看公开信息”已经是真实执行，不再是假状态。

## 当前仍不能做什么

### 跨域同标签 DOM click/type

Web/Android DSH 当前 Browser 是跨域 iframe。父页面不能安全读取或驱动其内部 DOM，所以纯插件不能可靠完成：

- 读取用户登录后的 DOM；
- 点击任意跨域按钮；
- 给登录后的跨域输入框自动输入；
- 读取密码、验证码；
- 无缝接管/交还同一个跨域页面 DOM。

这些能力不能靠前端插件绕过。

真正的下一阶段必须增加 **native target-scoped Browser Broker**：

```text
Session + task + tab + origin + permissions
                 ↓
        Native Browser Broker
          ↙             ↘
      User UI            Agent
```

Broker 必须保证：

- 绑定唯一 session / task / tab / origin；
- AI 操作时与人工输入互斥；
- 用户点击“我来操作”后 AI 立即暂停；
- 用户点击“交给 AI”后先重新观察页面，再继续；
- 密码、OTP、支付字段不可回传模型；
- 每次写操作仍经过权限策略。

在 Native Broker 落地前，`sameTabAiAutomation=false` 是正确状态，不允许用 UI 文案伪装成 true。

## 安装

Android DSH 某些环境无法执行 git，可直接安装 GitHub source tarball。更新旧版时建议先卸载旧插件，再安装当前固定提交版本，最后完全退出并重新启动 DSH。


### v0.2.1 permission flow

`browser_open` and the compatibility alias `browser_request_access` no longer depend on `ctx.approval`.
They use the blocking `ctx.userQuestions.ask()` approval presentation instead.

This matters on DSH sessions where native Approval prompts are disabled: those sessions used to auto-return
`rejected` without showing any UI. The new flow shows a browser permission decision with
“本次允许 / 拒绝”; the tool call stays pending until the user answers, and returns `approved` only after
“本次允许”.

The decision is one-shot. It does not grant access to passwords, OTP values, payment confirmation, or unrelated tabs.
