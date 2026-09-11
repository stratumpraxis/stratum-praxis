(function(){
  'use strict';
  if(window.__STRATUM_EVOLUTION_ENGINE__) return;
  window.__STRATUM_EVOLUTION_ENGINE__='2026.09.11-v1';

  const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const path=location.pathname.replace(/\/index\.html$/,'/');
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const capture=(name,props)=>{ try{ if(window.scosCapture) window.scosCapture(name,Object.assign({evolution_version:window.__STRATUM_EVOLUTION_ENGINE__,route:path},props||{})); }catch(_){} };

  const products=[
    {family:'core',match:p=>['/','/product-router.html','/live-lab.html','/buyer-workspace.html','/systems/'].includes(p),stage:'hub'},
    {family:'spend',match:p=>['/ai-saas-waste-calculator.html','/ai-saas-spend-audit-checklist.html','/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html'].includes(p),stage:'revenue'},
    {family:'workflow',match:p=>['/b2b/','/workflow-audit.html','/sample-workflow-audit.html'].includes(p),stage:'revenue'},
    {family:'agent',match:p=>['/ai-agent-economics-calculator.html','/agent-control-auditor.html','/cross-agent-operating-kit.html','/cross-agent-operating-kit-access.html'].includes(p),stage:'revenue'},
    {family:'revenue',match:p=>p.startsWith('/revenue-pump/')||['/ai-monetization-reality-check.html','/ai-income-claim-checklist.html','/rustchain-bounty-radar.html'].includes(p),stage:'utility'},
    {family:'money',match:p=>p.startsWith('/money-resilience/'),stage:'utility'},
    {family:'household',match:p=>p.startsWith('/72-hour-household-readiness/'),stage:'utility'}
  ];
  const product=products.find(x=>x.match(path))||{family:'other',stage:'other'};
  document.documentElement.dataset.productFamily=product.family;
  document.documentElement.dataset.evolution='on';

  const style=document.createElement('style');
  style.id='stratum-evolution-style';
  style.textContent=`
  :root{--sp-evo-ease:cubic-bezier(.2,.75,.25,1);--sp-evo-ring:rgba(103,217,173,.22)}
  html[data-evolution="on"] :focus-visible{outline:3px solid var(--sp-evo-ring);outline-offset:3px}
  [data-evo-reveal]{opacity:0;transform:translateY(10px);transition:opacity .55s var(--sp-evo-ease),transform .55s var(--sp-evo-ease)}
  [data-evo-reveal].is-evo-visible{opacity:1;transform:none}
  [data-evo-action]{transition:transform .18s var(--sp-evo-ease),box-shadow .18s var(--sp-evo-ease),filter .18s var(--sp-evo-ease)}
  @media(hover:hover){[data-evo-action]:hover{transform:translateY(-1.5px)}}
  [data-evo-action]:active{transform:translateY(0) scale(.985)}
  [data-evo-live]{font-variant-numeric:tabular-nums}
  html[data-product-family="money"]{--sp-evo-ring:rgba(103,217,173,.26)}
  html[data-product-family="household"]{--sp-evo-ring:rgba(89,156,123,.23)}
  @media(max-width:640px){[data-evo-action]{touch-action:manipulation}}
  @media(prefers-reduced-motion:reduce){[data-evo-reveal]{opacity:1!important;transform:none!important;transition:none!important}[data-evo-action]{transition:none!important}}
  `;
  document.head.appendChild(style);

  function classifyActions(){
    $$('a[href],button').forEach(el=>{
      if(el.matches('a[href^="#"],button,[data-primary-cta],[data-analytics-id],.primary,.action-btn,.tool-btn,.module-btn')) el.dataset.evoAction='';
      const text=(el.textContent||'').trim().toLowerCase();
      if(/score|result|¥|\$|%|月|cost|roi|audit|check|診断|結果|購入|buy|checkout/.test(text)) el.dataset.evoLive='';
    });
  }

  function installReveal(){
    if(reduceMotion) return;
    const candidates=$$('main > section, main > article, .panel, .card, .module, .trust-card, .recommend-card, .inventory');
    candidates.slice(0,36).forEach((el,i)=>{ if(!el.dataset.evoReveal){el.dataset.evoReveal='';el.style.transitionDelay=Math.min(i%4,3)*45+'ms';} });
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-evo-visible');io.unobserve(e.target);}}),{rootMargin:'0px 0px -6% 0px',threshold:.08});
    $$('[data-evo-reveal]').forEach(el=>io.observe(el));
  }

  function qualitySnapshot(){
    const h1=$$('h1').length;
    const canonical=!!$('link[rel="canonical"]');
    const description=!!$('meta[name="description"][content]');
    const schema=!!$('script[type="application/ld+json"]');
    const main=!!$('main');
    const viewport=!!$('meta[name="viewport"]');
    const actions=$$('a[href],button').length;
    const primary=$$('[data-primary-cta],a[href*="buy.stripe.com"],a[href*="payhip.com"],a[href*="gumroad.com"],.primary,.action-btn').length;
    const text=(document.body&&document.body.innerText||'').replace(/\s+/g,' ').trim();
    const words=text.length;
    const headings=$$('h1,h2,h3').length||1;
    const density=Math.round(words/headings);
    const motion=reduceMotion?true:!!($('[data-evo-reveal]')||getComputedStyle(document.documentElement).scrollBehavior==='smooth');
    let score=0;
    score+=h1===1?14:4; score+=canonical?12:0; score+=description?12:0; score+=schema?10:0; score+=main?10:0; score+=viewport?10:0; score+=actions?8:0; score+=primary?8:4; score+=density<900?8:density<1400?5:2; score+=motion?8:4;
    score=Math.min(100,score);
    const snapshot={family:product.family,stage:product.stage,score,h1,canonical,description,schema,actions,primary,density,reduced_motion:reduceMotion};
    try{
      const key='sp_evolution_quality:'+path; const prev=JSON.parse(localStorage.getItem(key)||'null');
      if(prev&&typeof prev.score==='number') snapshot.delta=score-prev.score;
      localStorage.setItem(key,JSON.stringify({score,ts:Date.now()}));
    }catch(_){}
    capture('evolution_quality_snapshot',snapshot);
    return snapshot;
  }

  function revenueTracking(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('a[href],button'); if(!el) return;
      const href=el.tagName==='A'?el.getAttribute('href')||'':'';
      let step='interaction';
      if(/buy\.stripe\.com|payhip\.com|gumroad\.com/.test(href)) step='checkout';
      else if(el.matches('[data-primary-cta],.primary,.action-btn')) step='qualified_action';
      else if(/result|score|診断|check|audit|product|buyer/.test((el.textContent||'').toLowerCase())) step='decision_action';
      capture('evolution_action',{family:product.family,step,action_id:el.dataset.analyticsId||el.id||'',destination:href.slice(0,220)});
    },{capture:true});
  }

  function resultDetection(){
    const selectors=['#resultPanel','#results','#result-stage','.diag-result','.result-panel','.module-result','[aria-live="polite"]'];
    const nodes=selectors.flatMap(s=>$$(s)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,16);
    if(!nodes.length) return;
    let sent=false;
    const inspect=()=>{
      if(sent) return;
      const visible=nodes.some(n=>!n.hidden&&getComputedStyle(n).display!=='none'&&((n.innerText||'').replace(/\s+/g,' ').trim().length>18));
      if(visible){sent=true;capture('evolution_result_visible',{family:product.family});}
    };
    const mo=new MutationObserver(inspect); nodes.forEach(n=>mo.observe(n,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','style']})); inspect();
  }

  function internalLinkHealth(){
    const run=()=>{
      const urls=[...new Set($$('a[href]').map(a=>a.href).filter(h=>{try{const u=new URL(h,location.href);return u.origin===location.origin&&!u.hash&&u.pathname!==path;}catch(_){return false;}}))].slice(0,10);
      if(!urls.length) return;
      Promise.all(urls.map(u=>fetch(u,{method:'HEAD',cache:'no-store'}).then(r=>({u,status:r.status,ok:r.ok})).catch(()=>({u,status:0,ok:false})))).then(rows=>{
        const broken=rows.filter(r=>!r.ok);
        capture('evolution_link_health',{checked:rows.length,broken:broken.length,broken_paths:broken.slice(0,4).map(r=>{try{return new URL(r.u).pathname}catch(_){return''}}).join(',')});
      });
    };
    if('requestIdleCallback' in window) requestIdleCallback(run,{timeout:3500}); else setTimeout(run,2200);
  }

  function routeSpecificPolish(){
    if(product.family==='money'){
      const live=$('#scoreValue,#monthlyImpact,#bufferMonths'); if(live) live.dataset.evoLive='';
      const scenario=$$('.scenario button,.compare-card'); scenario.forEach(el=>el.dataset.evoAction='');
    }
    if(product.family==='household') $$('input,button,.check-item,.result-card').forEach(el=>{ if(el.matches('button,.check-item'))el.dataset.evoAction=''; });
    if(product.family==='core') $$('.office-nav a,.launcher-card,.decision-card,.recommend-card,.inventory-row').forEach(el=>el.dataset.evoAction='');
  }

  function ready(){
    classifyActions(); routeSpecificPolish(); installReveal(); revenueTracking(); resultDetection();
    setTimeout(qualitySnapshot,450); internalLinkHealth();
    capture('evolution_engine_ready',{family:product.family,stage:product.stage});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
