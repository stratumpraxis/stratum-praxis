(function () {
  'use strict';

  const SESSION_KEY = 'sp_funnel_attribution_v2';
  const params = new URLSearchParams(location.search);
  const explicitRoute = String(params.get('route_id') || '').trim().slice(0, 100);
  const PERSONAL_CHECKOUT = 'https://buy.stripe.com/4gM9AU3sE1YLcoM4FB6Zy0T';

  function applyExplicitRoute() {
    if (!explicitRoute) return;
    const attribution = window.scosAttribution;
    if (attribution && typeof attribution === 'object') {
      attribution.route_id = explicitRoute;
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (key) {
        const value = String(params.get(key) || '').trim();
        if (value) attribution[key] = value.slice(0, 160);
      });
      attribution.landing_path = location.pathname;
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(attribution)); } catch (_) {}
    }

    document.querySelectorAll('a[href]').forEach(function (link) {
      let url;
      try { url = new URL(link.href, location.href); } catch (_) { return; }
      if (url.hostname !== 'buy.stripe.com') return;
      url.searchParams.set('client_reference_id', explicitRoute.replace(/[^a-zA-Z0-9_-]/g, '_'));
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (key) {
        const value = params.get(key);
        if (value) url.searchParams.set(key, value);
      });
      link.href = url.toString();
    });
  }

  function getAttributionSource() {
    const direct = String(params.get('utm_source') || '').trim().toLowerCase();
    if (direct) return direct;
    const attribution = window.scosAttribution;
    if (attribution && typeof attribution === 'object') {
      const stored = String(attribution.utm_source || '').trim().toLowerCase();
      if (stored) return stored;
    }
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
      return String(parsed.utm_source || '').trim().toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function isJapaneseAcquisition() {
    const source = getAttributionSource();
    return source === 'zenn' || source === 'vector_praxis';
  }

  function addCheckoutReassurance() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;
    const actions = document.querySelector('.hero .actions');
    if (!actions || document.getElementById('cross-agent-checkout-reassurance')) return;

    const proof = document.createElement('div');
    proof.id = 'cross-agent-checkout-reassurance';
    proof.setAttribute('role', 'note');
    const japaneseNote = isJapaneseAcquisition()
      ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #263248;color:#d8e2ef" lang="ja"><strong style="color:#f5f7fb">Zenn / 日本語圏からの方へ：</strong> Personal版は<strong>69ドルの買い切り</strong>です。自分のプロジェクトで使えるAGENTS.md、Claude / Codex / Cursor用アダプター、Human Gate Matrix、予算・再試行ガード、Migration / State Handoffを含みます。サブスクリプションではありません。Stripeで支払い確認後、購入者用アクセスへ進みます。</div>'
      : '';
    proof.innerHTML = '<strong style="color:#f5f7fb">What the $69 Personal license gives you:</strong> the full v1.0 operating kit for your own projects — AGENTS.md master policy, Claude/Codex/Cursor adapters, Human Gate matrix, budget/retry guards, migration checklist and maturity score.<br><span style="display:inline-block;margin-top:8px">One-time purchase · No subscription · Secure Stripe checkout · Buyer access after verified payment</span>' + japaneseNote;
    proof.style.marginTop = '14px';
    proof.style.padding = '14px 16px';
    proof.style.border = '1px solid #263248';
    proof.style.borderRadius = '12px';
    proof.style.background = '#0d141f';
    proof.style.fontSize = '13px';
    proof.style.lineHeight = '1.55';
    proof.style.color = '#aeb8c8';
    actions.insertAdjacentElement('afterend', proof);
  }

  function alignProductPagePrimaryCheckout() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;

    const japanese = isJapaneseAcquisition();
    const targets = [
      {
        link: document.querySelector('.hero .actions .primary'),
        id: 'cross_agent_personal_product_hero',
        label: japanese ? 'Personalを購入する — $69・買い切り →' : 'Get the full kit — $69 one-time →'
      },
      {
        link: document.querySelector('.close .primary'),
        id: 'cross_agent_personal_product_close',
        label: japanese ? 'Personalを購入する — $69・買い切り →' : 'Get the full kit — $69 one-time →'
      }
    ];

    targets.forEach(function (item) {
      if (!item.link) return;
      item.link.href = PERSONAL_CHECKOUT;
      item.link.textContent = item.label;
      item.link.dataset.analyticsId = item.id;
      item.link.dataset.product = 'cross_agent_personal';
      item.link.setAttribute('data-primary-cta', 'true');
    });

    addCheckoutReassurance();
  }

  function alignHomepageRoutes() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;

    const heroDestination = '/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=owned_web&utm_campaign=cross_agent_personal&utm_content=home_hero&route_id=owned_home_hero_cross_agent_personal_20260831';
    const navDestination = '/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=owned_web&utm_campaign=cross_agent_personal&utm_content=home_nav&route_id=owned_home_nav_cross_agent_personal_20260831';

    const hero = document.querySelector('.hero .button-primary');
    if (hero) {
      hero.href = heroDestination;
      hero.textContent = 'Cross-Agent Operating Kit — Personal · $69';
      hero.dataset.analyticsId = 'cross_agent_personal_home_hero';
      hero.dataset.product = 'cross_agent_personal';
      hero.setAttribute('data-primary-cta', 'true');
    }

    const nav = document.querySelector('#site-nav');
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('a[href*="cross-agent-operating-kit.html"]'));
    let keeper = links[0];
    links.slice(1).forEach(function (link) { link.remove(); });
    if (!keeper) {
      keeper = document.createElement('a');
      nav.insertBefore(keeper, nav.firstChild);
    }
    keeper.href = navDestination;
    keeper.textContent = 'Cross-Agent Kit · $69';
    keeper.dataset.crossAgentPrimary = 'true';
    keeper.dataset.analyticsId = 'cross_agent_personal_home_nav';
    keeper.dataset.product = 'cross_agent_personal';
  }

  applyExplicitRoute();
  alignProductPagePrimaryCheckout();
  alignHomepageRoutes();

  window.addEventListener('pageshow', function () {
    applyExplicitRoute();
    alignProductPagePrimaryCheckout();
    alignHomepageRoutes();
  });
})();
