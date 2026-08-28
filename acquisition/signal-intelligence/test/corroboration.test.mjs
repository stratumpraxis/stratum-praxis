import test from 'node:test';
import assert from 'node:assert/strict';

import { corroborate, independencePair, independentSet } from '../lib/corroborate.mjs';
import { coverage, eligibilityCeiling, moneyEvidenceProfile } from '../lib/bucket.mjs';
import { ingest, validateSignal } from '../lib/normalize.mjs';
import { loadProviders } from '../lib/normalize.mjs';
import { NOW, mirrorPair, policy, signal } from './helpers.mjs';

test('one signal alone can never satisfy the 2-Signal Rule', () => {
  const result = corroborate([signal({ signal_id: 'lonely-trend', source_family: 'trend_evidence' })], policy);
  assert.equal(result.satisfied, false);
  assert.equal(result.strength, 'INSUFFICIENT');
  assert.ok(result.failures.some((f) => f.includes('the 2-Signal Rule requires 2')));
});

test('two members of the same independence group are weak corroboration', () => {
  // Google Trends + YouTube trends on one event: both live in the trends group.
  const result = corroborate([
    signal({ signal_id: 'google-trends-probe', source_family: 'trend_evidence' }),
    signal({ signal_id: 'youtube-trends-probe', source_family: 'question_demand' })
  ], policy);
  assert.equal(result.satisfied, false);
  assert.equal(result.counted_signal_count, 1);
  assert.equal(result.excluded_as_dependent[0].reason, 'SAME_INDEPENDENCE_GROUP');
});

test('a declared mirror of one original cannot count twice', () => {
  const result = corroborate(mirrorPair(), policy);
  assert.equal(result.counted_signal_count, 1, 'a repost of one article is one signal');
  assert.equal(result.excluded_as_dependent[0].reason, 'SHARED_ORIGIN');
  assert.equal(result.satisfied, false);
});

test('an undeclared repost is still caught by near-duplicate text', () => {
  const body = 'mid-market finance teams report that unbudgeted artificial intelligence charges are now reviewed on a quarterly cadence before renewal decisions are signed off by the finance lead';
  const a = signal({
    signal_id: 'source-post',
    source_family: 'community_pain',
    evidence_buckets: ['PAIN_SIGNAL'],
    url_or_reference: 'https://a.test/post',
    observation_summary: body
  });
  const b = signal({
    signal_id: 'copied-post',
    source_family: 'review_signal',
    evidence_buckets: ['PAIN_SIGNAL'],
    url_or_reference: 'https://b.test/post',
    observation_summary: body
  });
  const verdict = independencePair(a, b, { mirrorThreshold: policy.corroboration.mirror_similarity_threshold });
  assert.equal(verdict.independent, false);
  assert.equal(verdict.reason, 'NEAR_DUPLICATE_TEXT');
});

test('ASSUMPTION and HYPOTHESIS records never satisfy the rule but are still reported', () => {
  const result = corroborate([
    signal({ signal_id: 'observed-one', source_family: 'search_demand' }),
    signal({ signal_id: 'assumed-one', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'], evidence_class: 'ASSUMPTION' }),
    signal({ signal_id: 'guessed-one', source_family: 'review_signal', evidence_buckets: ['PAIN_SIGNAL'], evidence_class: 'HYPOTHESIS' })
  ], policy);

  assert.equal(result.counted_signal_count, 1);
  assert.equal(result.satisfied, false);
  assert.deepEqual(result.non_observed.map((n) => n.signal_id).sort(), ['assumed-one', 'guessed-one']);
  for (const entry of result.non_observed) {
    assert.match(entry.effect, /excluded from the 2-Signal Rule/);
  }
});

test('two independent external OBSERVED signals in different families satisfy the rule', () => {
  const result = corroborate([
    signal({ signal_id: 'search-demand-probe', source_family: 'search_demand', evidence_buckets: ['DEMAND_SIGNAL'] }),
    signal({ signal_id: 'community-pain-probe', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'] })
  ], policy);
  assert.equal(result.satisfied, true);
  assert.deepEqual(result.corroboration_buckets, ['DEMAND_SIGNAL', 'PAIN_SIGNAL']);
  assert.equal(eligibilityCeiling(result.bucket_coverage.count, policy), 'SOURCE_CANDIDATE_ELIGIBLE');
});

test('owned behaviour alone cannot establish external demand', () => {
  const result = corroborate([
    signal({ signal_id: 'owned-cta', source_family: 'owned_behavior', evidence_buckets: ['MONEY_SIGNAL'] }),
    signal({ signal_id: 'owner-note', source_family: 'editorial_source', evidence_buckets: ['DEMAND_SIGNAL'] })
  ], policy);
  assert.equal(result.satisfied, false);
  assert.ok(result.failures.some((f) => f.includes('no external independent OBSERVED signal')));
});

test('owned money evidence never claims external consensus', () => {
  const owned = [signal({ signal_id: 'owned-checkout', source_family: 'owned_behavior', evidence_buckets: ['MONEY_SIGNAL'] })];
  const profile = moneyEvidenceProfile(owned);
  assert.equal(profile.external_consensus, false);
  assert.match(profile.note, /must not be described as external market consensus/);
  assert.deepEqual(profile.external_money_signals, []);
});

test('a stale signal expires and cannot corroborate', () => {
  const stale = signal({
    signal_id: 'stale-trend',
    source_family: 'trend_evidence',   // 30-day TTL
    observed_at: new Date(NOW - 200 * 86400000).toISOString()
  });
  assert.equal(stale.freshness.state, 'EXPIRED');

  const result = corroborate([
    stale,
    signal({ signal_id: 'fresh-pain', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'] })
  ], policy);
  assert.deepEqual(result.expired_signal_ids, ['stale-trend']);
  assert.equal(result.counted_signal_count, 1);
  assert.equal(result.satisfied, false);
});

test('bucket coverage ignores expired and non-observed records', () => {
  const signals = [
    signal({ signal_id: 'money-fresh', source_family: 'competitor_pricing', evidence_buckets: ['MONEY_SIGNAL'] }),
    signal({ signal_id: 'pain-assumed', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'], evidence_class: 'ASSUMPTION' })
  ];
  assert.deepEqual(coverage(signals).buckets, ['MONEY_SIGNAL']);
});

test('ingesting the same observation twice is idempotent', () => {
  const record = {
    signal_id: 'repeat-ingest',
    thesis_ids: ['probe-thesis'],
    source_family: 'search_demand',
    evidence_buckets: ['DEMAND_SIGNAL'],
    provider: 'repository_records',
    observed_at: '2026-08-27T00:00:00Z',
    url_or_reference: 'revenue-os/metrics.json#probe',
    topic: 'probe',
    observation_summary: 'the identical observation submitted twice under two different ids',
    evidence_class: 'OBSERVED'
  };
  const result = ingest([record, { ...record, signal_id: 'repeat-ingest-again' }], { policy, now: NOW });
  assert.equal(result.accepted.length, 1);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].duplicate_of, 'repeat-ingest');
});

test('a CONTRACT_ONLY provider may not supply OBSERVED evidence', async () => {
  const providers = await loadProviders();
  assert.equal(providers.providers.reddit.connection_state, 'CONTRACT_ONLY');
  const errors = validateSignal({
    signal_id: 'reddit-claim',
    thesis_ids: ['probe-thesis'],
    source_family: 'community_pain',
    evidence_buckets: ['PAIN_SIGNAL'],
    provider: 'reddit',
    observed_at: '2026-08-28T00:00:00Z',
    url_or_reference: 'https://reddit.test/r/probe',
    topic: 'probe',
    observation_summary: 'a claimed observation from a provider this repository has no connection to',
    evidence_class: 'OBSERVED'
  }, { policy, providers });
  assert.ok(errors.some((e) => e.includes('is CONTRACT_ONLY')));
});

test('OBSERVED evidence must say where it was read', () => {
  const errors = validateSignal({
    signal_id: 'unsourced',
    thesis_ids: ['probe-thesis'],
    source_family: 'search_demand',
    evidence_buckets: ['DEMAND_SIGNAL'],
    provider: 'repository_records',
    observed_at: '2026-08-28T00:00:00Z',
    url_or_reference: '',
    topic: 'probe',
    observation_summary: 'an observation with no reference at all',
    evidence_class: 'OBSERVED'
  }, { policy });
  assert.ok(errors.some((e) => e.includes('requires url_or_reference')));
});

test('the independent set is deterministic regardless of input order', () => {
  const signals = [
    signal({ signal_id: 'a-search', source_family: 'search_demand' }),
    signal({ signal_id: 'b-pain', source_family: 'community_pain', evidence_buckets: ['PAIN_SIGNAL'] }),
    signal({ signal_id: 'c-owned', source_family: 'owned_behavior', evidence_buckets: ['MONEY_SIGNAL'] })
  ];
  const forward = independentSet(signals).chosen.map((s) => s.signal_id);
  const backward = independentSet([...signals].reverse()).chosen.map((s) => s.signal_id);
  assert.deepEqual(forward, backward);
});
