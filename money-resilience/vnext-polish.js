(function(){
'use strict';
if(location.pathname!=='/money-resilience/'&&location.pathname!=='/money-resilience/index.html')return;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scenarios=[
 {ja:'軽度',en:'Light',fx:5,cpi:2,rate:.5,crypto:15},
 {ja:'標準',en:'Standard',fx:10,cpi:5,rate:1,crypto:30},
 {ja:'強め',en:'Strong',fx:20,cpi:8,rate:2,crypto:50}
];
const style=document.createElement('style');
style.id='mr-vnext-polish';
style.textContent=`
.mr-shock-wrap{position:relative;margin-top:2px}.mr-dial-labels{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:2px}.mr-dial-labels button{height:28px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.012);color:#60726e;font-size:8px;letter-spacing:.06em;cursor:pointer;transition:transform .2s var(--ease),background .2s var(--ease),color .2s var(--ease),border-color .2s var(--ease)}.mr-dial-labels button.active{color:#e9f8f3;border-color:rgba(124,231,194,.28);background:linear-gradient(135deg,rgba(124,231,194,.12),rgba(124,231,194,.035));box-shadow:0 6px 18px rgba(0,0,0,.12)}.mr-dial-labels button:active,.mr-pill-btn:active,.mr-action:active,.mr-icon-btn:active,.mr-dock button:active,.mr-mobile-dock button:active{transform:scale(.97)}
.mr-causal-ribbon{margin:0 15px 12px;padding:9px 10px;border:1px solid var(--line);border-radius:13px;background:linear-gradient(90deg,rgba(125,184,233,.035),rgba(124,231,194,.035));display:flex;align-items:center;gap:8px;color:#70837e;font-size:8px;min-height:34px;overflow:hidden}.mr-causal-ribbon i{width:6px;height:6px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 5px rgba(124,231,194,.06);flex:0 0 auto}.mr-causal-ribbon b{font-size:9px;font-weight:560;color:#cbd9d5}.mr-causal-ribbon span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mr-causal-ribbon.flash{animation:mrCausal .38s var(--ease)}
.mr-mobile-score{display:none}.mr-paused *,.mr-page-hidden *{animation-play-state:paused!important}.mr-card,.mr-preview{contain:layout paint style}.mr-tool-panel{content-visibility:auto;contain-intrinsic-size:540px}.mr-control,.mr-result-tile,.mr-factor,.mr-rate-card,.mr-tool-card{transform:translateZ(0)}
@keyframes mrCausal{0%{transform:translateX(-5px);opacity:.45}100%{transform:none;opacity:1}}
@media(max-width:720px){
 .mr-hero{display:flex;flex-direction:column;gap:10px;padding-top:10px}.mr-preview{order:1}.mr-hero-copy{order:2;padding:8px 2px 2px}.mr-hero-copy .mr-hero-sub,.mr-sample-note{display:none}.mr-hero h1{font-size:28px;line-height:1.05;margin-top:9px;max-width:330px}.mr-kicker{font-size:7px}.mr-hero-actions{margin-top:13px}.mr-pill-btn{min-height:38px;padding:0 13px}
 .mr-preview{min-height:260px}.mr-preview-inner{padding:12px}.mr-market-main{grid-template-columns:1fr 104px}.mr-big-rate b{font-size:35px}.mr-market-mini{margin-top:3px}.mr-rate-card{padding:9px 10px}.mr-rate-card b{font-size:14px}
 .mr-mobile-score{display:flex;position:absolute;z-index:5;right:12px;top:12px;align-items:center;gap:9px;padding:8px 10px;border:1px solid rgba(124,231,194,.18);border-radius:999px;background:rgba(8,15,16,.76);backdrop-filter:blur(14px);box-shadow:0 10px 28px rgba(0,0,0,.2)}.mr-mobile-score small{font-size:6.5px;letter-spacing:.12em;color:#758a85;text-transform:uppercase}.mr-mobile-score b{font-size:18px;font-weight:540;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.mr-mobile-score i{width:5px;height:5px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 4px rgba(124,231,194,.07)}
 .mr-dock{display:none}.mr-stage{margin-top:8px}.mr-core-card{order:1}.mr-controls-card{order:2}.mr-result-card{order:3}.mr-core-main{padding-top:0}.mr-core-main .mr-core-wrap{width:min(78vw,270px)}.mr-factor-legend{grid-template-columns:repeat(3,1fr)}.mr-causal-ribbon{margin:0 11px 10px}.mr-result-tile{min-height:76px}.mr-result-tile.primary b{font-size:32px}.mr-workspace{padding-top:6px}.mr-mobile-dock{height:60px}
}
@media(prefers-reduced-motion:reduce){.mr-causal-ribbon.flash{animation:none!important}.mr-dial-labels button{transition:none!important}}
`;
document.head.appendChild(style);

function lang(){return document.documentElement.lang==='en'?'en':'ja'}
function capture(name,props){try{window.scosCapture&&window.scosCapture(name,props||{})}catch(_){}}
function parseNum(text){const n=Number(String(text||'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0}
function formatLike(raw,value){if(/^¥/.test(raw))return '¥'+Math.round(value).toLocaleString('ja-JP');if(/m\s*$/.test(raw))return value.toFixed(1)+'m';if(/%/.test(raw))return Math.round(value)+'%';return Math.round(value).toLocaleString('ja-JP')}

// Language persistence without changing analytics or financial state.
try{
 const saved=localStorage.getItem('mr_lang_v1');
 if(saved==='ja'||saved==='en')requestAnimationFrame(()=>{const b=$(`[data-lang="${saved}"]`);if(b&&!b.classList.contains('active'))b.click()});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b)localStorage.setItem('mr_lang_v1',b.dataset.lang)});
}catch(_){ }

// Upgrade the scenario range into a three-state Stress Dial while preserving the existing range input.
const slider=$('#mrScenario');
if(slider){
 const wrap=document.createElement('div');wrap.className='mr-shock-wrap';slider.parentNode.insertBefore(wrap,slider);wrap.appendChild(slider);
 const labels=document.createElement('div');labels.className='mr-dial-labels';labels.setAttribute('role','group');labels.setAttribute('aria-label','Stress scenario');
 labels.innerHTML=scenarios.map((s,i)=>`<button type="button" data-dial="${i}">${s[lang()]}</button>`).join('');wrap.appendChild(labels);
 function updateDial(){const i=Number(slider.value)||0;$$('[data-dial]',labels).forEach((b,n)=>{b.classList.toggle('active',n===i);b.textContent=scenarios[n][lang()]});const s=scenarios[i];slider.setAttribute('aria-valuetext',`${s[lang()]} · FX +${s.fx}% · CPI +${s.cpi}% · Rate +${s.rate}pt · Crypto -${s.crypto}%`);slider.style.setProperty('--shock',`${i*50}%`)}
 labels.addEventListener('click',e=>{const b=e.target.closest('[data-dial]');if(!b)return;slider.value=b.dataset.dial;slider.dispatchEvent(new Event('input',{bubbles:true}));updateDial();capture('money_resilience_stress_dial_click',{scenario:Number(b.dataset.dial)})});
 slider.addEventListener('input',()=>requestAnimationFrame(()=>{updateDial();tweenAssumptions()}));
 document.addEventListener('click',e=>{if(e.target.closest('[data-lang]'))requestAnimationFrame(updateDial)});
 updateDial();
}

let assumptionPrev={};
function tweenAssumptions(){
 const map={fx:{v:Number(slider&&slider.value||0),fmt:v=>'+'+Math.round(v)+'%'},inflation:{v:Number(slider&&slider.value||0),fmt:v=>'+'+Math.round(v)+'%'},rate:{v:Number(slider&&slider.value||0),fmt:v=>'+'+(Math.round(v*10)/10)+'pt'},crypto:{v:Number(slider&&slider.value||0),fmt:v=>'-'+Math.round(v)+'%'}};
 const idx=Number(slider&&slider.value||0),s=scenarios[idx]||scenarios[1],targets={fx:s.fx,inflation:s.cpi,rate:s.rate,crypto:s.crypto};
 Object.keys(targets).forEach(k=>{$$(`[data-assume="${k}"]`).forEach(el=>{const to=targets[k],from=assumptionPrev[k]??to;assumptionPrev[k]=to;if(reduced||from===to){el.textContent=map[k].fmt(to);return}const start=performance.now();function f(now){const x=Math.min(1,(now-start)/260),e=1-Math.pow(1-x,3),v=from+(to-from)*e;el.textContent=map[k].fmt(v);if(x<1)requestAnimationFrame(f)}requestAnimationFrame(f)})});
}

// Keep result metrics visually continuous instead of replacing the world on each input.
const lastMetric=new Map();
function tweenResults(){
 $$('#mrResultGrid .mr-result-tile').forEach(tile=>{const key=$('small',tile)?.textContent||'';const b=$('b',tile);if(!b||!/[-\d]/.test(b.textContent))return;const raw=b.textContent,to=parseNum(raw);const from=lastMetric.has(key)?lastMetric.get(key):to;lastMetric.set(key,to);if(reduced||from===to)return;const start=performance.now();function frame(now){const x=Math.min(1,(now-start)/300),e=1-Math.pow(1-x,3);b.textContent=formatLike(raw,from+(to-from)*e);if(x<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)})
}
function scheduleResultTween(){requestAnimationFrame(()=>requestAnimationFrame(tweenResults))}
document.addEventListener('input',e=>{if(e.target.matches('[data-value],[data-range],[data-mini],#mrScenario'))scheduleResultTween()});

// Causal feedback: show the currently dominant pressure in one compact ribbon.
const coreCard=$('.mr-core-card');
let ribbon;
if(coreCard){ribbon=document.createElement('div');ribbon.className='mr-causal-ribbon';ribbon.innerHTML='<i></i><b>CORE</b><span>Input → pressure → resilience</span>';const legend=$('#mrFactorLegend');if(legend)legend.insertAdjacentElement('afterend',ribbon)}
function updateCausal(){if(!ribbon)return;const factors=$$('#mrFactorLegend .mr-factor').map(el=>({name:$('span',el)?.textContent||'',v:parseNum($('b',el)?.textContent)})).sort((a,b)=>b.v-a.v);const top=factors[0];if(!top)return;ribbon.innerHTML=`<i></i><b>${top.name}</b><span>${top.v} → Core</span>`;ribbon.classList.remove('flash');void ribbon.offsetWidth;ribbon.classList.add('flash')}
const legend=$('#mrFactorLegend');if(legend)new MutationObserver(updateCausal).observe(legend,{subtree:true,childList:true,characterData:true});updateCausal();

// Mobile is a separate information hierarchy: Live + Score first, then inputs, fixed action dock.
const preview=$('#mrPreview');
let mobileScore;
if(preview){mobileScore=document.createElement('div');mobileScore.className='mr-mobile-score';mobileScore.innerHTML='<i></i><div><small>RESILIENCE</small><b>—</b></div>';preview.appendChild(mobileScore)}
function syncMobileScore(){if(!mobileScore)return;const score=$('[data-core="main"] [data-core-score]')?.textContent||$('[data-core="preview"] [data-core-score]')?.textContent||'—';$('b',mobileScore).textContent=score}
const mainCore=$('[data-core="main"] [data-core-score]');if(mainCore)new MutationObserver(syncMobileScore).observe(mainCore,{childList:true,characterData:true,subtree:true});syncMobileScore();

// Pause decorative motion outside the viewport and while the page is backgrounded.
if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>{entries.forEach(x=>x.target.classList.toggle('mr-paused',!x.isIntersecting))},{rootMargin:'180px 0px',threshold:.01});['#mrPreview','#mrWorkspace'].forEach(s=>{const el=$(s);if(el)io.observe(el)})}
document.addEventListener('visibilitychange',()=>document.body.classList.toggle('mr-page-hidden',document.visibilityState!=='visible'));

// Make touch controls feel physical without adding continuous animation.
document.addEventListener('pointerdown',e=>{const el=e.target.closest('button,.mr-control');if(el)el.dataset.pressed='1'});
document.addEventListener('pointerup',e=>{const el=e.target.closest('[data-pressed]');if(el)delete el.dataset.pressed});

// Live region for tool changes, useful visually and for assistive tech without adding copy to the page.
const live=document.createElement('div');live.setAttribute('aria-live','polite');live.style.cssText='position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';document.body.appendChild(live);
document.addEventListener('click',e=>{const b=e.target.closest('[data-tool],[data-mobile],[data-nav]');if(!b)return;const v=b.dataset.tool||b.dataset.mobile||b.dataset.nav;if(v)live.textContent='Tool '+v});

capture('money_resilience_vnext_polish_loaded',{motion:reduced?'reduced':'full'});
})();
