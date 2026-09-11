(function(){
  'use strict';
  if(window.__STRATUM_TRUST_REVENUE_LAYER__) return;
  window.__STRATUM_TRUST_REVENUE_LAYER__='2026.09.11-v1';

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const capture=(name,props)=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({trust_layer_version:window.__STRATUM_TRUST_REVENUE_LAYER__,route:path},props||{}));}catch(_){}};
  const robots=(document.querySelector('meta[name="robots"]')||{}).content||'';
  const isNoIndex=/noindex/i.test(robots);

  const family=(()=>{
    if(['/','/product-router.html','/live-lab.html','/systems/','/evidence.html'].includes(path)) return 'core';
    if(['/ai-saas-waste-calculator.html','/ai-saas-spend-audit-checklist.html','/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html'].includes(path)) return 'spend';
    if(['/b2b/','/workflow-audit.html','/sample-workflow-audit.html'].includes(path)) return 'workflow';
    if(['/ai-agent-economics-calculator.html','/agent-control-auditor.html','/cross-agent-operating-kit.html'].includes(path)) return 'agent';
    if(path.startsWith('/revenue-pump/')||['/ai-monetization-reality-check.html','/ai-income-claim-checklist.html','/rustchain-bounty-radar.html'].includes(path)) return 'revenue';
    if(path.startsWith('/money-resilience/')) return 'money';
    if(path.startsWith('/72-hour-household-readiness/')) return 'household';
    return 'other';
  })();

  const map={
    core:{label:'Evidence first',steps:['Measure','Understand','Verify','Choose'],links:[['Evidence standard','/evidence.html'],['Free tools','/live-lab.html'],['Revenue routes','/product-router.html']]},
    spend:{label:'Spend confidence',steps:['Detect','Validate','Prove','Escalate'],links:[['Free calculator','/ai-saas-waste-calculator.html'],['Audit checklist','/ai-saas-spend-audit-checklist.html'],['Evidence standard','/evidence.html']]},
    workflow:{label:'Workflow confidence',steps:['Diagnose','Size','Preview','Audit'],links:[['Free diagnostic','/b2b/'],['Sample audit','/sample-workflow-audit.html'],['Evidence standard','/evidence.html']]},
    agent:{label:'Agent confidence',steps:['Economics','Control','Operate','Verify'],links:[['Economics','/ai-agent-economics-calculator.html'],['Control audit','/agent-control-auditor.html'],['Evidence standard','/evidence.html']]},
    revenue:{label:'Revenue confidence',steps:['Problem','Answer','Decision','Action'],links:[['Revenue Pump','/revenue-pump/'],['Claim check','/ai-income-claim-checklist.html'],['Evidence standard','/evidence.html']]},
    money:{label:'Decision support',steps:['Input','Stress','Compare','Save'],links:[['Method & boundaries','/evidence.html'],['Privacy','/privacy.html'],['Home readiness','/72-hour-household-readiness/']]},
    household:{label:'Preparedness confidence',steps:['Check','Prioritize','Act','Save'],links:[['Method & boundaries','/evidence.html'],['Privacy','/privacy.html'],['Money resilience','/money-resilience/']]}
  };
  const cfg=map[family];
  if(!cfg) return;

  const style=document.createElement('style');
  style.id='stratum-trust-revenue-style';
  style.textContent=`
  .sptr-wrap{width:min(1180px,calc(100% - 32px));margin:26px auto 34px;box-sizing:border-box}
  .sptr-card{position:relative;overflow:hidden;border:1px solid rgba(127,158,146,.18);border-radius:24px;background:linear-gradient(145deg,rgba(12,19,21,.96),rgba(18,28,29,.92));color:#eef5f2;box-shadow:0 20px 60px rgba(0,0,0,.12);padding:18px}
  .sptr-card:before{content:"";position:absolute;inset:-80% 55% auto -25%;height:320px;background:radial-gradient(circle,rgba(123,224,183,.14),transparent 66%);pointer-events:none}
  .sptr-head{position:relative;display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:14px}.sptr-kicker{display:flex;align-items:center;gap:8px;font:800 10px/1.2 system-ui,sans-serif;letter-spacing:.13em;text-transform:uppercase;color:rgba(238,245,242,.62)}.sptr-kicker i{width:7px;height:7px;border-radius:50%;background:#7be0b7;box-shadow:0 0 16px rgba(123,224,183,.7)}.sptr-head a{font:750 11px/1.2 system-ui,sans-serif;color:#dffcf0;text-decoration:none}
  .sptr-flow{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.sptr-step{min-height:68px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.035);padding:11px 12px;display:flex;align-items:center;gap:10px}.sptr-step span{display:grid;place-items:center;flex:0 0 26px;width:26px;height:26px;border-radius:50%;border:1px solid rgba(123,224,183,.32);color:#9cebc9;font:800 10px/1 system-ui,sans-serif}.sptr-step b{font:760 12px/1.25 system-ui,sans-serif;letter-spacing:-.01em}.sptr-step:after{content:"";position:absolute;height:1px;background:linear-gradient(90deg,rgba(123,224,183,.15),rgba(123,224,183,.75),rgba(123,224,183,.15));opacity:.35}
  .sptr-links{position:relative;display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.sptr-links a{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035);color:#eaf7f1;text-decoration:none;font:720 11px/1 system-ui,sans-serif;transition:transform .18s ease,border-color .18s ease,background .18s ease}.sptr-links a:hover{transform:translateY(-1px);border-color:rgba(123,224,183,.34);background:rgba(123,224,183,.06)}
  .sptr-note{position:relative;margin:13px 0 0;color:rgba(238,245,242,.55);font:500 10.5px/1.55 system-ui,sans-serif}.sptr-note strong{color:rgba(238,245,242,.82);font-weight:760}
  .sptr-inline-proof{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-top:10px!important;padding:10px 12px!important;border:1px solid rgba(123,224,183,.14)!important;border-radius:14px!important;background:rgba(123,224,183,.05)!important;color:inherit!important;text-decoration:none!important}.sptr-inline-proof span{font-size:11px!important;font-weight:760!important}.sptr-inline-proof b{font-size:16px!important;color:#7be0b7!important}
  @media(max-width:760px){.sptr-wrap{width:min(100% - 20px,1180px);margin:18px auto 84px}.sptr-flow{grid-template-columns:1fr 1fr}.sptr-head{align-items:flex-start}.sptr-links{display:grid;grid-template-columns:1fr}.sptr-links a{justify-content:space-between}}
  @media(max-width:420px){.sptr-flow{grid-template-columns:1fr}.sptr-step{min-height:56px}}
  @media(prefers-reduced-motion:reduce){.sptr-links a{transition:none!important}}
  `;
  document.head.appendChild(style);

  function renderStrip(){
    if(path==='/evidence.html'||isNoIndex) return;
    const main=document.querySelector('main');
    if(!main||document.querySelector('[data-stratum-trust-strip]')) return;
    const wrap=document.createElement('section');
    wrap.className='sptr-wrap';wrap.dataset.stratumTrustStrip='';wrap.setAttribute('aria-label','Evidence and next-step confidence');
    const steps=cfg.steps.map((s,i)=>'<div class="sptr-step"><span>0'+(i+1)+'</span><b>'+s+'</b></div>').join('');
    const links=cfg.links.map((x,i)=>'<a href="'+x[1]+'" data-analytics-id="trust_route_'+family+'_'+(i+1)+'"><span>'+x[0]+'</span><b>→</b></a>').join('');
    wrap.innerHTML='<div class="sptr-card"><div class="sptr-head"><div class="sptr-kicker"><i></i><span>'+cfg.label+'</span></div><a href="/evidence.html" data-analytics-id="trust_evidence_top">How Stratum earns trust →</a></div><div class="sptr-flow">'+steps+'</div><div class="sptr-links">'+links+'</div><p class="sptr-note"><strong>No invented proof.</strong> Free routes remain valid end states. Paid layers appear only where an existing route and price already exist.</p></div>';
    main.appendChild(wrap);
  }

  function enhanceGrowthPanel(){
    const host=document.querySelector('.spg-trust');
    if(!host||host.querySelector('.sptr-inline-proof')) return;
    const a=document.createElement('a');
    a.className='sptr-inline-proof';a.href='/evidence.html';a.dataset.analyticsId='growth_panel_evidence';
    a.innerHTML='<span>Evidence standard / boundaries</span><b>→</b>';
    host.prepend(a);
  }

  function track(){
    document.addEventListener('click',e=>{
      const a=e.target.closest&&e.target.closest('[data-stratum-trust-strip] a,.sptr-inline-proof');
      if(!a) return;
      capture('trust_route_click',{family,destination:a.getAttribute('href')||'',action_id:a.dataset.analyticsId||''});
    },{capture:true});
  }

  function ready(){renderStrip();setTimeout(enhanceGrowthPanel,120);track();capture('trust_layer_ready',{family,indexable:!isNoIndex,reduced_motion:reduce});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
