// Issue #53 - the SOURCE_CANDIDATE record and the handoff into Issue #52.
//
// This is the only contract the media engine is allowed to consume. It carries the
// provenance (which evidence, which families, which buckets), the commercial decision
// (which verified asset, which CTA, which destination) and the prohibitions
// (what may never be claimed about this thesis). Issue #52 owns everything editorial:
// lens choice, truth gate, localization, duplication and the publishing gate.

import { BLOCKED_CLAIM_PATTERNS } from '../../lib/safety.mjs';
import { nowIso, slug } from '../../lib/util.mjs';
import { corroborate } from './corroborate.mjs';
import { assessAssetFit } from './asset-fit.mjs';
import { scoreRevenueSignal } from './revenue-score.mjs';
import { prohibitedClaimsFromSocial } from './social-evidence.mjs';

export const CANDIDATE_STATUSES = Object.freeze([
  'REJECT_LOW_VALUE',
  'WATCH',
  'WATCH_NO_ASSET_FIT',
  'RESEARCH_GAP',
  'NEW_PRODUCT_RECOMMENDATION',
  'SOURCE_CANDIDATE',
  'HIGH_PRIORITY_SOURCE_CANDIDATE'
]);

/** Statuses Issue #52 may derive content from. Nothing else is a valid handoff. */
export const PROMOTED_STATUSES = Object.freeze(['SOURCE_CANDIDATE', 'HIGH_PRIORITY_SOURCE_CANDIDATE']);

const MS_PER_DAY = 86400000;

export function candidateId(thesisId) {
  return `sc-${slug(thesisId, 48)}`;
}

/**
 * Claims that must never be attached to this candidate downstream.
 * Three origins, all of them mechanical:
 *   - the copy patterns the existing safety gate already blocks
 *   - what the evidence does not support (no purchase evidence, no external consensus)
 *   - what the destination cannot deliver (a paused checkout, an English-only product)
 */
export function prohibitedClaims(assetFit, corroboration, thesis, signals = []) {
  const claims = [
    ...BLOCKED_CLAIM_PATTERNS.map((pattern) => ({
      claim_pattern: String(pattern),
      reason: 'blocked by the existing acquisition safety gate (acquisition/lib/safety.mjs)'
    }))
  ];

  if (!corroboration.money_evidence?.external_consensus) {
    claims.push({
      claim_pattern: 'EXTERNAL_CONSENSUS',
      reason: corroboration.money_evidence?.note
        || 'no external money evidence supports a claim that the market has already validated this commercially'
    });
  }
  if (!assetFit.purchase_path_live) {
    claims.push({
      claim_pattern: 'PURCHASE_AVAILABLE_ON_THIS_PAGE',
      reason: assetFit.fits
        ? `${assetFit.asset_id} has no live checkout of its own; the purchase happens downstream`
        : 'no verified purchase path is attached to this candidate'
    });
  }
  claims.push({
    claim_pattern: 'VERIFIED_REVENUE_FROM_THIS_THESIS',
    reason: 'no payment-provider record is attached to this candidate; revenue may not be claimed'
  });
  // Social evidence forces its own prohibitions: what a post says is never a fact.
  claims.push(...prohibitedClaimsFromSocial(signals));

  if (thesis?.prohibited_claims) {
    for (const claim of thesis.prohibited_claims) {
      claims.push({ claim_pattern: claim, reason: 'declared prohibited on the thesis' });
    }
  }
  return claims;
}

function eligibleLenses(families, policy) {
  const affinity = policy?.lens_affinity || {};
  const lenses = new Set();
  for (const family of families) {
    for (const lens of affinity[family] || []) lenses.add(lens);
  }
  return [...lenses].sort();
}

/**
 * Build the candidate record for one thesis.
 *
 * @param {object} thesis    { thesis_id, thesis, problem_keys, target_audience, language, scores }
 * @param {Array}  signals   normalized evidence records supporting this thesis
 * @param {object} inventory loaded asset inventory
 */
export function buildSourceCandidate(thesis, signals, inventory, context = {}) {
  const { policy, sourceRouting, providerPolicy, now = Date.now() } = context;

  const corroboration = corroborate(signals, policy);

  // Asset fit runs before the final score because existing_product_fit is a derived
  // dimension. A provisional score is used only to decide the no-fit outcome branch.
  const provisional = scoreRevenueSignal(thesis.scores, { policy, corroboration, signals });
  const assetFit = assessAssetFit(thesis, inventory, {
    sourceRouting,
    providerPolicy,
    policy,
    corroboration,
    score: provisional.score
  });
  const score = scoreRevenueSignal(thesis.scores, { policy, corroboration, signals, assetFit });

  const status = decideStatus({ corroboration, score, assetFit });
  const ttlDays = policy?.freshness?.candidate_ttl_days ?? 60;

  return {
    source_candidate_id: candidateId(thesis.thesis_id),
    thesis_id: thesis.thesis_id,
    thesis: thesis.thesis,
    status,
    promoted: PROMOTED_STATUSES.includes(status),

    supporting_signal_ids: corroboration.corroborating_signal_ids,
    all_signal_ids: signals.map((s) => s.signal_id),
    corroboration_families: corroboration.corroboration_families,
    corroboration_groups: corroboration.corroboration_groups,
    corroboration_buckets: corroboration.corroboration_buckets,
    corroboration_satisfied: corroboration.satisfied,
    corroboration_failures: corroboration.failures,
    excluded_as_dependent: corroboration.excluded_as_dependent,
    excluded_as_non_independent_source: corroboration.excluded_as_non_independent_source || [],
    expired_signal_ids: corroboration.expired_signal_ids,
    non_observed_signals: corroboration.non_observed,
    evidence_strength: corroboration.strength,
    external_consensus: corroboration.money_evidence.external_consensus,
    money_evidence_note: corroboration.money_evidence.note,

    revenue_signal_score: score.score,
    revenue_signal_raw_score: score.raw_score,
    revenue_signal_band: score.band,
    score_blocks: score.blocks,
    claim_strength: score.claim_strength,
    score_breakdown: score.breakdown,
    derived_dimensions: score.derived_dimensions,

    best_existing_asset: assetFit.best_existing_asset,
    asset_id: assetFit.asset_id,
    product_or_offer: assetFit.product_or_offer,
    primary_user_problem: assetFit.primary_user_problem,
    target_audience: assetFit.target_audience,
    primary_cta: assetFit.primary_cta,
    destination_url: assetFit.destination_url,
    secondary_route: assetFit.secondary_route,
    asset_fit_score: assetFit.asset_fit_score,
    verification_state: assetFit.verification_state,
    measurement_quality: assetFit.measurement_quality,
    asset_fit_outcome: assetFit.outcome,
    new_product_gate: assetFit.new_product_gate,
    product_created: false,
    existing_product_routes: assetFit.fits
      ? [
        { role: 'PRIMARY', asset_id: assetFit.asset_id, url: assetFit.destination_url, cta: assetFit.primary_cta },
        ...(assetFit.secondary_route
          ? [{ role: assetFit.secondary_route.role, asset_id: assetFit.secondary_route.asset_id, url: assetFit.secondary_route.destination_url, cta: null }]
          : [])
      ]
      : [],

    eligible_audiences: thesis.target_audience || [],
    eligible_lenses: eligibleLenses(corroboration.corroboration_families, policy),
    channel_candidates: (assetFit.channels?.all || []).map((c) => ({
      channel: c.channel,
      automation: c.automation,
      human_required_reason: c.human_required_reason
    })),

    prohibited_claims: prohibitedClaims(assetFit, corroboration, thesis, signals),
    language: thesis.language ?? 'UNKNOWN',
    freshness: freshnessOf(signals, corroboration),
    expiry: new Date(now + ttlDays * MS_PER_DAY).toISOString(),
    generated_at: nowIso(),
    handoff: {
      consumer: 'acquisition/media-engine (Issue #52)',
      contract: 'Only PROMOTED_STATUSES may be derived from. The media engine re-checks truth, localization, duplication and provider policy on its own; nothing here authorises a publish.'
    }
  };
}

function freshnessOf(signals, corroboration) {
  const counted = new Set(corroboration.corroborating_signal_ids || []);
  const ages = signals
    .filter((s) => counted.has(s.signal_id) && Number.isFinite(s.freshness?.age_days))
    .map((s) => s.freshness.age_days);
  return {
    counted_signals: ages.length,
    newest_evidence_age_days: ages.length ? Math.min(...ages) : null,
    oldest_evidence_age_days: ages.length ? Math.max(...ages) : null,
    state: ages.length ? 'FRESH' : 'NO_DATED_EVIDENCE'
  };
}

/**
 * The promotion decision, in one place.
 *
 * Every one of these must hold before a thesis may reach Issue #52:
 *   1. the 2-Signal Rule is satisfied by independent OBSERVED evidence
 *   2. the Revenue Signal Score bands into SOURCE_CANDIDATE or above
 *   3. a VERIFIED existing asset passes the fit gate
 *   4. bucket coverage allows the band being claimed
 */
export function decideStatus({ corroboration, score, assetFit }) {
  if (score.blocks.length) return 'REJECT_LOW_VALUE';
  if (score.band === 'REJECT_LOW_VALUE') return 'REJECT_LOW_VALUE';

  if (!corroboration.satisfied) {
    // Uncorroborated. It may still be worth research, but it is never a candidate.
    return score.band === 'WATCH' || score.band === 'SOURCE_CANDIDATE' || score.band === 'HIGH_PRIORITY_SOURCE_CANDIDATE'
      ? 'RESEARCH_GAP'
      : 'WATCH';
  }

  if (!assetFit.fits) return assetFit.outcome;

  if (score.band === 'WATCH') return 'WATCH';

  const ceiling = corroboration.eligibility_ceiling;
  if (score.band === 'HIGH_PRIORITY_SOURCE_CANDIDATE') {
    // Three buckets are required before the top band may be claimed.
    return ceiling === 'HIGH_PRIORITY_ELIGIBLE' ? 'HIGH_PRIORITY_SOURCE_CANDIDATE' : 'SOURCE_CANDIDATE';
  }
  if (score.band === 'SOURCE_CANDIDATE') {
    return ceiling === 'WATCH' ? 'WATCH' : 'SOURCE_CANDIDATE';
  }
  return 'WATCH';
}

/** Structural validation of a stored candidate record. */
export function validateCandidate(candidate) {
  const errors = [];
  const label = candidate?.source_candidate_id || 'unnamed-candidate';
  if (!candidate || typeof candidate !== 'object') return [`${label}: candidate must be an object`];
  for (const field of ['source_candidate_id', 'thesis_id', 'thesis', 'status', 'supporting_signal_ids', 'prohibited_claims', 'expiry']) {
    if (candidate[field] === undefined) errors.push(`${label}: missing required field ${field}`);
  }
  if (!CANDIDATE_STATUSES.includes(candidate.status)) errors.push(`${label}: unknown status ${candidate.status}`);
  if (candidate.promoted === true) {
    if (!PROMOTED_STATUSES.includes(candidate.status)) {
      errors.push(`${label}: promoted is true but status ${candidate.status} is not a promoted status`);
    }
    if (!candidate.asset_id) errors.push(`${label}: a promoted candidate requires a verified asset_id`);
    if (!candidate.destination_url) errors.push(`${label}: a promoted candidate requires a destination_url`);
    if (!Array.isArray(candidate.supporting_signal_ids) || candidate.supporting_signal_ids.length < 2) {
      errors.push(`${label}: a promoted candidate requires at least two supporting signal ids`);
    }
  }
  if (candidate.product_created === true) {
    errors.push(`${label}: this layer never creates a product; product_created must be false`);
  }
  return errors;
}

/**
 * Append-only upsert into the candidate store.
 * A candidate record is replaced by its newer evaluation, but every status change is
 * appended to its history so the promotion trail cannot be quietly rewritten.
 */
export function upsertCandidate(store, candidate) {
  const candidates = Array.isArray(store?.candidates) ? [...store.candidates] : [];
  const index = candidates.findIndex((c) => c.source_candidate_id === candidate.source_candidate_id);
  if (index === -1) {
    candidates.push({ ...candidate, history: [{ at: candidate.generated_at, from_status: null, to_status: candidate.status }] });
  } else {
    const prior = candidates[index];
    const history = [...(prior.history || [])];
    if (prior.status !== candidate.status) {
      history.push({ at: candidate.generated_at, from_status: prior.status, to_status: candidate.status });
    }
    candidates[index] = { ...candidate, history };
  }
  return { ...store, version: 1, candidates };
}

/** Is this candidate still usable by Issue #52 right now? */
export function isConsumable(candidate, now = Date.now()) {
  if (!PROMOTED_STATUSES.includes(candidate?.status)) {
    return { ok: false, reason: `status ${candidate?.status} is not a promoted status` };
  }
  const expiry = Date.parse(candidate.expiry);
  if (!Number.isFinite(expiry)) return { ok: false, reason: 'candidate has no parseable expiry' };
  if (expiry < now) return { ok: false, reason: `candidate expired at ${candidate.expiry}` };
  return { ok: true, reason: 'promoted and unexpired' };
}
