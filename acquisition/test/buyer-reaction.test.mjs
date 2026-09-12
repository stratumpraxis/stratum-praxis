import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BUYER_STAGES,
  appendBuyerReaction,
  buyerState,
  makeBuyerReaction,
  nextBuyerStage,
  revenueDistance,
  summarizeBuyerReactions
} from '../lib/buyer-reaction.mjs';

const at = '2026-09-13T00:00:00.000Z';

function reaction(overrides = {}) {
  return {
    event_id: 'evt-1',
    buyer_key: 'buyer:opaque-1',
    company_key: 'company:opaque-1',
    stage: 'problem_fit',
    problem_keys: ['agent-governance'],
    revenue_route_id: 'route:b2b-governance',
    occurred_at: at,
    ...overrides
  };
}

test('revenue distance is deterministic and payment evidence is distance zero', () => {
  assert.equal(revenueDistance('visit'), BUYER_STAGES.length - 1);
  assert.equal(revenueDistance('qualified_action'), 3);
  assert.equal(revenueDistance('checkout'), 2);
  assert.equal(revenueDistance('contract'), 1);
  assert.equal(revenueDistance('payment_evidence'), 0);
  assert.equal(nextBuyerStage('payment_evidence'), null);
  assert.throws(() => revenueDistance('made_up'), /unknown buyer stage/);
});

test('canonical reactions preserve route, problem and buying-condition evidence', () => {
  const record = makeBuyerReaction(reaction({
    stage: 'buying_condition',
    buying_conditions: ['budget-confirmed', 'timeline-this-quarter'],
    offer_asset_id: 'asset:agent-control-auditor'
  }));
  assert.equal(record.stage, 'buying_condition');
  assert.equal(record.revenue_distance, 5);
  assert.deepEqual(record.problem_keys, ['agent-governance']);
  assert.deepEqual(record.buying_conditions, ['budget-confirmed', 'timeline-this-quarter']);
  assert.equal(record.offer_asset_id, 'asset:agent-control-auditor');
});

test('qualified action and every later stage require concrete evidence', () => {
  for (const stage of ['qualified_action', 'checkout', 'contract', 'payment_evidence']) {
    assert.throws(
      () => makeBuyerReaction(reaction({ event_id: `evt-${stage}`, stage })),
      /requires evidence_ref and evidence_source/
    );
  }

  assert.doesNotThrow(() => makeBuyerReaction(reaction({
    event_id: 'evt-qualified',
    stage: 'qualified_action',
    evidence_ref: 'analytics:event:123',
    evidence_source: 'posthog'
  })));
});

test('payment evidence rejects a generic claim and accepts a provider reference', () => {
  assert.throws(
    () => makeBuyerReaction(reaction({
      stage: 'payment_evidence',
      evidence_ref: 'someone-said-paid',
      evidence_source: 'manual'
    })),
    /payment-provider evidence_ref/
  );

  const paid = makeBuyerReaction(reaction({
    stage: 'payment_evidence',
    evidence_ref: 'stripe:pi_123',
    evidence_source: 'stripe-live'
  }));
  assert.equal(paid.revenue_distance, 0);
});

test('direct personal identity is refused in the acquisition evidence ledger', () => {
  assert.throws(() => makeBuyerReaction(reaction({ email: 'person@example.com' })), /direct identity field email/);
  assert.throws(() => makeBuyerReaction(reaction({ full_name: 'Example Person' })), /direct identity field full_name/);
});

test('append is idempotent for an exact event and refuses conflicting evidence reuse', () => {
  let ledger = { version: 1, records: [] };
  ledger = appendBuyerReaction(ledger, reaction());
  ledger = appendBuyerReaction(ledger, reaction());
  assert.equal(ledger.records.length, 1);

  assert.throws(
    () => appendBuyerReaction(ledger, reaction({ stage: 'offer' })),
    /already exists with different evidence/
  );
});

test('buyer state uses highest achieved stage even when older/lower evidence arrives later', () => {
  let ledger = { version: 1, records: [] };
  ledger = appendBuyerReaction(ledger, reaction({
    event_id: 'evt-checkout',
    stage: 'checkout',
    evidence_ref: 'analytics:checkout:1',
    evidence_source: 'posthog',
    occurred_at: '2026-09-13T01:00:00.000Z'
  }));
  ledger = appendBuyerReaction(ledger, reaction({
    event_id: 'evt-late-visit',
    stage: 'visit',
    occurred_at: '2026-09-13T02:00:00.000Z'
  }));

  const state = buyerState(ledger, 'buyer:opaque-1');
  assert.equal(state.highest_stage, 'checkout');
  assert.equal(state.revenue_distance, 2);
  assert.equal(state.next_stage, 'contract');
  assert.equal(state.latest_observed_at, '2026-09-13T02:00:00.000Z');
});

test('summary prioritizes buyers closest to revenue and counts payment evidence buyers', () => {
  let ledger = { version: 1, records: [] };
  ledger = appendBuyerReaction(ledger, reaction({
    event_id: 'evt-a',
    buyer_key: 'buyer:a',
    stage: 'qualified_action',
    evidence_ref: 'crm:qualified:a',
    evidence_source: 'crm'
  }));
  ledger = appendBuyerReaction(ledger, reaction({
    event_id: 'evt-b',
    buyer_key: 'buyer:b',
    stage: 'payment_evidence',
    evidence_ref: 'invoice:paid:b',
    evidence_source: 'billing'
  }));
  ledger = appendBuyerReaction(ledger, reaction({
    event_id: 'evt-c',
    buyer_key: 'buyer:c',
    stage: 'business_use'
  }));

  const summary = summarizeBuyerReactions(ledger);
  assert.equal(summary.buyers, 3);
  assert.equal(summary.payment_evidence_buyers, 1);
  assert.equal(summary.qualified_or_better_buyers, 2);
  assert.equal(summary.priority_buyers[0].buyer_key, 'buyer:b');
  assert.equal(summary.priority_buyers[0].revenue_distance, 0);
  assert.equal(summary.buyers_by_highest_stage.payment_evidence, 1);
});
