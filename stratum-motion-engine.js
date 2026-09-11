(()=>{
  'use strict';
  if(window.__STRATUM_MOTION_ENGINE__) return;
  window.__STRATUM_MOTION_ENGINE__='2026.09.11-v1';

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const saveData=!!(navigator.connection&&navigator.connection.saveData);
  const memory=Number(navigator.deviceMemory||8);
  const cores=Number(navigator.hardwareConcurrency||8);
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const capture=(name,props={})=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({motion_version:window.__STRATUM_MOTION_ENGINE__,route:path},props));}catch(_){}};

  const family=(()=>{
    if(path==='/buyer-workspace.html'||path==='/cross-agent-operating-kit-access.html')return 'buyer';
    if(path.startsWith('/money-resilience/'))return 'money';
    if(path.startsWith('/72-hour-household-readiness/'))return 'household';
    if(path.startsWith('/revenue-pump/')||['/ai-monetization-reality-check.html','/ai-income-claim-checklist.html','/rustchain-bounty-radar.html'].includes(path))return 'revenue';
    if(path.startsWith('/guides/ai-saas')||['/ai-saas-waste-calculator.html','/ai-saas-spend-audit-checklist.html','/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html','/saas-renewal-decision.html'].includes(path))return 'spend';
    if(path.startsWith('/guides/workflow')||['/b2b/','/workflow-audit.html','/sample-workflow-audit.html','/workflow-automation-comparison.html'].includes(path))return 'workflow';
    if(path.startsWith('/guides/ai-agent')||['/ai-agent-economics-calculator.html','/agent-control-auditor.html','/cross-agent-operating-kit.html','/ai-agent-cost-roi-calculator.html','/ai-coding-assistant-comparison.html'].includes(path))return 'agent';
    return 'core';
  })();
  document.documentElement.dataset.spmFamily=family;

  const mode=reduce?'reduced':(saveData||memory<=2||cores<=2?'quiet':(memory<=4||cores<=4?'balanced':'full'));
  document.documentElement.dataset.spmMode=mode;

  function progress(){
    let el=$('.spm-progress');
    if(!el){el=document.createElement('div');el.className='spm-progress';el.setAttribute('aria-hidden','true');document.body.appendChild(el);}
    let ticking=false;
    const draw=()=>{ticking=false;const max=Math.max(document.documentElement.scrollHeight-innerHeight,1);const pct=Math.max(0,Math.min(100,scrollY/max*100));document.documentElement.style.setProperty('--spm-progress',pct.toFixed(2)+'%');};
    addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(draw);}},{passive:true});
    addEventListener('resize',draw,{passive:true});draw();
  }

  function heroScene(){
    const scene=$('.rh-hero,.hero,.sr-hero,.bw-hero,.page-topline,.mr-boot-inner,.product-shell > section:first-child,main > section:first-child');
    if(!scene)return;
    scene.classList.add('spm-scene');
    if(!$('.spm-spotlight',scene)){const spot=document.createElement('span');spot.className='spm-spotlight';spot.setAttribute('aria-hidden','true');scene.prepend(spot);}
    const title=$('h1',scene);if(title)title.classList.add('spm-hero-title');
    const copy=$('.rh-hero-copy,.hero-copy,.bw-hero>div:first-of-type,.sr-hero>div:first-of-type,.page-topline>div:first-of-type',scene)||scene.firstElementChild;
    if(copy&&copy!==$('.spm-spotlight',scene))copy.classList.add('spm-hero-copy');
    const support=$('.rh-lead,.lead,.hero-lead,.sr-lead,.hero-sub,.bw-hero p,.page-topline>p',scene);if(support)support.classList.add('spm-hero-support');
    const actions=$('.rh-actions,.actions,.hero-actions,.sr-actions,.bw-actions',scene);if(actions)actions.classList.add('spm-hero-actions');
    if(mode==='full'&&fine){
      let raf=0;
      scene.addEventListener('pointermove',e=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const r=scene.getBoundingClientRect();const x=Math.max(0,Math.min(100,(e.clientX-r.left)/Math.max(r.width,1)*100));const y=Math.max(0,Math.min(100,(e.clientY-r.top)/Math.max(r.height,1)*100));scene.style.setProperty('--spm-x',x.toFixed(1)+'%');scene.style.setProperty('--spm-y',y.toFixed(1)+'%');});},{passive:true});
    }
    capture('motion_scene_ready',{family,mode});
  }

  function depth(){
    const nodes=$$('.rh-hero-panel,.decision-map,.rh-reason-card,.console,.sr-hero-card,.bw-state,.system-panel,.hero-visual,.mr-boot-visual,.machine,.recommend-card').slice(0,12);
    nodes.forEach(el=>{
      el.classList.add('spm-depth');
      if(mode!=='full'||!fine)return;
      let raf=0;
      el.addEventListener('pointermove',e=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const r=el.getBoundingClientRect();const nx=(e.clientX-r.left)/Math.max(r.width,1)-.5;const ny=(e.clientY-r.top)/Math.max(r.height,1)-.5;el.style.setProperty('--spm-ry',(nx*4.4).toFixed(2)+'deg');el.style.setProperty('--spm-rx',(-ny*3.2).toFixed(2)+'deg');});},{passive:true});
      el.addEventListener('pointerleave',()=>{el.style.setProperty('--spm-rx','0deg');el.style.setProperty('--spm-ry','0deg');},{passive:true});
    });
  }

  function reveal(){
    if(reduce)return;
    const nodes=$$('main > section,main > article,.rh-section,.sr-section,.bw-section,.card,.sr-card,.offer,.rh-step,.spk-preview,.spk-circulation,.principle').filter(el=>!el.closest('[hidden]')).slice(0,84);
    nodes.forEach((el,i)=>{el.classList.add('spm-reveal');el.dataset.spmOrder=String(i%4+1);});
    if(!('IntersectionObserver'in window)){nodes.forEach(el=>el.classList.add('spm-in'));return;}
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('spm-in');io.unobserve(entry.target);capture('motion_scene_view',{family,kind:(entry.target.className||'').toString().slice(0,100)});}}),{threshold:.08,rootMargin:'0px 0px -6% 0px'});
    nodes.forEach(el=>io.observe(el));
  }

  function sectionEnergy(){
    if(!('IntersectionObserver'in window)||reduce)return;
    const sections=$$('main > section,.rh-section,.sr-section,.bw-section').slice(0,34);
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{e.target.classList.toggle('spm-section-live',e.isIntersecting&&e.intersectionRatio>.24);}),{threshold:[.24,.55]});
    sections.forEach(s=>io.observe(s));
  }

  function flow(){
    const runners=$$('.flow-link,.connector,.branch-line,.map-link,.spk-circ-link,.start-card,.rh-step>a').slice(0,44);
    runners.forEach(x=>x.classList.add('spm-flow-runner'));
    const nodes=$$('.map-row,.flow-node,.map-step,.spk-flow>div,.bw-route>div,.kit-step,.deliverable,.rh-step').slice(0,56);
    nodes.forEach(x=>x.classList.add('spm-pulse-node'));
    $$('.live-map,.route-canvas,.decision-map,.spk-preview-body,.bw-products,.audit-workspace,.system-panel').forEach(x=>x.classList.add('spm-surface'));
  }

  function magnetic(){
    const nodes=$$('a.rh-primary,a.rh-secondary,.rh-step>a,button.route,a.btn,a.button,a.sr-btn,a.action-btn,a.bw-btn,a.go,a.start-card,[data-primary-cta]').slice(0,42);
    nodes.forEach(el=>{
      el.classList.add('spm-magnetic');
      if(mode!=='full'||!fine)return;
      let raf=0;
      el.addEventListener('pointermove',e=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const r=el.getBoundingClientRect();const dx=((e.clientX-r.left)/Math.max(r.width,1)-.5)*5;const dy=((e.clientY-r.top)/Math.max(r.height,1)-.5)*3;el.style.setProperty('--spm-mx',dx.toFixed(2)+'px');el.style.setProperty('--spm-my',dy.toFixed(2)+'px');});},{passive:true});
      el.addEventListener('pointerleave',()=>{el.style.setProperty('--spm-mx','0px');el.style.setProperty('--spm-my','0px');},{passive:true});
    });
  }

  function numericFeedback(){
    const nodes=$$('.metric strong,.sr-metric strong,.spk-metric strong,.impact-main b,.donut strong,.pulse-card b,[data-live-value],#scoreValue,#annualSpend,#annualExposure,#roi-net,#roi-percent').slice(0,46);
    nodes.forEach(node=>{
      let last=(node.textContent||'').trim();
      const mo=new MutationObserver(()=>{const next=(node.textContent||'').trim();if(next===last)return;last=next;if(reduce)return;node.classList.remove('spm-value-flash');void node.offsetWidth;node.classList.add('spm-value-flash');});
      mo.observe(node,{childList:true,subtree:true,characterData:true});
    });
  }

  function tabEnergy(){
    document.addEventListener('click',e=>{
      const tab=e.target.closest('.spk-tab,.bw-selector button,.route-tab,.route,.tab');if(!tab)return;
      capture('motion_state_change',{family,control:(tab.dataset.spkTab||tab.dataset.bwTab||tab.dataset.route||tab.textContent||'').trim().slice(0,80)});
    },{capture:true});
  }

  function start(){
    progress();heroScene();flow();depth();reveal();sectionEnergy();magnetic();numericFeedback();tabEnergy();
    capture('motion_engine_ready',{family,mode,reduced_motion:reduce,save_data:saveData,device_memory:memory,hardware_concurrency:cores});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
