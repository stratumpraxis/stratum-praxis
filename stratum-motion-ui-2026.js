(()=>{'use strict';
if(window.__STRATUM_MOTION_UI_2026__)return;
window.__STRATUM_MOTION_UI_2026__='2026.10.05-v1';
document.documentElement.classList.add('sp-motion-ui');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(pointer:fine)').matches;

function surfaces(){
  const sel='.card,.offer,.route-tab,.flow-node,.start-card,.sp-revenue-proof__item,.metric,.module,.product-card,.route-card';
  document.querySelectorAll(sel).forEach(el=>{
    el.classList.add('sp-motion-surface');
    if(fine){
      el.addEventListener('pointermove',e=>{
        const r=el.getBoundingClientRect();
        el.style.setProperty('--sp-px',(e.clientX-r.left)+'px');
        el.style.setProperty('--sp-py',(e.clientY-r.top)+'px');
      },{passive:true});
    }
  });
}
function reveals(){
  if(reduce)return;
  const items=[...document.querySelectorAll('main > section,.card,.module,.route-shell,.sp-revenue-proof,.bw-section,.audit-band')];
  items.forEach((el,i)=>{el.classList.add('sp-reveal');el.style.setProperty('--sp-reveal-delay',Math.min(i%4,3)*35+'ms')});
  const io=new IntersectionObserver(entries=>{
    entries.forEach(x=>{if(x.isIntersecting){x.target.classList.add('sp-in');io.unobserve(x.target)}});
  },{rootMargin:'0px 0px -8% 0px',threshold:.08});
  items.forEach(el=>io.observe(el));
}
const PRODUCT={
 '/ai-saas-waste-calculator.html':{kind:'FREE TOOL',fit:'Find the signal first',outcome:'Spend baseline',summary:'Use your own numbers to see whether AI / SaaS spend deserves a deeper review.',items:['Monthly spend baseline','Visible waste assumptions','Next-step routing'],price:'FREE'},
 '/ai-saas-spend-audit-checklist.html':{kind:'FREE CHECK',fit:'Before renewal',outcome:'Review list',summary:'A lightweight review before buying a deeper decision layer.',items:['Contract review prompts','Usage questions','Renewal checks'],price:'FREE'},
 '/ai-saas-spend-decision-kit.html':{kind:'SELF-SERVICE',fit:'Renewal decision',outcome:'Decision system',summary:'A reusable structure for deciding what to keep, downgrade, merge or stop.',items:['Spend inventory','Utilization review','Keep / Downgrade / Merge / Stop matrix','Renewal cadence'],price:'$39'},
 '/ai-saas-spend-waste-audit.html':{kind:'SPECIALIST AUDIT',fit:'Material software spend',outcome:'Written decision',summary:'A fixed-scope review that turns a software stack into a management decision map.',items:['Current spend map','Low-use candidates','Overlap review','Decision matrix','30-day action path'],price:'$499'},
 '/ai-saas-spend-monitoring.html':{kind:'RECURRING CONTROL',fit:'After economics are visible',outcome:'Ongoing review',summary:'Recurring control for teams that already know what they need to monitor.',items:['Recurring spend review','Renewal checks','Evidence history'],price:'$199–499 / mo'},
 '/b2b/':{kind:'FREE DIAGNOSTIC',fit:'Before automation',outcome:'Workflow fit',summary:'Identify whether one recurring workflow deserves redesign, automation or no action.',items:['Workflow friction check','Decision route','No forced paid escalation'],price:'FREE'},
 '/live-lab.html':{kind:'FREE EVIDENCE',fit:'Test before purchase',outcome:'Visible signal',summary:'Interactive tools for testing a business decision before buying a paid layer.',items:['Live inputs','Immediate result','Evidence-first routing'],price:'FREE'},
 '/workflow-audit.html':{kind:'SPECIALIST AUDIT',fit:'One material workflow',outcome:'Written decision',summary:'A fixed-scope audit for a recurring workflow with meaningful cost, delay or coordination burden.',items:['Current Workflow Map','Leak Analysis','Ranked Opportunities','ROI assumptions','Risk + Human Checkpoints','30-Day Action Plan'],price:'$499'},
 '/sample-workflow-audit.html':{kind:'SAMPLE',fit:'Preview before purchase',outcome:'Artifact preview',summary:'See the structure of a workflow decision artifact before buying.',items:['Example map','Example ranking','Example action path'],price:'SAMPLE'},
 '/ai-agent-economics-calculator.html':{kind:'FREE TOOL',fit:'Before agent scale',outcome:'Unit economics',summary:'Test whether an agent makes economic sense before adding more autonomy.',items:['Unit cost','Outcome economics','Scale signal'],price:'FREE'},
 '/agent-control-auditor.html':{kind:'CONTROL TOOL',fit:'Before autonomy',outcome:'Authority map',summary:'Make agent permission boundaries and human checkpoints explicit.',items:['Authority boundary','Human gates','Control review'],price:'FREE / PRO'},
 '/cross-agent-operating-kit.html':{kind:'OPERATING KIT',fit:'Multi-agent operations',outcome:'Portable controls',summary:'A reusable operating layer for policy, permissions, approvals, cost and handoff.',items:['Policy layer','Permission map','Human gates','Cost controls','Migration checks','State handoff'],price:'$69–299'},
 '/buyer-workspace.html':{kind:'BUYER ACCESS',fit:'After purchase',outcome:'Purchased asset',summary:'Access and use purchased Stratum decision assets.',items:['Asset access','Use guidance','Return path'],price:'ACCESS'}
};
function keyFor(href){
  try{
    const u=new URL(href,location.href);
    let p=u.pathname.replace(/\/+/g,'/');
    if(p.length>1&&p.endsWith('/'))p=p;
    return p;
  }catch{return ''}
}
let backdrop,sheet,lastFocus;
function ensureSheet(){
  if(sheet)return;
  backdrop=document.createElement('div');backdrop.className='sp-sheet-backdrop';backdrop.hidden=true;
  sheet=document.createElement('section');sheet.className='sp-offer-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','sp-sheet-title');
  sheet.innerHTML='<div class="sp-sheet-handle"></div><div class="sp-sheet-head"><div><small data-sheet-kind></small><h2 id="sp-sheet-title" data-sheet-title></h2></div><button class="sp-sheet-close" type="button" aria-label="Close">×</button></div><div class="sp-sheet-body"><p class="sp-sheet-summary" data-sheet-summary></p><div class="sp-sheet-meta"><div><small>BEST WHEN</small><b data-sheet-fit></b></div><div><small>OUTCOME</small><b data-sheet-outcome></b></div><div><small>PRICE</small><b data-sheet-price></b></div></div><ul class="sp-sheet-list" data-sheet-items></ul><div class="sp-sheet-actions"><a class="sp-sheet-primary" data-sheet-open href="#">Open →</a><a class="sp-sheet-secondary" data-sheet-close-link href="#">Keep browsing</a></div></div>';
  document.body.append(backdrop,sheet);
  const close=()=>closeSheet();
  backdrop.addEventListener('click',close);
  sheet.querySelector('.sp-sheet-close').addEventListener('click',close);
  sheet.querySelector('[data-sheet-close-link]').addEventListener('click',e=>{e.preventDefault();close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)close()});
}
function openSheet(anchor){
  ensureSheet();
  const k=keyFor(anchor.href),d=PRODUCT[k]||{kind:'STRATUM ROUTE',fit:'Decision support',outcome:'Next step',summary:'Open this Stratum route to continue.',items:['Clear scope','Explicit next action'],price:(anchor.querySelector('b')?.textContent||'')};
  lastFocus=document.activeElement;
  sheet.querySelector('[data-sheet-kind]').textContent=d.kind;
  sheet.querySelector('[data-sheet-title]').textContent=anchor.querySelector('strong')?.textContent?.trim()||anchor.textContent.trim();
  sheet.querySelector('[data-sheet-summary]').textContent=d.summary;
  sheet.querySelector('[data-sheet-fit]').textContent=d.fit;
  sheet.querySelector('[data-sheet-outcome]').textContent=d.outcome;
  sheet.querySelector('[data-sheet-price]').textContent=d.price;
  sheet.querySelector('[data-sheet-items]').innerHTML=d.items.map(x=>'<li>'+x+'</li>').join('');
  const open=sheet.querySelector('[data-sheet-open]');open.href=anchor.href;open.textContent=(d.price&&d.price!=='FREE'?'Open '+d.price:'Open route')+' →';
  backdrop.hidden=false;sheet.hidden=false;document.body.classList.add('sp-sheet-open');
  requestAnimationFrame(()=>{backdrop.classList.add('is-open');sheet.classList.add('is-open');sheet.querySelector('.sp-sheet-close').focus({preventScroll:true})});
  try{window.scosCapture?.('router_offer_preview_open',{path:k,price:d.price})}catch(_){}
}
function closeSheet(){
  if(!sheet||sheet.hidden)return;
  sheet.classList.remove('is-open');backdrop.classList.remove('is-open');document.body.classList.remove('sp-sheet-open');
  setTimeout(()=>{sheet.hidden=true;backdrop.hidden=true;lastFocus?.focus?.({preventScroll:true})},reduce?0:240);
}
function productRouter(){
  if(document.body.dataset.page!=='revenue_route_os_v2')return;
  document.querySelectorAll('.offers').forEach(group=>{
    [...group.children].filter(x=>x.matches('a.offer')).forEach(anchor=>{
      const wrap=document.createElement('article');wrap.className='sp-offer-shell';
      anchor.before(wrap);wrap.appendChild(anchor);
      const b=document.createElement('button');b.type='button';b.className='sp-offer-peek';b.textContent='What do I get?';
      b.setAttribute('aria-label','Preview '+(anchor.querySelector('strong')?.textContent||'offer'));
      b.addEventListener('click',()=>openSheet(anchor));
      wrap.appendChild(b);
    });
  });
  document.querySelectorAll('.route-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{document.querySelector('.route-shell')?.classList.add('sp-route-switch');setTimeout(()=>document.querySelector('.route-shell')?.classList.remove('sp-route-switch'),380)});
  });
}
function boot(){surfaces();reveals();productRouter()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();