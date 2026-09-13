(function () {
  'use strict';

  let pendingCheckout = null;
  let resetTimer = null;

  function clean(value, limit) {
    return String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, limit || 120);
  }

  const demoVideo = document.getElementById('cross-agent-product-demo');
  if (demoVideo) {
    let played = false;
    let half = false;
    demoVideo.addEventListener('play', function () {
      if (played) return;
      played = true;
      if (window.scosCapture) window.scosCapture('product_video_play', { product: 'cross_agent_operating_kit', asset: 'cross_agent_operating_kit_personal_v1', duration_seconds: 34 });
    });
    demoVideo.addEventListener('timeupdate', function () {
      if (half || !demoVideo.duration || demoVideo.currentTime < demoVideo.duration * 0.5) return;
      half = true;
      if (window.scosCapture) window.scosCapture('product_video_half', { product: 'cross_agent_operating_kit', asset: 'cross_agent_operating_kit_personal_v1' });
    });
    demoVideo.addEventListener('ended', function () {
      if (window.scosCapture) window.scosCapture('product_video_complete', { product: 'cross_agent_operating_kit', asset: 'cross_agent_operating_kit_personal_v1' });
    });
  }

  document.addEventListener('click', function (event) {
    const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;

    let url;
    try { url = new URL(link.href, location.href); } catch (_) { return; }
    if (url.hostname !== 'buy.stripe.com') return;

    pendingCheckout = {
      cta_id: clean(link.dataset.analyticsId || link.textContent, 100),
      product: clean(link.dataset.product || 'cross_agent_operating_kit', 100),
      price: clean(link.dataset.price || '', 32),
      currency: clean(link.dataset.currency || 'USD', 12),
      location: clean(link.dataset.location || '', 60),
      destination_host: url.hostname,
      measurement_contract: 'checkout-navigation-v1'
    };

    if (window.scosCapture) window.scosCapture('checkout_navigation', pendingCheckout);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function () { pendingCheckout = null; }, 5000);
  }, { capture: true });

  window.addEventListener('pagehide', function () {
    if (!pendingCheckout || !window.scosCapture) return;
    window.scosCapture('checkout_departure_confirmed', pendingCheckout);
  }, { capture: true });
})();
