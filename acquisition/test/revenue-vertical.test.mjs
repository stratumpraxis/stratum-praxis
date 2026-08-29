// Revenue Publisher v2 - the reusable revenue-vertical contract.
//
// The point of this file is that a second revenue theme is a data record, and that a
// vertical can never talk its way past the existing-asset router.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessVertical, loadVerticals, opportunityBreakdown, opportunityScore, selectOpportunity, validateVertical
} from '../lib/vertical.mjs';
import { readJson } from '../lib/util.mjs';

const verticals = await loadVerticals();
const candidateStore = await readJson('acquisition/signal-intelligence/candidates.json');
const candidates = candidateStore.candidates || [];

test('the shipped registry validates, and only the supported themes are active', () => {
  for (const vertical of verticals.verticals) assert.deepEqual(validateVertical(vertical), []);
  assert.deepEqual(verticals.active.map((v) => v.vertical_id), ['ai_spend_accountability', 'ai_subscription_rationalization']);

  const watch = verticals.verticals.filter((v) => v.state === 'WATCH').map((v) => v.vertical_id);
  assert.deepEqual(watch, ['ai_agent_roi', 'ai_runtime_cost']);
  for (const id of watch) {
    const vertical = verticals.byId.get(id);
    assert.ok(vertical.watch_reason, `${id} must record why it is not active`);
    assert.ok(vertical.promotion_requires, `${id} must record what would promote it`);
  }
});

test('ai_runtime_cost stays on WATCH and generates nothing', () => {
  const assessment = assessVertical(verticals.byId.get('ai_runtime_cost'), candidates);
  assert.equal(assessment.eligible, false);
  assert.equal(assessment.opportunity_score, 0);
  assert.match(assessment.reasons.join(' '), /WATCH/);
  assert.equal(verticals.byId.get('ai_runtime_cost').new_product_gate, 'CLOSED');
});

test('an ACTIVE vertical must name a thesis and a verified destination asset', () => {
  const errors = validateVertical({
    vertical_id: 'probe_vertical',
    state: 'ACTIVE',
    buyer_problem: 'x', editorial_angle: 'x',
    eligible_source_families: [], target_audiences: [],
    best_existing_assets: [], cta_routes: [], freshness_requirement_days: 30,
    minimum_evidence: {}, minimum_revenue_signal_score: 70, prohibited_claims: [],
    thesis_ids: [], cta_required: true
  });
  assert.ok(errors.some((e) => /at least one thesis_id/.test(e)));
  assert.ok(errors.some((e) => /verified existing asset/.test(e)));
  assert.ok(errors.some((e) => /no PRIMARY cta_route/.test(e)));
});

test('no vertical may open the new-product gate', () => {
  const errors = validateVertical({
    ...verticals.byId.get('ai_subscription_rationalization'),
    new_product_gate: 'OPEN'
  });
  assert.ok(errors.some((e) => /no vertical may open the new-product gate/.test(e)));

  for (const vertical of verticals.active) {
    assert.equal(vertical.new_product_gate, 'BLOCKED_EXISTING_ASSET_SUFFICIENT');
    assert.ok(vertical.new_product_gate_reason);
  }
});

test('existing asset fit blocks new-product creation for the subscription thesis', () => {
  const candidate = candidates.find((c) => c.thesis_id === 'ai-subscription-rationalization-2026-08');
  assert.ok(candidate, 'the subscription-rationalization candidate must exist');
  assert.equal(candidate.asset_fit_outcome, 'EXISTING_ASSET_FIT');
  assert.equal(candidate.new_product_gate, 'BLOCKED_EXISTING_ASSET_SUFFICIENT');
  assert.equal(candidate.product_created, false);
  assert.equal(candidate.asset_id, 'ai-saas-waste-calculator');
  assert.equal(candidate.destination_url, 'https://stratumpraxis.com/ai-saas-waste-calculator.html');
  // The downstream purchase path is preserved rather than replaced.
  assert.equal(candidate.secondary_route.asset_id, 'ai-saas-spend-audit-checklist');
  assert.equal(candidate.secondary_route.role, 'PURCHASE_PATH');
});

test('the subscription vertical is eligible on the evidence actually recorded', () => {
  const assessment = assessVertical(verticals.byId.get('ai_subscription_rationalization'), candidates);
  assert.equal(assessment.eligible, true, assessment.reasons.join('; '));
  assert.ok(assessment.candidate.revenue_signal_score >= 70);
  assert.ok(assessment.candidate.corroboration_groups.length >= 2);
  assert.ok(assessment.candidate.supporting_signal_ids.length >= 2);
  assert.ok(assessment.opportunity_score > 0);
});

test('a candidate that misses any minimum is refused, one reason per miss', () => {
  const vertical = verticals.byId.get('ai_subscription_rationalization');
  const weak = {
    ...candidates.find((c) => c.thesis_id === 'ai-subscription-rationalization-2026-08'),
    revenue_signal_score: 51,
    supporting_signal_ids: ['only-one'],
    corroboration_groups: ['social_public'],
    corroboration_buckets: ['PAIN_SIGNAL'],
    freshness: { newest_evidence_age_days: 400 }
  };
  const assessment = assessVertical(vertical, [weak]);
  assert.equal(assessment.eligible, false);
  const reasons = assessment.reasons.join(' | ');
  assert.match(reasons, /below the vertical minimum/);
  assert.match(reasons, /independent OBSERVED signal/);
  assert.match(reasons, /independence group/);
  assert.match(reasons, /evidence bucket/);
  assert.match(reasons, /days old/);
});

test('an expired or unpromoted candidate cannot be published from', () => {
  const vertical = verticals.byId.get('ai_subscription_rationalization');
  const source = candidates.find((c) => c.thesis_id === 'ai-subscription-rationalization-2026-08');

  const expired = assessVertical(vertical, [{ ...source, expiry: '2020-01-01T00:00:00Z' }]);
  assert.equal(expired.eligible, false);
  assert.match(expired.reasons.join(' '), /expired/);

  const notPromoted = assessVertical(vertical, [{ ...source, status: 'RESEARCH_GAP' }]);
  assert.equal(notPromoted.eligible, false);
  assert.match(notPromoted.reasons.join(' '), /not a promoted status/);
});

test('the opportunity score follows the routing principle and picks exactly one winner', () => {
  const candidate = candidates.find((c) => c.thesis_id === 'ai-subscription-rationalization-2026-08');
  const breakdown = opportunityBreakdown(candidate);
  for (const key of ['demand_strength', 'purchase_intent', 'existing_asset_fit', 'freshness', 'measurement_quality']) {
    assert.ok(breakdown[key] >= 0 && breakdown[key] <= 1, `${key} should be a 0-1 factor`);
  }
  assert.ok(breakdown.operational_burden_divisor >= 1, 'burden divides, it never multiplies');

  // Halving any numerator factor halves the score; raising burden lowers it.
  const halfIntent = { ...candidate, score_breakdown: { ...candidate.score_breakdown, purchase_intent: { score: candidate.score_breakdown.purchase_intent.score / 2 } } };
  assert.ok(opportunityScore(halfIntent) < opportunityScore(candidate));
  const higherBurden = { ...candidate, score_breakdown: { ...candidate.score_breakdown, operational_burden: { score: 1 } } };
  assert.ok(opportunityScore(higherBurden) < opportunityScore(candidate));

  const selection = selectOpportunity(verticals, candidates);
  assert.ok(selection.selected, 'one opportunity must be selected');
  assert.equal(selection.eligible.length >= 1, true);
  // Ranked, not fanned out: the selection is a single vertical, never a product of themes.
  assert.equal(typeof selection.selected.vertical_id, 'string');
  assert.ok(selection.selected.opportunity_score >= (selection.eligible[1]?.opportunity_score ?? 0));
});

test('the shipped verticals only route to assets the inventory verifies', async () => {
  const inventory = await readJson('acquisition/asset-inventory.json');
  const byId = new Map(inventory.assets.map((a) => [a.asset_id, a]));
  for (const vertical of verticals.verticals) {
    for (const assetId of [vertical.primary_asset_id, ...(vertical.best_existing_assets || [])].filter(Boolean)) {
      const asset = byId.get(assetId);
      assert.ok(asset, `${vertical.vertical_id} names unknown asset ${assetId}`);
      assert.equal(asset.status, 'LIVE');
      assert.equal(asset.verification_state, 'HTTP_VERIFIED');
    }
    for (const route of vertical.cta_routes || []) {
      const asset = byId.get(route.asset_id);
      assert.ok(asset, `${vertical.vertical_id} routes to unknown asset ${route.asset_id}`);
      assert.equal(route.url, asset.public_url);
    }
  }
});
