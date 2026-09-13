(()=>{'use strict';
function applyStandalone(){
  const canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href=location.origin+'/';
  const og=document.querySelector('meta[property="og:url"]');if(og)og.content=location.origin+'/';
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const j=JSON.parse(s.textContent);if(j&&j['@type']==='WebApplication'){j.url=location.origin+'/';s.textContent=JSON.stringify(j)}}catch(e){}});
  document.querySelectorAll('a[href*="72-hour-household-readiness"]').forEach(a=>a.remove());
  document.querySelectorAll('p').forEach(p=>{if(p.textContent.includes('72H Home Readiness Utility'))p.textContent='入力値はこのブラウザ内で計算し、このUtility単独で完結します。';});
  const preload=document.querySelector('[data-seo-preload="money"]');if(preload){const a=preload.querySelector('a');if(a)a.remove();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyStandalone,{once:true});else applyStandalone();
})();
