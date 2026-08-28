// PHASE 3 - transparent distribution signal scoring.
//
// The model is deliberately small and auditable: nine named dimensions, integer
// scores 0-10, fixed weights, and an evidence class attached to EVERY dimension.
// A HYPOTHESIS never becomes evidence just because it scored well.

import { EVIDENCE_CLASSES } from './taxonomy.mjs';
import { isPlainObject } from './util.mjs';

export const DIMENSIONS = Object.freeze({
  pain_intensity: 3,
  urgency: 2,
  audience_fit: 3,
  commercial_intent: 3,
  asset_fit: 3,
  content_fit: 2,
  distribution_fit: 2,
  measurement_quality: 2,
  safety: 3
});

export const MAX_DIMENSION_SCORE = 10;
export const MAX_TOTAL = Object.values(DIMENSIONS).reduce((sum, w) => sum + w * MAX_DIMENSION_SCORE, 0);

/** Below this, the signal is not distributed at all regardless of the other scores. */
export const SAFETY_FLOOR = 7;
/** Below this, measurement is too weak to learn anything from a publish. */
export const MEASUREMENT_FLOOR = 4;

const EVIDENCE_WEIGHT = Object.freeze({ OBSERVED: 1, ASSUMPTION: 0.5, HYPOTHESIS: 0 });

function readDimension(input, name) {
  const raw = input?.[name];
  if (typeof raw === 'number') {
    // A bare number carries no evidence class, so it is treated as the weakest one.
    return { score: raw, evidence: 'HYPOTHESIS', note: 'no evidence class supplied' };
  }
  if (!isPlainObject(raw)) return null;
  return {
    score: raw.score,
    evidence: raw.evidence,
    note: typeof raw.note === 'string' ? raw.note : ''
  };
}

export function validateScoreInput(scores) {
  const errors = [];
  if (!isPlainObject(scores)) return ['scores must be an object'];
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

/**
 * Score one demand signal.
 * Returns the full breakdown so a human can audit every contribution.
 */
export function scoreSignal(scores) {
  const errors = validateScoreInput(scores);
  if (errors.length) {
    const error = new Error(`signal scores are invalid (${errors.length} problem(s))`);
    error.errors = errors;
    throw error;
  }

  const breakdown = {};
  let total = 0;
  let observedWeight = 0;
  let evidenceWeight = 0;
  let totalWeight = 0;
  const byClass = { OBSERVED: [], ASSUMPTION: [], HYPOTHESIS: [] };

  for (const [name, weight] of Object.entries(DIMENSIONS)) {
    const dim = readDimension(scores, name);
    const contribution = dim.score * weight;
    total += contribution;
    totalWeight += weight;
    if (dim.evidence === 'OBSERVED') observedWeight += weight;
    evidenceWeight += weight * EVIDENCE_WEIGHT[dim.evidence];
    byClass[dim.evidence].push(name);
    breakdown[name] = { score: dim.score, weight, contribution, evidence: dim.evidence, note: dim.note };
  }

  const safety = breakdown.safety.score;
  const measurement = breakdown.measurement_quality.score;

  const blocks = [];
  if (safety < SAFETY_FLOOR) blocks.push(`safety score ${safety} is below the floor of ${SAFETY_FLOOR}`);
  if (measurement < MEASUREMENT_FLOOR) {
    blocks.push(`measurement_quality ${measurement} is below the floor of ${MEASUREMENT_FLOOR}; a publish here would not be learnable`);
  }

  const percent = total / MAX_TOTAL;
  const observedShare = observedWeight / totalWeight;
  const evidenceShare = evidenceWeight / totalWeight;

  let verdict;
  if (blocks.length) verdict = 'REJECT';
  else if (percent >= 0.7 && observedShare >= 0.3) verdict = 'DISTRIBUTE';
  else if (percent >= 0.55) verdict = 'PREPARE_AND_OBSERVE';
  else verdict = 'HOLD';

  // Explicit language guard: this string is what report writers must quote.
  const claimStrength = observedShare >= 0.5
    ? 'EVIDENCE_BACKED'
    : observedShare > 0
      ? 'PARTIALLY_OBSERVED'
      : 'UNOBSERVED_HYPOTHESIS';

  return {
    total,
    max: MAX_TOTAL,
    percent: Number(percent.toFixed(4)),
    verdict,
    blocks,
    claim_strength: claimStrength,
    evidence_share: Number(evidenceShare.toFixed(4)),
    observed_share: Number(observedShare.toFixed(4)),
    dimensions_by_class: byClass,
    breakdown
  };
}

/** Phrasing helper so reports cannot describe a hypothesis as proof. */
export function describeClaim(result) {
  switch (result.claim_strength) {
    case 'EVIDENCE_BACKED':
      return 'Backed by observed evidence for most of the scored weight.';
    case 'PARTIALLY_OBSERVED':
      return 'Partly observed; the remainder is assumption or hypothesis and is NOT evidence.';
    default:
      return 'Hypothesis only. No observed evidence supports this signal yet.';
  }
}
