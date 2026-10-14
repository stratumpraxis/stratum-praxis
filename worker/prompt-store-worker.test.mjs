import test from 'node:test';
import assert from 'node:assert/strict';

import worker, { verifyWebhook, isWorkflowAuditPaid, isRevenueRouterPaid } from './prompt-store-worker.js';

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

test('Workflow Audit payment requires live paid $499 USD and an approved route family', () => {
  const base = {
    livemode: true,
    payment_status: 'paid',
    mode: 'payment',
    payment_link: 'plink_redacted_route_identity',
    amount_total: 49900,
    currency: 'usd',
  };

  assert.equal(isWorkflowAuditPaid({
    ...base,
    client_reference_id: 'workflow_audit_workflow-audit_gmail_campaign_buyer',
  }), true);

  assert.equal(isWorkflowAuditPaid({
    ...base,
    client_reference_id: 'outbound_b2b_intro_outbound_b2b_intro_gmail_workflow_b2b_202610_wheeler_tim',
  }), true);

  assert.equal(isWorkflowAuditPaid({
    ...base,
    amount_total: 49800,
    client_reference_id: 'workflow_audit_direct',
  }), false);

  assert.equal(isWorkflowAuditPaid({
    ...base,
    livemode: false,
    client_reference_id: 'workflow_audit_direct',
  }), false);

  assert.equal(isWorkflowAuditPaid({
    ...base,
    client_reference_id: 'cross_agent_operating_kit_direct',
  }), false);
});


test('Revenue Router payment requires live paid $29 USD on the canonical Payment Link', () => {
  const base = {
    livemode: true,
    payment_status: 'paid',
    mode: 'payment',
    amount_total: 2900,
    currency: 'usd',
    client_reference_id: 'revenue-router_revenue-router_youtube_forwelle_useful_20261013_ai_signal_to_buyer',
    payment_link: 'plink_1U7AvVJMK7zFs997FZnUvfi8',
  };

  assert.equal(isRevenueRouterPaid(base), true);
  assert.equal(isRevenueRouterPaid({ ...base, amount_total: 2800 }), false);
  assert.equal(isRevenueRouterPaid({ ...base, livemode: false }), false);
  assert.equal(isRevenueRouterPaid({ ...base, client_reference_id: 'vp_other_route' }), true);
  assert.equal(isRevenueRouterPaid({ ...base, payment_link: 'plink_wrong' }), false);
});
