(()=>{
  'use strict';
  if(document.body?.dataset.page!=='stratum_revenue_home_v2')return;
  const capture=(name,props={})=>{try{window.scosCapture?.(name,props)}catch(_){}};
  const storeGet=(k)=>{try{return localStorage.getItem(k)}catch(_){return null}};
  const storeSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
  const intentToRouter={cost:'spend',workflow:'workflow',agent:'agent'};
  const intentLabel={cost:'Spend & ROI',workflow:'Workflow',agent:'Agent Operations'};
  let intent=['cost','workflow','agent'].includes(storeGet('sp-office-route'))?storeGet('sp-office-route'):'cost';

  if(!document.querySelector('link[data-hub-v10-intelligence]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='/stratum-hub-intelligence-v10.css?v=20260913e';css.dataset.hubV10Intelligence='';document.head.appendChild(css);
  }

  function correctLegacySpendKit(root=document){
    let corrected=0;
    root.querySelectorAll('a[href*="ai-value-realization-kit.html"]').forEach(a=>{
      a.href='/ai-saas-spend-decision-kit.html';
      a.querySelectorAll('b,strong,span').forEach(node=>{if(/AI Value Realization Kit/i.test(node.textContent||''))node.textContent='Spend Decision Kit'});
      corrected++;
    });
    root.querySelectorAll('*').forEach(node=>{if(node.children.length===0&&/AI Value Realization Kit/i.test(node.textContent||'')){node.textContent=(node.textContent||'').replace(/AI Value Realization Kit/gi,'Spend Decision Kit');corrected++}});
    if(corrected)capture('hub_legacy_product_label_corrected',{count:corrected});
  }

  function applyIntentLinks(){
    const lab=`/live-lab.html?intent=${intent}`;
    const router=`/product-router.html#${intentToRouter[intent]}`;
    document.querySelectorAll('a[href="/live-lab.html"],a[href^="/live-lab.html?"]').forEach(a=>{if(!a.closest('footer'))a.href=lab});
    document.querySelectorAll('a[href="/product-router.html"],a[href^="/product-router.html#"]').forEach(a=>{if(!a.closest('footer'))a.href=router});
    const handoff=document.querySelector('.hub-handoff');
    if(handoff){handoff.querySelector('[data-hub-intent]').textContent=intentLabel[intent];handoff.querySelector('[data-hub-lab]').href=lab;handoff.querySelector('[data-hub-router]').href=router}
  }

  function ensureHandoff(){
    if(document.querySelector('.hub-handoff'))return;
    const lanes=document.querySelector('.rh-lanes');if(!lanes)return;
    const box=document.createElement('section');
    box.className='hub-handoff';
    box.setAttribute('aria-label','Continue this intent');
    box.innerHTML=`<div class="hub-handoff-copy"><span class="hub-handoff-mark" aria-hidden="true">→</span><div><small>EXPLICIT INTENT · CONTINUE WITHOUT RESTARTING</small><strong data-hub-intent>${intentLabel[intent]}</strong></div></div><div class="hub-handoff-actions"><a data-hub-lab href="/live-lab.html">Explore free evidence</a><a data-hub-router href="/product-router.html">Compare paid routes</a></div>`;
    lanes.after(box);
    box.querySelector('[data-hub-lab]').addEventListener('click',()=>capture('hub_surface_handoff',{surface:'live_lab',intent}));
    box.querySelector('[data-hub-router]').addEventListener('click',()=>capture('hub_surface_handoff',{surface:'product_router',intent}));
  }

  function bindIntentButtons(){
    document.querySelectorAll('.rh-lanes .route[data-route]').forEach(btn=>{
      if(btn.dataset.hubV10Bound)return;btn.dataset.hubV10Bound='true';
      btn.addEventListener('click',()=>{
        const next=btn.dataset.route;
        if(!['cost','workflow','agent'].includes(next))return;
        intent=next;storeSet('sp-office-route',intent);applyIntentLinks();capture('hub_intent_selected',{intent,source:'gateway'});
      });
    });
  }

  function enhance(){correctLegacySpendKit();ensureHandoff();bindIntentButtons();applyIntentLinks()}
  enhance();
  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(()=>observer.disconnect(),9000);
})();