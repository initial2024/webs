# dsh-browser-handoff

DSH 内置浏览器 + AI 权限申请 + 人工接管桥。

## v0.1.0

本版本使用 DSH 官方 Browser 与 Approval 基础设施，不复制独立 HTTP companion。

已实现：

- 自动启用 Web/Android Profile 的官方 `ui-sidebar-browser`。
- `browser_request_access`：模型申请访问某个 HTTP(S) 页面，必须经过 DSH 原生一次性审批。
- `browser_request_human_help`：模型遇到登录、验证码、2FA、账号选择或其他人工步骤时明确请求接管。
- `browser_handoff_capabilities`：向模型公开真实能力边界，防止模型假装已经控制当前 iframe。
- 专用工具卡：审批成功后可以从原聊天直接打开 DSH Browser。
- Composer 下方提供“浏览器”快捷入口。

### 安全边界

v0.1 不宣称 AI 能控制 Web/Android Sidebar Browser 的同一个跨域 iframe。官方 Web Browser 使用 iframe，受同源策略与站点 frame policy 约束。当前没有公开的 target-scoped automation broker，可以安全把这个 iframe 直接交给 browser-use。

因此：

- AI 可以申请浏览、触发 Browser、请求人工帮助；
- 用户可以在 DSH 内置 Browser 中登录、输入验证码和手动操作；
- 不会读取密码、验证码或其他输入框内容；
- 不会把整个浏览器或其他标签页授权给模型；
- 同标签 AI 自动化标记为 `broker-required`，留给 v0.2。

## 目标 v0.2

增加受认证、target-scoped 的 Browser Handoff Broker：

```
Session + task + tab + origin + permissions
                 ↓
        Browser Target Broker
          ↙             ↘
     User UI          browser-use
```

Broker 必须保证：单标签授权、人工接管时 AI 停止输入、交还后复用同一页面状态、结果回原 Session。
