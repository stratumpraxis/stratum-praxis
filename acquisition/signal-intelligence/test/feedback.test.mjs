import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyOutcomes, inStopCooldown, rankCandidates } from '../lib/feedback.mjs';
import { NOW, policy } from './helpers.mjs';

const candidate = (id, assetId, score) => ({
  source_candidate_id: id,
  thesis_id: id,
  asset_id: assetId,
  status: 'SOURCE_CANDIDATE',
  revenue_signal_score: score,
  evidence_strength: 'ADEQUATE',
  asset_fit_score: 0.8
});

/** A route with a verified purchase - the only thing that produces SCALE without CTA rates. */
const winningRoute = (assetId) => ({
  route_id: `${assetId}-route`,
  asset_id: assetId,
  attribution_state: 'ATTRIBUTED',
  destination_views: 400,
  cta_clicks: 40,
  checkout: 8,
  purchase: 2,
  purchase_evidence: 'stripe:pi_probe_reference',
  decided_at: new Date(NOW - 86400000).toISOString()
});

/** High traffic, demonstrably low intent - the shape the existing winner logic STOPs. */
const stoppedRoute = (assetId, decidedAt) => ({
  route_id: `${assetId}-route`,
  asset_id: assetId,
  attribution_state: 'ATTRIBUTED',
  destination_views: 500,
  cta_clicks: 2,
  checkout: 0,
  purchase: null,
  decided_at: decidedAt
});

test('the winner verdicts come from the existing acquisition winner logic', () => {
  const outcomes = classifyOutcomes([winningRoute('asset-a'), stoppedRoute('asset-b', new Date(NOW).toISOString())]);
  assert.equal(outcomes.get('asset-a').verdict, 'SCALE');
  assert.equal(outcomes.get('asset-b').verdict, 'STOP');
});

test('views alone never produce a SCALE prior', () => {
  const outcomes = classifyOutcomes([{
    route_id: 'views-only',
    asset_id: 'asset-views',
    attribution_state: 'ATTRIBUTED',
    destination_views: 5000,
    cta_clicks: null,
    checkout: null,
    purchase: null
  }]);
  assert.equal(outcomes.get('asset-views').verdict, 'INSUFFICIENT_DATA');
});

test('a STOPped route stays suppressed for the whole cooldown window', () => {
  const decidedAt = new Date(NOW - 2 * 86400000).toISOString();
  const outcomes = classifyOutcomes([stoppedRoute('asset-stop', decidedAt)]);

  const cooldown = inStopCooldown(outcomes.get('asset-stop'), policy, NOW);
  assert.equal(cooldown.stopped, true);

  const ranked = rankCandidates([candidate('sc-stop', 'asset-stop', 90)], { policy, outcomes, now: NOW });
  assert.deepEqual(ranked.ranked, []);
  assert.equal(ranked.suppressed[0].reason, 'STOP_COOLDOWN');

  // ... and is released once the window has passed.
  const after = NOW + (policy.exploration.stop_cooldown_days + 1) * 86400000;
  const released = rankCandidates([candidate('sc-stop', 'asset-stop', 90)], { policy, outcomes, now: after });
  assert.equal(released.suppressed.length, 0);
  assert.equal(released.ranked.length, 1);
});

test('a STOP with no decision date stays in cooldown rather than defaulting to open', () => {
  const outcomes = classifyOutcomes([stoppedRoute('asset-undated', null)]);
  const cooldown = inStopCooldown(outcomes.get('asset-undated'), policy, NOW);
  assert.equal(cooldown.stopped, true);
  assert.match(cooldown.reason, /carries no decision date/);
});

test('a measured win raises ranking priority but is capped', () => {
  const outcomes = classifyOutcomes([winningRoute('asset-winner')]);
  const result = rankCandidates([
    candidate('sc-winner', 'asset-winner', 70),
    candidate('sc-new', 'asset-new', 72)
  ], { policy, outcomes, now: NOW });

  const winner = result.ranked.find((r) => r.source_candidate_id === 'sc-winner');
  assert.equal(winner.prior_verdict, 'SCALE');
  assert.equal(winner.lane, 'EXPLOIT');
  assert.ok(winner.prior_multiplier <= policy.exploration.max_winner_boost);
  assert.ok(winner.priority > 70, 'a measured win must improve ranking');
  assert.equal(result.ranked[0].source_candidate_id, 'sc-winner');
});

test('exploration capacity survives a dominant winner', () => {
  const outcomes = classifyOutcomes([
    winningRoute('asset-w1'),
    winningRoute('asset-w2'),
    winningRoute('asset-w3')
  ]);
  const candidates = [
    candidate('sc-w1', 'asset-w1', 90),
    candidate('sc-w2', 'asset-w2', 88),
    candidate('sc-w3', 'asset-w3', 86),
    candidate('sc-fresh', 'asset-fresh', 71)
  ];

  const result = rankCandidates(candidates, { policy, outcomes, now: NOW, capacity: 3 });
  assert.equal(result.ranked.length, 3);
  assert.ok(result.ranked.some((r) => r.source_candidate_id === 'sc-fresh'),
    'a newly corroborated candidate must keep a slot even when three winners outscore it');
  assert.ok(result.exploration.granted_explore_slots >= 1);
});

test('an unmeasured candidate is labelled EXPLORE and carries a neutral prior', () => {
  const result = rankCandidates([candidate('sc-unmeasured', 'asset-none', 75)], { policy, outcomes: new Map(), now: NOW });
  assert.equal(result.ranked[0].lane, 'EXPLORE');
  assert.equal(result.ranked[0].prior_verdict, 'NO_MEASURED_OUTCOME');
  assert.equal(result.ranked[0].prior_multiplier, 1);
  assert.equal(result.ranked[0].priority, 75);
});

test('the worst verdict on an asset holds the whole asset, not the best one', () => {
  const outcomes = classifyOutcomes([
    { ...winningRoute('asset-mixed'), route_id: 'good' },
    { ...stoppedRoute('asset-mixed', new Date(NOW).toISOString()), route_id: 'bad' }
  ]);
  assert.equal(outcomes.get('asset-mixed').verdict, 'STOP');
});
