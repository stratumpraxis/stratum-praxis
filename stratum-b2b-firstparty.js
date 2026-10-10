(function(){
  'use strict';
  const ENDPOINT='https://fzqgpaxqolrjjhmxdcrf.supabase.co/functions/v1/stratum-b2b-funnel-sensor';
  const SESSION_KEY='sp_b2b_firstparty_session_v1';
  const EVENT_MAP={
    b2b_diagnostic_start:'DIAGNOSTIC_START',
    b2b_diagnostic_complete:'DIAGNOSTIC_COMPLETE',
    b2b_diagnostic_audit_click:'DIAGNOSTIC_AUDIT_CLICK'
  };
  let lastTrustedAt=0;

  function uuid(){
    if(crypto.randomUUID)return crypto.randomUUID();
    const a=crypto.getRandomValues(new Uint8Array(16));
    return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function sessionKey(){
    try{
      let v=sessionStorage.getItem(SESSION_KEY);
      if(!v){v=uuid();sessionStorage.setItem(SESSION_KEY,v)}
      return v;
    }catch(_){return uuid()}
  }
  function host(v){
    try{return new URL(v).hostname.replace(/^www\./,'').slice(0,160)}catch(_){return''}
  }
  function route(){
    return location.pathname.startsWith('/b2b-intro')?'b2b_intro':'b2b_diagnostic';
  }
  function utm(){
    const p=new URLSearchParams(location.search);
    return {
      utm_source:(p.get('utm_source')||'').slice(0,100),
      utm_medium:(p.get('utm_medium')||'').slice(0,100),
      utm_campaign:(p.get('utm_campaign')||'').slice(0,160),
      utm_content:(p.get('utm_content')||'').slice(0,160)
    };
  }
  function send(eventType,extra){
    const payload=Object.assign({
      event_id:uuid(),
      route_id:route(),
      event_type:eventType,
      path:location.pathname,
      referrer_host:host(document.referrer),
      session_key:sessionKey(),
      input_trusted:(Date.now()-lastTrustedAt)<5000,
      webdriver:Boolean(navigator.webdriver),
      qa:new URLSearchParams(location.search).get('qa')==='1'
    },utm(),extra||{});
    const body=JSON.stringify(payload);
    // Prefer an acknowledged delivery. sendBeacon only confirms queueing, not receipt.
    let queued=false;
    const beacon=()=>{
      if(queued)return;
      queued=true;
      try{navigator.sendBeacon(ENDPOINT,new Blob([body],{type:'text/plain;charset=UTF-8'}))}catch(_){}
    };
    try{
      fetch(ENDPOINT,{method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},body,keepalive:true,mode:'cors',credentials:'omit'})
        .then(r=>{if(!r.ok)beacon()})
        .catch(beacon);
    }catch(_){beacon()}
  }

  ['pointerdown','click','input','change','keydown'].forEach(name=>{
    document.addEventListener(name,e=>{if(e.isTrusted)lastTrustedAt=Date.now()},{capture:true,passive:name==='pointerdown'});
  });

  window.stratumB2BCapture=function(name,props){
    const mapped=EVENT_MAP[name];
    if(mapped)send(mapped,props||{});
  };

  if(location.pathname.startsWith('/b2b-intro')){
    let engaged=false;
    const mark=()=>{
      if(engaged||document.visibilityState!=='visible')return;
      engaged=true;
      send('INTRO_ENGAGED',{dwell_ms:4000});
    };
    setTimeout(mark,4000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(mark,4000)},{passive:true});
    document.addEventListener('pointerdown',e=>{
      const a=e.target&&e.target.closest?e.target.closest('a[data-analytics-id]'):null;
      if(!a||!e.isTrusted)return;
      send('INTRO_CTA_CLICK',{input_trusted:true});
    },{capture:true,passive:true});
  }
})();
