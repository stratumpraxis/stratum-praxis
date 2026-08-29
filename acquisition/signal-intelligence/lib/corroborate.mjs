// Issue #53 - independent corroboration and the 2-Signal Rule.
//
// The rule: a market thesis becomes automatically eligible only when at least two
// OBSERVED, non-expired, mutually independent signals support it, drawn from at least
// two different independence groups, at least one of which is external.
//
// Independence is refused when two signals:
//   - share an origin key (a declared repost, or the same canonical reference), or
//   - are textual near-duplicates above the policy threshold (an undeclared repost), or
//   - sit in the same independence group (Google Trends + YouTube trends on one event).
//
// ASSUMPTION and HYPOTHESIS records are carried through the whole pipeline and reported,
// because they legitimately raise research priority. They never enter this calculation.

import { coverage, eligibilityCeiling, moneyEvidenceProfile } from './bucket.mjs';
import { textSimilarity } from './fingerprint.mjs';
import { isIndependentDemandEvidence, isSocialFamily, reasonNotIndependent } from './social-evidence.mjs';

/** Pairwise independence test between two normalized signals. */
export function independencePair(a, b, { mirrorThreshold = 0.8 } = {}) {
  if (a.fingerprint === b.fingerprint) {
    return { independent: false, reason: 'DUPLICATE_FINGERPRINT', detail: 'identical evidence record' };
  }
  if (a.origin_key === b.origin_key) {
    return {
      independent: false,
      reason: 'SHARED_ORIGIN',
      detail: `both records resolve to origin ${a.origin_key}; a mirror or repost of one original is one signal`
    };
  }
  const similarity = textSimilarity(a.observation_summary, b.observation_summary);
  if (similarity >= mirrorThreshold) {
    return {
      independent: false,
      reason: 'NEAR_DUPLICATE_TEXT',
      detail: `observation summaries are ${(similarity * 100).toFixed(0)}% similar, at or above the ${(mirrorThreshold * 100).toFixed(0)}% mirror threshold`,
      similarity: Number(similarity.toFixed(4))
    };
  }
  if (a.independence_group === b.independence_group) {
    return {
      independent: false,
      reason: 'SAME_INDEPENDENCE_GROUP',
      detail: `both records sit in the ${a.independence_group} independence group; this is weak corroboration by policy`
    };
  }
  return { independent: true, reason: 'INDEPENDENT', similarity: Number(similarity.toFixed(4)) };
}

/**
 * Greedy maximal independent set over the observed, fresh signals.
 * Deterministic: signals are considered strongest-tier-first, then by id, so the same
 * input always produces the same corroboration set.
 */
export function independentSet(signals, options = {}) {
  const ordered = [...signals].sort((a, b) =>
    (a.tier ?? 99) - (b.tier ?? 99) || a.signal_id.localeCompare(b.signal_id));
  const chosen = [];
  const excluded = [];
  for (const candidate of ordered) {
    let blockedBy = null;
    for (const kept of chosen) {
      const verdict = independencePair(kept, candidate, options);
      if (!verdict.independent) {
        blockedBy = { signal_id: candidate.signal_id, conflicts_with: kept.signal_id, ...verdict };
        break;
      }
    }
    if (blockedBy) excluded.push(blockedBy);
    else chosen.push(candidate);
  }
  return { chosen, excluded };
}

/**
 * Run the full corroboration assessment for one thesis.
 *
 * @param {Array}  signals normalized evidence records supporting the thesis
 * @param {object} policy  acquisition/signal-intelligence/policy.json
 */
export function corroborate(signals, policy) {
  const rules = policy?.corroboration || {};
  const minSignals = rules.min_observed_signals ?? 2;
  const minGroups = rules.min_independence_groups ?? 2;
  const minExternal = rules.min_external_observed_signals ?? 1;
  const mirrorThreshold = rules.mirror_similarity_threshold ?? 0.8;

  const all = signals || [];
  const observed = all.filter((s) => s.evidence_class === 'OBSERVED');
  const fresh = observed.filter((s) => s.freshness?.state !== 'EXPIRED');
  const expired = observed.filter((s) => s.freshness?.state === 'EXPIRED');
  const nonObserved = all.filter((s) => s.evidence_class !== 'OBSERVED');

  // A promotional, affiliate, quote-echo or duplicated post is recorded evidence that
  // somebody said something. It is never evidence that a buyer wants something, so it
  // is removed before the independent set is built rather than competing inside it.
  const eligible = fresh.filter((s) => isIndependentDemandEvidence(s));
  const nonIndependentSource = fresh
    .filter((s) => !isIndependentDemandEvidence(s))
    .map((s) => ({
      signal_id: s.signal_id,
      source_family: s.source_family,
      post_type: s.content_integrity?.post_type ?? 'UNKNOWN',
      reason: 'NOT_INDEPENDENT_DEMAND_EVIDENCE',
      detail: s.content_integrity?.non_independence_reason
        || reasonNotIndependent(s.content_integrity?.post_type)
        || 'the record does not declare itself as independent demand evidence'
    }));

  const { chosen, excluded } = independentSet(eligible, { mirrorThreshold });
  const groups = [...new Set(chosen.map((s) => s.independence_group))].sort();
  const families = [...new Set(chosen.map((s) => s.source_family))].sort();
  const externalCount = chosen.filter((s) => s.external === true).length;

  const failures = [];
  if (chosen.length < minSignals) {
    failures.push(`only ${chosen.length} independent OBSERVED signal(s); the 2-Signal Rule requires ${minSignals}`);
  }
  if (groups.length < minGroups) {
    failures.push(`independent signals span ${groups.length} independence group(s); ${minGroups} are required so one event cannot corroborate itself`);
  }
  if (externalCount < minExternal) {
    failures.push(`no external independent OBSERVED signal; owned behaviour alone cannot establish external demand`);
  }

  const bucketCoverage = coverage(chosen);
  const money = moneyEvidenceProfile(chosen);

  const strength = failures.length
    ? 'INSUFFICIENT'
    : groups.length >= 3 || bucketCoverage.count >= 3
      ? 'STRONG'
      : 'ADEQUATE';

  return {
    satisfied: failures.length === 0,
    strength,
    failures,
    corroborating_signal_ids: chosen.map((s) => s.signal_id),
    corroboration_families: families,
    corroboration_groups: groups,
    corroboration_buckets: bucketCoverage.buckets,
    bucket_coverage: bucketCoverage,
    eligibility_ceiling: eligibilityCeiling(bucketCoverage.count, policy),
    external_observed_count: externalCount,
    money_evidence: money,
    excluded_as_dependent: excluded,
    excluded_as_non_independent_source: nonIndependentSource,
    social_evidence_present: chosen.some((s) => isSocialFamily(s.source_family)),
    expired_signal_ids: expired.map((s) => s.signal_id),
    non_observed: nonObserved.map((s) => ({
      signal_id: s.signal_id,
      evidence_class: s.evidence_class,
      effect: 'raises research priority only; excluded from the 2-Signal Rule'
    })),
    counted_signal_count: chosen.length
  };
}

/**
 * Group evidence records by the theses they support.
 * One observation may legitimately support more than one thesis, so `thesis_ids` is a
 * list. It still counts once per thesis, never twice within one.
 */
export function groupByThesis(signals) {
  const map = new Map();
  for (const signal of signals) {
    for (const key of signal.thesis_ids || []) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(signal);
    }
  }
  return map;
}
