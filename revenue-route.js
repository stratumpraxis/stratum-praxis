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
    var eligible = path === '/' || path === '/index.html' || path === '/live-lab.html' || path === '/product-router.html' || path === '/passage-hub/' || path === '/return-gate/en/' || path.indexOf('/guides/') === 0 || path.indexOf('/systems/') === 0;
    if(!eligible) return;

    var main = document.querySelector('main') || document.body;
    var strip = document.createElement('section');
    strip.id = 'sp-priority-entrances';
    strip.setAttribute('aria-label','Priority decision tools');
    strip.style.cssText = 'width:min(1180px,calc(100% - 32px));margin:18px auto 32px;padding:14px;border:1px solid rgba(127,150,180,.24);border-radius:18px;background:rgba(255,255,255,.055);display:flex;gap:9px;align-items:center;flex-wrap:wrap;font:13px/1.4 Inter,system-ui,sans-serif';
    strip.innerHTML = '<strong style="margin-right:4px">Not sure what to do next?</strong>'+ 
      '<a href="/revenue-router.html?utm_source=stratumpraxis&utm_medium=priority_entry&utm_campaign=market_intake&utm_content=common_front_door&route_id=priority_to_market_intake" data-priority-entry="revenue_router" style="padding:9px 12px;border:1px solid rgba(127,150,180,.3);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,255,255,.08);font-weight:750">Get one next move →</a>'+ 
      '<a href="/agent-control-auditor.html?utm_source=stratumpraxis&utm_medium=priority_entry&utm_campaign=revenue_entry&utm_content=control" data-priority-entry="agent_control" style="padding:9px 12px;border:1px solid rgba(127,150,180,.3);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,255,255,.08)">Agent control</a>'+ 
      '<a href="/ai-saas-waste-calculator.html?utm_source=stratumpraxis&utm_medium=priority_entry&utm_campaign=revenue_entry&utm_content=spend" data-priority-entry="ai_spend" style="padding:9px 12px;border:1px solid rgba(127,150,180,.3);border-radius:999px;text-decoration:none;color:inherit;background:rgba(255,255,255,.08)">AI / SaaS spend</a>';

    if(main.firstElementChild) main.insertBefore(strip, main.firstElementChild.nextSibling);
    else main.appendChild(strip);
    capture('priority_entry_exposure',{source_path:path,entries:'revenue_router,agent_control,ai_spend'});
  }

  function setupMarketIntake(){
    if(location.pathname !== '/revenue-router.html' || document.getElementById('sp-market-intake')) return;
    var main = document.querySelector('main');
    var hero = main && main.querySelector('.hero');
    if(!main || !hero) return;

    var style = document.createElement('style');
    style.textContent = '#sp-market-intake{padding:42px 0 30px;background:linear-gradient(180deg,#eef3ff 0%,#f6f7fb 100%);border-bottom:1px solid rgba(23,25,31,.07)}.sp-mi-shell{width:min(960px,calc(100% - 32px));margin:auto;padding:30px;border:1px solid rgba(23,25,31,.09);border-radius:28px;background:rgba(255,255,255,.88);box-shadow:0 22px 70px rgba(45,50,66,.08)}.sp-mi-kicker{font:800 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#596471}.sp-mi-shell h2{margin:8px 0 10px;font:780 clamp(34px,5vw,54px)/1.02 Inter,system-ui,sans-serif;letter-spacing:-.05em}.sp-mi-intro{margin:0 0 25px;color:#626b77;font-size:16px}.sp-mi-q{margin:19px 0}.sp-mi-q>strong{display:block;margin-bottom:9px;font:730 14px/1.3 Inter,system-ui,sans-serif}.sp-mi-options{display:flex;flex-wrap:wrap;gap:8px}.sp-mi-options button{min-height:42px;border:1px solid rgba(23,25,31,.12);background:#fff;color:#23262d;border-radius:999px;padding:10px 13px;font:690 12px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.sp-mi-options button[aria-pressed="true"]{background:#17191f;color:#fff;border-color:#17191f}.sp-mi-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:25px}.sp-mi-submit{min-height:46px;border:0;border-radius:999px;padding:13px 18px;background:#17191f;color:#fff;font:760 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.sp-mi-submit:disabled{opacity:.42;cursor:not-allowed}.sp-mi-result{margin-top:24px;padding:23px;border-radius:22px;background:linear-gradient(135deg,#eef3ff,#f2ecff 52%,#eaf8f2);border:1px solid rgba(105,117,158,.12)}.sp-mi-result small{display:block;font:800 10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#67707c}.sp-mi-result strong{display:block;margin:7px 0;font:780 23px/1.16 Inter,system-ui,sans-serif;letter-spacing:-.03em}.sp-mi-result p{margin:0 0 15px;color:#626b76}.sp-mi-result a{display:inline-flex;min-height:44px;align-items:center;padding:11px 15px;border-radius:999px;background:#17191f;color:#fff;text-decoration:none;font:760 12px/1.2 Inter,system-ui,sans-serif}.sp-mi-note{font:12px/1.5 Inter,system-ui,sans-serif;color:#838991}.sp-mi-proof{margin-top:16px;display:flex;gap:7px;flex-wrap:wrap}.sp-mi-proof span{padding:6px 9px;border:1px solid rgba(23,25,31,.08);border-radius:999px;background:#f8f9fb;color:#707782;font:650 11px/1.2 Inter,system-ui,sans-serif}@media(max-width:700px){#sp-market-intake{padding:24px 0 20px}.sp-mi-shell{width:min(100% - 22px,960px);padding:20px 17px;border-radius:22px}.sp-mi-shell h2{font-size:clamp(32px,11vw,46px)}.sp-mi-options{display:grid;grid-template-columns:1fr}.sp-mi-options button{text-align:left;width:100%}.sp-mi-actions{display:grid;grid-template-columns:1fr}.sp-mi-submit{width:100%}}';
    document.head.appendChild(style);

    var section = document.createElement('section');
    section.id = 'sp-market-intake';
    section.setAttribute('aria-label','MARKET revenue intake');
    section.innerHTML = '<div class="sp-mi-shell"><div class="sp-mi-kicker">MARKET intake · free</div><h2>AI is already part of your work. Not sure what to do next?</h2><p class="sp-mi-intro">Choose four plain answers. You get one next move — routed into an existing Stratum / MARKET asset, not another list of ideas.</p>'+ 
      '<div class="sp-mi-q" data-mi-q="who"><strong>1. Which sounds closest to you?</strong><div class="sp-mi-options"><button type="button" data-v="individual">Individual / side income</button><button type="button" data-v="creator">Creator</button><button type="button" data-v="business">Company / small business</button><button type="button" data-v="agent">AI agent operator</button></div></div>'+ 
      '<div class="sp-mi-q" data-mi-q="asset"><strong>2. What do you already have?</strong><div class="sp-mi-options"><button type="button" data-v="none">Not much yet</button><button type="button" data-v="product">A product or offer</button><button type="button" data-v="audience">An audience</button><button type="button" data-v="buyers">Buyers / clients</button><button type="button" data-v="ai_stack">AI / SaaS spend</button><button type="button" data-v="agent_live">A working agent</button></div></div>'+ 
      '<div class="sp-mi-q" data-mi-q="goal"><strong>3. What are you trying to improve first?</strong><div class="sp-mi-options"><button type="button" data-v="income">Make income</button><button type="button" data-v="buyers">Get buyers</button><button type="button" data-v="workflow">Fix manual work</button><button type="button" data-v="roi">Know if AI spend is worth it</button><button type="button" data-v="control">Run agents safely</button><button type="button" data-v="paid_work">Find paid work</button></div></div>'+ 
      '<div class="sp-mi-q" data-mi-q="block"><strong>4. What is blocking you now?</strong><div class="sp-mi-options"><button type="button" data-v="dont_know">I do not know the next move</button><button type="button" data-v="no_buyers">People are not buying</button><button type="button" data-v="cost_unknown">Cost / ROI is unclear</button><button type="button" data-v="manual">Too much manual work</button><button type="button" data-v="scale">AI pilots are not scaling</button><button type="button" data-v="duplication">Too many tools / seats</button><button type="button" data-v="risk">Agent permissions / risk</button><button type="button" data-v="no_offer">No clear offer yet</button></div></div>'+ 
      '<div class="sp-mi-actions"><button class="sp-mi-submit" type="button" disabled>Show my one next move</button><span class="sp-mi-note">No signup. No guaranteed income. The point is to choose the next route.</span></div><div class="sp-mi-result" hidden aria-live="polite"></div><div class="sp-mi-proof"><span>Uses existing assets</span><span>One result only</span><span>Measured through the next CTA</span></div></div>';
    hero.insertAdjacentElement('beforebegin',section);

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
        if(!started){
          started = true;
          capture('market_intake_start',{tool:'revenue_router',source_path:location.pathname});
        }
        submit.disabled = !(state.who && state.asset && state.goal && state.block);
      });
    });

    function choose(){
      var cfg;

      if(state.goal === 'paid_work'){
        cfg = {type:'paid_work',asset:'global_work_radar',title:'Go where the payer already exists.',body:'You are closer to revenue by applying to an open paid opportunity than by building another product.',href:'https://global-work-radar.pages.dev/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=paid_work&route_id=market_intake_to_gwr',cta:'Find an open paid route →'};
      }
      else if(state.who === 'business' && (state.asset === 'ai_stack' || state.goal === 'roi' || state.block === 'cost_unknown' || state.block === 'duplication')){
        cfg = {type:'ai_spend_roi',asset:'ai_saas_waste_calculator',title:'Measure where the AI / SaaS money is leaking first.',body:'Money is already going out. Before buying another tool or tier, check duplication, unused capacity and unclear ROI.',href:'/ai-saas-waste-calculator.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=business_spend&route_id=market_intake_to_waste_calculator',cta:'Run the AI / SaaS spend check →'};
      }
      else if(state.who === 'business' && state.asset === 'buyers' && state.goal === 'workflow' && (state.block === 'manual' || state.block === 'scale')){
        cfg = {type:'workflow_paid_ready',asset:'workflow_opportunity_audit_499',title:'Skip more browsing. Audit the workflow you already know is hurting.',body:'You already have a live business and a clear workflow bottleneck. The shortest commercial route is a fixed-scope decision on what to automate, what to keep human, and why.',href:'/workflow-audit.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=business_clear_pain&route_id=market_intake_to_workflow_audit_499',cta:'See the $499 Workflow Opportunity Audit →'};
      }
      else if(state.who === 'business' && (state.goal === 'workflow' || state.block === 'manual' || state.block === 'scale')){
        cfg = {type:'workflow_bottleneck',asset:'small_business_ai_automation_audit',title:'Find the one workflow worth fixing before choosing another AI tool.',body:'Your bottleneck is operational. Start by locating the repeatable workflow with enough time or labor cost to justify automation.',href:'https://small-business-ai-audit.pages.dev/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=business_workflow&route_id=market_intake_to_small_business_audit',cta:'Run the Small Business AI Audit →'};
      }
      else if(state.who === 'agent' || state.asset === 'agent_live'){
        if(state.goal === 'roi' || state.block === 'cost_unknown'){
          cfg = {type:'agent_roi',asset:'roi_calculator',title:'Put a number on the agent before adding more autonomy.',body:'Measure time saved, operating cost and payback before expanding the system.',href:'https://roi.stratumpraxis.com/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=agent_roi&route_id=market_intake_agent_to_roi',cta:'Calculate the ROI →'};
        } else {
          cfg = {type:'agent_control',asset:'agent_control_auditor',title:'Set the stop lines before adding more autonomy.',body:'The next value is not another capability. It is knowing where permissions, money and external side effects require a human gate.',href:'/agent-control-auditor.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=agent_control&route_id=market_intake_to_agent_control',cta:'Audit agent control →'};
        }
      }
      else if((state.asset === 'product' || state.asset === 'audience') && (state.goal === 'buyers' || state.block === 'no_buyers')){
        cfg = {type:'buyer_acquisition',asset:'offer_optimizer',title:'Fix the offer-to-buyer match before making more content.',body:'You already have something to sell. The bottleneck is buyer clarity, not asset creation.',href:'https://stratum-offer-optimizer.pages.dev/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=buyer_gap&route_id=market_intake_to_offer_optimizer',cta:'Pressure-test the offer →'};
      }
      else if(state.who === 'creator' && (state.asset === 'audience' || state.asset === 'product')){
        cfg = {type:'creator_monetization',asset:'ai_monetization_reality_check',title:'Choose the revenue model that fits what you already have.',body:'Your next move is to test monetization fit, not publish more AI content for its own sake.',href:'/ai-monetization-reality-check.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=creator_monetization&route_id=market_intake_to_monetization_reality',cta:'Check monetization fit →'};
      }
      else if((state.who === 'individual' || state.who === 'creator') && (state.asset === 'none' || state.block === 'no_offer' || state.block === 'dont_know')){
        cfg = {type:'capability_first',asset:'ai_practical_check',title:'Start with what you can already do well enough to monetize.',body:'You do not need another business model yet. First identify the AI work you can actually execute, then route from capability into a revenue path.',href:'https://ai-practical-check.pages.dev/?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=capability_first&route_id=market_intake_to_ai_practical_check',cta:'Take the AI practical check →'};
      }
      else if(state.who === 'business'){
        cfg = {type:'business_triage',asset:'ai_workflow_consultant',title:'Find the bottleneck before choosing the tool.',body:'Your answers do not justify a paid escalation yet. Use the existing workflow consultant to identify the operational decision first.',href:'/ai-consultant.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=business_triage&route_id=market_intake_to_ai_consultant',cta:'Find the business bottleneck →'};
      }
      else {
        cfg = {type:'monetization_triage',asset:'ai_monetization_reality_check',title:'Test the revenue model before building more.',body:'The fastest next step is to rule out weak monetization paths and keep only the one that fits your current assets and audience.',href:'/ai-monetization-reality-check.html?utm_source=stratumpraxis&utm_medium=revenue_router&utm_campaign=market_intake&utm_content=broad_monetization&route_id=market_intake_to_monetization_reality',cta:'Check the monetization route →'};
      }
      return cfg;
    }

    submit.addEventListener('click',function(){
      var cfg = choose();
      var props = {tool:'revenue_router',result_type:cfg.type,routed_asset:cfg.asset,audience_type:state.who,asset_state:state.asset,goal:state.goal,bottleneck:state.block};
      result.hidden = false;
      result.innerHTML = '<small>Do this first</small><strong>'+cfg.title+'</strong><p>'+cfg.body+'</p><a href="'+cfg.href+'" data-market-intake-cta="'+cfg.asset+'" data-primary-cta="true">'+cfg.cta+'</a>';
      capture('market_intake_complete',props);
      capture('market_intake_routed',props);
      capture('qualified_tool_action',Object.assign({},props,{action:'complete_and_route'}));
      result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
    });
  }

  document.addEventListener('pointerdown',function(e){
    var link = e.target.closest('a[data-revenue-route]');
    if(link){
      capture('revenue_route_click',{route:link.dataset.revenueRoute || '',paid:link.dataset.paid === 'true',source_path:location.pathname,destination_path:(function(){try{return new URL(link.href,location.href).pathname}catch(_){return ''}})()});
    }
    var priority = e.target.closest('a[data-priority-entry]');
    if(priority){
      capture('priority_entry_click',{entry:priority.dataset.priorityEntry || '',source_path:location.pathname,destination_path:(function(){try{return new URL(priority.href,location.href).pathname}catch(_){return ''}})()});
    }
    var intake = e.target.closest('a[data-market-intake-cta]');
    if(intake){
      capture('market_intake_cta_click',{routed_asset:intake.dataset.marketIntakeCta || '',source_path:location.pathname,destination_path:(function(){try{return new URL(intake.href,location.href).pathname}catch(_){return ''}})()});
    }
  });

  function boot(){ setupB2B(); setupEconomics(); injectPriorityEntrances(); setupMarketIntake(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();