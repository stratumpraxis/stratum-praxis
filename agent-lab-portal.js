(function(){
  'use strict';

  var path=location.pathname;
  var eligible=path==='/cross-agent-operating-kit.html'||path==='/agent-control-auditor.html'||path==='/systems/'||path==='/systems/index.html';

  document.querySelectorAll('a[data-analytics-id="agent_lab_founding_network"]').forEach(function(link){link.remove();});
  var oldCross=document.querySelector('a[data-analytics-id="agent_lab_from_cross_agent"]');
  if(oldCross){var p=oldCross.closest('p');if(p&&p.children.length===1)p.remove();else oldCross.remove();}
  if(!eligible||document.getElementById('agent-lab-visual-entry'))return;

  var style=document.createElement('style');
  style.textContent=`
  #agent-lab-visual-entry{width:min(1120px,calc(100% - 32px));margin:20px auto 42px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  #agent-lab-visual-entry *{box-sizing:border-box}
  .al-portal{position:relative;display:grid;grid-template-columns:minmax(300px,.9fr) 1.1fr;min-height:260px;overflow:hidden;border:1px solid #27384f;border-radius:28px;background:linear-gradient(145deg,#0a1018,#0b121c 55%,#0d1720);color:#f5f7fb;text-decoration:none;box-shadow:0 28px 80px rgba(0,0,0,.22);isolation:isolate}
  .al-portal:before{content:"";position:absolute;inset:0;background:radial-gradient(520px 300px at 20% 45%,rgba(114,232,201,.13),transparent 68%),radial-gradient(430px 260px at 84% 10%,rgba(121,217,255,.10),transparent 70%);z-index:-1}
  .al-viz{position:relative;min-height:260px;border-right:1px solid rgba(255,255,255,.08);overflow:hidden;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:42px 42px}
  .al-core{position:absolute;left:50%;top:48%;translate:-50% -50%;width:90px;height:90px;border:1px solid rgba(114,232,201,.52);border-radius:26px;display:grid;place-items:center;background:radial-gradient(circle,rgba(114,232,201,.18),rgba(9,15,23,.86) 68%);box-shadow:0 0 55px rgba(114,232,201,.14);font-size:10px;font-weight:900;letter-spacing:.16em;color:#d6fff4}
  .al-node{position:absolute;width:72px;height:34px;border:1px solid #31445e;border-radius:11px;background:#0a111a;display:grid;place-items:center;color:#9fabb9;font-size:8px;font-weight:850;letter-spacing:.14em}
  .al-n1{left:9%;top:18%;animation:alFloat 4.2s ease-in-out infinite}.al-n2{right:9%;top:22%;animation:alFloat 5s ease-in-out infinite reverse}.al-n3{left:12%;bottom:18%;animation:alFloat 5.4s ease-in-out infinite reverse}.al-n4{right:10%;bottom:17%;animation:alFloat 4.7s ease-in-out infinite}
  .al-beam{position:absolute;left:28%;right:28%;top:48%;height:1px;background:linear-gradient(90deg,transparent,#72e8c9,transparent);transform-origin:center;animation:alPulse 2.9s ease-in-out infinite}.al-b2{rotate:90deg}.al-b3{rotate:45deg}.al-b4{rotate:-45deg}
  .al-members{position:absolute;left:18px;bottom:16px;display:flex;align-items:center}.al-members i{width:18px;height:18px;border:2px solid #0a1018;border-radius:50%;margin-left:-4px;background:linear-gradient(145deg,#72e8c9,#79d9ff);opacity:.78}.al-members i:first-child{margin-left:0}.al-members span{margin-left:8px;color:#758396;font-size:8px;letter-spacing:.12em}
  .al-copy{display:flex;flex-direction:column;justify-content:center;padding:30px 34px;min-width:0}.al-kicker{font-size:9px;letter-spacing:.18em;color:#72e8c9;font-weight:900;text-transform:uppercase}.al-copy h2{margin:10px 0 8px;font-size:clamp(28px,4vw,46px);line-height:.98;letter-spacing:-.045em;color:#f5f7fb}.al-line{margin:0;color:#98a5b5;font-size:13px}.al-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:20px}.al-chips span{padding:6px 8px;border:1px solid rgba(255,255,255,.10);border-radius:999px;background:rgba(255,255,255,.035);color:#aab5c3;font-size:9px;letter-spacing:.08em}.al-open{display:flex;align-items:center;justify-content:space-between;margin-top:22px;padding-top:17px;border-top:1px solid rgba(255,255,255,.09);font-size:11px;font-weight:850;letter-spacing:.06em;color:#e8edf4}.al-open b{font-size:22px;font-weight:500;transition:transform .2s ease}.al-portal:hover .al-open b{transform:translateX(5px)}
  @keyframes alFloat{50%{transform:translateY(-7px)}}@keyframes alPulse{50%{opacity:.2;scale:.74}}
  @media(max-width:720px){#agent-lab-visual-entry{width:min(100% - 22px,620px);margin:14px auto 28px}.al-portal{grid-template-columns:1fr;min-height:0;border-radius:24px}.al-viz{min-height:230px;border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.al-copy{padding:20px 20px 22px}.al-copy h2{font-size:30px}.al-chips{margin-top:15px}.al-open{margin-top:17px}}
  @media(prefers-reduced-motion:reduce){.al-node,.al-beam{animation:none!important}}
  `;
  document.head.appendChild(style);

  var section=document.createElement('aside');
  section.id='agent-lab-visual-entry';
  section.setAttribute('aria-label','Agent Lab field community');
  var source=path==='/cross-agent-operating-kit.html'?'cross_agent':path.indexOf('/systems/')===0?'systems_library':'agent_control_auditor';
  section.innerHTML='<a class="al-portal" href="/agent-lab/?utm_source=stratumpraxis&utm_medium=visual_portal&utm_campaign=agent_lab_entry&utm_content='+encodeURIComponent(source)+'" data-analytics-id="agent_lab_visual_portal" data-product="agent_lab_membership"><div class="al-viz" aria-hidden="true"><div class="al-node al-n1">RUN</div><div class="al-node al-n2">TRACE</div><div class="al-node al-n3">BREAK</div><div class="al-node al-n4">REUSE</div><div class="al-core">AGENT LAB</div><i class="al-beam"></i><i class="al-beam al-b2"></i><i class="al-beam al-b3"></i><i class="al-beam al-b4"></i><div class="al-members"><i></i><i></i><i></i><i></i><span>FIELD COMMUNITY</span></div></div><div class="al-copy"><div class="al-kicker">AGENT LAB · FIELD COMMUNITY</div><h2>Run → Trace → Break → Reuse</h2><p class="al-line">Real experiments. Failure traces. Reusable patterns.</p><div class="al-chips"><span>EXPERIMENTS</span><span>FAILURES</span><span>PATTERNS</span></div><div class="al-open"><span>OPEN THE LAB</span><b>→</b></div></div></a>';

  var hero=document.querySelector('main .hero')||document.querySelector('section.hero')||document.querySelector('.hero');
  if(hero) hero.insertAdjacentElement('afterend',section); else {var main=document.querySelector('main')||document.body;main.insertBefore(section,main.firstChild);}

  var link=section.querySelector('a');
  link.addEventListener('pointerdown',function(){if(window.scosCapture)window.scosCapture('agent_lab_entry_click',{source_funnel:(document.body&&document.body.dataset.funnel)||source,destination_path:'/agent-lab/',entry_type:'visual_community_portal',source_path:path});});
  if('IntersectionObserver' in window){var seen=false;var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting&&!seen){seen=true;if(window.scosCapture)window.scosCapture('agent_lab_portal_view',{source_path:path,source_funnel:(document.body&&document.body.dataset.funnel)||source});io.disconnect();}});},{threshold:.35});io.observe(section);}
})();