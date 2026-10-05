(()=>{'use strict';
if(window.__STRATUM_I18N_RUNTIME_2026__)return;
window.__STRATUM_I18N_RUNTIME_2026__='2026.10.05-v1';

const SUPPORTED=['en','ja','es'];
const STORAGE='sp-office-lang';
const LEGACY='sp_b2b_locale';
const lang0=(()=>{
  try{
    const q=new URLSearchParams(location.search).get('lang');
    const s=localStorage.getItem(STORAGE)||localStorage.getItem(LEGACY);
    const b=(navigator.language||'en').slice(0,2).toLowerCase();
    return SUPPORTED.includes(q)?q:SUPPORTED.includes(s)?s:SUPPORTED.includes(document.documentElement.lang)?document.documentElement.lang:SUPPORTED.includes(b)?b:'en';
  }catch{return 'en'}
})();

const ROUTER_COPY={
  en:{
    heroEyebrow:'REVENUE ROUTE OS',
    heroTitle:'See the route. Move with proof.',
    heroLead:'One visual operating surface for AI spend, workflow and agent decisions. Start with evidence. Pay only when the next layer earns its place.',
    heroPrimary:'Open route map',
    heroSecondary:'Free tools',
    routesTitle:'Pick the problem. The route assembles itself.',
    routesNote:'No catalog hunting. One screen shows the signal, paid depth and destination.',
    tabs:[
      ['Spend & ROI','Cut waste. Prove value. Keep it controlled.'],
      ['Workflow','Decide what to automate before building it.'],
      ['Agent Operations','Make economics and control visible before scale.']
    ],
    sides:[
      ['Find the leak. Prove the value.','Turn software spend from a renewal habit into a visible operating decision.','Run Waste Calculator'],
      ['Diagnose first. Automate second.','Separate genuine automation opportunity from process noise before you pay to build.','Open Workflow Diagnostic'],
      ['Make agents legible before scale.','Expose unit economics, authority and operating boundaries before adding autonomy.','Run Economics Calculator']
    ]
  },
  ja:{
    heroEyebrow:'収益ルート',
    heroTitle:'課題から、最短の判断ルートへ。',
    heroLead:'AI支出・Workflow・Agent運用を、Evidenceから判断へつなぐ1つの画面です。必要性が見えた段階だけ有料へ進みます。',
    heroPrimary:'ルートを見る',
    heroSecondary:'無料ツール',
    routesTitle:'課題を選ぶ。次の手段は自動で絞る。',
    routesNote:'商品一覧を探し回らず、Signal・有料深度・行き先を1画面で判断できます。',
    tabs:[
      ['AI・SaaS支出','無駄を見つけ、価値を確認し、支出を制御する。'],
      ['Workflow','作る前に、自動化すべきかを判断する。'],
      ['Agent運用','拡大前に、採算と権限境界を見える化する。']
    ],
    sides:[
      ['支出の漏れを見つける。価値を確かめる。','更新の惰性ではなく、ソフトウェア支出を判断できる状態にします。','無料Waste Calculatorを開く'],
      ['まず診断。自動化はその後。','Process noiseと、本当に自動化価値のあるWorkflowを分けます。','Workflow診断を開く'],
      ['Agentを拡大する前に、判断可能にする。','Unit economics・権限・運用境界を見える化してから自律性を上げます。','Agent採算Calculatorを開く']
    ]
  },
  es:{
    heroEyebrow:'RUTA DE INGRESOS',
    heroTitle:'Ve la ruta. Decide con evidencia.',
    heroLead:'Una superficie para decisiones sobre gasto AI, workflows y agentes. Empieza con evidencia y paga solo cuando la siguiente capa lo justifique.',
    heroPrimary:'Abrir mapa de rutas',
    heroSecondary:'Herramientas gratis',
    routesTitle:'Elige el problema. La ruta se organiza sola.',
    routesNote:'Sin buscar en un catálogo. Señal, profundidad de pago y destino en una sola pantalla.',
    tabs:[
      ['Gasto & ROI','Reduce desperdicio. Demuestra valor. Mantén el control.'],
      ['Workflow','Decide qué automatizar antes de construir.'],
      ['Operaciones de agentes','Haz visibles economía y control antes de escalar.']
    ],
    sides:[
      ['Encuentra la fuga. Demuestra el valor.','Convierte el gasto de software en una decisión operativa visible.','Abrir Waste Calculator'],
      ['Diagnostica primero. Automatiza después.','Separa la oportunidad real de automatización del ruido del proceso.','Abrir diagnóstico de workflow'],
      ['Haz legibles los agentes antes de escalar.','Expón economía unitaria, autoridad y límites operativos antes de aumentar autonomía.','Abrir calculadora económica']
    ]
  }
};

function current(){
  const x=(document.documentElement.lang||'en').slice(0,2).toLowerCase();
  return SUPPORTED.includes(x)?x:'en';
}
function save(lang){
  try{
    localStorage.setItem(STORAGE,lang);
    localStorage.setItem(LEGACY,lang);
  }catch{}
}
function syncButtons(lang){
  document.querySelectorAll('[data-lang]').forEach(b=>{
    const on=b.dataset.lang===lang;
    b.classList.toggle('active',on);
    b.classList.toggle('is-active',on);
    b.setAttribute('aria-pressed',String(on));
  });
  document.querySelectorAll('[data-spx-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spxLang===lang)));
}
function translateRouter(lang){
  if(document.body.dataset.page!=='revenue_route_os_v2')return;
  const c=ROUTER_COPY[lang]||ROUTER_COPY.en;
  const ey=document.querySelector('.hero .eyebrow'); if(ey) ey.textContent=c.heroEyebrow;
  const h1=document.querySelector('.hero h1'); if(h1) h1.textContent=c.heroTitle;
  const lead=document.querySelector('.hero .hero-lead'); if(lead) lead.textContent=c.heroLead;
  const heroBtns=[...document.querySelectorAll('.hero-actions a')];
  if(heroBtns[0]){const s=heroBtns[0].querySelector('span')||heroBtns[0];s.textContent=c.heroPrimary}
  if(heroBtns[1]){const s=heroBtns[1].querySelector('span')||heroBtns[1];s.textContent=c.heroSecondary}
  const title=document.querySelector('#routes-title'); if(title) title.textContent=c.routesTitle;
  const sectionHead=title?.closest('.section-head'); const note=sectionHead?.querySelector(':scope > p'); if(note)note.textContent=c.routesNote;
  const tabs=[...document.querySelectorAll('.route-tab')];
  tabs.forEach((tab,i)=>{const d=c.tabs[i];if(!d)return;const st=tab.querySelector('strong');const p=tab.querySelector('p');if(st)st.textContent=d[0];if(p)p.textContent=d[1]});
  const views=[...document.querySelectorAll('.route-view')];
  views.forEach((view,i)=>{const d=c.sides[i];if(!d)return;const h=view.querySelector('.route-side h3');const p=view.querySelector('.route-side > p');const s=view.querySelector('.start-card strong');if(h)h.textContent=d[0];if(p)p.textContent=d[1];if(s)s.textContent=d[2]});
}
function ensureSwitch(){
  const header=document.querySelector('.office-header');
  if(!header||header.querySelector('.lang-switch'))return;
  let tools=header.querySelector('.header-tools');
  if(!tools){
    tools=document.createElement('div');
    tools.className='header-tools';
    header.appendChild(tools);
  }
  const box=document.createElement('div');
  box.className='lang-switch';
  box.setAttribute('role','group');
  box.setAttribute('aria-label','Language');
  box.innerHTML=SUPPORTED.map(l=>'<button type="button" data-lang="'+l+'" aria-pressed="false">'+l.toUpperCase()+'</button>').join('');
  tools.appendChild(box);
}
function apply(lang,{relay=true,capture=true}={}){
  if(!SUPPORTED.includes(lang))return;
  save(lang);
  if(document.documentElement.lang!==lang)document.documentElement.lang=lang;
  syncButtons(lang);
  translateRouter(lang);
  if(relay){
    const legacy=[...document.querySelectorAll('[data-spx-lang="'+lang+'"]')];
    legacy.forEach(b=>{
      if(!b.dataset.i18nRelayed){
        b.dataset.i18nRelayed='1';
        try{b.click()}catch{}
        delete b.dataset.i18nRelayed;
      }
    });
  }
  window.dispatchEvent(new CustomEvent('stratum:languagechange',{detail:{lang}}));
  if(capture){try{window.scosCapture?.('language_switch',{language:lang,path:location.pathname})}catch{}}
}
function boot(){
  ensureSwitch();
  apply(lang0,{relay:true,capture:false});
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-lang]');
    if(!b)return;
    e.preventDefault();
    apply(b.dataset.lang,{relay:true,capture:true});
  });
  new MutationObserver(m=>{
    if(m.some(x=>x.attributeName==='lang')){syncButtons(current());translateRouter(current())}
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();