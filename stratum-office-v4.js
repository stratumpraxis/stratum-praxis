/* Stratum Praxis AI Office v4 — production bootstrap. Verified-route deploy. */
(() => {
  'use strict';
  const loadRevenueNavigator=()=>{
    if(document.body?.dataset.page!=='stratum_revenue_home_v2')return;
    if(document.querySelector('script[src*="stratum-revenue-navigator.js"]'))return;
    const n=document.createElement('script');
    n.src='/stratum-revenue-navigator.js?v=1';
    n.defer=true;
    document.head.appendChild(n);
  };
  const s=document.createElement('script');
  s.src='/preview/office.js?v=139d8a4';
  s.onload=()=>{document.dispatchEvent(new CustomEvent('stratum:v4ready'));loadRevenueNavigator()};
  s.onerror=()=>{console.error('Stratum AI Office interaction layer failed to load.');loadRevenueNavigator()};
  document.head.appendChild(s);
})();