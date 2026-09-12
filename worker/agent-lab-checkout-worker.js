import memberWorker from './agent-lab-worker.js';

const te = new TextEncoder();
const td = new TextDecoder();
const PUBLIC_ORIGIN = 'https://stratumpraxis.com';
const PAYMENT_LINK = 'plink_1UD36rJMK7zFs997NYbev0fs';
const PAYMENT_URL = 'https://buy.stripe.com/5kQ3cwd3e0UHfAYdc76Zy0Y';
const ROUTE = 'agent_lab_membership';
const AMOUNT = 1900;
const CURRENCY = 'usd';
const COOKIE = 'sp_agent_lab_member';
const MEMBER_PATH = '/agent-lab/workspace';

function j(value, status = 200, headers = {}) {
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
  const parts = String(header || '').split(',');
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, te.encode(`${timestamp}.${raw}`)),
  );
  return signatures.some((signature) => {
    const supplied = hexToBytes(signature);
    return supplied && sameBytes(expected, supplied);
  });
}

function allowedOrigin(origin) {
  return origin === PUBLIC_ORIGIN || origin === 'https://stratum-praxis-site.pages.dev' ||
    /^https:\/\/[a-z0-9-]+\.stratum-praxis-site\.pages\.dev$/i.test(origin || '');
}

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  return allowedOrigin(origin) ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  } : {};
}

function cookieValue(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

function memberCookie(token, maxAge = 31536000) {
  return `${COOKIE}=${token}; Path=/agent-lab/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function signingSecret(env) {
  return env.MEMBER_ACCESS_SECRET || env.STRIPE_WEBHOOK_SECRET || '';
}

async function signMember(env, record) {
  const secret = signingSecret(env);
  if (!secret) throw new Error('Member signing is not configured');
  const payload = b64(te.encode(JSON.stringify({
    sid: record.session_id,
    sub: record.subscription_id,
    exp: Date.now() + 365 * 864e5,
  })));
  const key = await crypto.subtle.importKey(
    'raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC', key, te.encode(`agent-lab-member-v2|${payload}`),
  );
  return `${payload}.${b64(new Uint8Array(signature))}`;
}

async function verifyMember(env, token) {
  try {
    const secret = signingSecret(env);
    if (!secret) return null;
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const key = await crypto.subtle.importKey(
      'raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, unb64(signature), te.encode(`agent-lab-member-v2|${payload}`),
    );
    if (!valid) return null;
    const value = JSON.parse(td.decode(unb64(payload)));
    if (!value.sid || !value.sub || Number(value.exp || 0) <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

function entitlementStub(env, key) {
  if (!env.AGENT_LAB_ENTITLEMENTS) throw new Error('Entitlement store is not configured');
  const id = env.AGENT_LAB_ENTITLEMENTS.idFromName(key);
  return env.AGENT_LAB_ENTITLEMENTS.get(id);
}

async function readEntitlement(env, key) {
  const response = await entitlementStub(env, key).fetch('https://entitlement.internal/state');
  if (!response.ok) return null;
  const value = await response.json();
  return value?.record || null;
}

async function writeEntitlement(env, key, patch) {
  const response = await entitlementStub(env, key).fetch('https://entitlement.internal/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error('Entitlement write failed');
  return (await response.json()).record;
}

function subscriptionIdFromInvoice(invoice) {
  const value = invoice?.subscription || invoice?.parent?.subscription_details?.subscription;
  return typeof value === 'string' ? value : value?.id || '';
}

function isAgentCheckout(session) {
  return Boolean(session && (
    session.payment_link === PAYMENT_LINK || String(session.metadata?.market_route || '') === ROUTE
  ));
}

async function handleAgentEvent(event, env) {
  const object = event?.data?.object || {};

  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'].includes(event.type)) {
    if (!isAgentCheckout(object)) return false;
    if (!String(object.id || '').startsWith('cs_')) return true;
    const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id || '';
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id || '';
    const successful = event.type !== 'checkout.session.async_payment_failed' &&
      object.mode === 'subscription' && object.payment_status === 'paid' &&
      Number(object.amount_total || 0) === AMOUNT &&
      String(object.currency || '').toLowerCase() === CURRENCY &&
      Boolean(subscriptionId) && Boolean(customerId);
    const base = {
      route: ROUTE,
      session_id: object.id,
      subscription_id: subscriptionId,
      customer_id: customerId,
      active: successful,
      status: successful ? 'active' : 'payment_failed',
      payment_status: object.payment_status || '',
      cancel_at_period_end: false,
      last_event_id: event.id || '',
      last_event_type: event.type,
      stripe_event_created: Number(event.created || 0),
    };
    await writeEntitlement(env, `session:${object.id}`, base);
    if (subscriptionId) await writeEntitlement(env, `sub:${subscriptionId}`, base);
    return true;
  }

  if (event.type.startsWith('customer.subscription.')) {
    const subscriptionId = String(object.id || '');
    if (!subscriptionId.startsWith('sub_')) return false;
    const existing = await readEntitlement(env, `sub:${subscriptionId}`);
    const agentRoute = String(object.metadata?.market_route || '') === ROUTE;
    if (!existing && !agentRoute) return false;
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : String(object.status || '');
    const active = event.type !== 'customer.subscription.deleted' && status === 'active';
    await writeEntitlement(env, `sub:${subscriptionId}`, {
      ...(existing || {}),
      route: ROUTE,
      subscription_id: subscriptionId,
      customer_id: typeof object.customer === 'string' ? object.customer : object.customer?.id || existing?.customer_id || '',
      active,
      status,
      cancel_at_period_end: Boolean(object.cancel_at_period_end),
      current_period_end: Number(object.current_period_end || 0),
      last_event_id: event.id || '',
      last_event_type: event.type,
      stripe_event_created: Number(event.created || 0),
    });
    return true;
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const subscriptionId = subscriptionIdFromInvoice(object);
    if (!subscriptionId) return false;
    const existing = await readEntitlement(env, `sub:${subscriptionId}`);
    if (!existing || existing.route !== ROUTE) return false;
    const paid = event.type === 'invoice.paid';
    await writeEntitlement(env, `sub:${subscriptionId}`, {
      ...existing,
      active: paid,
      status: paid ? 'active' : 'past_due',
      last_event_id: event.id || '',
      last_event_type: event.type,
      stripe_event_created: Number(event.created || 0),
    });
    return true;
  }

  return false;
}

async function handleWebhook(request, env, ctx) {
  if (!env.STRIPE_WEBHOOK_SECRET) return j({ error: 'Webhook is not configured' }, 503);
  const copy = request.clone();
  const raw = await copy.text();
  const valid = await verifyWebhook(raw, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return j({ error: 'Invalid Stripe signature' }, 400);
  const event = JSON.parse(raw);
  const handled = await handleAgentEvent(event, env);
  if (handled) return j({ received: true, agent_lab: true });
  return memberWorker.fetch(request, env, ctx);
}

function accessDenied(status = 401, message = 'Member access is required.') {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Agent Lab · Access</title><style>body{margin:0;background:#06090e;color:#f5f7fb;font:15px/1.6 system-ui;display:grid;place-items:center;min-height:100svh}.c{width:min(520px,calc(100% - 32px));border:1px solid #25344a;border-radius:24px;padding:28px;background:#0a1018}.k{font-size:10px;letter-spacing:.16em;color:#72e8c9;font-weight:900}h1{font-size:34px;line-height:1;margin:.3em 0}.m{color:#8f9baa}.a{display:inline-flex;margin-top:14px;padding:12px 16px;border-radius:12px;background:#f5f7fb;color:#061019;text-decoration:none;font-weight:900}</style></head><body><main class="c"><div class="k">AGENT LAB · MEMBER</div><h1>Access locked.</h1><p class="m">${esc(message)}</p><a class="a" href="${PUBLIC_ORIGIN}/agent-lab/access.html">Member access →</a></main></body></html>`, {
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

function memberPage(record, env) {
  const canceling = record.cancel_at_period_end === true;
  const portal = String(env.AGENT_LAB_PORTAL_URL || '');
  const billing = portal ? `<a class="primary" href="${esc(portal)}">Manage membership →</a>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow,noarchive"><title>Agent Lab · Member</title><style>:root{--b:#06090e;--l:#25344a;--f:#f5f7fb;--m:#8996a7;--a:#72e8c9;--c:#79d9ff;--v:#aa9bff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(800px 500px at 80% -120px,#15374a55,transparent 65%),var(--b);color:var(--f);font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}.w{width:min(980px,calc(100% - 28px));margin:auto;padding:22px 0 80px}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 26px}.brand{font-size:11px;letter-spacing:.17em;font-weight:900}.state{font-size:9px;letter-spacing:.12em;color:var(--a);border:1px solid #72e8c944;border-radius:999px;padding:6px 9px}.hero{min-height:42svh;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid var(--l);border-radius:28px;padding:24px;background:radial-gradient(60% 75% at 50% 35%,#13323b66,transparent 70%),#091018;position:relative;overflow:hidden}.hero:before{content:"";position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:44px 44px;opacity:.17}.k{position:relative;font-size:9px;letter-spacing:.17em;color:var(--a);font-weight:900}.hero h1{position:relative;font-size:clamp(42px,10vw,82px);line-height:.9;letter-spacing:-.055em;margin:.13em 0}.hero p{position:relative;margin:0;color:var(--m);max-width:520px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.card{border:1px solid var(--l);border-radius:22px;background:linear-gradient(180deg,#0d141e,#080d14);padding:20px;min-height:210px;display:flex;flex-direction:column;justify-content:space-between}.num{font-size:9px;color:#627186}.card h2{font-size:25px;line-height:1;margin:.25em 0}.card p{color:var(--m);margin:0}.flow{display:flex;gap:6px;flex-wrap:wrap;margin-top:18px}.flow i{font-style:normal;font-size:9px;letter-spacing:.08em;border:1px solid #31435c;border-radius:999px;padding:7px 9px;color:#b8c4d4}.flow i:nth-child(2){border-color:#72e8c955;color:#bff8e8}.flow i:nth-child(3){border-color:#aa9bff55;color:#d5cdff}.flow i:nth-child(4){border-color:#79d9ff55;color:#bfefff}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.actions a{display:inline-flex;min-height:43px;align-items:center;padding:0 14px;border-radius:11px;border:1px solid var(--l);color:var(--f);text-decoration:none;font-weight:850}.actions .primary{background:var(--f);color:#071019;border-color:var(--f)}.fine{color:#647184;font-size:10px;margin-top:18px}@media(max-width:680px){.grid{grid-template-columns:1fr}.hero{min-height:38svh}.card{min-height:180px}}</style></head><body><main class="w"><header class="top"><div class="brand">AGENT LAB · MEMBER</div><div class="state">${canceling ? 'ACTIVE · CANCELS AT PERIOD END' : 'ACTIVE'}</div></header><section class="hero"><div class="k">MEMBER FIELD DESK</div><h1>Run.<br>Trace. Reuse.</h1><p>The private layer: operating patterns, failure traces, reusable controls and revenue experiments.</p></section><section class="grid"><article class="card"><div><div class="num">01 · OPERATING LOOP</div><h2>Control the handoff.</h2><p>One owner, one observable output and one stop condition before another agent enters the run.</p></div><div class="flow"><i>RUN</i><i>TRACE</i><i>BREAK</i><i>REUSE</i></div></article><article class="card"><div><div class="num">02 · FAILURE TRACE</div><h2>More ≠ faster.</h2><p>Shared decision boundaries create coordination cost. Split ownership before splitting work.</p></div><div class="flow"><i>OWNER</i><i>BOUNDARY</i><i>VERIFY</i></div></article><article class="card"><div><div class="num">03 · CONTROL TEMPLATE</div><h2>5-point check.</h2><p>Goal → owner → evidence → failure condition → next action. Missing one means the run is not autonomous-ready.</p></div><div class="flow"><i>GOAL</i><i>OWNER</i><i>EVIDENCE</i><i>FAIL</i><i>NEXT</i></div></article><article class="card"><div><div class="num">04 · REVENUE LAB</div><h2>Evidence before reach.</h2><p>Payment → Checkout → Qualified Buyer Action → Qualified Traffic → Reach.</p></div><div class="flow"><i>PAYMENT</i><i>CHECKOUT</i><i>BUYER</i><i>TRAFFIC</i></div></article></section><div class="actions">${billing}<a href="${PUBLIC_ORIGIN}/agent-lab/">Public Lab</a><a href="/agent-lab/logout">Sign out</a></div><p class="fine">Protected access is checked against signed Stripe lifecycle events on every request. Inactive subscriptions are denied.</p></main></body></html>`;
}

async function authenticate(request, env) {
  const payload = await verifyMember(env, cookieValue(request, COOKIE));
  if (!payload) return null;
  const subscription = await readEntitlement(env, `sub:${payload.sub}`);
  if (!subscription?.active || subscription.route !== ROUTE) return null;
  return { payload, subscription };
}

function checkoutRedirect(url) {
  const destination = new URL(PAYMENT_URL);
  destination.searchParams.set('utm_source', 'stratumpraxis');
  destination.searchParams.set('utm_medium', 'agent_lab');
  destination.searchParams.set('utm_campaign', 'founding');
  const route = String(url.searchParams.get('route_id') || '').slice(0, 80).replace(/[^a-zA-Z0-9_-]/g, '_');
  if (route) destination.searchParams.set('utm_content', route);
  return Response.redirect(destination.toString(), 303);
}

export class AgentLabEntitlements {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    if (request.method === 'GET') {
      const record = await this.ctx.storage.get('record');
      return j({ record: record || null });
    }
    if (request.method === 'PUT') {
      const patch = await request.json();
      const previous = await this.ctx.storage.get('record') || {};
      const record = { ...previous, ...patch, updated_at: Date.now() };
      await this.ctx.storage.put('record', record);
      return j({ record });
    }
    return j({ error: 'Method not allowed' }, 405);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = cors(request);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/agent-lab/')) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/stripe/webhook') {
        return handleWebhook(request, env, ctx);
      }

      if (!url.pathname.startsWith('/agent-lab/')) return memberWorker.fetch(request, env, ctx);

      if (request.method === 'GET' && url.pathname === '/agent-lab/checkout') {
        return checkoutRedirect(url);
      }

      if (request.method === 'POST' && url.pathname === '/agent-lab/activate') {
        const body = await request.json();
        const sid = String(body?.session_id || '');
        if (!sid.startsWith('cs_')) return j({ error: 'A valid Checkout Session is required.' }, 400, corsHeaders);
        const session = await readEntitlement(env, `session:${sid}`);
        if (!session?.active || !session.subscription_id || session.route !== ROUTE) {
          return j({ error: 'Payment is not verified yet.' }, 402, corsHeaders);
        }
        const subscription = await readEntitlement(env, `sub:${session.subscription_id}`);
        if (!subscription?.active || subscription.route !== ROUTE) {
          return j({ error: 'The subscription is not active.' }, 402, corsHeaders);
        }
        const token = await signMember(env, session);
        return j({
          authorized: true,
          claim_url: `${url.origin}/agent-lab/claim?token=${encodeURIComponent(token)}`,
        }, 200, corsHeaders);
      }

      if (request.method === 'GET' && url.pathname === '/agent-lab/claim') {
        const token = url.searchParams.get('token') || '';
        const payload = await verifyMember(env, token);
        if (!payload) return accessDenied(401, 'This access claim is invalid or expired.');
        const subscription = await readEntitlement(env, `sub:${payload.sub}`);
        if (!subscription?.active || subscription.route !== ROUTE) return accessDenied(402, 'The subscription is not active.');
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

      if (request.method === 'GET' && url.pathname === MEMBER_PATH) {
        const auth = await authenticate(request, env);
        if (!auth) return accessDenied(401, 'An active Agent Lab membership is required.');
        return new Response(memberPage(auth.subscription, env), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, private',
            'X-Robots-Tag': 'noindex,nofollow,noarchive',
            'Referrer-Policy': 'no-referrer',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
          },
        });
      }

      if (request.method === 'GET' && url.pathname === '/agent-lab/status') {
        const auth = await authenticate(request, env);
        if (!auth) return j({ active: false }, 401);
        return j({
          active: true,
          status: auth.subscription.status || 'active',
          cancel_at_period_end: Boolean(auth.subscription.cancel_at_period_end),
        });
      }

      if (request.method === 'GET' && url.pathname === '/agent-lab/logout') {
        return new Response(null, {
          status: 303,
          headers: {
            Location: `${PUBLIC_ORIGIN}/agent-lab/access.html`,
            'Set-Cookie': memberCookie('', 0),
            'Cache-Control': 'no-store',
          },
        });
      }

      return j({ error: 'Not found' }, 404, corsHeaders);
    } catch (error) {
      console.error('Agent Lab runtime error', error);
      return j({ error: 'Agent Lab runtime failed.' }, 500, corsHeaders);
    }
  },
};
