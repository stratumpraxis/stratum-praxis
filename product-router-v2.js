(()=>{
  const body=document.body;
  body.classList.add('route-os-enhanced');

  const routeData={
    spend:{entry:'FREE',depth:'$39 → $499',outcome:'CONTROL',chain:['Detect','Prove','Recover','Monitor']},
    workflow:{entry:'FREE',depth:'$39 → $499',outcome:'DECIDE',chain:['Diagnose','Validate','Audit']},
    agent:{entry:'FREE',depth:'$69 → $299',outcome:'OPERATE',chain:['Economics','Control','Operate','Scale']}
  };

  const tabs=[...document.querySelectorAll('.route-tab')];
  const views=[...document.querySelectorAll('.route-view')];
  const mapRows=[...document.querySelectorAll('.map-row')];
  const consoleLabel=document.querySelector('.console-head span');

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

  function syncRoute(name,{scroll=false,announceChange=false}={}){
    tabs.forEach((tab,index)=>{
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
    if(consoleLabel) consoleLabel.textContent=`${name.toUpperCase()} · DECISION MAP`;
    history.replaceState(null,'',`#${name}`);
    if(scroll) document.querySelector('#routes')?.scrollIntoView({behavior:'smooth',block:'start'});
    if(announceChange) announce(`${name==='spend'?'Spend & ROI':name==='workflow'?'Workflow':'Agent Operations'} route selected`);
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
    row.setAttribute('aria-label',`Open ${name==='spend'?'Spend and ROI':name==='workflow'?'Workflow':'Agent Operations'} route`);
    const activate=()=>syncRoute(name,{scroll:true});
    row.addEventListener('click',activate);
    row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  });

  document.querySelectorAll('.offer,.start-card,.buyer-links a,.final-actions a').forEach(link=>{
    link.addEventListener('pointerenter',()=>link.setAttribute('data-ready','true'),{passive:true});
    link.addEventListener('pointerleave',()=>link.removeAttribute('data-ready'),{passive:true});
  });

  const initial=['spend','workflow','agent'].includes(location.hash.slice(1))?location.hash.slice(1):'spend';
  syncRoute(initial);
})();
