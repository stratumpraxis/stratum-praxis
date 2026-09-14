(()=>{'use strict';
const path=location.pathname.replace(/index\.html$/,'');
if(path!=='/'&&path!=='/money-resilience/'&&path!=='/money-resilience')return;
const capture=(name,props={})=>{try{window.scosCapture?.(name,props)}catch(_){}};
const fix=()=>{document.querySelectorAll('a[href*="72-hour-household-readiness"]').forEach(a=>a.remove());document.querySelectorAll('a').forEach(a=>{if(a.href&&a.href.includes('/money-resilience/'))a.href=a.href.replace('/money-resilience/','/')});document.documentElement.dataset.moneyStandalone='true';capture('money_resilience_standalone_ready',{version:'2026-09-14'});};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});else fix();
})();