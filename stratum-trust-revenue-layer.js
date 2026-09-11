(function(){
  'use strict';
  if(window.__STRATUM_TRUST_REVENUE_LAYER__) return;
  window.__STRATUM_TRUST_REVENUE_LAYER__='2026.09.11-v2-site-strength';

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const capture=(name,props)=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({trust_layer_version:window.__STRATUM_TRUST_REVENUE_LAYER__,route:path},props||{}));}catch(_){}};
  const robots=(document.querySelector('meta[name="robots"]')||{}).content||'';
  const isNoIndex=/noindex/i.test(robots);

  const family=(()=>{
    if(['/','/product-router.html','/live-lab.html','/systems/','/evidence.html'].includes(path)) return 'core';
    if(['/ai-saas-waste-calculator.html','/ai-saas-spend-audit-checklist.html','/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html','/saas-renewal-decision.html','/ai-agent-cost-roi-calculator.html'].includes(path)) return 'spend';
    if(['/b2b/','/workflow-audit.html','/sample-workflow-audit.html','/workflow-automation-comparison.html'].includes(path)) return 'workflow';
    if(['/ai-agent-economics-calculator.html','/agent-control-auditor.html','/cross-agent-operating-kit.html','/ai-coding-assistant-comparison.html'].includes(path)) return 'agent';
    if(path.startsWith('/revenue-pump/')||['/ai-monetization-reality-check.html','/ai-income-claim-checklist.html','/rustchain-bounty-radar.html'].includes(path)) return 'revenue';
    if(path.startsWith('/money-resilience/')) return 'money';
    if(path.startsWith('/72-hour-household-readiness/')) return 'household';
    if(path.startsWith('/guides/')) return 'guides';
    return 'other';
  })();

  const map={
    core:{label:'Decision integrity',steps:['Observe','Measure','Verify','Decide']},
    spend:{label:'Spend integrity',steps:['Input','Compare','Pressure-test','Decide']},
    workflow:{label:'Workflow integrity',steps:['Map','Expose','Rank','Control']},
    agent:{label:'Agent integrity',steps:['Economics','Control','Operate','Verify']},
    revenue:{label:'Revenue integrity',steps:['Problem','Answer','Decision','Evidence']},
    money:{label:'Decision support',steps:['Input','Stress','Compare','Review']},
    household:{label:'Preparedness integrity',steps:['Check','Prioritize','Act','Review']},
    guides:{label:'Editorial integrity',steps:['Question','Evidence','Tool','Decision']}
  };
  const cfg=map[family];
  if(!cfg) return;

  const integrity=(()=>{
    const canonical=document.querySelector('link[rel="canonical"]');
    const description=document.querySelector('meta[name="description"]');
    return [
      ['HTTPS',location.protocol==='https:'||location.hostname==='localhost'],
      ['Canonical',!!(canonical&&canonical.href)],
      ['Description',!!(description&&String(description.content||'').trim().length>=40)],
      ['Schema',!!document.querySelector('script[type="application/ld+json"]')],
      ['Indexable',!isNoIndex]
    ];
  })();

  const style=document.createElement('style');
  style.id='stratum-trust-revenue-style';
  style.textContent=`
  :where(a,button,input,select,textarea):focus-visible{outline:3px solid rgba(89,168,139,.46);outline-offset:3px}
  .sptr-wrap{width:min(1180px,calc(100% - 32px));margin:28px auto 42px;box-sizing:border-box}
  .sptr-card{position:relative;overflow:hidden;border:1px solid rgba(127,158,146,.18);border-radius:28px;background:linear-gradient(145deg,#101817,#17231f 58%,#101716);color:#eef5f2;box-shadow:0 26px 72px rgba(0,0,0,.15);padding:22px}
  .sptr-card:before{content:"";position:absolute;inset:-130px auto auto -120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(123,224,183,.14),transparent 66%);pointer-events:none}
  .sptr-card:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(to right,#000,transparent 72%);pointer-events:none}
  .sptr-head,.sptr-flow,.sptr-integrity,.sptr-links,.sptr-note{position:relative;z-index:1}
  .sptr-head{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:end;margin-bottom:17px}
  .sptr-kicker{display:flex;align-items:center;gap:9px;font:800 10px/1.2 system-ui,sans-serif;letter-spacing:.13em;text-transform:uppercase;color:rgba(238,245,242,.58)}
  .sptr-kicker i{width:7px;height:7px;border-radius:50%;background:#7be0b7;box-shadow:0 0 0 5px rgba(123,224,183,.08),0 0 18px rgba(123,224,183,.45)}
  .sptr-title{margin:8px 0 0;max-width:760px;font:650 clamp(23px,3vw,34px)/1.04 system-ui,sans-serif;letter-spacing:-.045em;text-wrap:balance}
  .sptr-head>a{align-self:start;display:inline-flex;min-height:38px;align-items:center;padding:0 12px;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#e6f8ef;text-decoration:none;font:730 10px/1 system-ui,sans-serif;background:rgba(255,255,255,.035)}
  .sptr-flow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .sptr-step{position:relative;min-height:76px;border:1px solid rgba(255,255,255,.075);border-radius:17px;background:rgba(255,255,255,.032);padding:13px;display:flex;align-items:center;gap:11px;overflow:hidden}
  .sptr-step:before{content:"";position:absolute;left:0;top:0;width:100%;height:2px;background:linear-gradient(90deg,#76d6b1,transparent);opacity:.52;transform-origin:left;transform:scaleX(.18);transition:transform .5s cubic-bezier(.2,.7,.2,1)}
  .sptr-step:hover:before,.sptr-step:focus-within:before{transform:scaleX(1)}
  .sptr-step span{display:grid;place-items:center;flex:0 0 29px;width:29px;height:29px;border-radius:50%;border:1px solid rgba(123,224,183,.29);color:#9cebc9;font:800 9px/1 system-ui,sans-serif;background:rgba(123,224,183,.04)}
  .sptr-step b{font:730 12px/1.25 system-ui,sans-serif;letter-spacing:-.01em}
  .sptr-integrity{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:10px}
  .sptr-check{min-height:48px;display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(255,255,255,.065);border-radius:13px;background:rgba(3,8,6,.18);font:690 9px/1.2 system-ui,sans-serif;color:rgba(238,245,242,.62)}
  .sptr-check i{width:7px;height:7px;border-radius:50%;background:#7be0b7;box-shadow:0 0 11px rgba(123,224,183,.34)}
  .sptr-check.off i{background:#d9a86c;box-shadow:none}.sptr-check.off{color:#d8c1a5}
  .sptr-links{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
  .sptr-links a{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03);color:#eaf7f1;text-decoration:none;font:710 10px/1 system-ui,sans-serif;transition:transform .18s ease,border-color .18s ease,background .18s ease}
  .sptr-links a:hover{transform:translateY(-1px);border-color:rgba(123,224,183,.32);background:rgba(123,224,183,.055)}
  .sptr-note{margin:13px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);display:flex;gap:10px;align-items:flex-start;color:rgba(238,245,242,.52);font:500 10px/1.6 system-ui,sans-serif}
  .sptr-note:before{content:"";flex:0 0 6px;width:6px;height:6px;margin-top:5px;border-radius:50%;background:#7be0b7}.sptr-note strong{color:rgba(238,245,242,.84);font-weight:760}
  .sptr-inline-proof{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-top:10px!important;padding:10px 12px!important;border:1px solid rgba(123,224,183,.14)!important;border-radius:14px!important;background:rgba(123,224,183,.05)!important;color:inherit!important;text-decoration:none!important}.sptr-inline-proof span{font-size:11px!important;font-weight:760!important}.sptr-inline-proof b{font-size:16px!important;color:#7be0b7!important}
  body[data-page="stratum_revenue_home_v2"]{background:radial-gradient(circle at 8% 0%,rgba(205,235,222,.32),transparent 28rem),radial-gradient(circle at 96% 18%,rgba(236,176,145,.16),transparent 30rem),#f4f0e8;color:#171a1a}
  body[data-page="stratum_revenue_home_v2"] .office-header{border-color:rgba(26,29,28,.09);background:rgba(249,246,239,.86);backdrop-filter:blur(18px) saturate(1.08);box-shadow:0 10px 32px rgba(31,32,29,.055)}
  body[data-page="stratum_revenue_home_v2"] .office-nav{gap:5px;padding:4px;border:1px solid rgba(25,29,27,.08);border-radius:999px;background:rgba(255,255,255,.52)}
  body[data-page="stratum_revenue_home_v2"] .office-nav a{padding:8px 13px;border-radius:999px}
  body[data-page="stratum_revenue_home_v2"] .office-nav a:hover{background:#fff;box-shadow:0 4px 14px rgba(20,23,22,.06)}
  body[data-page="stratum_revenue_home_v2"] .b2b-badge{background:#dcece5;color:#30453e;border-color:#c9ddd4}
  body[data-page="stratum_revenue_home_v2"] .sptr-wrap{margin-top:18px;margin-bottom:58px}
  body[data-page="stratum_revenue_home_v2"] .sptr-card{border-radius:31px;padding:25px;background:linear-gradient(140deg,#121a18,#1b2924 56%,#101614)}
  .sptr-reveal{opacity:0;transform:translateY(16px)}.sptr-reveal.sptr-visible{opacity:1;transform:none;transition:opacity .58s ease,transform .58s cubic-bezier(.2,.7,.2,1)}
  @media(max-width:760px){.sptr-wrap{width:min(100% - 20px,1180px);margin:18px auto 84px}.sptr-head{grid-template-columns:1fr;align-items:start}.sptr-head>a{width:max-content}.sptr-flow{grid-template-columns:1fr 1fr}.sptr-integrity{grid-template-columns:1fr 1fr}.sptr-links{display:grid;grid-template-columns:1fr 1fr}.sptr-links a{justify-content:space-between}}
  @media(max-width:440px){.sptr-flow,.sptr-links{grid-template-columns:1fr}.sptr-integrity{grid-template-columns:1fr 1fr}.sptr-step{min-height:58px}.sptr-card{padding:17px;border-radius:22px}}
  @media(prefers-reduced-motion:reduce){.sptr-links a,.sptr-step:before,.sptr-reveal,.sptr-reveal.sptr-visible{transition:none!important;transform:none!important;opacity:1!important}}
  `;
  document.head.appendChild(style);

  const labels=()=>{
    const lang=(document.documentElement.lang||'en').toLowerCase();
    if(lang.startsWith('ja')) return {
      title:'判断の根拠を、画面の中で確認できる。',method:'Method / 境界',privacy:'Privacy',terms:'Terms',sample:'Sample',note:'入力・計算・限界・次の判断を分けて表示します。売るために成果を作らず、確認できるEvidenceだけを使います。',proof:['無料で開始','自分の入力値','透明な前提','固定範囲']
    };
    if(lang.startsWith('es')) return {
      title:'La lógica de la decisión se puede verificar en la propia interfaz.',method:'Método / límites',privacy:'Privacidad',terms:'Términos',sample:'Muestra',note:'Separamos entradas, cálculo, límites y siguiente decisión. No fabricamos resultados para vender.',proof:['Entrada gratis','Tus datos','Supuestos visibles','Alcance fijo']
    };
    return {
      title:'The decision logic is visible inside the product.',method:'Method / boundaries',privacy:'Privacy',terms:'Terms',sample:'Sample',note:'Inputs, calculation, limits and the next decision are kept separate. Stratum does not manufacture outcomes to make a sale.',proof:['Free entry','Your inputs','Visible assumptions','Fixed scope']
    };
  };

  function renderStrip(){
    if(path==='/evidence.html'||isNoIndex) return;
    const main=document.querySelector('main');
    if(!main||document.querySelector('[data-stratum-trust-strip]')) return;
    const t=labels();
    const wrap=document.createElement('section');
    wrap.className='sptr-wrap sptr-reveal';wrap.dataset.stratumTrustStrip='';wrap.setAttribute('aria-label','Decision integrity and site quality');
    const steps=cfg.steps.map((s,i)=>'<div class="sptr-step"><span>0'+(i+1)+'</span><b>'+s+'</b></div>').join('');
    const checks=integrity.map(x=>'<div class="sptr-check '+(x[1]?'':'off')+'"><i></i><span>'+x[0]+'</span></div>').join('');
    const extra=family==='workflow'?'<a href="/sample-workflow-audit.html" data-analytics-id="trust_sample"><span>'+t.sample+'</span><b>→</b></a>':'';
    wrap.innerHTML='<div class="sptr-card"><div class="sptr-head"><div><div class="sptr-kicker"><i></i><span>'+cfg.label+'</span></div><h2 class="sptr-title">'+t.title+'</h2></div><a href="/evidence.html" data-analytics-id="trust_evidence_top">'+t.method+' →</a></div><div class="sptr-flow">'+steps+'</div><div class="sptr-integrity" aria-label="Page integrity checks">'+checks+'</div><div class="sptr-links"><a href="/evidence.html" data-analytics-id="trust_method"><span>'+t.method+'</span><b>→</b></a><a href="/privacy.html" data-analytics-id="trust_privacy"><span>'+t.privacy+'</span><b>→</b></a><a href="/terms.html" data-analytics-id="trust_terms"><span>'+t.terms+'</span><b>→</b></a>'+extra+'</div><p class="sptr-note"><strong>No invented proof.</strong> '+t.note+'</p></div>';

    if(path==='/'){
      const decision=document.querySelector('.rh-section[aria-labelledby="decision-lanes-title"]');
      if(decision) decision.insertAdjacentElement('afterend',wrap); else main.appendChild(wrap);
    }else{
      main.appendChild(wrap);
    }
  }

  function enhanceGrowthPanel(){
    const host=document.querySelector('.spg-trust');
    if(!host||host.querySelector('.sptr-inline-proof')) return;
    const a=document.createElement('a');
    a.className='sptr-inline-proof';a.href='/evidence.html';a.dataset.analyticsId='growth_panel_evidence';
    a.innerHTML='<span>Method / evidence / boundaries</span><b>→</b>';
    host.prepend(a);
  }

  function strengthenHome(){
    if(path!=='/') return;
    const bar=document.querySelector('.rh-proofbar');
    if(!bar) return;
    const t=labels();
    const items=Array.from(bar.children);
    const labelsTop=['ENTRY','INPUTS','METHOD','SCOPE'];
    items.slice(0,4).forEach((el,i)=>{el.innerHTML='<small>'+labelsTop[i]+'</small><strong>'+t.proof[i]+'</strong>';});
    bar.setAttribute('aria-label','Decision integrity facts');
  }

  function revealMotion(){
    const nodes=[...document.querySelectorAll('.rh-section,.rh-audit-band,.rh-final,.rh-proofbar,[data-stratum-trust-strip]')];
    nodes.forEach(n=>n.classList.add('sptr-reveal'));
    if(reduce||!('IntersectionObserver' in window)){nodes.forEach(n=>n.classList.add('sptr-visible'));return;}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('sptr-visible');io.unobserve(e.target);}}),{threshold:.08,rootMargin:'0px 0px -5% 0px'});
    nodes.forEach(n=>io.observe(n));
  }

  function track(){
    document.addEventListener('click',e=>{
      const a=e.target.closest&&e.target.closest('[data-stratum-trust-strip] a,.sptr-inline-proof');
      if(!a) return;
      capture('trust_route_click',{family,destination:a.getAttribute('href')||'',action_id:a.dataset.analyticsId||''});
    },{capture:true});
  }

  function ready(){
    renderStrip();
    strengthenHome();
    setTimeout(enhanceGrowthPanel,120);
    setTimeout(revealMotion,40);
    track();
    document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>{const old=document.querySelector('[data-stratum-trust-strip]');if(old)old.remove();renderStrip();strengthenHome();setTimeout(revealMotion,20);},30)));
    capture('trust_layer_ready',{family,indexable:!isNoIndex,reduced_motion:reduce,integrity_pass:integrity.filter(x=>x[1]).length,integrity_total:integrity.length});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
