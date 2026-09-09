/* Stratum Praxis reveal motion — 2026-09-09
   Instagram/Reels-inspired fade: soft opacity, slight rise, tiny scale, staggered children.
   Runs once per element, preserves reduced-motion accessibility.
   Also injects a pain-first inbound entry layer on the homepage so visitors can start from the problem they already feel. */
(function(){
  'use strict';

  function installPainEntry(){
    const pathStrip = document.querySelector('.path-strip');
    if(!pathStrip || document.querySelector('.sp-pain-entry')) return;

    const style = document.createElement('style');
    style.textContent = `
      .sp-pain-entry{position:relative;padding:72px 20px;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,.008));overflow:hidden}
      .sp-pain-entry::before{content:"";position:absolute;inset:auto -12% -65% 42%;height:420px;background:radial-gradient(circle,rgba(143,227,197,.10),transparent 64%);pointer-events:none}
      .sp-pain-wrap{position:relative;z-index:1;width:min(1180px,100%);margin:0 auto}
      .sp-pain-kicker{margin:0 0 12px;color:#8fe3c5;font-size:12px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
      .sp-pain-entry h2{max-width:800px;margin:0;font-size:clamp(34px,5vw,62px);line-height:1.02;letter-spacing:-.045em}
      .sp-pain-intro{max-width:760px;margin:18px 0 0;color:var(--muted,#9da6b2);font-size:17px;line-height:1.65}
      .sp-pain-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:34px}
      .sp-pain-card{position:relative;display:flex;min-height:230px;flex-direction:column;padding:24px;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:linear-gradient(155deg,rgba(255,255,255,.055),rgba(255,255,255,.018));text-decoration:none;color:inherit;transition:transform .24s ease,border-color .24s ease,background .24s ease,box-shadow .24s ease}
      .sp-pain-card:hover,.sp-pain-card:focus-visible{transform:translateY(-6px);border-color:rgba(143,227,197,.62);background:linear-gradient(155deg,rgba(143,227,197,.075),rgba(201,184,255,.028));box-shadow:0 22px 70px rgba(0,0,0,.18)}
      .sp-pain-card small{color:#8fe3c5;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
      .sp-pain-card strong{display:block;margin:28px 0 12px;font-size:22px;line-height:1.18;letter-spacing:-.025em}
      .sp-pain-card span{color:var(--muted,#9da6b2);font-size:14px;line-height:1.55}
      .sp-pain-card em{margin-top:auto;padding-top:22px;color:var(--silver,#eef2f5);font-size:13px;font-style:normal;font-weight:800}
      .sp-pain-note{margin:18px 0 0;color:var(--muted,#9da6b2);font-size:12px}
      @media(max-width:940px){.sp-pain-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:620px){.sp-pain-entry{padding:54px 18px}.sp-pain-grid{grid-template-columns:1fr}.sp-pain-card{min-height:190px}}
      @media(prefers-reduced-motion:reduce){.sp-pain-card{transition:none}.sp-pain-card:hover,.sp-pain-card:focus-visible{transform:none}}
    `;
    document.head.appendChild(style);

    const section = document.createElement('section');
    section.className = 'sp-pain-entry';
    section.setAttribute('aria-labelledby','sp-pain-title');
    section.innerHTML = `
      <div class="sp-pain-wrap">
        <p class="sp-pain-kicker">Start from the pain · No signup required</p>
        <h2 id="sp-pain-title">What is wasting time, money, or control right now?</h2>
        <p class="sp-pain-intro">Do not choose an AI product first. Choose the problem you already feel, use the smallest diagnostic, and only move to a paid layer when the evidence is strong enough.</p>
        <div class="sp-pain-grid">
          <a class="sp-pain-card" href="/b2b/" data-analytics-id="pain_entry_manual_work" data-product="workflow_diagnostic">
            <small>Manual work</small>
            <strong>People keep copying, checking, chasing, or handing work off.</strong>
            <span>Start here when spreadsheets, approvals, duplicate entry, reporting, or recurring handoffs are eating time.</span>
            <em>Check the workflow →</em>
          </a>
          <a class="sp-pain-card" href="/ai-saas-waste-calculator.html" data-analytics-id="pain_entry_ai_cost" data-product="ai_saas_waste">
            <small>AI / SaaS cost</small>
            <strong>Software spend is rising, but the value is hard to prove.</strong>
            <span>Start here when renewals, AI add-ons, unused seats, overlapping tools, or unclear ownership are building up.</span>
            <em>Estimate spend exposure →</em>
          </a>
          <a class="sp-pain-card" href="/agent-control-auditor.html" data-analytics-id="pain_entry_agent_control" data-product="agent_control_auditor">
            <small>Agent risk</small>
            <strong>The agent can act, but nobody is sure where it should stop.</strong>
            <span>Start here when permissions, retries, external actions, budgets, or human approval gates are unclear.</span>
            <em>Audit control gaps →</em>
          </a>
          <a class="sp-pain-card" href="/ai-consultant.html" data-analytics-id="pain_entry_unclear_start" data-product="ai_consultant">
            <small>Unclear priority</small>
            <strong>There are too many AI ideas and no obvious first move.</strong>
            <span>Start here when the real bottleneck could be workflow, economics, productization, research, or sales.</span>
            <em>Find the first move →</em>
          </a>
        </div>
        <p class="sp-pain-note">Large recurring workflow pain can escalate to the existing $499 AI Workflow Opportunity Audit. No new product or checkout is required.</p>
      </div>`;

    pathStrip.insertAdjacentElement('afterend', section);
  }

  installPainEntry();

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  root.classList.add('sp-motion-ready');

  const selectors = [
    '.hero-copy', '.signature-stage', '.hero-side', '.principle',
    '.section-heading', '.proof-card', '.card', '.resource-card', '.sp-pain-card', '.sp-pain-entry h2', '.sp-pain-intro',
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
