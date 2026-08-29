// Revenue Publisher v2 - the revenue-vertical contract.
//
// A vertical is a reusable revenue theme: the buyer problem, which evidence families
// count for it, who it is written for, which VERIFIED existing asset the CTA must
// reach, and what may never be claimed. It exists so a second revenue theme is a data
// record rather than a second pipeline.
//
// This module never publishes, never creates an asset and never changes a vertical's
// state. It answers two questions: is this vertical eligible right now, and which
// eligible opportunity is the strongest one to publish.

import { PROMOTED_STATUSES } from '../signal-intelligence/lib/source-candidate.mjs';
import { isPlainObject, readJson } from './util.mjs';

export const VERTICAL_STATES = Object.freeze(['ACTIVE', 'WATCH', 'RETIRED']);

export const REQUIRED_FIELDS = Object.freeze([
  'vertical_id',
  'state',
  'buyer_problem',
  'editorial_angle',
  'eligible_source_families',
  'target_audiences',
  'best_existing_assets',
  'cta_routes',
  'freshness_requirement_days',
  'minimum_evidence',
  'minimum_revenue_signal_score',
  'prohibited_claims'
]);

export async function loadVerticals(file = 'acquisition/revenue-verticals.json') {
  const doc = await readJson(file);
  if (!Array.isArray(doc?.verticals)) throw new Error(`${file} must contain a verticals array`);
  const errors = doc.verticals.flatMap((v) => validateVertical(v));
  if (errors.length) {
    const error = new Error(`${file} has ${errors.length} contract problem(s)`);
    error.errors = errors;
    throw error;
  }
  return {
    ...doc,
    byId: new Map(doc.verticals.map((v) => [v.vertical_id, v])),
    active: doc.verticals.filter((v) => v.state === 'ACTIVE')
  };
}

export function validateVertical(vertical) {
  const errors = [];
  const label = vertical?.vertical_id || 'unnamed-vertical';
  if (!isPlainObject(vertical)) return [`${label}: vertical must be an object`];

  for (const field of REQUIRED_FIELDS) {
    if (vertical[field] === undefined) errors.push(`${label}: missing required field ${field}`);
  }
  if (!/^[a-z][a-z0-9_]*$/.test(vertical.vertical_id || '')) {
    errors.push(`${label}: vertical_id must be lowercase snake_case`);
  }
  if (!VERTICAL_STATES.includes(vertical.state)) errors.push(`${label}: unknown state ${vertical.state}`);

  if (vertical.state === 'ACTIVE') {
    if (!Array.isArray(vertical.thesis_ids) || !vertical.thesis_ids.length) {
      errors.push(`${label}: an ACTIVE vertical must name at least one thesis_id`);
    }
    if (!vertical.primary_asset_id) {
      errors.push(`${label}: an ACTIVE vertical must name the verified existing asset its CTA reaches`);
    }
    if (vertical.cta_required && !(vertical.cta_routes || []).some((r) => r.role === 'PRIMARY')) {
      errors.push(`${label}: cta_required is set but no PRIMARY cta_route is declared`);
    }
    if (vertical.new_product_gate === 'OPEN') {
      errors.push(`${label}: no vertical may open the new-product gate; existing-asset fit decides that, not a theme record`);
    }
  }
  if (vertical.state === 'WATCH' && !vertical.watch_reason) {
    errors.push(`${label}: a WATCH vertical must record why it is not active`);
  }
  return errors;
}

/**
 * Is this vertical publishable right now, given the candidate store?
 * Every requirement is checked against measured facts on the candidate, never against
 * what the vertical claims about itself.
 */
export function assessVertical(vertical, candidates, { now = Date.now() } = {}) {
  const reasons = [];
  const matched = (candidates || []).filter((c) => (vertical.thesis_ids || []).includes(c.thesis_id));

  if (vertical.state !== 'ACTIVE') {
    return {
      vertical_id: vertical.vertical_id,
      eligible: false,
      state: vertical.state,
      candidate: null,
      reasons: [`vertical state is ${vertical.state}: ${vertical.watch_reason || 'not active'}`],
      opportunity_score: 0
    };
  }
  if (!matched.length) {
    return {
      vertical_id: vertical.vertical_id,
      eligible: false,
      state: vertical.state,
      candidate: null,
      reasons: ['no candidate in the store matches this vertical\'s thesis_ids'],
      opportunity_score: 0
    };
  }

  // Best available candidate, by measured revenue signal score.
  const candidate = [...matched].sort((a, b) => (b.revenue_signal_score ?? 0) - (a.revenue_signal_score ?? 0))[0];
  const min = vertical.minimum_evidence || {};

  if (!PROMOTED_STATUSES.includes(candidate.status)) {
    reasons.push(`candidate ${candidate.source_candidate_id} is ${candidate.status}, not a promoted status`);
  }
  const expiry = Date.parse(candidate.expiry);
  if (!Number.isFinite(expiry) || expiry < now) {
    reasons.push(`candidate ${candidate.source_candidate_id} has expired (${candidate.expiry})`);
  }
  if ((candidate.revenue_signal_score ?? 0) < (vertical.minimum_revenue_signal_score ?? 70)) {
    reasons.push(`revenue signal score ${candidate.revenue_signal_score} is below the vertical minimum ${vertical.minimum_revenue_signal_score}`);
  }
  if ((candidate.supporting_signal_ids || []).length < (min.independent_observed_signals ?? 2)) {
    reasons.push(`${(candidate.supporting_signal_ids || []).length} independent OBSERVED signal(s); ${min.independent_observed_signals ?? 2} required`);
  }
  if ((candidate.corroboration_groups || []).length < (min.independence_groups ?? 2)) {
    reasons.push(`${(candidate.corroboration_groups || []).length} independence group(s); ${min.independence_groups ?? 2} required`);
  }
  if ((candidate.corroboration_buckets || []).length < (min.evidence_buckets ?? 2)) {
    reasons.push(`${(candidate.corroboration_buckets || []).length} evidence bucket(s); ${min.evidence_buckets ?? 2} required`);
  }
  const newest = candidate.freshness?.newest_evidence_age_days;
  if (!Number.isFinite(newest)) {
    reasons.push('candidate carries no dated evidence, so freshness cannot be established');
  } else if (newest > (vertical.freshness_requirement_days ?? 90)) {
    reasons.push(`newest counted evidence is ${newest} days old; the vertical requires ${vertical.freshness_requirement_days} days`);
  }
  if (!candidate.asset_id) {
    reasons.push('candidate has no verified existing asset');
  } else if (vertical.primary_asset_id && candidate.asset_id !== vertical.primary_asset_id
    && !(vertical.best_existing_assets || []).includes(candidate.asset_id)) {
    reasons.push(`candidate routes to ${candidate.asset_id}, which the vertical does not list as a valid destination`);
  }

  return {
    vertical_id: vertical.vertical_id,
    eligible: reasons.length === 0,
    state: vertical.state,
    candidate,
    reasons,
    opportunity_score: reasons.length === 0 ? opportunityScore(candidate) : 0,
    opportunity_breakdown: reasons.length === 0 ? opportunityBreakdown(candidate) : null
  };
}

const MEASUREMENT_WEIGHT = Object.freeze({
  CTA_AND_CHECKOUT_MEASURED: 1,
  CTA_MEASURED_CHECKOUT_DOWNSTREAM: 0.8,
  VIEW_ONLY: 0.4,
  NOT_INSTRUMENTED: 0.1
});

/** The five factors of the routing principle, read off the candidate. */
export function opportunityBreakdown(candidate) {
  const breakdown = candidate.score_breakdown || {};
  const norm = (name, fallback = 0) => ((breakdown[name]?.score ?? fallback) / 10);
  const demand = (norm('pain_severity') + norm('demand_growth') + norm('urgency')) / 3;
  const purchase = norm('purchase_intent');
  const assetFit = Math.max(0, Math.min(1, candidate.asset_fit_score ?? 0));
  const freshness = norm('freshness');
  const measurement = MEASUREMENT_WEIGHT[candidate.measurement_quality] ?? 0.1;
  // operational_burden scores 10 when burden is LOW, so invert it into a divisor >= 1.
  const burden = 1 + (1 - norm('operational_burden', 5));
  return {
    demand_strength: Number(demand.toFixed(4)),
    purchase_intent: Number(purchase.toFixed(4)),
    existing_asset_fit: Number(assetFit.toFixed(4)),
    freshness: Number(freshness.toFixed(4)),
    measurement_quality: Number(measurement.toFixed(4)),
    operational_burden_divisor: Number(burden.toFixed(4))
  };
}

export function opportunityScore(candidate) {
  const b = opportunityBreakdown(candidate);
  const numerator = b.demand_strength * b.purchase_intent * b.existing_asset_fit * b.freshness * b.measurement_quality;
  return Number(((numerator / b.operational_burden_divisor) * 100).toFixed(4));
}

/**
 * Choose the single strongest opportunity across every vertical.
 * Deliberately returns one, not a ranked publishing plan: the brief's rule is one
 * strong revenue article rather than a Cartesian product of themes and lenses.
 */
export function selectOpportunity(verticals, candidates, { now = Date.now() } = {}) {
  const assessments = (verticals?.verticals || verticals || [])
    .map((v) => assessVertical(v, candidates, { now }));
  const eligible = assessments
    .filter((a) => a.eligible)
    .sort((a, b) => b.opportunity_score - a.opportunity_score
      || a.vertical_id.localeCompare(b.vertical_id));
  return {
    selected: eligible[0] || null,
    eligible: eligible.map((a) => ({ vertical_id: a.vertical_id, opportunity_score: a.opportunity_score })),
    assessments
  };
}
