window.__ModuleLoader__.load({
  id: 'dsh-browser-handoff',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'browserHandoff';

    const dictionaries = {
      zh: {
        quick: '浏览器',
        access: 'AI 请求浏览权限',
        approved: '已批准本次浏览',
        denied: '未批准浏览',
        open: '打开内置浏览器',
        human: '需要人工接管',
        takeover: '接管浏览器',
        waiting: '等待审批',
        readOnly: '只读意图',
        interactive: '交互意图',
        broker: '同标签 AI 控制仍需 Browser Broker',
        secret: '密码和验证码请只在网页中输入，不要发给 AI。',
        reason: '原因',
      },
      en: {
        quick: 'Browser',
        access: 'AI requests browser access',
        approved: 'Approved for this browse',
        denied: 'Browser access not approved',
        open: 'Open embedded Browser',
        human: 'Human takeover required',
        takeover: 'Take over Browser',
        waiting: 'Waiting for approval',
        readOnly: 'Read-only intent',
        interactive: 'Interactive intent',
        broker: 'Same-tab AI control still requires Browser Broker',
        secret: 'Enter passwords and one-time codes only in the webpage, never send them to the AI.',
        reason: 'Reason',
      },
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

    function style() {
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
      inject: ['slots', 'locale', 'sidebarRight'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-browser-handoff: dictionaries');
        const t = ctx.locale.bind(NS);
        const s = style();

        function openBrowser(url) {
          try {
            const options = url ? { params: { url: String(url) } } : undefined;
            ctx.sidebarRight.openTab('browser', options);
          } catch (error) {
            console.warn('[dsh-browser-handoff] cannot open Browser', error);
          }
        }

        function AccessRow(props) {
          const args = argsOf(props.phase, props.block);
          const result = resultOf(props.phase, props.block);
          const approved = result?.status === 'approved';
          const denied = result?.status === 'denied';
          const mode = args.mode === 'interactive' ? t('interactive') : t('readOnly');
          const url = typeof result?.url === 'string' ? result.url : typeof args.url === 'string' ? args.url : '';

          return h('section', { style: s.card, 'data-browser-handoff-access': true },
            h('div', { style: s.title }, t('access')),
            h('div', { style: s.meta }, url || '—'),
            h('div', { style: s.meta }, mode),
            typeof args.reason === 'string' && args.reason
              ? h('div', { style: s.meta }, t('reason') + ': ' + args.reason)
              : null,
            h('div', { style: s.warning },
              approved ? t('approved') : denied ? t('denied') : t('waiting')),
            approved ? h('div', { style: s.actions },
              h('button', { type: 'button', style: s.button, onClick: () => openBrowser(url) }, t('open')),
            ) : null,
            h('div', { style: s.meta }, t('broker')),
            h('div', { style: s.meta }, t('secret')),
          );
        }

        function HumanRow(props) {
          const args = argsOf(props.phase, props.block);
          const result = resultOf(props.phase, props.block);
          const url = typeof result?.url === 'string' ? result.url : typeof args.url === 'string' ? args.url : '';
          const reason = typeof result?.reason === 'string'
            ? result.reason
            : typeof args.reason === 'string' ? args.reason : '';

          return h('section', { style: s.card, 'data-browser-handoff-human': true },
            h('div', { style: s.title }, t('human')),
            reason ? h('div', { style: s.meta }, t('reason') + ': ' + reason) : null,
            h('div', { style: s.actions },
              h('button', { type: 'button', style: s.button, onClick: () => openBrowser(url) }, t('takeover')),
            ),
            h('div', { style: s.meta }, t('secret')),
          );
        }

        function QuickBrowser() {
          return h('button', {
            type: 'button',
            style: s.quick,
            onClick: () => openBrowser(''),
            title: t('open'),
            'data-browser-handoff-quick': true,
          }, '◉ ' + t('quick'));
        }

        ctx.slots.inject('tool.call.toolview', function* () {
          yield ctx.slots.register({
            name: 'tool.call.toolview',
            key: 'browser_request_access',
            locale: NS,
          }, AccessRow);
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
