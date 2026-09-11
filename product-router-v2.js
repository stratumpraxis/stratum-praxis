(()=>{
  const body=document.body;
  body.classList.add('route-os-enhanced');

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

  // Public route cards must never jump straight into protected buyer delivery.
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
