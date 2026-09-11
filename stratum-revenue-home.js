/* Stratum Praxis — Revenue Home v3
   On-site confidence, decision clarity, motion and mobile interaction.
   No external services are added here. */
(() => {
  'use strict';

  const copy={
    en:{
      eyebrow:'B2B AI SPEND · WORKFLOW · AGENT CONTROL',
      heroA:'Stop buying AI',heroB:'without knowing',heroC:'what pays back.',
      lead:'Measure AI and SaaS spend, workflow friction, and agent economics before another renewal, automation project, or expansion decision.',
      ctaFree:'Run a free evidence scan',ctaAudit:'See how decisions are verified',
      trust1:'No signup to start',trust2:'No invented ROI',trust3:'Transparent assumptions',
      panelLabel:'VALUE LEAK SNAPSHOT',panelLive:'YOUR INPUTS',panelTitle:'Put a number on the decision.',panelNote:'Use your own assumptions. Stratum calculates; it does not fabricate outcomes.',
      section1:'START WITH THE BUSINESS QUESTION',section1Title:'Three places AI investment usually needs a decision.',section1Note:'Choose the signal first. Products and professional support only appear after the problem is visible.',
      reasonLabel:'WHY THIS ROUTE',reasonTitle:'Evidence before escalation.',reasonNote:'Stratum is built to prevent a common failure: buying another AI tool before the economic or operational problem is clear.',
      reason1:'Measure the leak',reason1n:'Cost, delay, rework, overlap or weak utilization.',reason2:'Make the decision legible',reason2n:'Use your inputs and transparent assumptions.',reason3:'Escalate only when justified',reason3n:'Self-service when enough; specialist review when material.',
      ladderLabel:'DECISION PATH',ladderTitle:'One decision path. Only the depth you need.',ladderNote:'Start with evidence. Stop free when the answer is enough; use a paid layer only when the decision needs more depth.',
      step1Badge:'FREE',step1Title:'Measure',step1Text:'Use diagnostics and calculators to expose spend, friction or agent economics before buying.',step1Meta1:'No signup',step1Meta2:'Immediate',step1Cta:'Open free tools',
      step2Badge:'SELF-SERVICE',step2Title:'Implement',step2Text:'When the evidence is clear, choose the smallest current paid route. After purchase, Buyer Workspace routes you into delivery.',step2Meta1:'Existing products',step2Meta2:'No forced bundle',step2Cta:'Find the right paid route',
      step3Badge:'PROFESSIONAL',step3Title:'Get a written decision',step3Text:'For one recurring workflow with material cost, delay or coordination burden. Fixed scope, asynchronous by default.',step3Meta1:'1 workflow',step3Meta2:'3-business-day target',step3Cta:'Review the $499 audit',
      auditLabel:'PROFESSIONAL ESCALATION',auditTitle:'One material workflow. One written decision.',auditText:'Workflow map, leak analysis, ranked opportunities, ROI scenarios, risk checkpoints and a 30-day action plan—without open-ended consulting.',auditFixed:'FIXED PRICE',auditCta:'Review audit →',
      receiveLabel:'WHAT THE AUDIT TURNS INTO',receiveTitle:'Decision artifacts your team can actually use.',receiveNote:'The high-value offer is deliberately concrete: map the workflow, expose leaks, rank choices, define controls, then decide what happens next.',
      d1:'Workflow Map',d1n:'Trigger, owners, systems and handoffs.',d2:'Leak Analysis',d2n:'Rework, delay and value loss.',d3:'Ranked Opportunities',d3n:'Impact, effort, reversibility and risk.',d4:'ROI Scenarios',d4n:'Transparent assumptions, not invented precision.',d5:'Human Checkpoints',d5n:'Where authority and review should remain.',d6:'30-Day Action Plan',d6n:'Test, validate, scale, redesign or stop.',
      finalLabel:'TURN SIGNALS INTO A DECISION',finalTitle:'Do not buy more AI until you know what the next dollar is supposed to do.',finalText:'Start free if the problem is still fuzzy. Choose the smallest implementation route when the evidence is enough. Escalate only when the workflow is material.',finalCta:'Start with free evidence',
      integrityTitle:'Input integrity',integrityEmpty:'Add your own numbers. Nothing is pre-filled.',integrityPartial:'Keep going — the result is still based only on your inputs.',integrityReady:'Inputs complete. The result is now calculated from your assumptions.',
      proofA:'FREE FIRST',proofAv:'A valid end state',proofB:'INPUTS',proofBv:'Your numbers only',proofC:'METHOD',proofCv:'Assumptions visible',proofD:'SCOPE',proofDv:'Escalation stays bounded'
    },
    ja:{
      eyebrow:'B2B AI支出 · WORKFLOW · AGENT CONTROL',
      heroA:'AIを増やす前に、',heroB:'何が回収できるかを',heroC:'見える化する。',
      lead:'AI・SaaS支出、業務摩擦、Agent採算を測り、更新・自動化・追加投資の前に「次の1ドルをどこへ使うか」を判断できる状態にします。',
      ctaFree:'無料Evidence Scanを始める',ctaAudit:'判断の検証方法を見る',
      trust1:'開始時の登録不要',trust2:'架空ROIなし',trust3:'前提を明示',
      panelLabel:'VALUE LEAK SNAPSHOT',panelLive:'入力値のみ',panelTitle:'判断を数字にする。',panelNote:'使うのはあなたの前提だけ。Stratumは計算し、成果を捏造しません。',
      section1:'まず業務上の問いから',section1Title:'AI投資で最初に判断すべき3領域。',section1Note:'先にSignalを選びます。問題が見えてから、商品や専門支援を出します。',
      reasonLabel:'WHY THIS ROUTE',reasonTitle:'Evidenceを作ってから課金へ。',reasonNote:'課題や採算が曖昧なまま、また別のAI Toolを買う失敗を防ぐための構造です。',
      reason1:'漏れを測る',reason1n:'コスト・遅延・再作業・重複・低利用率。',reason2:'判断できる形にする',reason2n:'自分の入力値と透明な前提で比較。',reason3:'必要な時だけEscalate',reason3n:'自力で足りるなら商品、重要なら専門監査。',
      ladderLabel:'DECISION PATH',ladderTitle:'一本の判断導線。必要な深さだけ進む。',ladderNote:'まずEvidence。無料で答えが足りるならそこで終了。深さが必要な時だけPaid Layerへ進みます。',
      step1Badge:'FREE',step1Title:'測る',step1Text:'診断・Calculatorで、支出・業務摩擦・Agent採算を購入前に可視化。',step1Meta1:'登録不要',step1Meta2:'すぐ使える',step1Cta:'無料ツールを開く',
      step2Badge:'SELF-SERVICE',step2Title:'選んで使う',step2Text:'Evidenceが出たら、現在のPaid Routeから最小のものを選択。購入後はBuyer WorkspaceからDeliveryへ進みます。',step2Meta1:'既存商品を活用',step2Meta2:'不要なBundleなし',step2Cta:'適切なPaid Routeを探す',
      step3Badge:'PROFESSIONAL',step3Title:'書面で判断を得る',step3Text:'コスト・遅延・調整負荷が大きい定常Workflow 1件を、固定範囲で専門分析。基本は非同期です。',step3Meta1:'1 Workflow',step3Meta2:'3営業日目安',step3Cta:'$499監査を見る',
      auditLabel:'PROFESSIONAL ESCALATION',auditTitle:'重要なWorkflowを1つ。判断を1つ。',auditText:'Workflow Map、Leak Analysis、機会順位、ROI Scenario、Risk Checkpoint、30-Day Action Planを、オープンエンドのコンサルなしで作成。',auditFixed:'固定価格',auditCta:'監査を見る →',
      receiveLabel:'監査で得られるもの',receiveTitle:'チームが実際に使えるDecision Artifact。',receiveNote:'Workflowを可視化し、漏れを出し、選択肢を順位化し、Controlを決め、次に何をするかまで落とします。',
      d1:'Workflow Map',d1n:'Trigger・担当・System・Handoff。',d2:'Leak Analysis',d2n:'再作業・遅延・価値損失。',d3:'Ranked Opportunities',d3n:'Impact・Effort・Reversibility・Risk。',d4:'ROI Scenarios',d4n:'架空精度ではなく透明な前提。',d5:'Human Checkpoints',d5n:'権限とHuman Reviewを残す場所。',d6:'30-Day Action Plan',d6n:'試す・検証・拡張・再設計・停止。',
      finalLabel:'SIGNALを判断へ',finalTitle:'次の1ドルの役割が分かるまで、AIを増やさない。',finalText:'課題が曖昧なら無料から。Evidenceが十分なら最小の実装Routeを選ぶ。重要なWorkflowだけ専門監査へ。',finalCta:'無料Evidenceから始める',
      integrityTitle:'入力の完全性',integrityEmpty:'自分の数字を入力してください。初期値で結論を作りません。',integrityPartial:'入力途中です。結果は入力済みの値だけを使います。',integrityReady:'入力完了。あなたの前提だけで結果を計算しています。',
      proofA:'FREE FIRST',proofAv:'無料終了も正解',proofB:'INPUTS',proofBv:'自分の数字だけ',proofC:'METHOD',proofCv:'前提を可視化',proofD:'SCOPE',proofDv:'支援範囲を固定'
    },
    es:{
      eyebrow:'GASTO AI B2B · WORKFLOW · CONTROL DE AGENTES',
      heroA:'No compres más AI',heroB:'sin saber',heroC:'qué devuelve valor.',
      lead:'Mide gasto AI y SaaS, fricción de workflow y economía de agentes antes de otra renovación, automatización o decisión de expansión.',
      ctaFree:'Iniciar análisis gratis',ctaAudit:'Ver cómo se verifican las decisiones',trust1:'Sin registro al empezar',trust2:'Sin ROI inventado',trust3:'Supuestos visibles',
      panelLabel:'VALUE LEAK SNAPSHOT',panelLive:'TUS DATOS',panelTitle:'Pon un número a la decisión.',panelNote:'Usa tus propios supuestos. Stratum calcula; no fabrica resultados.',
      section1:'EMPIEZA POR LA PREGUNTA DE NEGOCIO',section1Title:'Tres áreas donde la inversión AI necesita una decisión.',section1Note:'Elige la señal primero. Productos y soporte profesional aparecen después.',
      reasonLabel:'POR QUÉ ESTA RUTA',reasonTitle:'Evidencia antes de escalar.',reasonNote:'Evita comprar otra herramienta AI antes de entender el problema económico u operativo.',reason1:'Mide la fuga',reason1n:'Coste, retraso, retrabajo, solapamiento o bajo uso.',reason2:'Haz legible la decisión',reason2n:'Tus datos y supuestos transparentes.',reason3:'Escala solo si se justifica',reason3n:'Autoservicio si basta; revisión profesional si es material.',
      ladderLabel:'RUTA DE DECISIÓN',ladderTitle:'Una ruta. Solo la profundidad necesaria.',ladderNote:'Empieza con evidencia y termina gratis si basta. Usa una capa pagada solo cuando la decisión necesita más profundidad.',
      step1Badge:'GRATIS',step1Title:'Medir',step1Text:'Diagnósticos y calculadoras para exponer gasto, fricción o economía del agente.',step1Meta1:'Sin registro',step1Meta2:'Inmediato',step1Cta:'Abrir herramientas gratis',step2Badge:'AUTOSERVICIO',step2Title:'Elegir y usar',step2Text:'Con evidencia clara, elige la ruta pagada mínima. Después de comprar, Buyer Workspace te lleva a la entrega.',step2Meta1:'Productos existentes',step2Meta2:'Sin bundle forzado',step2Cta:'Encontrar ruta pagada',step3Badge:'PROFESIONAL',step3Title:'Obtener decisión escrita',step3Text:'Para un workflow recurrente con coste, retraso o coordinación material. Alcance fijo y asíncrono.',step3Meta1:'1 workflow',step3Meta2:'Objetivo 3 días',step3Cta:'Ver auditoría $499',
      auditLabel:'ESCALACIÓN PROFESIONAL',auditTitle:'Un workflow material. Una decisión escrita.',auditText:'Mapa, fugas, oportunidades, escenarios ROI, controles de riesgo y plan de 30 días, sin consultoría abierta.',auditFixed:'PRECIO FIJO',auditCta:'Ver auditoría →',
      receiveLabel:'QUÉ PRODUCE LA AUDITORÍA',receiveTitle:'Artefactos de decisión que el equipo puede usar.',receiveNote:'Mapea el workflow, expone fugas, ordena opciones, define controles y decide qué ocurre después.',d1:'Mapa de Workflow',d1n:'Trigger, responsables, sistemas y handoffs.',d2:'Análisis de fugas',d2n:'Retrabajo, retraso y pérdida de valor.',d3:'Oportunidades ordenadas',d3n:'Impacto, esfuerzo, reversibilidad y riesgo.',d4:'Escenarios ROI',d4n:'Supuestos transparentes.',d5:'Puntos humanos',d5n:'Dónde mantener autoridad y revisión.',d6:'Plan 30 días',d6n:'Probar, validar, escalar, rediseñar o parar.',
      finalLabel:'DE SEÑAL A DECISIÓN',finalTitle:'No compres más AI hasta saber qué debe hacer el próximo dólar.',finalText:'Empieza gratis si el problema sigue difuso. Elige la ruta mínima cuando haya evidencia y escala solo si hace falta.',finalCta:'Empezar con evidencia gratis',
      integrityTitle:'Integridad de entrada',integrityEmpty:'Añade tus propios números. No hay resultados precargados.',integrityPartial:'Sigue: el resultado usa solo los datos que introduces.',integrityReady:'Datos completos. El resultado se calcula con tus supuestos.',
      proofA:'GRATIS PRIMERO',proofAv:'Puede terminar aquí',proofB:'DATOS',proofBv:'Solo tus números',proofC:'MÉTODO',proofCv:'Supuestos visibles',proofD:'ALCANCE',proofDv:'Escalación limitada'
    }
  };

  const currentLang=()=>['en','ja','es'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
  const t=()=>copy[currentLang()]||copy.en;

  function render(){
    const lang=t();
    document.querySelectorAll('[data-rh]').forEach(el=>{const v=lang[el.dataset.rh];if(v!=null)el.textContent=v});
    const secondary=document.querySelector('.rh-actions .rh-secondary');
    if(secondary){secondary.href='/evidence.html';secondary.dataset.analyticsId='home_hero_evidence';}
    refreshProofBar();
    refreshIntegrity();
  }

  function ensureBuyerWorkspace(){
    const nav=document.querySelector('.office-nav');
    if(nav&&!nav.querySelector('a[href="/buyer-workspace.html"]')){
      const link=document.createElement('a');
      link.href='/buyer-workspace.html';link.textContent='Buyer Workspace';link.dataset.analyticsId='nav_buyer_workspace';nav.appendChild(link);
    }
  }

  function ensureIntegrity(){
    const card=document.querySelector('.rh-value-card');
    if(!card||card.querySelector('.rh-input-integrity'))return;
    const box=document.createElement('div');
    box.className='rh-input-integrity';
    box.setAttribute('aria-live','polite');
    box.innerHTML='<div class="rh-integrity-head"><span data-rhi-title></span><b data-rhi-count>0/3</b></div><div class="rh-integrity-track"><i></i></div><small data-rhi-note></small>';
    card.appendChild(box);
  }

  function refreshIntegrity(){
    ensureIntegrity();
    const inputs=['roi-hours','roi-value','roi-cost'].map(id=>document.getElementById(id)).filter(Boolean);
    if(!inputs.length)return;
    const complete=inputs.filter(x=>String(x.value||'').trim()!==''&&Number.isFinite(Number(x.value))).length;
    const box=document.querySelector('.rh-input-integrity');
    if(!box)return;
    const lang=t();
    box.style.setProperty('--integrity',String(complete/3));
    const title=box.querySelector('[data-rhi-title]');const count=box.querySelector('[data-rhi-count]');const note=box.querySelector('[data-rhi-note]');
    if(title)title.textContent=lang.integrityTitle;
    if(count)count.textContent=complete+'/3';
    if(note)note.textContent=complete===0?lang.integrityEmpty:(complete===3?lang.integrityReady:lang.integrityPartial);
    box.dataset.state=complete===3?'ready':(complete?'partial':'empty');
    const card=document.querySelector('.rh-value-card');if(card)card.dataset.inputState=box.dataset.state;
  }

  function refreshProofBar(){
    const bar=document.querySelector('.rh-proofbar');if(!bar)return;
    bar.setAttribute('aria-label','Decision integrity signals');
    const lang=t();
    const items=[[lang.proofA,lang.proofAv],[lang.proofB,lang.proofBv],[lang.proofC,lang.proofCv],[lang.proofD,lang.proofDv]];
    Array.from(bar.children).slice(0,4).forEach((el,i)=>{if(!items[i])return;el.innerHTML='<small>'+items[i][0]+'</small><strong>'+items[i][1]+'</strong><i aria-hidden="true"></i>';});
  }

  function motionLayer(){
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hero=document.querySelector('.rh-hero');
    if(hero&&!reduce){
      hero.addEventListener('pointermove',e=>{
        const r=hero.getBoundingClientRect();
        hero.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5).toFixed(3));
        hero.style.setProperty('--my',((e.clientY-r.top)/r.height-.5).toFixed(3));
      },{passive:true});
      hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--mx','0');hero.style.setProperty('--my','0')},{passive:true});
    }

    const targets=document.querySelectorAll('.rh-proofbar,.rh-section,.rh-audit-band,.rh-final,.rh-recent-wrap');
    if(reduce){targets.forEach(x=>x.classList.add('is-seen'));return;}
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-seen');io.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -6%'});
    targets.forEach(x=>{x.classList.add('rh-reveal');io.observe(x)});
  }

  function resultFeedback(){
    const output=document.querySelector('.rh-roi-output');if(!output)return;
    const pulse=()=>{output.classList.remove('is-result-live');void output.offsetWidth;output.classList.add('is-result-live');setTimeout(()=>output.classList.remove('is-result-live'),520)};
    const observer=new MutationObserver(()=>pulse());
    observer.observe(output,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-roi-state']});
  }

  function routeFeedback(){
    document.querySelectorAll('.rh-lanes [data-route]').forEach(btn=>btn.addEventListener('click',()=>{
      const route=btn.dataset.route||'cost';
      document.body.dataset.activeDecision=route;
      const module=document.querySelector('.decision-module');
      if(module){module.classList.remove('is-route-shift');void module.offsetWidth;module.classList.add('is-route-shift');}
    }));
  }

  function analytics(){
    const capture=(name,props)=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({home_experience_version:'v3'},props||{}));}catch(_){}};
    let sent=false;
    ['roi-hours','roi-value','roi-cost'].forEach(id=>{const input=document.getElementById(id);if(!input)return;input.addEventListener('input',()=>{refreshIntegrity();if(!sent){sent=true;capture('home_integrity_input_started')}})});
    document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('.rh-actions a,.rh-lanes button,.rh-ladder a,.rh-audit-band a,.rh-final a');if(a)capture('home_decision_interaction',{action_id:a.dataset.analyticsId||'',route:a.dataset.route||'',href:a.getAttribute('href')||''})},{capture:true});
  }

  function boot(){
    ensureBuyerWorkspace();
    ensureIntegrity();
    render();
    motionLayer();
    resultFeedback();
    routeFeedback();
    analytics();
    document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(render,0)));
    new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'))render()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
