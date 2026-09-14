(()=>{'use strict';
const BASE='https://ordlume.vercel.app';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const capture=(name,props={})=>{try{window.gtag?.('event',name,props)}catch(_){}try{window.scosCapture?.(name,props)}catch(_){}};
function canonicalForPath(){
  const p=location.pathname||'/';
  if(p==='/'||p==='/index.html')return BASE+'/';
  return BASE+p.replace(/index\.html$/,'');
}
function root(){return location.pathname==='/'||location.pathname==='/index.html'}
function apply(){
  const url=canonicalForPath();
  let c=document.querySelector('link[rel="canonical"]');
  if(!c){c=document.createElement('link');c.rel='canonical';document.head.appendChild(c)}
  c.href=url;
  const og=document.querySelector('meta[property="og:url"]');
  if(og)og.content=url;
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{
    try{const j=JSON.parse(s.textContent);if(j&&j.url){j.url=url;s.textContent=JSON.stringify(j)}}catch(_){ }
  });

  const main=document.querySelector('main');
  if(main&&!document.querySelector('[data-ordlume-guides]')&&root()){
    const s=document.createElement('section');
    s.dataset.ordlumeGuides='';
    s.style.cssText='margin:18px 14px 8px;padding:18px;border:1px solid rgba(16,34,29,.11);border-radius:20px;background:rgba(255,255,255,.78)';
    s.innerHTML='<div style="font-size:11px;font-weight:950;color:#176b4a;letter-spacing:.08em">ORDLUME GUIDES</div><h2 style="margin:6px 0 10px;font-size:19px">気になる項目だけ詳しく確認</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><a href="/water/">水</a><a href="/food/">食料</a><a href="/blackout/">停電</a><a href="/toilet/">衛生・トイレ</a><a href="/solo/">一人暮らし</a><a href="/family/">家族</a><a href="/pet/">ペット</a><a href="/guides/">すべて見る →</a></div>';
    s.querySelectorAll('a').forEach(a=>a.style.cssText='padding:8px 10px;border:1px solid #dbe6de;border-radius:999px;color:#176b4a;background:#fff;text-decoration:none;font-size:12px;font-weight:900');
    main.appendChild(s);
  }

  const f=document.querySelector('.footer, footer');
  if(f){
    if(!f.querySelector('[data-ordlume-contact]')){const a=document.createElement('a');a.dataset.ordlumeContact='';a.href='mailto:ordlume.contact@gmail.com';a.textContent='ordlume.contact@gmail.com';a.style.color='inherit';a.style.textDecoration='none';f.appendChild(a)}
    if(!f.querySelector('[data-ordlume-about]')){const a=document.createElement('a');a.dataset.ordlumeAbout='';a.href='/about.html';a.textContent='About';a.style.color='inherit';f.appendChild(a)}
    if(!f.querySelector('[data-ordlume-privacy]')){const a=document.createElement('a');a.dataset.ordlumePrivacy='';a.href='/privacy.html';a.textContent='Privacy';a.style.color='inherit';f.appendChild(a)}
  }
  if(root()){finishInternalActions();addClarityPanel();initDecisionRelief();}
}
function finishInternalActions(){
  const gear=$('#gear'),plan=$('#plan'),free=$('.amount[data-url=""]'),amounts=$('.amounts');
  if(gear){gear.textContent='不足別ガイドを見る';gear.disabled=false;gear.onclick=()=>{location.href='/gear.html'}}
  if(plan){plan.textContent='備えプランを作る';plan.disabled=false;plan.onclick=()=>{location.href='/plan.html'}}
  if(free)free.remove();
  if(amounts){amounts.style.gridTemplateColumns='repeat(3,1fr)'}
}
function addClarityPanel(){
  const hero=$('.hero'),quick=$('.quick');
  if(!hero||!quick||$('[data-ordlume-clarity]'))return;
  const style=document.createElement('style');
  style.textContent=`.ord-clarity{margin:6px 0 14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.ord-clarity-card{background:#fff;border:1px solid #dce7df;border-radius:18px;padding:14px 15px;box-shadow:0 7px 22px rgba(16,55,38,.05)}.ord-clarity-card small{display:block;color:#0d7f43;font-size:9px;font-weight:950;letter-spacing:.08em}.ord-clarity-card b{display:block;margin-top:5px;font-size:14px}.ord-clarity-card p{margin:5px 0 0;color:#66766f;font-size:11px;line-height:1.6}@media(max-width:760px){.ord-clarity{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
  const s=document.createElement('section');s.className='ord-clarity';s.dataset.ordlumeClarity='';quick.parentNode.insertBefore(s,quick);
  function sync(){const en=$('#en')?.classList.contains('active');s.innerHTML=en?'<div class="ord-clarity-card"><small>FOR WHO</small><b>If you know you should prepare, but do not know what comes first</b><p>Use what you already have, find the gaps, and avoid buying everything at once.</p></div><div class="ord-clarity-card"><small>YOU LEAVE WITH</small><b>Three actions in priority order</b><p>Your result is complete when you know what to do today, this week, and this month.</p></div><div class="ord-clarity-card"><small>NOT THIS</small><b>No fear, no product pushing, no one-size-fits-all claim</b><p>This is a household readiness aid based on transparent priorities and public guidance.</p></div>':'<div class="ord-clarity-card"><small>こんな人向け</small><b>備えたいけど、何からやるか決めきれない</b><p>今ある物を確認し、不足だけを順番に絞ります。全部いっぺんに買う必要はありません。</p></div><div class="ord-clarity-card"><small>このページで得るもの</small><b>今日・今週・今月の「次の3手」</b><p>何をするか決まったら、このUtilityの役目は完了です。</p></div><div class="ord-clarity-card"><small>しないこと</small><b>不安を煽らない・商品を押しつけない・万能を装わない</b><p>透明な優先順位と公的情報をもとに、家庭の判断を助けます。</p></div>'}
  [$('#jp'),$('#en')].filter(Boolean).forEach(b=>b.addEventListener('click',()=>setTimeout(sync,20)));sync();
}
function initDecisionRelief(){
  const nextPanel=$('.next-panel'),nextList=$('#next-list'),grid=$('#grid'),support=$('.support-inline');
  if(!nextPanel||!nextList||!grid||!support||$('[data-decision-relief]'))return;
  const style=document.createElement('style');
  style.textContent=`.next-panel{border-color:#b9dfc7!important;background:linear-gradient(135deg,#f4fbf6,#fff)!important}.next-panel>h3{font-size:22px;margin:0 0 10px}.ord-relief{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:9px}.ord-relief-card{padding:12px;border:1px solid #dce8df;border-radius:14px;background:#fff}.ord-relief-card small{display:block;color:#5f7468;font-size:9px;font-weight:900;letter-spacing:.08em}.ord-relief-card b{display:block;margin-top:5px;font-size:13px}.ord-relief-card p{margin:5px 0 0;color:#6f7f77;font-size:11px;line-height:1.55}.support-inline[data-ordlume-gated="true"]{display:none}.support-inline.ordlume-tip-ready{display:block;box-shadow:0 10px 28px rgba(17,148,71,.08)}@media(max-width:580px){.ord-relief{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
  const h=$('h3',nextPanel);if(h)h.textContent='あなたの次の3手';
  const relief=document.createElement('div');relief.className='ord-relief';relief.dataset.decisionRelief='';relief.innerHTML='<div class="ord-relief-card"><small>WHY THESE 3</small><b data-relief-why-title>いま必要な順に絞っています</b><p data-relief-why>未チェック項目を、基本優先度と選んだ暮らし条件に沿って3つまで表示します。</p></div><div class="ord-relief-card"><small>WHAT CAN WAIT</small><b data-relief-wait-title>全部いっぺんにやらなくてOK</b><p data-relief-wait>残りは次の3手のあとで確認できます。</p></div>';
  nextPanel.appendChild(relief);support.dataset.ordlumeGated='true';
  const sh=$('h3',support),sp=$('p',support),note=$('.mini-note',support);
  if(sh)sh.textContent='結果はここまで無料で完了です。';if(sp)sp.textContent='「次に何をするか」が決まって役立ったら、任意でTipできます。Tipの有無で結果や機能は変わりません。';if(note)note.textContent='Stripeの安全な単発決済ページへ移動します。';
  let engaged=false,started=false,resultSent=false,tipShown=false;
  function currentLang(){return $('#en')?.classList.contains('active')?'en':'ja'}
  function cleanNext(){return $$('.next',nextList).slice(0,3).map(el=>{const c=el.cloneNode(true);c.querySelector('.num')?.remove();c.querySelector('.when')?.remove();return c.textContent.trim()}).filter(Boolean)}
  function unchecked(){return $$('.card',grid).filter(c=>!$('input',c)?.checked).map(c=>($('.ct',c)?.textContent||'').trim()).filter(Boolean)}
  function checked(){return $$('.card',grid).filter(c=>$('input',c)?.checked).map(c=>($('.ct',c)?.textContent||'').trim()).filter(Boolean)}
  function sync(){const ja=currentLang()==='ja',top=cleanNext(),missing=unchecked(),done=checked();if(h)h.textContent=ja?'あなたの次の3手':'Your next 3 actions';const why=$('[data-relief-why]',relief),whyTitle=$('[data-relief-why-title]',relief),wait=$('[data-relief-wait]',relief),waitTitle=$('[data-relief-wait-title]',relief);if(whyTitle)whyTitle.textContent=ja?'いま必要な順に絞っています':'Only the priorities you need now';if(why)why.textContent=ja?(top.length?`優先表示：${top.join(' → ')}。未チェック項目を基本優先度と暮らし条件に沿って並べています。`:'基本10項目は確認済みです。'):(top.length?`Priority order: ${top.join(' → ')}. Unchecked items are ordered by core priority and your household profile.`:'Your 10 core items are checked.');const later=missing.filter(n=>!top.some(t=>t.includes(n))).slice(0,4);if(waitTitle)waitTitle.textContent=ja?'全部いっぺんにやらなくてOK':'You do not need to do everything now';if(wait)wait.textContent=ja?(later.length?`あとで確認：${later.join('・')}。まずは上の3つだけでOKです。`:done.length?'上の3つを終えたら再確認。いまは追加で広げなくてOKです。':'まずは上の3つだけでOKです。'):(later.length?`Later: ${later.join(', ')}. For now, focus on the three above.`:'Finish the three above, then check again. No need to expand the list now.');if(engaged&&top.length){support.classList.add('ordlume-tip-ready');support.dataset.ordlumeGated='false';if(!resultSent){resultSent=true;capture('result_generated',{site:'ordlume',version:'decision-relief-v1'});capture('result_success',{site:'ordlume'})}if(!tipShown){tipShown=true;capture('tip_shown',{site:'ordlume',moment:'after_result'})}}}
  function engage(){engaged=true;if(!started){started=true;capture('utility_start',{site:'ordlume',version:'decision-relief-v1'})}requestAnimationFrame(sync)}
  grid.addEventListener('change',e=>{if(e.target.matches('input')){engage();if($$('.card input:checked',grid).length===10)capture('input_complete',{site:'ordlume'})}},true);
  $$('.profile-chip').forEach(b=>b.addEventListener('click',()=>{if(engaged)setTimeout(sync,20)}));$('#support')?.addEventListener('click',()=>{const s=$('.amount.sel');capture('tip_clicked',{site:'ordlume',amount_label:s?.textContent?.trim()||'unknown',moment:'after_result'})},{capture:true});[$('#jp'),$('#en')].filter(Boolean).forEach(b=>b.addEventListener('click',()=>setTimeout(sync,30)));new MutationObserver(()=>requestAnimationFrame(sync)).observe(nextList,{subtree:true,childList:true,characterData:true});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();