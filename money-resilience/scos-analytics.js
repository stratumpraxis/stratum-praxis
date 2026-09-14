(()=>{'use strict';
// Standalone deployment compatibility: the legacy market engine still checks
// /money-resilience/ at startup. Present that path only while deferred scripts
// initialize, then restore the public standalone root before DOMContentLoaded.
const standaloneRoot=location.pathname==='/'||location.pathname==='/index.html';
if(standaloneRoot){
  try{history.replaceState(history.state,'','/money-resilience/')}catch(_){ }
  addEventListener('DOMContentLoaded',()=>{try{history.replaceState(history.state,'','/')}catch(_){ }},{once:true});
}
})();
