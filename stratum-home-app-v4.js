(()=>{'use strict';
const SUP=['en','ja','es'],KEY='sp-office-lang';
const C={
 en:{
  brandSub:'Decision Intelligence',kicker:'AI SPEND · WORKFLOW · AGENTS',
  titleA:'See where AI leaks.',titleB:'Decide what to fix next.',
  lead:'Measure spend, workflow friction and agent economics before another renewal, automation project or expansion decision.',
  primary:'Start free scan',secondary:'Preview the output',f1:'No signup',f2:'No invented ROI',f3:'Fixed-scope escalation',
  console:'DECISION CONSOLE · DEMO',live:'SAMPLE DATA',tabs:['Spend','Workflow','Agent'],
  state:['Spend control','Workflow fit','Agent economics'],desc:['Renewal and overlap exposure','Automation opportunity','Unit cost and control'],
  metric1:['Monthly exposure','Manual load','Cost / outcome'],metric2:['Review state','Automation fit','Authority state'],next:['Waste Calculator','Workflow Diagnostic','Agent Economics Calculator'],
  tryK:'TRY IT NOW',tryTitle:'Get an evidence signal in under a minute.',tryNote:'Use your own numbers. The result is directional, not a guaranteed saving or ROI.',
  spend:'Monthly AI / SaaS spend',idle:'Low-use or duplicate tools',hours:'Manual hours left / month',calc:'Calculate signal',
  resultLabel:'YOUR SIGNAL',resultLow:'Monitor first',resultMid:'Review now',resultHigh:'Audit priority',resultText:['No paid step is necessary yet. Keep the review cadence.','There is enough friction to inspect the top contracts or workflow.','The signal is strong enough to justify a structured review.'],
  openFree:'Open free tool',previewK:'OUTPUT PREVIEW',previewTitle:'See the artifact before you pay.',previewNote:'A paid layer should buy a concrete decision artifact, not more browsing.',
  previewTabs:['Summary','Decision map','30-day actions'],
  pathK:'ONLY THREE STEPS',pathTitle:'Free → $39 → $499.',pathNote:'Start free. Buy self-service depth when useful. Use specialist review only when the decision is material.',
  tier1:'Free evidence',tier1p:'Calculators and diagnostics that can legitimately end with no purchase.',tier2:'Decision Kit',tier2p:'A reusable system for teams that can make the decision internally.',tier3:'Specialist Audit',tier3p:'A fixed-scope written decision for a material spend or workflow question.',
  cta1:'Open free tools',cta2:'Buy $39 kit',cta3:'Buy $499 audit',
  finalTitle:'Do not buy more AI until the next dollar has a job.',finalText:'Start with evidence. Escalate only when the signal is strong enough.',finalCta:'Run the free scan',
  previewSummary:'Decision summary',previewSummaryP:'One-page management view with the issue, evidence and recommended next step.',
  previewMap:'Decision map',previewMapP:'Keep / Change / Stop logic with visible assumptions and risk notes.',
  previewAction:'Action path',previewActionP:'A bounded sequence for the next 30 days.'
 },
 ja:{
  brandSub:'意思決定インテリジェンス',kicker:'AI支出 · WORKFLOW · AGENT',
  titleA:'AIの漏れを見つける。',titleB:'次に直す場所を決める。',
  lead:'AI・SaaS支出、業務摩擦、Agent採算を測り、更新・自動化・追加投資の前に判断できる状態へ。',
  primary:'無料スキャンを始める',secondary:'成果物を先に見る',f1:'登録不要',f2:'架空ROIなし',f3:'支援範囲を固定',
  console:'DECISION CONSOLE · デモ',live:'サンプル値',tabs:['支出','Workflow','Agent'],
  state:['支出コントロール','Workflow適合','Agent採算'],desc:['更新・重複・低利用','自動化すべきか','成功1件あたりコスト'],
  metric1:['月間支出','手作業負荷','成功1件コスト'],metric2:['見直し状態','自動化適合','権限状態'],next:['Waste Calculator','Workflow診断','Agent採算Calculator'],
  tryK:'今ここで試す',tryTitle:'1分以内でEvidence Signalを出す。',tryNote:'自分の数字だけを使います。削減額やROIを保証する診断ではありません。',
  spend:'月間AI / SaaS支出',idle:'低利用・重複ツール数',hours:'残っている手作業時間 / 月',calc:'Signalを計算',
  resultLabel:'YOUR SIGNAL',resultLow:'まず監視',resultMid:'見直し推奨',resultHigh:'監査優先',resultText:['今すぐ有料へ進む必要はありません。定期見直しを続けてください。','上位契約またはWorkflowを確認する価値があります。','構造化した監査を行う根拠が十分あります。'],
  openFree:'無料ツールを開く',previewK:'成果物プレビュー',previewTitle:'払う前に、届くものを見る。',previewNote:'Paid Layerで買うのは「説明」ではなく、具体的なDecision Artifactです。',
  previewTabs:['要約','判断マップ','30日アクション'],
  pathK:'3段だけ',pathTitle:'無料 → $39 → $499。',pathNote:'最初は無料。自力で判断できるなら$39。重要な判断だけ$499の固定範囲監査へ。',
  tier1:'無料Evidence',tier1p:'Calculatorと診断。購入せず終了しても正解です。',tier2:'Decision Kit',tier2p:'社内で判断できるチーム向けの再利用可能な仕組み。',tier3:'専門監査',tier3p:'重要な支出・Workflowを固定範囲で書面判断。',
  cta1:'無料ツールを開く',cta2:'$39 Kitを購入',cta3:'$499監査を購入',
  finalTitle:'次の1ドルの役割が分かるまで、AIを増やさない。',finalText:'Evidenceから始め、Signalが十分な時だけ深く進みます。',finalCta:'無料スキャンを始める',
  previewSummary:'Decision Summary',previewSummaryP:'課題・Evidence・推奨Next Stepを1ページで確認。',
  previewMap:'Decision Map',previewMapP:'Keep / Change / Stopを、前提とRisk付きで整理。',
  previewAction:'30-Day Path',previewActionP:'次の30日で何を確認・停止・試験するかを限定。'
 },
 es:{
  brandSub:'Inteligencia de decisión',kicker:'GASTO AI · WORKFLOW · AGENTES',
  titleA:'Encuentra dónde se fuga AI.',titleB:'Decide qué arreglar después.',
  lead:'Mide gasto AI y SaaS, fricción de workflow y economía de agentes antes de renovar, automatizar o ampliar.',
  primary:'Iniciar análisis gratis',secondary:'Ver el resultado antes',f1:'Sin registro',f2:'Sin ROI inventado',f3:'Alcance fijo',
  console:'CONSOLA DE DECISIÓN · DEMO',live:'DATOS DE EJEMPLO',tabs:['Gasto','Workflow','Agente'],
  state:['Control de gasto','Fit de workflow','Economía del agente'],desc:['Renovación y solapamiento','Oportunidad de automatización','Coste y control'],
  metric1:['Exposición mensual','Carga manual','Coste / resultado'],metric2:['Estado de revisión','Fit de automatización','Estado de autoridad'],next:['Waste Calculator','Diagnóstico Workflow','Calculadora de agente'],
  tryK:'PRUÉBALO',tryTitle:'Obtén una señal en menos de un minuto.',tryNote:'Usa tus propios números. No es una garantía de ahorro o ROI.',
  spend:'Gasto AI / SaaS mensual',idle:'Herramientas duplicadas o poco usadas',hours:'Horas manuales / mes',calc:'Calcular señal',
  resultLabel:'TU SEÑAL',resultLow:'Primero monitoriza',resultMid:'Revisar ahora',resultHigh:'Prioridad de auditoría',resultText:['No hace falta pagar todavía. Mantén la revisión.','Hay suficiente fricción para revisar contratos o workflow.','La señal justifica una revisión estructurada.'],
  openFree:'Abrir herramienta gratis',previewK:'VISTA DEL RESULTADO',previewTitle:'Mira el artefacto antes de pagar.',previewNote:'La capa pagada compra una decisión concreta, no más navegación.',
  previewTabs:['Resumen','Mapa','30 días'],
  pathK:'SOLO TRES PASOS',pathTitle:'Gratis → $39 → $499.',pathNote:'Empieza gratis. Usa autoservicio si basta. Auditoría solo cuando la decisión es material.',
  tier1:'Evidencia gratis',tier1p:'Calculadoras y diagnósticos que pueden terminar sin compra.',tier2:'Decision Kit',tier2p:'Sistema reutilizable para equipos que deciden internamente.',tier3:'Auditoría especialista',tier3p:'Decisión escrita y de alcance fijo para una cuestión material.',
  cta1:'Abrir herramientas gratis',cta2:'Comprar kit $39',cta3:'Comprar auditoría $499',
  finalTitle:'No compres más AI hasta que el próximo dólar tenga un trabajo.',finalText:'Empieza con evidencia y profundiza solo cuando la señal lo justifique.',finalCta:'Iniciar análisis gratis',
  previewSummary:'Resumen de decisión',previewSummaryP:'Problema, evidencia y siguiente paso en una sola vista.',
  previewMap:'Mapa de decisión',previewMapP:'Keep / Change / Stop con supuestos y riesgos visibles.',
  previewAction:'Ruta 30 días',previewActionP:'Secuencia limitada para revisar, parar o probar.'
 }
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let lang=(()=>{try{const q=new URLSearchParams(location.search).get('lang'),s=localStorage.getItem(KEY),b=(navigator.language||'en').slice(0,2).toLowerCase();return SUP.includes(q)?q:SUP.includes(s)?s:SUP.includes(b)?b:'en'}catch{return'en'}})();
let mode=0;
function t(k){return C[lang]?.[k]??C.en[k]??k}
function setText(){
 document.documentElement.lang=lang;try{localStorage.setItem(KEY,lang)}catch{}
 $$('[data-t]').forEach(el=>{const v=t(el.dataset.t);if(v!=null)el.textContent=v});
 $$('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
 renderConsole();renderResult(true);renderPreview();
}
function renderConsole(){
 const score=[42,68,53][mode],metrics=[[ '$12.4k','REVIEW' ],['31 h','MED-HIGH'],['$7.80','BOUNDED']][mode];
 $('#console-state').textContent=t('state')[mode];$('#console-desc').textContent=t('desc')[mode];
 $('#console-score').textContent=score;$('#console-meter').style.width=score+'%';
 $('#metric-a-label').textContent=t('metric1')[mode];$('#metric-a').textContent=metrics[0];
 $('#metric-b-label').textContent=t('metric2')[mode];$('#metric-b').textContent=metrics[1];
 $('#console-next').textContent=t('next')[mode];
 const href=['/ai-saas-waste-calculator.html','/b2b/','/ai-agent-economics-calculator.html'][mode];$('#console-link').href=href;
 $('.segment button').forEach((b,i)=>{b.textContent=t('tabs')[i];b.setAttribute('aria-selected',String(i===mode))});
 const pt=t('previewTabs')||[]; $('.preview-tabs button').forEach((b,i)=>{if(pt[i])b.textContent=pt[i]});
}
function calc(){
 const spend=Math.max(0,Number($('#spend').value)||0),idle=Math.max(0,Number($('#idle').value)||0),hours=Math.max(0,Number($('#hours').value)||0);
 let score=Math.min(100,Math.round((spend>=300000?28:spend>=100000?20:spend>=30000?10:4)+Math.min(34,idle*8)+Math.min(38,hours*1.2)));
 $('#signal').textContent=score;$('.ring').style.setProperty('--p',score);
 const band=score>=65?2:score>=32?1:0;$('#signal-title').textContent=[t('resultLow'),t('resultMid'),t('resultHigh')][band];$('#signal-text').textContent=t('resultText')[band];
 try{window.scosCapture?.('home_signal_calculated',{score,spend,idle,hours})}catch{}
}
function renderResult(initial=false){if(initial){$('#signal').textContent='—';$('.ring').style.setProperty('--p',0);$('#signal-title').textContent=t('resultLow');$('#signal-text').textContent=t('resultText')[0]}}
function renderPreview(){
 const p=['previewSummary','previewMap','previewAction'][Number($('.preview-tabs button[aria-selected="true"]')?.dataset.pane||0)];
 const pp=p+'P';$('#preview-title').textContent=t(p);$('#preview-copy').textContent=t(pp);
}
function boot(){
 $$('.segment button').forEach((b,i)=>b.addEventListener('click',()=>{mode=i;renderConsole()}));
 $$('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;setText()}));
 $('#calc').addEventListener('click',calc);
 $$('.preview-tabs button').forEach(b=>b.addEventListener('click',()=>{$$('.preview-tabs button').forEach(x=>x.setAttribute('aria-selected','false'));b.setAttribute('aria-selected','true');renderPreview()}));
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -6%'});$$('.reveal').forEach(x=>io.observe(x))}
 else $$('.reveal').forEach(x=>x.classList.add('in'));
 setText();
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();