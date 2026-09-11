(()=>{
  'use strict';
  if(window.__STRATUM_CINEMATIC_UI__) return;
  window.__STRATUM_CINEMATIC_UI__='2026.09.11-v1';

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const capture=(name,props={})=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({cinematic_version:window.__STRATUM_CINEMATIC_UI__,route:path},props));}catch(_){}};

  const paidRoutes=new Set(['/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html','/cross-agent-operating-kit.html','/workflow-audit.html','/sample-workflow-audit.html']);
  const enabled=path==='/'||path==='/product-router.html'||path==='/buyer-workspace.html'||paidRoutes.has(path);
  if(!enabled) return;

  const page=path==='/'?'home':path==='/product-router.html'?'router':path==='/buyer-workspace.html'?'buyer':'paid';
  document.documentElement.dataset.spcActive='true';
  document.documentElement.dataset.spcPage=page;

  function labelFor(section,i){
    const node=$('.micro,.rh-eyebrow,.eyebrow,.bw-kicker,.spk-preview-kicker,h2,h1',section);
    const raw=(node&&node.textContent||`Step ${i+1}`).replace(/\s+/g,' ').trim();
    return raw.length>28?raw.slice(0,27)+'…':raw;
  }

  function storySections(){
    let nodes=[];
    if(page==='home') nodes=$$('.rh-hero,.rh-section,.spk-circulation');
    else if(page==='router') nodes=$$('.hero,#routes,.route-shell,.spk-circulation');
    else if(page==='buyer') nodes=$$('.bw-hero,#delivery,#remeasure,.spk-circulation');
    else nodes=$$('main > section,.spk-preview,.spk-circulation').filter((x,i,a)=>a.indexOf(x)===i);
    return nodes.filter(Boolean).slice(0,7);
  }

  function storyRail(){
    const sections=storySections();
    if(sections.length<2) return;
    sections.forEach(s=>s.classList.add('spc-cinematic-section'));
    const rail=document.createElement('nav');
    rail.className='spc-story-rail';
    rail.setAttribute('aria-label','Page story progress');
    rail.innerHTML='<span class="spc-story-track" aria-hidden="true"><i class="spc-story-fill"></i></span>'+sections.map((s,i)=>`<button class="spc-story-item" type="button" data-spc-story="${i}" aria-label="Go to ${labelFor(s,i)}"><span class="spc-story-dot"></span><span class="spc-story-label">${labelFor(s,i)}</span></button>`).join('');
    document.body.appendChild(rail);
    const items=$$('.spc-story-item',rail);
    items.forEach((b,i)=>b.addEventListener('click',()=>{sections[i].scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});capture('cinematic_story_jump',{page,index:i});}));
    const setActive=i=>{
      items.forEach((b,j)=>b.setAttribute('aria-current',j===i?'step':'false'));
      sections.forEach((s,j)=>s.classList.toggle('spc-story-live',j===i));
      rail.style.setProperty('--spc-story',`${sections.length<=1?100:(i/(sections.length-1))*100}%`);
    };
    setActive(0);
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(!visible)return;
        const i=sections.indexOf(visible.target);if(i>=0){setActive(i);capture('cinematic_story_step',{page,index:i});}
      },{threshold:[.22,.42,.62],rootMargin:'-12% 0px -38% 0px'});
      sections.forEach(s=>io.observe(s));
    }
  }

  function vectorPath(points){
    if(points.length<2)return '';
    let d=`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      const dx=Math.max(24,Math.abs(b.x-a.x)*.42);
      if(Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)) d+=` C ${(a.x+dx).toFixed(1)} ${a.y.toFixed(1)}, ${(b.x-dx).toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      else {
        const dy=Math.max(24,Math.abs(b.y-a.y)*.42);
        d+=` C ${a.x.toFixed(1)} ${(a.y+dy).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y-dy).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
    }
    return d;
  }

  const moving=[];
  function connect(container,selector,key){
    if(!container||container.dataset.spcVector===key)return;
    container.dataset.spcVector=key;
    container.classList.add('spc-vector-host');
    let svg=$('.spc-vector-layer',container);
    if(!svg){
      svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','spc-vector-layer');
      svg.setAttribute('aria-hidden','true');
      svg.innerHTML='<defs><linearGradient id="spcGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#79dfb7"/><stop offset="1" stop-color="#9fc8ff"/></linearGradient></defs><path class="spc-vector-base"/><path class="spc-vector-energy"/><circle class="spc-vector-dot" r="3.2" cx="0" cy="0"/>';
      container.prepend(svg);
    }
    const base=$('.spc-vector-base',svg),energy=$('.spc-vector-energy',svg),dot=$('.spc-vector-dot',svg);
    const draw=()=>{
      const host=container.getBoundingClientRect();
      if(host.width<2||host.height<2)return;
      svg.setAttribute('viewBox',`0 0 ${host.width} ${host.height}`);
      const points=$$(selector,container).filter(n=>n.offsetParent!==null).map(n=>{const r=n.getBoundingClientRect();return{x:r.left-host.left+r.width/2,y:r.top-host.top+r.height/2};});
      const d=vectorPath(points);base.setAttribute('d',d);energy.setAttribute('d',d);
      if(!reduce&&fine&&d){moving.push({path:energy,dot,start:performance.now()+moving.length*420});}
    };
    draw();
    if('ResizeObserver' in window){const ro=new ResizeObserver(()=>requestAnimationFrame(draw));ro.observe(container);}else addEventListener('resize',draw,{passive:true});
  }

  let vectorRAF=0;
  function animateVectors(now){
    if(document.hidden){vectorRAF=requestAnimationFrame(animateVectors);return;}
    moving.forEach(m=>{try{const len=m.path.getTotalLength();if(!len)return;const t=((now-m.start)/5200)%1;const p=m.path.getPointAtLength(Math.max(0,t)*len);m.dot.setAttribute('cx',p.x.toFixed(1));m.dot.setAttribute('cy',p.y.toFixed(1));}catch(_){}});
    vectorRAF=requestAnimationFrame(animateVectors);
  }

  function vectors(){
    if(page==='router') $$('.route-canvas').forEach((c,i)=>connect(c,'.flow-node','router-'+i));
    if(page==='home') connect($('.decision-map'),'.map-step','home-decision');
    if(page==='buyer') connect($('.bw-journey'),'.bw-step','buyer-journey');
    if(!reduce&&fine&&!vectorRAF)vectorRAF=requestAnimationFrame(animateVectors);
  }

  function indicator(container,buttons){
    if(!container||buttons.length<2)return;
    container.classList.add('spc-tab-host');
    let beam=$('.spc-tab-indicator',container);if(!beam){beam=document.createElement('i');beam.className='spc-tab-indicator';beam.setAttribute('aria-hidden','true');container.appendChild(beam);}
    const move=button=>{if(!button)return;const cr=container.getBoundingClientRect(),br=button.getBoundingClientRect();container.style.setProperty('--spc-tab-x',`${Math.max(0,br.left-cr.left)}px`);beam.style.width=`${Math.max(18,br.width)}px`;};
    const active=()=>buttons.find(b=>b.getAttribute('aria-selected')==='true'||b.classList.contains('active'))||buttons[0];
    requestAnimationFrame(()=>move(active()));
    buttons.forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(()=>move(b))));
    if('ResizeObserver' in window){const ro=new ResizeObserver(()=>move(active()));ro.observe(container);}
  }

  function morphSurface(surface){
    if(!surface)return;
    surface.classList.add('spc-state-surface','spc-switching');
    clearTimeout(surface.__spcTimer);
    surface.__spcTimer=setTimeout(()=>{surface.classList.remove('spc-switching');surface.classList.add('spc-commit');setTimeout(()=>surface.classList.remove('spc-commit'),520);},90);
  }

  function previewStatus(preview){
    const tabs=$$('.spk-tab',preview);if(tabs.length<2||$('.spc-preview-status',preview))return;
    const status=document.createElement('div');status.className='spc-preview-status';status.innerHTML='<span>Decision view</span><span class="spc-preview-status-track"><i class="spc-preview-status-fill"></i></span><b>1 / '+tabs.length+'</b>';
    const body=$('.spk-preview-body',preview);(body?body:preview).before(status);
    const update=i=>{status.style.setProperty('--spc-preview-progress',`${((i+1)/tabs.length)*100}%`);$('b',status).textContent=`${i+1} / ${tabs.length}`;};
    tabs.forEach((tab,i)=>tab.addEventListener('click',()=>update(i)));update(0);
  }

  function stateMorphs(){
    if(page==='router'){
      const c=$('.route-tabs'),buttons=$$('.route-tab',c);indicator(c,buttons);
      buttons.forEach(b=>b.addEventListener('click',()=>{morphSurface($('.route-shell'));setTimeout(vectors,140);capture('cinematic_route_morph',{route:b.dataset.route||''});},{capture:true}));
    }
    if(page==='home'){
      const c=$('.rh-lanes'),buttons=$$('.route',c);indicator(c,buttons);
      buttons.forEach(b=>b.addEventListener('click',()=>{morphSurface($('.rh-decision-grid'));capture('cinematic_home_morph',{route:b.dataset.route||''});},{capture:true}));
    }
    if(page==='buyer'){
      const c=$('.bw-selector'),buttons=$$('button',c);indicator(c,buttons);
      buttons.forEach(b=>b.addEventListener('click',()=>{morphSurface($('.bw-products'));capture('cinematic_buyer_morph',{tab:b.dataset.bwTab||''});},{capture:true}));
    }
    if(page==='paid'){
      $$('.spk-preview').forEach(preview=>{previewStatus(preview);const c=$('.spk-tabs',preview),buttons=$$('.spk-tab',c);indicator(c,buttons);buttons.forEach(b=>b.addEventListener('click',()=>{morphSurface($('.spk-preview-body',preview));capture('cinematic_preview_morph',{tab:b.dataset.spkTab||''});},{capture:true}));});
    }
  }

  const tweenLocks=new WeakSet();
  function parseNumber(raw){
    const matches=raw.match(/-?\d[\d,]*(?:\.\d+)?/g);if(!matches||matches.length!==1)return null;
    const token=matches[0],num=Number(token.replace(/,/g,''));if(!Number.isFinite(num))return null;
    const idx=raw.indexOf(token),dec=(token.split('.')[1]||'').length;
    return{num,prefix:raw.slice(0,idx),suffix:raw.slice(idx+token.length),dec,comma:token.includes(',')};
  }
  function formatNumber(v,shape){
    const rounded=shape.dec?Number(v.toFixed(shape.dec)):Math.round(v);
    return shape.comma?rounded.toLocaleString('en-US',{minimumFractionDigits:shape.dec,maximumFractionDigits:shape.dec}):rounded.toFixed(shape.dec);
  }
  function tweenNode(node){
    let lastRaw=(node.textContent||'').trim(),last=parseNumber(lastRaw);
    const mo=new MutationObserver(()=>{
      if(tweenLocks.has(node)||reduce)return;
      const targetRaw=(node.textContent||'').trim();if(targetRaw===lastRaw)return;
      const target=parseNumber(targetRaw);if(!target){lastRaw=targetRaw;last=null;return;}
      const start=last?last.num:0,finish=target.num,duration=460,begin=performance.now();
      tweenLocks.add(node);node.classList.remove('spc-tweening');void node.offsetWidth;node.classList.add('spc-tweening');
      const tick=now=>{const p=Math.min(1,(now-begin)/duration),e=1-Math.pow(1-p,3),v=start+(finish-start)*e;node.textContent=target.prefix+formatNumber(v,target)+target.suffix;if(p<1)requestAnimationFrame(tick);else{node.textContent=targetRaw;lastRaw=targetRaw;last=target;setTimeout(()=>tweenLocks.delete(node),0);}};
      requestAnimationFrame(tick);
    });
    mo.observe(node,{childList:true,subtree:true,characterData:true});
  }
  function numericTweens(){
    const nodes=[...$$('#roi-net,#roi-percent,.spk-metric strong')].filter((n,i,a)=>a.indexOf(n)===i).slice(0,30);nodes.forEach(tweenNode);
  }

  function visualLift(){
    const title=$('main h1');if(title)title.classList.add('spc-cinematic-title');
    const hot=$$('.rh-hero-panel,.console,.route-canvas,.bw-state,.spk-preview').slice(0,16);
    hot.forEach((el,i)=>{el.addEventListener('pointermove',e=>{if(reduce||!fine)return;const r=el.getBoundingClientRect();el.style.setProperty('--spc-hot-x',`${((e.clientX-r.left)/Math.max(1,r.width))*100}%`);el.style.setProperty('--spc-hot-y',`${((e.clientY-r.top)/Math.max(1,r.height))*100}%`);},{passive:true});if(i<4)el.classList.add('spc-cinematic-section');});
  }

  function start(){
    storyRail();visualLift();vectors();stateMorphs();numericTweens();
    capture('cinematic_ui_ready',{page,reduced_motion:reduce,fine_pointer:fine});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
