(()=>{'use strict';
const SUP=['en','ja','es'],KEY='sp-office-lang';
const COPY={
en:{
  brand:'Revenue Routes',heroK:'BUY BY DECISION, NOT BY CATALOG',heroT:'Pick the problem. See the route.',heroP:'Three routes only: AI spend, workflow automation, and agent operations. Start free; pay only when the decision needs more depth.',
  tabs:['Spend','Workflow','Agents'],stat1:'ROUTES',stat2:'ENTRY',stat3:'SPECIALIST',
  routes:[
    {k:'01 · SPEND & ROI',title:'Control AI spend before renewal.',desc:'Find overlap, low-use tools and weak utilization before renewing or expanding software spend.',facts:[['ENTRY','FREE'],['SELF-SERVE','$39'],['SPECIALIST','$499']],start:'Run Waste Calculator',
      steps:[['FREE SIGNAL','Waste Calculator','FREE','/ai-saas-waste-calculator.html'],['SELF-SERVICE','Spend Decision Kit','$39','https://buy.stripe.com/cNi00kgfq7j5ewUfkf6Zy06'],['SPECIALIST','AI / SaaS Spend Audit','$499','https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02']],
      arts:[['SPEND MAP','Contracts, purpose and renewal in one view.'],['DECISION MATRIX','Keep / downgrade / merge / stop.'],['30-DAY PATH','What to inspect first.']],out:'Spend decision artifact',secondary:['View spend audit','/ai-saas-spend-waste-audit.html']},
    {k:'02 · WORKFLOW',title:'Decide what to automate before building.',desc:'Separate a real automation opportunity from process noise, then escalate only if the workflow is material.',facts:[['ENTRY','FREE'],['SELF-SERVE','DIAGNOSE'],['SPECIALIST','$499']],start:'Open Workflow Diagnostic',
      steps:[['FREE SIGNAL','Workflow Diagnostic','FREE','/b2b/'],['PREVIEW','Audit Sample','SAMPLE','/sample-workflow-audit.html'],['SPECIALIST','Workflow Opportunity Audit','$499','https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02']],
      arts:[['WORKFLOW MAP','Trigger, owners, systems and handoffs.'],['RANKED OPTIONS','Impact, effort, reversibility and risk.'],['HUMAN GATES','Where automation should stop.']],out:'Workflow decision artifact',secondary:['View workflow audit','/workflow-audit.html']},
    {k:'03 · AGENT OPS',title:'Know economics and authority before scale.',desc:'Make unit economics, permission boundaries and handoff rules visible before increasing autonomy.',facts:[['ENTRY','FREE'],['KIT','$69+'],['OUTCOME','CONTROL']],start:'Run Agent Economics',
      steps:[['FREE SIGNAL','Agent Economics Calculator','FREE','/ai-agent-economics-calculator.html'],['CONTROL','Agent Control Auditor','FREE / PRO','/agent-control-auditor.html'],['OPERATING KIT','Cross-Agent Operating Kit','$69–299','/cross-agent-operating-kit.html']],
      arts:[['ECONOMICS','Cost per successful outcome.'],['AUTHORITY MAP','Permissions and human checkpoints.'],['HANDOFF RULES','Portable policy and state.']],out:'Agent operating artifact',secondary:['View operating kit','/cross-agent-operating-kit.html']}
  ],
  outputs:'WHAT YOU GET',open:'Open route',compare:'Open product page',method:'EVIDENCE FIRST',m1:'No forced bundle',m2:'No invented ROI',m3:'Fixed-scope escalation',swipe:'Swipe left / right to change route'
},
ja:{
  brand:'収益ルート',heroK:'商品ではなく、判断から選ぶ',heroT:'課題を選ぶ。最短ルートを見る。',heroP:'AI支出・Workflow・Agent運用の3ルートだけ。最初は無料、深さが必要な時だけ有料へ。',
  tabs:['支出','Workflow','Agent'],stat1:'ルート',stat2:'入口',stat3:'専門監査',
  routes:[
    {k:'01 · AI / SAAS支出',title:'更新前に、AI支出を制御する。',desc:'重複・低利用・弱い活用を見つけ、更新や追加投資の前に判断できる状態へ。',facts:[['入口','無料'],['SELF-SERVE','$39'],['専門監査','$499']],start:'Waste Calculatorを使う',
      steps:[['無料SIGNAL','Waste Calculator','無料','/ai-saas-waste-calculator.html'],['自分で判断','Spend Decision Kit','$39','https://buy.stripe.com/cNi00kgfq7j5ewUfkf6Zy06'],['専門監査','AI / SaaS Spend Audit','$499','https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02']],
      arts:[['SPEND MAP','契約・用途・更新を1画面へ。'],['DECISION MATRIX','残す / 下げる / 統合 / 止める。'],['30-DAY PATH','最初に確認する順番。']],out:'支出Decision Artifact',secondary:['支出監査を見る','/ai-saas-spend-waste-audit.html']},
    {k:'02 · WORKFLOW',title:'作る前に、自動化すべきか決める。',desc:'Process noiseと本当に自動化価値のあるWorkflowを分け、重要な場合だけ監査へ。',facts:[['入口','無料'],['SELF-SERVE','診断'],['専門監査','$499']],start:'Workflow診断を開く',
      steps:[['無料SIGNAL','Workflow診断','無料','/b2b/'],['実物確認','Audit Sample','SAMPLE','/sample-workflow-audit.html'],['専門監査','Workflow Opportunity Audit','$499','https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02']],
      arts:[['WORKFLOW MAP','Trigger・担当・System・Handoff。'],['RANKED OPTIONS','Impact・Effort・Riskで順位化。'],['HUMAN GATES','人を残す場所を明示。']],out:'Workflow Decision Artifact',secondary:['Workflow監査を見る','/workflow-audit.html']},
    {k:'03 · AGENT運用',title:'拡大前に、採算と権限を見える化する。',desc:'成功1件コスト・権限境界・引き継ぎルールを見てから自律性を上げる。',facts:[['入口','無料'],['KIT','$69+'],['結果','CONTROL']],start:'Agent採算を測る',
      steps:[['無料SIGNAL','Agent Economics Calculator','無料','/ai-agent-economics-calculator.html'],['CONTROL','Agent Control Auditor','FREE / PRO','/agent-control-auditor.html'],['運用KIT','Cross-Agent Operating Kit','$69–299','/cross-agent-operating-kit.html']],
      arts:[['ECONOMICS','成功1件あたりコスト。'],['AUTHORITY MAP','権限とHuman Checkpoint。'],['HANDOFF RULES','PolicyとStateの引き継ぎ。']],out:'Agent Operating Artifact',secondary:['Operating Kitを見る','/cross-agent-operating-kit.html']}
  ],
  outputs:'届くもの',open:'このルートを開く',compare:'商品ページを見る',method:'EVIDENCE FIRST',m1:'不要なBundleなし',m2:'架空ROIなし',m3:'支援範囲を固定',swipe:'左右スワイプでも切替できます'
},
es:{
  brand:'Rutas de ingresos',heroK:'COMPRA POR DECISIÓN, NO POR CATÁLOGO',heroT:'Elige el problema. Mira la ruta.',heroP:'Solo tres rutas: gasto AI, workflow y operaciones de agentes. Empieza gratis y paga solo si hace falta profundidad.',
  tabs:['Gasto','Workflow','Agentes'],stat1:'RUTAS',stat2:'ENTRADA',stat3:'ESPECIALISTA',
  routes:[
    {k:'01 · GASTO & ROI',title:'Controla el gasto AI antes de renovar.',desc:'Encuentra solapamiento y bajo uso antes de renovar o ampliar.',facts:[['ENTRADA','GRATIS'],['AUTOSERVICIO','$39'],['AUDITORÍA','$499']],start:'Abrir Waste Calculator',
      steps:[['SEÑAL GRATIS','Waste Calculator','GRATIS','/ai-saas-waste-calculator.html'],['AUTOSERVICIO','Spend Decision Kit','$39','https://buy.stripe.com/cNi00kgfq7j5ewUfkf6Zy06'],['AUDITORÍA','AI / SaaS Spend Audit','$499','https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02']],
      arts:[['SPEND MAP','Contratos y renovaciones en una vista.'],['DECISION MATRIX','Keep / downgrade / merge / stop.'],['30-DAY PATH','Qué revisar primero.']],out:'Artefacto de gasto',secondary:['Ver auditoría','/ai-saas-spend-waste-audit.html']},
    {k:'02 · WORKFLOW',title:'Decide qué automatizar antes de construir.',desc:'Separa oportunidad real de automatización del ruido de proceso.',facts:[['ENTRADA','GRATIS'],['DIAGNÓSTICO','SELF-SERVE'],['AUDITORÍA','$499']],start:'Abrir diagnóstico',
      steps:[['SEÑAL GRATIS','Workflow Diagnostic','GRATIS','/b2b/'],['MUESTRA','Audit Sample','SAMPLE','/sample-workflow-audit.html'],['AUDITORÍA','Workflow Opportunity Audit','$499','https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02']],
      arts:[['WORKFLOW MAP','Trigger, responsables, sistemas y handoffs.'],['RANKED OPTIONS','Impacto, esfuerzo y riesgo.'],['HUMAN GATES','Dónde debe parar la automatización.']],out:'Artefacto de workflow',secondary:['Ver auditoría','/workflow-audit.html']},
    {k:'03 · AGENT OPS',title:'Conoce economía y autoridad antes de escalar.',desc:'Haz visibles coste por resultado, permisos y handoff antes de aumentar autonomía.',facts:[['ENTRADA','GRATIS'],['KIT','$69+'],['RESULTADO','CONTROL']],start:'Abrir economía de agentes',
      steps:[['SEÑAL GRATIS','Agent Economics Calculator','GRATIS','/ai-agent-economics-calculator.html'],['CONTROL','Agent Control Auditor','FREE / PRO','/agent-control-auditor.html'],['OPERATING KIT','Cross-Agent Operating Kit','$69–299','/cross-agent-operating-kit.html']],
      arts:[['ECONOMICS','Coste por resultado exitoso.'],['AUTHORITY MAP','Permisos y checkpoints humanos.'],['HANDOFF RULES','Política y estado portables.']],out:'Artefacto de agente',secondary:['Ver operating kit','/cross-agent-operating-kit.html']}
  ],
  outputs:'QUÉ RECIBES',open:'Abrir ruta',compare:'Abrir producto',method:'EVIDENCE FIRST',m1:'Sin bundle forzado',m2:'Sin ROI inventado',m3:'Alcance fijo',swipe:'Desliza para cambiar de ruta'
}
};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let lang=(()=>{try{const q=new URLSearchParams(location.search).get('lang'),s=localStorage.getItem(KEY),b=(navigator.language||'en').slice(0,2).toLowerCase();return SUP.includes(q)?q:SUP.includes(s)?s:SUP.includes(b)?b:'en'}catch{return'en'}})(),idx=0,touchX=null;
function T(){return COPY[lang]||COPY.en}
function route(){return T().routes[idx]}
function render(){
 document.documentElement.lang=lang;try{localStorage.setItem(KEY,lang)}catch{}
 $$('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
 $('#brand-sub').textContent=T().brand;$('#hero-k').textContent=T().heroK;$('#hero-t').textContent=T().heroT;$('#hero-p').textContent=T().heroP;
 $('#stat1').textContent=T().stat1;$('#stat2').textContent=T().stat2;$('#stat3').textContent=T().stat3;
 $$('.tabs button').forEach((b,i)=>{b.textContent=T().tabs[i];b.setAttribute('aria-selected',String(i===idx))});
 const r=route();$('#route-k').textContent=r.k;$('#route-title').textContent=r.title;$('#route-desc').textContent=r.desc;
 const facts=$$('.fact');facts.forEach((f,i)=>{f.querySelector('small').textContent=r.facts[i][0];f.querySelector('b').textContent=r.facts[i][1]});
 $('#start-copy').textContent=r.start;$('#start-link').href=r.steps[0][3];
 $('#stage-output').textContent=T().outputs;$('#stage-badge').textContent=r.out;
 $('#ladder').innerHTML=r.steps.map((s,i)=>'<a class="step" href="'+s[3]+'"><span class="step-num">0'+(i+1)+'</span><span><small>'+s[0]+'</small><b>'+s[1]+'</b></span><strong class="step-price">'+s[2]+'</strong></a>').join('');
 $('#ladder').querySelectorAll('a.step').forEach((a,i)=>{const sku=idx===0&&i===1?'ai_saas_spend_decision_kit':idx===0&&i===2?'ai_saas_spend_waste_audit':idx===1&&i===2?'workflow_audit':'';if(sku)a.dataset.product=sku;a.dataset.analyticsId='route_'+idx+'_step_'+i;});
 $('#output-grid').innerHTML=r.arts.map((a,i)=>'<div class="artifact"><small>0'+(i+1)+'</small><b>'+a[0]+'</b><p>'+a[1]+'</p></div>').join('');
 $('#primary').href=r.steps[0][3];$('#primary').textContent=T().open+' →';$('#secondary').href=r.secondary[1];$('#secondary').textContent=T().compare+' ↗';
 $('#method').textContent=T().method;$('#m1').textContent=T().m1;$('#m2').textContent=T().m2;$('#m3').textContent=T().m3;$('#swipe').textContent=T().swipe;
 const box=$('.route');box.classList.remove('swap');void box.offsetWidth;box.classList.add('swap');
 try{window.scosCapture?.('router_route_view',{route:idx,lang})}catch{}
}
function setRoute(n){idx=(n+3)%3;render()}
function boot(){
 $$('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;render()}));
 $$('.tabs button').forEach((b,i)=>b.addEventListener('click',()=>setRoute(i)));
 const r=$('.route');r.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});r.addEventListener('touchend',e=>{if(touchX==null)return;const d=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(d)>55)setRoute(idx+(d<0?1:-1))},{passive:true});
 render();
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();