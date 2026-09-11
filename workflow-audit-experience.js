/* Stratum Praxis — Workflow Audit Experience v1 */
(()=>{
  'use strict';
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const capture=(name,props)=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({experience:'workflow_audit_v1',route:location.pathname},props||{}));}catch(_){}};

  const panels={
    decision:{title:'Executive decision',lead:'A bounded recommendation appears first, so a team can understand the decision before reading the analysis.',body:'GO — pilot the missing-document follow-up loop first. Keep judgment-heavy responses human-led.',metrics:[['DECISION','GO','Narrow pilot first'],['PRIORITY','#1','Missing-document follow-up'],['WINDOW','30 days','Reversible pilot']]},
    map:{title:'Current workflow map',lead:'The current process is mapped before automation is proposed. Leaks and exception paths stay visible.',flow:[['01','Review','Checklist'],['02','Detect','Missing items'],['03','Draft','Reminder'],['04','Follow up','Repeat + sync'],['05','Escalate','Human exceptions']]},
    rank:{title:'Ranked opportunities',lead:'Candidates are ordered by impact, effort, reversibility and risk — not by novelty.',opps:[['Missing-document follow-up','High','Low–medium','Low–medium','Pilot first'],['Close-status summary','Medium','Low','Low','Second'],['Client Q&A auto-response','Medium','Medium','High','Hold'],['Automatic accounting decisions','High','High','High','Do not start']]},
    roi:{title:'ROI scenario',lead:'Planning assumptions stay visible. Capacity value is not presented as guaranteed savings or revenue.',bars:[['Current handling',100,'24h / mo'],['Pilot target',50,'12h / mo'],['Illustrative tool cost',16,'$80 / mo'],['Gross capacity value',62,'$504 / mo']]},
    risk:{title:'Risk + human checkpoints',lead:'The audit identifies where automation must stop, ask for review, or preserve human authority.',risks:[['Duplicate reminders','Check tracked + untracked channels before sending.'],['Client data','No cross-client exposure or unauthorized systems.'],['Judgment-heavy work','Tax, accounting, legal and advisory responses remain human-led.'],['Auditability','Log automated actions and preserve a fast stop path.']]},
    plan:{title:'30-day action plan',lead:'The recommendation ends with a reversible test sequence, not a vague transformation roadmap.',phases:[['Days 1–5','Baseline','Measure volume, handling time, exception types and latency.'],['Days 6–12','Shadow','Generate suggestions without sending. Compare with humans.'],['Days 13–21','Limited live','Automate only low-risk reminders for a bounded subset.'],['Days 22–30','Decision','Compare time, errors, responses and cost. Scale, redesign or stop.']]}
  };

  function previewMarkup(){
    return `<section class="wa-preview-lab" data-wa-preview aria-labelledby="wa-preview-title">
      <div class="wa-preview-head"><div><p class="wa-kicker">INTERACTIVE DELIVERABLE PREVIEW</p><h2 id="wa-preview-title">See the decision artifact before you buy.</h2></div><p>This uses the same fictional bookkeeping example as the public sample. It demonstrates structure only — not a client result or performance claim.</p></div>
      <div class="wa-preview-shell">
        <div class="wa-preview-nav" role="tablist" aria-label="Audit artifact preview"><small>DELIVERABLE / 06</small>
          ${[['decision','Decision'],['map','Workflow Map'],['rank','Ranking'],['roi','ROI'],['risk','Risk'],['plan','30-Day Plan']].map((x,i)=>`<button class="wa-preview-tab" type="button" role="tab" aria-selected="${i===0?'true':'false'}" data-wa-tab="${x[0]}"><span>0${i+1}</span><b>${x[1]}</b><i>→</i></button>`).join('')}
        </div>
        <div class="wa-preview-stage"><div class="wa-stage-top"><small>ILLUSTRATIVE SAMPLE · FICTIONAL INPUTS</small><span class="wa-stage-status"><i></i>DECISION ARTIFACT</span></div><div data-wa-panels></div><div class="wa-stage-footer"><span>Fictional example. Replace all assumptions with the buyer's real workflow baseline.</span><a href="/sample-workflow-audit.html" data-analytics-id="workflow_audit_open_sample">Open full interactive sample →</a></div></div>
      </div>
    </section>`;
  }

  function renderPanel(key,host){
    const p=panels[key]; if(!p||!host)return;
    let inner=`<div class="wa-panel is-active" data-wa-panel="${key}"><h3>${p.title}</h3><p>${p.lead}</p>`;
    if(p.body) inner+=`<div class="wa-callout">${p.body}</div>`;
    if(p.metrics) inner+=`<div class="wa-metrics">${p.metrics.map(m=>`<div class="wa-metric"><small>${m[0]}</small><strong>${m[1]}</strong><p>${m[2]}</p></div>`).join('')}</div>`;
    if(p.flow) inner+=`<div class="wa-flow">${p.flow.map((m,i)=>`<div class="wa-node ${i===1||i===3?'leak':''}"><small>${m[0]}</small><strong>${m[1]}</strong><em>${m[2]}</em></div>`).join('')}</div>`;
    if(p.opps) inner+=`<div class="wa-opportunity-list">${p.opps.map(m=>`<div class="wa-opportunity"><strong>${m[0]}</strong><span>${m[1]}</span><span>${m[2]}</span><span>${m[3]}</span><b>${m[4]}</b></div>`).join('')}</div>`;
    if(p.bars) inner+=`<div class="wa-bars">${p.bars.map(m=>`<div class="wa-bar"><span>${m[0]}</span><div class="wa-track"><i style="--v:${m[1]}%"></i></div><b>${m[2]}</b></div>`).join('')}</div>`;
    if(p.risks) inner+=`<div class="wa-risk-grid">${p.risks.map(m=>`<div class="wa-risk"><small>CHECKPOINT</small><strong>${m[0]}</strong><p>${m[1]}</p></div>`).join('')}</div>`;
    if(p.phases) inner+=`<div class="wa-timeline">${p.phases.map(m=>`<div class="wa-phase"><small>${m[0]}</small><strong>${m[1]}</strong><p>${m[2]}</p></div>`).join('')}</div>`;
    inner+='</div>'; host.innerHTML=inner;
  }

  function initAudit(){
    if(!/\/workflow-audit\.html$/.test(location.pathname))return;
    const delivery=document.querySelector('.audit-delivery-section');
    if(!delivery||document.querySelector('[data-wa-preview]'))return;
    delivery.insertAdjacentHTML('beforebegin',previewMarkup());
    const host=document.querySelector('[data-wa-panels]'); renderPanel('decision',host);
    document.querySelectorAll('[data-wa-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-wa-tab]').forEach(x=>x.setAttribute('aria-selected',x===btn?'true':'false'));
      renderPanel(btn.dataset.waTab,host); capture('workflow_audit_preview_tab',{tab:btn.dataset.waTab});
    }));
    capture('workflow_audit_preview_ready');
  }

  function initSample(){
    if(!/\/sample-workflow-audit\.html$/.test(location.pathname))return;
    const buttons=[...document.querySelectorAll('[data-wa-sample-tab]')];
    const sections=[...document.querySelectorAll('[data-wa-sample-section]')];
    if(!buttons.length||!sections.length)return;
    const activate=(key,updateHash=true)=>{
      buttons.forEach(b=>b.setAttribute('aria-selected',b.dataset.waSampleTab===key?'true':'false'));
      sections.forEach(s=>s.classList.toggle('is-active',s.dataset.waSampleSection===key));
      if(updateHash&&history.replaceState)history.replaceState(null,'','#'+key);
      capture('sample_audit_section',{section:key});
    };
    buttons.forEach(b=>b.addEventListener('click',()=>activate(b.dataset.waSampleTab)));
    const initial=location.hash.replace('#','');
    if(initial&&buttons.some(b=>b.dataset.waSampleTab===initial))activate(initial,false); else activate('decision',false);
    if(!reduce){
      document.addEventListener('keydown',e=>{
        if(!['ArrowRight','ArrowLeft'].includes(e.key))return;
        const i=buttons.findIndex(b=>b.getAttribute('aria-selected')==='true');
        const n=e.key==='ArrowRight'?(i+1)%buttons.length:(i-1+buttons.length)%buttons.length;
        buttons[n].focus();activate(buttons[n].dataset.waSampleTab);
      });
    }
    capture('sample_audit_experience_ready');
  }

  const boot=()=>{initAudit();initSample();};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
