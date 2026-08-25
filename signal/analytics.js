(() => {
  const API_KEY='phc_oTYapRSNXDtn8aY7wMNHfCDexRTkfb2H44MDVXwoUMSN';
  const ENDPOINT='https://us.i.posthog.com/i/v0/e/';
  const storageKey='signal_praxis_anon_id';
  let distinctId=localStorage.getItem(storageKey);
  if(!distinctId){distinctId=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`);localStorage.setItem(storageKey,distinctId)}
  function capture(event,properties={}){
    const body=JSON.stringify({api_key:API_KEY,event,properties:{distinct_id:distinctId,$current_url:location.href,$referrer:document.referrer||'',page_path:location.pathname,media_brand:'Signal Praxis',...properties},timestamp:new Date().toISOString()});
    try{if(navigator.sendBeacon){navigator.sendBeacon(ENDPOINT,new Blob([body],{type:'application/json'}))}else{fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,mode:'cors'}).catch(()=>{})}}catch(_){}
  }
  capture('funnel_view',{funnel:'signal_praxis',content_type:document.querySelector('article')?'article':'hub'});
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href]'); if(!link)return;
    const track=link.dataset.track||'';
    if(track==='article')capture('signal_article_click',{article:link.dataset.article||link.getAttribute('href')});
    if(track==='tool')capture('primary_cta_click',{funnel:'signal_praxis',cta:link.dataset.cta||'',destination:link.href});
    if(track==='distribution')capture('signal_distribution_click',{channel:link.dataset.channel||'',destination:link.href});
    if(link.origin!==location.origin)capture('signal_outbound_click',{destination:link.href,link_text:(link.textContent||'').trim().slice(0,120)});
  },{passive:true});
  window.SignalAnalytics={capture};
})();