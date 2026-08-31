import baseWorker from './paid-insights-worker.js';

const te = new TextEncoder();
const td = new TextDecoder();
const PRODUCT_ID = 'prod_VA15eq5Gxy3Zzj';
const OFFERS = {
  cross_personal: {
    license: 'personal',
    priceId: 'price_1U9h41JMK7zFs997QSWUJZrI',
    paymentLinkId: 'plink_1U9h4LJMK7zFs997nRbhDVq9',
    amount: 6900,
    currency: 'usd'
  },
  cross_commercial: {
    license: 'commercial',
    priceId: 'price_1U9h48JMK7zFs9971zEnU7Ue',
    paymentLinkId: 'plink_1U9h4QJMK7zFs997EbnP5tS3',
    amount: 14900,
    currency: 'usd'
  },
  cross_agency: {
    license: 'agency',
    priceId: 'price_1U9h4FJMK7zFs997YUDnLz4N',
    paymentLinkId: 'plink_1U9h4VJMK7zFs997YyCnb8Vr',
    amount: 29900,
    currency: 'usd'
  }
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}
function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64u(s) {
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
async function stripeGet(env, path) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const x = await r.json();
  if (!r.ok) throw new Error('Stripe verification failed');
  return x;
}
async function stripePost(env, path, body) {
  return fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
}
async function getSession(env, sid) {
  return stripeGet(env, `checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`);
}
function paidFor(s, offer) {
  const li = s.line_items?.data || [];
  return s.payment_status === 'paid' &&
    s.mode === 'payment' &&
    li.length === 1 &&
    li[0]?.price?.id === offer.priceId &&
    li[0]?.price?.product === PRODUCT_ID &&
    Number(li[0]?.quantity || 0) === 1 &&
    Number(s.amount_total) === offer.amount &&
    String(s.currency || '').toLowerCase() === offer.currency &&
    s.payment_link === offer.paymentLinkId;
}
async function sign(secret, sid, offerKey, email) {
  const payload = b64u(te.encode(JSON.stringify({ sid, offer: offerKey, email, exp: Date.now() + 30 * 864e5 })));
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, te.encode('cross-agent-kit-v1|' + payload));
  return payload + '.' + b64u(new Uint8Array(sig));
}
async function verify(secret, token) {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const key = await crypto.subtle.importKey('raw', te.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, fromB64u(sig), te.encode('cross-agent-kit-v1|' + payload));
    if (!ok) return null;
    const p = JSON.parse(td.decode(fromB64u(payload)));
    return p.sid && OFFERS[p.offer] && p.email && p.exp > Date.now() ? p : null;
  } catch { return null; }
}
async function productText(env) {
  const product = await stripeGet(env, `products/${PRODUCT_ID}`);
  const md = product.metadata || {};
  const keys = Object.keys(md)
    .filter(k => /^content_\d+$/.test(k))
    .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));
  if (!keys.length) throw new Error('Delivery content is not configured');
  return keys.map(k => md[k]).join('');
}
async function markActivated(env, session, offer) {
  const key = `cross_agent_${offer.license}`;
  if (session.metadata?.[`${key}_activated_at`]) return true;
  const body = new URLSearchParams();
  body.set(`metadata[${key}_activated_at]`, new Date().toISOString());
  body.set(`metadata[${key}_activation]`, '1');
  body.set(`metadata[${key}_activation_source]`, 'secure_workspace_v1');
  const r = await stripePost(env, `checkout/sessions/${encodeURIComponent(session.id)}`, body);
  return r.ok;
}
async function capture(env, sid, event, offer) {
  if (!env.POSTHOG_PROJECT_TOKEN) return;
  try {
    const digest = await crypto.subtle.digest('SHA-256', te.encode('cross-agent-kit|' + sid));
    const id = b64u(new Uint8Array(digest)).slice(0, 32);
    await fetch('https://us.i.posthog.com/i/v0/e/', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        api_key: env.POSTHOG_PROJECT_TOKEN,
        event,
        distinct_id: 'verified_' + id,
        properties: {
          product: 'cross_agent_operating_kit',
          license: offer.license,
          source: 'verified_worker',
          '$process_person_profile': false,
          '$insert_id': `cross-agent-${event}-${id}`
        }
      })
    });
  } catch {}
}
function workspacePage(license, text) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Cross-Agent Operating Kit | ${esc(license)} access</title><style>:root{color-scheme:dark;--b:#080b12;--p:#111824;--l:#2b374b;--t:#f5f7fb;--m:#9da9ba;--a:#72d8ff}*{box-sizing:border-box}body{margin:0;background:var(--b);color:var(--t);font:15px/1.6 Inter,system-ui,sans-serif}.w{max-width:980px;margin:auto;padding:34px 18px 80px}.ey{font-size:11px;letter-spacing:.15em;color:var(--a);font-weight:900;text-transform:uppercase}h1{font-size:clamp(38px,7vw,68px);line-height:1;margin:.35em 0}.notice{border:1px solid var(--l);background:var(--p);border-radius:15px;padding:16px 18px;color:var(--m);margin:24px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0b111a;border:1px solid var(--l);border-radius:16px;padding:20px;color:#e8edf3;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.fine{color:var(--m);font-size:12px}</style></head><body><main class="w"><div class="ey">STRATUM PRAXIS · VERIFIED PURCHASE</div><h1>Cross-Agent Operating Kit</h1><div class="notice"><b>${esc(license[0].toUpperCase()+license.slice(1))} license verified.</b> This private workspace is re-verified against Stripe whenever it opens. Keep this access link private.</div><pre>${esc(text)}</pre><p class="fine">Source-kit redistribution, public mirroring, resale and sublicensing are not included unless explicitly granted by the purchased license.</p></main></body></html>`;
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith('/cross-agent-kit/')) return baseWorker.fetch(req, env, ctx);
    const origin = req.headers.get('Origin') || '';
    const allowed = new Set(['https://stratumpraxis.com', 'https://stratumpraxis.github.io']);
    const cors = allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Vary':'Origin' } : {};
    if (req.method === 'OPTIONS') return new Response(null, { status:204, headers:{ ...cors, 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'POST,GET,OPTIONS' } });
    if (!env.STRIPE_SECRET_KEY) return json({ error:'Server is not configured' }, 500, cors);
    try {
      if (req.method === 'POST' && u.pathname === '/cross-agent-kit/login') {
        const body = await req.json();
        const sid = String(body.session_id || '');
        const email = String(body.email || '').trim().toLowerCase();
        const offerKey = String(body.offer || '');
        const offer = OFFERS[offerKey];
        if (!sid.startsWith('cs_') || !email || !offer) return json({ error:'Valid Checkout Session, purchase email and license are required' }, 400, cors);
        const session = await getSession(env, sid);
        if (!paidFor(session, offer)) return json({ error:'Cross-Agent Operating Kit payment was not confirmed for this license' }, 402, cors);
        const purchaseEmail = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
        if (!purchaseEmail || purchaseEmail !== email) return json({ error:'Purchase email does not match' }, 403, cors);
        await capture(env, sid, 'revenue_verified', offer);
        const token = await sign(env.STRIPE_SECRET_KEY, sid, offerKey, email);
        return json({ authorized:true, workspace_url:`${u.origin}/cross-agent-kit/workspace?token=${encodeURIComponent(token)}` }, 200, cors);
      }
      if (req.method === 'GET' && u.pathname === '/cross-agent-kit/workspace') {
        const p = await verify(env.STRIPE_SECRET_KEY, u.searchParams.get('token'));
        if (!p) return new Response('Access token is invalid or expired.', { status:401, headers:{ 'Cache-Control':'no-store' } });
        const offer = OFFERS[p.offer];
        const session = await getSession(env, p.sid);
        if (!paidFor(session, offer)) return new Response('Purchase could not be verified.', { status:402, headers:{ 'Cache-Control':'no-store' } });
        const purchaseEmail = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
        if (!purchaseEmail || purchaseEmail !== p.email) return new Response('Purchase identity could not be verified.', { status:403, headers:{ 'Cache-Control':'no-store' } });
        const content = await productText(env);
        const tracked = await markActivated(env, session, offer);
        if (tracked) await capture(env, p.sid, 'activation', offer);
        return new Response(workspacePage(offer.license, content), {
          status:200,
          headers:{
            'Content-Type':'text/html; charset=utf-8',
            'Cache-Control':'no-store, private',
            'X-Robots-Tag':'noindex,nofollow,noarchive',
            'Referrer-Policy':'no-referrer',
            'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
            'X-Cross-Agent-Activation-Tracked': tracked ? '1' : '0'
          }
        });
      }
      return json({ error:'Not found' }, 404, cors);
    } catch {
      return json({ error:'Purchase verification or delivery failed' }, 500, cors);
    }
  }
};
