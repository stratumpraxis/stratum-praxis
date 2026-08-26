import baseWorker from './slide-factory-worker.js';

const te=new TextEncoder(),td=new TextDecoder();
const OFFER={priceId:'price_1U8mabJMK7zFs997DULg25Ql',paymentLinkId:'plink_1U8matJMK7zFs997vDPQ7IdB',amount:2400,currency:'usd'};
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})}
function b64u(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function fromB64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function sign(secret,sid){const payload=b64u(te.encode(JSON.stringify({sid,product:'return-gate-growth-os',exp:Date.now()+30*24*60*60*1000})));const key=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,te.encode('return-gate-growth-access-v1|'+payload));return payload+'.'+b64u(new Uint8Array(sig))}
async function verify(secret,token){try{const [payload,sig]=String(token||'').split('.');if(!payload||!sig)return null;const key=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);const ok=await crypto.subtle.verify('HMAC',key,fromB64u(sig),te.encode('return-gate-growth-access-v1|'+payload));if(!ok)return null;const p=JSON.parse(td.decode(fromB64u(payload)));return p.sid&&p.product==='return-gate-growth-os'&&p.exp>Date.now()?p:null}catch{return null}}
async function getSession(env,sid){const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`,{headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`}});const s=await r.json();if(!r.ok)throw new Error('Stripe purchase verification failed');return s}
function paidFor(s){const li=s.line_items?.data||[];return s.payment_status==='paid'&&s.mode==='payment'&&li.length===1&&li[0]?.price?.id===OFFER.priceId&&Number(li[0]?.quantity||0)===1&&Number(s.amount_total)===OFFER.amount&&String(s.currency||'').toLowerCase()===OFFER.currency&&s.payment_link===OFFER.paymentLinkId}
async function anonId(sid){const d=await crypto.subtle.digest('SHA-256',te.encode('return-gate-growth-purchase-v1|'+sid));return b64u(new Uint8Array(d)).slice(0,32)}
async function capture(env,sid,event,properties={}){if(!env.POSTHOG_PROJECT_TOKEN||!sid)return;try{const id=await anonId(sid);await fetch('https://us.i.posthog.com/i/v0/e/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:env.POSTHOG_PROJECT_TOKEN,distinct_id:'verified_'+id,event,properties:{product:'return_gate_growth_os',source:'verified_worker','$process_person_profile':false,'$insert_id':`return-gate-growth-${event}-${id}`,...properties}})})}catch{}}
async function activate(env,s){if(s.metadata?.return_gate_growth_activated_at)return false;const body=new URLSearchParams();body.set('metadata[return_gate_growth_activated_at]',new Date().toISOString());body.set('metadata[return_gate_growth_activation]','1');body.set('metadata[return_gate_growth_activation_source]','secure_buyer_workspace_v1');const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(s.id)}`,{method:'POST',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body});return r.ok}
function workspace(){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Return Gate Growth OS | Verified Buyer Workspace</title><style>:root{--bg:#07090d;--panel:#10161f;--line:#293544;--text:#f8fafc;--muted:#a7b1bd;--accent:#dce3ea}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}.wrap{width:min(980px,calc(100% - 30px));margin:auto;padding:38px 0 76px}.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#91e6c1;font-weight:800}h1{font-size:clamp(36px,7vw,66px);line-height:1.02;margin:.2em 0}h2{margin-top:0}.lead,.muted{color:var(--muted)}.card{border:1px solid var(--line);background:linear-gradient(180deg,#121923,#0d131b);border-radius:18px;padding:22px;margin:15px 0}pre{white-space:pre-wrap;word-break:break-word;background:#080d13;border:1px solid var(--line);border-radius:12px;padding:15px;color:#e6edf5}.pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:5px 9px;margin:3px;color:#cbd3dd;font-size:11px}.license{font-size:11px;color:#7f8996;border-top:1px solid var(--line);padding-top:18px;margin-top:30px}</style></head><body><main class="wrap"><div class="eyebrow">Stratum Praxis · Purchase verified · Buyer-only workspace</div><h1>Return Gate Growth OS</h1><p class="lead">Turn a one-off website into a measured repeat-visit traffic hub.</p><p class="muted">Version 1.0 · English + Japanese · 3 Prompt Systems</p>
<section class="card"><h2>Quick Start</h2><ol><li>Run System 1 once on your current website.</li><li>Implement only the smallest useful hub.</li><li>Run System 2 before changing features; freeze the baseline.</li><li>Collect real behavior.</li><li>Run System 3 with actual metrics.</li><li>Delete weak routes and amplify winners only after evidence exists.</li></ol></section>
<section class="card"><h2>System 1 — Return Loop UX Architect</h2><p>Transform an existing site into a repeat-visit hub using fast comprehension, low friction, obvious next actions, scroll continuity and safe routing. Do not imitate proprietary layouts, logos, visual assets, copy or trade dress.</p><pre>VARIABLES
[SITE_TYPE]
[PRIMARY_USERS]
[EXISTING_ASSETS]
[CURRENT_ENTRY_POINTS]
[CURRENT_REVENUE_EXITS]
[ANALYTICS_STACK]
[MAINTENANCE_LIMIT]
[RISK_CONSTRAINTS]

PROMPT
You are a cross-functional Return Loop team. Internally divide the work into: Habit Architect, Traffic Architect, UX Researcher, Revenue Architect, Data Analyst, Safety Auditor, and Complexity Killer.

Goal: turn the supplied existing website into a repeat-visit traffic hub. Do not begin by inventing new features. First inventory existing assets and routes. Reuse before creating.

Inputs:
Site type: [SITE_TYPE]
Users: [PRIMARY_USERS]
Existing assets: [EXISTING_ASSETS]
Entry points: [CURRENT_ENTRY_POINTS]
Revenue exits: [CURRENT_REVENUE_EXITS]
Analytics: [ANALYTICS_STACK]
Maintenance limit: [MAINTENANCE_LIMIT]
Risk constraints: [RISK_CONSTRAINTS]

Execute in this order:
1. Asset inventory: identify reusable pages, utilities, articles, videos, products, diagnostics and external destinations. Flag duplication.
2. Return-reason design: identify at least three credible reasons users might return. Reject reasons that are merely inferior copies of established services.
3. Interaction architecture: design entry → useful action → next route → revenue-capable exit → return path. Optimize for mobile scrolling and low cognitive load.
4. Visual principles: propose a distinctive design system using abstract principles only. Never copy another brand's logos, assets, exact layout, protected copy, or distinctive trade dress.
5. Complexity audit: reject features that require recurring manual moderation, UGC management, frequent human data updates, fragile scraping, or risky platform behavior unless explicitly approved.
6. Measurement: define events for view, return, route selection, external click, CTA, checkout and purchase where available.
7. Production checklist: provide implementation order, mobile QA, analytics QA, sitemap/SEO checks and rollback criteria.

Output exactly:
A. Current structural diagnosis
B. Assets to reuse
C. Return reasons ranked by expected strength
D. Proposed hub architecture
E. Mobile interaction specification
F. Revenue routing map
G. Analytics event plan
H. Safety/maintenance rejects
I. Production checklist
J. What NOT to build yet

Rule: never claim a design will go viral. Optimize for measurable usefulness, repeat visits and conversion opportunities.</pre><p class="muted"><strong>Example:</strong> AI tools + digital products hub; solo founders; existing calculators, diagnostics, articles, YouTube and products; SEO/social/direct entry; PostHog; under 30 minutes/week maintenance. Diagnose isolated destinations and recommend a minimal routing hub before adding new aggregation.</p></section>
<section class="card"><h2>System 2 — Multi-Frequency Retention Planner</h2><pre>VARIABLES
[FEATURES_OR_ROUTES]
[AVAILABLE_EVENT_DATA]
[OBSERVATION_WINDOW]
[MIN_SAMPLE_RULE]
[CHANGE_FREEZE_PERIOD]

PROMPT
Act as a retention architect and skeptical analyst. Classify each supplied feature or route into one or more return modes:
Daily
Weekly
Monthly
Problem-triggered
Curiosity-triggered

For every feature, explain the real-world trigger that would cause a user to return. If the trigger is weak or fabricated, mark the feature as REMOVE CANDIDATE rather than forcing a category.

Then design a baseline measurement system for:
- first visit
- 24-hour return
- 7-day return
- features used per visit
- route/feature selected
- external click
- CTA
- checkout
- purchase where available
- return_reason_mix
- return_reason_mix_count

Critical rule: during [CHANGE_FREEZE_PERIOD], do not recommend adding/removing features or changing definitions unless tracking is broken. Preserve a clean baseline.

After the observation window, evaluate:
1. Which return modes correlate with 24h return?
2. Which correlate with 7d return?
3. Do mixed return reasons outperform single-reason visits?
4. Which features are unused or redundant?
5. Which routes produce downstream commercial actions without harming utility?

Use [MIN_SAMPLE_RULE] to avoid declaring winners from tiny samples. Clearly label insufficient evidence.

Output:
A. Classification table
B. Trigger logic
C. Event/property schema
D. Baseline freeze rules
E. 24h analysis plan
F. 7d analysis plan
G. Winner/loser decision rules
H. What must remain unchanged until evidence exists</pre></section>
<section class="card"><h2>System 3 — Revenue Traffic Hub Auditor</h2><pre>VARIABLES
[ENTRY_CHANNELS]
[HUB_ROUTES]
[MONETIZATION_OPTIONS]
[CURRENT_METRICS]
[PLATFORM_RULES]
[HUMAN_WORK_LIMIT]

PROMPT
You are a Revenue Traffic Hub audit team: Traffic Architect, CRO Analyst, Revenue Architect, Safety Auditor and Complexity Killer.

Audit this system:
Entry channels: [ENTRY_CHANNELS]
Hub/routes: [HUB_ROUTES]
Monetization: [MONETIZATION_OPTIONS]
Metrics: [CURRENT_METRICS]
Platform/risk rules: [PLATFORM_RULES]
Human work limit: [HUMAN_WORK_LIMIT]

Evaluate the full path:
external discovery → hub entry → useful action → next route → revenue-capable exit → return path.

Score each route 1–10 on:
User utility
Return potential
Commercial relevance
Friction
Measurement quality
Maintenance burden
Policy/copyright risk

Then identify:
- broken or missing return paths
- monetization inserted too early
- high-value pages with no traffic feed
- traffic routes with no useful destination
- unmeasured CTA/checkout gaps
- manual work that should be removed
- risky affiliate/ad/external-link assumptions that require eligibility verification

Never recommend deceptive clicks, forced redirects, fake scarcity, spam distribution, unauthorized scraping, copyrighted reposting or policy evasion.

Output:
A. Executive diagnosis
B. Route scorecard
C. Highest-value bottleneck
D. 3 changes with highest expected leverage
E. Revenue routes to defer
F. Tracking gaps
G. Safety/policy findings
H. 7-day validation plan
I. Delete/keep/amplify decision framework</pre></section>
<section class="card"><h2>日本語版 — System 1 再訪ループUX設計</h2><pre>あなたは再訪型サイト設計チームです。内部で Habit Architect / Traffic Architect / UX Researcher / Revenue Architect / Data Analyst / Safety Auditor / Complexity Killer に役割分担してください。

目的は、既存サイトを「一度来て終わる場所」から、役に立つため戻り、必要な資産へ進み、再び戻れる交通ハブへ変えることです。新機能を先に増やさず、既存資産を棚卸しし、再利用を優先してください。

入力：サイト種類 [SITE_TYPE] / 利用者 [PRIMARY_USERS] / 既存資産 [EXISTING_ASSETS] / 流入口 [CURRENT_ENTRY_POINTS] / 収益出口 [CURRENT_REVENUE_EXITS] / 計測 [ANALYTICS_STACK] / 保守上限 [MAINTENANCE_LIMIT] / リスク制約 [RISK_CONSTRAINTS]

順序：既存資産棚卸し → 再訪理由3つ以上 → 入口から戻りまでの交通設計 → モバイルUX → 収益出口 → 計測 → 安全・複雑化監査 → Production QA。既存ブランドのロゴ・素材・固有コピー・特徴的画面をコピーしない。人間の継続管理、UGC監視、危険なスクレイピング等を増やす案は原則却下。

出力：現状診断 / 再利用資産 / 再訪理由ランキング / ハブ構造 / モバイル仕様 / 収益導線 / 計測イベント / 却下案 / Productionチェック / 今は作らないもの。</pre></section>
<section class="card"><h2>日本語版 — System 2 複数頻度リテンション設計</h2><pre>各機能を Daily / Weekly / Monthly / Problem-triggered / Curiosity-triggered に分類し、本当にその頻度で戻る現実的理由があるか検証してください。弱い理由を無理に分類せず REMOVE CANDIDATE とすること。

first visit / 24h return / 7d return / features per visit / route selected / external click / CTA / checkout / purchase / return_reason_mix / return_reason_mix_count を計測できる設計を作る。

観測期間中は計測故障以外の条件変更を止め、baselineを守る。観測後に24h・7d再訪、複数理由mix、商業行動との関係を分析し、サンプル不足なら勝者判定しない。

出力：分類表 / トリガー / event schema / baseline固定ルール / 24h分析 / 7d分析 / 勝敗基準 / 観測中に変更禁止の項目。</pre></section>
<section class="card"><h2>日本語版 — System 3 収益交通ハブ監査</h2><pre>外部発見 → ハブ → 有用行動 → 次の資産 → 収益出口 → 戻り道、の全経路を監査してください。

各経路を Utility / Return potential / Commercial relevance / Friction / Measurement / Maintenance / Policy risk で採点。最重要ボトルネック、最もレバレッジの高い改善3件、延期すべき収益化、計測欠落、安全リスク、7日検証計画、Delete/Keep/Amplify基準を返す。

騙しクリック、強制遷移、偽の希少性、スパム、無許可スクレイピング、著作物転載、規約回避は禁止。</pre></section>
<section class="card"><h2>Pro Tips</h2><p><span class="pill">Separate facts, assumptions and hypotheses</span><span class="pill">Weekly can beat fake daily</span><span class="pill">Measure downstream actions</span><span class="pill">Reuse before creating</span><span class="pill">Human maintenance is a constraint</span></p></section>
<p class="license">Single-user license. Do not redistribute, resell, publicly mirror, or share access. No viral growth, revenue, retention or conversion result is guaranteed. Analytics, platform rules and commercial eligibility can change; verify current provider requirements when they matter.</p></main></body></html>`}

export default{async fetch(request,env,ctx){const url=new URL(request.url);if(!url.pathname.startsWith('/return-gate-growth/'))return baseWorker.fetch(request,env,ctx);const origin=request.headers.get('Origin');const cors=origin==='https://stratumpraxis.com'?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'}});try{if(request.method==='POST'&&url.pathname==='/return-gate-growth/login'){const body=await request.json(),sid=String(body.session_id||''),email=String(body.email||'').trim().toLowerCase();if(!sid.startsWith('cs_')||!email)return json({error:'Checkout Session ID and checkout email are required'},400,cors);const s=await getSession(env,sid);if(!paidFor(s))return json({error:'A paid Return Gate Growth OS purchase could not be verified'},402,cors);const paidEmail=String(s.customer_details?.email||s.customer_email||'').trim().toLowerCase();if(!paidEmail||paidEmail!==email)return json({error:'Email does not match the checkout email'},403,cors);await capture(env,s.id,'revenue_verified',{amount_total:s.amount_total,currency:s.currency});const token=await sign(env.STRIPE_SECRET_KEY,s.id);return json({authorized:true,workspace_url:`${url.origin}/return-gate-growth/workspace?token=${encodeURIComponent(token)}`},200,cors)}if(request.method==='GET'&&url.pathname==='/return-gate-growth/workspace'){const p=await verify(env.STRIPE_SECRET_KEY,url.searchParams.get('token'));if(!p)return new Response('Access token is invalid or expired.',{status:401,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow,noarchive'}});const s=await getSession(env,p.sid);if(!paidFor(s))return new Response('Purchase could not be verified.',{status:402,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});const tracked=await activate(env,s);if(tracked)await capture(env,s.id,'activation',{activation_source:'secure_buyer_workspace_v1'});return new Response(workspace(),{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'X-Return-Gate-Growth-Activation-Tracked':tracked?'1':'0'}})}return json({error:'Not found'},404,cors)}catch{return json({error:'Purchase verification failed'},500,cors)}}}
