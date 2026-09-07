import test from 'node:test';
import assert from 'node:assert/strict';

import { assessRepeatability, hasVerifiedPurchase, routeFamilyKey } from '../lib/repeatability.mjs';

function record(overrides = {}) {
  return {
    ledger_id: overrides.ledger_id || 'r1',
    revenue_route_id: overrides.revenue_route_id ?? 'route-a',
    attribution_state: overrides.attribution_state ?? 'ATTRIBUTED',
    status: overrides.status ?? 'PUBLISHED',
    signal_id: overrides.signal_id ?? null,
    human_signal: overrides.human_signal ?? null,
    funnel: {
      downstream_views: null,
      cta_clicks: null,
      checkout: null,
      purchase: null,
      purchase_evidence: null,
      ...(overrides.funnel || {})
    },
    utm: overrides.utm ?? null,
    asset: overrides.asset ?? 'asset-a',
    destination_asset_id: overrides.destination_asset_id ?? 'asset-a'
  };
}

test('one verified attributed purchase is PROVEN_ONCE, not repeatable', () => {
  const result = assessRepeatability([
    record({ ledger_id: 'one', funnel: { purchase: 1, purchase_evidence: 'stripe:pi_one' } })
  ]);
  assert.deepEqual(result.by_verdict.PROVEN_ONCE, ['route-a']);
  assert.deepEqual(result.by_verdict.REPEATABLE_WIN, []);
});

test('two independent verified purchase runs in the same family are REPEATABLE_WIN', () => {
  const result = assessRepeatability([
    record({ ledger_id: 'one', funnel: { purchase: 1, purchase_evidence: 'stripe:pi_one' } }),
    record({ ledger_id: 'two', funnel: { purchase: 1, purchase_evidence: 'stripe:pi_two' } })
  ]);
  assert.deepEqual(result.by_verdict.REPEATABLE_WIN, ['route-a']);
  const route = result.route_families[0];
  assert.equal(route.evidence.verified_purchase_runs, 2);
  assert.equal(route.path_coverage.verified_revenue, true);
});

test('purchase without payment evidence cannot prove a win', () => {
  const r = record({ funnel: { purchase: 3 } });
  assert.equal(hasVerifiedPurchase(r), false);
  const result = assessRepeatability([r]);
  assert.equal(result.route_families[0].verdict, 'UNPROVEN');
});

test('unattributed purchases never establish route repeatability', () => {
  const result = assessRepeatability([
    record({ ledger_id: 'one', attribution_state: 'UNATTRIBUTED', funnel: { purchase: 1, purchase_evidence: 'stripe:pi_one' } }),
    record({ ledger_id: 'two', attribution_state: 'UNATTRIBUTED', funnel: { purchase: 1, purchase_evidence: 'stripe:pi_two' } })
  ]);
  assert.equal(result.route_families[0].verdict, 'UNPROVEN');
  assert.equal(result.route_families[0].evidence.verified_purchase_runs, 0);
});

test('separate route families never combine their wins', () => {
  const result = assessRepeatability([
    record({ ledger_id: 'a', revenue_route_id: 'route-a', funnel: { purchase: 1, purchase_evidence: 'stripe:pi_a' } }),
    record({ ledger_id: 'b', revenue_route_id: 'route-b', funnel: { purchase: 1, purchase_evidence: 'stripe:pi_b' } })
  ]);
  assert.deepEqual(result.by_verdict.REPEATABLE_WIN, []);
  assert.deepEqual(result.by_verdict.PROVEN_ONCE.sort(), ['route-a', 'route-b']);
});

test('measured checkout without purchase is COMMERCIAL_SIGNAL', () => {
  const result = assessRepeatability([
    record({ funnel: { downstream_views: 100, cta_clicks: 20, checkout: 2 } })
  ]);
  assert.equal(result.route_families[0].verdict, 'COMMERCIAL_SIGNAL');
  assert.equal(result.route_families[0].path_coverage.checkout, true);
});

test('traffic and CTA alone stay TRAFFIC_ONLY', () => {
  const result = assessRepeatability([
    record({ funnel: { downstream_views: 100, cta_clicks: 10 } })
  ]);
  assert.equal(result.route_families[0].verdict, 'TRAFFIC_ONLY');
  assert.equal(result.route_families[0].path_coverage.checkout, false);
});

test('explicit human signal requires an evidence reference', () => {
  const weak = assessRepeatability([
    record({ human_signal: { type: 'QUALIFIED_REPLY' } })
  ]);
  assert.equal(weak.route_families[0].path_coverage.human_reaction, false);

  const strong = assessRepeatability([
    record({ human_signal: { type: 'QUALIFIED_REPLY', evidence_ref: 'gmail:msg_123' } })
  ]);
  assert.equal(strong.route_families[0].path_coverage.human_reaction, true);
  assert.equal(strong.route_families[0].verdict, 'COMMERCIAL_SIGNAL');
});

test('legacy route-family fallback is deterministic and campaign-specific', () => {
  const a = record({
    revenue_route_id: null,
    utm: { utm_source: 'youtube', utm_medium: 'video', utm_campaign: 'alpha', utm_content: 'hook-a' }
  });
  const b = record({
    ledger_id: 'b',
    revenue_route_id: null,
    utm: { utm_source: 'youtube', utm_medium: 'video', utm_campaign: 'alpha', utm_content: 'hook-a' }
  });
  const c = record({
    ledger_id: 'c',
    revenue_route_id: null,
    utm: { utm_source: 'youtube', utm_medium: 'video', utm_campaign: 'beta', utm_content: 'hook-a' }
  });
  assert.equal(routeFamilyKey(a), routeFamilyKey(b));
  assert.notEqual(routeFamilyKey(a), routeFamilyKey(c));
});
