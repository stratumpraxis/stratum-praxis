/* Stratum Praxis — recurring value path translations */
(() => {
  'use strict';
  const DECISION_KIT_CHECKOUT='https://buy.stripe.com/cNi00kgfq7j5ewUfkf6Zy06';
  const C={
    en:{
      loopLabel:'POST-AUDIT VALUE LOOP',loopTitle:'Turn a one-time audit into verified value and recurring control.',loopNote:'The spend route can continue after the first decision: recover verified savings when execution support is justified, then keep the stack from drifting back.',
      auditBadge:'ONE-TIME',auditName:'AI & SaaS Spend Audit',auditPrice:'$499',auditDesc:'Connect software cost to workflow value and rank KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCEL decisions.',auditMeta1:'3-business-day target',auditMeta2:'Stripe checkout',auditCta:'Review the $499 spend audit',
      recoveryBadge:'PERFORMANCE',recoveryName:'Verified Savings Recovery',recoveryPrice:'15%',recoveryDesc:'Optional post-audit execution support. Fee applies only to mutually verified first-year savings under a written baseline.',recoveryMeta1:'Post-audit only',recoveryMeta2:'Verified savings only',recoveryCta:'See recovery terms',
      monitorBadge:'RECURRING',monitorName:'Spend Monitoring',monitorPrice:'$199–$499/mo',monitorDesc:'Recurring review for renewals, duplicate capability, plan-size drift, AI add-ons and prioritized cost actions.',monitorMeta1:'Core $199/mo',monitorMeta2:'Pro $499/mo',monitorCta:'See monthly monitoring',
      ladder39:'$39 one-time',ladder39Name:'AI & SaaS Spend Decision Kit',ladder39Note:'The direct self-service middle step for teams that can own the decision internally.',ladder39Buy:'Buy the $39 Decision Kit',
      auditPairLabel:'TWO $499 SPECIALIST ROUTES',auditPairTitle:'Choose the audit that matches the leak.',auditPairNote:'Spend leakage and workflow leakage are different decisions. Both remain fixed-scope so buyers do not have to enter open-ended consulting.',
      spendTitle:'AI & SaaS Spend Waste Audit',spendText:'Best when the decision is about renewals, tool overlap, AI add-on creep, plan size or software cost versus workflow value.',workflowTitle:'AI Workflow Opportunity Audit',workflowText:'Best when one recurring workflow has material delay, rework or coordination burden and needs ranked automation opportunities.',openSpend:'Open Spend Audit — $499',openWorkflow:'Open Workflow Audit — $499'
    },
    ja:{
      loopLabel:'POST-AUDIT VALUE LOOP',loopTitle:'単発監査を、実証価値と継続収益につなげる。',loopNote:'Spend Routeは最初の判断で終わりません。必要なら実証済み削減のRecoveryへ進み、その後はStackの再肥大化をMonthly Monitoringで抑えます。',
      auditBadge:'ONE-TIME',auditName:'AI & SaaS Spend Audit',auditPrice:'$499',auditDesc:'Software CostをWorkflow Valueへ接続し、KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCELを順位化。',auditMeta1:'3営業日目安',auditMeta2:'Stripe決済',auditCta:'$499 Spend Auditを見る',
      recoveryBadge:'PERFORMANCE',recoveryName:'Verified Savings Recovery',recoveryPrice:'15%',recoveryDesc:'監査後の任意Execution Support。書面Baselineに基づき、相互確認できた初年度削減額だけがFee対象です。',recoveryMeta1:'監査後のみ',recoveryMeta2:'実証済み削減のみ',recoveryCta:'Recovery条件を見る',
      monitorBadge:'RECURRING',monitorName:'Spend Monitoring',monitorPrice:'$199–$499/月',monitorDesc:'Renewal・機能重複・Plan肥大・AI Add-on・コストActionを毎月レビューする継続Control。',monitorMeta1:'Core $199/月',monitorMeta2:'Pro $499/月',monitorCta:'Monthly Monitoringを見る',
      ladder39:'$39 買い切り',ladder39Name:'AI & SaaS Spend Decision Kit',ladder39Note:'社内で判断できるTeam向けの、直接購入できるSelf-service中間層。',ladder39Buy:'$39 Decision Kitを購入',
      auditPairLabel:'2つの $499 SPECIALIST ROUTE',auditPairTitle:'漏れの種類で監査を選ぶ。',auditPairNote:'Software Spendの漏れとWorkflowの漏れは別の判断です。どちらも固定範囲なので、オープンエンドのConsultingへ入る必要はありません。',
      spendTitle:'AI & SaaS Spend Waste Audit',spendText:'更新・Tool重複・AI Add-on・Plan肥大・Software CostとWorkflow Valueの判断に向く監査。',workflowTitle:'AI Workflow Opportunity Audit',workflowText:'1つの定常Workflowに大きな遅延・再作業・調整負荷があり、自動化機会を順位化したい場合の監査。',openSpend:'Spend Auditを開く — $499',openWorkflow:'Workflow Auditを開く — $499'
    },
    es:{
      loopLabel:'POST-AUDIT VALUE LOOP',loopTitle:'Convierte una auditoría única en valor verificado y control recurrente.',loopNote:'La ruta de gasto puede continuar: recuperación de ahorro verificado cuando tenga sentido y monitorización para evitar que el stack vuelva a crecer sin control.',
      auditBadge:'UNA VEZ',auditName:'AI & SaaS Spend Audit',auditPrice:'$499',auditDesc:'Conecta coste de software con valor del workflow y prioriza KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCEL.',auditMeta1:'Objetivo 3 días',auditMeta2:'Pago Stripe',auditCta:'Ver Spend Audit $499',
      recoveryBadge:'RENDIMIENTO',recoveryName:'Verified Savings Recovery',recoveryPrice:'15%',recoveryDesc:'Soporte opcional tras la auditoría. La tarifa se aplica solo al ahorro de primer año verificado bajo una línea base escrita.',recoveryMeta1:'Solo post-audit',recoveryMeta2:'Solo ahorro verificado',recoveryCta:'Ver condiciones',
      monitorBadge:'RECURRENTE',monitorName:'Spend Monitoring',monitorPrice:'$199–$499/mes',monitorDesc:'Revisión recurrente de renovaciones, duplicados, planes sobredimensionados, add-ons AI y acciones de coste.',monitorMeta1:'Core $199/mes',monitorMeta2:'Pro $499/mes',monitorCta:'Ver monitorización mensual',
      ladder39:'$39 una vez',ladder39Name:'AI & SaaS Spend Decision Kit',ladder39Note:'El paso intermedio de autoservicio para equipos que pueden tomar la decisión internamente.',ladder39Buy:'Comprar Decision Kit — $39',
      auditPairLabel:'DOS RUTAS ESPECIALISTAS DE $499',auditPairTitle:'Elige la auditoría según la fuga.',auditPairNote:'La fuga de gasto y la fuga de workflow son decisiones distintas. Ambas mantienen alcance fijo.',
      spendTitle:'AI & SaaS Spend Waste Audit',spendText:'Para renovaciones, solapamiento, AI add-ons, tamaño de plan o coste de software frente a valor.',workflowTitle:'AI Workflow Opportunity Audit',workflowText:'Para un workflow recurrente con retraso, retrabajo o coordinación material que necesita oportunidades priorizadas.',openSpend:'Abrir Spend Audit — $499',openWorkflow:'Abrir Workflow Audit — $499'
    }
  };
  const render=()=>{
    const l=['en','ja','es'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
    const t=C[l]||C.en;
    document.querySelectorAll('[data-rg]').forEach(el=>{const v=t[el.dataset.rg];if(v!=null)el.textContent=v});
    const kitLink=document.querySelector('.rh-ladder a[data-analytics-id="home_ladder_value_kit"],.rh-ladder a[data-analytics-id="home_ladder_spend_decision_kit_checkout"]');
    if(kitLink){
      kitLink.setAttribute('href',DECISION_KIT_CHECKOUT);
      kitLink.dataset.analyticsId='home_ladder_spend_decision_kit_checkout';
      kitLink.dataset.product='ai_saas_spend_decision_kit';
      kitLink.setAttribute('data-primary-cta','true');
      const label=kitLink.querySelector('[data-rg="ladder39Name"]');
      if(label)label.textContent=t.ladder39Buy;
    }
  };
  const boot=()=>{
    render();
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(render,0)));
    new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'))render()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();

/* High-intent B2B path: keep discovery routes, but let ready buyers reach checkout in one click. */
(() => {
  'use strict';
  const WORKFLOW_AUDIT_CHECKOUT='https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02';
  const LABELS={
    en:{hero:'Start the $499 workflow audit',band:'Start the audit — $499 →',mobile:'Start $499 audit'},
    ja:{hero:'$499 Workflow Auditを開始',band:'Auditを開始 — $499 →',mobile:'$499 Auditを開始'},
    es:{hero:'Iniciar auditoría de workflow — $499',band:'Iniciar auditoría — $499 →',mobile:'Iniciar auditoría — $499'}
  };
  const apply=()=>{
    const lang=['en','ja','es'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
    const text=LABELS[lang]||LABELS.en;
    const hero=document.querySelector('a[data-analytics-id="home_hero_audit"],a[data-analytics-id="home_hero_audit_checkout"]');
    if(hero){
      hero.href=WORKFLOW_AUDIT_CHECKOUT;
      hero.dataset.analyticsId='home_hero_audit_checkout';
      hero.dataset.product='workflow_audit';
      hero.setAttribute('data-primary-cta','true');
      const label=hero.querySelector('[data-rh="ctaAudit"]');
      if(label)label.textContent=text.hero;
    }
    const band=document.querySelector('a[data-analytics-id="home_audit_band"],a[data-analytics-id="home_audit_band_checkout"]');
    if(band){
      band.href=WORKFLOW_AUDIT_CHECKOUT;
      band.dataset.analyticsId='home_audit_band_checkout';
      band.dataset.product='workflow_audit';
      band.setAttribute('data-primary-cta','true');
      const label=band.querySelector('[data-rh="auditCta"]');
      if(label)label.textContent=text.band;
    }
    const mobile=document.querySelector('.mobile-start');
    if(mobile){
      mobile.href=WORKFLOW_AUDIT_CHECKOUT;
      mobile.dataset.analyticsId='home_mobile_audit_checkout';
      mobile.dataset.product='workflow_audit';
      mobile.setAttribute('data-primary-cta','true');
      const label=mobile.querySelector('span');
      if(label)label.textContent=text.mobile;
    }
  };
  const boot=()=>{
    apply();
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(apply,0)));
    new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'))apply()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();