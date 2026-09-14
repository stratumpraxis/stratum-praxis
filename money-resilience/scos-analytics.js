(()=>{'use strict';
// Temporary compatibility for the legacy Market Pulse startup guard.
// Expose the old path only until the engine has initialized, then restore the
// public standalone root immediately. DOMContentLoaded remains a safe fallback.
const standaloneRoot=location.pathname==='/'||location.pathname==='/index.html';
if(!standaloneRoot)return;
const restore=()=>{try{history.replaceState(history.state,'','/')}catch(_){ }};
try{history.replaceState(history.state,'','/money-resilience/')}catch(_){ }
let observer;
try{
  observer=new MutationObserver(()=>{
    if(document.body&&document.body.classList.contains('mr-vnext-body')){
      restore();
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
}catch(_){ }
addEventListener('DOMContentLoaded',()=>{restore();try{observer&&observer.disconnect()}catch(_){ }},{once:true});
})();
