import test from 'node:test';
import assert from 'node:assert/strict';

import { corroborate } from '../lib/corroborate.mjs';
import { NO_FIT_OUTCOMES, assessAssetFit, measurementQualityOf } from '../lib/asset-fit.mjs';
import { loadContext } from '../lib/pipeline.mjs';
import { policy, signal, thesis } from './helpers.mjs';

const context = await loadContext({ policy });

const REQUIRED_FIELDS = [
  'best_existing_asset', 'asset_id', 'product_or_offer', 'primary_user_problem',
  'target_audience', 'primary_cta', 'destination_url', 'secondary_route',
  'asset_fit_score', 'verification_state', 'measurement_quality'
];

test('the fit gate returns every field the issue requires', () => {
  const fit = assessAssetFit(thesis(), context.inventory, context);
  for (const field of REQUIRED_FIELDS) {
    assert.ok(field in fit, `asset fit result is missing ${field}`);
  }
  assert.equal(fit.fits, true);
  assert.equal(fit.outcome, 'EXISTING_ASSET_FIT');
});

test('a verified existing asset is preferred over creating anything new', () => {
  const fit = assessAssetFit(thesis(), context.inventory, context);
  const asset = context.inventory.byId.get(fit.asset_id);
  assert.ok(asset, 'the chosen asset must exist in the verified inventory');
  assert.equal(asset.status, 'LIVE');
  assert.equal(asset.verification_state, 'HTTP_VERIFIED');
  assert.equal(fit.new_product_gate, 'BLOCKED_EXISTING_ASSET_SUFFICIENT');
  assert.equal(fit.destination_routable, true);
});

test('the fit floor is the same floor the existing router already enforces', () => {
  const fit = assessAssetFit(thesis(), context.inventory, context);
  assert.equal(fit.asset_fit_floor, policy.gates.asset_fit_floor);
  assert.ok(fit.asset_fit_score >= fit.asset_fit_floor);
});

test('a thesis with no matching asset does not create a product', () => {
  const orphan = thesis({
    thesis_id: 'unrelated-thesis',
    problem_keys: ['deep_sea_cable_maintenance_scheduling'],
    target_audience: ['submarine_cable_engineer'],
    language: 'is'
  });
  const weak = corroborate([signal({ signal_id: 'one-only', source_family: 'search_demand' })], policy);
  const fit = assessAssetFit(orphan, context.inventory, { ...context, policy, corroboration: weak, score: 40 });

  assert.equal(fit.fits, false);
  assert.ok(NO_FIT_OUTCOMES.includes(fit.outcome));
  assert.equal(fit.product_created, false);
  assert.equal(fit.best_existing_asset, null);
  assert.equal(fit.new_product_gate, 'CLOSED');
});

test('a corroborated no-fit thesis becomes WATCH_NO_ASSET_FIT, not a product', () => {
  const orphan = thesis({
    thesis_id: 'orphan-corroborated',
    problem_keys: ['deep_sea_cable_maintenance_scheduling'],
    target_audience: ['submarine_cable_engineer'],
    language: 'is'
  });
  const strong = corroborate([
    signal({ signal_id: 'o1', source_family: 'search_demand' }),
    signal({ signal_id: 'o2', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'] })
  ], policy);
  const fit = assessAssetFit(orphan, context.inventory, { ...context, policy, corroboration: strong, score: 74 });

  assert.equal(fit.outcome, 'WATCH_NO_ASSET_FIT');
  assert.equal(fit.product_created, false);
  assert.match(fit.human_action, /do not build/i);
});

test('NEW_PRODUCT_RECOMMENDATION requires strong corroboration AND the top score band', () => {
  const orphan = thesis({
    thesis_id: 'orphan-top-band',
    problem_keys: ['deep_sea_cable_maintenance_scheduling'],
    target_audience: ['submarine_cable_engineer'],
    language: 'is'
  });
  const strong = corroborate([
    signal({ signal_id: 'n1', source_family: 'search_demand' }),
    signal({ signal_id: 'n2', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'] }),
    signal({ signal_id: 'n3', source_family: 'competitor_pricing', evidence_buckets: ['MONEY_SIGNAL'] })
  ], policy);
  assert.equal(strong.strength, 'STRONG');

  const belowBand = assessAssetFit(orphan, context.inventory, { ...context, policy, corroboration: strong, score: 84 });
  assert.equal(belowBand.outcome, 'WATCH_NO_ASSET_FIT');

  const atBand = assessAssetFit(orphan, context.inventory, { ...context, policy, corroboration: strong, score: 88 });
  assert.equal(atBand.outcome, 'NEW_PRODUCT_RECOMMENDATION');
  // Even here nothing is built. The gate opens for a human, and no code creates a product.
  assert.equal(atBand.product_created, false);
  assert.equal(atBand.new_product_gate, 'OPEN_FOR_HUMAN_REVIEW');
  assert.match(atBand.human_action, /before considering any new offer/);
});

test('measurement quality is read from the events the page actually emits', () => {
  assert.equal(measurementQualityOf({ analytics_events: ['funnel_view', 'primary_cta_click', 'checkout_click'] }), 'CTA_AND_CHECKOUT_MEASURED');
  assert.equal(measurementQualityOf({ analytics_events: ['funnel_view', 'primary_cta_click'] }), 'CTA_MEASURED_CHECKOUT_DOWNSTREAM');
  assert.equal(measurementQualityOf({ analytics_events: ['page_view'] }), 'VIEW_ONLY');
  assert.equal(measurementQualityOf({ analytics_events: [] }), 'NOT_INSTRUMENTED');
});

test('no code path in this module writes anything', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../lib/asset-fit.mjs', import.meta.url), 'utf8');
  assert.ok(!/writeFile|writeJson|appendFile/.test(source), 'the fit gate must be read-only');
});
