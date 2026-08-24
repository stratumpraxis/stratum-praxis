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
async function signToken(secret, sid) {
  const payload = b64u(te.encode(JSON.stringify({ sid, exp: Date.now() + 30*24*60*60*1000 })));
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
async function capturePostHog(env, sid, event, properties = {}) {
  if (!env.POSTHOG_PROJECT_TOKEN || !sid) return false;
  try {
    const purchaseId = await anonymousPurchaseId(sid);
    const payload = {
      api_key: env.POSTHOG_PROJECT_TOKEN,
      distinct_id: 'scos_' + purchaseId,
      event,
      properties: {
        product: 'solo_company_os',
        source: 'verified_worker',
        '$process_person_profile': false,
        '$insert_id': `scos-${event}-${purchaseId}`,
        ...properties
      }
    };
    const r = await fetch('https://us.i.posthog.com/i/v0/e/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return r.ok;
  } catch { return false; }
}
function offers(env) {
  return {
    report:{ priceId:env.REPORT_PRICE_ID,paymentLinkId:env.REPORT_PAYMENT_LINK_ID,amount:1980,currency:'jpy' },
    kit:{ priceId:env.KIT_PRICE_ID,paymentLinkId:env.KIT_PAYMENT_LINK_ID,amount:4980,currency:'jpy' },
    scos:{ priceId:env.SCOS_PRICE_ID,paymentLinkId:env.SCOS_PAYMENT_LINK_ID,amount:4900,currency:'usd' }
  };
}
async function getSession(env, sid) {
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`, { headers:{ Authorization:`Bearer ${env.STRIPE_SECRET_KEY}` } });
  const s = await r.json(); if (!r.ok) throw new Error('Stripe verification failed'); return s;
}
function paidFor(s, expected) {
  const li = s.line_items?.data || [];
  return s.payment_status === 'paid' && s.mode === 'payment' &&
    li.length === 1 && li[0]?.price?.id === expected.priceId && Number(li[0]?.quantity||0) === 1 &&
    Number(s.amount_total) === expected.amount && String(s.currency||'').toLowerCase() === expected.currency &&
    s.payment_link === expected.paymentLinkId;
}
async function markActivated(env, s) {
  if (s.metadata?.scos_activated_at) return true;
  const form = new URLSearchParams();
  form.set('metadata[scos_activated_at]', new Date().toISOString());
  form.set('metadata[scos_activation]', '1');
  form.set('metadata[scos_activation_source]', 'secure_workspace_v1');
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(s.id)}`, {
    method:'POST', headers:{ Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded' }, body:form
  });
  return r.ok;
}
function workspaceHtml() {
return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Solo Company OS</title><style>:root{--b:#0b0d10;--p:#14181d;--t:#f3f5f7;--m:#aab2bc;--l:#2a3139}*{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font-family:Inter,system-ui,sans-serif;line-height:1.55}.w{max-width:980px;margin:auto;padding:28px 18px 80px}.brand{font-size:12px;letter-spacing:.14em;color:var(--m)}h1{font-size:clamp(38px,7vw,68px);line-height:1}.lead,.m{color:var(--m)}.card{background:var(--p);border:1px solid var(--l);border-radius:18px;padding:20px;margin:15px 0}textarea{width:100%;min-height:190px;background:#0d1014;color:var(--t);border:1px solid var(--l);border-radius:12px;padding:14px;font:13px/1.45 ui-monospace,monospace}.copy{padding:9px 12px;border:0;border-radius:10px;font-weight:700;margin-top:8px;cursor:pointer}.nav a{color:var(--t);text-decoration:none;margin-right:14px}.ok{border-left:3px solid #d7dbe0}</style></head><body><main class="w"><div class="brand">STRATUM PRAXIS · VERIFIED PURCHASE</div><h1>Solo Company OS</h1><p class="lead">One person. Six company functions. Improve the weakest link before adding more tools or products.</p><div class="nav"><a href="#r">Research</a><a href="#d">Decision</a><a href="#b">Build</a><a href="#s">Sell</a><a href="#m">Measure</a><a href="#i">Improve</a></div>
<section id="r" class="card"><h2>1. Research</h2><textarea readonly>ROLE: Market signal analyst.\n\nFind evidence that a specific buyer already has a painful, frequent, or expensive problem. Collect 10 signals from search results, marketplaces, public communities, reviews, job posts, competitor pricing, or repeated complaints.\n\nFor each signal capture: buyer type, exact problem, urgency, willingness to pay, current workaround, competitor weakness, source/date.\n\nDo not propose products yet. Return the 3 strongest repeated problems and why each is commercially meaningful.</textarea><button class="copy">Copy</button></section>
<section id="d" class="card"><h2>2. Decision</h2><textarea readonly>Score each candidate: Demand 15; Willingness to pay 15; Urgency 10; AI solvability 10; Repeat usage 10; Automation potential 10; Gross margin 10; Organic acquisition potential 10; Competitive advantage 5; Can sell today 5.\n\nRequire evidence for every score. Penalize dependence on audience size, paid ads, fragile scraping, or policy-risk automation. Reject below 80/100 unless a cheap test can resolve uncertainty. Return one winner, one backup, and explicit rejection reasons.</textarea><button class="copy">Copy</button></section>
<section id="b" class="card"><h2>3. Build</h2><textarea readonly>Turn the winner into a minimum sellable outcome. Define: buyer; triggering problem; outcome; buyer input; delivered output; time-to-value under 10 minutes; what AI does; what needs human approval; what v1 excludes; delivery format. Build only what is required for first purchase and first successful use.</textarea><button class="copy">Copy</button></section>
<section id="s" class="card"><h2>4. Sell</h2><textarea readonly>Write the offer around one concrete transformation: outcome-led headline; who it is for; expensive/frustrating current state; what changes; what is included; first value in under 10 minutes; price; what it does not promise; CTA. Avoid unsupported income claims, fake scarcity, invented testimonials, and vague productivity claims.</textarea><button class="copy">Copy</button></section>
<section id="m" class="card"><h2>5. Measure</h2><p class="m">Landing views → diagnostic starts → completions → checkout clicks → purchases → activation.</p><textarea readonly>Weekly funnel review: for each stage report count, conversion from prior stage, change vs prior period, and strongest evidence for drop-off. Select ONE bottleneck. Propose the smallest change most likely to improve it. Define metric and time window before changing anything.</textarea><button class="copy">Copy</button></section>
<section id="i" class="card"><h2>6. Improve</h2><textarea readonly>Run a bottleneck review. What generated value or revenue? What consumed time without evidence? What stage is weakest? What should stop? What should be standardized? What remains human-controlled? What can safely automate? What single experiment runs next?\n\nRule: improve the weakest link before creating a new product.</textarea><button class="copy">Copy</button></section>
<section class="card ok"><h2>Human approval boundaries</h2><p>Never use infinite retries. Require human review for account creation, irreversible publishing, legal or financial claims, sending messages to real people, high-frequency external actions, CAPTCHA, suspicious login challenges, or actions that could trigger platform enforcement.</p></section><p class="m">Access is tied to a verified Stripe purchase. No income outcome is guaranteed.</p></main><script>document.querySelectorAll('.copy').forEach(b=>b.onclick=async()=>{const t=b.previousElementSibling;await navigator.clipboard.writeText(t.value);const x=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=x,1000)})</script></body></html>`;
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
        const sid = url.searchParams.get('session_id'); const offer = url.searchParams.get('offer');
        const exp = offers(env)[offer];
        if (!sid?.startsWith('cs_') || !exp) return json({error:'Invalid request'},400,cors);
        const s = await getSession(env,sid);
        if (!paidFor(s,exp)) return json({paid:false,error:'Payment not confirmed for this offer'},402,cors);
        return json({paid:true,offer,session_id:s.id,amount_total:s.amount_total,currency:s.currency,price_id:exp.priceId,payment_link:s.payment_link},200,cors);
      }

      if (request.method === 'POST' && url.pathname === '/scos/login') {
        const body = await request.json(); const sid = String(body.session_id||''); const email = String(body.email||'').trim().toLowerCase();
        if (!sid.startsWith('cs_') || !email) return json({error:'Session ID and purchase email are required'},400,cors);
        const exp = offers(env).scos; const s = await getSession(env,sid);
        if (!paidFor(s,exp)) return json({error:'Solo Company OS payment was not confirmed'},402,cors);
        const paidEmail = String(s.customer_details?.email || s.customer_email || '').trim().toLowerCase();
        if (!paidEmail || paidEmail !== email) return json({error:'Purchase email does not match'},403,cors);
        await capturePostHog(env, s.id, 'revenue_verified', { amount_total: s.amount_total, currency: s.currency });
        const token = await signToken(env.STRIPE_SECRET_KEY,s.id);
        return json({authorized:true,workspace_url:`${url.origin}/scos/workspace?token=${encodeURIComponent(token)}`},200,cors);
      }

      if (request.method === 'GET' && url.pathname === '/scos/workspace') {
        const p = await verifyToken(env.STRIPE_SECRET_KEY,url.searchParams.get('token'));
        if (!p) return new Response('Access token is invalid or expired.',{status:401,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
        const s = await getSession(env,p.sid); const exp = offers(env).scos;
        if (!paidFor(s,exp)) return new Response('Purchase could not be verified.',{status:402,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
        const tracked = await markActivated(env,s);
        if (tracked) await capturePostHog(env, s.id, 'activation', { activation_source: 'secure_workspace_v1' });
        return new Response(workspaceHtml(),{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-SCOS-Activation-Tracked':tracked?'1':'0'}});
      }

      return json({error:'Not found'},404,cors);
    } catch (e) {
      return json({error:'Verification error'},500,cors);
    }
  }
};
