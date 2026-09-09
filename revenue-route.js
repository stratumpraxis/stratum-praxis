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

  document.addEventListener('pointerdown',function(e){
    var link = e.target.closest('a[data-revenue-route]');
    if(!link) return;
    capture('revenue_route_click',{
      route:link.dataset.revenueRoute || '',
      paid:link.dataset.paid === 'true',
      source_path:location.pathname,
      destination_path:(function(){try{return new URL(link.href,location.href).pathname}catch(_){return ''}})()
    });
  });

  function boot(){ setupB2B(); setupEconomics(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
