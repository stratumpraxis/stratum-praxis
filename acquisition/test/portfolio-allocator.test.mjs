import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPortfolioPlan, rankMeasuredRoutes } from '../lib/portfolio-allocator.mjs';

const policy = {
  human_touch_budget_minutes_per_cycle: 10,
  max_active_actions_per_cycle: 2,
  verdict_weight: { SCALE: 100, ITERATE: 55, INSUFFICIENT_DATA: 20, STOP: 0 },
  human_minutes_by_channel: { youtube: 6, tiktok: 5, default: 10 }
};

function record(overrides = {}) {
  return {
    ledger_id: overrides.ledger_id || 'r1',
    platform: overrides.platform || 'youtube',
    asset: overrides.asset || 'asset-1',
    destination_asset_id: overrides.destination_asset_id || 'asset-1',
    attribution_state: overrides.attribution_state || 'ATTRIBUTED',
    funnel: {
      downstream_views: null,
      cta_clicks: null,
      checkout: null,
      purchase: null,
      ...overrides.funnel
    }
  };
}

test('verified purchase dominates an otherwise similar route', () => {
  const ranked = rankMeasuredRoutes([
    record({ ledger_id: 'purchase', funnel: { downstream_views: 100, cta_clicks: 8, checkout: 2, purchase: 1, purchase_evidence: 'stripe:pi_real' } }),
    record({ ledger_id: 'checkout', funnel: { downstream_views: 100, cta_clicks: 8, checkout: 2, purchase: 0 } })
  ], policy);
  assert.equal(ranked[0].id, 'purchase');
  assert.equal(ranked[0].verdict, 'SCALE');
  assert.ok(ranked[0].allocation_score > ranked[1].allocation_score);
});

test('unattributed route cannot win allocation with synthetic-looking numbers', () => {
  const ranked = rankMeasuredRoutes([
    record({ ledger_id: 'unattributed', attribution_state: 'UNATTRIBUTED', funnel: { downstream_views: 5000, cta_clicks: 500, checkout: 100 } }),
    record({ ledger_id: 'attributed', funnel: { downstream_views: 500, cta_clicks: 60, checkout: 10 } })
  ], policy);
  assert.equal(ranked[0].id, 'attributed');
  assert.equal(ranked[1].verdict, 'INSUFFICIENT_DATA');
});

test('STOP receives zero incremental allocation', () => {
  const [item] = rankMeasuredRoutes([
    record({ ledger_id: 'bad', funnel: { downstream_views: 5000, cta_clicks: 3, checkout: 0 } })
  ], policy);
  assert.equal(item.verdict, 'STOP');
  assert.equal(item.allocation_score, 0);
  assert.equal(item.action, 'STOP_INCREMENTAL_DISTRIBUTION');
});

test('portfolio plan respects one-human budget and action cap', () => {
  const plan = buildPortfolioPlan({
    measuredRoutes: [
      { type: 'MEASURED_ROUTE', id: 'a', allocation_score: 10, human_minutes: 6, action: 'SCALE_EXISTING_ROUTE' },
      { type: 'MEASURED_ROUTE', id: 'b', allocation_score: 9, human_minutes: 5, action: 'FIX_ONE_BOTTLENECK' },
      { type: 'MEASURED_ROUTE', id: 'c', allocation_score: 8, human_minutes: 4, action: 'FIX_ONE_BOTTLENECK' }
    ],
    demandProbes: [],
    policy
  });
  assert.deepEqual(plan.selected.map((x) => x.id), ['a', 'c']);
  assert.equal(plan.human_touch_minutes_allocated, 10);
  assert.equal(plan.selected.length, 2);
});
