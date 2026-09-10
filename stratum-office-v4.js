/* Stratum Praxis AI Office v4 — production bootstrap */
(() => {
  'use strict';
  const s=document.createElement('script');
  s.src='/preview/office.js?v=139d8a4';
  s.onload=()=>document.dispatchEvent(new CustomEvent('stratum:v4ready'));
  s.onerror=()=>console.error('Stratum AI Office interaction layer failed to load.');
  document.head.appendChild(s);
})();
