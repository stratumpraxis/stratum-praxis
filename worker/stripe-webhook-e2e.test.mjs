import test from 'node:test';
import assert from 'node:assert/strict';

import worker from './prompt-store-worker.js';

const SECRET = 'whsec_e2e_only';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_only', STRIPE_WEBHOOK_SECRET: SECRET };

// A Checkout Session that satisfies every condition of the bundle3 offer.
function paidSession(overrides = {}) {
  return {
    id: 'cs_test_e2e',
    object: 'checkout.session',
    mode: 'payment',
    payment_status: 'paid',
    amount_total: 1700,
    currency: 'usd',
    payment_link: 'plink_1U8tdhJMK7zFs997Al4dAAOW',
    payment_intent: 'pi_test_e2e',
    client_reference_id: 'route_probe_1',
    customer_details: { email: 'buyer@example.com' },
    line_items: {
      data: [{ quantity: 1, price: { id: 'price_1U8tcVJMK7zFs997DDR8EyDh' } }],
    },
    ...overrides,
  };
}

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signature(raw, { secret = SECRET, timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${raw}`));
  return { header: `t=${timestamp},v1=${toHex(new Uint8Array(mac))}`, timestamp };
}

// Replaces global fetch so the worker's Stripe calls are observed, never sent.
function stubStripe(session) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: String(init.body || '') });
    if ((init.method || 'GET') === 'GET') return Response.json(session);
    return Response.json({ id: session.id, metadata: {} });
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

async function post(raw, header) {
  return worker.fetch(
    new Request('https://worker.example/stripe/webhook', {
      method: 'POST',
      headers: header ? { 'Stripe-Signature': header, 'Content-Type': 'application/json' } : {},
      body: raw,
    }),
    ENV,
    {}
  );
}

function eventBody(type, object, id = 'evt_e2e') {
  return JSON.stringify({ id, type, created: 1756468800, data: { object } });
}

test('a correctly signed checkout.session.completed is accepted, verified and recorded', async () => {
  const session = paidSession();
  const stub = stubStripe(session);
  try {
    const raw = eventBody('checkout.session.completed', { id: session.id });
    const { header } = await signature(raw);
    const res = await post(raw, header);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });

    // Purchase verification re-reads the session from Stripe rather than trusting the payload.
    const lookup = stub.calls.find((c) => c.method === 'GET');
    assert.ok(lookup, 'expected a Stripe Checkout Session lookup');
    assert.match(lookup.url, /checkout\/sessions\/cs_test_e2e\?expand\[\]=line_items\.data\.price$/);

    // Downstream delivery readiness is written back as session metadata.
    const write = stub.calls.find((c) => c.method === 'POST');
    assert.ok(write, 'expected a Stripe metadata write');
    const fields = new URLSearchParams(write.body);
    assert.equal(fields.get('metadata[delivery_state]'), 'READY_FOR_BUYER_VERIFICATION');
    assert.equal(fields.get('metadata[revenue_product]'), 'bundle3');
    assert.equal(fields.get('metadata[revenue_amount]'), '1700');
    assert.equal(fields.get('metadata[revenue_currency]'), 'usd');
    assert.equal(fields.get('metadata[webhook_event_id]'), 'evt_e2e');
    assert.equal(fields.get('metadata[attribution_route_id]'), 'route_probe_1');
    assert.equal(fields.get('metadata[attribution_state]'), 'ATTRIBUTED');
    assert.equal(fields.get('metadata[payment_evidence]'), 'stripe:pi_test_e2e');
    assert.equal(fields.get('metadata[revenue_recorded_at]'), '2025-08-29T12:00:00.000Z');
  } finally {
    stub.restore();
  }
});

test('async_payment_succeeded is handled on the same delivery path', async () => {
  const session = paidSession();
  const stub = stubStripe(session);
  try {
    const raw = eventBody('checkout.session.async_payment_succeeded', { id: session.id });
    const { header } = await signature(raw);
    const res = await post(raw, header);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
    assert.ok(stub.calls.some((c) => c.method === 'POST'), 'expected delivery state to be recorded');
  } finally {
    stub.restore();
  }
});

test('an unrelated event type is acknowledged without touching Stripe', async () => {
  const stub = stubStripe(paidSession());
  try {
    const raw = eventBody('payment_intent.succeeded', { id: 'pi_test_e2e' });
    const { header } = await signature(raw);
    const res = await post(raw, header);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true, ignored: true });
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test('a session that does not match a live offer is acknowledged but never marked deliverable', async () => {
  const stub = stubStripe(paidSession({ amount_total: 100 }));
  try {
    const raw = eventBody('checkout.session.completed', { id: 'cs_test_e2e' });
    const { header } = await signature(raw);
    const res = await post(raw, header);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true, ignored: true });
    assert.ok(!stub.calls.some((c) => c.method === 'POST'), 'must not record an unverified purchase');
  } finally {
    stub.restore();
  }
});

test('an unpaid session is never marked deliverable', async () => {
  const stub = stubStripe(paidSession({ payment_status: 'unpaid' }));
  try {
    const raw = eventBody('checkout.session.completed', { id: 'cs_test_e2e' });
    const { header } = await signature(raw);
    const res = await post(raw, header);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true, ignored: true });
    assert.ok(!stub.calls.some((c) => c.method === 'POST'), 'must not record an unpaid purchase');
  } finally {
    stub.restore();
  }
});

test('a completed event without a Checkout Session id is rejected', async () => {
  const stub = stubStripe(paidSession());
  try {
    const raw = eventBody('checkout.session.completed', { id: 'sub_not_a_session' });
    const { header } = await signature(raw);
    const res = await post(raw, header);
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'Checkout Session is missing' });
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test('forged, tampered, stale and unsigned payloads are all rejected before Stripe is called', async () => {
  const session = paidSession();
  const raw = eventBody('checkout.session.completed', { id: session.id });
  const fresh = await signature(raw);
  const forged = await signature(raw, { secret: 'whsec_attacker' });
  const stale = await signature(raw, { timestamp: Math.floor(Date.now() / 1000) - 400 });

  const cases = [
    ['unsigned', null],
    ['unparseable header', 'garbage'],
    ['forged signature', forged.header],
    ['stale timestamp', stale.header],
    ['missing v1', `t=${fresh.timestamp}`],
    ['short signature', `t=${fresh.timestamp},v1=abcd`],
  ];

  for (const [name, header] of cases) {
    const stub = stubStripe(session);
    try {
      const res = await post(raw, header);
      assert.equal(res.status, 400, `${name} should be rejected`);
      assert.deepEqual(await res.json(), { error: 'Invalid Stripe signature' }, name);
      assert.equal(stub.calls.length, 0, `${name} must not reach Stripe`);
    } finally {
      stub.restore();
    }
  }

  // A valid signature over a body that was altered in transit must also fail.
  const stub = stubStripe(session);
  try {
    const res = await post(raw.replace('cs_test_e2e', 'cs_attacker_00'), fresh.header);
    assert.equal(res.status, 400);
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test('a rotation header carrying several v1 signatures is accepted when one matches', async () => {
  const session = paidSession();
  const stub = stubStripe(session);
  try {
    const raw = eventBody('checkout.session.completed', { id: session.id });
    const mine = await signature(raw);
    const other = await signature(raw, { secret: 'whsec_previous_secret' });
    const rotating = `${mine.header},v1=${other.header.split('v1=')[1]}`;

    const res = await post(raw, rotating);
    assert.equal(res.status, 200, 'Stripe sends one v1 per active secret while a secret is rotating');
    assert.deepEqual(await res.json(), { received: true });
  } finally {
    stub.restore();
  }
});

test('the webhook route fails closed when the signing secret is not bound', async () => {
  const stub = stubStripe(paidSession());
  try {
    const raw = eventBody('checkout.session.completed', { id: 'cs_test_e2e' });
    const { header } = await signature(raw);
    const res = await worker.fetch(
      new Request('https://worker.example/stripe/webhook', {
        method: 'POST', headers: { 'Stripe-Signature': header }, body: raw,
      }),
      { STRIPE_SECRET_KEY: 'sk_test_only' },
      {}
    );
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'Webhook is not configured' });
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test('GET is not a delivery path for the webhook', async () => {
  const res = await worker.fetch(
    new Request('https://worker.example/stripe/webhook', { method: 'GET' }), ENV, {}
  );
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});
