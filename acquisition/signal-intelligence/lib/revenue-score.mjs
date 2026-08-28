// Issue #53 - the Revenue Signal Score.
//
// This extends the existing transparent model in acquisition/lib/signal-score.mjs
// rather than competing with it. Same shape: named dimensions, integer 0-10 scores,
// fixed weights, an evidence class on every dimension, and a full breakdown so a human
// can audit each contribution. The differences are that this model scores a *market
// thesis* rather than a distribution unit, reports on 0-100, and refuses to let the
// evidence-quality dimensions be self-asserted.
//
// Four dimensions are DERIVED from measured facts and overwrite whatever was supplied:
//   evidence_independence  from the corroboration result
//   evidence_quality       from tier and evidence class of the counted signals
//   freshness              from the age of the counted signals
//   existing_product_fit   from the asset-fit gate
// That is what stops a thesis from scoring its own homework.

import { EVIDENCE_CLASSES } from '../../lib/taxonomy.mjs';
import { isPlainObject } from '../../lib/util.mjs';

export const DIMENSIONS = Object.freeze({
  purchase_intent: 4,
  pain_severity: 3,
  urgency: 2,
  demand_growth: 2,
  evidence_independence: 3,
  evidence_quality: 3,
  existing_product_fit: 4,
  audience_fit: 3,
  content_lens_fit: 2,
  margin_fit: 1,
  differentiation: 2,
  freshness: 2,
  automation_feasibility: 1,
  measurement_quality: 3,
  operational_burden: 2,
  safety: 4
});

export const DERIVED_DIMENSIONS = Object.freeze([
  'evidence_independence',
  'evidence_quality',
  'freshness',
  'existing_product_fit'
]);

export const MAX_DIMENSION_SCORE = 10;
export const TOTAL_WEIGHT = Object.values(DIMENSIONS).reduce((sum, w) => sum + w, 0);
export const MAX_RAW = TOTAL_WEIGHT * MAX_DIMENSION_SCORE;

const EVIDENCE_MULTIPLIER = Object.freeze({ OBSERVED: 1, ASSUMPTION: 0.5, HYPOTHESIS: 0 });

function readDimension(input, name) {
  const raw = input?.[name];
  if (typeof raw === 'number') {
    return { score: raw, evidence: 'HYPOTHESIS', note: 'no evidence class supplied' };
  }
  if (!isPlainObject(raw)) return null;
  return { score: raw.score, evidence: raw.evidence, note: typeof raw.note === 'string' ? raw.note : '' };
}

export function validateScoreInput(scores) {
  if (!isPlainObject(scores)) return ['scores must be an object'];
  const errors = [];
  for (const name of Object.keys(DIMENSIONS)) {
    const dim = readDimension(scores, name);
    if (!dim) {
      errors.push(`${name}: missing dimension`);
      continue;
    }
    if (!Number.isInteger(dim.score) || dim.score < 0 || dim.score > MAX_DIMENSION_SCORE) {
      errors.push(`${name}: score must be an integer 0-${MAX_DIMENSION_SCORE}`);
    }
    if (!EVIDENCE_CLASSES.includes(dim.evidence)) {
      errors.push(`${name}: evidence must be one of ${EVIDENCE_CLASSES.join(', ')}`);
    }
  }
  for (const key of Object.keys(scores)) {
    if (!(key in DIMENSIONS)) errors.push(`${key}: unknown scoring dimension`);
  }
  return errors;
}

function clamp10(value) {
  return Math.max(0, Math.min(MAX_DIMENSION_SCORE, Math.round(value)));
}

/** Independence, read off the corroboration result rather than asserted. */
export function deriveIndependence(corroboration) {
  if (!corroboration) return null;
  const counted = corroboration.counted_signal_count ?? 0;
  const groups = (corroboration.corroboration_groups || []).length;
  const external = corroboration.external_observed_count ?? 0;
  if (counted === 0) return { score: 0, evidence: 'OBSERVED', note: 'no independent OBSERVED signal' };
  const score = clamp10((counted >= 3 ? 5 : counted * 2) + groups * 1.5 + (external > 0 ? 2 : 0));
  return {
    score,
    evidence: 'OBSERVED',
    note: `${counted} independent OBSERVED signal(s) across ${groups} independence group(s), ${external} external`
  };
}

/** Evidence quality, read off the tier and class mix of the counted signals. */
export function deriveEvidenceQuality(corroboration, signals) {
  if (!corroboration) return null;
  const counted = new Set(corroboration.corroborating_signal_ids || []);
  const used = (signals || []).filter((s) => counted.has(s.signal_id));
  if (!used.length) return { score: 0, evidence: 'OBSERVED', note: 'no counted evidence' };
  // Tier 1 evidence is closest to real commercial behaviour; tier 4 is furthest.
  const tierScore = used.reduce((sum, s) => sum + (5 - Math.min(4, s.tier ?? 4)) * 2.5, 0) / used.length;
  const referenced = used.filter((s) => String(s.url_or_reference || '').trim()).length / used.length;
  return {
    score: clamp10(tierScore * 0.8 + referenced * 2),
    evidence: 'OBSERVED',
    note: `${used.length} counted signal(s), mean tier ${(used.reduce((s, x) => s + (x.tier ?? 4), 0) / used.length).toFixed(1)}, ${(referenced * 100).toFixed(0)}% carry a reference`
  };
}

/** Freshness, read off the age of the counted signals against their own TTLs. */
export function deriveFreshness(corroboration, signals) {
  if (!corroboration) return null;
  const counted = new Set(corroboration.corroborating_signal_ids || []);
  const used = (signals || []).filter((s) => counted.has(s.signal_id) && s.freshness?.age_days !== null);
  if (!used.length) return { score: 0, evidence: 'OBSERVED', note: 'no dated evidence; decay risk cannot be judged' };
  const remaining = used.map((s) => {
    const ttl = s.freshness.ttl_days || 1;
    return Math.max(0, 1 - (s.freshness.age_days || 0) / ttl);
  });
  const mean = remaining.reduce((a, b) => a + b, 0) / remaining.length;
  return {
    score: clamp10(mean * 10),
    evidence: 'OBSERVED',
    note: `mean ${(mean * 100).toFixed(0)}% of the evidence TTL remains`
  };
}

/** Existing-product fit, read off the asset-fit gate rather than asserted. */
export function deriveProductFit(assetFit) {
  if (!assetFit) return null;
  if (!assetFit.fits) {
    return {
      score: 0,
      evidence: 'OBSERVED',
      note: `no verified existing asset cleared the fit floor (${assetFit.outcome})`
    };
  }
  return {
    score: clamp10((assetFit.asset_fit_score ?? 0) * 10),
    evidence: assetFit.verification_state === 'HTTP_VERIFIED' ? 'OBSERVED' : 'ASSUMPTION',
    note: `${assetFit.best_existing_asset} at fit ${assetFit.asset_fit_score}, verification ${assetFit.verification_state}`
  };
}

/**
 * Score a market thesis on 0-100.
 *
 * `raw_score` is the plain weighted score. `score` is the evidence-adjusted score,
 * where each dimension's contribution is multiplied by its evidence class. The bands
 * are read off `score`, so an unobserved thesis cannot band its way into promotion.
 */
export function scoreRevenueSignal(scores, { policy, corroboration = null, signals = [], assetFit = null } = {}) {
  const derived = {};
  if (corroboration) {
    derived.evidence_independence = deriveIndependence(corroboration);
    derived.evidence_quality = deriveEvidenceQuality(corroboration, signals);
    derived.freshness = deriveFreshness(corroboration, signals);
  }
  if (assetFit) derived.existing_product_fit = deriveProductFit(assetFit);

  const merged = { ...scores };
  const overridden = [];
  for (const [name, value] of Object.entries(derived)) {
    if (!value) continue;
    if (merged[name] !== undefined) overridden.push(name);
    merged[name] = value;
  }

  const errors = validateScoreInput(merged);
  if (errors.length) {
    const error = new Error(`revenue signal scores are invalid (${errors.length} problem(s))`);
    error.errors = errors;
    throw error;
  }

  const breakdown = {};
  let raw = 0;
  let adjusted = 0;
  let observedWeight = 0;
  const byClass = { OBSERVED: [], ASSUMPTION: [], HYPOTHESIS: [] };

  for (const [name, weight] of Object.entries(DIMENSIONS)) {
    const dim = readDimension(merged, name);
    const contribution = dim.score * weight;
    const multiplier = EVIDENCE_MULTIPLIER[dim.evidence];
    raw += contribution;
    adjusted += contribution * multiplier;
    if (dim.evidence === 'OBSERVED') observedWeight += weight;
    byClass[dim.evidence].push(name);
    breakdown[name] = {
      score: dim.score,
      weight,
      contribution,
      evidence: dim.evidence,
      evidence_multiplier: multiplier,
      adjusted_contribution: Number((contribution * multiplier).toFixed(2)),
      derived: DERIVED_DIMENSIONS.includes(name) && Boolean(derived[name]),
      note: dim.note
    };
  }

  const gates = policy?.gates || {};
  const safetyFloor = gates.safety_floor ?? 7;
  const measurementFloor = gates.measurement_floor ?? 4;

  const blocks = [];
  if (breakdown.safety.score < safetyFloor) {
    blocks.push(`safety score ${breakdown.safety.score} is below the floor of ${safetyFloor}`);
  }
  if (breakdown.measurement_quality.score < measurementFloor) {
    blocks.push(`measurement_quality ${breakdown.measurement_quality.score} is below the floor of ${measurementFloor}; a publish here would not be learnable`);
  }

  const score = Number(((adjusted / MAX_RAW) * 100).toFixed(2));
  const rawScore = Number(((raw / MAX_RAW) * 100).toFixed(2));
  const observedShare = Number((observedWeight / TOTAL_WEIGHT).toFixed(4));

  const band = blocks.length
    ? { min: 0, max: 49, status: 'REJECT_LOW_VALUE' }
    : bandFor(score, policy);

  return {
    score,
    raw_score: rawScore,
    max: 100,
    band: band.status,
    blocks,
    observed_share: observedShare,
    claim_strength: observedShare >= 0.5 ? 'EVIDENCE_BACKED' : observedShare > 0 ? 'PARTIALLY_OBSERVED' : 'UNOBSERVED_HYPOTHESIS',
    derived_dimensions: Object.keys(derived).filter((k) => derived[k]),
    overridden_dimensions: overridden,
    dimensions_by_class: byClass,
    breakdown
  };
}

export function bandFor(score, policy) {
  const bands = policy?.score_bands || [];
  return bands.find((b) => score >= b.min && score <= b.max)
    || { min: 0, max: 49, status: 'REJECT_LOW_VALUE' };
}
