import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendCheckoutSessionToBuyerLedger,
  buyerReactionFromCheckoutSession
} from '../lib/buyer-evidence-bridge.mjs';

const created = Math.floor(Date.parse('2026-09-13T00:00:00.000Z') / 1000);

function paidSession(overrides = {}) {
  return {
    id: 'cs_test_paid_1',
    customer: 'cus_123',
    payment_status: 'paid',
    mode: 'payment',
    payment_intent: 'pi_123',
    amount_total: 1700,
    currency: 'usd',
    created,
    metadata: {
      attribution_route_id: 'route_b2b_governance',
      company_key: 'company:opaque-1',
      offer_asset_id: 'agent-control-auditor',
      ...overrides.metadata
    },
    ...overrides,
    metadata: {
      attribution_route_id: 'route_b2b_governance',
      company_key: 'company:opaque-1',
      offer_asset_id: 'agent-control-auditor',
      ...(overrides.metadata || {})
    }
  };
}

test('a verified paid Stripe Checkout Session becomes payment evidence at distance zero', () => {
  const decision = buyerReactionFromCheckoutSession(paidSession());
  assert.equal(decision.accepted, true);
  assert.equal(decision.reason, 'VERIFIED_PAYMENT_EVIDENCE');
  assert.equal(decision.reaction.stage, 'payment_evidence');
  assert.equal(decision.reaction.revenue_distance, 0);
  assert.equal(decision.reaction.evidence_ref, 'stripe:pi_123');
  assert.equal(decision.reaction.evidence_source, 'stripe-checkout-session');
  assert.equal(decision.reaction.revenue_route_id, 'route_b2b_governance');
  assert.equal(decision.reaction.buyer_key, 'stripe-customer:cus_123');
  assert.equal(decision.reaction.company_key, 'company:opaque-1');
  assert.equal(decision.payment.revenue_cents, 1700);
  assert.equal(decision.payment.currency, 'usd');
});

test('explicit opaque buyer metadata takes precedence over Stripe customer id', () => {
  const decision = buyerReactionFromCheckoutSession(paidSession({
    metadata: { buyer_key: 'buyer:account-42' }
  }));
  assert.equal(decision.accepted, true);
  assert.equal(decision.reaction.buyer_key, 'buyer:account-42');
});

test('unpaid, subscription-mode or unattributed sessions never enter the buyer ledger', () => {
  assert.equal(buyerReactionFromCheckoutSession(paidSession({ payment_status: 'unpaid' })).accepted, false);
  assert.equal(buyerReactionFromCheckoutSession(paidSession({ mode: 'subscription' })).accepted, false);
  assert.equal(buyerReactionFromCheckoutSession(paidSession({
    metadata: { attribution_route_id: undefined },
    client_reference_id: null
  })).accepted, false);
});

test('payment is refused when no opaque buyer key can be established', () => {
  const decision = buyerReactionFromCheckoutSession(paidSession({ customer: null }));
  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'OPAQUE_BUYER_KEY_MISSING');
  assert.equal(decision.reaction, null);
});

test('email-shaped metadata is not accepted as an opaque buyer key', () => {
  const decision = buyerReactionFromCheckoutSession(paidSession({
    customer: null,
    metadata: { buyer_key: 'person@example.com' }
  }));
  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'OPAQUE_BUYER_KEY_MISSING');
});

test('payment time is required rather than invented', () => {
  const decision = buyerReactionFromCheckoutSession(paidSession({ created: null }));
  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'PAYMENT_TIME_MISSING');
});

test('append is idempotent for a repeated Stripe session', () => {
  let result = appendCheckoutSessionToBuyerLedger({ version: 1, records: [] }, paidSession());
  assert.equal(result.accepted, true);
  assert.equal(result.ledger.records.length, 1);

  result = appendCheckoutSessionToBuyerLedger(result.ledger, paidSession());
  assert.equal(result.accepted, true);
  assert.equal(result.ledger.records.length, 1);
  assert.equal(result.ledger.records[0].event_id, 'stripe-checkout:cs_test_paid_1');
});

test('rejected sessions leave the ledger byte-for-byte equivalent in data shape', () => {
  const ledger = { version: 1, records: [] };
  const result = appendCheckoutSessionToBuyerLedger(ledger, paidSession({ payment_status: 'unpaid' }));
  assert.equal(result.accepted, false);
  assert.deepEqual(result.ledger, ledger);
});
