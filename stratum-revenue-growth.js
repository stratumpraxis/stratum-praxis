/* Stratum Praxis — recurring value path translations + revenue-cycle navigation */
(() => {
  'use strict';
  const C={
    en:{
      loopLabel:'POST-AUDIT VALUE LOOP',loopTitle:'Turn a one-time audit into verified value and recurring control.',loopNote:'The spend route can continue after the first decision: recover verified savings when execution support is justified, then keep the stack from drifting back.',
      auditBadge:'ONE-TIME',auditName:'AI & SaaS Spend Audit',auditPrice:'$499',auditDesc:'Connect software cost to workflow value and rank KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCEL decisions.',auditMeta1:'3-business-day target',auditMeta2:'Stripe checkout',auditCta:'Review the $499 spend audit',
      recoveryBadge:'PERFORMANCE',recoveryName:'Verified Savings Recovery',recoveryPrice:'15%',recoveryDesc:'Optional post-audit execution support. Fee applies only to mutually verified first-year savings under a written baseline.',recoveryMeta1:'Post-audit only',recoveryMeta2:'Verified savings only',recoveryCta:'See recovery terms',
      monitorBadge:'RECURRING',monitorName:'Spend Monitoring',monitorPrice:'$199–$499/mo',monitorDesc:'Recurring review for renewals, duplicate capability, plan-size drift, AI add-ons and prioritized cost actions.',monitorMeta1:'Core $199/mo',monitorMeta2:'Pro $499/mo',monitorCta:'See monthly monitoring',
      ladder39:'$39 one-time',ladder39Name:'AI Value Realization Kit',ladder39Note:'The direct self-service middle step for teams that can own the decision internally.',
      auditPairLabel:'TWO $499 SPECIALIST ROUTES',auditPairTitle:'Choose the audit that matches the leak.',auditPairNote:'Spend leakage and workflow leakage are different decisions. Both remain fixed-scope so buyers do not have to enter open-ended consulting.',
      spendTitle:'AI & SaaS Spend Waste Audit',spendText:'Best when the decision is about renewals, tool overlap, AI add-on creep, plan size or software cost versus workflow value.',workflowTitle:'AI Workflow Opportunity Audit',workflowText:'Best when one recurring workflow has material delay, rework or coordination burden and needs ranked automation opportunities.',openSpend:'Open Spend Audit — $499',openWorkflow:'Open Workflow Audit — $499'
    },
    ja:{
      loopLabel:'POST-AUDIT VALUE LOOP',loopTitle:'単発監査を、実証価値と継続収益につなげる。',loopNote:'Spend Routeは最初の判断で終わりません。必要なら実証済み削減のRecoveryへ進み、その後はStackの再肥大化をMonthly Monitoringで抑えます。',
      auditBadge:'ONE-TIME',auditName:'AI & SaaS Spend Audit',auditPrice:'$499',auditDesc:'Software CostをWorkflow Valueへ接続し、KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCELを順位化。',auditMeta1:'3営業日目安',auditMeta2:'Stripe決済',auditCta:'$499 Spend Auditを見る',
      recoveryBadge:'PERFORMANCE',recoveryName:'Verified Savings Recovery',recoveryPrice:'15%',recoveryDesc:'監査後の任意Execution Support。書面Baselineに基づき、相互確認できた初年度削減額だけがFee対象です。',recoveryMeta1:'監査後のみ',recoveryMeta2:'実証済み削減のみ',recoveryCta:'Recovery条件を見る',
      monitorBadge:'RECURRING',monitorName:'Spend Monitoring',monitorPrice:'$199–$499/月',monitorDesc:'Renewal・機能重複・Plan肥大・AI Add-on・コストActionを毎月レビューする継続Control。',monitorMeta1:'Core $199/月',monitorMeta2:'Pro $499/月',monitorCta:'Monthly Monitoringを見る',
      ladder39:'$39 買い切り',ladder39Name:'AI Value Realization Kit',ladder39Note:'社内で判断できるTeam向けの、直接購入できるSelf-service中間層。',
      auditPairLabel:'2つの $499 SPECIALIST ROUTE',auditPairTitle:'漏れの種類で監査を選ぶ。',auditPairNote:'Software Spendの漏れとWorkflowの漏れは別の判断です。どちらも固定範囲なので、オープンエンドのConsultingへ入る必要はありません。',
      spendTitle:'AI & SaaS Spend Waste Audit',spendText:'更新・Tool重複・AI Add-on・Plan肥大・Software CostとWorkflow Valueの判断に向く監査。',workflowTitle:'AI Workflow Opportunity Audit',workflowText:'1つの定常Workflowに大きな遅延・再作業・調整負荷があり、自動化機会を順位化したい場合の監査。',openSpend:'Spend Auditを開く — $499',openWorkflow:'Workflow Auditを開く — $499'
    },
    es:{
      loopLabel:'POST-AUDIT VALUE LOOP',loopTitle:'Convierte una auditoría única en valor verificado y control recurrente.',loopNote:'La ruta de gasto puede continuar: recuperación de ahorro verificado cuando tenga sentido y monitorización para evitar que el stack vuelva a crecer sin control.',
      auditBadge:'UNA VEZ',auditName:'AI & SaaS Spend Audit',auditPrice:'$499',auditDesc:'Conecta coste de software con valor del workflow y prioriza KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCEL.',auditMeta1:'Objetivo 3 días',auditMeta2:'Pago Stripe',auditCta:'Ver Spend Audit $499',
      recoveryBadge:'RENDIMIENTO',recoveryName:'Verified Savings Recovery',recoveryPrice:'15%',recoveryDesc:'Soporte opcional tras la auditoría. La tarifa se aplica solo al ahorro de primer año verificado bajo una línea base escrita.',recoveryMeta1:'Solo post-audit',recoveryMeta2:'Solo ahorro verificado',recoveryCta:'Ver condiciones',
      monitorBadge:'RECURRENTE',monitorName:'Spend Monitoring',monitorPrice:'$199–$499/mes',monitorDesc:'Revisión recurrente de renovaciones, duplicados, planes sobredimensionados, add-ons AI y acciones de coste.',monitorMeta1:'Core $199/mes',monitorMeta2:'Pro $499/mes',monitorCta:'Ver monitorización mensual',
      ladder39:'$39 una vez',ladder39Name:'AI Value Realization Kit',ladder39Note:'El paso intermedio de autoservicio para equipos que pueden tomar la decisión internamente.',
      auditPairLabel:'DOS RUTAS ESPECIALISTAS DE $499',auditPairTitle:'Elige la auditoría según la fuga.',auditPairNote:'La fuga de gasto y la fuga de workflow son decisiones distintas. Ambas mantienen alcance fijo.',
      spendTitle:'AI & SaaS Spend Waste Audit',spendText:'Para renovaciones, solapamiento, AI add-ons, tamaño de plan o coste de software frente a valor.',workflowTitle:'AI Workflow Opportunity Audit',workflowText:'Para un workflow recurrente con retraso, retrabajo o coordinación material que necesita oportunidades priorizadas.',openSpend:'Abrir Spend Audit — $499',openWorkflow:'Abrir Workflow Audit — $499'
    }
  };

  const NAV={
    en:{
      eyebrow:'REVENUE CYCLE NAVIGATION',title:'Start anywhere. Never lose the next step.',note:'Every public route below either creates evidence, accepts payment, or moves a buyer toward recurring value. Swipe or use the arrows.',prev:'Previous',next:'Next',flow:['FREE EVIDENCE','SELF-SERVICE','SPECIALIST','RECURRING','REVIEW AGAIN'],
      layers:[
        {key:'evidence',step:'01',badge:'FREE',title:'Free Evidence',text:'Measure the problem before paying. Choose workflow, spend, or agent evidence.',icon:'scan',links:[['Live Lab','/live-lab.html'],['Workflow Diagnostic','/b2b/'],['SaaS Waste','/ai-saas-waste-calculator.html'],['Agent Economics','/ai-agent-economics-calculator.html'],['Agent Control','/agent-control-auditor.html']]},
        {key:'product',step:'02',badge:'$29–299',title:'Self-service',text:'Buy only when the evidence is clear enough to act without specialist analysis.',icon:'box',links:[['Value Kit · $39','/ai-value-realization-kit.html'],['Cross-Agent Kit · $69–299','/cross-agent-operating-kit.html'],['Agent Control Pro · $29','/agent-control-auditor.html']]},
        {key:'audit',step:'03',badge:'$499',title:'Specialist Decision',text:'Escalate one material workflow or spend problem into a fixed-scope written decision.',icon:'audit',links:[['Workflow Audit','/workflow-audit.html'],['Spend Waste Audit','/ai-saas-spend-waste-audit.html'],['View Sample','/sample-workflow-audit.html']]},
        {key:'recurring',step:'04',badge:'$199–499/mo',title:'Recurring Control',text:'Keep savings and software decisions from drifting back after the first audit.',icon:'loop',links:[['Spend Monitoring','/ai-saas-spend-monitoring.html'],['Review free evidence again','/live-lab.html']]}
      ]
    },
    ja:{
      eyebrow:'REVENUE CYCLE NAVIGATION',title:'どこから入っても、次の行き先で迷わない。',note:'下の公開ルートは「Evidenceを作る・決済につなぐ・継続価値へ進める」のどれかだけ。横スワイプ / 矢印で分類移動できます。',prev:'前へ',next:'次へ',flow:['無料EVIDENCE','SELF-SERVICE','専門監査','継続収益','再評価'],
      layers:[
        {key:'evidence',step:'01',badge:'FREE',title:'無料Evidence',text:'払う前に問題を測る。Workflow・Spend・Agentの3系統だけ。',icon:'scan',links:[['Live Lab','/live-lab.html'],['Workflow診断','/b2b/'],['SaaS Waste','/ai-saas-waste-calculator.html'],['Agent Economics','/ai-agent-economics-calculator.html'],['Agent Control','/agent-control-auditor.html']]},
        {key:'product',step:'02',badge:'$29–299',title:'Self-service',text:'Evidenceが十分なら、専門監査なしで自分で進められる商品へ。',icon:'box',links:[['Value Kit · $39','/ai-value-realization-kit.html'],['Cross-Agent Kit · $69–299','/cross-agent-operating-kit.html'],['Agent Control Pro · $29','/agent-control-auditor.html']]},
        {key:'audit',step:'03',badge:'$499',title:'専門Decision',text:'重要なWorkflowまたはSpend問題を、固定範囲の書面判断へ。',icon:'audit',links:[['Workflow Audit','/workflow-audit.html'],['Spend Waste Audit','/ai-saas-spend-waste-audit.html'],['Sampleを見る','/sample-workflow-audit.html']]},
        {key:'recurring',step:'04',badge:'$199–499/月',title:'継続Control',text:'監査後の削減・更新判断が再び崩れないように継続管理。',icon:'loop',links:[['Spend Monitoring','/ai-saas-spend-monitoring.html'],['無料Evidenceへ戻る','/live-lab.html']]}
      ]
    },
    es:{
      eyebrow:'REVENUE CYCLE NAVIGATION',title:'Entra por cualquier punto. No pierdas el siguiente paso.',note:'Cada ruta pública crea evidencia, acepta pago o mueve al comprador hacia valor recurrente. Desliza o usa las flechas.',prev:'Anterior',next:'Siguiente',flow:['EVIDENCIA GRATIS','AUTOSERVICIO','ESPECIALISTA','RECURRENTE','REVISAR'],
      layers:[
        {key:'evidence',step:'01',badge:'GRATIS',title:'Evidencia gratis',text:'Mide el problema antes de pagar: workflow, gasto o agentes.',icon:'scan',links:[['Live Lab','/live-lab.html'],['Workflow Diagnostic','/b2b/'],['SaaS Waste','/ai-saas-waste-calculator.html'],['Agent Economics','/ai-agent-economics-calculator.html'],['Agent Control','/agent-control-auditor.html']]},
        {key:'product',step:'02',badge:'$29–299',title:'Autoservicio',text:'Compra solo cuando la evidencia permita actuar sin análisis especialista.',icon:'box',links:[['Value Kit · $39','/ai-value-realization-kit.html'],['Cross-Agent Kit · $69–299','/cross-agent-operating-kit.html'],['Agent Control Pro · $29','/agent-control-auditor.html']]},
        {key:'audit',step:'03',badge:'$499',title:'Decisión especialista',text:'Convierte un problema material de workflow o gasto en una decisión escrita de alcance fijo.',icon:'audit',links:[['Workflow Audit','/workflow-audit.html'],['Spend Waste Audit','/ai-saas-spend-waste-audit.html'],['Ver muestra','/sample-workflow-audit.html']]},
        {key:'recurring',step:'04',badge:'$199–499/mes',title:'Control recurrente',text:'Evita que las decisiones y el gasto vuelvan a desviarse después de la auditoría.',icon:'loop',links:[['Spend Monitoring','/ai-saas-spend-monitoring.html'],['Volver a evidencia gratis','/live-lab.html']]}
      ]
    }
  };

  const icon=(name)=>({
    scan:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/><circle cx="12" cy="12" r="3"/><path d="M8 12h1M15 12h1"/></svg>',
    box:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>',
    audit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>',
    loop:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7h-9a5 5 0 0 0-5 5v1"/><path d="m17 4 3 3-3 3M4 17h9a5 5 0 0 0 5-5v-1"/><path d="m7 20-3-3 3-3"/></svg>'
  }[name]||'');

  const ensureStyle=()=>{
    if(document.getElementById('sp-revenue-cycle-style'))return;
    const s=document.createElement('style');
    s.id='sp-revenue-cycle-style';
    s.textContent=`
      .sp-cycle{margin:22px 0 10px;padding:28px 0 12px;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}
      .sp-cycle-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:16px}
      .sp-cycle-head small{display:block;font-size:10px;font-weight:850;letter-spacing:.13em;color:#8fa79e;margin-bottom:7px}.sp-cycle-head h2{font-size:clamp(24px,3vw,38px);line-height:1.05;letter-spacing:-.04em;margin:0;max-width:720px}.sp-cycle-head p{max-width:450px;margin:0;color:#8ea098;font-size:12px}
      .sp-cycle-controls{display:flex;gap:7px;flex:none}.sp-cycle-control{width:42px;height:42px;border:1px solid rgba(255,255,255,.13);border-radius:13px;background:rgba(255,255,255,.045);color:#eaf5f0;display:grid;place-items:center;cursor:pointer;font-size:17px}.sp-cycle-control:hover{background:rgba(255,255,255,.08)}
      .sp-cycle-flow{display:flex;align-items:center;gap:7px;overflow-x:auto;scrollbar-width:none;padding:0 0 14px}.sp-cycle-flow::-webkit-scrollbar{display:none}.sp-cycle-flow span{flex:none;border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:6px 9px;font-size:9px;font-weight:850;letter-spacing:.05em;color:#a9bbb4;background:rgba(255,255,255,.035)}.sp-cycle-flow i{width:18px;height:1px;background:rgba(141,241,194,.32);flex:none;position:relative}.sp-cycle-flow i:after{content:'›';position:absolute;right:-2px;top:-10px;color:#77d9aa;font-style:normal;font-size:13px}
      .sp-cycle-track{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(310px,38%);gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-left:1px;padding:2px 2px 16px;scrollbar-width:thin;scrollbar-color:rgba(141,241,194,.28) transparent}.sp-cycle-card{scroll-snap-align:start;min-height:315px;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025));padding:20px;display:flex;flex-direction:column;box-shadow:0 18px 55px rgba(0,0,0,.08)}
      .sp-cycle-card.is-paid{border-color:rgba(141,241,194,.2)}.sp-cycle-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sp-cycle-icon{width:44px;height:44px;border:1px solid rgba(141,241,194,.22);border-radius:14px;display:grid;place-items:center;background:rgba(141,241,194,.055)}.sp-cycle-icon svg{width:22px;height:22px;stroke:#a7e5c6;fill:none;stroke-width:1.7}.sp-cycle-badge{font-size:9px;font-weight:900;letter-spacing:.08em;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 9px;color:#c9d6d1;background:rgba(255,255,255,.035)}
      .sp-cycle-card h3{font-size:24px;letter-spacing:-.035em;margin:18px 0 7px}.sp-cycle-card>p{font-size:12px;color:#8fa19a;margin:0 0 17px;min-height:58px}.sp-cycle-links{display:grid;gap:7px;margin-top:auto}.sp-cycle-link{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:42px;border-top:1px solid rgba(255,255,255,.075);text-decoration:none;color:#eaf3ef;font-size:11px;font-weight:760;padding:9px 2px}.sp-cycle-link:first-child{border-top:0}.sp-cycle-link b{color:#82d8ad;font-size:14px}.sp-cycle-link:hover span{color:#9ce4be}
      @media(max-width:850px){.sp-cycle-head{align-items:flex-start}.sp-cycle-head p{display:none}.sp-cycle-track{grid-auto-columns:minmax(290px,78%)}.sp-cycle{margin-top:16px}.sp-cycle-card{min-height:300px}}
      @media(max-width:560px){.sp-cycle-head{display:grid;grid-template-columns:1fr auto}.sp-cycle-head small,.sp-cycle-head h2{grid-column:1}.sp-cycle-controls{grid-column:2;grid-row:1 / span 2;align-self:end}.sp-cycle-track{grid-auto-columns:88%}.sp-cycle-card{padding:17px}.sp-cycle-flow{padding-bottom:11px}}
      @media(prefers-reduced-motion:reduce){.sp-cycle-track{scroll-behavior:auto}}
    `;
    document.head.appendChild(s);
  };

  const cycleHTML=(lang)=>{
    const n=NAV[lang]||NAV.en;
    return `<section class="sp-cycle" id="revenue-cycle" aria-labelledby="sp-cycle-title">
      <div class="sp-cycle-head">
        <div><small>${n.eyebrow}</small><h2 id="sp-cycle-title">${n.title}</h2></div>
        <p>${n.note}</p>
        <div class="sp-cycle-controls"><button class="sp-cycle-control" type="button" data-cycle-prev aria-label="${n.prev}">←</button><button class="sp-cycle-control" type="button" data-cycle-next aria-label="${n.next}">→</button></div>
      </div>
      <div class="sp-cycle-flow" aria-label="Revenue cycle">${n.flow.map((x,i)=>`${i?'<i></i>':''}<span>${x}</span>`).join('')}</div>
      <div class="sp-cycle-track" data-cycle-track tabindex="0">
        ${n.layers.map((layer,i)=>`<article class="sp-cycle-card${i?' is-paid':''}" data-cycle-layer="${layer.key}">
          <div class="sp-cycle-card-top"><span class="sp-cycle-icon">${icon(layer.icon)}</span><span class="sp-cycle-badge">${layer.step} · ${layer.badge}</span></div>
          <h3>${layer.title}</h3><p>${layer.text}</p>
          <div class="sp-cycle-links">${layer.links.map(([label,href])=>`<a class="sp-cycle-link" href="${href}" data-cycle-destination="${layer.key}" data-analytics-id="home_cycle_${layer.key}_${href.replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'')}"><span>${label}</span><b>→</b></a>`).join('')}</div>
        </article>`).join('')}
      </div>
    </section>`;
  };

  const bindCycle=()=>{
    const root=document.getElementById('revenue-cycle');if(!root)return;
    const track=root.querySelector('[data-cycle-track]');if(!track)return;
    const step=()=>Math.min(Math.max(track.clientWidth*.78,300),460);
    root.querySelector('[data-cycle-prev]')?.addEventListener('click',()=>track.scrollBy({left:-step(),behavior:'smooth'}));
    root.querySelector('[data-cycle-next]')?.addEventListener('click',()=>track.scrollBy({left:step(),behavior:'smooth'}));
    root.querySelectorAll('[data-cycle-destination]').forEach(a=>a.addEventListener('click',()=>window.scosCapture?.('home_revenue_cycle_click',{layer:a.dataset.cycleDestination,destination:a.getAttribute('href')})));
  };

  const renderCycle=()=>{
    if(!document.body.matches('[data-page="stratum_revenue_home_v2"]'))return;
    ensureStyle();
    const lang=['en','ja','es'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
    const existing=document.getElementById('revenue-cycle');
    if(existing){const left=existing.querySelector('[data-cycle-track]')?.scrollLeft||0;existing.outerHTML=cycleHTML(lang);const next=document.getElementById('revenue-cycle');if(next?.querySelector('[data-cycle-track]'))next.querySelector('[data-cycle-track]').scrollLeft=left;bindCycle();return;}
    const anchor=document.querySelector('.rh-proofbar')||document.querySelector('.rh-hero');
    if(anchor){anchor.insertAdjacentHTML('afterend',cycleHTML(lang));bindCycle();}
  };

  const render=()=>{
    const l=['en','ja','es'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
    const t=C[l]||C.en;
    document.querySelectorAll('[data-rg]').forEach(el=>{const v=t[el.dataset.rg];if(v!=null)el.textContent=v});
    renderCycle();
  };
  const boot=()=>{
    render();
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(render,0)));
    new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'))render()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
