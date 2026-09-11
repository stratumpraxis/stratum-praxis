(()=>{
  const body=document.body;
  body.classList.add('route-os-enhanced');

  const enhancementStyle=document.createElement('style');
  enhancementStyle.textContent=`
    .route-shell{touch-action:pan-y}
    .route-pager{display:grid;grid-template-columns:46px auto 46px;align-items:center;justify-content:center;gap:14px;margin:14px auto 0;padding:10px 12px;width:max-content;max-width:100%;border:1px solid rgba(17,24,22,.09);border-radius:999px;background:rgba(249,247,242,.82);box-shadow:0 10px 28px rgba(17,24,22,.045);backdrop-filter:blur(12px)}
    .route-pager-arrow{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(17,24,22,.1);border-radius:50%;background:#fff;color:#17201e;font-size:15px;cursor:pointer;transition:.18s ease}
    .route-pager-arrow:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(17,24,22,.07)}
    .route-pager-center{display:grid;justify-items:center;gap:6px;min-width:142px}
    .route-pager-center small{font-size:6.5px;font-weight:850;letter-spacing:.12em;color:#87918d}
    .route-pager-dots{display:flex;align-items:center;gap:7px}
    .route-pager-dots button{width:18px;height:5px;padding:0;border:0;border-radius:999px;background:rgba(17,24,22,.12);cursor:pointer;transition:.18s ease}
    .route-pager-dots button.is-active{width:34px;background:#17201e}
    .offer.buyer{cursor:pointer}
    .offer.buyer:after{content:'BUYER GATE';position:absolute;right:10px;top:10px;padding:4px 6px;border-radius:999px;background:rgba(17,24,22,.07);color:#64716b;font-size:6px;font-weight:850;letter-spacing:.07em}
    #buyer-access{scroll-margin-top:110px}
    @media(max-width:760px){.route-pager{position:sticky;bottom:12px;z-index:20;margin-top:10px;background:rgba(248,246,241,.92)}.route-pager-arrow{width:36px;height:36px}.route-pager-center small{font-size:6px}}
    @media(prefers-reduced-motion:reduce){.route-pager-arrow,.route-pager-dots button{transition:none!important}}
  `;
  document.head.appendChild(enhancementStyle);

  const routeOrder=['spend','workflow','agent'];
  const routeData={
    spend:{entry:'FREE',depth:'$39 → $499',outcome:'CONTROL',chain:['Detect','Prove','Recover','Monitor'],label:'Spend & ROI'},
    workflow:{entry:'FREE',depth:'$39 → $499',outcome:'DECIDE',chain:['Diagnose','Validate','Audit'],label:'Workflow'},
    agent:{entry:'FREE',depth:'$69 → $299',outcome:'OPERATE',chain:['Economics','Control','Operate','Scale'],label:'Agent Operations'}
  };

  const tabs=[...document.querySelectorAll('.route-tab')];
  const views=[...document.querySelectorAll('.route-view')];
  const mapRows=[...document.querySelectorAll('.map-row')];
  const consoleLabel=document.querySelector('.console-head span');
  const routeShell=document.querySelector('.route-shell');
  const buyerNote=document.querySelector('.buyer-note');
  if(buyerNote) buyerNote.id='buyer-access';

  views.forEach(view=>{
    const name=view.dataset.view;
    const data=routeData[name];
    const side=view.querySelector('.route-side');
    const start=side?.querySelector('.start-card');
    if(side && start && data && !side.querySelector('.route-summary')){
      const summary=document.createElement('div');
      summary.className='route-summary';
      summary.innerHTML=`<div><small>ENTRY</small><b>${data.entry}</b></div><div><small>PAID DEPTH</small><b>${data.depth}</b></div><div><small>OUTCOME</small><b>${data.outcome}</b></div>`;
      start.before(summary);
    }
    const canvas=view.querySelector('.route-canvas');
    const head=canvas?.querySelector('.canvas-head');
    if(canvas && head && data && !canvas.querySelector('.route-context')){
      const context=document.createElement('div');
      context.className='route-context';
      context.innerHTML=`<div class="context-chain">${data.chain.map(x=>`<span>${x}</span>`).join('')}</div><b>SMALLEST VALID NEXT STEP</b>`;
      head.after(context);
    }
  });

  const toast=document.createElement('div');
  toast.className='route-os-toast';
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  toast.innerHTML='<i></i><span></span>';
  document.body.appendChild(toast);
  let toastTimer;
  const announce=(text)=>{
    toast.querySelector('span').textContent=text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),1400);
  };

  const pager=document.createElement('div');
  pager.className='route-pager';
  pager.setAttribute('aria-label','Slide between revenue routes');
  pager.innerHTML=`
    <button type="button" class="route-pager-arrow prev" aria-label="Previous route">←</button>
    <div class="route-pager-center"><small>SWIPE / SLIDE ROUTES</small><div class="route-pager-dots">${routeOrder.map(name=>`<button type="button" data-pager-route="${name}" aria-label="Open ${routeData[name].label}"></button>`).join('')}</div></div>
    <button type="button" class="route-pager-arrow next" aria-label="Next route">→</button>`;
  if(routeShell) routeShell.after(pager);

  function syncRoute(name,{scroll=false,announceChange=false}={}){
    if(!routeData[name]) return;
    tabs.forEach(tab=>{
      const active=tab.dataset.route===name;
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
      tab.setAttribute('aria-controls',`route-panel-${tab.dataset.route}`);
      tab.id=`route-tab-${tab.dataset.route}`;
      if(active && announceChange) tab.focus({preventScroll:true});
    });

    views.forEach(view=>{
      const active=view.dataset.view===name;
      view.classList.toggle('active',active);
      view.hidden=!active;
      view.id=`route-panel-${view.dataset.view}`;
      view.setAttribute('role','tabpanel');
      view.setAttribute('aria-labelledby',`route-tab-${view.dataset.view}`);
    });

    mapRows.forEach(row=>row.classList.toggle('is-active',row.classList.contains(name)));
    pager.querySelectorAll('[data-pager-route]').forEach(dot=>{
      const active=dot.dataset.pagerRoute===name;
      dot.classList.toggle('is-active',active);
      dot.setAttribute('aria-current',active?'true':'false');
    });
    if(consoleLabel) consoleLabel.textContent=`${name.toUpperCase()} · DECISION MAP`;
    history.replaceState(null,'',`#${name}`);
    if(scroll) document.querySelector('#routes')?.scrollIntoView({behavior:'smooth',block:'start'});
    if(announceChange) announce(`${routeData[name].label} route selected`);
  }

  function moveRoute(delta,{announceChange=false}={}){
    const current=routeOrder.findIndex(name=>document.querySelector(`.route-view[data-view="${name}"]`)?.classList.contains('active'));
    const next=(current+delta+routeOrder.length)%routeOrder.length;
    syncRoute(routeOrder[next],{announceChange});
  }

  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>syncRoute(tab.dataset.route));
    tab.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault();
      let next=index;
      if(e.key==='ArrowRight') next=(index+1)%tabs.length;
      if(e.key==='ArrowLeft') next=(index-1+tabs.length)%tabs.length;
      if(e.key==='Home') next=0;
      if(e.key==='End') next=tabs.length-1;
      syncRoute(tabs[next].dataset.route,{announceChange:true});
    });
  });

  mapRows.forEach(row=>{
    const name=row.classList.contains('spend')?'spend':row.classList.contains('workflow')?'workflow':'agent';
    row.setAttribute('role','button');
    row.tabIndex=0;
    row.setAttribute('aria-label',`Open ${routeData[name].label} route`);
    const activate=()=>syncRoute(name,{scroll:true});
    row.addEventListener('click',activate);
    row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  });

  pager.querySelector('.prev')?.addEventListener('click',()=>moveRoute(-1,{announceChange:true}));
  pager.querySelector('.next')?.addEventListener('click',()=>moveRoute(1,{announceChange:true}));
  pager.querySelectorAll('[data-pager-route]').forEach(dot=>dot.addEventListener('click',()=>syncRoute(dot.dataset.pagerRoute,{announceChange:true})));

  let startX=0,startY=0,tracking=false;
  if(routeShell){
    routeShell.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse') return;
      tracking=true;startX=e.clientX;startY=e.clientY;
    },{passive:true});
    routeShell.addEventListener('pointerup',e=>{
      if(!tracking||e.pointerType==='mouse') return;
      tracking=false;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(Math.abs(dx)<48||Math.abs(dx)<=Math.abs(dy)*1.15) return;
      moveRoute(dx<0?1:-1);
      announce(dx<0?'Next route':'Previous route');
    },{passive:true});
    routeShell.addEventListener('pointercancel',()=>{tracking=false},{passive:true});
  }

  // Public route cards never jump straight into protected buyer delivery.
  const buyerOffer=document.querySelector('.offer.buyer');
  if(buyerOffer){
    buyerOffer.setAttribute('href','#buyer-access');
    buyerOffer.setAttribute('aria-label','Go to buyer access gateway');
    buyerOffer.addEventListener('click',e=>{
      e.preventDefault();
      buyerNote?.scrollIntoView({behavior:'smooth',block:'center'});
      announce('Buyer-only access is routed through the purchase gateway');
    });
  }
  const verifyLink=document.querySelector('[data-analytics-id="router_agent_verify"]');
  if(verifyLink){
    verifyLink.setAttribute('href','#buyer-access');
    verifyLink.textContent='Buyer access →';
    verifyLink.addEventListener('click',e=>{
      e.preventDefault();
      buyerNote?.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  document.querySelectorAll('.offer,.start-card,.buyer-links a,.final-actions a').forEach(link=>{
    link.addEventListener('pointerenter',()=>link.setAttribute('data-ready','true'),{passive:true});
    link.addEventListener('pointerleave',()=>link.removeAttribute('data-ready'),{passive:true});
  });

  const initial=routeOrder.includes(location.hash.slice(1))?location.hash.slice(1):'spend';
  syncRoute(initial);
})();
