(function () {
  'use strict';

  let pendingCheckout = null;
  let resetTimer = null;

  function clean(value, limit) {
    return String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, limit || 120);
  }

  const heroActions = document.querySelector('.hero .actions');
  if (heroActions && !document.querySelector('.hero .checkout-fit')) {
    const buyerFit = document.createElement('p');
    buyerFit.className = 'checkout-fit';
    buyerFit.style.cssText = 'max-width:630px;margin:0 0 14px;color:#b9c8c2;font-size:12.5px;line-height:1.62';
    buyerFit.innerHTML = '<span class="locale locale-en">Best fit: teams or solo operators coordinating multiple AI agents or tools who want fewer handoff failures and clearer execution ownership.</span><span class="locale locale-ja">最適：複数のAIエージェントやツールを連携し、引き継ぎミスを減らして実行責任を明確にしたいチーム／個人運用者。</span><span class="locale locale-ko">적합 대상: 여러 AI 에이전트나 도구를 함께 운영하며 핸드오프 실패를 줄이고 실행 책임을 명확히 하려는 팀 또는 개인 운영자.</span><span class="locale locale-zh">适合：协同多个 AI 智能体或工具，希望减少交接失败并明确执行责任的团队或个人运营者。</span>';
    heroActions.parentNode.insertBefore(buyerFit, heroActions);
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
