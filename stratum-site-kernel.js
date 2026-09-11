(()=>{
  'use strict';
  if(window.__STRATUM_SITE_KERNEL__) return;
  window.__STRATUM_SITE_KERNEL__='2026.09.11-v1-circulation';

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const capture=(name,props={})=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({site_kernel_version:window.__STRATUM_SITE_KERNEL__,route:path},props));}catch(_){}};
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);

  const family=(()=>{
    if(['/','/live-lab.html','/product-router.html','/systems/','/guides/','/evidence.html'].includes(path)) return 'core';
    if(path.startsWith('/guides/ai-saas')||['/ai-saas-waste-calculator.html','/ai-saas-spend-audit-checklist.html','/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html','/saas-renewal-decision.html'].includes(path)) return 'spend';
    if(path.startsWith('/guides/workflow')||['/b2b/','/workflow-audit.html','/sample-workflow-audit.html','/workflow-automation-comparison.html'].includes(path)) return 'workflow';
    if(path.startsWith('/guides/ai-agent')||['/ai-agent-economics-calculator.html','/agent-control-auditor.html','/cross-agent-operating-kit.html','/ai-agent-cost-roi-calculator.html','/ai-coding-assistant-comparison.html'].includes(path)) return 'agent';
    if(path.startsWith('/revenue-pump/')||['/ai-monetization-reality-check.html','/ai-income-claim-checklist.html','/rustchain-bounty-radar.html'].includes(path)) return 'revenue';
    if(path.startsWith('/money-resilience/')) return 'money';
    if(path.startsWith('/72-hour-household-readiness/')) return 'household';
    if(path==='/buyer-workspace.html'||path==='/cross-agent-operating-kit-access.html') return 'buyer';
    return 'other';
  })();
  document.documentElement.dataset.spkFamily=family;

  const circulation={
    core:{title:'Keep the decision moving.',note:'Use the free layer to create evidence, the route map to choose depth, and the buyer workspace to return after purchase.',links:[['RE-MEASURE','Free tools','/live-lab.html'],['CHOOSE DEPTH','Revenue Route OS','/product-router.html'],['RETURN','Buyer Workspace','/buyer-workspace.html']]},
    spend:{title:'Measure → decide → re-measure.',note:'The loop is intentional: evidence first, paid depth only when justified, then return to measurement after action.',links:[['RE-MEASURE','Waste Calculator','/ai-saas-waste-calculator.html'],['DECIDE','Spend route','/product-router.html'],['RETURN','Buyer Workspace','/buyer-workspace.html']]},
    workflow:{title:'Diagnose → decide → validate again.',note:'A paid audit is not the end of the route. Re-run the diagnostic after a pilot or process change.',links:[['RE-MEASURE','Workflow Diagnostic','/b2b/'],['PREVIEW','Sample Audit','/sample-workflow-audit.html'],['RETURN','Buyer Workspace','/buyer-workspace.html']]},
    agent:{title:'Economics → control → operate → verify.',note:'Scale only after unit economics and authority boundaries remain legible.',links:[['RE-MEASURE','Agent Economics','/ai-agent-economics-calculator.html'],['VERIFY CONTROL','Control Auditor','/agent-control-auditor.html'],['RETURN','Buyer Workspace','/buyer-workspace.html']]},
    revenue:{title:'Find the blockage, then return to evidence.',note:'Revenue utilities should improve an existing route rather than create another product by default.',links:[['SCAN','Revenue Pump','/revenue-pump/'],['ROUTE','Revenue Route OS','/product-router.html'],['METHOD','Evidence Standard','/evidence.html']]}
  };

  function injectCirculation(){
    if(!circulation[family]||path==='/buyer-workspace.html'||document.querySelector('[data-spk-circulation]')) return;
    const main=$('main');if(!main)return;
    const c=circulation[family];
    const section=document.createElement('section');section.className='spk-circulation';section.dataset.spkCirculation='';section.setAttribute('aria-label','Stratum decision circulation');
    section.innerHTML=`<div class="spk-circ-head"><div><div class="spk-circ-kicker">DECISION CIRCULATION</div><h2>${c.title}</h2></div><p>${c.note}</p></div><div class="spk-circ-grid">${c.links.map((x,i)=>`<a class="spk-circ-link" href="${x[2]}" data-analytics-id="kernel_circulation_${family}_${i+1}"><span><small>${x[0]}</small><b>${x[1]}</b></span><i>→</i></a>`).join('')}</div>`;
    main.appendChild(section);
    capture('site_kernel_circulation_ready',{family});
  }

  const previewRoutes=new Set(['/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html','/cross-agent-operating-kit.html']);
  function previewShell(title,note,tabs){
    const s=document.createElement('section');s.className='spk-preview';s.dataset.spkPreview='';
    s.innerHTML=`<div class="spk-preview-head"><div><div class="spk-preview-kicker">INTERACTIVE PRODUCT PREVIEW</div><h2>${title}</h2></div><p>${note}</p></div><div class="spk-tabs" role="tablist">${tabs.map((t,i)=>`<button class="spk-tab" role="tab" aria-selected="${i===0?'true':'false'}" data-spk-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div class="spk-preview-body">${tabs.map((t,i)=>`<div class="spk-pane ${i===0?'is-active':''}" data-spk-pane="${t[0]}">${t[2]}</div>`).join('')}</div>`;
    s.addEventListener('click',e=>{const b=e.target.closest('[data-spk-tab]');if(!b)return;const id=b.dataset.spkTab;$$('[data-spk-tab]',s).forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));$$('[data-spk-pane]',s).forEach(x=>x.classList.toggle('is-active',x.dataset.spkPane===id));capture('site_kernel_preview_tab',{product:path,tab:id});});
    return s;
  }

  function valueKitPreview(){
    const tabs=[
      ['model','Model',`<div class="spk-form"><div class="spk-field"><label for="spkHours">Monthly repetitive hours</label><input id="spkHours" type="number" min="0" step="1" value="40"></div><div class="spk-field"><label for="spkRate">Loaded hourly cost</label><input id="spkRate" type="number" min="0" step="1" value="45"></div><div class="spk-field"><label for="spkTool">Monthly tool cost</label><input id="spkTool" type="number" min="0" step="1" value="200"></div><div class="spk-field"><label for="spkRecovery">Potential time change (%)</label><input id="spkRecovery" type="number" min="0" max="100" step="5" value="25"></div></div><div class="spk-metrics"><div class="spk-metric"><small>BASELINE CAPACITY COST</small><strong id="spkBaseline">—</strong><span>hours × loaded cost × 12</span></div><div class="spk-metric"><small>PLANNING CAPACITY VALUE</small><strong id="spkValue">—</strong><span>before setup / review / failure cost</span></div><div class="spk-metric"><small>TOOL COST</small><strong id="spkToolAnnual">—</strong><span>monthly × 12</span></div></div><p class="spk-note">Illustrative planning model using only your inputs. Capacity value is not guaranteed cash savings or revenue.</p>`],
      ['threshold','Threshold','<div class="spk-flow"><div><small>01 · BASELINE</small><b>Current time, cost, delay or error</b></div><div><small>02 · VALUE</small><b>What changes if the idea works</b></div><div><small>03 · FULL COST</small><b>Tool + setup + review + failure</b></div><div><small>04 · DECISION</small><b>Go / test / redesign / stop</b></div></div><p class="spk-note">The paid kit gives the structure for a reviewable threshold; this preview intentionally does not pretend setup and risk costs are known.</p>'],
      ['review','Review','<div class="spk-metrics"><div class="spk-metric"><small>FINANCE</small><strong>Assumptions</strong><span>visible and challengeable</span></div><div class="spk-metric"><small>OPERATIONS</small><strong>Human review</strong><span>included in the full case</span></div><div class="spk-metric"><small>DECISION</small><strong>Explicit</strong><span>not “AI seems useful”</span></div></div>'],
      ['signal','Signal','<div class="spk-metric"><small>PREVIEW SIGNAL</small><strong id="spkSignal">Enter assumptions</strong><span id="spkSignalNote">The full decision still needs setup, review, failure and risk costs.</span></div>']
    ];
    const s=previewShell('Try the decision logic before checkout.','A small live model shows the shape of the $39 workflow without pretending a complete business case can be generated from four numbers.',tabs);
    const update=()=>{const h=Math.max(0,+$('#spkHours',s).value||0),r=Math.max(0,+$('#spkRate',s).value||0),tool=Math.max(0,+$('#spkTool',s).value||0),pct=Math.max(0,Math.min(100,+$('#spkRecovery',s).value||0))/100;const base=h*r*12,val=base*pct,cost=tool*12,delta=val-cost;$('#spkBaseline',s).textContent=money(base);$('#spkValue',s).textContent=money(val);$('#spkToolAnnual',s).textContent=money(cost);$('#spkSignal',s).textContent=delta>0?'Positive before full-cost review':delta<0?'Negative before full-cost review':'Neutral before full-cost review';$('#spkSignalNote',s).textContent=`Planning delta ${money(delta)} before setup, review, failure and risk costs.`;};
    $$('input',s).forEach(x=>x.addEventListener('input',update));update();return s;
  }

  function spendAuditPreview(){
    return previewShell('See the shape of the written decision map.','Fictional structure only — not a client result. The point is to make the deliverable legible before a $499 decision.',[
      ['stack','Stack map','<div class="spk-flow"><div><small>COLLABORATION</small><b>Core workspace</b></div><div><small>AI ADD-ONS</small><b>2 overlapping assistants</b></div><div><small>AUTOMATION</small><b>1 workflow platform</b></div><div><small>RENEWALS</small><b>3 dates to review</b></div></div><p class="spk-note">Illustrative labels only. A real audit uses the stack and renewal context supplied by the buyer.</p>'],
      ['leaks','Leak map','<div class="spk-metrics"><div class="spk-metric"><small>OVERLAP</small><strong>Review</strong><span>same capability twice?</span></div><div class="spk-metric"><small>UTILIZATION</small><strong>Verify</strong><span>weak adoption or stale seats?</span></div><div class="spk-metric"><small>ECONOMICS</small><strong>Compare</strong><span>cost vs workflow value</span></div></div>'],
      ['actions','Ranked actions','<div class="spk-flow"><div><small>KEEP</small><b>Value is evidenced</b></div><div><small>REDUCE</small><b>Plan or seat sizing</b></div><div><small>CONSOLIDATE</small><b>Overlap is material</b></div><div><small>REVIEW / CANCEL</small><b>Evidence is weak</b></div></div>'],
      ['plan','30-day plan','<div class="spk-flow"><div><small>DAYS 1–5</small><b>Baseline</b></div><div><small>DAYS 6–12</small><b>Validate usage</b></div><div><small>DAYS 13–21</small><b>Act on renewals</b></div><div><small>DAYS 22–30</small><b>Re-measure</b></div></div>']
    ]);
  }

  function crossAgentPreview(){
    const s=previewShell('Switch the runtime. Keep the operating layer.','Use the controls below to see what should remain portable when the agent runtime changes.',[
      ['runtime','Runtime switch','<div class="spk-runtime" aria-label="Example runtimes"><button class="active" data-runtime="Claude">Claude</button><button data-runtime="Codex">Codex</button><button data-runtime="Cursor">Cursor</button><button data-runtime="Other">Other</button></div><div class="spk-stack"><div><small>BRAIN</small><b>Operating intent</b></div><div><small>POLICY</small><b>Boundaries</b></div><div><small>SKILLS</small><b>Reusable actions</b></div><div><small>STATE</small><b>Portable context</b></div></div><p class="spk-note" id="spkRuntimeNote">Claude selected. The runtime changes; the operating contract remains explicit.</p>'],
      ['gates','Human gates','<div class="spk-flow"><div><small>REQUEST</small><b>Agent proposes action</b></div><div><small>POLICY</small><b>Check authority</b></div><div><small>HUMAN</small><b>Approve when required</b></div><div><small>LOG</small><b>Record outcome</b></div></div>'],
      ['cost','Cost guard','<div class="spk-metrics"><div class="spk-metric"><small>BUDGET</small><strong>Bounded</strong><span>define the ceiling</span></div><div class="spk-metric"><small>RETRY</small><strong>Visible</strong><span>avoid silent loops</span></div><div class="spk-metric"><small>FAILURE</small><strong>Escalate</strong><span>stop before drift</span></div></div>'],
      ['migration','Migration','<div class="spk-flow"><div><small>EXPORT</small><b>Brain + policy</b></div><div><small>MAP</small><b>Runtime differences</b></div><div><small>TEST</small><b>Critical skills</b></div><div><small>SWITCH</small><b>Keep rollback path</b></div></div>']
    ]);
    s.addEventListener('click',e=>{const b=e.target.closest('[data-runtime]');if(!b)return;$$('[data-runtime]',s).forEach(x=>x.classList.toggle('active',x===b));$('#spkRuntimeNote',s).textContent=`${b.dataset.runtime} selected. The runtime changes; the operating contract remains explicit.`;capture('site_kernel_runtime_preview',{runtime:b.dataset.runtime});});return s;
  }

  function monitoringPreview(){
    const s=previewShell('Preview the recurring control cycle.','Monitoring should exist only when drift can recur. Toggle the surfaces that would actually need a watch cycle.',[
      ['watch','Watch surfaces','<div class="spk-watch"><button data-watch="Renewals"><b>Renewals</b><small>dates + decision windows</small></button><button data-watch="Overlap"><b>Overlap</b><small>duplicate capability</small></button><button data-watch="Seat drift"><b>Seat drift</b><small>plan / seat mismatch</small></button><button data-watch="AI add-ons"><b>AI add-ons</b><small>new cost without baseline</small></button></div><div class="spk-watch-result" id="spkWatchResult">Select only the recurring surfaces that justify monitoring.</div>'],
      ['cycle','Monthly cycle','<div class="spk-flow"><div><small>01 · DETECT</small><b>New drift signal</b></div><div><small>02 · VERIFY</small><b>Confirm the baseline</b></div><div><small>03 · ACT</small><b>Renew / reduce / consolidate</b></div><div><small>04 · EVIDENCE</small><b>Record the decision</b></div></div>'],
      ['boundary','Boundary','<div class="spk-metrics"><div class="spk-metric"><small>NOT REQUIRED</small><strong>Always-on</strong><span>if nothing meaningful changes</span></div><div class="spk-metric"><small>USEFUL WHEN</small><strong>Drift recurs</strong><span>renewals / overlap / seats</span></div><div class="spk-metric"><small>STOP RULE</small><strong>Stable</strong><span>when recurring control adds no value</span></div></div>']
    ]);
    const selected=new Set();s.addEventListener('click',e=>{const b=e.target.closest('[data-watch]');if(!b)return;const v=b.dataset.watch;if(selected.has(v))selected.delete(v);else selected.add(v);b.classList.toggle('active',selected.has(v));$('#spkWatchResult',s).textContent=selected.size?`${selected.size} recurring surface${selected.size>1?'s':''}: ${[...selected].join(' · ')}`:'Select only the recurring surfaces that justify monitoring.';capture('site_kernel_monitoring_preview',{selected:[...selected]});});return s;
  }

  function injectPreview(){
    if(!previewRoutes.has(path)||$('[data-spk-preview]'))return;
    let node;if(path==='/ai-value-realization-kit.html')node=valueKitPreview();else if(path==='/ai-saas-spend-waste-audit.html')node=spendAuditPreview();else if(path==='/cross-agent-operating-kit.html')node=crossAgentPreview();else node=monitoringPreview();
    const main=$('main');if(!main)return;
    const rail=$('.sr-rail',main)||$('.proof-strip',main)||$('section',main);
    if(rail&&rail.parentElement===main)rail.insertAdjacentElement('afterend',node);else{const shell=$('.sr-shell',main);if(shell&&rail&&rail.parentElement===shell)rail.insertAdjacentElement('afterend',node);else main.prepend(node);}
    capture('site_kernel_preview_ready',{product:path});
  }

  function measure(){
    const body=document.body;if(!body)return null;
    const text=(body.innerText||'').replace(/\s+/g,' ').trim();
    const headings=$$('h1,h2,h3').length||1;
    const interactive=$$('a[href],button,input,select,textarea').length||1;
    const tiny=$$('a[href],button').filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<36||r.height<36);}).length;
    const overflow=Math.max(document.documentElement.scrollWidth,body.scrollWidth)>innerWidth+8;
    const density=Math.round(text.length/headings);
    const categories={mobile:Math.max(20,100-(overflow?45:0)-Math.min(35,tiny*4)),clarity:Math.max(25,100-Math.max(0,density-760)/12),structure:($('h1')?25:0)+($('main')?25:0)+($('link[rel="canonical"]')?25:0)+($('meta[name="description"]')?25:0),trust:($('script[type="application/ld+json"]')?30:10)+($('link[rel="canonical"]')?25:0)+($('meta[name="description"]')?25:0)+($('footer')?20:0),interaction:Math.min(100,50+(interactive?25:0)+($('[data-analytics-id]')?25:0))};
    const weakest=Object.entries(categories).sort((a,b)=>a[1]-b[1])[0];return{tiny,overflow,density,categories,weakest:weakest[0],weakest_score:Math.round(weakest[1])};
  }

  function closeLoop(){
    const before=measure();if(!before)return;
    if(innerWidth<=760&&before.tiny>0)document.body.classList.add('spk-auto-touch');
    if(before.overflow)document.body.classList.add('spk-auto-overflow');
    if(before.density>900)document.body.classList.add('spk-auto-density');
    document.body.dataset.evolutionPriority=before.weakest;
    capture('site_kernel_priority_ranked',{family,...before});
    setTimeout(()=>{const after=measure();if(!after)return;capture('site_kernel_closed_loop',{family,priority:before.weakest,before_mobile:before.categories.mobile,after_mobile:after.categories.mobile,before_clarity:Math.round(before.categories.clarity),after_clarity:Math.round(after.categories.clarity),repair_touch:document.body.classList.contains('spk-auto-touch'),repair_overflow:document.body.classList.contains('spk-auto-overflow'),repair_density:document.body.classList.contains('spk-auto-density')});},900);
  }

  function ready(){injectPreview();injectCirculation();setTimeout(closeLoop,420);capture('site_kernel_ready',{family});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
