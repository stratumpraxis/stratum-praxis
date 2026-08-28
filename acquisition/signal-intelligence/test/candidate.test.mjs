import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROMOTED_STATUSES,
  buildSourceCandidate,
  isConsumable,
  upsertCandidate,
  validateCandidate
} from '../lib/source-candidate.mjs';
import { loadContext } from '../lib/pipeline.mjs';
import { NOW, policy, scores, signal, thesis } from './helpers.mjs';

const context = await loadContext({ policy });
const build = (signals, overrides = {}) =>
  buildSourceCandidate(thesis(overrides), signals, context.inventory, { ...context, policy, now: NOW });

const demand = () => signal({ signal_id: 'c-demand', source_family: 'search_demand', evidence_buckets: ['DEMAND_SIGNAL'] });
const pain = () => signal({ signal_id: 'c-pain', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'] });
const money = () => signal({ signal_id: 'c-money', source_family: 'competitor_pricing', evidence_buckets: ['MONEY_SIGNAL'] });

test('DEMAND + PAIN promotes only when the score and the asset fit both pass', () => {
  const strong = build([demand(), pain()], { scores: scores(9) });
  assert.equal(strong.corroboration_satisfied, true);
  assert.deepEqual(strong.corroboration_buckets, ['DEMAND_SIGNAL', 'PAIN_SIGNAL']);
  assert.ok(PROMOTED_STATUSES.includes(strong.status), `expected promotion, got ${strong.status}`);
  assert.ok(strong.asset_id);

  // Same evidence, a thesis that scores badly: corroboration alone never promotes.
  const weakScore = build([demand(), pain()], { thesis_id: 'weak-score', scores: scores(3) });
  assert.equal(weakScore.corroboration_satisfied, true);
  assert.equal(PROMOTED_STATUSES.includes(weakScore.status), false);

  // Same evidence, a thesis nothing in the inventory serves: the fit gate holds.
  const noFit = build([demand(), pain()], {
    thesis_id: 'no-fit',
    scores: scores(9),
    problem_keys: ['deep_sea_cable_maintenance_scheduling'],
    target_audience: ['submarine_cable_engineer'],
    language: 'is'
  });
  assert.equal(PROMOTED_STATUSES.includes(noFit.status), false);
  assert.equal(noFit.product_created, false);
});

test('HIGH_PRIORITY needs all three buckets as well as the top score band', () => {
  const twoBuckets = build([demand(), pain()], { thesis_id: 'two-bucket', scores: scores(10) });
  const threeBuckets = build([demand(), pain(), money()], { thesis_id: 'three-bucket', scores: scores(10) });

  assert.equal(twoBuckets.status, 'SOURCE_CANDIDATE',
    'the top band must be capped at SOURCE_CANDIDATE while only two buckets are covered');
  assert.equal(threeBuckets.status, 'HIGH_PRIORITY_SOURCE_CANDIDATE');
  assert.deepEqual(threeBuckets.corroboration_buckets, ['DEMAND_SIGNAL', 'PAIN_SIGNAL', 'MONEY_SIGNAL']);
});

test('owned MONEY evidence raises the score without inventing external consensus', () => {
  const ownedMoney = signal({ signal_id: 'c-owned-money', source_family: 'owned_behavior', evidence_buckets: ['MONEY_SIGNAL'] });
  const withoutMoney = build([demand(), pain()], { thesis_id: 'no-money', scores: scores(8) });
  const withOwnedMoney = build([demand(), pain(), ownedMoney], { thesis_id: 'owned-money', scores: scores(8) });

  assert.ok(withOwnedMoney.revenue_signal_score > withoutMoney.revenue_signal_score,
    'more independent corroboration must raise the score');
  assert.equal(withOwnedMoney.external_consensus, false);
  assert.match(withOwnedMoney.money_evidence_note, /must not be described as external market consensus/);
  assert.ok(withOwnedMoney.prohibited_claims.some((c) => c.claim_pattern === 'EXTERNAL_CONSENSUS'));
});

test('a single weak signal produces a research gap, never a candidate', () => {
  const lonely = build([signal({ signal_id: 'c-lonely', source_family: 'trend_evidence' })], { scores: scores(9) });
  assert.equal(lonely.corroboration_satisfied, false);
  assert.equal(lonely.promoted, false);
  assert.equal(lonely.status, 'RESEARCH_GAP');
});

test('the handoff record carries provenance and prohibited claims', () => {
  const candidate = build([demand(), pain(), money()], { scores: scores(9) });
  for (const field of [
    'source_candidate_id', 'thesis', 'supporting_signal_ids', 'corroboration_families',
    'corroboration_buckets', 'revenue_signal_score', 'evidence_strength', 'best_existing_asset',
    'asset_fit_score', 'eligible_audiences', 'eligible_lenses', 'existing_product_routes',
    'primary_cta', 'prohibited_claims', 'freshness', 'expiry', 'status'
  ]) {
    assert.ok(candidate[field] !== undefined, `handoff record is missing ${field}`);
  }
  assert.deepEqual(candidate.supporting_signal_ids.sort(), ['c-demand', 'c-money', 'c-pain']);
  assert.ok(candidate.prohibited_claims.length > 0);
  assert.ok(candidate.prohibited_claims.some((c) => c.claim_pattern === 'VERIFIED_REVENUE_FROM_THIS_THESIS'));
  assert.equal(candidate.existing_product_routes[0].role, 'PRIMARY');
  assert.match(candidate.handoff.consumer, /Issue #52/);
});

test('a promoted candidate always names a verified destination and two supporting signals', () => {
  const candidate = build([demand(), pain(), money()], { scores: scores(9) });
  assert.deepEqual(validateCandidate(candidate), []);
  assert.ok(candidate.destination_url.startsWith('https://'));
  assert.ok(candidate.supporting_signal_ids.length >= 2);
});

test('a forged candidate record is rejected by validation', () => {
  const candidate = build([demand(), pain(), money()], { scores: scores(9) });
  assert.ok(validateCandidate({ ...candidate, promoted: true, status: 'WATCH' })
    .some((e) => e.includes('is not a promoted status')));
  assert.ok(validateCandidate({ ...candidate, supporting_signal_ids: ['only-one'] })
    .some((e) => e.includes('at least two supporting signal ids')));
  assert.ok(validateCandidate({ ...candidate, product_created: true })
    .some((e) => e.includes('never creates a product')));
});

test('candidates expire, and an expired candidate is not consumable', () => {
  const candidate = build([demand(), pain(), money()], { scores: scores(9) });
  assert.equal(isConsumable(candidate, NOW).ok, true);
  const ttlDays = policy.freshness.candidate_ttl_days;
  assert.equal(isConsumable(candidate, NOW + (ttlDays + 1) * 86400000).ok, false);
  assert.equal(isConsumable({ ...candidate, status: 'WATCH' }, NOW).ok, false);
});

test('the candidate store keeps an append-only status history', () => {
  const first = build([demand(), pain(), money()], { scores: scores(9) });
  let store = upsertCandidate({ candidates: [] }, first);
  assert.equal(store.candidates[0].history.length, 1);

  const downgraded = { ...first, status: 'WATCH', promoted: false, generated_at: '2026-09-01T00:00:00Z' };
  store = upsertCandidate(store, downgraded);
  assert.equal(store.candidates.length, 1, 'one candidate, not two');
  assert.equal(store.candidates[0].history.length, 2);
  assert.deepEqual(store.candidates[0].history[1], {
    at: '2026-09-01T00:00:00Z',
    from_status: first.status,
    to_status: 'WATCH'
  });
});

test('score, corroboration and fit are all required - none of them is sufficient alone', () => {
  const cases = [
    { label: 'corroboration only', signals: [demand(), pain()], overrides: { thesis_id: 'a', scores: scores(2) } },
    { label: 'score only', signals: [demand()], overrides: { thesis_id: 'b', scores: scores(10) } },
    {
      label: 'score and corroboration but no asset',
      signals: [demand(), pain()],
      overrides: {
        thesis_id: 'c',
        scores: scores(10),
        problem_keys: ['deep_sea_cable_maintenance_scheduling'],
        target_audience: ['submarine_cable_engineer'],
        language: 'is'
      }
    }
  ];
  for (const { label, signals, overrides } of cases) {
    const candidate = build(signals, overrides);
    assert.equal(candidate.promoted, false, `${label} must not promote on its own`);
  }
});
