(function () {
  'use strict';

  const TOKEN = 'phc_oTYapRSNXDtn8aY7wMNHfCDexRTkfb2H44MDVXwoUMSN';
  const HOST = 'https://us.i.posthog.com';
  const SESSION_ATTRIBUTION_KEY = 'sp_funnel_attribution_v2';
  const FIRST_TOUCH_KEY = 'sp_first_touch_v1';
  const LAST_TOUCH_KEY = 'sp_last_touch_v1';
  const ANON_KEY = 'sp_anonymous_id_v2';
  const CHECKOUT_HOSTS = new Set(['buy.stripe.com', 'payhip.com', 'gumroad.com', 'stratumpraxis.gumroad.com']);
  const SOCIAL_HOSTS = ['x.com','twitter.com','instagram.com','tiktok.com','linkedin.com','facebook.com','threads.net','bsky.app'];

  function clean(value, limit) {
    return String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, limit || 160);
  }

  function safeReferrer(value) {
    if (!value) return '';
    try {
      const url = new URL(value);
      return url.origin + url.pathname;
    } catch (_) {
      return '';
    }
  }

  function referrerHost(value) {
    if (!value) return '';
    try { return new URL(value).hostname.replace(/^www\./,''); } catch (_) { return ''; }
  }

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function currentTouch() {
    const params = new URLSearchParams(location.search);
    const ref = safeReferrer(document.referrer);
    const sourceFromRef = referrerHost(document.referrer);
    return {
      utm_source: clean(params.get('utm_source') || sourceFromRef || 'direct', 100),
      utm_medium: clean(params.get('utm_medium') || (sourceFromRef ? 'referral' : 'direct'), 100),
      utm_campaign: clean(params.get('utm_campaign'), 160),
      utm_content: clean(params.get('utm_content'), 160),
      utm_term: clean(params.get('utm_term'), 160),
      asset_id: clean(params.get('asset_id'), 100),
      route_id: clean(params.get('route_id'), 100),
      referrer: ref,
      landing_path: location.pathname,
      touched_at: new Date().toISOString()
    };
  }

  function readAttribution() {
    const current = currentTouch();
    let session;
    try {
      session = JSON.parse(sessionStorage.getItem(SESSION_ATTRIBUTION_KEY) || 'null');
      if (!session || typeof session !== 'object') {
        session = current;
        sessionStorage.setItem(SESSION_ATTRIBUTION_KEY, JSON.stringify(session));
      }
    } catch (_) { session = current; }

    const first = storageGet(FIRST_TOUCH_KEY);
    if (!first) storageSet(FIRST_TOUCH_KEY, current);
    const hasFreshSignal = current.utm_source !== 'direct' || current.utm_campaign || current.referrer;
    if (hasFreshSignal || !storageGet(LAST_TOUCH_KEY)) storageSet(LAST_TOUCH_KEY, current);

    const firstTouch = storageGet(FIRST_TOUCH_KEY) || current;
    const lastTouch = storageGet(LAST_TOUCH_KEY) || current;
    return Object.assign({}, session, {
      first_utm_source: clean(firstTouch.utm_source, 100),
      first_utm_medium: clean(firstTouch.utm_medium, 100),
      first_landing_path: clean(firstTouch.landing_path, 160),
      first_touched_at: clean(firstTouch.touched_at, 40),
      last_utm_source: clean(lastTouch.utm_source, 100),
      last_utm_medium: clean(lastTouch.utm_medium, 100),
      last_landing_path: clean(lastTouch.landing_path, 160),
      last_touched_at: clean(lastTouch.touched_at, 40)
    });
  }

  function funnelId() {
    return clean(document.body && document.body.dataset.funnel, 100) ||
      location.pathname.replace(/^\/+/, '').replace(/(?:index)?\.html$/, '') || 'homepage';
  }

  function newAnonymousId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  const anonymousId = (function () {
    try {
      const saved = localStorage.getItem(ANON_KEY);
      if (saved) return saved;
      const created = newAnonymousId();
      localStorage.setItem(ANON_KEY, created);
      return created;
    } catch (_) { return newAnonymousId(); }
  })();

  const attribution = readAttribution();

  function checkoutReference() {
    const raw = attribution.route_id || [
      funnelId(), attribution.utm_source, attribution.utm_campaign, attribution.utm_content
    ].filter(Boolean).join('_');
    return clean(raw, 200).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  }

  function decorateCheckoutLink(link) {
    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (!CHECKOUT_HOSTS.has(url.hostname) || url.hostname !== 'buy.stripe.com') return;
    const reference = checkoutReference();
    if (reference) url.searchParams.set('client_reference_id', reference);
    ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function (key) {
      if (attribution[key]) url.searchParams.set(key, attribution[key]);
    });
    link.href = url.toString();
  }

  function decorateCheckoutLinks() {
    document.querySelectorAll('a[href]').forEach(decorateCheckoutLink);
  }

  if (!(window.posthog && window.posthog.__SV)) {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split('.');2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement('script')).type='text/javascript',p.crossOrigin='anonymous',p.async=!0,p.src=s.api_host.replace('.i.posthog.com','-assets.i.posthog.com')+'/static/array.js';(r=t.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a='posthog',u.people=u.people||[],u.toString=function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e},u.people.toString=function(){return u.toString(1)+'.people (stub)'},o='init capture register register_once unregister set_config reset opt_out_capturing has_opted_out_capturing opt_in_capturing'.split(' '),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  }
  window.posthog.init(TOKEN, {
    api_host: HOST,
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    disable_session_recording: true
  });

  function sendEvent(name, props) {
    const properties = Object.assign({}, attribution, {
      path: location.pathname,
      funnel: funnelId(),
      '$process_person_profile': false
    }, props || {});
    delete properties.email;
    delete properties.purchaser_email;
    delete properties.session_id;
    const payload = JSON.stringify({ api_key: TOKEN, distinct_id: anonymousId, event: name, properties });
    try {
      if (navigator.sendBeacon(HOST + '/i/v0/e/', new Blob([payload], { type: 'application/json' }))) return true;
    } catch (_) {}
    try {
      fetch(HOST + '/i/v0/e/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        mode: 'cors'
      });
      return true;
    } catch (_) { return false; }
  }

  window.scosCapture = function (name, props) {
    sendEvent(name, props);
  };
  window.scosAttribution = attribution;

  function captureBeforeNavigation(name, props) {
    sendEvent(name, props);
  }

  function isEnglishPage() {
    const lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    return lang.startsWith('en') || location.pathname.startsWith('/guides/') || location.pathname.startsWith('/return-gate/en/');
  }

  function normalizeLanguageRoutes() {
    if (!isEnglishPage()) return;
    document.querySelectorAll('a[href="/return-gate/"]').forEach(function (link) {
      link.setAttribute('href', '/return-gate/en/');
    });
  }

  function alignPrimaryRevenueCTA() {
    const onHomepage = location.pathname === '/' || location.pathname === '/index.html';
    if (!onHomepage) return;

    const destination = '/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=homepage&utm_campaign=cross_agent_personal&utm_content=hero_primary';
    const heroPrimary = document.querySelector('.hero .button-primary');
    if (heroPrimary) {
      heroPrimary.href = destination;
      heroPrimary.textContent = 'Cross-Agent Operating Kit — Personal · $69';
      heroPrimary.dataset.analyticsId = 'cross_agent_personal_home_hero';
      heroPrimary.dataset.product = 'cross_agent_personal';
      heroPrimary.setAttribute('data-primary-cta', 'true');
    }

    const nav = document.querySelector('#site-nav');
    if (nav && !nav.querySelector('[data-cross-agent-primary]')) {
      const link = document.createElement('a');
      link.href = destination.replace('hero_primary', 'nav');
      link.textContent = '$69 Cross-Agent Kit';
      link.dataset.crossAgentPrimary = 'true';
      link.dataset.analyticsId = 'cross_agent_personal_home_nav';
      link.dataset.product = 'cross_agent_personal';
      nav.insertBefore(link, nav.firstChild);
    }
  }

  function externalCategory(host) {
    host = host.replace(/^www\./,'');
    if (CHECKOUT_HOSTS.has(host)) return 'checkout';
    if (host === 'youtube.com' || host === 'youtu.be') return 'youtube';
    if (host === 'note.com') return 'note';
    if (host.indexOf('amazon.') >= 0 || host === 'amzn.to') return 'amazon';
    if (SOCIAL_HOSTS.some(function (item) { return host === item || host.endsWith('.' + item); })) return 'social';
    return 'external';
  }

  function injectNetworkEntry() {
    if (document.getElementById('return-gate-entry')) return;
    const english = isEnglishPage();
    const onReturnGate = location.pathname.startsWith('/return-gate');
    const onCrossAgent = location.pathname === '/cross-agent-operating-kit.html';
    const returnPath = english ? '/return-gate/en/' : '/return-gate/';
    const contentPath = english ? '/guides/' : '/folio-junction/';
    const contentLabel = english ? 'Field Guides' : 'Folio Junction';

    const wrap = document.createElement('div');
    wrap.id = 'return-gate-entry';
    wrap.setAttribute('aria-label', english ? 'Stratum Praxis network' : 'Stratum Praxis交通網');
    wrap.style.cssText = "max-width:1180px;margin:28px auto 18px;padding:0 16px;display:flex;gap:8px;flex-wrap:wrap;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

    function addLink(href, text, analyticsId, primary) {
      if (location.pathname === href || (href.endsWith('/') && location.pathname === href + 'index.html')) return;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      link.dataset.analyticsId = analyticsId;
      if (primary) link.setAttribute('data-primary-cta', 'true');
      link.style.cssText = primary
        ? 'display:inline-block;border:1px solid rgba(190,205,225,.65);border-radius:999px;padding:9px 13px;color:#080b10;text-decoration:none;background:#f5f7fb;font-weight:850'
        : 'display:inline-block;border:1px solid rgba(127,150,180,.4);border-radius:999px;padding:9px 13px;color:inherit;text-decoration:none;background:rgba(10,16,27,.5)';
      link.addEventListener('pointerdown', function () {
        captureBeforeNavigation('network_route_click', { source_funnel: funnelId(), destination_path: href, route_id: analyticsId });
        if (analyticsId.indexOf('return_gate') >= 0) captureBeforeNavigation('return_gate_entry_click', { source_funnel: funnelId(), destination_path: href });
      });
      wrap.appendChild(link);
    }

    if (!onCrossAgent) addLink('/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=network&utm_campaign=cross_agent_personal&utm_content=network_primary', english ? 'Cross-Agent Operating Kit · Personal $69' : 'Cross-Agent Operating Kit · Personal $69', 'cross_agent_personal_network', true);
    if (!onReturnGate) addLink(returnPath, english ? '↩ Return Gate' : '↩ Return Gate｜再訪ハブ', 'return_gate_entry', false);
    if (onReturnGate) addLink('/return-gate-growth-os.html', english ? 'Build your own Return Gate · $24' : '再訪導線を作る · Growth OS $24', 'return_gate_growth_os', false);
    addLink('/passage-hub/', english ? 'Route map' : '路線図', 'passage_map_entry', false);
    addLink(contentPath, contentLabel, 'content_hub_entry', false);
    addLink('https://www.youtube.com/watch?v=rPYeG1LYgRg', "Why AI Isn't Making You Money ↗", 'forwelle_entry', false);

    if (wrap.children.length) document.body.appendChild(wrap);
  }

  function captureView() {
    window.scosCapture('funnel_view');
    let sessionMarked = false;
    try {
      sessionMarked = sessionStorage.getItem('sp_traffic_session_marked_v1') === '1';
      if (!sessionMarked) sessionStorage.setItem('sp_traffic_session_marked_v1', '1');
    } catch (_) {}
    if (!sessionMarked) window.scosCapture('traffic_session_start', { anonymous_returning_device: !!storageGet(FIRST_TOUCH_KEY) });
    if (location.pathname.startsWith('/return-gate')) window.scosCapture('return_gate_arrival', {
      first_source: attribution.first_utm_source,
      last_source: attribution.last_utm_source,
      language: isEnglishPage() ? 'en' : 'ja'
    });
  }

  function ready() { normalizeLanguageRoutes(); alignPrimaryRevenueCTA(); decorateCheckoutLinks(); captureView(); injectNetworkEntry(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();

  document.addEventListener('pointerdown', function (event) {
    const link = event.target.closest('a[href]');
    if (!link) return;
    decorateCheckoutLink(link);
    let destination;
    try { destination = new URL(link.href, location.href); } catch (_) { return; }
    const properties = {
      cta_id: clean(link.dataset.analyticsId || link.dataset.funnel || link.textContent, 100),
      destination_host: destination.hostname,
      destination_path: destination.pathname,
      product: clean(link.dataset.product || document.body.dataset.product || funnelId(), 100)
    };
    if (link.matches('[data-primary-cta], .button-primary, .cta:not(.secondary)')) captureBeforeNavigation('primary_cta_click', properties);
    if (CHECKOUT_HOSTS.has(destination.hostname)) captureBeforeNavigation('checkout_click', properties);
    if (destination.origin !== location.origin && !CHECKOUT_HOSTS.has(destination.hostname)) {
      captureBeforeNavigation('external_route_click', Object.assign({}, properties, { external_category: externalCategory(destination.hostname) }));
    }
  });
})();
