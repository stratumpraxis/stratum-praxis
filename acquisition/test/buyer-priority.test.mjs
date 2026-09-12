import test from 'node:test';
import assert from 'node:assert/strict';

import { appendBuyerReaction } from '../lib/buyer-reaction.mjs';
import { prePaymentBuyerPriority } from '../lib/buyer-priority.mjs';

function add(ledger, input) {
  return appendBuyerReaction(ledger, {
    occurred_at: '2026-09-13T02:00:00.000Z',
    ...input
  });
}

test('unpaid buyers are ranked contract before checkout before qualified action', () => {
  let ledger = { version: 1, records: [] };
  ledger = add(ledger, {
    event_id: 'evt-qualified', buyer_key: 'buyer:q', stage: 'qualified_action',
    evidence_ref: 'posthog-event:q', evidence_source: 'posthog'
  });
  ledger = add(ledger, {
    event_id: 'evt-checkout', buyer_key: 'buyer:c', stage: 'checkout',
    evidence_ref: 'stripe-session:cs_1', evidence_source: 'stripe-checkout-session'
  });
  ledger = add(ledger, {
    event_id: 'evt-contract', buyer_key: 'buyer:k', stage: 'contract',
    evidence_ref: 'contract:agreement_1', evidence_source: 'contract-ledger'
  });

  const result = prePaymentBuyerPriority(ledger);
  assert.equal(result.unpaid_qualified_buyers, 3);
  assert.equal(result.nearest_revenue_distance, 1);
  assert.deepEqual(result.buyers.map((buyer) => buyer.buyer_key), ['buyer:k', 'buyer:c', 'buyer:q']);
  assert.deepEqual(result.buyers.map((buyer) => buyer.priority_rank), [1, 2, 3]);
});

test('proven paid buyers are excluded from the prepayment queue', () => {
  let ledger = { version: 1, records: [] };
  ledger = add(ledger, {
    event_id: 'evt-checkout', buyer_key: 'buyer:paid', stage: 'checkout',
    evidence_ref: 'stripe-session:cs_paid', evidence_source: 'stripe-checkout-session'
  });
  ledger = add(ledger, {
    event_id: 'evt-paid', buyer_key: 'buyer:paid', stage: 'payment_evidence',
    evidence_ref: 'stripe:pi_paid', evidence_source: 'stripe-checkout-session'
  });

  const result = prePaymentBuyerPriority(ledger);
  assert.equal(result.unpaid_qualified_buyers, 0);
  assert.equal(result.nearest_revenue_distance, null);
  assert.deepEqual(result.buyers, []);
});

test('traffic-only and weak early-stage buyers never enter the action queue', () => {
  let ledger = { version: 1, records: [] };
  ledger = add(ledger, { event_id: 'evt-visit', buyer_key: 'buyer:v', stage: 'visit' });
  ledger = add(ledger, { event_id: 'evt-offer', buyer_key: 'buyer:o', stage: 'offer' });

  const result = prePaymentBuyerPriority(ledger);
  assert.equal(result.unpaid_qualified_buyers, 0);
});
