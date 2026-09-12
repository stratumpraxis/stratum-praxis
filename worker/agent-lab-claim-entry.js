import baseWorker, { AgentLabEntitlements } from './agent-lab-checkout-worker.js';

export { AgentLabEntitlements };

const PAYMENT_URL = 'https://buy.stripe.com/5kQ3cwd3e0UHfAYdc76Zy0Y';
const PAYMENT_LINK = 'plink_1UD36rJMK7zFs997NYbev0fs';
const ROUTE = 'agent_lab_membership';
const AMOUNT = 1900;
const CURRENCY = 'usd';
const PENDING_COOKIE = 'sp_agent_lab_pending';
const MEMBER_COOKIE = 'sp_agent_lab_member';
const te = new TextEncoder();

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

function pendingCookie(ref, maxAge = 7200) {
  return `${PENDING_COOKIE}=${ref}; Path=/agent-lab/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function allowedOrigin(origin) {
  return origin === 'https://stratumpraxis.com' || origin === 'https://stratum-praxis-site.pages.dev' ||
    /^https:\/\/[a-z0-9-]+\.stratum-praxis-site\.pages\.dev$/i.test(origin || '');
}

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  return allowedOrigin(origin) ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  } : {};
}

function safeRoute(value) {
  return String(value || '').slice(0, 80).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'agent_lab_direct';
}

function newRef() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `al_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function validRef(value) {
  return /^al_[a-zA-Z0-9_-]{24,80}$/.test(String(value || ''));
}

function paymentUrl(ref, route) {
  const url = new URL(PAYMENT_URL);
  url.searchParams.set('client_reference_id', ref);
  url.searchParams.set('utm_source', 'stratumpraxis');
  url.searchParams.set('utm_medium', 'agent_lab');
  url.searchParams.set('utm_campaign', 'founding');
  url.searchParams.set('utm_content', route);
  return url.toString();
}

function entitlementStub(env, key) {
  if (!env.AGENT_LAB_ENTITLEMENTS) throw new Error('Entitlement store is not configured');
  const id = env.AGENT_LAB_ENTITLEMENTS.idFromName(key);
  return env.AGENT_LAB_ENTITLEMENTS.get(id);
}

async function readRecord(env, key) {
  const response = await entitlementStub(env, key).fetch('https://entitlement.internal/state');
  if (!response.ok) return null;
  return (await response.json())?.record || null;
}

async function writeRecord(env, key, patch) {
  const response = await entitlementStub(env, key).fetch('https://entitlement.internal/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error('Entitlement write failed');
  return (await response.json())?.record || null;
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

function hexToBytes(value) {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{2}/g), (part) => parseInt(part, 16));
}

async function verifyWebhook(raw, header, secret) {
  if (!secret) return false;
  const parts = String(header || '').split(',');
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(`${timestamp}.${raw}`)));
  return signatures.some((signature) => {
    const supplied = hexToBytes(signature);
    return supplied && sameBytes(expected, supplied);
  });
}

function isPaidAgentSession(session) {
  const subscription = typeof session?.subscription === 'string' ? session.subscription : session?.subscription?.id || '';
  const customer = typeof session?.customer === 'string' ? session.customer : session?.customer?.id || '';
  return Boolean(
    session &&
    (session.payment_link === PAYMENT_LINK || String(session.metadata?.market_route || '') === ROUTE) &&
    session.mode === 'subscription' &&
    session.payment_status === 'paid' &&
    Number(session.amount_total || 0) === AMOUNT &&
    String(session.currency || '').toLowerCase() === CURRENCY &&
    subscription && customer
  );
}

async function claimFromSession(session, event, env) {
  const ref = String(session?.client_reference_id || '');
  if (!validRef(ref) || !isPaidAgentSession(session)) return false;
  const subscription = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || '';
  const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id || '';
  await writeRecord(env, `claim:${ref}`, {
    route: ROUTE,
    active: true,
    ref,
    session_id: session.id,
    subscription_id: subscription,
    customer_id: customer,
    payment_status: session.payment_status,
    last_event_id: event?.id || '',
    last_event_type: event?.type || '',
    stripe_event_created: Number(event?.created || 0),
  });
  return true;
}

async function activationForSession(sessionId, request, env, ctx) {
  const url = new URL(request.url);
  const response = await baseWorker.fetch(new Request(`${url.origin}/agent-lab/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://stratumpraxis.com' },
    body: JSON.stringify({ session_id: sessionId }),
  }), env, ctx);
  const value = await response.json().catch(() => ({}));
  return response.ok && value?.claim_url ? value.claim_url : '';
}

function checkoutPage(ref, payUrl) {
  const safePay = esc(payUrl);
  const safeRef = esc(ref);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>Agent Lab · Secure Checkout</title><style>:root{--b:#06090e;--f:#f5f7fb;--m:#8290a2;--l:#25344a;--a:#72e8c9}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:18px;background:radial-gradient(700px 500px at 50% 10%,#12374366,transparent 64%),var(--b);color:var(--f);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}.c{width:min(620px,100%);border:1px solid var(--l);border-radius:28px;padding:26px;background:#091018;box-shadow:0 30px 90px #0009}.k{font-size:9px;letter-spacing:.17em;color:var(--a);font-weight:900}.core{width:92px;height:92px;border:1px solid #72e8c955;border-radius:27px;display:grid;place-items:center;margin:8px 0 26px;font-size:10px;font-weight:900;letter-spacing:.14em;box-shadow:0 0 60px #72e8c91f}h1{font-size:clamp(38px,9vw,62px);line-height:.93;letter-spacing:-.055em;margin:.18em 0}.m{color:var(--m);max-width:480px}.state{margin:20px 0 0;border:1px solid #2a3c53;border-radius:14px;padding:12px 13px;color:#bac6d5;font-size:11px}.state.ok{border-color:#72e8c955;color:#c8fff0}.pay{display:inline-flex;min-height:48px;align-items:center;padding:0 17px;border-radius:12px;background:var(--f);color:#071019;text-decoration:none;font-weight:900;margin-top:14px}.fine{font-size:9px;color:#5f6d7d;margin-top:12px}</style></head><body><main class="c"><div class="core">LAB</div><div class="k">AGENT LAB · $19/MO</div><h1>Checkout.<br>Then unlock.</h1><p class="m">Stripe opens in a separate tab. Keep this page open — it will unlock the Member Desk as soon as payment is confirmed.</p><div class="state" id="state">WAITING FOR STRIPE…</div><a class="pay" id="pay" href="${safePay}" target="_blank" rel="noopener">OPEN SECURE CHECKOUT →</a><div class="fine">If checkout did not open automatically, tap the button once. Ref ${safeRef.slice(0,12)}…</div></main><script>const ref=${JSON.stringify(ref)};const pay=${JSON.stringify(payUrl)};const state=document.getElementById('state');let opened=false;function openPay(){if(opened)return;opened=true;try{const w=window.open(pay,'_blank','noopener');if(!w){opened=false;state.textContent='TAP OPEN SECURE CHECKOUT';}}catch(e){opened=false;}}document.getElementById('pay').addEventListener('click',()=>{opened=true;state.textContent='CHECKOUT OPEN · WAITING FOR PAYMENT';});async function poll(){try{const r=await fetch('/agent-lab/pending?ref='+encodeURIComponent(ref),{cache:'no-store'});const v=await r.json();if(v&&v.paid&&v.claim_url){state.textContent='PAYMENT VERIFIED · OPENING MEMBER DESK';state.className='state ok';setTimeout(()=>location.replace(v.claim_url),250);return;}}catch(e){}setTimeout(poll,1400);}setTimeout(openPay,120);poll();</script></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = cors(request);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/agent-lab/')) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'POST' && url.pathname === '/stripe/webhook') {
      const rawRequest = request.clone();
      const baseRequest = request.clone();
      const raw = await rawRequest.text();
      const valid = await verifyWebhook(raw, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET || '');
      const response = await baseWorker.fetch(baseRequest, env, ctx);
      if (!valid || !response.ok) return response;
      try {
        const event = JSON.parse(raw);
        if (event?.type === 'checkout.session.completed' || event?.type === 'checkout.session.async_payment_succeeded') {
          await claimFromSession(event.data?.object || {}, event, env);
        }
      } catch (error) {
        console.error('Agent Lab claim mapping failed', error);
      }
      return response;
    }

    if (request.method === 'GET' && url.pathname === '/agent-lab/checkout') {
      const ref = newRef();
      const route = safeRoute(url.searchParams.get('route_id') || url.searchParams.get('utm_content'));
      const payUrl = paymentUrl(ref, route);
      return new Response(checkoutPage(ref, payUrl), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, private',
          'Set-Cookie': pendingCookie(ref),
          'X-Robots-Tag': 'noindex,nofollow,noarchive',
          'Referrer-Policy': 'no-referrer',
          'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/agent-lab/pending') {
      const ref = url.searchParams.get('ref') || '';
      if (!validRef(ref)) return json({ paid: false }, 400, corsHeaders);
      const record = await readRecord(env, `claim:${ref}`);
      if (!record?.active || !record.session_id || record.route !== ROUTE) {
        return json({ paid: false }, 202, corsHeaders);
      }
      const claimUrl = await activationForSession(record.session_id, request, env, ctx);
      if (!claimUrl) return json({ paid: false, verifying: true }, 202, corsHeaders);
      return json({ paid: true, claim_url: claimUrl }, 200, corsHeaders);
    }

    if (request.method === 'GET' && url.pathname === '/agent-lab/workspace' && !cookieValue(request, MEMBER_COOKIE)) {
      const ref = cookieValue(request, PENDING_COOKIE);
      if (validRef(ref)) {
        const record = await readRecord(env, `claim:${ref}`);
        if (record?.active && record.session_id && record.route === ROUTE) {
          const claimUrl = await activationForSession(record.session_id, request, env, ctx);
          if (claimUrl) {
            return new Response(null, {
              status: 303,
              headers: {
                Location: claimUrl,
                'Set-Cookie': pendingCookie('', 0),
                'Cache-Control': 'no-store',
              },
            });
          }
        }
      }
    }

    return baseWorker.fetch(request, env, ctx);
  },
};
