import test from 'node:test';
import assert from 'node:assert/strict';
import { eventFingerprint, LEDGER_VERSION } from './common-revenue-core-ledger-v0.mjs';
import { allocateGlobalBudget, decidePortfolio } from './common-revenue-core-allocator-nba-v0.mjs';

let seq = 0;
function ledgerEvent(overrides = {}) {
  seq += 1;
  const event = {
    event_id: overrides.event_id || `evt_${seq}`,
    event_type: overrides.event_type || 'traffic',
    business_unit: overrides.business_unit || 'stratum',
    timestamp: overrides.timestamp || `2026-09-04T00:${String(seq % 60).padStart(2,'0')}:00.000Z`,
    source: overrides.source || 'test',
    source_event_name: overrides.source_event_name || `test_${seq}`,
    source_event_id: overrides.source_event_id || `src_${seq}`,
    evidence_ref: overrides.evidence_ref || `evidence:${seq}`,
    evidence_strength: overrides.evidence_strength || 'MODERATE',
    attribution_state: overrides.attribution_state || 'ATTRIBUTED',
    sync_status: 'SYNCED',
    provider: overrides.provider ?? null,
    provider_transaction_id: overrides.provider_transaction_id ?? null,
    provider_customer_id: overrides.provider_customer_id ?? null,
    transaction_id: overrides.transaction_id ?? null,
    customer_id: overrides.customer_id ?? null,
    asset_id: overrides.asset_id ?? 'asset_a',
    product_id: overrides.product_id ?? 'product_a',
    channel: overrides.channel ?? 'owned',
    channel_id: null,
    route_id: overrides.route_id ?? 'route_a',
    experiment_id: overrides.experiment_id ?? null,
    action_id: overrides.action_id ?? null,
    cta_id: null,
    amount_minor: overrides.amount_minor ?? null,
    currency: overrides.currency ?? null,
    refund_state_known: overrides.refund_state_known ?? false,
    chargeback_state_known: overrides.chargeback_state_known ?? false,
    provider_fee_state_known: overrides.provider_fee_state_known ?? false,
    variable_cost_state_known: overrides.variable_cost_state_known ?? false,
    provider_fee_amount_minor: overrides.provider_fee_amount_minor ?? null,
    variable_cost_amount_minor: overrides.variable_cost_amount_minor ?? null,
    ledger_version: LEDGER_VERSION,
    ledger_recorded_at: overrides.ledger_recorded_at || `2026-09-04T01:${String(seq % 60).padStart(2,'0')}:00.000Z`
  };
  event.event_fingerprint = eventFingerprint(event);
  return event;
}

function purchase(i, extra = {}) {
  return ledgerEvent({
    event_type: 'purchase',
    evidence_strength: 'STRONG',
    provider: 'stripe',
    provider_transaction_id: `cs_${i}_${seq}`,
    amount_minor: 1000,
    currency: 'usd',
    refund_state_known: true,
    chargeback_state_known: true,
    provider_fee_state_known: true,
    variable_cost_state_known: true,
    provider_fee_amount_minor: 0,
    variable_cost_amount_minor: 0,
    ...extra
  });
}

test('does not SCALE a single verified purchase', () => {
  const portfolio = decidePortfolio([purchase(1)], { generated_at: '2026-09-04T05:00:00.000Z' });
  assert.equal(portfolio.decisions.length, 1);
  assert.equal(portfolio.decisions[0].decision, 'KEEP');
  assert.equal(portfolio.decisions[0].contract_valid, true);
});

test('SCALE requires enough purchases, positive complete economics and confidence', () => {
  const rows = Array.from({ length: 5 }, (_, i) => purchase(i + 1));
  const portfolio = decidePortfolio(rows, { generated_at: '2026-09-04T05:00:00.000Z' });
  assert.equal(portfolio.decisions[0].decision, 'SCALE');
  assert.ok(portfolio.decisions[0].confidence >= 0.75);
});

test('negative contribution profit becomes STOP only with enough evidence', () => {
  const rows = Array.from({ length: 5 }, (_, i) => purchase(i + 1, { variable_cost_amount_minor: 1500 }));
  const portfolio = decidePortfolio(rows, { generated_at: '2026-09-04T05:00:00.000Z' });
  assert.equal(portfolio.decisions[0].decision, 'STOP');
});

test('traffic without purchase produces a bounded TEST rather than SCALE', () => {
  const rows = Array.from({ length: 20 }, () => ledgerEvent({ event_type: 'traffic', evidence_strength: 'MODERATE' }));
  const portfolio = decidePortfolio(rows, { generated_at: '2026-09-04T05:00:00.000Z' });
  assert.equal(portfolio.decisions[0].decision, 'TEST');
});

test('stalled traffic with no CTA becomes FIX', () => {
  const rows = Array.from({ length: 50 }, () => ledgerEvent({ event_type: 'traffic', evidence_strength: 'MODERATE' }));
  const portfolio = decidePortfolio(rows, { generated_at: '2026-09-04T05:00:00.000Z' });
  assert.equal(portfolio.decisions[0].decision, 'FIX');
  assert.equal(portfolio.decisions[0].max_bottleneck, 'CTA');
});

test('budget allocator keeps reserve instead of forcing 100% allocation', () => {
  const portfolio = {
    policy: { max_scale_share_per_scope: 0.6, max_test_share_per_scope: 0.2, max_fix_share_per_scope: 0.25 },
    decisions: [
      { decision_id: 'a', business_unit: 'stratum', decision: 'SCALE', confidence: 0.9 },
      { decision_id: 'b', business_unit: 'vector', decision: 'TEST', confidence: 0.5 }
    ]
  };
  const budget = allocateGlobalBudget(portfolio, { execution_units: 10, human_minutes: 60 });
  assert.ok(budget.allocated_share <= 0.8);
  assert.ok(budget.reserve_share >= 0.2);
  assert.ok(budget.allocations.every((row) => row.execution_units >= 0));
});
