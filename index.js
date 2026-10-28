import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-browser-handoff'
export const inject = ['tools', 'approval']

const FETCH_LIMIT_BYTES = 1_500_000
const FETCH_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 5
const MAX_TEXT_CHARS = 24_000
const MAX_LINKS = 40

const USER_AGENTS = Object.freeze({
  auto: '',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
})

function out(value) {
  return JSON.stringify(value)
}

const stringOutput = {
  schema: { type: 'string' },
  render: (_args, value) => [{ type: 'text', text: value }],
}

function normalizeMode(value) {
  return ['auto', 'desktop', 'iphone', 'ipad'].includes(value) ? value : 'auto'
}

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
  return { href: url.href, origin: url.origin, hostname: url.hostname }
}

function ipv4Private(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true
  const [a, b] = parts
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224
}

function ipv6Private(address) {
  const value = String(address).toLowerCase()
  if (value === '::' || value === '::1') return true
  if (value.startsWith('fc') || value.startsWith('fd') || /^fe[89ab]/u.test(value)) return true
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length)
    return isIP(mapped) === 4 ? ipv4Private(mapped) : true
  }
  return false
}

function privateAddress(address) {
  const family = isIP(address)
  if (family === 4) return ipv4Private(address)
  if (family === 6) return ipv6Private(address)
  return true
}

async function assertPublicTarget(raw) {
  const target = targetOf(raw)
  const host = target.hostname.toLowerCase()
  if (
    host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
  ) {
    throw new Error('browser public read blocks localhost/private-network targets')
  }

  const directFamily = isIP(host)
  if (directFamily !== 0) {
    if (privateAddress(host)) throw new Error('browser public read blocks private/reserved IP targets')
    return target
  }

  const rows = await lookup(host, { all: true, verbatim: true })
  if (!rows.length) throw new Error('browser public read could not resolve target hostname')
  if (rows.some(row => privateAddress(row.address))) {
    throw new Error('browser public read blocks hostnames resolving to private/reserved addresses')
  }
  return target
}

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&#x27;/giu, "'")
    .replace(/&#x2F;/giu, '/')
    .replace(/&#(\d+);/gu, (_m, n) => {
      const code = Number(n)
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' '
    })
}

function textFromHtml(html) {
  return decodeEntities(
    String(html)
      .replace(/<!--[\s\S]*?-->/gu, ' ')
      .replace(/<(script|style|noscript|svg|canvas|template)\b[\s\S]*?<\/\1>/giu, ' ')
      .replace(/<br\s*\/?>/giu, '\n')
      .replace(/<\/(p|div|li|section|article|header|footer|h[1-6]|tr)>/giu, '\n')
      .replace(/<[^>]+>/gu, ' '),
  )
    .replace(/[ \t\f\v]+/gu, ' ')
    .replace(/\n[ \t]+/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

function titleFromHtml(html) {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(String(html))
  return match ? textFromHtml(match[1]).slice(0, 500) : ''
}

function linksFromHtml(html, baseUrl) {
  const links = []
  const seen = new Set()
  const re = /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/giu
  let match
  while ((match = re.exec(String(html))) !== null && links.length < MAX_LINKS) {
    const raw = decodeEntities(match[2]).trim()
    if (!raw || raw.startsWith('#') || /^(?:javascript|data|mailto|tel):/iu.test(raw)) continue
    let href
    try {
      href = new URL(raw, baseUrl)
    } catch {
      continue
    }
    if (!['http:', 'https:'].includes(href.protocol)) continue
    const key = href.href
    if (seen.has(key)) continue
    seen.add(key)
    links.push({
      index: links.length + 1,
      text: textFromHtml(match[3]).replace(/\s+/gu, ' ').slice(0, 240),
      href: key,
    })
  }
  return links
}

async function readLimitedBody(response, signal) {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    signal?.throwIfAborted?.()
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > FETCH_LIMIT_BYTES) {
      try { await reader.cancel() } catch {}
      throw new Error('browser public read response exceeds 1.5 MB limit')
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged)
}

async function fetchPublicPage(rawUrl, mode, outerSignal) {
  let url = rawUrl
  const controller = new AbortController()
  const onAbort = () => controller.abort(outerSignal?.reason)
  if (outerSignal) outerSignal.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => controller.abort(new Error('browser public read timed out')), FETCH_TIMEOUT_MS)

  try {
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const target = await assertPublicTarget(url)
      const ua = USER_AGENTS[normalizeMode(mode)]
      const headers = {
        accept: 'text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.1',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.7',
        ...(ua ? { 'user-agent': ua } : {}),
      }
      const response = await fetch(target.href, {
        method: 'GET',
        headers,
        redirect: 'manual',
        signal: controller.signal,
      })

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) throw new Error('browser public read redirect had no Location header')
        if (redirect === MAX_REDIRECTS) throw new Error('browser public read exceeded redirect limit')
        url = new URL(location, target.href).href
        continue
      }

      const type = String(response.headers.get('content-type') || '').toLowerCase()
      if (
        !type.includes('text/html')
        && !type.includes('application/xhtml+xml')
        && !type.includes('text/plain')
        && !type.includes('application/json')
      ) {
        throw new Error('browser public read supports HTML, text, and JSON only')
      }

      const body = await readLimitedBody(response, controller.signal)
      const finalUrl = target.href
      const htmlLike = type.includes('html') || type.includes('xhtml')
      return {
        status: response.status,
        ok: response.ok,
        url: finalUrl,
        contentType: type,
        title: htmlLike ? titleFromHtml(body) : '',
        text: (htmlLike ? textFromHtml(body) : body).slice(0, MAX_TEXT_CHARS),
        links: htmlLike ? linksFromHtml(body, finalUrl) : [],
      }
    }
    throw new Error('browser public read redirect loop')
  } finally {
    clearTimeout(timer)
    if (outerSignal) outerSignal.removeEventListener('abort', onAbort)
  }
}

async function requestOpen(ctx, args, exec, toolName) {
  const target = targetOf(args.url)
  const mode = normalizeMode(args.mode)
  const intent = args.intent === 'interactive' ? 'interactive' : 'read-only'
  const reason = String(args.reason || '').trim()
  if (!reason) throw new Error('browser access requires a non-empty reason')

  const outcome = await ctx.approval.request({
    agent: exec.agent,
    toolName,
    callId: exec.callId,
    reason: 'Open ' + target.origin + ' in the DSH controlled Browser (' + intent + ', ' + mode + '): ' + reason,
    signal: exec.signal,
  })

  if (outcome !== 'allowed-once') {
    return out({
      status: 'denied',
      outcome,
      action: 'open',
      url: target.href,
      origin: target.origin,
      mode,
      intent,
    })
  }

  return out({
    status: 'approved',
    outcome,
    action: 'open',
    url: target.href,
    origin: target.origin,
    mode,
    intent,
    lease: String(exec.callId),
    ui: 'controlled-browser',
    aiCapabilities: ['open', 'public-read', 'follow-public-links'],
    humanCapabilities: ['login', 'captcha', '2fa', 'account-choice', 'sensitive-confirmation'],
    sameTabDomAutomation: false,
    sameTabReason: 'Cross-origin Web iframe DOM remains isolated until a native Android/Desktop broker is present.',
    secretPolicy: 'Passwords and one-time codes stay in the webpage and must not be requested in chat.',
  })
}

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'browser_open',
    description:
      'Open an HTTP(S) URL in the DSH controlled Browser after one-shot approval. '
      + 'Use this when the user asks you to browse visibly. mode controls the Browser viewport preset: auto, desktop, iphone, or ipad. '
      + 'This opens the page for the user but does not grant cross-origin DOM click/type automation.',
    parameters: {
      url: { type: 'string', required: true, description: 'Absolute HTTP(S) URL.' },
      reason: { type: 'string', required: true, description: 'Short user-facing reason for opening the page.' },
      mode: { type: 'string', enum: ['auto', 'desktop', 'iphone', 'ipad'], description: 'Viewport preset.' },
      intent: { type: 'string', enum: ['read-only', 'interactive'], description: 'Whether human interaction may be needed.' },
    },
    output: stringOutput,
    async execute(args, exec) {
      return requestOpen(ctx, args, exec, 'browser_open')
    },
  }))

  // Compatibility alias retained for existing prompts and tool history.
  ctx.tools.register(defineTool({
    name: 'browser_request_access',
    description:
      'Compatibility alias for browser_open. Request one-shot approval before visibly opening a URL in the controlled Browser.',
    parameters: {
      url: { type: 'string', required: true },
      reason: { type: 'string', required: true },
      mode: { type: 'string', enum: ['auto', 'desktop', 'iphone', 'ipad'] },
      intent: { type: 'string', enum: ['read-only', 'interactive'] },
    },
    output: stringOutput,
    async execute(args, exec) {
      return requestOpen(ctx, args, exec, 'browser_request_access')
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_read_public',
    description:
      'Read a PUBLIC HTTP(S) page directly from the DSH host and return compact text plus numbered links. '
      + 'Use this to actually inspect public information instead of pretending the embedded iframe is readable. '
      + 'It does not use the user\'s browser cookies or logged-in state, does not execute page JavaScript, '
      + 'and blocks localhost/private-network targets. mode selects the HTTP User-Agent used for this public read.',
    parameters: {
      url: { type: 'string', required: true, description: 'Public HTTP(S) URL to read.' },
      mode: { type: 'string', enum: ['auto', 'desktop', 'iphone', 'ipad'], description: 'HTTP User-Agent profile.' },
    },
    output: stringOutput,
    async execute(args, exec) {
      const mode = normalizeMode(args.mode)
      const page = await fetchPublicPage(args.url, mode, exec.signal)
      return out({
        status: 'read',
        mode,
        renderer: 'http-static',
        javascriptExecuted: false,
        authenticatedSessionUsed: false,
        ...page,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_request_human_help',
    description:
      'Pause the browser workflow and ask the user to take over for login, CAPTCHA, 2FA, account choice, '
      + 'sensitive confirmation, or a cross-origin interaction the current plugin cannot automate safely. '
      + 'Do not ask the user to reveal passwords or OTP values in chat.',
    parameters: {
      reason: { type: 'string', required: true, description: 'What the user should do in the browser.' },
      url: { type: 'string', description: 'Optional HTTP(S) page to open for handoff.' },
      mode: { type: 'string', enum: ['auto', 'desktop', 'iphone', 'ipad'] },
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
        action: 'handoff',
        reason,
        ...(url ? { url, origin } : {}),
        mode: normalizeMode(args.mode),
        instruction: 'Complete the manual/sensitive step in the controlled Browser, then tell the agent to continue.',
        secretPolicy: 'Do not request passwords or OTP values in chat.',
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_handoff_capabilities',
    description:
      'Report the real Browser Handoff capability boundary. Call this before claiming the AI can control a logged-in browser page.',
    parameters: {},
    output: stringOutput,
    async execute() {
      return out({
        embeddedBrowser: true,
        controlledBrowserUi: true,
        viewportProfiles: ['auto', 'desktop', 'iphone', 'ipad'],
        viewportEmulation: true,
        viewportNote: 'Web plugin changes iframe viewport/layout. It cannot change the visible iframe User-Agent.',
        publicPageRead: true,
        publicReadUserAgentProfiles: ['auto', 'desktop', 'iphone', 'ipad'],
        publicReadJavascript: false,
        publicReadUsesBrowserCookies: false,
        nativeApproval: true,
        humanTakeover: true,
        aiVisibleOpen: true,
        sameTabAiAutomation: false,
        sameTabReason: 'Cross-origin Web iframe DOM is isolated; true click/type requires a native target-scoped broker.',
        nextMilestone: 'native-target-scoped-browser-broker',
      })
    },
  }))
}
