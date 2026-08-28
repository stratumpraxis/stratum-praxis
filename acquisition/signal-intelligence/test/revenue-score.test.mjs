import test from 'node:test';
import assert from 'node:assert/strict';

import { corroborate } from '../lib/corroborate.mjs';
import {
  DERIVED_DIMENSIONS,
  DIMENSIONS,
  bandFor,
  scoreRevenueSignal,
  validateScoreInput
} from '../lib/revenue-score.mjs';
import { policy, scores, signal } from './helpers.mjs';

test('the score is fully auditable: every dimension reports its own contribution', () => {
  const result = scoreRevenueSignal(scores(8));
  assert.equal(Object.keys(result.breakdown).length, Object.keys(DIMENSIONS).length);
  for (const [name, weight] of Object.entries(DIMENSIONS)) {
    assert.equal(result.breakdown[name].weight, weight);
    assert.equal(result.breakdown[name].contribution, result.breakdown[name].score * weight);
  }
});

test('bands follow the issue semantics', () => {
  assert.equal(bandFor(20, policy).status, 'REJECT_LOW_VALUE');
  assert.equal(bandFor(60, policy).status, 'WATCH');
  assert.equal(bandFor(75, policy).status, 'SOURCE_CANDIDATE');
  assert.equal(bandFor(90, policy).status, 'HIGH_PRIORITY_SOURCE_CANDIDATE');
});

test('an unobserved thesis cannot band its way into promotion', () => {
  const observed = scoreRevenueSignal(scores(10, 'OBSERVED'), { policy });
  const guessed = scoreRevenueSignal(scores(10, 'HYPOTHESIS'), { policy });
  assert.equal(observed.score, 100);
  assert.equal(observed.band, 'HIGH_PRIORITY_SOURCE_CANDIDATE');
  assert.equal(guessed.raw_score, 100, 'the raw score is unchanged - only the evidence adjustment moves');
  assert.equal(guessed.score, 0);
  assert.equal(guessed.band, 'REJECT_LOW_VALUE');
  assert.equal(guessed.claim_strength, 'UNOBSERVED_HYPOTHESIS');
});

test('the safety floor rejects regardless of every other score', () => {
  const result = scoreRevenueSignal(scores(10, 'OBSERVED', { safety: { score: 6, evidence: 'OBSERVED' } }), { policy });
  assert.equal(result.band, 'REJECT_LOW_VALUE');
  assert.ok(result.blocks.some((b) => b.includes('safety score')));
});

test('the measurement floor rejects an unlearnable thesis', () => {
  const result = scoreRevenueSignal(scores(10, 'OBSERVED', { measurement_quality: { score: 3, evidence: 'OBSERVED' } }), { policy });
  assert.equal(result.band, 'REJECT_LOW_VALUE');
  assert.ok(result.blocks.some((b) => b.includes('measurement_quality')));
});

test('evidence dimensions are derived from the corroboration result, not self-asserted', () => {
  const weak = corroborate([signal({ signal_id: 'only-one', source_family: 'search_demand' })], policy);
  // A thesis claims perfect independence and quality for itself.
  const claimed = scores(10, 'OBSERVED');
  const result = scoreRevenueSignal(claimed, { policy, corroboration: weak, signals: [] });

  assert.ok(result.overridden_dimensions.includes('evidence_independence'));
  assert.ok(result.overridden_dimensions.includes('evidence_quality'));
  assert.ok(result.breakdown.evidence_independence.score < 10,
    'a single-signal thesis must not be allowed to score itself 10 for independence');
  assert.equal(result.breakdown.evidence_independence.derived, true);
});

test('stronger corroboration raises the derived independence score', () => {
  const weak = corroborate([signal({ signal_id: 'w1', source_family: 'search_demand' })], policy);
  const strong = corroborate([
    signal({ signal_id: 's1', source_family: 'search_demand' }),
    signal({ signal_id: 's2', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'] }),
    signal({ signal_id: 's3', source_family: 'competitor_pricing', evidence_buckets: ['MONEY_SIGNAL'] })
  ], policy);

  const weakScore = scoreRevenueSignal(scores(8), { policy, corroboration: weak, signals: [] });
  const strongScore = scoreRevenueSignal(scores(8), { policy, corroboration: strong, signals: [] });
  assert.ok(strongScore.breakdown.evidence_independence.score > weakScore.breakdown.evidence_independence.score);
  assert.ok(strongScore.score > weakScore.score);
});

test('the derived dimension list matches what the module documents', () => {
  assert.deepEqual([...DERIVED_DIMENSIONS].sort(), [
    'evidence_independence', 'evidence_quality', 'existing_product_fit', 'freshness'
  ]);
});

test('malformed score input is rejected with named problems', () => {
  assert.deepEqual(validateScoreInput(null), ['scores must be an object']);
  assert.ok(validateScoreInput({}).length >= Object.keys(DIMENSIONS).length);
  assert.ok(validateScoreInput({ ...scores(8), nonsense: { score: 5, evidence: 'OBSERVED' } })
    .some((e) => e.includes('unknown scoring dimension')));
  assert.ok(validateScoreInput(scores(11)).some((e) => e.includes('must be an integer 0-10')));
  assert.throws(() => scoreRevenueSignal({}), /invalid/);
});

test('a bare number carries no evidence class and is downgraded to hypothesis', () => {
  const bare = Object.fromEntries(Object.keys(DIMENSIONS).map((k) => [k, 9]));
  const result = scoreRevenueSignal(bare, { policy });
  assert.equal(result.claim_strength, 'UNOBSERVED_HYPOTHESIS');
  assert.equal(result.score, 0);
});
