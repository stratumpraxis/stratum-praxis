(function(){
  'use strict';
  if(window.__STRATUM_EVOLUTION_ENGINE__) return;
  window.__STRATUM_EVOLUTION_ENGINE__='2026.09.11-v2';

  const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const path=location.pathname.replace(/\/index\.html$/,'/');
  const startedAt=performance.now();
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const capture=(name,props)=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({evolution_version:window.__STRATUM_EVOLUTION_ENGINE__,route:path},props||{}));}catch(_){}};
  const now=()=>Math.round(performance.now());

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

  const journey={first_interaction:null,result:null,qualified:null,checkout:null};
  const state={resultSent:false,depth:new Set(),vitals:{},rageTarget:'',rageTimes:[],liveObservers:[]};

  const style=document.createElement('style');
  style.id='stratum-evolution-style';
  style.textContent=`
  :root{--sp-evo-ease:cubic-bezier(.2,.75,.25,1);--sp-evo-ring:rgba(103,217,173,.22)}
  html[data-evolution="on"] :focus-visible{outline:3px solid var(--sp-evo-ring);outline-offset:3px}
  [data-evo-reveal]{opacity:0;transform:translateY(10px);transition:opacity .55s var(--sp-evo-ease),transform .55s var(--sp-evo-ease)}
  [data-evo-reveal].is-evo-visible{opacity:1;transform:none}
  [data-evo-action]{transition:transform .18s var(--sp-evo-ease),box-shadow .18s var(--sp-evo-ease),filter .18s var(--sp-evo-ease),border-color .18s var(--sp-evo-ease)}
  @media(hover:hover){[data-evo-action]:hover{transform:translateY(-1.5px)}}
  [data-evo-action]:active{transform:translateY(0) scale(.985)}
  [data-evo-live]{font-variant-numeric:tabular-nums}
  [data-evo-live].evo-value-change{animation:evoValue .34s var(--sp-evo-ease)}
  html[data-evolution="on"] body.evo-result-ready [data-primary-cta]:not([aria-disabled="true"]),html[data-evolution="on"] body.evo-result-ready a[href*="buy.stripe.com"]{animation:evoReady 1.4s var(--sp-evo-ease) 1}
  html[data-product-family="money"]{--sp-evo-ring:rgba(103,217,173,.26)}
  html[data-product-family="household"]{--sp-evo-ring:rgba(89,156,123,.23)}
  @keyframes evoValue{0%{opacity:.55;transform:translateY(2px)}100%{opacity:1;transform:none}}
  @keyframes evoReady{0%,100%{box-shadow:inherit}45%{box-shadow:0 0 0 5px var(--sp-evo-ring)}}
  @media(max-width:640px){[data-evo-action]{touch-action:manipulation}}
  @media(prefers-reduced-motion:reduce){[data-evo-reveal]{opacity:1!important;transform:none!important;transition:none!important}[data-evo-action]{transition:none!important}[data-evo-live].evo-value-change,body.evo-result-ready [data-primary-cta],body.evo-result-ready a[href*="buy.stripe.com"]{animation:none!important}}
  `;
  document.head.appendChild(style);

  function classifyActions(){
    $$('a[href],button').forEach(el=>{
      if(el.matches('a[href^="#"],button,[data-primary-cta],[data-analytics-id],.primary,.action-btn,.tool-btn,.module-btn,.btn,.start-card,.offer')) el.dataset.evoAction='';
      const text=(el.textContent||'').trim().toLowerCase();
      if(/score|result|¥|\$|%|月|cost|roi|audit|check|診断|結果|購入|buy|checkout|free|無料/.test(text)) el.dataset.evoLive='';
    });
  }

  function installReveal(){
    if(reduceMotion)return;
    const candidates=$$('main > section,main > article,.panel,.card,.module,.trust-card,.recommend-card,.inventory,.route-view,.offer,.launcher-card,.decision-card');
    candidates.slice(0,48).forEach((el,i)=>{if(!el.hasAttribute('data-evo-reveal')){el.dataset.evoReveal='';el.style.transitionDelay=Math.min(i%4,3)*42+'ms';}});
    if(!('IntersectionObserver'in window)){candidates.forEach(el=>el.classList.add('is-evo-visible'));return;}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-evo-visible');io.unobserve(e.target);}}),{rootMargin:'0px 0px -5% 0px',threshold:.06});
    $$('[data-evo-reveal]').forEach(el=>io.observe(el));
  }

  function markLiveValues(){
    const selectors=['#scoreValue','#monthlyImpact','#bufferMonths','#postMargin','#annual','#monthlyCost','#netValue','#score','.score-value','.module-result b','.metric b','.impact-main b','[data-live-value]'];
    const nodes=selectors.flatMap(s=>$$(s)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,32);
    nodes.forEach(node=>{
      node.dataset.evoLive='';
      let last=(node.textContent||'').trim();
      const mo=new MutationObserver(()=>{
        const next=(node.textContent||'').trim();
        if(next===last)return;last=next;
        if(!reduceMotion){node.classList.remove('evo-value-change');void node.offsetWidth;node.classList.add('evo-value-change');}
      });
      mo.observe(node,{childList:true,subtree:true,characterData:true});
      state.liveObservers.push(mo);
    });
  }

  function getTextDensity(){
    const text=(document.body&&document.body.innerText||'').replace(/\s+/g,' ').trim();
    const headings=$$('h1,h2,h3').length||1;
    const interactive=$$('a[href],button,input,select,textarea').length||1;
    return {chars:text.length,per_heading:Math.round(text.length/headings),per_interaction:Math.round(text.length/interactive)};
  }

  function qualitySnapshot(){
    const h1=$$('h1').length;
    const canonical=!!$('link[rel="canonical"]');
    const description=!!$('meta[name="description"][content]');
    const schema=!!$('script[type="application/ld+json"]');
    const main=!!$('main');
    const viewport=!!$('meta[name="viewport"]');
    const actions=$$('a[href],button').length;
    const primary=$$('[data-primary-cta],a[href*="buy.stripe.com"],a[href*="payhip.com"],a[href*="gumroad.com"],.primary,.action-btn,.btn.primary').length;
    const density=getTextDensity();
    const images=$$('img').length;
    const imagesWithAlt=$$('img[alt]').length;
    const forms=$$('form,input,select,textarea').length;
    const reducedOk=reduceMotion||!!$('#stratum-evolution-style');
    const horizontalOverflow=Math.max(document.documentElement.scrollWidth,document.body?document.body.scrollWidth:0)>window.innerWidth+8;
    const tinyTargets=$$('a[href],button').filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<36||r.height<36);}).length;

    const categories={
      structure:Math.min(100,(h1===1?28:8)+(main?22:0)+(viewport?20:0)+(canonical?15:0)+(description?15:0)),
      trust:Math.min(100,(description?24:0)+(canonical?22:0)+(schema?20:0)+(path.includes('money')||path.includes('readiness')?($('footer,.trust,.disclaimer,[id*="method"]')?20:8):20)+(images===0||imagesWithAlt===images?14:5)),
      clarity:Math.max(25,100-Math.max(0,density.per_heading-750)/12-Math.max(0,density.per_interaction-170)/3),
      conversion:Math.min(100,(actions?25:0)+(primary?35:10)+($('[data-analytics-id]')?20:0)+($('[data-funnel]')||document.body&&document.body.dataset.funnel?20:10)),
      mobile:Math.max(20,100-(horizontalOverflow?45:0)-Math.min(35,tinyTargets*4)),
      interaction:Math.min(100,45+(actions?20:0)+(forms?15:5)+(reducedOk?20:5))
    };
    const score=Math.round(Object.values(categories).reduce((a,b)=>a+b,0)/Object.keys(categories).length);
    const snapshot={family:product.family,stage:product.stage,score,categories,h1,actions,primary,text_chars:density.chars,text_per_heading:density.per_heading,text_per_interaction:density.per_interaction,horizontal_overflow:horizontalOverflow,tiny_targets:tinyTargets,reduced_motion:reduceMotion};
    try{
      const key='sp_evolution_quality_v2:'+path;const prev=JSON.parse(localStorage.getItem(key)||'null');
      if(prev&&typeof prev.score==='number')snapshot.delta=score-prev.score;
      localStorage.setItem(key,JSON.stringify({score,categories,ts:Date.now()}));
    }catch(_){}
    capture('evolution_quality_snapshot',snapshot);
  }

  function journeyMark(key,extra){
    if(journey[key]!=null)return;
    journey[key]=now();
    const props=Object.assign({family:product.family,stage:product.stage,journey_step:key,ms_from_load:journey[key]},extra||{});
    if(journey.first_interaction!=null&&key!=='first_interaction')props.ms_from_first_interaction=journey[key]-journey.first_interaction;
    if(journey.result!=null&&['qualified','checkout'].includes(key))props.ms_from_result=journey[key]-journey.result;
    capture('evolution_journey_step',props);
  }

  function revenueTracking(){
    document.addEventListener('click',e=>{
      const el=e.target.closest('a[href],button');if(!el)return;
      const href=el.tagName==='A'?el.getAttribute('href')||'':'';
      if(journey.first_interaction==null)journeyMark('first_interaction',{action_id:el.dataset.analyticsId||el.id||''});
      let step='interaction';
      if(/buy\.stripe\.com|payhip\.com|gumroad\.com/.test(href)){step='checkout';journeyMark('checkout',{destination:href.slice(0,160)});}
      else if(el.matches('[data-primary-cta],.primary,.action-btn,.btn.primary')){step='qualified_action';journeyMark('qualified',{action_id:el.dataset.analyticsId||el.id||''});}
      else if(/result|score|診断|check|audit|product|buyer/.test((el.textContent||'').toLowerCase()))step='decision_action';
      capture('evolution_action',{family:product.family,step,action_id:el.dataset.analyticsId||el.id||'',destination:href.slice(0,220)});
    },{capture:true});
  }

  function resultDetection(){
    const selectors=['#resultPanel','#results','#result-stage','.diag-result','.result-panel','.module-result','[data-result]','[aria-live="polite"]'];
    const nodes=selectors.flatMap(s=>$$(s)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,20);
    if(!nodes.length)return;
    const inspect=()=>{
      if(state.resultSent)return;
      const visible=nodes.some(n=>!n.hidden&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).visibility!=='hidden'&&((n.innerText||'').replace(/\s+/g,' ').trim().length>18));
      if(visible){
        state.resultSent=true;document.body.classList.add('evo-result-ready');journeyMark('result');
        capture('evolution_result_visible',{family:product.family,ms_from_load:now()});
        setTimeout(()=>document.body.classList.remove('evo-result-ready'),1800);
      }
    };
    const mo=new MutationObserver(inspect);nodes.forEach(n=>mo.observe(n,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','style']}));inspect();
  }

  function sectionExposure(){
    if(!('IntersectionObserver'in window))return;
    const sections=$$('main section[id],main article[id],[data-section]').slice(0,18);
    if(!sections.length)return;
    const seen=new Set();
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(!e.isIntersecting)return;
      const id=e.target.id||e.target.dataset.section||'';
      if(!id||seen.has(id))return;seen.add(id);
      capture('evolution_section_view',{family:product.family,section:id.slice(0,100),depth_pct:Math.round((window.scrollY+window.innerHeight)/Math.max(document.documentElement.scrollHeight,1)*100)});
      io.unobserve(e.target);
    }),{threshold:.35});
    sections.forEach(s=>io.observe(s));
  }

  function scrollDepth(){
    const marks=[25,50,75,90];
    let ticking=false;
    const check=()=>{
      ticking=false;
      const max=Math.max(document.documentElement.scrollHeight-window.innerHeight,1);
      const pct=Math.min(100,Math.round(window.scrollY/max*100));
      marks.forEach(mark=>{if(pct>=mark&&!state.depth.has(mark)){state.depth.add(mark);capture('evolution_scroll_depth',{family:product.family,depth:mark});}});
    };
    addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(check);}},{passive:true});
    check();
  }

  function interactionFriction(){
    let lastFocus='';let focusCount=0;
    document.addEventListener('focusin',e=>{
      const el=e.target;if(!el.matches||!el.matches('input,select,textarea'))return;
      focusCount++;
      const id=el.id||el.name||el.getAttribute('aria-label')||el.type||'field';
      if(id===lastFocus&&focusCount%4===0)capture('evolution_form_friction',{family:product.family,field:String(id).slice(0,80),repeat_focus:focusCount});
      lastFocus=id;
    });
    document.addEventListener('invalid',e=>{
      const el=e.target;capture('evolution_invalid_field',{family:product.family,field:(el.id||el.name||el.type||'field').slice(0,80)});
    },true);

    document.addEventListener('pointerdown',e=>{
      const el=e.target.closest&&e.target.closest('a[href],button');if(!el)return;
      const key=el.dataset.analyticsId||el.id||(el.textContent||'').trim().slice(0,50);
      const t=Date.now();
      if(key!==state.rageTarget){state.rageTarget=key;state.rageTimes=[];}
      state.rageTimes.push(t);state.rageTimes=state.rageTimes.filter(x=>t-x<1200);
      if(state.rageTimes.length===3){capture('evolution_rage_click',{family:product.family,action_id:String(key).slice(0,80)});state.rageTimes=[];}
    },{passive:true,capture:true});
  }

  function webVitals(){
    if(!('PerformanceObserver'in window))return;
    try{
      new PerformanceObserver(list=>{const entries=list.getEntries();const last=entries[entries.length-1];if(last)state.vitals.lcp=Math.round(last.startTime);}).observe({type:'largest-contentful-paint',buffered:true});
    }catch(_){}
    try{
      let cls=0;new PerformanceObserver(list=>{list.getEntries().forEach(e=>{if(!e.hadRecentInput)cls+=e.value;});state.vitals.cls=Math.round(cls*1000)/1000;}).observe({type:'layout-shift',buffered:true});
    }catch(_){}
    try{
      let inp=0;new PerformanceObserver(list=>{list.getEntries().forEach(e=>{inp=Math.max(inp,e.duration||0);});state.vitals.inp=Math.round(inp);}).observe({type:'event',buffered:true,durationThreshold:40});
    }catch(_){}
    try{
      const nav=performance.getEntriesByType('navigation')[0];const paint=performance.getEntriesByName('first-contentful-paint')[0];
      if(nav)state.vitals.ttfb=Math.round(nav.responseStart);if(paint)state.vitals.fcp=Math.round(paint.startTime);
    }catch(_){}
    const flush=()=>capture('evolution_web_vitals',Object.assign({family:product.family},state.vitals));
    addEventListener('pagehide',flush,{once:true});
    setTimeout(()=>{if(document.visibilityState==='visible')flush();},6500);
  }

  function internalLinkHealth(){
    const run=()=>{
      const urls=[...new Set($$('a[href]').map(a=>a.href).filter(h=>{try{const u=new URL(h,location.href);return u.origin===location.origin&&!u.hash&&u.pathname!==path;}catch(_){return false;}}))].slice(0,8);
      if(!urls.length)return;
      Promise.all(urls.map(async u=>{
        try{let r=await fetch(u,{method:'HEAD',cache:'no-store'});if(r.status===405||r.status===403)r=await fetch(u,{method:'GET',cache:'no-store'});return{u,status:r.status,ok:r.ok};}catch(_){return{u,status:0,ok:false};}
      })).then(rows=>{const broken=rows.filter(r=>!r.ok);capture('evolution_link_health',{checked:rows.length,broken:broken.length,broken_paths:broken.slice(0,4).map(r=>{try{return new URL(r.u).pathname}catch(_){return''}}).join(',')});});
    };
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:3500});else setTimeout(run,2200);
  }

  function routeSpecificPolish(){
    if(product.family==='money'){
      $$('.scenario button,.compare-card,.module-btn,.tool-btn').forEach(el=>el.dataset.evoAction='');
      ['#scoreValue','#monthlyImpact','#bufferMonths','#postMargin','#currencyRisk','#fxAnnual','#remitDiff'].forEach(s=>{const el=$(s);if(el)el.dataset.evoLive='';});
    }
    if(product.family==='household')$$('input,button,.check-item,.result-card').forEach(el=>{if(el.matches('button,.check-item'))el.dataset.evoAction='';});
    if(product.family==='core')$$('.office-nav a,.launcher-card,.decision-card,.recommend-card,.inventory-row,.route-tab,.offer,.start-card').forEach(el=>el.dataset.evoAction='');
  }

  function ready(){
    classifyActions();routeSpecificPolish();installReveal();markLiveValues();revenueTracking();resultDetection();sectionExposure();scrollDepth();interactionFriction();webVitals();
    setTimeout(qualitySnapshot,650);internalLinkHealth();
    capture('evolution_engine_ready',{family:product.family,stage:product.stage,version:window.__STRATUM_EVOLUTION_ENGINE__});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
