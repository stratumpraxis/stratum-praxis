/* Stratum Praxis reveal motion — 2026-09-09
   Instagram/Reels-inspired fade: soft opacity, slight rise, tiny scale, staggered children.
   Runs once per element, preserves reduced-motion accessibility. */
(function(){
  'use strict';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  root.classList.add('sp-motion-ready');

  const selectors = [
    '.hero-copy', '.signature-stage', '.hero-side', '.principle',
    '.section-heading', '.proof-card', '.card', '.resource-card',
    '.audit-grid > *', '.kit-grid > *', '.report-grid > *', '.connect-grid > *',
    '.diagnostic-shell', '.panel', '.metric', '.comparison', '.next-card',
    '.method-grid > *', '.context > *'
  ];

  const nodes = [...document.querySelectorAll(selectors.join(','))]
    .filter((el, i, arr) => arr.indexOf(el) === i);

  nodes.forEach((el) => {
    el.classList.add('sp-reveal');
    const parent = el.parentElement;
    if(parent){
      const siblings = [...parent.children].filter(x => nodes.includes(x));
      const idx = Math.max(0, siblings.indexOf(el));
      el.style.setProperty('--sp-reveal-delay', Math.min(idx * 55, 220) + 'ms');
    }
  });

  if(reduce || !('IntersectionObserver' in window)){
    nodes.forEach(el => el.classList.add('sp-reveal-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('sp-reveal-in');
        io.unobserve(entry.target);
      }
    });
  }, {rootMargin:'0px 0px -8% 0px', threshold:0.12});

  nodes.forEach(el => io.observe(el));
})();
