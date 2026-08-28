// PHASE 2 + PHASE 4 - route a demand signal to an existing asset and to channels.
//
// Hard rule from the brief: never recommend creating a new product when an
// existing asset can satisfy the demand. The new-product gate is checked last
// and only opens when nothing in the inventory clears the floor.

import { hasLiveCheckout, isRoutableDestination, isUnknown } from './inventory.mjs';
import { COMMERCIAL_INTENT } from './taxonomy.mjs';
import { uniq } from './util.mjs';

/** Priority weights, in the order the brief specifies. Higher = decided earlier. */
export const ROUTING_WEIGHTS = Object.freeze({
  problem_fit: 40,      // 2. strongest user/problem fit
  audience_fit: 12,
  language_fit: 10,
  commercial_intent: 14, // 3. strongest commercial intent
  friction: 10,          // 4. lowest friction
  verified_destination: 14, // 5. verified live destination
  measurability: 10      // 6. measurable downstream action
});

/** A candidate must reach this fraction of the maximum before it may be recommended. */
export const ROUTE_FLOOR = 0.45;

const INTENT_SCORE = { NONE: 0, LOW: 3, MID: 7, HIGH: 10 };

/** Free, no-signup entry points are the lowest-friction first touch for cold traffic. */
const FRICTION_SCORE = {
  FREE_CALCULATOR: 10,
  FREE_DIAGNOSTIC: 9,
  FREE_CHECKLIST: 9,
  GUIDE: 8,
  PROOF: 7,
  HUB: 6,
  ROUTER: 5,
  PAID_PRODUCT: 3,
  PAID_SERVICE: 2,
  SUBSCRIPTION: 2
};

function overlap(a = [], b = []) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((x) => setB.has(x)).length;
  return hits / Math.max(a.length, 1);
}

function measurabilityScore(asset) {
  const events = new Set(asset.analytics_events || []);
  let score = 0;
  if (events.has('funnel_view')) score += 3;
  if (events.has('primary_cta_click')) score += 4;
  if (events.has('checkout_click')) score += 2;
  if (events.has('activation')) score += 1;
  return Math.min(score, 10);
}

function verifiedDestinationScore(asset) {
  if (!isRoutableDestination(asset)) return 0;
  let score = asset.verification_state === 'HTTP_VERIFIED' ? 10
    : asset.verification_state === 'REPO_AND_SITEMAP' ? 8
      : 5;
  // A page whose checkout is paused cannot complete a commercial route.
  if (asset.status === 'PAUSED_CHECKOUT') score = Math.min(score, 2);
  return score;
}

/**
 * Score one asset against one demand signal. Every component is returned so the
 * decision can be audited rather than trusted.
 */
export function scoreAssetForSignal(signal, asset) {
  const problemFit = Math.max(
    overlap(signal.problem_keys || [], asset.problem_keys || []),
    overlap(asset.problem_keys || [], signal.problem_keys || [])
  );
  const audienceFit = overlap(signal.target_audience || [], asset.target_audience || []);
  const languageFit = !signal.language || signal.language === asset.language ? 1 : 0;

  const components = {
    problem_fit: problemFit * 10,
    audience_fit: audienceFit * 10,
    language_fit: languageFit * 10,
    commercial_intent: INTENT_SCORE[asset.commercial_intent] ?? 0,
    friction: FRICTION_SCORE[asset.asset_type] ?? 5,
    verified_destination: verifiedDestinationScore(asset),
    measurability: measurabilityScore(asset)
  };

  let total = 0;
  let max = 0;
  const breakdown = {};
  for (const [name, weight] of Object.entries(ROUTING_WEIGHTS)) {
    const value = components[name] ?? 0;
    const contribution = value * weight;
    total += contribution;
    max += 10 * weight;
    breakdown[name] = { value: Number(value.toFixed(2)), weight, contribution: Number(contribution.toFixed(2)) };
  }

  return { total, max, ratio: total / max, breakdown };
}

function riskFor(asset, scored) {
  const risks = [];
  if (!isRoutableDestination(asset)) risks.push('DESTINATION_NOT_VERIFIED');
  if (asset.status === 'PAUSED_CHECKOUT') risks.push('CHECKOUT_PAUSED_NO_PURCHASE_POSSIBLE');
  if (asset.status === 'DRAFT' || asset.status === 'BLOCKED') risks.push('ASSET_NOT_LIVE');
  if (isUnknown(asset.revenue_destination?.url) && asset.revenue_destination?.type !== 'INTERNAL_FUNNEL') {
    risks.push('REVENUE_DESTINATION_UNKNOWN');
  }
  if (scored.breakdown.measurability.value < 5) risks.push('WEAK_DOWNSTREAM_MEASUREMENT');
  if (!risks.length) risks.push('NONE_IDENTIFIED');
  return risks;
}

function reasonFor(signal, asset, scored) {
  const shared = (signal.problem_keys || []).filter((k) => (asset.problem_keys || []).includes(k));
  const parts = [];
  parts.push(shared.length
    ? `matches the signal on ${shared.join(', ')}`
    : 'no shared problem key; matched on audience/intent only');
  parts.push(`asset commercial intent ${asset.commercial_intent || 'UNKNOWN'}`);
  parts.push(`entry friction ${scored.breakdown.friction.value}/10`);
  parts.push(hasLiveCheckout(asset)
    ? `purchase path is live (${asset.revenue_destination.type})`
    : asset.revenue_destination?.type === 'INTERNAL_FUNNEL'
      ? 'free entry that hands off to a paid asset'
      : 'no live purchase path on this asset');
  return parts.join('; ');
}

/**
 * Choose the acquisition channels for one asset.
 * The intersection of what the asset supports and what the channel map allows -
 * never "post everywhere".
 */
export function selectChannels(asset, { sourceRouting, providerPolicy, limit = 2 } = {}) {
  const candidates = asset.distribution_candidates || [];
  const selected = [];
  const rejected = [];
  for (const channel of candidates) {
    const source = sourceRouting?.sources?.[channel];
    if (!source) {
      rejected.push({ channel, reason: 'channel is not defined in distribution/source-routing.json' });
      continue;
    }
    const provider = Object.entries(providerPolicy?.providers || {}).find(([, cfg]) =>
      cfg?.publishingEnabled === true &&
      Array.isArray(cfg.allowedServices) &&
      cfg.allowedServices.map((s) => String(s).toLowerCase()).includes(channel));

    selected.push({
      channel,
      utm_source: source.utm_source,
      utm_medium: source.utm_medium,
      role: source.role || 'UNKNOWN',
      channel_status: source.status || 'UNKNOWN',
      automation: provider ? `AUTOMATED_VIA_${provider[0].toUpperCase()}` : 'HUMAN_REQUIRED',
      human_required_reason: provider
        ? null
        : 'no provider in distribution/provider-policy.json has publishingEnabled for this channel'
    });
  }
  // Automated lanes first, then declared channel order. Deterministic, no randomness.
  selected.sort((a, b) => (a.automation === 'HUMAN_REQUIRED' ? 1 : 0) - (b.automation === 'HUMAN_REQUIRED' ? 1 : 0));
  return { selected: selected.slice(0, limit), all: selected, rejected };
}

/**
 * PHASE 2 router entry point.
 * Input: a demand signal. Output: the best existing asset and how to reach it.
 */
export function routeDemand(signal, inventory, { sourceRouting, providerPolicy, channelLimit = 2 } = {}) {
  if (!signal || typeof signal !== 'object') throw new Error('signal must be an object');
  if (!signal.signal_id) throw new Error('signal.signal_id is required');
  if (!Array.isArray(inventory?.assets)) throw new Error('inventory.assets must be an array');

  const ranked = inventory.assets
    .map((asset) => ({ asset, scored: scoreAssetForSignal(signal, asset) }))
    .sort((a, b) => b.scored.total - a.scored.total || a.asset.asset_id.localeCompare(b.asset.asset_id));

  const eligible = ranked.filter(({ asset, scored }) =>
    isRoutableDestination(asset) && scored.ratio >= ROUTE_FLOOR);

  if (!eligible.length) {
    return {
      signal_id: signal.signal_id,
      best_existing_asset: null,
      reason: ranked.length
        ? `no inventory asset reached the routing floor of ${ROUTE_FLOOR}; best candidate was ${ranked[0].asset.asset_id} at ${ranked[0].scored.ratio.toFixed(3)}`
        : 'inventory is empty',
      primary_cta: null,
      destination_url: null,
      secondary_route: null,
      confidence: 0,
      risk: ['NO_ROUTABLE_ASSET'],
      verification_state: 'UNKNOWN',
      new_product_gate: 'OPEN_FOR_REVIEW',
      new_product_gate_note:
        'No existing asset fits. This is a review trigger for a human, not an instruction to build a product. The backlog new-product gate in revenue-os/backlog.md still applies.',
      channels: { selected: [], all: [], rejected: [] },
      ranked: ranked.slice(0, 5).map(({ asset, scored }) => ({ asset_id: asset.asset_id, ratio: Number(scored.ratio.toFixed(3)) }))
    };
  }

  const [best, ...rest] = eligible;
  // Prefer a secondary route that is commercially different from the primary,
  // so the pair covers both a low-friction entry and a purchase path.
  const secondary = rest.find(({ asset }) => hasLiveCheckout(asset) !== hasLiveCheckout(best.asset)) || rest[0] || null;

  const channels = selectChannels(best.asset, { sourceRouting, providerPolicy, limit: channelLimit });

  return {
    signal_id: signal.signal_id,
    best_existing_asset: best.asset.asset_id,
    reason: reasonFor(signal, best.asset, best.scored),
    primary_cta: best.asset.cta?.label || 'UNKNOWN',
    destination_url: best.asset.public_url,
    secondary_route: secondary
      ? {
        asset_id: secondary.asset.asset_id,
        destination_url: secondary.asset.public_url,
        role: hasLiveCheckout(secondary.asset) ? 'PURCHASE_PATH' : 'LOW_FRICTION_ENTRY'
      }
      : null,
    confidence: Number(best.scored.ratio.toFixed(3)),
    risk: riskFor(best.asset, best.scored),
    verification_state: best.asset.verification_state,
    commercial_path: hasLiveCheckout(best.asset)
      ? { available: true, type: best.asset.revenue_destination.type, price: best.asset.revenue_destination.price ?? 'UNKNOWN' }
      : { available: false, reason: best.asset.revenue_destination?.type === 'INTERNAL_FUNNEL' ? 'free entry; purchase happens downstream' : 'no live checkout on this asset' },
    new_product_gate: 'BLOCKED_EXISTING_ASSET_SUFFICIENT',
    channels,
    score_breakdown: best.scored.breakdown,
    ranked: eligible.slice(0, 5).map(({ asset, scored }) => ({ asset_id: asset.asset_id, ratio: Number(scored.ratio.toFixed(3)) }))
  };
}

export const INTENT_LEVELS = COMMERCIAL_INTENT;
export { uniq };
