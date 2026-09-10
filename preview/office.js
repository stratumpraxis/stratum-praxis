(() => {
  'use strict';

  const routes = {
    workflow: {
      symbol:'WF',chip:'WORKFLOW',href:'/b2b/',
      copy:{
        en:{kind:'FREE DIAGNOSTIC',question:'Where is this recurring workflow losing time or money?',description:'Start with one workflow. Identify rework, handoffs and delay before choosing automation.',destination:'Workflow Decision Diagnostic'},
        ja:{kind:'無料診断',question:'この定常Workflowは、どこで時間やコストを失っていますか？',description:'まず1つのWorkflowに絞り、再作業・引き継ぎ・遅延を見える化してから自動化を判断します。',destination:'Workflow Decision Diagnostic'},
        es:{kind:'DIAGNÓSTICO GRATIS',question:'¿Dónde pierde tiempo o dinero este workflow recurrente?',description:'Empieza con un workflow. Identifica retrabajo, transferencias y retrasos antes de automatizar.',destination:'Workflow Decision Diagnostic'}
      }
    },
    cost: {
      symbol:'$',chip:'COST',href:'/ai-saas-waste-calculator.html',
      copy:{
        en:{kind:'FREE CALCULATOR',question:'Is AI or SaaS spend producing enough operating value?',description:'Make cost assumptions visible before renewal, expansion or another tool purchase.',destination:'AI & SaaS Waste Calculator'},
        ja:{kind:'無料CALCULATOR',question:'AI・SaaSコストは、十分な業務価値を生んでいますか？',description:'更新・拡張・追加購入の前に、コスト前提とWasteを可視化します。',destination:'AI & SaaS Waste Calculator'},
        es:{kind:'CALCULADORA GRATIS',question:'¿El gasto en AI o SaaS produce suficiente valor operativo?',description:'Haz visibles las hipótesis de coste antes de renovar, ampliar o comprar otra herramienta.',destination:'AI & SaaS Waste Calculator'}
      }
    },
    agent: {
      symbol:'AG',chip:'AGENT',href:'/ai-agent-economics-calculator.html',
      copy:{
        en:{kind:'DECISION TOOL',question:'Does this agent make economic sense, and where should authority stop?',description:'Review cost, outcome economics and control boundaries before increasing autonomy.',destination:'AI Agent Economics'},
        ja:{kind:'DECISION TOOL',question:'このAgentは採算が合い、権限はどこで止めるべきですか？',description:'自律性を上げる前に、コスト・成果単価・Control境界を確認します。',destination:'AI Agent Economics'},
        es:{kind:'HERRAMIENTA DE DECISIÓN',question:'¿Este agente tiene sentido económico y dónde debe terminar su autoridad?',description:'Revisa coste, economía del resultado y límites de control antes de aumentar autonomía.',destination:'AI Agent Economics'}
      }
    },
    revenue: {
      symbol:'RV',chip:'REVENUE',href:'/product-router.html',
      copy:{
        en:{kind:'B2B ROUTER',question:'Which existing route is most likely to turn evidence into business value?',description:'Use the product router after the problem is visible. Avoid adding another tool by default.',destination:'B2B Product Router'},
        ja:{kind:'B2B ROUTER',question:'どの既存ルートが、Evidenceを最も事業価値へつなげやすいですか？',description:'課題が見えた後にProduct Routerを使い、必要がない限り新しいToolを増やしません。',destination:'B2B Product Router'},
        es:{kind:'ROUTER B2B',question:'¿Qué ruta existente puede convertir mejor la evidencia en valor de negocio?',description:'Usa Product Router cuando el problema ya sea visible. No añadas otra herramienta por defecto.',destination:'B2B Product Router'}
      }
    },
    audit: {
      symbol:'AU',chip:'AUDIT',href:'./workflow-audit.html',
      copy:{
        en:{kind:'PROFESSIONAL · $499',question:'Is this workflow material enough for a company-specific written audit?',description:'Escalate only when recurring cost, delay or coordination burden is concrete enough to justify specialist review.',destination:'AI Workflow Opportunity Audit'},
        ja:{kind:'PROFESSIONAL · $499',question:'このWorkflowは、会社固有の書面監査を行うほど重要ですか？',description:'定常コスト・遅延・調整負荷が十分に具体化した場合だけ専門監査へ進みます。',destination:'AI Workflow Opportunity Audit'},
        es:{kind:'PROFESIONAL · $499',question:'¿Este workflow es suficientemente material para una auditoría escrita específica de la empresa?',description:'Escala solo cuando coste, retraso o carga de coordinación recurrente justifican una revisión especializada.',destination:'AI Workflow Opportunity Audit'}
      }
    }
  };

  const translations = {
    en: {
      navDiagnose:'Diagnose',navFree:'Free Tools',navProducts:'Products',navAudit:'Audit',workspaceLabel:'DECISION WORKSPACE',workspaceTitle:'What are we deciding today?',workspaceNote:'Choose one business question. The workspace routes you to the smallest useful next step.',routeWorkflow:'Workflow',routeWorkflowNote:'Friction & automation',routeCost:'Cost',routeCostNote:'AI & SaaS spend',routeAgent:'Agent',routeAgentNote:'Economics & control',routeRevenue:'Revenue',routeRevenueNote:'Value & routing',routeAudit:'Audit',routeAuditNote:'Professional review',todayDecision:"TODAY'S DECISION",recommendedNext:'RECOMMENDED NEXT',openRoute:'Open route',roiSnapshot:'ROI SNAPSHOT',yourInputs:'YOUR INPUTS',roiIntro:'Use your own assumptions. Nothing is pre-filled and no ROI is invented.',hoursSaved:'Hours saved / month',hourValue:'Value / hour (USD)',monthlyCost:'Monthly cost (USD)',netValue:'NET VALUE',roiEmpty:'Enter all three values to calculate.',evidencePulse:'EVIDENCE PULSE',noFabrication:'REAL DATA ONLY',noEvidence:'No evidence loaded',noEvidenceNote:'This preview does not display fabricated customers, growth, ROI or live market signals.',signal:'Signal',meaning:'Meaning',action:'Action',recentDecision:'RECENT DECISION',clear:'Clear',nothingOpened:'Nothing opened yet',nothingOpenedNote:'Routes you open from this workspace appear here on this device.',revenueRoute:'REVENUE ROUTE',routeTitle:'Evidence first. Paid escalation only when it earns its place.',flowProblem:'Problem',flowProblemNote:'Choose the business question',flowFree:'Free evidence',flowFreeNote:'Diagnostic / calculator',flowDecision:'Decision',flowDecisionNote:'Make the signal legible',flowAction:'Recommended action',flowActionNote:'Use the smallest fitting route',flowPaid:'Paid escalation',flowPaidNote:'Only when justified',startHere:'START HERE',pathsTitle:'Four clear ways into Stratum.',pathsNote:'Free, self-service paid and professional support are visually separated so the next step is obvious.',pathDiagnoseType:'START · FREE',pathDiagnose:'Start B2B diagnosis',pathDiagnoseNote:'Temporary verified entry: Workflow Decision Diagnostic. Offer Optimizer is not present in the current repository.',pathFreeType:'EXPLORE · FREE',pathFree:'Try free tools',pathFreeNote:'Use the Live Lab to test a business question before buying.',pathProductsType:'SELF-SERVICE · PAID',pathProducts:'View B2B products',pathProductsNote:'Route evidence to an existing implementation or governance asset.',pathAuditType:'PROFESSIONAL · $499',pathAudit:'Request specialist audit',pathAuditNote:'Escalate one material recurring workflow for a fixed-scope written decision.',footerLine:'B2B Intelligence · Decision · Revenue',contact:'Contact',mobileStart:'Start a decision'
    },
    ja: {
      navDiagnose:'診断',navFree:'無料ツール',navProducts:'B2B商品',navAudit:'監査',workspaceLabel:'DECISION WORKSPACE',workspaceTitle:'今日は、何を判断しますか？',workspaceNote:'判断したい業務課題を1つ選ぶと、必要最小限の次の手段へ案内します。',routeWorkflow:'Workflow',routeWorkflowNote:'業務摩擦・自動化',routeCost:'Cost',routeCostNote:'AI・SaaSコスト',routeAgent:'Agent',routeAgentNote:'採算・制御',routeRevenue:'Revenue',routeRevenueNote:'価値・収益導線',routeAudit:'Audit',routeAuditNote:'専門監査',todayDecision:'TODAY’S DECISION',recommendedNext:'RECOMMENDED NEXT',openRoute:'このルートを開く',roiSnapshot:'ROI SNAPSHOT',yourInputs:'入力値のみ',roiIntro:'自社の前提だけで試算します。初期値や架空ROIは表示しません。',hoursSaved:'削減時間 / 月',hourValue:'1時間の価値 (USD)',monthlyCost:'月額コスト (USD)',netValue:'純価値',roiEmpty:'3つの数値を入力すると計算します。',evidencePulse:'EVIDENCE PULSE',noFabrication:'実データのみ',noEvidence:'Evidenceは未読込',noEvidenceNote:'架空の顧客数・成長率・ROI・LIVEシグナルは表示しません。',signal:'Signal',meaning:'Meaning',action:'Action',recentDecision:'RECENT DECISION',clear:'消去',nothingOpened:'まだ履歴はありません',nothingOpenedNote:'このWorkspaceから開いたルートだけ、この端末に表示します。',revenueRoute:'REVENUE ROUTE',routeTitle:'まずEvidence。必要なときだけ有料へ進む。',flowProblem:'課題',flowProblemNote:'判断したいことを選ぶ',flowFree:'無料Evidence',flowFreeNote:'診断・Calculator',flowDecision:'Decision',flowDecisionNote:'判断材料を見える化',flowAction:'Recommended Action',flowActionNote:'最小の適合ルートへ',flowPaid:'Paid escalation',flowPaidNote:'必要な場合のみ',startHere:'START HERE',pathsTitle:'Stratumへの入口は4つ。',pathsNote:'無料・Self-service Paid・Professional Auditの違いを、説明を読まなくても判別できる構造です。',pathDiagnoseType:'START · FREE',pathDiagnose:'B2B診断を始める',pathDiagnoseNote:'暫定の検証済み入口はWorkflow Decision Diagnostic。Offer Optimizer本体は現行Repositoryに未接続です。',pathFreeType:'EXPLORE · FREE',pathFree:'無料ツールを試す',pathFreeNote:'購入前にLive Labで自社の状況を確かめます。',pathProductsType:'SELF-SERVICE · PAID',pathProducts:'B2B商品を見る',pathProductsNote:'Evidenceに合う既存の導入・運用・Governance資産へ進みます。',pathAuditType:'PROFESSIONAL · $499',pathAudit:'専門監査を依頼する',pathAuditNote:'重要度の高い1つの定常Workflowを固定範囲の書面監査へEscalateします。',footerLine:'B2B Intelligence · Decision · Revenue',contact:'Contact',mobileStart:'判断を始める'
    },
    es: {
      navDiagnose:'Diagnóstico',navFree:'Herramientas',navProducts:'Productos',navAudit:'Auditoría',workspaceLabel:'ESPACIO DE DECISIÓN',workspaceTitle:'¿Qué necesitamos decidir hoy?',workspaceNote:'Elige una pregunta de negocio. El espacio te dirige al siguiente paso útil más pequeño.',routeWorkflow:'Workflow',routeWorkflowNote:'Fricción y automatización',routeCost:'Coste',routeCostNote:'Gasto AI y SaaS',routeAgent:'Agente',routeAgentNote:'Economía y control',routeRevenue:'Ingresos',routeRevenueNote:'Valor y rutas',routeAudit:'Auditoría',routeAuditNote:'Revisión profesional',todayDecision:'DECISIÓN DE HOY',recommendedNext:'SIGUIENTE RECOMENDADO',openRoute:'Abrir ruta',roiSnapshot:'RESUMEN ROI',yourInputs:'TUS DATOS',roiIntro:'Usa tus propias hipótesis. No hay valores precargados ni ROI inventado.',hoursSaved:'Horas ahorradas / mes',hourValue:'Valor / hora (USD)',monthlyCost:'Coste mensual (USD)',netValue:'VALOR NETO',roiEmpty:'Introduce los tres valores para calcular.',evidencePulse:'PULSO DE EVIDENCIA',noFabrication:'SOLO DATOS REALES',noEvidence:'Sin evidencia cargada',noEvidenceNote:'Esta vista previa no muestra clientes, crecimiento, ROI ni señales en vivo inventadas.',signal:'Señal',meaning:'Significado',action:'Acción',recentDecision:'DECISIÓN RECIENTE',clear:'Borrar',nothingOpened:'Nada abierto todavía',nothingOpenedNote:'Las rutas que abras desde este espacio aparecerán aquí en este dispositivo.',revenueRoute:'RUTA DE INGRESOS',routeTitle:'Primero evidencia. Escalación de pago solo cuando se justifica.',flowProblem:'Problema',flowProblemNote:'Elige la pregunta',flowFree:'Evidencia gratis',flowFreeNote:'Diagnóstico / calculadora',flowDecision:'Decisión',flowDecisionNote:'Haz visible la señal',flowAction:'Acción recomendada',flowActionNote:'Usa la ruta mínima adecuada',flowPaid:'Escalación de pago',flowPaidNote:'Solo cuando se justifica',startHere:'EMPIEZA AQUÍ',pathsTitle:'Cuatro formas claras de entrar en Stratum.',pathsNote:'Gratis, autoservicio de pago y soporte profesional están visualmente separados.',pathDiagnoseType:'INICIO · GRATIS',pathDiagnose:'Iniciar diagnóstico B2B',pathDiagnoseNote:'Entrada verificada temporal: Workflow Decision Diagnostic. Offer Optimizer no está en el repositorio actual.',pathFreeType:'EXPLORAR · GRATIS',pathFree:'Probar herramientas gratis',pathFreeNote:'Usa Live Lab para comprobar una pregunta antes de comprar.',pathProductsType:'AUTOSERVICIO · PAGO',pathProducts:'Ver productos B2B',pathProductsNote:'Conecta la evidencia con un activo existente de implementación o gobernanza.',pathAuditType:'PROFESIONAL · $499',pathAudit:'Solicitar auditoría',pathAuditNote:'Escala un workflow recurrente material a una decisión escrita de alcance fijo.',footerLine:'B2B Intelligence · Decision · Revenue',contact:'Contacto',mobileStart:'Iniciar decisión'
    }
  };

  const langFromUrl = new URLSearchParams(location.search).get('lang');
  const storedLang = localStorage.getItem('sp-office-lang');
  let currentLang = ['en','ja','es'].includes(langFromUrl) ? langFromUrl : (['en','ja','es'].includes(storedLang) ? storedLang : 'en');

  function activeRouteKey() {
    return document.querySelector('.route.active[data-route]')?.dataset.route || localStorage.getItem('sp-office-route') || 'workflow';
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    localStorage.setItem('sp-office-lang', lang);
    document.querySelectorAll('[data-lang]').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = translations[lang]?.[el.dataset.i18n];
      if (value) el.textContent = value;
    });
    updateRoute(activeRouteKey());
  }

  function updateRoute(key) {
    const route = routes[key];
    if (!route) return;
    const copy = route.copy[currentLang] || route.copy.en;
    document.querySelectorAll('[data-route]').forEach(btn => {
      const active = btn.dataset.route === key;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    const chip = document.querySelector('[data-route-chip]');
    const symbol = document.querySelector('[data-route-symbol]');
    const kind = document.querySelector('[data-route-kind]');
    const question = document.querySelector('[data-route-question]');
    const description = document.querySelector('[data-route-description]');
    const destination = document.querySelector('[data-route-destination]');
    const link = document.querySelector('[data-route-link]');
    if (chip) chip.textContent = route.chip;
    if (symbol) symbol.textContent = route.symbol;
    if (kind) kind.textContent = copy.kind;
    if (question) question.textContent = copy.question;
    if (description) description.textContent = copy.description;
    if (destination) destination.textContent = copy.destination;
    if (link) { link.href = route.href; link.dataset.historyRoute = key; }
    localStorage.setItem('sp-office-route', key);
  }

  function calculateRoi() {
    const hoursEl = document.getElementById('roi-hours');
    const valueEl = document.getElementById('roi-value');
    const costEl = document.getElementById('roi-cost');
    const result = document.querySelector('.roi-result');
    const netEl = document.getElementById('roi-net');
    const roiEl = document.getElementById('roi-percent');
    const note = document.getElementById('roi-note');
    if (!hoursEl || !valueEl || !costEl || !result || !netEl || !roiEl || !note) return;
    const hours = Number(hoursEl.value);
    const value = Number(valueEl.value);
    const cost = Number(costEl.value);
    const complete = [hours,value,cost].every(Number.isFinite) && hoursEl.value !== '' && valueEl.value !== '' && costEl.value !== '';
    if (!complete) {
      result.dataset.roiState = 'empty'; netEl.textContent = '—'; roiEl.textContent = '—'; note.textContent = translations[currentLang].roiEmpty; return;
    }
    const gross = hours * value;
    const net = gross - cost;
    const roi = cost > 0 ? (net / cost) * 100 : null;
    const locale = currentLang === 'ja' ? 'ja-JP' : currentLang === 'es' ? 'es-ES' : 'en-US';
    const money = new Intl.NumberFormat(locale,{style:'currency',currency:'USD',maximumFractionDigits:0});
    netEl.textContent = money.format(net);
    roiEl.textContent = roi === null ? '—' : `${Math.round(roi)}%`;
    result.dataset.roiState = net >= 0 ? 'positive' : 'negative';
    note.textContent = currentLang === 'ja' ? `月間価値 ${money.format(gross)} − 月額コスト ${money.format(cost)}` : currentLang === 'es' ? `Valor mensual ${money.format(gross)} − coste ${money.format(cost)}` : `Monthly value ${money.format(gross)} − cost ${money.format(cost)}`;
  }

  const historyKey = 'sp-office-recent-v1';
  function readHistory() {
    try { return JSON.parse(localStorage.getItem(historyKey) || '[]').filter(item => routes[item.key]); } catch { return []; }
  }
  function writeHistory(items) { localStorage.setItem(historyKey, JSON.stringify(items.slice(0,4))); }
  function addHistory(key) {
    if (!routes[key]) return;
    const next = [{key,at:new Date().toISOString()},...readHistory().filter(item => item.key !== key)];
    writeHistory(next); renderHistory();
  }
  function renderHistory() {
    const list = document.getElementById('recent-list');
    const empty = document.getElementById('recent-empty');
    if (!list || !empty) return;
    const items = readHistory();
    list.innerHTML = '';
    empty.hidden = items.length > 0;
    list.hidden = items.length === 0;
    const locale = currentLang === 'ja' ? 'ja-JP' : currentLang === 'es' ? 'es-ES' : 'en-US';
    items.forEach(item => {
      const r = routes[item.key];
      const copy = r.copy[currentLang] || r.copy.en;
      const a = document.createElement('a');
      a.className = 'recent-item'; a.href = r.href;
      const when = new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(item.at));
      a.innerHTML = `<span><b>${copy.destination}</b><small>${when}</small></span><i>→</i>`;
      list.appendChild(a);
    });
  }

  document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => { applyLanguage(btn.dataset.lang); calculateRoi(); renderHistory(); }));
  document.querySelectorAll('.route[data-route]').forEach(btn => btn.addEventListener('click', () => updateRoute(btn.dataset.route)));
  document.querySelectorAll('#roi-hours,#roi-value,#roi-cost').forEach(input => input.addEventListener('input', calculateRoi));
  document.querySelector('[data-route-link]')?.addEventListener('click', e => addHistory(e.currentTarget.dataset.historyRoute));
  document.querySelectorAll('.path-card').forEach(card => card.addEventListener('click', () => {
    if (card.classList.contains('diagnose')) addHistory('workflow');
    if (card.classList.contains('pro')) addHistory('audit');
  }));
  document.getElementById('clear-history')?.addEventListener('click', () => { localStorage.removeItem(historyKey); renderHistory(); });

  applyLanguage(currentLang);
  calculateRoi();
  renderHistory();
})();