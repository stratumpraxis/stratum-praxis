(function(){
  'use strict';
  if(window.__STRATUM_GROWTH_UI__) return;
  window.__STRATUM_GROWTH_UI__='2026.09.11-v1';

  const path=location.pathname.replace(/\/index\.html$/,'/');
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const capture=(name,props)=>{try{if(window.scosCapture)window.scosCapture(name,Object.assign({growth_ui_version:window.__STRATUM_GROWTH_UI__,route:path},props||{}));}catch(_){}};

  const family=(()=>{
    if(['/','/product-router.html','/live-lab.html','/buyer-workspace.html','/systems/'].includes(path)) return 'core';
    if(['/ai-saas-waste-calculator.html','/ai-saas-spend-audit-checklist.html','/ai-value-realization-kit.html','/ai-saas-spend-waste-audit.html','/ai-saas-spend-monitoring.html'].includes(path)) return 'spend';
    if(['/b2b/','/workflow-audit.html','/sample-workflow-audit.html'].includes(path)) return 'workflow';
    if(['/ai-agent-economics-calculator.html','/agent-control-auditor.html','/cross-agent-operating-kit.html','/cross-agent-operating-kit-access.html'].includes(path)) return 'agent';
    if(path.startsWith('/money-resilience/')) return 'money';
    if(path.startsWith('/72-hour-household-readiness/')) return 'household';
    if(path.startsWith('/revenue-pump/')||['/ai-monetization-reality-check.html','/ai-income-claim-checklist.html','/rustchain-bounty-radar.html'].includes(path)) return 'revenue';
    return 'other';
  })();

  const routes={
    core:{label:'Decision layer',title:'迷ったら、次の1手だけ。',body:'無料シグナルから始めて、必要な深さだけ進みます。',actions:[['無料ツール','/live-lab.html'],['収益導線を見る','/product-router.html'],['購入済み','/buyer-workspace.html']]},
    spend:{label:'Spend & ROI',title:'支出を、判断できる数字に。',body:'無料確認 → 自己判断 → 専門監査 → 継続管理。',actions:[['無料診断','/ai-saas-waste-calculator.html'],['$39 Kit','/ai-value-realization-kit.html'],['$499 Audit','/ai-saas-spend-waste-audit.html']]},
    workflow:{label:'Workflow',title:'自動化する前に、適合を確認。',body:'弱いシグナルなら無料で止まる。明確なら監査へ進む。',actions:[['無料診断','/b2b/'],['$39 Kit','/ai-value-realization-kit.html'],['$499 Audit','/workflow-audit.html']]},
    agent:{label:'Agent Operations',title:'採算と制御を見てから拡張。',body:'Economics → Control → Operating Kit → Buyer access。',actions:[['採算診断','/ai-agent-economics-calculator.html'],['制御監査','/agent-control-auditor.html'],['Operating Kit','/cross-agent-operating-kit.html']]},
    revenue:{label:'Revenue Utility',title:'収益化の詰まりを先に見つける。',body:'新しい商品を増やす前に、今ある導線の弱点を確認します。',actions:[['Revenue Pump','/revenue-pump/'],['Reality Check','/ai-monetization-reality-check.html'],['全導線','/product-router.html']]},
    money:{label:'Money Resilience',title:'売買ではなく、影響を見える化。',body:'結果・比較・耐久性を確認。金融商品の売買推奨はしません。',actions:[['診断へ','#diagnostic'],['結果を見る','#result'],['印刷 / 保存','#']]},
    household:{label:'Home Readiness',title:'不足だけ見つけて、今日1つ進める。',body:'不安を煽らず、準備状況と優先項目を整理します。',actions:[['チェックへ','#checklist'],['結果を見る','#result'],['最初に戻る','#top']]}
  };

  const cfg=routes[family];
  if(!cfg) return;

  const style=document.createElement('style');
  style.id='stratum-growth-ui-style';
  style.textContent=`
  :root{--spg-ease:cubic-bezier(.22,.78,.2,1);--spg-bg:rgba(11,16,20,.86);--spg-line:rgba(255,255,255,.12);--spg-text:#f5f7f8;--spg-muted:rgba(245,247,248,.64);--spg-accent:#7be0b7}
  html[lang^="ja"] body{font-family:"Hiragino Sans","Yu Gothic UI","Yu Gothic","Noto Sans JP",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  html:not([lang^="ja"]) body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  body{font-kerning:normal;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
  h1,h2,h3,.display,.hero-title{font-feature-settings:"palt" 1,"kern" 1;text-wrap:balance}
  p,li,.body-copy{font-feature-settings:"palt" 1;line-break:strict}
  [data-spg-ui]{box-sizing:border-box}
  .spg-launcher{position:fixed;right:18px;top:50%;z-index:2147482000;transform:translateY(-50%);width:52px;height:132px;border:1px solid var(--spg-line);border-radius:26px;background:linear-gradient(180deg,rgba(18,24,29,.78),rgba(10,14,17,.9));backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);box-shadow:0 22px 70px rgba(0,0,0,.22);color:var(--spg-text);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;transition:width .38s var(--spg-ease),opacity .28s var(--spg-ease),transform .38s var(--spg-ease),background .28s ease}
  .spg-launcher:hover{width:58px;background:rgba(10,15,19,.96)}
  .spg-launcher-dot{width:8px;height:8px;border-radius:50%;background:var(--spg-accent);box-shadow:0 0 18px rgba(123,224,183,.65)}
  .spg-launcher-label{writing-mode:vertical-rl;transform:rotate(180deg);font:750 10px/1.2 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.76)}
  .spg-backdrop{position:fixed;inset:0;z-index:2147481998;background:rgba(5,8,10,.26);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .32s ease}
  .spg-panel{position:fixed;z-index:2147481999;right:16px;top:16px;bottom:16px;width:min(390px,calc(100vw - 32px));border:1px solid var(--spg-line);border-radius:28px;background:linear-gradient(160deg,rgba(20,27,31,.96),rgba(8,12,15,.98));box-shadow:0 30px 100px rgba(0,0,0,.34);color:var(--spg-text);padding:18px;display:flex;flex-direction:column;opacity:0;transform:translateX(34px) scale(.985);pointer-events:none;transition:opacity .34s ease,transform .42s var(--spg-ease);overflow:auto}
  body.spg-open .spg-panel{opacity:1;transform:none;pointer-events:auto}
  body.spg-open .spg-backdrop{opacity:1;pointer-events:auto}
  body.spg-open .spg-launcher{opacity:0;transform:translate(24px,-50%);pointer-events:none}
  .spg-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.spg-kicker{display:flex;align-items:center;gap:8px;font:800 10px/1.2 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--spg-muted)}
  .spg-kicker i{width:7px;height:7px;border-radius:50%;background:var(--spg-accent);box-shadow:0 0 16px rgba(123,224,183,.65)}
  .spg-close{width:38px;height:38px;border-radius:50%;border:1px solid var(--spg-line);background:rgba(255,255,255,.06);color:white;font-size:19px;cursor:pointer}
  .spg-copy{padding:28px 4px 20px}.spg-copy h2{margin:0 0 10px;font:780 clamp(29px,4vw,38px)/1.03 system-ui,sans-serif;letter-spacing:-.045em}.spg-copy p{margin:0;color:var(--spg-muted);font-size:14px;line-height:1.65}
  .spg-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 18px}.spg-progress span{height:4px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.spg-progress span:after{content:"";display:block;width:0;height:100%;background:linear-gradient(90deg,var(--spg-accent),#a3d7ff);transition:width .48s var(--spg-ease)}.spg-progress span.is-on:after{width:100%}
  .spg-actions{display:grid;gap:8px}.spg-action{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:58px;border:1px solid rgba(255,255,255,.1);border-radius:17px;padding:12px 14px;background:rgba(255,255,255,.045);color:#fff;text-decoration:none;transition:transform .2s var(--spg-ease),background .2s ease,border-color .2s ease}.spg-action:hover{transform:translateX(-2px);background:rgba(255,255,255,.08);border-color:rgba(123,224,183,.28)}.spg-action strong{font-size:13px}.spg-action b{font-size:18px;color:var(--spg-accent)}
  .spg-action[aria-disabled="true"]{opacity:.45;pointer-events:none}
  .spg-trust{margin-top:auto;padding-top:22px}.spg-trust-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.spg-trust-card{border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:12px;background:rgba(255,255,255,.035)}.spg-trust-card small{display:block;color:var(--spg-muted);font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}.spg-trust-card strong{font-size:12px;line-height:1.4}.spg-foot{margin-top:12px;color:rgba(255,255,255,.45);font-size:10px;line-height:1.5}
  .spg-money-note{display:none;margin-top:10px;padding:10px 12px;border:1px solid rgba(123,224,183,.14);border-radius:14px;background:rgba(123,224,183,.055);color:rgba(240,255,248,.72);font-size:11px;line-height:1.55}.spg-money-note.is-show{display:block}
  @media(max-width:760px){.spg-launcher{right:14px;top:auto;bottom:max(14px,env(safe-area-inset-bottom));transform:none;width:auto;height:48px;border-radius:24px;padding:0 16px;flex-direction:row}.spg-launcher:hover{width:auto}.spg-launcher-label{writing-mode:horizontal-tb;transform:none}.spg-panel{top:auto;right:10px;left:10px;bottom:max(10px,env(safe-area-inset-bottom));width:auto;max-height:min(76vh,720px);border-radius:26px;transform:translateY(28px) scale(.985)}body.spg-open .spg-launcher{transform:translateY(20px)}.spg-copy{padding-top:20px}.spg-copy h2{font-size:30px}}
  @media(prefers-reduced-motion:reduce){.spg-launcher,.spg-panel,.spg-backdrop,.spg-action,.spg-progress span:after{transition:none!important}}
  `;
  document.head.appendChild(style);

  function make(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;}
  const launcher=make('button','spg-launcher');launcher.type='button';launcher.dataset.spgUi='';launcher.setAttribute('aria-label','Open decision navigator');
  launcher.append(make('span','spg-launcher-dot'),make('span','spg-launcher-label','Next move'));
  const backdrop=make('div','spg-backdrop');backdrop.dataset.spgUi='';
  const panel=make('aside','spg-panel');panel.dataset.spgUi='';panel.setAttribute('aria-label','Decision navigator');

  const head=make('div','spg-head');const kicker=make('div','spg-kicker');kicker.innerHTML='<i></i><span>'+cfg.label+'</span>';const close=make('button','spg-close','×');close.type='button';close.setAttribute('aria-label','Close');head.append(kicker,close);
  const copy=make('div','spg-copy');const h2=make('h2','',cfg.title);const p=make('p','',cfg.body);copy.append(h2,p);
  const progress=make('div','spg-progress');progress.innerHTML='<span class="is-on"></span><span></span><span></span>';
  const actions=make('div','spg-actions');

  cfg.actions.forEach((item,index)=>{
    const a=make('a','spg-action');a.dataset.spgRoute=String(index+1);a.innerHTML='<strong>'+item[0]+'</strong><b>→</b>';
    if(item[1]==='#'&&family==='money'&&index===2){a.href='#';a.addEventListener('click',e=>{e.preventDefault();window.print();capture('growth_nav_action',{family,action:'print'});});}
    else {a.href=item[1];}
    actions.appendChild(a);
  });

  const trust=make('div','spg-trust');
  trust.innerHTML='<div class="spg-trust-grid"><div class="spg-trust-card"><small>Trust</small><strong>必要以上に課金へ送らない</strong></div><div class="spg-trust-card"><small>Revenue</small><strong>次の行動を1画面で明確化</strong></div></div><div class="spg-money-note'+((family==='money'||family==='household')?' is-show':'')+'">このUtilityは判断補助です。結果を不安や煽りではなく、優先順位の整理に使います。</div><div class="spg-foot">Existing routes only · no fabricated checkout · privacy-aware interaction layer</div>';
  panel.append(head,copy,progress,actions,trust);
  document.body.append(backdrop,panel,launcher);

  function open(source){document.body.classList.add('spg-open');close.focus({preventScroll:true});capture('growth_nav_open',{family,source:source||'launcher'});}
  function shut(){document.body.classList.remove('spg-open');launcher.focus({preventScroll:true});capture('growth_nav_close',{family});}
  launcher.addEventListener('click',()=>open('launcher'));close.addEventListener('click',shut);backdrop.addEventListener('click',shut);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('spg-open'))shut();});

  actions.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;capture('growth_nav_action',{family,route_rank:a.dataset.spgRoute||'',destination:a.getAttribute('href')||''});});

  let resultSeen=false;
  const resultSelectors=['#resultPanel','#results','#result-stage','.result-panel','.diag-result','[data-result]','[aria-live="polite"]'];
  const resultNodes=resultSelectors.flatMap(s=>$$(s)).filter((v,i,a)=>a.indexOf(v)===i);
  const updateProgress=()=>{
    const interacted=document.documentElement.dataset.spgInteracted==='1';
    const spans=$$('.spg-progress span',progress);spans[0].classList.add('is-on');if(interacted)spans[1].classList.add('is-on');if(resultSeen)spans[2].classList.add('is-on');
  };
  document.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('[data-spg-ui]'))return;document.documentElement.dataset.spgInteracted='1';updateProgress();},{once:true,capture:true});
  if(resultNodes.length){const inspect=()=>{if(resultSeen)return;resultSeen=resultNodes.some(n=>!n.hidden&&getComputedStyle(n).display!=='none'&&((n.innerText||'').trim().length>18));if(resultSeen){updateProgress();capture('growth_nav_result_ready',{family});}};const mo=new MutationObserver(inspect);resultNodes.forEach(n=>mo.observe(n,{subtree:true,childList:true,attributes:true,characterData:true}));inspect();}

  let lastY=window.scrollY,hidden=false;
  addEventListener('scroll',()=>{if(document.body.classList.contains('spg-open'))return;const y=window.scrollY;const down=y>lastY&&y>180;if(down&&!hidden){hidden=true;launcher.style.opacity='.38';}else if(!down&&hidden){hidden=false;launcher.style.opacity='1';}lastY=y;},{passive:true});

  capture('growth_ui_ready',{family,reduced_motion:reduce});
})();
