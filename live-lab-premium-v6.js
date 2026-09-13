/* Stratum Live Lab — premium exploration interaction v6
   Uses explicit intent and visible inventory only. No inferred identity, fake evidence or route changes. */
(()=>{
  'use strict';
  if(document.body?.dataset.page!=='live_lab_v4') return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const lang=()=>['ja','es'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
  const copy={
    en:{search:'Search tools, decisions, signals…',matches:'MATCHES',empty:'No matching tool. Clear the search and choose another decision.',clear:'Clear search'},
    ja:{search:'Tool・判断・Signalを検索…',matches:'一致',empty:'該当Toolがありません。検索を解除して別の判断を選んでください。',clear:'検索を解除'},
    es:{search:'Buscar herramientas, decisiones, señales…',matches:'RESULTADOS',empty:'No hay una herramienta coincidente. Borra la búsqueda y elige otra decisión.',clear:'Borrar búsqueda'}
  };

  function capture(name,props){try{window.scosCapture?.(name,Object.assign({surface:'live_lab'},props||{}));}catch(_){}}
  function currentIntent(){return q('#intent-buttons .intent-button.active')?.dataset.intent||'cost';}
  function updateHandoff(){const link=q('[data-analytics-id="live_lab_to_products"]');if(link)link.href=`/product-router.html?intent=${encodeURIComponent(currentIntent())}`;}

  function buildVisual(){
    const hero=q('.page-topline');
    if(!hero||q('.lab-signal-visual',hero)) return;
    const map=document.createElement('div');
    map.className='lab-signal-visual';
    map.setAttribute('aria-label','Spend, Workflow and Agent evidence routes');
    map.innerHTML=`<span class="lab-route-line" aria-hidden="true"></span><div class="lab-core" aria-hidden="true">EVIDENCE</div>
      <button type="button" class="lab-route-node" data-intent="cost"><i>↗</i><span><b>SPEND</b><small>cost → evidence</small></span></button>
      <button type="button" class="lab-route-node" data-intent="workflow"><i>⌁</i><span><b>WORKFLOW</b><small>friction → decision</small></span></button>
      <button type="button" class="lab-route-node" data-intent="agent"><i>✦</i><span><b>AGENT</b><small>economics → control</small></span></button>`;
    hero.appendChild(map);
    map.addEventListener('click',e=>{
      const node=e.target.closest('.lab-route-node');if(!node)return;
      const intent=node.dataset.intent;
      const target=q(`#intent-buttons [data-intent="${intent}"]`);
      if(target){target.click();q('.catalog-layout')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});capture('lab_visual_intent_select',{intent});}
    });
  }

  function buildSearch(){
    const main=q('.catalog-main');
    if(!main||q('.lab-control-deck',main)) return;
    const deck=document.createElement('div');
    deck.className='lab-control-deck';
    deck.innerHTML=`<label class="lab-search"><span aria-hidden="true">⌕</span><input type="search" autocomplete="off" spellcheck="false" aria-label="Search free decision tools"></label><span class="lab-match" aria-live="polite"></span>`;
    main.prepend(deck);
    const inventory=q('.inventory');
    if(inventory&&!q('.lab-empty',inventory)){
      const empty=document.createElement('div');empty.className='lab-empty';empty.innerHTML='<span></span> <button type="button"></button>';inventory.appendChild(empty);
      empty.querySelector('button').addEventListener('click',()=>{deck.querySelector('input').value='';applyFilter(true);});
    }
    const input=deck.querySelector('input');
    let timer;
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>applyFilter(false),90);});
    document.addEventListener('keydown',e=>{
      if(e.key==='/'&&!/input|textarea|select/i.test(e.target.tagName)){e.preventDefault();input.focus();}
      if(e.key==='Escape'&&document.activeElement===input&&input.value){input.value='';applyFilter(true);}
    });
    localizeSearch();
    applyFilter(true);
  }

  function localizeSearch(){
    const c=copy[lang()]||copy.en,input=q('.lab-search input'),empty=q('.lab-empty');
    if(input) input.placeholder=c.search;
    if(empty){empty.querySelector('span').textContent=c.empty;empty.querySelector('button').textContent=c.clear;}
    applyFilter(true);
  }

  function applyFilter(silent){
    const input=q('.lab-search input'),match=q('.lab-match'),empty=q('.lab-empty');
    if(!input||!match)return;
    const term=input.value.trim().toLocaleLowerCase();
    const rows=qa('#inventory .inventory-row');let visible=0;
    rows.forEach(row=>{const show=!term||row.textContent.toLocaleLowerCase().includes(term);row.hidden=!show;if(show)visible++;});
    const c=copy[lang()]||copy.en;match.textContent=`${visible} ${c.matches}`;
    empty?.classList.toggle('show',visible===0);
    if(!silent)capture('lab_search',{query_length:term.length,match_count:visible});
  }

  function syncIntent(){
    const intent=currentIntent();
    qa('.lab-route-node').forEach(n=>n.classList.toggle('is-active',n.dataset.intent===intent));
    updateHandoff();
  }

  function applyIncomingIntent(){
    const incoming=new URLSearchParams(location.search).get('intent');
    if(!['cost','workflow','agent'].includes(incoming))return;
    const target=q(`#intent-buttons [data-intent="${incoming}"]`);
    if(target&&!target.classList.contains('active')){target.click();capture('lab_explicit_intent_continued',{intent:incoming,source:'query'});}
  }

  function watch(){
    const buttons=q('#intent-buttons'),inventory=q('#inventory');
    if(buttons)new MutationObserver(()=>syncIntent()).observe(buttons,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    if(inventory)new MutationObserver(()=>applyFilter(true)).observe(inventory,{childList:true,subtree:false});
    new MutationObserver(()=>localizeSearch()).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    document.addEventListener('click',e=>{const row=e.target.closest('#inventory .inventory-row');if(row)capture('lab_tool_open',{destination:row.getAttribute('href')||'',search_active:!!q('.lab-search input')?.value.trim(),intent:currentIntent()});},{capture:true});
  }

  function init(){buildVisual();buildSearch();watch();applyIncomingIntent();syncIntent();setTimeout(()=>{applyIncomingIntent();syncIntent();applyFilter(true);},120);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
