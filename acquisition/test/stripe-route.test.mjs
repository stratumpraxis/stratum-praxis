import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyRoute } from '../lib/winner.mjs';
import { mergeStripePurchases, purchaseFromCheckoutSession } from '../lib/stripe-route.mjs';

const paid = {
  id: 'cs_live_evidence',
  mode: 'payment',
  payment_status: 'paid',
  payment_intent: 'pi_live_evidence',
  client_reference_id: 'vpj_hub_cross_agent_v1',
  amount_total: 6900,
  currency: 'usd',
  metadata: { delivery_state: 'ACTIVATED' }
};

test('paid Checkout Session becomes evidence without inventing funnel counts', () => {
  assert.deepEqual(purchaseFromCheckoutSession(paid), {
    route_id: 'vpj_hub_cross_agent_v1',
    attribution_state: 'ATTRIBUTED',
    purchase: 1,
    purchase_evidence: 'stripe:pi_live_evidence',
    revenue_cents: 6900,
    currency: 'usd',
    activation: 1,
    checkout_session_id: 'cs_live_evidence'
  });
});

test('unpaid or unattributed sessions are rejected', () => {
  assert.equal(purchaseFromCheckoutSession({ ...paid, payment_status: 'unpaid' }), null);
  assert.equal(purchaseFromCheckoutSession({ ...paid, client_reference_id: null }), null);
});

test('verified Stripe evidence can feed the existing winner classifier', () => {
  const route = mergeStripePurchases({
    route_id: 'vpj_hub_cross_agent_v1',
    destination_views: 40,
    cta_clicks: 4,
    checkout: 1
  }, [paid]);
  const result = classifyRoute(route);
  assert.equal(result.verdict, 'SCALE');
  assert.match(result.reasons[0], /stripe:pi_live_evidence/);
});

test('zero-sale input stays unchanged and never manufactures a winner', () => {
  const route = mergeStripePurchases({
    route_id: 'vpj_hub_cross_agent_v1',
    attribution_state: 'ATTRIBUTED',
    destination_views: 12,
    cta_clicks: 1,
    checkout: 0
  }, []);
  assert.equal(route.purchase, undefined);
  assert.equal(classifyRoute(route).verdict, 'INSUFFICIENT_DATA');
});
