import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-browser-handoff'
export const inject = ['tools', 'approval']

function targetOf(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('browser target must be a valid absolute HTTP(S) URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('browser target must use http:// or https://')
  }
  if (url.username || url.password) {
    throw new Error('browser target must not contain embedded credentials')
  }
  return { href: url.href, origin: url.origin }
}

function out(value) {
  return JSON.stringify(value)
}

const stringOutput = {
  schema: { type: 'string' },
  render: (_args, value) => [{ type: 'text', text: value }],
}

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'browser_request_access',
    description:
      'Request one-shot user approval before opening an HTTP(S) target in the DSH embedded Browser. '
      + 'Use this before asking the user to browse or sign in. This tool DOES NOT grant DOM automation: '
      + 'Web/Android Browser automation still requires a target-scoped broker. Never claim that approval lets you read passwords, OTPs, or unrelated tabs.',
    parameters: {
      url: { type: 'string', required: true, description: 'Absolute HTTP(S) URL to open.' },
      reason: { type: 'string', required: true, description: 'Short user-facing reason for browsing this site.' },
      mode: {
        type: 'string',
        enum: ['read-only', 'interactive'],
        description: 'Requested intent. interactive means the user may manually interact; it is not an AI automation grant.',
      },
    },
    output: stringOutput,
    async execute(args, exec) {
      const target = targetOf(args.url)
      const mode = args.mode ?? 'read-only'
      const reason = String(args.reason || '').trim()
      if (!reason) throw new Error('browser access requires a non-empty reason')

      const outcome = await ctx.approval.request({
        agent: exec.agent,
        toolName: 'browser_request_access',
        callId: exec.callId,
        reason: `Open ${target.origin} in the DSH embedded Browser (${mode}): ${reason}`,
        signal: exec.signal,
      })

      if (outcome !== 'allowed-once') {
        return out({
          status: 'denied',
          outcome,
          url: target.href,
          origin: target.origin,
          mode,
          broker: 'required-for-same-tab-ai-control',
        })
      }

      return out({
        status: 'approved',
        outcome,
        url: target.href,
        origin: target.origin,
        mode,
        lease: String(exec.callId),
        permissions: mode === 'interactive'
          ? ['open', 'user-read', 'user-click', 'user-type', 'user-navigate']
          : ['open', 'user-read'],
        forbidden: ['read-password', 'read-otp', 'payment-without-user', 'other-tabs'],
        broker: 'required-for-same-tab-ai-control',
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_request_human_help',
    description:
      'Pause the browser workflow and ask the user to take over for login, CAPTCHA, 2FA, account choice, '
      + 'sensitive confirmation, or any step the current browser automation cannot safely perform. '
      + 'Do not ask the user to reveal passwords or OTP values in chat.',
    parameters: {
      reason: { type: 'string', required: true, description: 'What the user must do in the browser.' },
      url: { type: 'string', description: 'Optional HTTP(S) page to open for the handoff.' },
    },
    output: stringOutput,
    async execute(args) {
      const reason = String(args.reason || '').trim()
      if (!reason) throw new Error('human handoff requires a non-empty reason')
      let url
      let origin
      if (args.url) {
        const target = targetOf(args.url)
        url = target.href
        origin = target.origin
      }
      return out({
        status: 'human-required',
        reason,
        ...(url ? { url, origin } : {}),
        instruction: 'User should complete the sensitive/manual step in the embedded Browser, then tell the agent to continue.',
        secretPolicy: 'Do not request passwords or OTP values in chat.',
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_handoff_capabilities',
    description:
      'Report the Browser Handoff capability boundary. Use this instead of guessing whether the current DSH client can automate its embedded Browser.',
    parameters: {},
    output: stringOutput,
    async execute() {
      return out({
        embeddedBrowser: true,
        nativeApproval: true,
        humanTakeover: true,
        sameTabAiAutomation: false,
        sameTabReason: 'Web/Android Sidebar Browser is a cross-origin iframe and no authenticated target-scoped broker is exposed yet.',
        nextMilestone: 'target-scoped-browser-broker',
      })
    },
  }))
}
