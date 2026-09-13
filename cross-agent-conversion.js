(function () {
  'use strict';

  let pendingCheckout = null;
  let resetTimer = null;

  function clean(value, limit) {
    return String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, limit || 120);
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
