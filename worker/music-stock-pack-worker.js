import baseWorker, { AgentLabEntitlements } from './agent-lab-claim-entry.js';

export { AgentLabEntitlements };

const PUBLIC_ORIGIN = 'https://stratumpraxis.com';
const ROUTE = 'music_stock_pack_v1';
const AMOUNT = 900;
const CURRENCY = 'usd';
const PRODUCT_NAME = 'Music Stock Pack v1';
const DELIVERY_FILES = [
  {
    name: 'Music_Stock_Pack_v1_PAID_DELIVERY_2026-09-13.zip',
    sha256: '131910f3a150f9d3b3fa5bff3939a2bd375722cd9e13420b2542df0596a74dec',
    url: 'https://drive.google.com/file/d/144J1PYWrt3API48scIEk4ZFYMMd2TiXl/view?usp=drivesdk',
    contents: 'MSV1-001 to MSV1-003',
  },
  {
    name: 'MSV1-004_Modulation_Maze_Delivery.zip',
    sha256: '7ff6fd4038f5e321f52cd79ba2f29452bd134d163699a89891e69d79fc4421eb',
    url: 'https://drive.google.com/file/d/16tY-dwRX9w9r0wt6TqSF0y85yamDk72E/view?usp=drivesdk',
    contents: 'MSV1-004 · 60s + 30s + 15s WAV',
  },
  {
    name: 'Chromatic_Relay_02_Product_Bundle.zip',
    sha256: 'bb9acfd9b326a68bc7386515fd3c80b24caa1d4dee6bbc071ca27cdf0e0ae195',
    url: 'https://drive.google.com/file/d/15JPXD7jIZu5niHuMieBMs4fml_Iw_oTI/view?usp=drivesdk',
    contents: 'MSV1-005 · 60s + 30s + 15s WAV plus preview and metadata',
  },
];
const te = new TextEncoder();
const td = new TextDecoder();

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

function allowedOrigin(origin) {
  return origin === PUBLIC_ORIGIN || origin === 'https://stratum-praxis-site.pages.dev' ||
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

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sessionEmail(session) {
  return normalizedEmail(session?.customer_details?.email || session?.customer_email || '');
}

function sessionMatches(session, expectedEmail = '') {
  const items = session?.line_items?.data || [];
  const item = items[0];
  const email = sessionEmail(session);
  return Boolean(
    session &&
    session.mode === 'payment' &&
    session.payment_status === 'paid' &&
    session.status === 'complete' &&
    Number(session.amount_total || 0) === AMOUNT &&
    String(session.currency || '').toLowerCase() === CURRENCY &&
    String(session.metadata?.market_route || '') === ROUTE &&
    items.length === 1 &&
    Number(item?.quantity || 0) === 1 &&
    Number(item?.amount_total || 0) === AMOUNT &&
    email &&
    (!expectedEmail || email === normalizedEmail(expectedEmail))
  );
}

async function checkoutSession(env, sid) {
  return stripe(env, `checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`);
}

async function createCheckout(env) {
  return stripePost(env, 'checkout/sessions', {
    mode: 'payment',
    'line_items[0][price_data][currency]': CURRENCY,
    'line_items[0][price_data][unit_amount]': String(AMOUNT),
    'line_items[0][price_data][product_data][name]': PRODUCT_NAME,
    'line_items[0][price_data][product_data][description]': '5 original instrumental tracks · 60s + 30s + 15s edits · 48 kHz / 24-bit stereo WAV',
    'line_items[0][quantity]': '1',
    customer_creation: 'always',
    success_url: `${PUBLIC_ORIGIN}/music-stock-pack-v1-access.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${PUBLIC_ORIGIN}/music-stock-pack-v1.html?checkout=cancelled`,
    'metadata[market_route]': ROUTE,
    'metadata[product_key]': ROUTE,
    'payment_intent_data[metadata][market_route]': ROUTE,
    'payment_intent_data[metadata][product_key]': ROUTE,
  });
}

async function sign(env, session) {
  const secret = env.MUSIC_ACCESS_SECRET || env.MEMBER_ACCESS_SECRET || env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Music access signing is not configured');
  const payload = b64(te.encode(JSON.stringify({
    sid: session.id,
    email: sessionEmail(session),
    exp: Date.now() + 7 * 864e5,
  })));
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, te.encode(`music-stock-pack-v1|${payload}`));
  return `${payload}.${b64(new Uint8Array(signature))}`;
}

async function verify(env, token) {
  try {
    const secret = env.MUSIC_ACCESS_SECRET || env.MEMBER_ACCESS_SECRET || env.STRIPE_SECRET_KEY;
    if (!secret) return null;
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, unb64(signature), te.encode(`music-stock-pack-v1|${payload}`));
    if (!valid) return null;
    const value = JSON.parse(td.decode(unb64(payload)));
    if (!value.sid || !value.email || Number(value.exp || 0) <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/music-stock-pack-v1/')) return baseWorker.fetch(request, env, ctx);

    const corsHeaders = cors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    try {
      if (request.method === 'GET' && url.pathname === '/music-stock-pack-v1/checkout') {
        const session = await createCheckout(env);
        if (!session?.url) return json({ error: 'Checkout could not be created.' }, 503, corsHeaders);
        return Response.redirect(session.url, 303);
      }

      if (request.method === 'POST' && url.pathname === '/music-stock-pack-v1/login') {
        const body = await request.json().catch(() => ({}));
        const sid = String(body?.session_id || '');
        const email = normalizedEmail(body?.email || '');
        if (!sid.startsWith('cs_')) return json({ error: 'A valid Checkout Session is required.' }, 400, corsHeaders);
        if (!email || !email.includes('@')) return json({ error: 'Checkout email is required.' }, 400, corsHeaders);
        const session = await checkoutSession(env, sid);
        if (!sessionMatches(session, email)) return json({ error: 'A paid Music Stock Pack v1 purchase could not be verified.' }, 402, corsHeaders);
        const token = await sign(env, session);
        return json({
          authorized: true,
          workspace_url: `${PUBLIC_ORIGIN}/music-stock-pack-v1-delivery.html?token=${encodeURIComponent(token)}`,
        }, 200, corsHeaders);
      }

      if (request.method === 'GET' && url.pathname === '/music-stock-pack-v1/delivery') {
        const token = url.searchParams.get('token') || '';
        const claim = await verify(env, token);
        if (!claim) return json({ authorized: false, error: 'Buyer access token is invalid or expired.' }, 401, corsHeaders);
        const session = await checkoutSession(env, claim.sid);
        if (!sessionMatches(session, claim.email)) return json({ authorized: false, error: 'Paid purchase is no longer verifiable.' }, 402, corsHeaders);
        return json({
          authorized: true,
          buyer_email: claim.email,
          track_count: 5,
          delivery_files: DELIVERY_FILES,
          file_name: DELIVERY_FILES[0].name,
          sha256: DELIVERY_FILES[0].sha256,
          delivery_url: DELIVERY_FILES[0].url,
          delivery_mode: 'private_google_drive_multi_file',
        }, 200, corsHeaders);
      }

      return json({ error: 'Not found' }, 404, corsHeaders);
    } catch (error) {
      console.error('Music Stock Pack v1 error', error);
      return json({ error: 'Music Stock Pack verification failed.' }, 500, corsHeaders);
    }
  },
};
