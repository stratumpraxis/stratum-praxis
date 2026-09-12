import baseWorker from './paid-insights-worker.js';

const te = new TextEncoder();
const td = new TextDecoder();
const OFFER = {
  price: 'price_1UD1ziJMK7zFs9974xN7gZqZ',
  paymentLink: 'plink_1UD36rJMK7zFs997NYbev0fs',
  amount: 1900,
  currency: 'usd',
  route: 'agent_lab_membership',
};
const PUBLIC_ORIGIN = 'https://stratumpraxis.com';
const MEMBER_PATH = '/agent-lab/workspace';
const COOKIE = 'sp_agent_lab_member';

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

function b64(bytes) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function unb64(value) {
  value = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  while (value.length % 4) value += '=';
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function stripe(env, path) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value?.error?.message || 'Stripe verification failed');
  return value;
}

async function stripePost(env, path, fields) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== '') body.set(key, String(value));
  }
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value?.error?.message || 'Stripe request failed');
  return value;
}

async function checkoutSession(env, sid) {
  return stripe(env, `checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`);
}

async function subscription(env, id) {
  return stripe(env, `subscriptions/${encodeURIComponent(id)}`);
}

function sessionMatches(session) {
  const items = session?.line_items?.data || [];
  const item = items[0];
  const ownRoute = String(session?.metadata?.market_route || '') === OFFER.route;
  const legacyLink = session?.payment_link === OFFER.paymentLink;
  return Boolean(
    session &&
    session.mode === 'subscription' &&
    session.payment_status === 'paid' &&
    session.status === 'complete' &&
    session.subscription &&
    session.customer &&
    items.length === 1 &&
    item?.price?.id === OFFER.price &&
    Number(item?.quantity || 0) === 1 &&
    Number(session.amount_total || 0) === OFFER.amount &&
    String(session.currency || '').toLowerCase() === OFFER.currency &&
    (ownRoute || legacyLink)
  );
}

function subscriptionAllowsAccess(sub) {
  return Boolean(sub && sub.status === 'active');
}

async function liveMembership(env, sid, expectedSubscription = '') {
  if (!String(sid || '').startsWith('cs_')) return null;
  const session = await checkoutSession(env, sid);
  if (!sessionMatches(session)) return null;
  if (expectedSubscription && session.subscription !== expectedSubscription) return null;
  const sub = await subscription(env, session.subscription);
  if (!subscriptionAllowsAccess(sub)) return null;
  return { session, subscription: sub };
}

async function sign(env, membership) {
  const secret = env.MEMBER_ACCESS_SECRET || env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Member signing is not configured');
  const payload = b64(te.encode(JSON.stringify({
    sid: membership.session.id,
    sub: membership.subscription.id,
    exp: Date.now() + 365 * 864e5,
  })));
  const key = await crypto.subtle.importKey(
    'raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC', key, te.encode(`agent-lab-member-v1|${payload}`),
  );
  return `${payload}.${b64(new Uint8Array(signature))}`;
}

async function verify(env, token) {
  try {
    const secret = env.MEMBER_ACCESS_SECRET || env.STRIPE_SECRET_KEY;
    if (!secret) return null;
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const key = await crypto.subtle.importKey(
      'raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, unb64(signature), te.encode(`agent-lab-member-v1|${payload}`),
    );
    if (!valid) return null;
    const value = JSON.parse(td.decode(unb64(payload)));
    if (!value.sid || !value.sub || Number(value.exp || 0) <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

function cookieValue(req, name) {
  const header = req.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

function memberCookie(token, maxAge = 31536000) {
  return `${COOKIE}=${token}; Path=/agent-lab/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function allowedOrigin(origin) {
  if (origin === PUBLIC_ORIGIN) return true;
  return /^https:\/\/[a-z0-9-]+\.stratum-praxis-site\.pages\.dev$/i.test(origin || '') ||
    origin === 'https://stratum-praxis-site.pages.dev';
}

function cors(req) {
  const origin = req.headers.get('Origin') || '';
  return allowedOrigin(origin) ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  } : {};
}

function safeReference(value) {
  const cleaned = String(value || '').slice(0, 180).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return cleaned || 'agent_lab_direct';
}

async function createCheckout(env, url) {
  const reference = safeReference(url.searchParams.get('route_id') || url.searchParams.get('utm_content'));
  return stripePost(env, 'checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': OFFER.price,
    'line_items[0][quantity]': '1',
    success_url: `${PUBLIC_ORIGIN}/agent-lab/access.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PUBLIC_ORIGIN}/agent-lab/?checkout=cancelled`,
    client_reference_id: reference,
    'metadata[market_route]': OFFER.route,
    'metadata[entry]': 'agent_lab_site',
    'subscription_data[metadata][market_route]': OFFER.route,
    'subscription_data[metadata][tier]': 'founding_member',
  });
}

function accessDenied(status = 401, message = 'Member access is required.') {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Agent Lab · Member access</title><style>body{margin:0;background:#06090e;color:#f5f7fb;font:15px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100svh}.c{width:min(520px,calc(100% - 32px));border:1px solid #25344a;border-radius:24px;padding:28px;background:#0a1018}.k{font-size:10px;letter-spacing:.16em;color:#72e8c9;font-weight:900}h1{font-size:34px;line-height:1;margin:.3em 0}.m{color:#8f9baa}.a{display:inline-flex;margin-top:14px;padding:12px 16px;border-radius:12px;background:#f5f7fb;color:#061019;text-decoration:none;font-weight:900}</style></head><body><main class="c"><div class="k">AGENT LAB · MEMBER</div><h1>Access locked.</h1><p class="m">${esc(message)}</p><a class="a" href="${PUBLIC_ORIGIN}/agent-lab/access.html">Member access →</a></main></body></html>`, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex,nofollow,noarchive',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

function memberPage(membership) {
  const canceling = membership.subscription.cancel_at_period_end === true;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>Agent Lab · Member</title><style>:root{--b:#06090e;--p:#0a1018;--l:#25344a;--f:#f5f7fb;--m:#8996a7;--a:#72e8c9;--c:#79d9ff;--v:#aa9bff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(800px 500px at 80% -120px,#15374a55,transparent 65%),var(--b);color:var(--f);font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}.w{width:min(980px,calc(100% - 28px));margin:auto;padding:22px 0 80px}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 26px}.brand{font-size:11px;letter-spacing:.17em;font-weight:900}.state{font-size:9px;letter-spacing:.12em;color:var(--a);border:1px solid #72e8c944;border-radius:999px;padding:6px 9px}.hero{min-height:42svh;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid var(--l);border-radius:28px;padding:24px;background:radial-gradient(60% 75% at 50% 35%,#13323b66,transparent 70%),#091018;position:relative;overflow:hidden}.hero:before{content:"";position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:44px 44px;opacity:.17}.k{position:relative;font-size:9px;letter-spacing:.17em;color:var(--a);font-weight:900}.hero h1{position:relative;font-size:clamp(42px,10vw,82px);line-height:.9;letter-spacing:-.055em;margin:.13em 0}.hero p{position:relative;margin:0;color:var(--m);max-width:520px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.card{border:1px solid var(--l);border-radius:22px;background:linear-gradient(180deg,#0d141e,#080d14);padding:20px;min-height:210px;display:flex;flex-direction:column;justify-content:space-between}.num{font-size:9px;color:#627186}.card h2{font-size:25px;line-height:1;margin:.25em 0}.card p{color:var(--m);margin:0}.flow{display:flex;gap:6px;flex-wrap:wrap;margin-top:18px}.flow i{font-style:normal;font-size:9px;letter-spacing:.08em;border:1px solid #31435c;border-radius:999px;padding:7px 9px;color:#b8c4d4}.flow i:nth-child(2){border-color:#72e8c955;color:#bff8e8}.flow i:nth-child(3){border-color:#aa9bff55;color:#d5cdff}.flow i:nth-child(4){border-color:#79d9ff55;color:#bfefff}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.actions a{display:inline-flex;min-height:43px;align-items:center;padding:0 14px;border-radius:11px;border:1px solid var(--l);color:var(--f);text-decoration:none;font-weight:850}.actions .primary{background:var(--f);color:#071019;border-color:var(--f)}.fine{color:#647184;font-size:10px;margin-top:18px}@media(max-width:680px){.grid{grid-template-columns:1fr}.hero{min-height:38svh}.card{min-height:180px}}</style></head><body><main class="w"><header class="top"><div class="brand">AGENT LAB · MEMBER</div><div class="state">${canceling ? 'ACTIVE · CANCELS AT PERIOD END' : 'ACTIVE'}</div></header><section class="hero"><div class="k">MEMBER FIELD DESK</div><h1>Run.<br>Trace. Reuse.</h1><p>The private layer: operating patterns, failure traces, reusable controls and revenue experiments.</p></section><section class="grid"><article class="card"><div><div class="num">01 · OPERATING LOOP</div><h2>Control the handoff.</h2><p>Give every run one owner, one observable output and one stop condition before adding another agent.</p></div><div class="flow"><i>RUN</i><i>TRACE</i><i>BREAK</i><i>REUSE</i></div></article><article class="card"><div><div class="num">02 · FAILURE TRACE</div><h2>More ≠ faster.</h2><p>When multiple agents share the same decision boundary, coordination cost can erase the speed gain. Split ownership before splitting work.</p></div><div class="flow"><i>OWNER</i><i>BOUNDARY</i><i>VERIFY</i></div></article><article class="card"><div><div class="num">03 · CONTROL TEMPLATE</div><h2>5-point check.</h2><p>Goal → owner → evidence → failure condition → next action. If one is missing, the run is not ready for autonomous execution.</p></div><div class="flow"><i>GOAL</i><i>OWNER</i><i>EVIDENCE</i><i>FAIL</i><i>NEXT</i></div></article><article class="card"><div><div class="num">04 · REVENUE LAB</div><h2>Evidence before reach.</h2><p>Payment → Checkout → Qualified Buyer Action → Qualified Traffic → Reach. Optimize the nearest missing evidence first.</p></div><div class="flow"><i>PAYMENT</i><i>CHECKOUT</i><i>BUYER</i><i>TRAFFIC</i></div></article></section><div class="actions"><a class="primary" href="/agent-lab/portal">Manage membership →</a><a href="${PUBLIC_ORIGIN}/agent-lab/">Public Lab</a><a href="/agent-lab/logout">Sign out</a></div><p class="fine">Access is checked against the live Stripe subscription on every protected request. A canceled-at-period-end membership stays available through its active paid period; inactive or failed subscriptions are denied.</p></main></body></html>`;
}

async function authenticate(req, env) {
  const payload = await verify(env, cookieValue(req, COOKIE));
  if (!payload) return null;
  const membership = await liveMembership(env, payload.sid, payload.sub);
  return membership ? { payload, membership } : null;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/agent-lab/')) return baseWorker.fetch(req, env, ctx);

    const corsHeaders = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    try {
      if (req.method === 'GET' && url.pathname === '/agent-lab/checkout') {
        const session = await createCheckout(env, url);
        if (!session?.url) return accessDenied(503, 'Checkout could not be created.');
        return Response.redirect(session.url, 303);
      }

      if (req.method === 'POST' && url.pathname === '/agent-lab/activate') {
        const body = await req.json();
        const sid = String(body?.session_id || '');
        if (!sid.startsWith('cs_')) return json({ error: 'A valid Checkout Session is required.' }, 400, corsHeaders);
        const membership = await liveMembership(env, sid);
        if (!membership) return json({ error: 'An active paid Agent Lab membership could not be verified.' }, 402, corsHeaders);
        const token = await sign(env, membership);
        return json({
          authorized: true,
          claim_url: `${url.origin}/agent-lab/claim?token=${encodeURIComponent(token)}`,
        }, 200, corsHeaders);
      }

      if (req.method === 'GET' && url.pathname === '/agent-lab/claim') {
        const token = url.searchParams.get('token') || '';
        const payload = await verify(env, token);
        if (!payload) return accessDenied(401, 'This access claim is invalid or expired.');
        const membership = await liveMembership(env, payload.sid, payload.sub);
        if (!membership) return accessDenied(402, 'The subscription is not currently active.');
        return new Response(null, {
          status: 303,
          headers: {
            Location: MEMBER_PATH,
            'Set-Cookie': memberCookie(token),
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          },
        });
      }

      if (req.method === 'GET' && url.pathname === MEMBER_PATH) {
        const auth = await authenticate(req, env);
        if (!auth) return accessDenied(401, 'Sign in again from your successful Agent Lab checkout. Inactive subscriptions cannot open the member desk.');
        return new Response(memberPage(auth.membership), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, private',
            'X-Robots-Tag': 'noindex,nofollow,noarchive',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
          },
        });
      }

      if (req.method === 'GET' && url.pathname === '/agent-lab/status') {
        const auth = await authenticate(req, env);
        if (!auth) return json({ active: false }, 401);
        return json({
          active: true,
          status: auth.membership.subscription.status,
          cancel_at_period_end: Boolean(auth.membership.subscription.cancel_at_period_end),
        });
      }

      if (req.method === 'GET' && url.pathname === '/agent-lab/portal') {
        const auth = await authenticate(req, env);
        if (!auth) return accessDenied(401, 'An active membership is required to manage billing.');
        const customer = auth.membership.session.customer;
        const portal = await stripePost(env, 'billing_portal/sessions', {
          customer,
          return_url: `${url.origin}${MEMBER_PATH}`,
        });
        if (!portal?.url) return accessDenied(503, 'Billing management is temporarily unavailable.');
        return Response.redirect(portal.url, 303);
      }

      if (req.method === 'GET' && url.pathname === '/agent-lab/logout') {
        return new Response(null, {
          status: 303,
          headers: {
            Location: `${PUBLIC_ORIGIN}/agent-lab/access.html`,
            'Set-Cookie': memberCookie('', 0),
            'Cache-Control': 'no-store',
          },
        });
      }

      return json({ error: 'Not found' }, 404, corsHeaders);
    } catch (error) {
      console.error('Agent Lab member error', error);
      return json({ error: 'Agent Lab membership verification failed.' }, 500, corsHeaders);
    }
  },
};
