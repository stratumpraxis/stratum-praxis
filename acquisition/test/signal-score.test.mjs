import test from 'node:test';
import assert from 'node:assert/strict';

import { DIMENSIONS, MEASUREMENT_FLOOR, SAFETY_FLOOR, describeClaim, scoreSignal, validateScoreInput } from '../lib/signal-score.mjs';
import { readJson } from '../lib/util.mjs';

const strong = (evidence = 'OBSERVED', score = 8) =>
  Object.fromEntries(Object.keys(DIMENSIONS).map((k) => [k, { score, evidence }]));

test('the scoring model is fully transparent', () => {
  const result = scoreSignal(strong());
  assert.equal(Object.keys(result.breakdown).length, Object.keys(DIMENSIONS).length);
  for (const [name, weight] of Object.entries(DIMENSIONS)) {
    assert.equal(result.breakdown[name].weight, weight);
    assert.equal(result.breakdown[name].contribution, result.breakdown[name].score * weight);
  }
  assert.equal(result.total, Object.values(result.breakdown).reduce((s, d) => s + d.contribution, 0));
});

test('a hypothesis is never reported as evidence', () => {
  const result = scoreSignal(strong('HYPOTHESIS', 10));
  assert.equal(result.claim_strength, 'UNOBSERVED_HYPOTHESIS');
  assert.match(describeClaim(result), /Hypothesis only/);
  assert.notEqual(result.verdict, 'DISTRIBUTE', 'a purely hypothetical signal must not clear the distribute bar');
  assert.equal(result.observed_share, 0);
});

test('a bare number carries no evidence class and is downgraded to hypothesis', () => {
  const result = scoreSignal(Object.fromEntries(Object.keys(DIMENSIONS).map((k) => [k, 10])));
  assert.equal(result.claim_strength, 'UNOBSERVED_HYPOTHESIS');
  assert.equal(result.breakdown.safety.evidence, 'HYPOTHESIS');
});

test('the safety floor rejects regardless of every other score', () => {
  const result = scoreSignal({ ...strong('OBSERVED', 10), safety: { score: SAFETY_FLOOR - 1, evidence: 'OBSERVED' } });
  assert.equal(result.verdict, 'REJECT');
  assert.ok(result.blocks.some((b) => b.includes('safety score')));
});

test('the measurement floor rejects an unlearnable publish', () => {
  const result = scoreSignal({ ...strong('OBSERVED', 10), measurement_quality: { score: MEASUREMENT_FLOOR - 1, evidence: 'OBSERVED' } });
  assert.equal(result.verdict, 'REJECT');
  assert.ok(result.blocks.some((b) => b.includes('measurement_quality')));
});

test('evidence classes are separated in the output', () => {
  const result = scoreSignal({
    ...strong('OBSERVED'),
    urgency: { score: 5, evidence: 'HYPOTHESIS' },
    content_fit: { score: 5, evidence: 'ASSUMPTION' }
  });
  assert.ok(result.dimensions_by_class.HYPOTHESIS.includes('urgency'));
  assert.ok(result.dimensions_by_class.ASSUMPTION.includes('content_fit'));
  assert.ok(result.dimensions_by_class.OBSERVED.includes('safety'));
});

test('invalid and malformed score input is rejected with named problems', () => {
  assert.deepEqual(validateScoreInput(null), ['scores must be an object']);
  assert.ok(validateScoreInput({}).length >= Object.keys(DIMENSIONS).length);

  const outOfRange = validateScoreInput({ ...strong(), safety: { score: 99, evidence: 'OBSERVED' } });
  assert.ok(outOfRange.some((e) => e.includes('score must be an integer 0-10')));

  const fractional = validateScoreInput({ ...strong(), safety: { score: 7.5, evidence: 'OBSERVED' } });
  assert.ok(fractional.some((e) => e.includes('score must be an integer')));

  const badEvidence = validateScoreInput({ ...strong(), safety: { score: 9, evidence: 'PROBABLY' } });
  assert.ok(badEvidence.some((e) => e.includes('evidence must be one of')));

  const unknownDim = validateScoreInput({ ...strong(), vibes: { score: 9, evidence: 'OBSERVED' } });
  assert.ok(unknownDim.some((e) => e.includes('unknown scoring dimension')));

  assert.throws(() => scoreSignal({}), /signal scores are invalid/);
});

test('the shipped demand signals all score without error', async () => {
  const file = await readJson('acquisition/demand-signals.json');
  assert.ok(file.signals.length > 0);
  for (const signal of file.signals) {
    const result = scoreSignal(signal.scores);
    assert.ok(['DISTRIBUTE', 'PREPARE_AND_OBSERVE', 'HOLD', 'REJECT'].includes(result.verdict));
    if (result.claim_strength === 'UNOBSERVED_HYPOTHESIS') {
      assert.notEqual(result.verdict, 'DISTRIBUTE', `${signal.signal_id} would distribute on a pure hypothesis`);
    }
  }
});

test('every shipped signal that claims OBSERVED cites a basis', async () => {
  const file = await readJson('acquisition/demand-signals.json');
  for (const signal of file.signals) {
    const hasObserved = Object.values(signal.scores).some((d) => d.evidence === 'OBSERVED');
    if (!hasObserved) continue;
    assert.ok(Array.isArray(signal.observed_basis) && signal.observed_basis.length > 0,
      `${signal.signal_id} claims OBSERVED dimensions but cites no basis`);
  }
});
