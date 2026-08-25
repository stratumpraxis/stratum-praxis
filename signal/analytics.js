(() => {
  const API_KEY = 'phc_oTYapRSNXDtn8aY7wMNHfCDexRTkfb2H44MDVXwoUMSN';
  const ENDPOINT = 'https://us.i.posthog.com/i/v0/e/';
  const storageKey = 'signal_praxis_anon_id';
  let distinctId = localStorage.getItem(storageKey);
  if (!distinctId) {
    distinctId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(storageKey, distinctId);
  }

  function capture(event, properties = {}) {
    const payload = {
      api_key: API_KEY,
      event,
      properties: {
        distinct_id: distinctId,
        $current_url: location.href,
        $referrer: document.referrer || '',
        page_path: location.pathname,
        media_brand: 'Signal Praxis',
        ...properties
      },
      timestamp: new Date().toISOString()
    };
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, mode: 'cors' }).catch(() => {});
      }
    } catch (_) {}
  }

  capture('funnel_view', { funnel: 'signal_praxis', content_type: document.querySelector('article') ? 'article' : 'hub' });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.href;
    const ownProduct = href.includes('/ai-council-builder-ja.html');
    const external = link.origin !== location.origin;
    if (ownProduct) capture('primary_cta_click', { funnel: 'signal_praxis', cta: 'ai_council_builder_ja', destination: href });
    if (external) capture('signal_outbound_click', { destination: href, link_text: (link.textContent || '').trim().slice(0, 120) });
  }, { passive: true });
})();
