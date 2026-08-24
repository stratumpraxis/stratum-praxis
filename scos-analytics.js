(function () {
  'use strict';

  const TOKEN = 'phc_oTYapRSNXDtn8aY7wMNHfCDexRTkfb2H44MDVXwoUMSN';
  const HOST = 'https://us.i.posthog.com';
  const ATTRIBUTION_KEY = 'sp_funnel_attribution_v1';
  const CHECKOUT_HOSTS = new Set(['buy.stripe.com', 'payhip.com', 'gumroad.com', 'stratumpraxis.gumroad.com']);

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

  function readAttribution() {
    const params = new URLSearchParams(location.search);
    const current = {
      utm_source: clean(params.get('utm_source'), 100),
      utm_medium: clean(params.get('utm_medium'), 100),
      utm_campaign: clean(params.get('utm_campaign'), 160),
      utm_content: clean(params.get('utm_content'), 160),
      referrer: safeReferrer(document.referrer),
      landing_path: location.pathname
    };
    try {
      const saved = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || 'null');
      if (saved && typeof saved === 'object') return saved;
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
    } catch (_) {}
    return current;
  }

  function funnelId() {
    return clean(document.body && document.body.dataset.funnel, 100) ||
      location.pathname.replace(/^\/+/, '').replace(/(?:index)?\.html$/, '') || 'homepage';
  }

  const attribution = readAttribution();
  function newAnonymousId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  const anonymousId = (function () {
    try {
      const key = 'sp_anonymous_id_v1';
      const saved = sessionStorage.getItem(key);
      if (saved) return saved;
      const created = newAnonymousId();
      sessionStorage.setItem(key, created);
      return created;
    } catch (_) {
      return newAnonymousId();
    }
  })();
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

  window.scosCapture = function (name, props) {
    const eventProperties = Object.assign({}, attribution, { path: location.pathname, funnel: funnelId() }, props || {});
    delete eventProperties.email;
    delete eventProperties.purchaser_email;
    delete eventProperties.session_id;
    try { window.posthog.capture(name, eventProperties, { transport: 'sendBeacon', send_instantly: true }); } catch (_) {}
  };
  window.scosAttribution = attribution;

  function captureBeforeNavigation(name, props) {
    const properties = Object.assign({}, attribution, { path: location.pathname, funnel: funnelId(), '$process_person_profile': false }, props || {});
    const payload = JSON.stringify({ api_key: TOKEN, distinct_id: anonymousId, event: name, properties });
    try {
      if (navigator.sendBeacon(HOST + '/i/v0/e/', new Blob([payload], { type: 'application/json' }))) return;
    } catch (_) {}
    window.scosCapture(name, props);
  }

  function captureView() { window.scosCapture('funnel_view'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', captureView, { once: true });
  else captureView();

  document.addEventListener('pointerdown', function (event) {
    const link = event.target.closest('a[href]');
    if (!link) return;
    let destination;
    try { destination = new URL(link.href, location.href); } catch (_) { return; }
    const properties = {
      cta_id: clean(link.dataset.analyticsId || link.dataset.funnel || link.textContent, 100),
      destination_host: destination.hostname,
      destination_path: destination.pathname,
      product: clean(link.dataset.product || document.body.dataset.product || funnelId(), 100)
    };
    if (link.matches('[data-primary-cta], .button-primary, .cta:not(.secondary)')) {
      captureBeforeNavigation('primary_cta_click', properties);
    }
    if (CHECKOUT_HOSTS.has(destination.hostname)) captureBeforeNavigation('checkout_click', properties);
  });
})();
