import baseWorker from './prompt-store-worker.js';

const te = new TextEncoder();
const td = new TextDecoder();
const OFFER = {
  product: 'prod_V9Gl7xiRyxtkA5',
  price: 'price_1U8yEPJMK7zFs997aPbwhzrT',
  link: 'plink_1U8yEWJMK7zFs997tdkcLeza',
  amount: 980,
  currency: 'jpy'
};
const AXES = ['scope','motion','depth','output','control'];
const AXIS_LABELS = {
  scope:['整理','展開'], motion:['確認','前進'], depth:['深掘','横断'], output:['制作','探索'], control:['承認','自律']
};
const ROLE_LABELS = {command:'司令',explore:'探索',build:'実装',verify:'検証',create:'制作',assist:'補佐'};

function j(x,s=200,h={}){return new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h}})}
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
async function stripe(env,path){const r=await fetch('https://api.stripe.com/v1/'+path,{headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`}});const x=await r.json();if(!r.ok)throw new Error('Stripe verification failed');return x}
async function session(env,sid){return stripe(env,`checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`)}
function paid(s){const li=s.line_items?.data||[];return s.payment_status==='paid'&&s.mode==='payment'&&li.length===1&&li[0]?.price?.id===OFFER.price&&Number(li[0]?.quantity||0)===1&&Number(s.amount_total)===OFFER.amount&&String(s.currency||'').toLowerCase()===OFFER.currency&&s.payment_link===OFFER.link}
function clamp(v){v=Number(v);return Number.isFinite(v)?Math.max(0,Math.min(100,Math.round(v))):50}
function cleanProfile(p={}){const out={};for(const k of AXES)out[k]=clamp(p[k]);return out}
function roleScores(p){return {
  command:Math.round((p.scope+p.motion+p.control)/3),
  explore:Math.round((p.scope+p.depth+p.output)/3),
  build:Math.round((p.motion+(100-p.output)+p.control)/3),
  verify:Math.round(((100-p.scope)+(100-p.motion)+(100-p.control))/3),
  create:Math.round(((100-p.output)+p.motion+p.scope)/3),
  assist:Math.round(((100-p.control)+(100-p.motion)+50)/3)
}}
async function sign(secret,sid,profile){const payload=b64(te.encode(JSON.stringify({sid,profile,exp:Date.now()+30*864e5})));const k=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',k,te.encode('ai-fit-router-v1|'+payload));return payload+'.'+b64(new Uint8Array(sig))}
async function verify(secret,token){try{const [p,s]=String(token||'').split('.');if(!p||!s)return null;const k=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('HMAC',k,unb64(s),te.encode('ai-fit-router-v1|'+p)))return null;const x=JSON.parse(td.decode(unb64(p)));return x.sid&&x.exp>Date.now()?x:null}catch{return null}}
function axisText(k,v){const [l,r]=AXIS_LABELS[k];if(v>=68)return `${r}寄り。${r}を止めないAIを主力にしつつ、最終工程に${l}役を置くと安定します。`;if(v<=32)return `${l}寄り。精度と境界を守るAIが合いやすい一方、初期探索だけ別AIに任せると幅が出ます。`;return `${l}と${r}の中間。案件ごとに役割を切り替える複数AI運用と相性が良い状態です。`}
function toolRows(rs){const fit=(...roles)=>Math.round(roles.reduce((a,r)=>a+(rs[r]||0),0)/roles.length);return [
  ['ChatGPT','司令・構造化・横断判断',fit('command','explore')],
  ['Codex','GitHub・実装・テスト',fit('build','command')],
  ['Claude / Claude Code','検証・長文レビュー・第二実装',fit('verify','build')],
  ['Gemini','Google圏・大量資料・探索',fit('explore','assist')],
  ['Grok','X・外部シグナル・発散探索',fit('explore','command')],
  ['GitHub Copilot','IDE内の実装補助',fit('build','assist')],
  ['Microsoft Copilot','Microsoft 365業務補助',fit('assist','verify')],
  ['Canva','ビジュアル制作・仕上げ',fit('create','assist')]
].sort((a,b)=>b[2]-a[2])}
function promptFor(role){const p={
command:'目的、制約、既存資産、完了条件を確認し、最重要ボトルネックを1つ特定してください。作業を適切な役割へ振り分け、実行→検証→次の判断まで統括してください。未確認事項を完了扱いしないでください。',
explore:'現在のテーマから、需要・競合・検索意図・隣接用途・反対意見を広く探索してください。事実、仮説、未確認情報を分け、再利用可能な構造だけを抽出してください。発見しただけで採用決定はしないでください。',
build:'既存仕様を壊さず、対象を実装してください。変更範囲を最小化し、build/test/lintを可能な範囲で実行し、差分と未検証事項を報告してください。説明より実作業を優先してください。',
verify:'成果物を独立監査してください。CONFIRMED / INFERRED / UNKNOWN / BLOCKEDを分離し、P0〜P3で問題を整理してください。正常系だけでなく失敗条件も確認し、実証できたものだけ完了扱いしてください。',
create:'目的、対象ユーザー、使用場所を維持したまま、視認性・情報階層・操作性を改善してください。テンプレ感を減らし、スマホ優先で、理解→信頼→行動につながる制作物へ仕上げてください。',
assist:'既存の仕事環境を変えすぎず、繰り返し作業、整理、要約、下書き、確認を補助してください。重要判断と外部公開は人間承認を残してください。'};return p[role]}
function page(profile){const rs=roleScores(profile),sorted=Object.entries(rs).sort((a,b)=>b[1]-a[1]),top=sorted[0][0],second=sorted[1][0],tools=toolRows(rs);const axes=AXES.map(k=>`<div class="axis"><div><b>${AXIS_LABELS[k][0]} ↔ ${AXIS_LABELS[k][1]}</b><span>${profile[k]}</span></div><div class="meter"><i style="width:${profile[k]}%"></i></div><p>${axisText(k,profile[k])}</p></div>`).join('');const roles=sorted.map(([k,v],i)=>`<div class="role"><span>${i<2?'★ ':''}${ROLE_LABELS[k]}</span><b>${v}</b></div>`).join('');const trs=tools.map(([n,u,s])=>`<tr><td>${esc(n)}</td><td>${esc(u)}</td><td><b>${s}</b></td></tr>`).join('');return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>AI配置診断｜購入者フルレポート</title><style>:root{--b:#0b0d10;--p:#14171c;--l:#2b3038;--t:#f3f5f7;--m:#aeb5bf;--a:#d7dce2}*{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font:15px/1.7 system-ui,-apple-system,"Noto Sans JP",sans-serif}.w{max-width:820px;margin:auto;padding:28px 18px 80px}.ey{font-size:11px;letter-spacing:.14em;color:var(--m)}h1{font-size:clamp(34px,8vw,58px);line-height:1.08;margin:.3em 0}.lead,.m{color:var(--m)}.card{background:var(--p);border:1px solid var(--l);border-radius:18px;padding:21px;margin:16px 0}.axis{padding:12px 0;border-bottom:1px solid var(--l)}.axis:last-child{border:0}.axis>div:first-child,.role{display:flex;justify-content:space-between;gap:12px}.axis p{margin:7px 0 0;color:#c8ced5}.meter{height:8px;background:#22272e;border-radius:99px;overflow:hidden;margin-top:7px}.meter i{display:block;height:100%;background:var(--a)}.role{padding:9px 0;border-bottom:1px solid var(--l)}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px 7px;border-bottom:1px solid var(--l);vertical-align:top}pre{white-space:pre-wrap;background:#0c0f13;border:1px solid var(--l);border-radius:13px;padding:14px;color:#d7dbe0;font:12px/1.65 ui-monospace,monospace}button{border:0;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer}.fine{font-size:11px;color:#858d98;margin-top:28px}</style></head><body><main class="w"><div class="ey">STRATUM PRAXIS · VERIFIED PURCHASE · AI FIT ROUTER</div><h1>${ROLE_LABELS[top]}を主力に、<br>${ROLE_LABELS[second]}を組み合わせる。</h1><p class="lead">あなたの回答は「1つの万能AI」より、役割を分けたAIチーム運用に向いています。上位2役を中心にし、弱い工程だけ別AIで補うのが基本設計です。</p><section class="card"><h2>1｜5軸の詳細</h2>${axes}</section><section class="card"><h2>2｜あなたのAIチーム配分</h2>${roles}<p class="m">スコアは優劣ではなく、その役割を置いたときの噛み合いやすさの目安です。</p></section><section class="card"><h2>3｜主要AIの役割別適合度</h2><table><thead><tr><th>ツール</th><th>置き場所</th><th>適合</th></tr></thead><tbody>${trs}</tbody></table><p class="m">製品仕様は変化します。これは各社公式評価ではなく、現在の役割特性を本診断ロジックへ当てはめた独立評価です。</p></section><section class="card"><h2>4｜推奨運用</h2><p><b>主力：${ROLE_LABELS[top]}</b> — 最初に仕事を渡す役。</p><p><b>第二系統：${ROLE_LABELS[second]}</b> — 主力の弱点を補完する役。</p><p><b>最後の安全弁：</b>重要な外部公開・決済・削除・権限変更は、主力AIとは別系統で確認してください。</p><p><b>避けたい運用：</b>全AIへ同じ指示を投げる、未検証の出力をAI同士で自己承認させる、ツール数だけ増やす。</p></section><section class="card"><h2>5｜そのまま使える初期指示</h2><h3>${ROLE_LABELS[top]}担当</h3><pre id="p1">${esc(promptFor(top))}</pre><button onclick="copyText('p1',this)">コピー</button><h3>${ROLE_LABELS[second]}担当</h3><pre id="p2">${esc(promptFor(second))}</pre><button onclick="copyText('p2',this)">コピー</button></section><section class="card"><h2>6｜配置ルール</h2><ol><li>最初に主力AIを1つ決める。</li><li>主力が苦手な工程だけ別AIへ渡す。</li><li>実装と監査は可能なら別系統にする。</li><li>外部シグナルは探索役で拾い、採用前に検証する。</li><li>毎月「使っていないAI」を削り、成果につながる役だけ残す。</li></ol></section><p class="fine">本サービスは独立した作業配置診断です。OpenAI、Anthropic、Google、xAI、Microsoft、Canvaその他掲載各社の公式診断、提携、認定、推奨を意味しません。心理・医療上の性格診断ではありません。単一ユーザー向け。購入者アクセスの再配布は禁止です。</p></main><script>async function copyText(id,b){try{await navigator.clipboard.writeText(document.getElementById(id).textContent);const o=b.textContent;b.textContent='コピーしました';setTimeout(()=>b.textContent=o,900)}catch{b.textContent='コピー失敗'}}</script></body></html>`}

export default {async fetch(req,env,ctx){const u=new URL(req.url);if(!u.pathname.startsWith('/ai-fit-router/'))return baseWorker.fetch(req,env,ctx);const origin=req.headers.get('Origin')||'';const cors=origin==='https://stratumpraxis.com'?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'}});if(!env.STRIPE_SECRET_KEY)return j({error:'Server is not configured'},500,cors);try{if(req.method==='POST'&&u.pathname==='/ai-fit-router/login'){const b=await req.json(),sid=String(b.session_id||''),email=String(b.email||'').trim().toLowerCase(),profile=cleanProfile(b.profile||{});if(!sid.startsWith('cs_')||!email)return j({error:'決済セッションと購入メールが必要です'},400,cors);const s=await session(env,sid);if(!paid(s))return j({error:'この商品の購入を確認できませんでした'},402,cors);const pe=String(s.customer_details?.email||s.customer_email||'').trim().toLowerCase();if(!pe||pe!==email)return j({error:'購入時メールアドレスが一致しません'},403,cors);return j({authorized:true,workspace_url:`${u.origin}/ai-fit-router/workspace?token=${encodeURIComponent(await sign(env.STRIPE_SECRET_KEY,s.id,profile))}`},200,cors)}if(req.method==='GET'&&u.pathname==='/ai-fit-router/workspace'){const p=await verify(env.STRIPE_SECRET_KEY,u.searchParams.get('token'));if(!p)return new Response('Access token is invalid or expired.',{status:401});const s=await session(env,p.sid);if(!paid(s))return new Response('Purchase could not be verified.',{status:402});return new Response(page(cleanProfile(p.profile)),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private','X-Robots-Tag':'noindex,nofollow,noarchive','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}})}return j({error:'Not found'},404,cors)}catch(e){return j({error:'購入確認処理に失敗しました'},500,cors)}}};