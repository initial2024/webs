window.__ModuleLoader__.load({
  id: 'dsh-browser-handoff',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'browserHandoff';
    const CONTROLLED_ID = 'dsh-browser-handoff/controlled';
    const CONTROLLED_KIND = 'browser-handoff';

    const dictionaries = {
      zh: {
        quick: 'AI 浏览器',
        title: 'AI 浏览器',
        access: 'AI 请求打开网页',
        approved: '已批准，本次页面已交给浏览器',
        denied: '未批准浏览',
        open: '打开受控浏览器',
        human: '需要人工接管',
        takeover: '接管当前网页',
        waiting: '等待审批',
        readOnly: '只读意图',
        interactive: '交互意图',
        reason: '原因',
        address: '输入网址',
        go: '前往',
        back: '后退',
        forward: '前进',
        reload: '刷新',
        external: '外部打开',
        systemExternal: '用系统浏览器打开',
        oauthBlocked: '该登录页拒绝嵌入式 WebView，请改用系统浏览器人工登录。',
        cookieSeparate: '系统浏览器与 AI Browser 默认不共享 Cookie；完成登录后只有站点支持回调/深链时才能自动返回登录态。',
        modeAuto: '自动',
        modeDesktop: '电脑版',
        modeIphone: 'iPhone',
        modeIpad: 'iPad',
        viewportOnly: '当前网页只切换视口布局；可见网页 UA 仍由本机 WebView 决定。',
        aiRead: 'AI 可读取公开网页',
        aiReadNote: 'AI 公共读取不使用你的登录 Cookie，也不执行页面 JavaScript。',
        publicRead: 'AI 已读取公开网页',
        linkCount: '可跟随链接',
        httpStatus: 'HTTP 状态',
        secret: '密码、验证码、支付确认只在网页里操作，不要发给 AI。',
        nativeNeeded: '真正同标签点击/输入仍需 Android/Desktop 原生 Browser Broker。',
        empty: '输入网址后打开网页',
        uaNative: '可见页 UA：本机',
      },
      en: {
        quick: 'AI Browser',
        title: 'AI Browser',
        access: 'AI requests to open a page',
        approved: 'Approved; page handed to Browser',
        denied: 'Browser access not approved',
        open: 'Open controlled Browser',
        human: 'Human takeover required',
        takeover: 'Take over current page',
        waiting: 'Waiting for approval',
        readOnly: 'Read-only intent',
        interactive: 'Interactive intent',
        reason: 'Reason',
        address: 'Enter URL',
        go: 'Go',
        back: 'Back',
        forward: 'Forward',
        reload: 'Reload',
        external: 'Open externally',
        systemExternal: 'Open in system browser',
        oauthBlocked: 'This sign-in page rejects embedded WebView. Continue manually in the system browser.',
        cookieSeparate: 'System-browser cookies are separate from AI Browser WebView cookies unless the site provides a callback/deep link.',
        modeAuto: 'Auto',
        modeDesktop: 'Desktop',
        modeIphone: 'iPhone',
        modeIpad: 'iPad',
        viewportOnly: 'Visible page switches viewport layout only; its User-Agent still comes from the local WebView.',
        aiRead: 'AI can read public pages',
        aiReadNote: 'Public AI reads do not use your login cookies and do not execute page JavaScript.',
        publicRead: 'AI read public page',
        linkCount: 'Links',
        httpStatus: 'HTTP status',
        secret: 'Keep passwords, one-time codes and payment confirmations in the webpage; never send them to the AI.',
        nativeNeeded: 'True same-tab click/type still requires a native Android/Desktop Browser Broker.',
        empty: 'Enter a URL to open a page',
        uaNative: 'Visible UA: local device',
      },
    };

    const MODES = {
      auto: { width: null, minHeight: 0, key: 'modeAuto' },
      desktop: { width: 1366, minHeight: 768, key: 'modeDesktop' },
      iphone: { width: 390, minHeight: 844, key: 'modeIphone' },
      ipad: { width: 820, minHeight: 1180, key: 'modeIpad' },
    };

    function parseJson(text) {
      if (typeof text !== 'string' || !text) return null;
      try {
        const value = JSON.parse(text);
        return value && typeof value === 'object' ? value : null;
      } catch {
        return null;
      }
    }

    function argsOf(phase, block) {
      if (!block || typeof block !== 'object') return {};
      const raw = phase === 'result' ? block.call?.argsRaw : block.argsRaw;
      return parseJson(raw) || {};
    }

    function resultOf(phase, block) {
      if (phase !== 'result' || !block || !Array.isArray(block.content) || block.content.length !== 1) return null;
      const only = block.content[0];
      if (!only || only.type !== 'text') return null;
      return parseJson(only.text);
    }

    function toolCallId(block) {
      return String(block?.call?.id || block?.callId || block?.id || '');
    }

    function normalizeMode(value) {
      return Object.prototype.hasOwnProperty.call(MODES, value) ? value : 'auto';
    }

    function normalizeUrl(raw) {
      const value = String(raw || '').trim();
      if (!value) return '';
      const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : 'https://' + value;
      try {
        const url = new URL(candidate);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
        if (typeof window !== 'undefined' && window.location && url.origin === window.location.origin) return '';
        return url.href;
      } catch {
        return '';
      }
    }

    function styles() {
      return {
        card: {
          border: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
          borderRadius: 14,
          padding: '11px 12px',
          margin: '6px 0',
          background: 'color-mix(in srgb, currentColor 4%, transparent)',
          display: 'grid',
          gap: 8,
        },
        title: { fontWeight: 700 },
        meta: { fontSize: 12, opacity: 0.72, overflowWrap: 'anywhere' },
        actions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
        button: {
          appearance: 'none',
          border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
          background: 'color-mix(in srgb, currentColor 7%, transparent)',
          color: 'inherit',
          borderRadius: 10,
          padding: '7px 11px',
          font: 'inherit',
          cursor: 'pointer',
        },
        quick: {
          appearance: 'none',
          border: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
          background: 'color-mix(in srgb, currentColor 3%, transparent)',
          color: 'inherit',
          borderRadius: 999,
          padding: '5px 10px',
          font: 'inherit',
          fontSize: 11,
          cursor: 'pointer',
        },
        warning: {
          padding: '7px 9px',
          borderRadius: 9,
          background: 'color-mix(in srgb, currentColor 6%, transparent)',
          fontSize: 12,
        },
      };
    }

    return {
      inject: ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-browser-handoff: dictionaries');
        const t = ctx.locale.bind(NS);
        const s = styles();

        function openBrowser(url, mode) {
          const normalized = normalizeUrl(url);
          const params = {
            ...(normalized ? { url: normalized } : {}),
            mode: normalizeMode(mode),
          };
          try {
            ctx.sidebarRight.openTab(CONTROLLED_KIND, { params, revealIfOpened: false });
          } catch (error) {
            console.warn('[dsh-browser-handoff] controlled Browser unavailable, falling back', error);
            try {
              ctx.sidebarRight.openTab('browser', normalized ? { params: { url: normalized } } : undefined);
            } catch (fallbackError) {
              console.warn('[dsh-browser-handoff] cannot open fallback Browser', fallbackError);
            }
          }
        }

        function maybeAutoOpen(props, result, fallbackArgs) {
          const approved = result?.status === 'approved' && result?.action === 'open';
          const url = typeof result?.url === 'string' ? result.url : typeof fallbackArgs.url === 'string' ? fallbackArgs.url : '';
          const mode = normalizeMode(result?.mode || fallbackArgs.mode);
          const callId = toolCallId(props.block) || (url ? url + '|' + mode : '');
          React.useEffect(() => {
            if (!approved || !url || !callId) return;
            const key = 'dsh-browser-handoff.opened.' + callId;
            try {
              if (sessionStorage.getItem(key) === '1') return;
              sessionStorage.setItem(key, '1');
            } catch {}
            openBrowser(url, mode);
          }, [approved, url, mode, callId]);
        }

        function AccessRow(props) {
          const args = argsOf(props.phase, props.block);
          const result = resultOf(props.phase, props.block);
          maybeAutoOpen(props, result, args);
          const approved = result?.status === 'approved';
          const denied = result?.status === 'denied';
          const intent = (args.intent || args.mode) === 'interactive' ? t('interactive') : t('readOnly');
          const url = typeof result?.url === 'string' ? result.url : typeof args.url === 'string' ? args.url : '';
          const mode = normalizeMode(result?.mode || args.mode);

          return h('section', { style: s.card, 'data-browser-handoff-access': true },
            h('div', { style: s.title }, t('access')),
            h('div', { style: s.meta }, url || '—'),
            h('div', { style: s.meta }, intent + ' · ' + t(MODES[mode].key)),
            typeof args.reason === 'string' && args.reason
              ? h('div', { style: s.meta }, t('reason') + ': ' + args.reason)
              : null,
            h('div', { style: s.warning }, approved ? t('approved') : denied ? t('denied') : t('waiting')),
            approved ? h('div', { style: s.actions },
              h('button', { type: 'button', style: s.button, onClick: () => openBrowser(url, mode) }, t('open')),
            ) : null,
            h('div', { style: s.meta }, t('nativeNeeded')),
            h('div', { style: s.meta }, t('secret')),
          );
        }

        function ReadRow(props) {
          const args = argsOf(props.phase, props.block);
          const result = resultOf(props.phase, props.block);
          const url = typeof result?.url === 'string' ? result.url : typeof args.url === 'string' ? args.url : '';
          const title = typeof result?.title === 'string' && result.title ? result.title : url;
          const mode = normalizeMode(result?.mode || args.mode);
          const links = Array.isArray(result?.links) ? result.links.length : 0;
          return h('section', { style: s.card, 'data-browser-handoff-read': true },
            h('div', { style: s.title }, t('publicRead')),
            h('div', { style: s.meta }, title || '—'),
            h('div', { style: s.meta }, t(MODES[mode].key) + ' · ' + t('httpStatus') + ': ' + String(result?.status ?? '—') + ' · ' + t('linkCount') + ': ' + links),
            h('div', { style: s.actions },
              url ? h('button', { type: 'button', style: s.button, onClick: () => openBrowser(url, mode) }, t('open')) : null,
            ),
            h('div', { style: s.meta }, t('aiReadNote')),
          );
        }

        function HumanRow(props) {
          const args = argsOf(props.phase, props.block);
          const result = resultOf(props.phase, props.block);
          const url = typeof result?.url === 'string' ? result.url : typeof args.url === 'string' ? args.url : '';
          const mode = normalizeMode(result?.mode || args.mode);
          const reason = typeof result?.reason === 'string'
            ? result.reason
            : typeof args.reason === 'string' ? args.reason : '';

          return h('section', { style: s.card, 'data-browser-handoff-human': true },
            h('div', { style: s.title }, t('human')),
            reason ? h('div', { style: s.meta }, t('reason') + ': ' + reason) : null,
            h('div', { style: s.actions },
              h('button', { type: 'button', style: s.button, onClick: () => openBrowser(url, mode) }, t('takeover')),
              url ? h('button', { type: 'button', style: s.button, onClick: () => window.open(url, '_blank', 'noopener,noreferrer') }, t('systemExternal')) : null,
            ),
            h('div', { style: s.meta }, t('secret')),
          );
        }

        function ExternalNativeBrowserRow(props) {
          const args = argsOf(props.phase, props.block);
          if (String(args.action || '') !== 'external') return null;
          const url = normalizeUrl(args.url);
          if (!url) return null;
          const openSystem = () => {
            try {
              window.open(url, '_blank', 'noopener,noreferrer');
            } catch (error) {
              console.warn('[dsh-browser-handoff] system-browser handoff failed', error);
            }
          };
          return h('section', { style: s.card, 'data-browser-handoff-external': true },
            h('div', { style: s.title }, t('human')),
            h('div', { style: s.warning }, t('oauthBlocked')),
            h('div', { style: s.meta }, url),
            h('div', { style: s.actions },
              h('button', { type: 'button', style: s.button, onClick: openSystem }, t('systemExternal')),
            ),
            h('div', { style: s.meta }, t('cookieSeparate')),
            h('div', { style: s.meta }, t('secret')),
          );
        }

        function ControlledBrowser(props) {
          const { tab } = props.useTabInfo();
          const params = tab.navigation?.params || {};
          const initialMode = normalizeMode(params.mode);
          const initialUrl = normalizeUrl(params.url);
          const [mode, setMode] = React.useState(initialMode);
          const [url, setUrl] = React.useState(initialUrl);
          const [draft, setDraft] = React.useState(initialUrl);
          const [reloadKey, setReloadKey] = React.useState(0);
          const [history, setHistory] = React.useState(initialUrl ? [initialUrl] : []);
          const [cursor, setCursor] = React.useState(initialUrl ? 0 : -1);
          const viewportRef = React.useRef(null);
          const [box, setBox] = React.useState({ width: 0, height: 0 });

          React.useEffect(() => {
            const nextMode = normalizeMode(params.mode);
            const nextUrl = normalizeUrl(params.url);
            setMode(nextMode);
            if (nextUrl) {
              setUrl(nextUrl);
              setDraft(nextUrl);
              setHistory([nextUrl]);
              setCursor(0);
              setReloadKey(value => value + 1);
            }
          }, [tab.navigation?.revision]);

          React.useEffect(() => {
            const node = viewportRef.current;
            if (!node) return undefined;
            const update = () => {
              const rect = node.getBoundingClientRect();
              setBox({ width: Math.max(0, rect.width), height: Math.max(0, rect.height) });
            };
            update();
            const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
            observer?.observe(node);
            window.addEventListener('resize', update);
            return () => {
              observer?.disconnect();
              window.removeEventListener('resize', update);
            };
          }, []);

          const preset = MODES[mode];
          const desiredWidth = preset.width;
          const scale = desiredWidth && box.width > 0 ? Math.min(1, box.width / desiredWidth) : 1;
          const renderedWidth = desiredWidth ? desiredWidth * scale : box.width;
          const frameHeight = desiredWidth
            ? Math.max(preset.minHeight, box.height > 0 ? Math.floor(box.height / Math.max(scale, 0.01)) : preset.minHeight)
            : Math.max(400, box.height);

          const navigate = raw => {
            const next = normalizeUrl(raw);
            if (!next) return;
            setUrl(next);
            setDraft(next);
            setHistory(prev => {
              const head = prev.slice(0, cursor + 1);
              return [...head, next];
            });
            setCursor(value => value + 1);
            setReloadKey(value => value + 1);
          };

          const step = direction => {
            const nextCursor = cursor + direction;
            if (nextCursor < 0 || nextCursor >= history.length) return;
            const next = history[nextCursor];
            setCursor(nextCursor);
            setUrl(next);
            setDraft(next);
            setReloadKey(value => value + 1);
          };

          const toolbar = {
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 8,
            borderBottom: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
            overflowX: 'auto',
            flex: '0 0 auto',
          };
          const smallButton = {
            ...s.button,
            padding: '6px 9px',
            borderRadius: 9,
            whiteSpace: 'nowrap',
          };
          const input = {
            minWidth: 130,
            flex: '1 1 220px',
            border: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
            background: 'color-mix(in srgb, currentColor 3%, transparent)',
            color: 'inherit',
            borderRadius: 10,
            padding: '7px 9px',
            outline: 'none',
          };
          const select = {
            ...input,
            flex: '0 0 auto',
            minWidth: 92,
          };

          return h('div', {
            style: { height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'inherit' },
            'data-browser-handoff-controlled': true,
          },
            h('form', {
              style: toolbar,
              onSubmit: event => { event.preventDefault(); navigate(draft); },
            },
              h('button', { type: 'button', style: smallButton, disabled: cursor <= 0, title: t('back'), onClick: () => step(-1) }, '←'),
              h('button', { type: 'button', style: smallButton, disabled: cursor < 0 || cursor >= history.length - 1, title: t('forward'), onClick: () => step(1) }, '→'),
              h('button', { type: 'button', style: smallButton, disabled: !url, title: t('reload'), onClick: () => setReloadKey(value => value + 1) }, '↻'),
              h('input', {
                value: draft,
                style: input,
                placeholder: t('address'),
                spellCheck: false,
                onChange: event => setDraft(event.currentTarget.value),
              }),
              h('button', { type: 'submit', style: smallButton, title: t('go') }, '↵'),
              h('select', {
                value: mode,
                style: select,
                title: t('viewportOnly'),
                onChange: event => {
                  setMode(normalizeMode(event.currentTarget.value));
                  setReloadKey(value => value + 1);
                },
              },
                Object.entries(MODES).map(([key, item]) => h('option', { key, value: key }, t(item.key))),
              ),
              h('button', {
                type: 'button',
                style: smallButton,
                disabled: !url,
                title: t('external'),
                onClick: () => url && window.open(url, '_blank', 'noopener,noreferrer'),
              }, '↗'),
            ),
            h('div', {
              style: {
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '5px 10px',
                fontSize: 11,
                opacity: 0.72,
                borderBottom: '1px solid color-mix(in srgb, currentColor 8%, transparent)',
              },
            },
              h('span', null, t('uaNative')),
              h('span', null, '·'),
              h('span', null, t('aiRead')),
              h('span', null, '·'),
              h('span', null, t('viewportOnly')),
            ),
            h('div', {
              ref: viewportRef,
              style: {
                position: 'relative',
                minHeight: 0,
                flex: '1 1 auto',
                overflow: desiredWidth ? 'auto' : 'hidden',
                background: 'color-mix(in srgb, currentColor 2%, transparent)',
              },
            },
              url
                ? h('div', {
                    style: desiredWidth ? {
                      position: 'absolute',
                      top: 0,
                      left: Math.max(0, (box.width - renderedWidth) / 2),
                      width: desiredWidth,
                      height: frameHeight,
                      transform: 'scale(' + scale + ')',
                      transformOrigin: 'top left',
                    } : {
                      position: 'absolute',
                      inset: 0,
                    },
                  },
                    h('iframe', {
                      key: url + '|' + mode + '|' + reloadKey,
                      src: url,
                      title: t('title'),
                      referrerPolicy: 'no-referrer',
                      sandbox: 'allow-scripts allow-forms allow-same-origin allow-popups',
                      style: { width: '100%', height: '100%', border: 0, background: '#fff' },
                    }),
                  )
                : h('div', {
                    style: {
                      height: '100%',
                      display: 'grid',
                      placeItems: 'center',
                      opacity: 0.55,
                      padding: 24,
                      textAlign: 'center',
                    },
                  }, t('empty')),
            ),
            h('div', {
              style: {
                flex: '0 0 auto',
                padding: '5px 10px',
                fontSize: 11,
                opacity: 0.62,
                borderTop: '1px solid color-mix(in srgb, currentColor 8%, transparent)',
              },
            }, t('nativeNeeded') + ' ' + t('secret')),
          );
        }

        function QuickBrowser() {
          return h('button', {
            type: 'button',
            style: s.quick,
            onClick: () => openBrowser('', 'auto'),
            title: t('open'),
            'data-browser-handoff-quick': true,
          }, '◉ ' + t('quick'));
        }

        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: CONTROLLED_ID,
          kind: CONTROLLED_KIND,
          multiple: true,
          priority: 'extension',
          title: () => t('title'),
        }), 'dsh-browser-handoff: controlled-browser-type');

        ctx.slots.inject('sidebar.right.pane.tab', function* () {
          yield ctx.slots.register({
            name: 'sidebar.right.pane.tab',
            key: CONTROLLED_ID,
            locale: NS,
          }, ControlledBrowser);
        });

        ctx.slots.inject('tool.call.toolview', function* () {
          // Native Android browser action:"external" is a prepared handoff, not a
          // background launch. The user-clicked button below runs in DSH's main
          // WebView, whose SystemWebHost forwards window.open to the Android
          // system browser.
          yield ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'browser',
            locale: NS,
          }, ExternalNativeBrowserRow);
          for (const key of ['browser_open', 'browser_request_access']) {
            yield ctx.slots.register({
              name: 'tool.call.toolview',
              key,
              locale: NS,
            }, AccessRow);
          }
          yield ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'browser_read_public',
            locale: NS,
          }, ReadRow);
          yield ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'browser_request_human_help',
            locale: NS,
          }, HumanRow);
        });

        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register({
            name: 'conversation.composer.dock',
            id: 'browser-handoff-quick',
            order: 94,
          }, QuickBrowser),
        );
      },
    };
  },
});
