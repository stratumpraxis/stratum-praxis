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

  function addCheckoutReassurance() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;
    const actions = document.querySelector('.hero .actions');
    if (!actions || document.getElementById('cross-agent-checkout-reassurance')) return;

    const note = document.createElement('div');
    note.id = 'cross-agent-checkout-reassurance';
    note.setAttribute('role', 'note');
    note.textContent = 'One-time $69 · No subscription · Secure Stripe checkout · Buyer access after verified payment';
    note.style.marginTop = '12px';
    note.style.fontSize = '13px';
    note.style.lineHeight = '1.5';
    note.style.color = '#aeb8c8';
    note.style.letterSpacing = '0.01em';
    actions.insertAdjacentElement('afterend', note);
  }

  function alignProductPagePrimaryCheckout() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;

    const targets = [
      {
        link: document.querySelector('.hero .actions .primary'),
        id: 'cross_agent_personal_product_hero',
        label: 'Get Personal — $69 →'
      },
      {
        link: document.querySelector('.close .primary'),
        id: 'cross_agent_personal_product_close',
        label: 'Get Personal — $69 →'
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
