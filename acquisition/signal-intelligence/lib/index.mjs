import crypto from 'node:crypto';
import { routeDemand } from '../../lib/router.mjs';
import { classifyRoute } from '../../lib/winner.mjs';

export const EVIDENCE_BUCKETS = Object.freeze(['DEMAND_SIGNAL', 'PAIN_SIGNAL', 'MONEY_SIGNAL']);
export const SOURCE_FAMILIES = Object.freeze([
  'owned_behavior', 'search_demand', 'reddit_pain', 'product_market', 'completed_note',
  'owner_approved_source', 'trend_demand', 'software_reviews', 'competitor_pricing',
  'youtube_search', 'public_evidence'
]);
export const PROVIDER_STATES = Object.freeze(['CONNECTED', 'CONTRACT_ONLY', 'BLOCKED']);
const CLASSES = new Set(['OBSERVED', 'ASSUMPTION', 'HYPOTHESIS']);

const SCORE_WEIGHTS = Object.freeze({
  purchase_intent: 12, pain_severity: 10, urgency: 7, demand_growth: 7,
  evidence_independence: 10, evidence_quality: 8, existing_product_fit: 12,
  audience_fit: 7, content_lens_fit: 5, commercial_margin_fit: 4,
  differentiation_opportunity: 4, freshness: 5, automation_feasibility: 3,
  measurement_quality: 4, operational_burden: -4, safety_risk: -6
});

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function fingerprintEvidence(input) {
  return crypto.createHash('sha256').update(stable({
    source_family: input.source_family, provider: input.provider,
    url_or_reference: input.url_or_reference, observation_summary: input.observation_summary,
    shared_origin_key: input.shared_origin_key
  })).digest('hex');
}

export function validateEvidence(input, { now = new Date() } = {}) {
  const errors = [];
  for (const key of ['signal_id', 'source_family', 'provider', 'observed_at', 'url_or_reference', 'topic', 'observation_summary', 'evidence_class', 'shared_origin_key']) {
    if (!input?.[key]) errors.push(`${key} is required`);
  }
  if (!SOURCE_FAMILIES.includes(input?.source_family)) errors.push('unsupported source_family');
  const buckets = Array.isArray(input?.evidence_bucket) ? input.evidence_bucket : [input?.evidence_bucket];
  if (!buckets.length || buckets.some((b) => !EVIDENCE_BUCKETS.includes(b))) errors.push('invalid evidence_bucket');
  if (!CLASSES.has(input?.evidence_class)) errors.push('invalid evidence_class');
  const observed = Date.parse(input?.observed_at);
  if (!Number.isFinite(observed)) errors.push('observed_at must be an ISO timestamp');
  const expiry = input?.expires_at ? Date.parse(input.expires_at) : observed + 90 * 86400000;
  if (Number.isFinite(expiry) && expiry <= now.getTime()) errors.push('signal is stale or expired');
  if (input?.fingerprint && input.fingerprint !== fingerprintEvidence(input)) errors.push('fingerprint does not match normalized evidence');
  return errors;
}

export function ingestEvidence(store, input, options = {}) {
  const errors = validateEvidence(input, options);
  if (errors.length) return { accepted: false, idempotent: false, errors, store };
  const fingerprint = input.fingerprint || fingerprintEvidence(input);
  const existing = (store.signals || []).find((s) => s.fingerprint === fingerprint || s.signal_id === input.signal_id);
  if (existing) return { accepted: false, idempotent: true, existing, errors: ['duplicate evidence fingerprint or signal_id'], store };
  const record = { ...input, evidence_bucket: Array.isArray(input.evidence_bucket) ? input.evidence_bucket : [input.evidence_bucket], fingerprint };
  return { accepted: true, idempotent: false, record, store: { ...store, signals: [...(store.signals || []), record] } };
}

export function corroborate(signals, { now = new Date() } = {}) {
  const observed = signals.filter((s) => s.evidence_class === 'OBSERVED' && validateEvidence(s, { now }).length === 0);
  const byOrigin = new Map();
  for (const signal of observed) if (!byOrigin.has(signal.shared_origin_key)) byOrigin.set(signal.shared_origin_key, signal);
  const independent = [...byOrigin.values()];
  const families = [...new Set(independent.map((s) => s.source_family))];
  const buckets = [...new Set(independent.flatMap((s) => s.evidence_bucket))];
  return {
    passes: independent.length >= 2 && buckets.length >= 2,
    observed_count: observed.length,
    independent_count: independent.length,
    independent_signal_ids: independent.map((s) => s.signal_id),
    corroboration_families: families, corroboration_buckets: buckets,
    weak_same_family: independent.length >= 2 && families.length < 2
  };
}

export function revenueSignalScore(dimensions) {
  const breakdown = {};
  let weighted = 0;
  let maxPositive = 0;
  for (const [name, weight] of Object.entries(SCORE_WEIGHTS)) {
    const value = clamp(Number(dimensions?.[name] ?? 0), 0, 10);
    const contribution = value * weight;
    breakdown[name] = { value, weight, contribution };
    weighted += contribution;
    if (weight > 0) maxPositive += 10 * weight;
  }
  const score = clamp(Math.round((weighted / maxPositive) * 100));
  return { score, band: score < 50 ? 'LOW_VALUE' : score < 70 ? 'WATCH' : score < 85 ? 'SOURCE_CANDIDATE' : 'HIGH_PRIORITY_SOURCE_CANDIDATE', breakdown };
}

function assetHandoff(route, inventory) {
  if (!route.best_existing_asset) return null;
  const asset = inventory.assets.find((a) => a.asset_id === route.best_existing_asset);
  return {
    best_existing_asset: asset.asset_name, asset_id: asset.asset_id,
    product_or_offer: asset.asset_name, primary_user_problem: asset.primary_user_problem,
    target_audience: asset.target_audience, primary_cta: route.primary_cta,
    destination_url: route.destination_url, secondary_route: route.secondary_route,
    asset_fit_score: Math.round(route.confidence * 100), verification_state: route.verification_state,
    measurement_quality: (asset.analytics_events || []).includes('checkout_click') ? 'CHECKOUT_INSTRUMENTED' : (asset.analytics_events || []).length ? 'CTA_INSTRUMENTED' : 'NOT_INSTRUMENTED'
  };
}

export function promoteCandidate({ candidate_id, thesis, signals, score_dimensions, demand, inventory, sourceRouting, providerPolicy, eligible_audiences = [], eligible_lenses = [], prohibited_claims = [], now = new Date() }) {
  const corroboration = corroborate(signals, { now });
  const scored = revenueSignalScore(score_dimensions);
  const route = routeDemand(demand, inventory, { sourceRouting, providerPolicy });
  const asset = assetHandoff(route, inventory);
  let status = scored.band;
  if (!corroboration.passes) status = 'WATCH_INSUFFICIENT_CORROBORATION';
  else if (!asset) status = scored.score >= 85 ? 'NEW_PRODUCT_RECOMMENDATION' : scored.score >= 70 ? 'WATCH_NO_ASSET_FIT' : status;
  else if (scored.score < 70) status = scored.band;
  const promoted = ['SOURCE_CANDIDATE', 'HIGH_PRIORITY_SOURCE_CANDIDATE'].includes(status);
  return {
    source_candidate_id: candidate_id, thesis,
    supporting_signal_ids: corroboration.independent_signal_ids,
    corroboration_families: corroboration.corroboration_families,
    corroboration_buckets: corroboration.corroboration_buckets,
    revenue_signal_score: scored.score, score_breakdown: scored.breakdown,
    evidence_strength: corroboration.passes ? (corroboration.weak_same_family ? 'CORROBORATED_SAME_FAMILY' : 'INDEPENDENTLY_CORROBORATED') : 'INSUFFICIENT',
    best_existing_asset: asset, asset_fit_score: asset?.asset_fit_score ?? 0,
    eligible_audiences, eligible_lenses,
    existing_product_routes: asset ? [asset.destination_url, asset.secondary_route?.destination_url].filter(Boolean) : [],
    primary_cta: asset?.primary_cta ?? null, prohibited_claims,
    freshness: Math.min(...signals.map((s) => Date.parse(s.observed_at))),
    expiry: Math.min(...signals.map((s) => Date.parse(s.expires_at || new Date(Date.parse(s.observed_at) + 90 * 86400000).toISOString()))),
    status, promoted,
    no_product_created: true,
    routing: route
  };
}

export function feedbackPriority(candidate, routeMeasurement, { explorationFloor = 0.2 } = {}) {
  const winner = classifyRoute(routeMeasurement);
  const multiplier = winner.verdict === 'SCALE' ? 1.15 : winner.verdict === 'STOP' ? 0 : winner.verdict === 'ITERATE' ? 0.9 : 1;
  return { verdict: winner.verdict, priority: Math.max(explorationFloor, Math.min(1, candidate.revenue_signal_score / 100 * multiplier)), exploration_floor: explorationFloor };
}

export function routeBlockedByCooldown(history, { topic, desk_id, lens_id, now = new Date(), cooldownDays = 30 }) {
  const cutoff = now.getTime() - cooldownDays * 86400000;
  return history.some((h) => h.topic === topic && h.desk_id === desk_id && h.lens_id === lens_id && h.verdict === 'STOP' && Date.parse(h.decided_at) >= cutoff);
}
