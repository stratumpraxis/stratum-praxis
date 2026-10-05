(()=>{'use strict';
if(window.__STRATUM_REVENUE_UI_2026__)return;
window.__STRATUM_REVENUE_UI_2026__='2026.10.05-v1';
const host=location.hostname.toLowerCase();
if(!(host==='stratumpraxis.com'||host==='www.stratumpraxis.com'||host==='localhost'||host==='127.0.0.1'))return;
const path=location.pathname.replace(/\/index\.html$/,'/').replace(/\/{2,}/g,'/');
const excluded=/\/(?:privacy|terms|.*(?:access|deliver|thank-you)|scos-access|ops|automation|revenue-os)\b/i.test(path);
document.documentElement.classList.add('sp-revenue-ui');

const configs={
  '/':{
    hero:'.rh-hero',
    eyebrow:'START WITH THE DECISION',
    title:'Three ways to use Stratum.',
    note:'Diagnose first, buy a decision artifact when useful, escalate only when the problem is material.',
    focus:[['START','Free diagnosis'],['DECIDE','Decision product'],['ESCALATE','Fixed-scope review']],
    items:[
      ['Free tools','Test the problem first','Use a diagnostic or calculator before paying.'],
      ['Decision products','Buy a reusable decision artifact','Use the output internally without a sales call.'],
      ['Professional review','Escalate only when justified','Move to a fixed scope when uncertainty is material.']
    ],
    dock:false
  },
  '/product-router.html':{
    hero:'.hero',
    eyebrow:'BUYER ROUTING',
    title:'Choose by decision, not by catalog.',
    note:'The route should tell you what to do next without forcing you to understand every Stratum product.',
    focus:[['FREE','Measure'],['SELF-SERVE','Decide'],['REVIEW','Escalate']],
    items:[
      ['Measure','Use a free tool','Create evidence before buying depth.'],
      ['Decide','Choose the smallest paid layer','Pay for structure, not for more pages.'],
      ['Escalate','Use review only when needed','A higher price should buy a clearer decision.']
    ],
    dock:false
  },
  '/live-lab.html':{
    hero:'.page-topline',
    eyebrow:'SHOW, THEN SELL',
    title:'Use the tool before the pitch.',
    note:'The free layer should create an aha moment and reveal whether a paid decision layer is justified.',
    focus:[['INPUT','Your situation'],['RESULT','Visible evidence'],['NEXT','One route']],
    items:[
      ['Input','Use your own assumptions','No invented business case.'],
      ['Result','See the important number or state','The output should stand on its own.'],
      ['Route','Move only if evidence supports it','No forced escalation.']
    ],
    dock:false
  },
  '/b2b/':{
    hero:'.page-topline',
    eyebrow:'WORKFLOW DIAGNOSTIC',
    title:'Know whether the workflow deserves attention.',
    note:'A diagnostic should reduce uncertainty before a buyer sees a paid audit.',
    focus:[['PROBLEM','One workflow'],['EVIDENCE','Visible burden'],['ROUTE','Fix / test / stop']],
    items:[
      ['Workflow','Name one recurring process','Keep scope narrow enough to inspect.'],
      ['Burden','Expose cost, delay or coordination','Make the problem legible.'],
      ['Route','Get a next-step decision','Stay free when the evidence is weak.']
    ],
    dock:false
  },
  '/workflow-audit.html':{
    hero:'.audit-stage',
    eyebrow:'WHAT YOU ACTUALLY BUY',
    title:'A decision pack your team can use.',
    note:'Show the artifact before asking for checkout. The value is the written decision layer, not the word “audit.”',
    focus:[['SCOPE','1 workflow'],['OUTPUT','Written decision'],['DELIVERY','Asynchronous']],
    items:[
      ['Workflow map','Trigger → owner → handoff → failure point','A compact current-state map.'],
      ['Leak analysis','Time, delay and coordination burden','Where the workflow loses value.'],
      ['Ranked options','Impact × effort × reversibility × risk','Prioritized rather than brainstormed.'],
      ['Planning scenarios','Assumptions shown explicitly','No fake precision or guaranteed ROI.'],
      ['Human checkpoints','Where automation should stop','Control boundaries stay visible.'],
      ['30-day path','Test / redesign / scale / stop','A concrete next sequence.']
    ],
    dock:true
  },
  '/ai-saas-spend-waste-audit.html':{
    hero:'.sr-hero',
    eyebrow:'WHAT THE AUDIT RETURNS',
    title:'Turn a software stack into a decision map.',
    note:'The buyer should see the output structure before seeing the checkout.',
    focus:[['MAP','Current spend'],['DECIDE','Keep / change / stop'],['ACT','30-day path']],
    items:[
      ['Spend map','Vendor, purpose, cost and renewal','One view of the current stack.'],
      ['Low-use candidates','Contracts that deserve review','Candidates, not invented savings.'],
      ['Overlap map','Where capabilities duplicate','Make consolidation questions visible.'],
      ['Decision matrix','Keep / downgrade / merge / stop','A reviewable recommendation structure.'],
      ['Risk notes','Dependencies and switching risk','Avoid “cut cost at any price.”'],
      ['Action path','Order the next decisions','What to inspect first.']
    ],
    dock:true
  },
  '/ai-saas-spend-decision-kit.html':{
    hero:'.hero',
    eyebrow:'INSIDE THE KIT',
    title:'A renewal decision system, not another AI guide.',
    note:'A low-ticket product should look like a usable artifact before checkout.',
    focus:[['INVENTORY','Know the stack'],['COMPARE','See overlap'],['DECIDE','Renew with intent']],
    items:[
      ['Inventory sheet','Vendor, owner, purpose and renewal','Create one source of truth.'],
      ['Utilization review','Usage and seat questions','Find contracts that need inspection.'],
      ['Decision matrix','Keep / downgrade / merge / stop','Force an explicit renewal decision.'],
      ['Review cadence','Return before the next renewal','Make the decision repeatable.']
    ],
    dock:true
  },
  '/cross-agent-operating-kit.html':{
    hero:'.shell.hero',
    eyebrow:'PRIMARY PAID ROUTE',
    title:'See the operating kit before checkout.',
    note:'The value is portable control across AI runtimes: policy, permissions, approvals, cost and migration checks.',
    focus:[['POLICY','Portable rules'],['CONTROL','Human gates'],['HANDOFF','State portability']],
    items:[
      ['Policy layer','Reusable operating rules','Keep behavior consistent across runtimes.'],
      ['Permission map','What agents may and may not do','Authority stays explicit.'],
      ['Human gates','Where approval is required','Irreversible actions stay human-controlled.'],
      ['Cost controls','Budget and escalation rules','Make spend constraints visible.'],
      ['Migration checks','Move without losing control intent','Reduce runtime lock-in.'],
      ['State handoff','What must survive between agents','Preserve operational context.']
    ],
    dock:true
  },
  '/ai-spend-leak-audit.html':{
    hero:'.hero',
    eyebrow:'WHAT THE BUYER RECEIVES',
    title:'Sell the deliverable, not the audit label.',
    note:'The page should make the output tangible before asking for $499.',
    focus:[['MAP','Spend inventory'],['DECIDE','Keep / cut / merge'],['NEXT','Action path']],
    items:[
      ['Spend inventory','AI / SaaS contracts in one view','Make the current state visible.'],
      ['Usage review','Low-use candidates to inspect','No fabricated savings claims.'],
      ['Overlap review','Duplicate capability candidates','Identify consolidation questions.'],
      ['Decision table','Keep / downgrade / merge / stop','A concrete management artifact.'],
      ['Workflow notes','Where spend did not remove work','Connect software cost to operations.'],
      ['30-day sequence','What to review first','Leave with a bounded action path.']
    ],
    dock:true
  },
  '/buyer-workspace.html':{
    hero:'.bw-hero',
    eyebrow:'POST-PURCHASE',
    title:'Make purchased value obvious.',
    note:'A buyer workspace should prioritize use, completion and return—not another sales pitch.',
    focus:[['OPEN','Purchased asset'],['USE','Complete the decision'],['RETURN','Re-measure']],
    items:[
      ['Access','Find the purchased artifact fast','No catalog hunting.'],
      ['Use','Make the next action obvious','Reduce post-purchase friction.'],
      ['Return','Come back when the decision changes','Support legitimate repeat value.']
    ],
    dock:false
  },
  '/evidence.html':{
    hero:'.shell.hero',
    eyebrow:'TRUST LAYER',
    title:'Evidence should reduce purchase risk.',
    note:'Show what is verified, what is illustrative and what is not claimed.',
    focus:[['VERIFIED','Direct evidence'],['VISIBLE','Assumptions'],['BOUNDED','No invented proof']],
    items:[
      ['Direct evidence','Prefer payment and direct readback','Do not promote clicks into revenue.'],
      ['Visible assumptions','Make estimates challengeable','Planning numbers stay planning numbers.'],
      ['Clear boundaries','State what is not guaranteed','Trust improves when limits are explicit.']
    ],
    dock:false
  }
};

function q(sel,root=document){try{return root.querySelector(sel)}catch{return null}}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function safeText(s,max=120){return clean(s).slice(0,max)}
function pageConfig(){return configs[path]||null}

function markStage(){
  const cfg=pageConfig();
  const hero=(cfg&&q(cfg.hero))||q('main > section')||q('section');
  if(hero) hero.classList.add('sp-revenue-stage');
}
function focusStrip(cfg){
  if(!cfg||!cfg.focus||q('[data-sp-revenue-focus]'))return null;
  const el=document.createElement('div');
  el.className='sp-revenue-focus';
  el.dataset.spRevenueFocus='true';
  el.innerHTML=cfg.focus.map(x=>'<div class="sp-revenue-focus__cell"><i></i><span><small>'+safeText(x[0],30)+'</small><b>'+safeText(x[1],80)+'</b></span></div>').join('');
  return el;
}
function proofSection(cfg){
  if(!cfg||!cfg.items||q('[data-sp-revenue-proof]'))return null;
  const section=document.createElement('section');
  section.className='sp-revenue-proof';
  section.dataset.spRevenueProof='true';
  const items=cfg.items.map((x,i)=>'<article class="sp-revenue-proof__item"><span class="sp-revenue-proof__num">'+String(i+1).padStart(2,'0')+'</span><strong>'+safeText(x[0],80)+'</strong><p>'+safeText(x[1],180)+(x[2]?' · '+safeText(x[2],180):'')+'</p></article>').join('');
  section.innerHTML='<div class="sp-revenue-proof__head"><div><span class="sp-revenue-proof__eyebrow">'+safeText(cfg.eyebrow,80)+'</span><h2>'+safeText(cfg.title,140)+'</h2></div><p>'+safeText(cfg.note,260)+'</p></div><div class="sp-revenue-proof__grid">'+items+'</div><div class="sp-revenue-proof__foot"><b>Stratum Praxis · Decision artifact preview</b><span>Illustrative structure only. No invented customer result.</span></div>';
  return section;
}
function injectProof(){
  if(excluded)return;
  const cfg=pageConfig(); if(!cfg)return;
  const hero=q(cfg.hero)||q('main > section')||q('section'); if(!hero)return;
  const focus=focusStrip(cfg);
  if(focus) hero.insertAdjacentElement('afterend',focus);
  const proof=proofSection(cfg);
  if(proof){
    const anchor=focus||hero;
    anchor.insertAdjacentElement('afterend',proof);
  }
}
function checkoutLink(){
  const cfg=pageConfig();
  if(!cfg||!cfg.dock||excluded)return null;
  const links=[...document.querySelectorAll('a[href*="buy.stripe.com"]')];
  return links.find(a=>!a.closest('[hidden]')&&safeText(a.textContent,120))||links[0]||null;
}
function dock(){
  if(q('[data-sp-revenue-dock]'))return;
  const link=checkoutLink(); if(!link)return;
  let label=safeText(link.textContent,80).replace(/[→›]+$/,'').trim();
  if(!label)label='Open checkout';
  const d=document.createElement('div');
  d.className='sp-revenue-dock';d.dataset.spRevenueDock='true';
  d.innerHTML='<div class="sp-revenue-dock__copy"><small>PRIMARY ACTION</small><b>'+label+'</b></div><a href="'+link.href+'" data-analytics-id="revenue_ui_mobile_checkout">Checkout →</a>';
  document.body.appendChild(d);
  document.documentElement.classList.add('sp-has-revenue-dock');
  const revealAt=()=>Math.max(300,Math.round(innerHeight*.46));
  const update=()=>{
    const engaged=scrollY>revealAt()||Boolean(document.querySelector('[data-sp-revenue-proof] :focus-within'));
    d.classList.toggle('is-visible',engaged);
    d.setAttribute('aria-hidden',engaged?'false':'true');
  };
  update();
  addEventListener('scroll',update,{passive:true});
  addEventListener('resize',update,{passive:true});
}
function simplifyMobile(){
  if(innerWidth>720)return;
  document.querySelectorAll('.office-header .office-nav a').forEach((a,i)=>{if(i>1)a.setAttribute('data-sp-mobile-secondary','true')});
}
function ready(){
  markStage();
  injectProof();
  dock();
  simplifyMobile();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();