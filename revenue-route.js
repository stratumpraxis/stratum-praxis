(function(){
  'use strict';

  function capture(name, props){
    if(window.scosCapture) window.scosCapture(name, props || {});
  }

  function moneyNumber(text){
    var n = Number(String(text || '').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : NaN;
  }

  function routeBox(id, target){
    var box = document.getElementById(id);
    if(box) return box;
    box = document.createElement('aside');
    box.id = id;
    box.className = 'sp-decision-route';
    box.setAttribute('aria-live','polite');
    if(target && target.parentNode) target.parentNode.insertBefore(box, target);
    return box;
  }

  function render(box, cfg){
    if(!box || !cfg) return;
    box.dataset.route = cfg.route;
    box.dataset.tier = cfg.tier;
    box.innerHTML = '<small>Recommended next route · '+cfg.tier+'</small>'+
      '<strong>'+cfg.title+'</strong>'+
      '<p>'+cfg.body+'</p>'+
      '<a href="'+cfg.href+'" data-revenue-route="'+cfg.route+'"'+(cfg.paid?' data-primary-cta="true" data-paid="true"':'')+'>'+cfg.cta+'</a>'+
      (cfg.note ? '<em>'+cfg.note+'</em>' : '');
  }

  function trackRecommendation(key, props){
    var value = JSON.stringify(props);
    try {
      if(sessionStorage.getItem(key) === value) return;
      sessionStorage.setItem(key, value);
    } catch(_){}
    capture('revenue_route_recommended', props);
  }

  function setupB2B(){
    var score = document.getElementById('score');
    var purchase = document.getElementById('purchasePanel');
    if(!score || !purchase) return;
    var box = routeBox('sp-b2b-decision-route', purchase);

    function update(){
      var n = Number(String(score.textContent || '').replace(/[^0-9.]/g,''));
      if(!Number.isFinite(n)) return;
      var paid = n >= 55;
      var cfg = paid ? {
        route:'workflow_audit_499', tier:'paid escalation',
        title:'This workflow is strong enough to justify a scoped audit.',
        body:'The diagnostic found enough operational leakage to move from general exploration to one concrete workflow decision.',
        href:'/workflow-audit.html?utm_source=stratumpraxis&utm_medium=diagnostic&utm_campaign=result_driven_route&utm_content=b2b_high_fit&route_id=b2b_result_to_499',
        cta:'Audit this workflow — $499', paid:true,
        note:'Fixed-scope written audit. No discovery call required.'
      } : {
        route:'workflow_roi_free', tier:'free evidence',
        title:'Size the economics before paying for an audit.',
        body:'The current answers do not yet justify a paid escalation. Estimate time, labor cost and payback first.',
        href:'https://roi.stratumpraxis.com/?utm_source=stratumpraxis&utm_medium=diagnostic&utm_campaign=result_driven_route&utm_content=b2b_low_fit&route_id=b2b_result_to_roi',
        cta:'Estimate ROI first →', paid:false,
        note:'Free planning calculator. Use a paid audit only when the workflow is material enough.'
      };
      render(box,cfg);
      trackRecommendation('sp_route_b2b_'+n,{tool:'b2b_workflow_diagnostic',score_band:paid?'55_plus':'under_55',route:cfg.route,route_tier:cfg.tier,paid_recommended:paid});
    }
    new MutationObserver(update).observe(score,{childList:true,subtree:true,characterData:true});
    update();
  }

  function setupEconomics(){
    var monthly = document.getElementById('monthlyCost');
    var net = document.getElementById('netValue');
    var audit = document.getElementById('auditBox');
    if(!monthly || !net || !audit) return;
    var box = routeBox('sp-economics-decision-route', audit);

    function update(){
      if(audit.hidden) return;
      var monthlyCost = moneyNumber(monthly.textContent);
      var netValue = moneyNumber(net.textContent);
      if(!Number.isFinite(monthlyCost) || !Number.isFinite(netValue)) return;
      var material = monthlyCost >= 500 || netValue < 0;
      var cfg = material ? {
        route:'ai_saas_spend_audit_499', tier:'paid escalation',
        title:'This looks material enough for a spend decision.',
        body:'The planning result shows either meaningful monthly cost or negative modeled net value. A fixed-scope review can test the assumptions and rightsizing options.',
        href:'/ai-saas-spend-waste-audit.html?utm_source=stratumpraxis&utm_medium=calculator&utm_campaign=result_driven_route&utm_content=material_economics&route_id=agent_economics_to_499_audit',
        cta:'Review the spend decision — $499', paid:true,
        note:'Routing heuristic only; the calculator result is not a savings guarantee.'
      } : {
        route:'ai_saas_waste_calculator_free', tier:'free evidence',
        title:'Keep validating before paying for a review.',
        body:'The modeled spend is not yet material enough to make a paid audit the default next step. Check broader AI and SaaS waste first.',
        href:'/ai-saas-waste-calculator.html?utm_source=stratumpraxis&utm_medium=calculator&utm_campaign=result_driven_route&utm_content=low_materiality&route_id=agent_economics_to_free_waste_check',
        cta:'Run the free spend check →', paid:false,
        note:'Paid escalation stays reserved for a larger or clearly negative operating decision.'
      };
      audit.hidden = !material;
      render(box,cfg);
      trackRecommendation('sp_route_econ_'+Math.round(monthlyCost)+'_'+(netValue<0?'neg':'pos'),{tool:'ai_agent_economics_calculator',route:cfg.route,route_tier:cfg.tier,paid_recommended:material,monthly_cost_band:monthlyCost>=500?'500_plus':'under_500',modeled_net_value_sign:netValue<0?'negative':'non_negative'});
    }
    new MutationObserver(update).observe(audit,{attributes:true,attributeFilter:['hidden']});
    new MutationObserver(update).observe(monthly,{childList:true,subtree:true,characterData:true});
  }

  function injectPriorityEntrances(){
    if(document.getElementById('sp-priority-entrances')) return;
    var path = location.pathname;
    var eligible = path === '/' || path === '/index.html' || path === '/live-lab.html' || path === '/product-router.html' || path === '/revenue-router.html' || path === '/passage-hub/' || path === '/return-gate/en/' || path.indexOf('/guides/') === 0 || path.indexOf('/systems/') === 0;
    if(!eligible) return;

    var main = document.querySelector('main') || document.body;
    var strip = document.createElement('section');
    strip.id = 'sp-priority-entrances';
    strip.setAttribute('aria-label','Priority decision tools');
    strip.style.cssText = 'width:min(1180px,calc(100% - 32px));margin:18px auto 32px;padding:14px;border:1px solid rgba(127,150,180,.24);border-radius:18px;background:rgba(255,255,255,.055);display:flex;gap:9px;align-items:center;flex-wrap:wrap;font:13px/1.4 Inter,system-ui,sans-serif';
    strip.innerHTML = '<strong style="margin-right:4px">Start with the decision:</strong>'+
      '<a href="/b2b/?utm_source=stratumpraxis&utm_medium=priority_entry&utm_campaign=revenue_entry&utm_content=workflow" data-priority-entry="workflow_diagnostic" style="padding:9px 12px;border:1px solid rgba(127,150,180,.3);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,255,255,.08)">Workflow diagnostic</a>'+
      '<a href="/ai-agent-economics-calculator.html?utm_source=stratumpraxis&utm_medium=priority_entry&utm_campaign=revenue_entry&utm_content=economics" data-priority-entry="agent_economics" style="padding:9px 12px;border:1px solid rgba(127,150,180,.3);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,255,255,.08)">Agent economics</a>'+
      '<a href="/agent-control-auditor.html?utm_source=stratumpraxis&utm_medium=priority_entry&utm_campaign=revenue_entry&utm_content=control" data-priority-entry="agent_control" style="padding:9px 12px;border:1px solid rgba(127,150,180,.3);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,255,255,.08)">Agent control</a>'+
      '<a href="/revenue-router.html?utm_source=stratumpraxis&utm_medium=priority_entry&utm_campaign=revenue_entry&utm_content=revenue_router" data-priority-entry="revenue_router" style="padding:9px 12px;border:1px solid rgba(127,150,180,.3);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,255,255,.08)">Revenue Router</a>';

    if(main.firstElementChild) main.insertBefore(strip, main.firstElementChild.nextSibling);
    else main.appendChild(strip);
    capture('priority_entry_exposure',{source_path:path,entries:'workflow_diagnostic,agent_economics,agent_control,revenue_router'});
  }

  function setupMarketIntake(){
    if(location.pathname !== '/revenue-router.html' || document.getElementById('sp-market-intake')) return;
    var main = document.querySelector('main');
    var hero = main && main.querySelector('.hero');
    if(!main || !hero) return;

    var style = document.createElement('style');
    style.textContent = '#sp-market-intake{padding:26px 0 72px}.sp-mi-shell{width:min(960px,calc(100% - 32px));margin:auto;padding:28px;border:1px solid rgba(23,25,31,.09);border-radius:28px;background:rgba(255,255,255,.78);box-shadow:0 22px 70px rgba(45,50,66,.08)}.sp-mi-kicker{font:800 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#6c7480}.sp-mi-shell h2{margin:8px 0 8px;font:760 clamp(30px,5vw,48px)/1.04 Inter,system-ui,sans-serif;letter-spacing:-.045em}.sp-mi-intro{margin:0 0 24px;color:#6d7480}.sp-mi-q{margin:18px 0}.sp-mi-q>strong{display:block;margin-bottom:9px;font:730 14px/1.3 Inter,system-ui,sans-serif}.sp-mi-options{display:flex;flex-wrap:wrap;gap:8px}.sp-mi-options button{border:1px solid rgba(23,25,31,.12);background:#fff;color:#23262d;border-radius:999px;padding:10px 13px;font:690 12px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.sp-mi-options button[aria-pressed="true"]{background:#17191f;color:#fff}.sp-mi-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:24px}.sp-mi-submit{border:0;border-radius:999px;padding:13px 18px;background:#17191f;color:#fff;font:760 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.sp-mi-submit:disabled{opacity:.42;cursor:not-allowed}.sp-mi-result{margin-top:24px;padding:22px;border-radius:22px;background:linear-gradient(135deg,#eef3ff,#f2ecff 52%,#eaf8f2);border:1px solid rgba(105,117,158,.12)}.sp-mi-result small{display:block;font:800 10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#67707c}.sp-mi-result strong{display:block;margin:7px 0;font:760 22px/1.18 Inter,system-ui,sans-serif;letter-spacing:-.025em}.sp-mi-result p{margin:0 0 15px;color:#626b76}.sp-mi-result a{display:inline-flex;padding:11px 15px;border-radius:999px;background:#17191f;color:#fff;text-decoration:none;font:760 12px/1.2 Inter,system-ui,sans-serif}.sp-mi-note{font:12px/1.5 Inter,system-ui,sans-serif;color:#838991}@media(max-width:700px){.sp-mi-shell{padding:21px}.sp-mi-options{display:grid;grid-template-columns:1fr}.sp-mi-options button{text-align:left}}';
    document.head.appendChild(style);

    var section = document.createElement('section');
    section.id = 'sp-market-intake';
    section.innerHTML = '<div class="sp-mi-shell"><div class="sp-mi-kicker">MARKET intake · free triage</div><h2>AI is in the picture. What should happen next?</h2><p class="sp-mi-intro">Answer four plain questions. You will get one next move, using an existing Stratum / MARKET route.</p>'+
      '<div class="sp-mi-q" data-mi-q="who"><strong>1. Which sounds closest to you?</strong><div class="sp-mi-options"><button data-v="individual">Individual / side income</button><button data-v="creator">Creator</button><button data-v="business">Company / small business</button><button data-v="agent">AI agent operator</button></div></div>'+
      '<div class="sp-mi-q" data-mi-q="asset"><strong>2. What do you already have?</strong><div class="sp-mi-options"><button data-v="none">Not much yet</button><button data-v="product">A product or offer</button><button data-v="audience">An audience</button><button data-v="buyers">Buyers / clients</button><button data-v="ai_stack">AI / SaaS spend</button><button data-v="agent_live">A working agent</button></div></div>'+
      '<div class="sp-mi-q" data-mi-q="goal"><strong>3. What are you trying to improve first?</strong><div class="sp-mi-options"><button data-v="income">Make income</button><button data-v="buyers">Get buyers</button><button data-v="workflow">Fix manual work</button><button data-v="roi">Know if AI spend is worth it</button><button data-v="control">Run agents safely</button><button data-v="paid_work">Find paid work</button></div></div>'+
      '<div class="sp-mi-q" data-mi-q="block"><strong>4. What is blocking you now?</strong><div class="sp-mi-options"><button data-v="dont_know">I do not know the next move</button><button data-v="no_buyers">People are not buying</button><button data-v="cost_unknown">Cost / ROI is unclear</button><button data-v="manual">Too much manual work</button><button data-v="risk">Agent permissions / risk</button><button data-v="no_offer">No clear offer yet</button></div></div>'+
      '<div class="sp-mi-actions"><button class="sp-mi-submit" type="button" disabled>Show my one next move</button><span class="sp-mi-note">No signup. This routes; it does not promise income.</span></div><div class="sp-mi-result" hidden aria-live="polite"></div></div>';
    hero.insertAdjacentElement('afterend',section);

    var state = {};
    var started = false;
    var submit = section.querySelector('.sp-mi-submit');
    var result = section.querySelector('.sp-mi-result');
    section.querySelectorAll('.sp-mi-options button').forEach(function(btn){
      btn.addEventListener('click',function(){
        var q = btn.closest('[data-mi-q]').dataset.miQ;
        btn.parentNode.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed','false');});
        btn.setAttribute('aria-pressed','true');
        state[q] = btn.dataset.v;
        if(!started){ started = true; capture('market_intake_start',{source_path:location.pathname}); }
        submit.disabled = !(state.who && state.asset && state.goal && state.block);
      });
    });

    function choose(){
      var cfg;
      if(state.goal === 'paid_work') cfg = {type:'paid_work',asset:'global_work_radar',title:'Go where the payer already exists.',body:'You are closer to revenue by applying to an open paid opportunity than by building another product.',href:'https://global-work-radar.pages.dev/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=paid_work',cta:'Open Global Work Radar →'};
      else if(state.who === 'business' && (state.goal === 'roi' || state.asset === 'ai_stack' || state.block === 'cost_unknown')) cfg = {type:'ai_spend_roi',asset:'ai_agent_economics',title:'Measure the economics before buying more AI.',body:'You already have the strongest signal for AI Spend / ROI work: money is going out, but value is unclear.',href:'/ai-agent-economics-calculator.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=business_roi&route_id=market_intake_to_agent_economics',cta:'Calculate cost per successful outcome →'};
      else if(state.who === 'business' && (state.goal === 'workflow' || state.block === 'manual')) cfg = {type:'workflow_bottleneck',asset:'b2b_workflow_diagnostic',title:'Pick the one workflow worth fixing first.',body:'Do not start with an AI stack. Start with the recurring workflow whose delay or labor cost is material.',href:'/b2b/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=business_workflow&route_id=market_intake_to_b2b',cta:'Run the workflow diagnostic →'};
      else if(state.who === 'agent' || state.asset === 'agent_live'){
        if(state.goal === 'roi' || state.block === 'cost_unknown') cfg = {type:'agent_economics',asset:'ai_agent_economics',title:'Find the real cost of one successful agent outcome.',body:'Retries, failures, tools and human review matter more than token price alone.',href:'/ai-agent-economics-calculator.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=agent_roi&route_id=market_intake_agent_to_economics',cta:'Run Agent Economics →'};
        else cfg = {type:'agent_control',asset:'agent_control_auditor',title:'Set the stop lines before adding more autonomy.',body:'Your next value is not another capability. It is knowing where permissions, money and side effects require a human gate.',href:'/agent-control-auditor.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=agent_control&route_id=market_intake_to_agent_control',cta:'Audit agent control →'};
      }
      else if((state.asset === 'product' || state.asset === 'audience') && (state.goal === 'buyers' || state.block === 'no_buyers')) cfg = {type:'buyer_acquisition',asset:'offer_optimizer',title:'Fix the offer-to-buyer match before making more content.',body:'You already have something to sell. The bottleneck is now buyer clarity, not asset creation.',href:'https://stratum-offer-optimizer.pages.dev/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=buyer_gap',cta:'Pressure-test the offer →'};
      else if(state.who === 'creator' && state.asset === 'audience') cfg = {type:'creator_monetization',asset:'ai_monetization_reality_check',title:'Choose a revenue model that fits the audience you already have.',body:'The next move is to test monetization fit, not publish more AI content for its own sake.',href:'/ai-monetization-reality-check.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=creator_audience',cta:'Check monetization fit →'};
      else if(state.goal === 'income' && state.asset === 'none') cfg = {type:'income_reality',asset:'ai_income_claim_checklist',title:'Test the income claim before choosing a business model.',body:'You are early enough that avoiding a weak revenue model matters more than picking another AI tool.',href:'/ai-income-claim-checklist.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=income_early',cta:'Run the free income check →'};
      else cfg = {type:'broad_triage',asset:'ai_workflow_consultant',title:'Find the bottleneck before choosing the tool.',body:'Your answers do not point to a narrow paid route yet. Start with the broad free consultant and let the bottleneck decide the next step.',href:'/ai-consultant.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=broad_triage',cta:'Take the free AI Consultant →'};
      return cfg;
    }

    submit.addEventListener('click',function(){
      var cfg = choose();
      result.hidden = false;
      result.innerHTML = '<small>Your one next move</small><strong>'+cfg.title+'</strong><p>'+cfg.body+'</p><a href="'+cfg.href+'" data-market-intake-cta="'+cfg.asset+'">'+cfg.cta+'</a>';
      capture('market_intake_complete',{result_type:cfg.type,routed_asset:cfg.asset,who:state.who,asset_state:state.asset,goal:state.goal,bottleneck:state.block});
      capture('market_intake_routed',{result_type:cfg.type,routed_asset:cfg.asset});
      result.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  document.addEventListener('pointerdown',function(e){
    var link = e.target.closest('a[data-revenue-route]');
    if(link){
      capture('revenue_route_click',{
        route:link.dataset.revenueRoute || '',
        paid:link.dataset.paid === 'true',
        source_path:location.pathname,
        destination_path:(function(){try{return new URL(link.href,location.href).pathname}catch(_){return ''}})()
      });
    }
    var priority = e.target.closest('a[data-priority-entry]');
    if(priority){
      capture('priority_entry_click',{
        entry:priority.dataset.priorityEntry || '',
        source_path:location.pathname,
        destination_path:(function(){try{return new URL(priority.href,location.href).pathname}catch(_){return ''}})()
      });
    }
    var intake = e.target.closest('a[data-market-intake-cta]');
    if(intake){
      capture('market_intake_cta_click',{
        routed_asset:intake.dataset.marketIntakeCta || '',
        source_path:location.pathname,
        destination_path:(function(){try{return new URL(intake.href,location.href).pathname}catch(_){return ''}})()
      });
    }
  });

  function boot(){ setupB2B(); setupEconomics(); injectPriorityEntrances(); setupMarketIntake(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
