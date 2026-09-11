/* Stratum Praxis — homepage revenue category navigator */
(()=>{
  'use strict';
  const T={
    en:{nav:'Routes',kicker:'SITE NAVIGATOR · REVENUE LOOP',title:'Choose the category. Jump straight to the right layer.',lead:'Browse by business need without losing the revenue path. Start free, move to a paid layer only when the evidence supports it, then return to measurement.',free:'Start free',freeDesc:'Use evidence tools before buying anything.',cost:'Cost & spend',costDesc:'Find waste, prove value, audit material spend, then keep it controlled.',workflow:'Workflow',workflowDesc:'Qualify one recurring workflow before paying for specialist analysis.',agent:'Agent',agentDesc:'Check unit economics, authority boundaries and cross-agent operating control.',product:'Paid products',productDesc:'Self-service products with direct purchase paths. No placeholder inventory.',revenue:'Audit & recurring',revenueDesc:'Escalate material decisions, recover value, and retain recurring control.',allFree:'All free routes',workflowCheck:'Qualify one workflow',wasteCheck:'Estimate spend exposure',valueKit:'Self-service ROI layer',spendAudit:'Fixed-scope spend decision',monitor:'Recurring spend control',productRouter:'Choose a paid route',workflowAudit:'Fixed-scope workflow decision',agentEconomics:'Model cost per successful outcome',agentControl:'Free control check · optional Pro',crossAgent:'Cross-runtime operating layer',loop1:'Measure',loop2:'Self-service',loop3:'Audit',loop4:'Recurring',loop5:'Re-measure'},
    ja:{nav:'ルート',kicker:'SITE NAVIGATOR · REVENUE LOOP',title:'分類を選べば、必要な層へそのまま飛べる。',lead:'迷わず業務課題から収益導線へ。まず無料でEvidenceを作り、必要な時だけPaid Layerへ進み、最後は再計測へ戻します。',free:'無料から始める',freeDesc:'購入前にEvidence Toolで問題を確かめる。',cost:'コスト・支出',costDesc:'Wasteを見つけ、価値を確認し、重要なら監査、継続ならMonitoringへ。',workflow:'Workflow',workflowDesc:'定常Workflowを1つ評価してから、専門監査へ進むか判断。',agent:'Agent',agentDesc:'採算・権限境界・Cross-Agent運用Controlを確認。',product:'Paid Product',productDesc:'直接購入できるSelf-service商品だけ。Placeholderは表示しません。',revenue:'監査・継続',revenueDesc:'重要な判断を監査し、価値回収と継続Controlへつなげる。',allFree:'無料ルート一覧',workflowCheck:'Workflowを1件診断',wasteCheck:'支出Exposureを確認',valueKit:'Self-service ROI層',spendAudit:'固定範囲のSpend判断',monitor:'継続Spend Control',productRouter:'Paid Routeを選ぶ',workflowAudit:'固定範囲のWorkflow判断',agentEconomics:'成功1件あたりCostを計算',agentControl:'無料Control Check · Pro任意',crossAgent:'Cross-Runtime運用レイヤー',loop1:'測る',loop2:'Self-service',loop3:'監査',loop4:'継続',loop5:'再計測'},
    es:{nav:'Rutas',kicker:'NAVEGADOR · CICLO DE INGRESOS',title:'Elige la categoría y salta a la capa correcta.',lead:'Navega por necesidad sin perder la ruta de ingresos: evidencia gratis, capa pagada cuando se justifica y vuelta a medición.',free:'Empezar gratis',freeDesc:'Usa evidencia antes de comprar.',cost:'Coste y gasto',costDesc:'Detecta desperdicio, prueba valor, audita gasto material y mantén control.',workflow:'Workflow',workflowDesc:'Califica un workflow recurrente antes de pagar análisis especialista.',agent:'Agente',agentDesc:'Revisa economía, límites de autoridad y control multiagente.',product:'Productos pagados',productDesc:'Solo productos de autoservicio con compra directa.',revenue:'Auditoría y recurrente',revenueDesc:'Escala decisiones materiales y mantén control recurrente.',allFree:'Todas las rutas gratis',workflowCheck:'Calificar un workflow',wasteCheck:'Estimar gasto expuesto',valueKit:'Capa ROI de autoservicio',spendAudit:'Decisión de gasto fija',monitor:'Control recurrente de gasto',productRouter:'Elegir ruta pagada',workflowAudit:'Decisión de workflow fija',agentEconomics:'Coste por resultado exitoso',agentControl:'Control gratis · Pro opcional',crossAgent:'Capa operativa entre runtimes',loop1:'Medir',loop2:'Autoservicio',loop3:'Auditar',loop4:'Recurrente',loop5:'Remedir'}
  };
  const markup=`
    <section class="rh-route-navigator" id="revenue-navigator" aria-labelledby="revenue-navigator-title">
      <div class="rh-route-nav-head">
        <div class="rh-route-nav-copy">
          <p class="rh-route-nav-kicker" data-rnav="kicker">SITE NAVIGATOR · REVENUE LOOP</p>
          <h2 id="revenue-navigator-title" data-rnav="title">Choose the category. Jump straight to the right layer.</h2>
          <p class="rh-route-nav-lead" data-rnav="lead">Browse by business need without losing the revenue path.</p>
        </div>
        <div class="rh-route-controls" aria-label="Category slides">
          <span class="rh-route-count" data-revenue-count>1 / 6</span>
          <button class="rh-route-control" type="button" data-revenue-prev aria-label="Previous category">←</button>
          <button class="rh-route-control" type="button" data-revenue-next aria-label="Next category">→</button>
        </div>
      </div>
      <div class="rh-route-rail" data-revenue-rail tabindex="0" aria-label="Revenue categories">
        <article class="rh-route-slide" data-category="free">
          <div class="rh-route-slide-top"><span>01</span><small>FREE EVIDENCE</small></div>
          <h3 data-rnav="free">Start free</h3><p data-rnav="freeDesc">Use evidence tools before buying anything.</p>
          <div class="rh-route-links">
            <a href="/live-lab.html" data-analytics-id="home_nav_free_lab"><span><b>Live Lab</b><small data-rnav="allFree">All free routes</small></span><em>FREE</em></a>
            <a href="/b2b/" data-analytics-id="home_nav_free_workflow"><span><b>Workflow Diagnostic</b><small data-rnav="workflowCheck">Qualify one workflow</small></span><em>FREE</em></a>
            <a href="/ai-saas-waste-calculator.html" data-analytics-id="home_nav_free_cost"><span><b>AI & SaaS Waste Calculator</b><small data-rnav="wasteCheck">Estimate spend exposure</small></span><em>FREE</em></a>
          </div>
        </article>
        <article class="rh-route-slide" data-category="cost">
          <div class="rh-route-slide-top"><span>02</span><small>COST</small></div>
          <h3 data-rnav="cost">Cost & spend</h3><p data-rnav="costDesc">Find waste, prove value, audit material spend, then keep it controlled.</p>
          <div class="rh-route-links">
            <a href="/ai-saas-waste-calculator.html" data-analytics-id="home_nav_cost_free"><span><b>Waste Calculator</b><small data-rnav="wasteCheck">Estimate spend exposure</small></span><em>FREE</em></a>
            <a href="/ai-value-realization-kit.html" data-analytics-id="home_nav_cost_value"><span><b>AI Value Realization Kit</b><small data-rnav="valueKit">Self-service ROI layer</small></span><em>$39</em></a>
            <a href="/ai-saas-spend-waste-audit.html" data-analytics-id="home_nav_cost_audit"><span><b>Spend Waste Audit</b><small data-rnav="spendAudit">Fixed-scope spend decision</small></span><em>$499</em></a>
            <a href="/ai-saas-spend-monitoring.html#monitoring" data-analytics-id="home_nav_cost_monitor"><span><b>Spend Monitoring</b><small data-rnav="monitor">Recurring spend control</small></span><em>$199–499/mo</em></a>
          </div>
        </article>
        <article class="rh-route-slide" data-category="workflow">
          <div class="rh-route-slide-top"><span>03</span><small>WORKFLOW</small></div>
          <h3 data-rnav="workflow">Workflow</h3><p data-rnav="workflowDesc">Qualify one recurring workflow before paying for specialist analysis.</p>
          <div class="rh-route-links">
            <a href="/b2b/" data-analytics-id="home_nav_workflow_free"><span><b>Workflow Diagnostic</b><small data-rnav="workflowCheck">Qualify one workflow</small></span><em>FREE</em></a>
            <a href="/product-router.html" data-analytics-id="home_nav_workflow_products"><span><b>Product Router</b><small data-rnav="productRouter">Choose a paid route</small></span><em>PAID</em></a>
            <a href="/workflow-audit.html" data-analytics-id="home_nav_workflow_audit"><span><b>Workflow Audit</b><small data-rnav="workflowAudit">Fixed-scope workflow decision</small></span><em>$499</em></a>
          </div>
        </article>
        <article class="rh-route-slide" data-category="agent">
          <div class="rh-route-slide-top"><span>04</span><small>AGENT</small></div>
          <h3 data-rnav="agent">Agent</h3><p data-rnav="agentDesc">Check unit economics, authority boundaries and cross-agent operating control.</p>
          <div class="rh-route-links">
            <a href="/ai-agent-economics-calculator.html" data-analytics-id="home_nav_agent_economics"><span><b>Agent Economics</b><small data-rnav="agentEconomics">Model cost per successful outcome</small></span><em>FREE</em></a>
            <a href="/agent-control-auditor.html" data-analytics-id="home_nav_agent_control"><span><b>Agent Control Auditor</b><small data-rnav="agentControl">Free control check · optional Pro</small></span><em>FREE / $29</em></a>
            <a href="/cross-agent-operating-kit.html" data-analytics-id="home_nav_agent_cross"><span><b>Cross-Agent Operating Kit</b><small data-rnav="crossAgent">Cross-runtime operating layer</small></span><em>$69–299</em></a>
          </div>
        </article>
        <article class="rh-route-slide" data-category="product">
          <div class="rh-route-slide-top"><span>05</span><small>SELF-SERVICE</small></div>
          <h3 data-rnav="product">Paid products</h3><p data-rnav="productDesc">Self-service products with direct purchase paths. No placeholder inventory.</p>
          <div class="rh-route-links">
            <a href="/product-router.html" data-analytics-id="home_nav_products_router"><span><b>Product Router</b><small data-rnav="productRouter">Choose a paid route</small></span><em>OPEN</em></a>
            <a href="/ai-value-realization-kit.html" data-analytics-id="home_nav_products_value"><span><b>AI Value Realization Kit</b><small data-rnav="valueKit">Self-service ROI layer</small></span><em>$39</em></a>
            <a href="/cross-agent-operating-kit.html" data-analytics-id="home_nav_products_cross"><span><b>Cross-Agent Operating Kit</b><small data-rnav="crossAgent">Cross-runtime operating layer</small></span><em>$69–299</em></a>
          </div>
        </article>
        <article class="rh-route-slide" data-category="revenue">
          <div class="rh-route-slide-top"><span>06</span><small>REVENUE</small></div>
          <h3 data-rnav="revenue">Audit & recurring</h3><p data-rnav="revenueDesc">Escalate material decisions, recover value, and retain recurring control.</p>
          <div class="rh-route-links">
            <a href="/workflow-audit.html" data-analytics-id="home_nav_revenue_workflow"><span><b>Workflow Audit</b><small data-rnav="workflowAudit">Fixed-scope workflow decision</small></span><em>$499</em></a>
            <a href="/ai-saas-spend-waste-audit.html" data-analytics-id="home_nav_revenue_spend"><span><b>Spend Waste Audit</b><small data-rnav="spendAudit">Fixed-scope spend decision</small></span><em>$499</em></a>
            <a href="/ai-saas-spend-monitoring.html" data-analytics-id="home_nav_revenue_monitor"><span><b>Spend Monitoring</b><small data-rnav="monitor">Recurring spend control</small></span><em>$199–499/mo</em></a>
          </div>
        </article>
      </div>
      <nav class="rh-revenue-loop" aria-label="Revenue circulation">
        <a href="/live-lab.html" data-analytics-id="home_loop_measure"><small>01 · FREE</small><strong data-rnav="loop1">Measure</strong></a>
        <a href="/product-router.html" data-analytics-id="home_loop_self_service"><small>02 · PAID</small><strong data-rnav="loop2">Self-service</strong></a>
        <a href="/workflow-audit.html" data-analytics-id="home_loop_audit"><small>03 · $499</small><strong data-rnav="loop3">Audit</strong></a>
        <a href="/ai-saas-spend-monitoring.html" data-analytics-id="home_loop_recurring"><small>04 · MRR</small><strong data-rnav="loop4">Recurring</strong></a>
        <a href="/live-lab.html" data-analytics-id="home_loop_remeasure"><small>05 · LOOP</small><strong data-rnav="loop5">Re-measure</strong></a>
      </nav>
    </section>`;
  const locale=()=>['en','ja','es'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
  const render=()=>{const t=T[locale()]||T.en;document.querySelectorAll('[data-rnav]').forEach(el=>{const v=t[el.dataset.rnav];if(v!=null)el.textContent=v})};
  const inject=()=>{
    if(document.querySelector('#revenue-navigator'))return;
    const proof=document.querySelector('.rh-proofbar');
    if(!proof)return;
    if(!document.querySelector('link[href*="stratum-revenue-navigator.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/stratum-revenue-navigator.css?v=1';document.head.appendChild(css)}
    proof.insertAdjacentHTML('afterend',markup);
    const primary=document.querySelector('.office-nav');
    if(primary&&!primary.querySelector('a[href="#revenue-navigator"]')){const a=document.createElement('a');a.href='#revenue-navigator';a.dataset.rnav='nav';a.dataset.analyticsId='nav_revenue_routes';a.textContent='Routes';primary.insertBefore(a,primary.firstChild)}
    render();
  };
  const controls=()=>{
    const rail=document.querySelector('[data-revenue-rail]'),prev=document.querySelector('[data-revenue-prev]'),next=document.querySelector('[data-revenue-next]'),count=document.querySelector('[data-revenue-count]');
    if(!rail||!prev||!next)return;
    const slides=[...rail.querySelectorAll('.rh-route-slide')];
    const gap=()=>parseFloat(getComputedStyle(rail).columnGap||getComputedStyle(rail).gap||0)||0;
    const step=()=>slides[0].getBoundingClientRect().width+gap();
    const index=()=>Math.max(0,Math.min(slides.length-1,Math.round(rail.scrollLeft/Math.max(1,step()))));
    const update=()=>{const i=index();prev.disabled=i<=0;next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-4;if(count)count.textContent=`${i+1} / ${slides.length}`};
    const move=dir=>{rail.scrollBy({left:dir*step(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});window.scosCapture?.('home_category_slide',{direction:dir>0?'next':'prev',from_index:index()+1})};
    prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    rail.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}});
    let ticking=false;rail.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{update();ticking=false})}},{passive:true});addEventListener('resize',update,{passive:true});update();
  };
  const boot=()=>{inject();controls();document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(render,0)));new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'))render()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']})};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
