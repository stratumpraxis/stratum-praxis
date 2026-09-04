import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTRIBUTION_STATES,
  BUSINESS_UNITS,
  CANONICAL_EVENT_TYPES,
  DECISION_STATES,
  ERROR_CODES,
  EVIDENCE_STRENGTHS,
  SYNC_STATES,
  mapLegacyDecision,
  mapNativeEvent,
  validateCanonicalEvent,
  validateDecisionOutput
} from './common-revenue-core-schema-v0.mjs';

const baseEvent = {
  event_id: 'evt_001',
  event_type: 'traffic',
  business_unit: 'stratum',
  timestamp: '2026-09-04T03:00:00Z',
  source: 'posthog',
  source_event_name: 'traffic_session_start',
  sync_status: 'PENDING_SYNC',
  evidence_ref: 'posthog:event:evt_001'
};

test('Phase 0 enum counts are locked', () => {
  assert.equal(CANONICAL_EVENT_TYPES.length, 13);
  assert.equal(BUSINESS_UNITS.length, 2);
  assert.equal(ATTRIBUTION_STATES.length, 4);
  assert.equal(EVIDENCE_STRENGTHS.length, 4);
  assert.equal(SYNC_STATES.length, 4);
  assert.equal(DECISION_STATES.length, 6);
  assert.equal(ERROR_CODES.length, 9);
});

test('valid canonical event passes', () => {
  assert.deepEqual(validateCanonicalEvent(baseEvent), { ok: true, errors: [] });
});

test('invalid event type and business unit fail closed', () => {
  const result = validateCanonicalEvent({ ...baseEvent, event_type: 'checkout_click', business_unit: 'other' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.field === 'event_type'));
  assert.ok(result.errors.some((item) => item.field === 'business_unit'));
});

test('optional IDs may stay null instead of being fabricated', () => {
  const result = validateCanonicalEvent({
    ...baseEvent,
    transaction_id: null,
    customer_id: null,
    asset_id: null,
    product_id: null,
    route_id: null,
    experiment_id: null,
    action_id: null,
    cta_id: null
  });
  assert.equal(result.ok, true);
});

test('trusted non-payment event can require evidence explicitly', () => {
  const result = validateCanonicalEvent({ ...baseEvent, evidence_ref: null }, { require_trusted_evidence: true });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === 'EVIDENCE_MISSING'));
});

test('purchase cannot pass without provider evidence', () => {
  const result = validateCanonicalEvent({ ...baseEvent, event_type: 'purchase', source_event_name: 'purchase', source: 'posthog' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.filter((item) => item.code === 'PURCHASE_EVIDENCE_MISSING').length >= 2);
});

test('purchase with provider evidence passes the Phase 1 schema guard', () => {
  const result = validateCanonicalEvent({
    ...baseEvent,
    event_type: 'purchase',
    source: 'stripe',
    source_event_name: 'checkout.session.completed',
    evidence_ref: 'stripe:event:evt_live_123',
    provider: 'stripe',
    provider_transaction_id: 'cs_live_123',
    transaction_id: 'txn_123',
    sync_status: 'PENDING_SYNC'
  });
  assert.equal(result.ok, true);
});

test('checkout_click is never upgraded to checkout_started by mapping', () => {
  assert.deepEqual(mapNativeEvent('checkout_click'), {
    event_type: null,
    reason: 'CHECKOUT_PROVIDER_EVIDENCE_REQUIRED'
  });
});

test('funnel_view requires explicit product-view qualification', () => {
  assert.equal(mapNativeEvent('funnel_view').event_type, null);
  assert.equal(mapNativeEvent('funnel_view', { qualifies_as_product_view: true }).event_type, 'product_view');
});

test('existing source event names map without renaming source history', () => {
  assert.equal(mapNativeEvent('traffic_session_start').event_type, 'traffic');
  assert.equal(mapNativeEvent('primary_cta_click').event_type, 'cta_click');
  assert.equal(mapNativeEvent('commerce_entry_click').event_type, 'cta_click');
});

test('legacy decision compatibility is deterministic', () => {
  assert.equal(mapLegacyDecision('SCALE'), 'SCALE');
  assert.equal(mapLegacyDecision('ITERATE'), 'FIX');
  assert.equal(mapLegacyDecision('STOP'), 'STOP');
  assert.equal(mapLegacyDecision('INSUFFICIENT_DATA'), 'HOLD');
  assert.equal(mapLegacyDecision('INSUFFICIENT_DATA', { test_eligible: true }), 'TEST');
  assert.equal(mapLegacyDecision('UNKNOWN'), null);
});

test('decision output validates six-state contract and Human Gate reason', () => {
  const valid = {
    decision_id: 'decision_001',
    generated_at: '2026-09-04T03:00:00Z',
    business_unit: 'vector',
    decision: 'TEST',
    next_best_action: 'send one measured route',
    reason: 'evidence is promising but insufficient',
    evidence_ref: ['repo:vector:probe-1'],
    evidence_strength: 'MODERATE',
    confidence: 0.63,
    human_gate_required: false,
    max_bottleneck: 'traffic',
    sold_product_ids: []
  };
  assert.equal(validateDecisionOutput(valid).ok, true);

  const gated = { ...valid, human_gate_required: true };
  const result = validateDecisionOutput(gated);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.field === 'human_gate_reason'));
});
