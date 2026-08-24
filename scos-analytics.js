(function(){
  const TOKEN='phc_oTYapRSNXDtn8aY7wMNHfCDexRTkfb2H44MDVXwoUMSN';
  const HOST='https://us.i.posthog.com';
  const params=new URLSearchParams(location.search);
  const attribution={
    utm_source:params.get('utm_source')||'',
    utm_medium:params.get('utm_medium')||'',
    utm_campaign:params.get('utm_campaign')||'',
    utm_content:params.get('utm_content')||'',
    referrer:document.referrer||'',
    path:location.pathname
  };
  function bootstrap(){
    if(window.posthog&&window.posthog.__SV)return;
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split('.');2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement('script')).type='text/javascript',p.crossOrigin='anonymous',p.async=!0,p.src=s.api_host.replace('.i.posthog.com','-assets.i.posthog.com')+'/static/array.js';(r=t.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a='posthog',u.people=u.people||[],u.toString=function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e},u.people.toString=function(){return u.toString(1)+'.people (stub)'},o='init capture register register_once unregister set_config reset opt_out_capturing has_opted_out_capturing opt_in_capturing identify alias setPersonProperties group resetGroups'.split(' '),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  }
  bootstrap();
  window.posthog.init(TOKEN,{api_host:HOST,ui_host:'https://us.posthog.com',person_profiles:'identified_only',capture_pageview:false,capture_pageleave:true,disable_session_recording:true});
  window.scosCapture=function(name,props){
    try{window.posthog.capture(name,Object.assign({},attribution,props||{}));}catch(e){}
  };
  window.scosIdentify=function(id,props){
    try{window.posthog.identify(id,props||{});}catch(e){}
  };
  window.scosAttribution=attribution;
})();
