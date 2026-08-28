// Issue #53 - the three-bucket evidence model.
//
// DEMAND_SIGNAL  people are actively searching, comparing or discussing
// PAIN_SIGNAL    people describe a concrete problem, risk, friction or desired outcome
// MONEY_SIGNAL   purchase, checkout, pricing, budget, paid alternatives, commercial intent
//
// Bucket coverage is an eligibility ceiling. It never promotes anything on its own.

export const EVIDENCE_BUCKETS = Object.freeze(['DEMAND_SIGNAL', 'PAIN_SIGNAL', 'MONEY_SIGNAL']);

export function validateBuckets(buckets, label = 'record') {
  const errors = [];
  if (!Array.isArray(buckets)) return [`${label}: evidence_buckets must be an array`];
  if (!buckets.length) errors.push(`${label}: evidence_buckets must name at least one bucket`);
  for (const bucket of buckets) {
    if (!EVIDENCE_BUCKETS.includes(bucket)) {
      errors.push(`${label}: unknown evidence bucket ${bucket}`);
    }
  }
  return errors;
}

/**
 * Bucket coverage across a set of signals.
 * Only the classes named in `classes` contribute; by default that is OBSERVED alone,
 * so an assumption can never widen bucket coverage.
 */
export function coverage(signals, { classes = ['OBSERVED'], includeExpired = false } = {}) {
  const counted = new Set();
  const byBucket = Object.fromEntries(EVIDENCE_BUCKETS.map((b) => [b, []]));
  for (const signal of signals || []) {
    if (!classes.includes(signal.evidence_class)) continue;
    if (!includeExpired && signal.freshness?.state === 'EXPIRED') continue;
    for (const bucket of signal.evidence_buckets || []) {
      if (!EVIDENCE_BUCKETS.includes(bucket)) continue;
      counted.add(bucket);
      byBucket[bucket].push(signal.signal_id);
    }
  }
  return { buckets: EVIDENCE_BUCKETS.filter((b) => counted.has(b)), count: counted.size, by_bucket: byBucket };
}

/**
 * The eligibility ceiling this bucket coverage allows.
 * WATCH -> SOURCE_CANDIDATE_ELIGIBLE -> HIGH_PRIORITY_ELIGIBLE.
 */
export function eligibilityCeiling(bucketCount, policy) {
  const rules = policy?.buckets || {};
  if (bucketCount >= 3) return rules.three_buckets || 'HIGH_PRIORITY_ELIGIBLE';
  if (bucketCount === 2) return rules.two_buckets || 'SOURCE_CANDIDATE_ELIGIBLE';
  return rules.one_bucket || 'WATCH';
}

/**
 * MONEY evidence produced by the operator's own funnel is strong evidence of internal
 * fit and no evidence at all of external consensus. This helper keeps that distinction
 * explicit wherever owned money evidence is used.
 */
export function moneyEvidenceProfile(signals) {
  const money = (signals || []).filter((s) => (s.evidence_buckets || []).includes('MONEY_SIGNAL'));
  const owned = money.filter((s) => s.external !== true);
  const external = money.filter((s) => s.external === true);
  return {
    money_signals: money.map((s) => s.signal_id),
    owned_money_signals: owned.map((s) => s.signal_id),
    external_money_signals: external.map((s) => s.signal_id),
    // Never true from owned behaviour alone. This flag is read by revenue-score.mjs
    // and reproduced verbatim in the candidate record.
    external_consensus: external.length > 0,
    note: owned.length && !external.length
      ? 'Owned commercial behaviour only. This demonstrates internal fit and must not be described as external market consensus.'
      : external.length
        ? 'At least one external money signal is present.'
        : 'No money evidence.'
  };
}
