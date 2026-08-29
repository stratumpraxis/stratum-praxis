import test from 'node:test';
import assert from 'node:assert/strict';

import worker, { verifyWebhook } from './prompt-store-worker.js';

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

test('Stripe webhook signature is verified against the raw payload', async () => {
  const raw = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' });
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = 'whsec_test_only';
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`${timestamp}.${raw}`)
  );
  const header = `t=${timestamp},v1=${toHex(new Uint8Array(signature))}`;

  assert.equal(await verifyWebhook(raw, header, secret), true);
  assert.equal(await verifyWebhook(`${raw} `, header, secret), false);
});

test('webhook route fails closed when its signing secret is absent', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/stripe/webhook', { method: 'POST', body: '{}' }),
    { STRIPE_SECRET_KEY: 'sk_test_only' },
    {}
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Webhook is not configured' });
});
