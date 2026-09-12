import test from 'node:test';
import assert from 'node:assert/strict';

import {
  QUALIFIED_BUYER_ANALYTICS_EVENTS,
  appendAnalyticsEventToBuyerLedger,
  buyerReactionFromAnalyticsEvent
} from '../lib/analytics-buyer-bridge.mjs';

function event(overrides = {}) {
  return {
    uuid: 'evt_analytics_1',
    event: 'qualified_tool_action',
    distinct_id: 'anon_12345',
    timestamp: '2026-09-13T01:00:00.000Z',
    properties: {
      route_id: 'route_b2b_governance',
      asset_id: 'agent-control-auditor',
      company_key: 'company:opaque-1',
      problem_key: 'agent-governance'
    },
    ...overrides,
    properties: {
      route_id: 'route_b2b_governance',
      asset_id: 'agent-control-auditor',
      company_key: 'company:opaque-1',
      problem_key: 'agent-governance',
      ...(overrides.properties || {})
    }
  };
}

test('a qualified tool action becomes evidence-backed qualified_action', () => {
  const decision = buyerReactionFromAnalyticsEvent(event());
  assert.equal(decision.accepted, true);
  assert.equal(decision.reaction.stage, 'qualified_action');
  assert.equal(decision.reaction.revenue_distance, 3);
  assert.equal(decision.reaction.buyer_key, 'posthog:anon_12345');
  assert.equal(decision.reaction.evidence_ref, 'posthog-event:evt_analytics_1');
  assert.equal(decision.reaction.evidence_source, 'posthog');
  assert.deepEqual(decision.reaction.problem_keys, ['agent-governance']);
});

test('checkout clicks remain qualified action and never claim checkout completion', () => {
  for (const name of ['checkout_click', 'scos_checkout_click', 'advisor_checkout']) {
    const decision = buyerReactionFromAnalyticsEvent(event({ event: name, uuid: `evt_${name}` }));
    assert.equal(decision.accepted, true);
    assert.equal(decision.reaction.stage, 'qualified_action');
    assert.equal(decision.reaction.buying_conditions.includes('checkout-intent'), true);
  }
});

test('generic page views and weak events are not admitted as buyer intent', () => {
  for (const name of ['page_view', 'funnel_view', 'primary_cta_click', 'result_view']) {
    const decision = buyerReactionFromAnalyticsEvent(event({ event: name, uuid: `evt_${name}` }));
    assert.equal(decision.accepted, false);
    assert.equal(decision.reason, 'EVENT_NOT_QUALIFIED');
  }
});

test('direct identity-shaped distinct ids are refused rather than stored', () => {
  const decision = buyerReactionFromAnalyticsEvent(event({ distinct_id: 'buyer@example.com' }));
  assert.equal(decision.accepted, false);
  assert.equal(decision.reason, 'OPAQUE_BUYER_KEY_MISSING');
});

test('event id and event timestamp are mandatory evidence anchors', () => {
  assert.equal(buyerReactionFromAnalyticsEvent(event({ uuid: null })).reason, 'ANALYTICS_EVENT_ID_MISSING');
  assert.equal(buyerReactionFromAnalyticsEvent(event({ timestamp: null })).reason, 'ANALYTICS_EVENT_TIME_MISSING');
});

test('append is idempotent for the exact same analytics event', () => {
  let result = appendAnalyticsEventToBuyerLedger({ version: 1, records: [] }, event());
  assert.equal(result.accepted, true);
  assert.equal(result.ledger.records.length, 1);
  result = appendAnalyticsEventToBuyerLedger(result.ledger, event());
  assert.equal(result.ledger.records.length, 1);
});

test('the qualified analytics allowlist stays intentionally narrow', () => {
  assert.deepEqual(QUALIFIED_BUYER_ANALYTICS_EVENTS.sort(), [
    'advisor_checkout',
    'b2b_diagnostic_audit_click',
    'checkout_click',
    'partner_request_click',
    'qualified_tool_action',
    'scos_checkout_click'
  ]);
});
