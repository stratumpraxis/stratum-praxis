import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_THRESHOLDS, classifyAll, classifyRoute, groupByVerdict } from '../lib/winner.mjs';

test('views alone never produce SCALE', () => {
  const result = classifyRoute({ route_id: 'viral', destination_views: 500000, impressions: 9000000 });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
  assert.match(result.views_only_warning, /Views alone never justify scaling/);
});

test('a high-view low-intent source is stopped, not scaled', () => {
  const result = classifyRoute({ route_id: 'low-intent', destination_views: 5000, cta_clicks: 3 });
  assert.equal(result.verdict, 'STOP');
  assert.ok(result.reasons.some((r) => r.includes('high traffic, low intent')));
});

test('no measurement yields INSUFFICIENT_DATA, never a guess', () => {
  assert.equal(classifyRoute({ route_id: 'nothing' }).verdict, 'INSUFFICIENT_DATA');
  assert.equal(classifyRoute({ route_id: 'nothing' }).measurement.destination_views, 'NOT_MEASURED');
});

test('a small sample never produces a verdict', () => {
  const result = classifyRoute({ route_id: 'small', destination_views: DEFAULT_THRESHOLDS.minDestinationViews - 1, cta_clicks: 20 });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
});

test('a purchase count without payment evidence is ignored', () => {
  const result = classifyRoute({ route_id: 'unevidenced', destination_views: 400, cta_clicks: 40, checkout: 0, purchase: 12 });
  assert.notEqual(result.verdict, 'SCALE');
  assert.equal(result.measurement.purchase, 'NOT_MEASURED');
  assert.ok(result.reasons.some((r) => r.includes('no payment-provider evidence')));
});

test('a verified purchase is the strongest scale signal', () => {
  const result = classifyRoute({
    route_id: 'real', destination_views: 120, cta_clicks: 9, checkout: 2,
    purchase: 1, purchase_evidence: 'stripe:pi_3ABC'
  });
  assert.equal(result.verdict, 'SCALE');
  assert.ok(result.reasons[0].includes('stripe:pi_3ABC'));
});

test('healthy CTA without commercial progression is ITERATE, not SCALE', () => {
  const noCheckout = classifyRoute({ route_id: 'cta-only', destination_views: 500, cta_clicks: 60 });
  assert.equal(noCheckout.verdict, 'ITERATE');
  assert.ok(noCheckout.reasons.some((r) => r.includes('checkout is NOT_MEASURED')));

  const zeroCheckout = classifyRoute({ route_id: 'cta-zero-checkout', destination_views: 500, cta_clicks: 60, checkout: 0 });
  assert.equal(zeroCheckout.verdict, 'ITERATE');
});

test('CTA plus checkout progression scales', () => {
  const result = classifyRoute({ route_id: 'progressing', destination_views: 500, cta_clicks: 60, checkout: 10 });
  assert.equal(result.verdict, 'SCALE');
});

test('measured zero and NOT_MEASURED are reported differently', () => {
  const measuredZero = classifyRoute({ route_id: 'z', destination_views: 200, cta_clicks: 0 });
  assert.equal(measuredZero.measurement.cta_clicks, 0);
  assert.equal(measuredZero.measurement.cta_rate, 0);

  const unmeasured = classifyRoute({ route_id: 'u', destination_views: 200 });
  assert.equal(unmeasured.measurement.cta_clicks, 'NOT_MEASURED');
  assert.equal(unmeasured.measurement.cta_rate, 'NOT_MEASURED');
});

test('a low-traffic weak route is iterated rather than killed', () => {
  const result = classifyRoute({ route_id: 'weak', destination_views: 50, cta_clicks: 0 });
  assert.equal(result.verdict, 'ITERATE');
  assert.ok(result.reasons.some((r) => r.includes('does not justify stopping')));
});

test('thresholds are exposed with every verdict for audit', () => {
  const result = classifyRoute({ route_id: 'x', destination_views: 200, cta_clicks: 10 });
  assert.deepEqual(result.thresholds, DEFAULT_THRESHOLDS);
});

test('grouping covers every verdict bucket', () => {
  const classified = classifyAll([
    { route_id: 'a', destination_views: 500, cta_clicks: 60, checkout: 10 },
    { route_id: 'b', destination_views: 5000, cta_clicks: 3 },
    { route_id: 'c' },
    { route_id: 'd', destination_views: 500, cta_clicks: 60 }
  ]);
  const grouped = groupByVerdict(classified);
  assert.deepEqual(grouped.SCALE, ['a']);
  assert.deepEqual(grouped.STOP, ['b']);
  assert.deepEqual(grouped.INSUFFICIENT_DATA, ['c']);
  assert.deepEqual(grouped.ITERATE, ['d']);
});

// ---- attribution gating (video-lane attribution work) ----------------------

const strongCommercial = { route_id: 'r', destination_views: 500, cta_clicks: 60, checkout: 10 };

test('an ATTRIBUTED route with commercial progression can still SCALE', () => {
  const result = classifyRoute({ ...strongCommercial, attribution_state: 'ATTRIBUTED' });
  assert.equal(result.verdict, 'SCALE');
  assert.equal(result.attribution_state, 'ATTRIBUTED');
});

test('an UNATTRIBUTED route can never SCALE, however good its numbers look', () => {
  const result = classifyRoute({ ...strongCommercial, attribution_state: 'UNATTRIBUTED' });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
  assert.ok(result.reasons.some((r) => r.includes('cannot be associated')));
});

test('UNVERIFIED is treated exactly like UNATTRIBUTED: unproven is not proven', () => {
  const result = classifyRoute({ ...strongCommercial, attribution_state: 'UNVERIFIED' });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
});

test('an awareness-only route is INSUFFICIENT_DATA with an explicit reason', () => {
  const result = classifyRoute({ ...strongCommercial, attribution_state: 'NOT_APPLICABLE' });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
  assert.ok(result.reasons.some((r) => r.includes('awareness-only')));
});

test('even a verified purchase cannot SCALE an unattributed route', () => {
  // The purchase is real, but nothing proves this post produced it.
  const result = classifyRoute({
    ...strongCommercial,
    attribution_state: 'UNATTRIBUTED',
    purchase: 5,
    purchase_evidence: 'stripe:pi_3REAL'
  });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
});

test('an attributed route with no downstream measurement is INSUFFICIENT_DATA, not SCALE', () => {
  const result = classifyRoute({ route_id: 'r', attribution_state: 'ATTRIBUTED' });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
  assert.equal(result.measurement.destination_views, 'NOT_MEASURED');
});

test('attribution never manufactures measurement', () => {
  const result = classifyRoute({ route_id: 'r', attribution_state: 'ATTRIBUTED', destination_views: 500 });
  assert.equal(result.verdict, 'INSUFFICIENT_DATA');
  assert.equal(result.measurement.cta_clicks, 'NOT_MEASURED');
  assert.equal(result.measurement.purchase, 'NOT_MEASURED');
});

test('routes without an attribution field keep working (legacy callers)', () => {
  const result = classifyRoute(strongCommercial);
  assert.equal(result.verdict, 'SCALE');
  assert.equal(result.attribution_state, 'NOT_TRACKED');
});

test('every verdict carries the attribution state it was judged under', () => {
  for (const state of ['ATTRIBUTED', 'UNATTRIBUTED', 'UNVERIFIED', 'NOT_APPLICABLE']) {
    assert.equal(classifyRoute({ ...strongCommercial, attribution_state: state }).attribution_state, state);
  }
});
