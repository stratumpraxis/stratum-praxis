// Shared builders for the signal-intelligence tests.
//
// Every test that needs evidence builds it here rather than reading the shipped
// signals.json, so a change to the real evidence set can never quietly make a rule
// look like it passed.

import { loadPolicy, normalizeSignal } from '../lib/normalize.mjs';

export const NOW = Date.parse('2026-08-28T00:00:00Z');
export const policy = await loadPolicy();

const DAY = 86400000;

let counter = 0;

/** Build one normalized evidence record. */
export function signal(overrides = {}) {
  counter += 1;
  const base = {
    signal_id: overrides.signal_id || `probe-signal-${counter}`,
    thesis_ids: ['probe-thesis'],
    source_family: 'search_demand',
    evidence_buckets: ['DEMAND_SIGNAL'],
    provider: 'repository_records',
    observed_at: new Date(NOW - DAY).toISOString(),
    url_or_reference: `https://example.test/${overrides.signal_id || `probe-${counter}`}`,
    topic: 'probe topic',
    observation_summary: `probe observation ${counter} with enough distinct wording that the shingle comparison does not treat it as a mirror of any other record`,
    evidence_class: 'OBSERVED',
    ...overrides
  };
  return normalizeSignal(base, { policy, now: NOW });
}

/** Two records that are honest mirrors of one original: same declared origin. */
export function mirrorPair(originKey = 'one-original-article') {
  return [
    signal({
      signal_id: 'original-article',
      source_family: 'search_demand',
      shared_origin_key: originKey,
      url_or_reference: 'https://origin.test/article',
      observation_summary: 'the original article reports that renewal budgets are being reviewed quarterly across mid-market teams this year'
    }),
    signal({
      signal_id: 'syndicated-repost',
      source_family: 'community_pain',
      evidence_buckets: ['PAIN_SIGNAL'],
      shared_origin_key: originKey,
      url_or_reference: 'https://mirror.test/reposted-article',
      observation_summary: 'a repost of the same article on a different site, reworded slightly but describing the identical underlying finding'
    })
  ];
}

/** A full 16-dimension score input at one uniform score and evidence class. */
export function scores(score = 8, evidence = 'OBSERVED', overrides = {}) {
  const names = [
    'purchase_intent', 'pain_severity', 'urgency', 'demand_growth',
    'evidence_independence', 'evidence_quality', 'existing_product_fit',
    'audience_fit', 'content_lens_fit', 'margin_fit', 'differentiation',
    'freshness', 'automation_feasibility', 'measurement_quality',
    'operational_burden', 'safety'
  ];
  const out = Object.fromEntries(names.map((n) => [n, { score, evidence }]));
  return { ...out, ...overrides };
}

/** A thesis that routes cleanly onto the live AI/SaaS spend funnel. */
export function thesis(overrides = {}) {
  return {
    thesis_id: 'probe-thesis',
    thesis: 'probe thesis',
    problem_keys: ['shadow_ai', 'ai_saas_spend', 'cost_visibility'],
    target_audience: ['finance', 'ops_lead', 'smb_owner'],
    language: 'en',
    scores: scores(8),
    ...overrides
  };
}
