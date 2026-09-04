import test from 'node:test';
import assert from 'node:assert/strict';
import { actionReceiptToCanonicalEvent, buildExperimentContexts, projectRevenueQuality, validateActionReceipt } from './common-revenue-core-decision-evidence-v0.mjs';

function event(overrides = {}) {
  return {
    event_id: overrides.event_id || `evt_${Math.random().toString(16).slice(2)}`,
    event_type: overrides.event_type || 'traffic',
    business_unit: overrides.business_unit || 'stratum',
    timestamp: overrides.timestamp || '2026-09-04T00:00:00.000Z',
    source: overrides.source || 'posthog',
    source_event_name: overrides.source_event_name || 'test',
    source_event_id: overrides.source_event_id || 'src_1',
    evidence_ref: overrides.evidence_ref || 'evidence:test',
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
    currency: overrides.currency ?? null
  };
}

test('action receipt requires explicit execution metadata', () => {
  const result = validateActionReceipt({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.field === 'action_id'));
});

test('valid receipt becomes canonical action_executed event without pretending payment truth', () => {
  const result = actionReceiptToCanonicalEvent({
    action_id: 'act_1', business_unit: 'stratum', action_type: 'improve_existing_cta', status: 'EXECUTED',
    executed_at: '2026-09-04T01:00:00.000Z', human_gate_required: false, dry_run: false,
    evidence_ref: ['repo:commit:abc'], asset_id: 'asset_a', product_id: 'product_a', route_id: 'route_a', experiment_id: 'exp_1'
  });
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.event.event_type, 'action_executed');
  assert.equal(result.event.evidence_strength, 'MODERATE');
  assert.equal(result.event.provider, null);
});

test('experiment projection is observational and never upgrades to causal proof', () => {
  const rows = [
    event({ experiment_id: 'exp_1', event_type: 'traffic' }),
    event({ experiment_id: 'exp_1', event_type: 'purchase', evidence_strength: 'STRONG', provider: 'stripe', provider_transaction_id: 'cs_1' })
  ];
  const contexts = buildExperimentContexts(rows);
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].verified_purchase_count, 1);
  assert.equal(contexts[0].causal_claim_allowed, false);
});

test('revenue quality reports low confidence for tiny samples', () => {
  const quality = projectRevenueQuality([
    event({ event_type: 'purchase', evidence_strength: 'STRONG', provider: 'stripe', provider_transaction_id: 'cs_1' })
  ]);
  assert.equal(quality.trusted_purchase_count, 1);
  assert.ok(quality.confidence < 0.8);
  assert.ok(quality.uncertainty > 0.2);
});

test('refund and chargeback remain explicit quality penalties', () => {
  const rows = [
    event({ event_type: 'purchase', evidence_strength: 'STRONG', provider: 'stripe', provider_transaction_id: 'cs_1' }),
    event({ event_type: 'refund', evidence_strength: 'STRONG', provider: 'stripe', provider_transaction_id: 're_1' }),
    event({ event_type: 'chargeback', evidence_strength: 'STRONG', provider: 'stripe', provider_transaction_id: 'dp_1' })
  ];
  const quality = projectRevenueQuality(rows);
  assert.equal(quality.refund_rate, 1);
  assert.equal(quality.chargeback_rate, 1);
});
