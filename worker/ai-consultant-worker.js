const te = new TextEncoder();
const td = new TextDecoder();

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }
  });
}
function b64u(bytes) {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromB64u(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '=';
  const raw = atob(s); return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function signToken(secret, sid, product = 'scos') {
  const payload = b64u(te.encode(JSON.stringify({ sid, product, exp: Date.now() + 30*24*60*60*1000 })));
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, te.encode('scos-access-v1|' + payload));
  return payload + '.' + b64u(new Uint8Array(sig));
}
async function verifyToken(secret, token) {
  try {
    const [payload, sig] = String(token||'').split('.'); if (!payload || !sig) return null;
    const key = await crypto.subtle.importKey('raw', te.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, fromB64u(sig), te.encode('scos-access-v1|' + payload));
    if (!ok) return null;
    const p = JSON.parse(td.decode(fromB64u(payload)));
    if (!p.sid || !p.exp || Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}
async function anonymousPurchaseId(sid) {
  const digest = await crypto.subtle.digest('SHA-256', te.encode('scos-purchase-v1|' + sid));
  return b64u(new Uint8Array(digest)).slice(0, 32);
}
async function capturePostHog(env, sid, event, product, properties = {}) {
  if (!env.POSTHOG_PROJECT_TOKEN || !sid) return false;
  try {
    const purchaseId = await anonymousPurchaseId(sid);
    const payload = {
      api_key: env.POSTHOG_PROJECT_TOKEN,
      distinct_id: 'verified_' + purchaseId,
      event,
      properties: {
        product,
        source: 'verified_worker',
        '$process_person_profile': false,
        '$insert_id': `${product}-${event}-${purchaseId}`,
        ...properties
      }
    };
    const r = await fetch('https://us.i.posthog.com/i/v0/e/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return r.ok;
  } catch { return false; }
}
function offers(env) {
  return {
    report:{ priceId:env.REPORT_PRICE_ID,paymentLinkId:env.REPORT_PAYMENT_LINK_ID,amount:1980,currency:'jpy' },
    kit:{ priceId:env.KIT_PRICE_ID,paymentLinkId:env.KIT_PAYMENT_LINK_ID,amount:4980,currency:'jpy' },
    scos:{ priceId:env.SCOS_PRICE_ID,paymentLinkId:env.SCOS_PAYMENT_LINK_ID,amount:4900,currency:'usd' },
    risk:{ priceId:'price_1U7bQsJMK7zFs997Zu1uR7Gd',paymentLinkId:'plink_1U7bR1JMK7zFs997fN8WB7rG',amount:3900,currency:'usd' }
  };
}
async function getSession(env, sid) {
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`, { headers:{ Authorization:`Bearer ${env.STRIPE_SECRET_KEY}` } });
  const s = await r.json(); if (!r.ok) throw new Error('Stripe verification failed'); return s;
}
function paidFor(s, expected) {
  const li = s.line_items?.data || [];
  return s.payment_status === 'paid' && s.mode === 'payment' && li.length === 1 &&
    li[0]?.price?.id === expected.priceId && Number(li[0]?.quantity||0) === 1 &&
    Number(s.amount_total) === expected.amount && String(s.currency||'').toLowerCase() === expected.currency &&
    s.payment_link === expected.paymentLinkId;
}
async function markActivated(env, s, product) {
  const key = product === 'scos' ? 'scos' : product;
  if (s.metadata?.[`${key}_activated_at`]) return true;
  const form = new URLSearchParams();
  form.set(`metadata[${key}_activated_at]`, new Date().toISOString());
  form.set(`metadata[${key}_activation]`, '1');
  form.set(`metadata[${key}_activation_source]`, 'secure_workspace_v1');
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(s.id)}`, {
    method:'POST', headers:{ Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded' }, body:form
  });
  return r.ok;
}
function workspaceHtml() {
return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Solo Company OS</title><style>:root{--b:#0b0d10;--p:#14181d;--t:#f3f5f7;--m:#aab2bc;--l:#2a3139}*{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font-family:Inter,system-ui,sans-serif;line-height:1.55}.w{max-width:980px;margin:auto;padding:28px 18px 80px}.brand{font-size:12px;letter-spacing:.14em;color:var(--m)}h1{font-size:clamp(38px,7vw,68px);line-height:1}.lead,.m{color:var(--m)}.card{background:var(--p);border:1px solid var(--l);border-radius:18px;padding:20px;margin:15px 0}textarea{width:100%;min-height:190px;background:#0d1014;color:var(--t);border:1px solid var(--l);border-radius:12px;padding:14px;font:13px/1.45 ui-monospace,monospace}.copy{padding:9px 12px;border:0;border-radius:10px;font-weight:700;margin-top:8px;cursor:pointer}.nav a{color:var(--t);text-decoration:none;margin-right:14px}.ok{border-left:3px solid #d7dbe0}</style></head><body><main class="w"><div class="brand">STRATUM PRAXIS · VERIFIED PURCHASE</div><h1>Solo Company OS</h1><p class="lead">One person. Six company functions. Improve the weakest link before adding more tools or products.</p><div class="nav"><a href="#r">Research</a><a href="#d">Decision</a><a href="#b">Build</a><a href="#s">Sell</a><a href="#m">Measure</a><a href="#i">Improve</a></div><section id="r" class="card"><h2>1. Research</h2><textarea readonly>ROLE: Market signal analyst.\n\nFind evidence that a specific buyer already has a painful, frequent, or expensive problem. Collect 10 signals from search results, marketplaces, public communities, reviews, job posts, competitor pricing, or repeated complaints.\n\nFor each signal capture: buyer type, exact problem, urgency, willingness to pay, current workaround, competitor weakness, source/date.\n\nDo not propose products yet. Return the 3 strongest repeated problems and why each is commercially meaningful.</textarea><button class="copy">Copy</button></section><section id="d" class="card"><h2>2. Decision</h2><textarea readonly>Score each candidate: Demand 15; Willingness to pay 15; Urgency 10; AI solvability 10; Repeat usage 10; Automation potential 10; Gross margin 10; Organic acquisition potential 10; Competitive advantage 5; Can sell today 5.\n\nRequire evidence for every score. Penalize dependence on audience size, paid ads, fragile scraping, or policy-risk automation. Reject below 80/100 unless a cheap test can resolve uncertainty. Return one winner, one backup, and explicit rejection reasons.</textarea><button class="copy">Copy</button></section><section id="b" class="card"><h2>3. Build</h2><textarea readonly>Turn the winner into a minimum sellable outcome. Define: buyer; triggering problem; outcome; buyer input; delivered output; time-to-value under 10 minutes; what AI does; what needs human approval; what v1 excludes; delivery format. Build only what is required for first purchase and first successful use.</textarea><button class="copy">Copy</button></section><section id="s" class="card"><h2>4. Sell</h2><textarea readonly>Write the offer around one concrete transformation: outcome-led headline; who it is for; expensive/frustrating current state; what changes; what is included; first value in under 10 minutes; price; what it does not promise; CTA. Avoid unsupported income claims, fake scarcity, invented testimonials, and vague productivity claims.</textarea><button class="copy">Copy</button></section><section id="m" class="card"><h2>5. Measure</h2><p class="m">Landing views → diagnostic starts → completions → checkout clicks → purchases → activation.</p><textarea readonly>Weekly funnel review: for each stage report count, conversion from prior stage, change vs prior period, and strongest evidence for drop-off. Select ONE bottleneck. Propose the smallest change most likely to improve it. Define metric and time window before changing anything.</textarea><button class="copy">Copy</button></section><section id="i" class="card"><h2>6. Improve</h2><textarea readonly>Run a bottleneck review. What generated value or revenue? What consumed time without evidence? What stage is weakest? What should stop? What should be standardized? What remains human-controlled? What can safely automate? What single experiment runs next?\n\nRule: improve the weakest link before creating a new product.</textarea><button class="copy">Copy</button></section><section class="card ok"><h2>Human approval boundaries</h2><p>Never use infinite retries. Require human review for account creation, irreversible publishing, legal or financial claims, sending messages to real people, high-frequency external actions, CAPTCHA, suspicious login challenges, or actions that could trigger platform enforcement.</p></section><p class="m">Access is tied to a verified Stripe purchase. No income outcome is guaranteed.</p></main><script>document.querySelectorAll('.copy').forEach(b=>b.onclick=async()=>{const t=b.previousElementSibling;await navigator.clipboard.writeText(t.value);const x=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=x,1000)})</script></body></html>`;
}
function riskWorkspaceHtml() {
return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>AI Agent Risk & Cost Audit</title><style>:root{--b:#090b0e;--p:#111820;--l:#2d3743;--t:#f2f5f7;--m:#a8b2bd;--a:#8fd3ff}*{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font:15px/1.6 Inter,system-ui,-apple-system,sans-serif}.w{max-width:1000px;margin:auto;padding:30px 18px 80px}h1{font-size:clamp(36px,7vw,64px);line-height:1}.m{color:var(--m)}.card{background:var(--p);border:1px solid var(--l);border-radius:16px;padding:20px;margin:14px 0}.check{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--l)}.check:last-child{border:0}.check input{margin-top:5px}.score{font-size:34px;font-weight:800}.bar{height:10px;background:#202a34;border-radius:999px;overflow:hidden}.bar i{display:block;height:100%;width:0;background:var(--a)}textarea{width:100%;min-height:140px;background:#090e14;color:var(--t);border:1px solid var(--l);border-radius:10px;padding:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:760px){.grid{grid-template-columns:1fr}}button{padding:10px 14px;border:0;border-radius:9px;font-weight:800;cursor:pointer}</style></head><body><main class="w"><p class="m">STRATUM PRAXIS · VERIFIED PURCHASE</p><h1>AI Agent Risk & Cost Audit</h1><p class="m">Self-serve pre-production diagnostic for AI agents and MCP-connected workflows. Review permission scope, cost exposure, reliability, and remediation priority.</p><div class="grid"><section class="card"><h2>1 · Permission & control scan</h2><div id="perm"></div></section><section class="card"><h2>2 · Cost & runaway exposure</h2><div id="cost"></div></section></div><section class="card"><h2>3 · Reliability red flags</h2><div id="rel"></div></section><section class="card"><h2>Audit result</h2><div class="score"><span id="score">0</span>/100 risk</div><div class="bar"><i id="bar"></i></div><p id="verdict" class="m">Complete the checks to generate a priority.</p></section><section class="card"><h2>4 · Prioritized remediation checklist</h2><ol id="actions"></ol></section><section class="card"><h2>Deployment note</h2><textarea id="note" placeholder="Record workflow, owner, approval boundary, monthly budget ceiling, rollback method, and evidence required before production."></textarea><button id="copy">Copy audit summary</button></section><p class="m">Operational decision support only; not legal, cybersecurity, compliance, procurement, or financial advice. Re-check provider terms, permissions, pricing and model behavior before production use.</p></main><script>
const groups={perm:[['Agent can write/delete/publish without a human gate',20,'Add human approval before irreversible or externally visible actions.'],['Connector/MCP permissions exceed the task minimum',14,'Reduce connector scopes to minimum required permissions.'],['Secrets or privileged credentials are broadly available to the agent',18,'Move secrets behind narrowly scoped server-side controls.'],['No explicit retry ceiling or duplicate-action guard exists',12,'Set retry caps and idempotency/duplicate-side-effect protection.']],cost:[['No per-run or monthly cost ceiling exists',12,'Set hard budget ceilings and alerts.'],['Long context or repeated tool calls are not measured',8,'Measure token/tool usage and trim repeated context.'],['Failure retries can multiply paid API/tool calls',10,'Cap retries and stop automatically after repeated failure.']],rel:[['Success is accepted from agent text without external verification',12,'Verify important side effects against the system of record.'],['No rollback/kill switch exists for production actions',12,'Define rollback and immediate stop procedure.'],['No owner reviews exceptions or drift',8,'Assign an owner and recurring exception review.']]};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function render(id,arr){document.getElementById(id).innerHTML=arr.map(function(x){return '<label class="check"><input type="checkbox" data-w="'+x[1]+'" data-fix="'+esc(x[2])+'"><span>'+esc(x[0])+'</span></label>'}).join('')}
render('perm',groups.perm);render('cost',groups.cost);render('rel',groups.rel);const all=[...document.querySelectorAll('input[type=checkbox]')];
function calc(){let raw=all.filter(function(x){return x.checked}).reduce(function(a,x){return a+Number(x.dataset.w)},0);const score=Math.min(100,raw);document.getElementById('score').textContent=score;document.getElementById('bar').style.width=score+'%';document.getElementById('verdict').textContent=score>=60?'HIGH — hold production until blocking controls are fixed.':score>=30?'MEDIUM — remediate priority gaps before expanding autonomy.':'LOWER — no major checked red flags, but validate assumptions and monitor.';const fixes=all.filter(function(x){return x.checked}).sort(function(a,b){return Number(b.dataset.w)-Number(a.dataset.w)}).map(function(x){return '<li>'+esc(x.dataset.fix)+'</li>'}).join('');document.getElementById('actions').innerHTML=fixes||'<li>No checked red flags. Document approval boundaries, budget ceiling, verification, rollback and owner before production.</li>'}
all.forEach(function(x){x.addEventListener('change',calc)});calc();document.getElementById('copy').onclick=async function(){const lines=[...document.querySelectorAll('#actions li')].map(function(x,i){return (i+1)+'. '+x.textContent}).join('\n');const t='AI Agent Risk & Cost Audit\nRisk score: '+document.getElementById('score').textContent+'/100\n'+document.getElementById('verdict').textContent+'\n\nPriority actions:\n'+lines+'\n\nDeployment note:\n'+document.getElementById('note').value;await navigator.clipboard.writeText(t);document.getElementById('copy').textContent='Copied'};
</script></body></html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = new Set(['https://stratumpraxis.github.io','https://stratumpraxis.com']);
    const cors = { 'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store' };
    if (allowed.has(origin)) cors['Access-Control-Allow-Origin'] = origin;
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:cors});
    if (!env.STRIPE_SECRET_KEY) return json({error:'Server is not configured'},500,cors);
    try {
      if (request.method === 'GET' && url.pathname === '/verify') {
        const sid = url.searchParams.get('session_id'); const offer = url.searchParams.get('offer'); const exp = offers(env)[offer];
        if (!sid?.startsWith('cs_') || !exp) return json({error:'Invalid request'},400,cors);
        const s = await getSession(env,sid); if (!paidFor(s,exp)) return json({paid:false,error:'Payment not confirmed for this offer'},402,cors);
        return json({paid:true,offer,session_id:s.id,amount_total:s.amount_total,currency:s.currency,price_id:exp.priceId,payment_link:s.payment_link},200,cors);
      }
      if (request.method === 'POST' && url.pathname === '/scos/login') {
        const body = await request.json(); const sid = String(body.session_id||''); const email = String(body.email||'').trim().toLowerCase();
        if (!sid.startsWith('cs_') || !email) return json({error:'Session ID and purchase email are required'},400,cors);
        const exp = offers(env).scos; const s = await getSession(env,sid); if (!paidFor(s,exp)) return json({error:'Solo Company OS payment was not confirmed'},402,cors);
        const paidEmail = String(s.customer_details?.email || s.customer_email || '').trim().toLowerCase(); if (!paidEmail || paidEmail !== email) return json({error:'Purchase email does not match'},403,cors);
        await capturePostHog(env,s.id,'revenue_verified','solo_company_os',{amount_total:s.amount_total,currency:s.currency});
        const token = await signToken(env.STRIPE_SECRET_KEY,s.id,'scos'); return json({authorized:true,workspace_url:`${url.origin}/scos/workspace?token=${encodeURIComponent(token)}`},200,cors);
      }
      if (request.method === 'GET' && url.pathname === '/scos/workspace') {
        const p = await verifyToken(env.STRIPE_SECRET_KEY,url.searchParams.get('token')); if (!p || (p.product && p.product !== 'scos')) return new Response('Access token is invalid or expired.',{status:401,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
        const s = await getSession(env,p.sid); const exp = offers(env).scos; if (!paidFor(s,exp)) return new Response('Purchase could not be verified.',{status:402,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
        const tracked = await markActivated(env,s,'scos'); if (tracked) await capturePostHog(env,s.id,'activation','solo_company_os',{activation_source:'secure_workspace_v1'});
        return new Response(workspaceHtml(),{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-SCOS-Activation-Tracked':tracked?'1':'0'}});
      }
      if (request.method === 'POST' && url.pathname === '/risk/login') {
        const body = await request.json(); const sid = String(body.session_id||''); const email = String(body.email||'').trim().toLowerCase();
        if (!sid.startsWith('cs_') || !email) return json({error:'Session ID and purchase email are required'},400,cors);
        const exp = offers(env).risk; const s = await getSession(env,sid); if (!paidFor(s,exp)) return json({error:'AI Agent Risk & Cost Audit payment was not confirmed'},402,cors);
        const paidEmail = String(s.customer_details?.email || s.customer_email || '').trim().toLowerCase(); if (!paidEmail || paidEmail !== email) return json({error:'Purchase email does not match'},403,cors);
        await capturePostHog(env,s.id,'revenue_verified','ai_agent_risk_cost_audit',{amount_total:s.amount_total,currency:s.currency});
        const token = await signToken(env.STRIPE_SECRET_KEY,s.id,'risk'); return json({authorized:true,workspace_url:`${url.origin}/risk/workspace?token=${encodeURIComponent(token)}`},200,cors);
      }
      if (request.method === 'GET' && url.pathname === '/risk/workspace') {
        const p = await verifyToken(env.STRIPE_SECRET_KEY,url.searchParams.get('token')); if (!p || p.product !== 'risk') return new Response('Access token is invalid or expired.',{status:401,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
        const s = await getSession(env,p.sid); const exp = offers(env).risk; if (!paidFor(s,exp)) return new Response('Purchase could not be verified.',{status:402,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
        const tracked = await markActivated(env,s,'risk'); if (tracked) await capturePostHog(env,s.id,'activation','ai_agent_risk_cost_audit',{activation_source:'secure_workspace_v1'});
        return new Response(riskWorkspaceHtml(),{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-Risk-Activation-Tracked':tracked?'1':'0'}});
      }
      return json({error:'Not found'},404,cors);
    } catch (e) { return json({error:'Verification error'},500,cors); }
  }
};
