// Issue #53 - the mandatory existing-asset fit gate.
//
// This does NOT re-implement routing. acquisition/lib/router.mjs is the authority on
// which verified asset a demand best fits, and its ROUTE_FLOOR is the same floor used
// here. This module adds the part #53 asks for on top: a named decision record, and an
// explicit no-fit outcome that never creates a product by itself.

import { hasLiveCheckout, isRoutableDestination } from '../../lib/inventory.mjs';
import { ROUTE_FLOOR, routeDemand } from '../../lib/router.mjs';

export const NO_FIT_OUTCOMES = Object.freeze([
  'WATCH_NO_ASSET_FIT',
  'RESEARCH_GAP',
  'NEW_PRODUCT_RECOMMENDATION'
]);

/**
 * Measurement quality of the destination, from the events the page actually emits.
 * A route we cannot measure is a route we cannot learn from, so this is reported next
 * to the fit rather than folded into it.
 */
export function measurementQualityOf(asset) {
  const events = new Set(asset?.analytics_events || []);
  const has = (name) => events.has(name);
  if (has('primary_cta_click') && (has('checkout_click') || has('scos_checkout_click'))) return 'CTA_AND_CHECKOUT_MEASURED';
  if (has('primary_cta_click')) return 'CTA_MEASURED_CHECKOUT_DOWNSTREAM';
  if (has('funnel_view') || has('page_view')) return 'VIEW_ONLY';
  return 'NOT_INSTRUMENTED';
}

/**
 * Run the fit gate for one thesis.
 *
 * @param {object} thesis     { thesis_id, problem_keys, target_audience, language }
 * @param {object} inventory  loaded acquisition/asset-inventory.json
 * @param {object} context    { sourceRouting, providerPolicy, policy, corroboration, score }
 */
export function assessAssetFit(thesis, inventory, context = {}) {
  const { sourceRouting, providerPolicy, policy, corroboration = null, score = null } = context;
  const floor = policy?.gates?.asset_fit_floor ?? ROUTE_FLOOR;

  const route = routeDemand(
    {
      signal_id: thesis.thesis_id,
      problem_keys: thesis.problem_keys || [],
      target_audience: thesis.target_audience || [],
      language: thesis.language
    },
    inventory,
    { sourceRouting, providerPolicy }
  );

  if (!route.best_existing_asset) {
    return noFit(thesis, route, { floor, policy, corroboration, score });
  }

  const asset = inventory.byId?.get?.(route.best_existing_asset)
    ?? inventory.assets.find((a) => a.asset_id === route.best_existing_asset);

  return {
    fits: true,
    outcome: 'EXISTING_ASSET_FIT',
    best_existing_asset: route.best_existing_asset,
    asset_id: route.best_existing_asset,
    product_or_offer: asset?.asset_name ?? 'UNKNOWN',
    primary_user_problem: asset?.primary_user_problem ?? 'UNKNOWN',
    target_audience: asset?.target_audience ?? [],
    primary_cta: route.primary_cta,
    destination_url: route.destination_url,
    secondary_route: route.secondary_route,
    asset_fit_score: route.confidence,
    asset_fit_floor: floor,
    verification_state: route.verification_state,
    measurement_quality: measurementQualityOf(asset),
    commercial_path: route.commercial_path,
    purchase_path_live: hasLiveCheckout(asset),
    destination_routable: isRoutableDestination(asset),
    risk: route.risk,
    reason: route.reason,
    new_product_gate: route.new_product_gate,
    ranked_alternatives: route.ranked,
    channels: route.channels
  };
}

function noFit(thesis, route, { floor, policy, corroboration, score }) {
  const minForNewProduct = policy?.gates?.new_product_recommendation_min_score ?? 85;
  const strongDemand = Boolean(
    corroboration?.satisfied &&
    corroboration.strength === 'STRONG' &&
    typeof score === 'number' &&
    score >= minForNewProduct
  );

  // The only path to NEW_PRODUCT_RECOMMENDATION: demand that is strongly corroborated,
  // scores at the top band, and demonstrably cannot be served by verified inventory.
  // Even then this is a recommendation for a human, never a build instruction.
  const outcome = strongDemand
    ? 'NEW_PRODUCT_RECOMMENDATION'
    : corroboration?.satisfied
      ? 'WATCH_NO_ASSET_FIT'
      : 'RESEARCH_GAP';

  return {
    fits: false,
    outcome,
    best_existing_asset: null,
    asset_id: null,
    product_or_offer: null,
    primary_user_problem: thesis.primary_user_problem ?? 'UNKNOWN',
    target_audience: thesis.target_audience || [],
    primary_cta: null,
    destination_url: null,
    secondary_route: null,
    asset_fit_score: 0,
    asset_fit_floor: floor,
    verification_state: 'UNKNOWN',
    measurement_quality: 'NOT_INSTRUMENTED',
    commercial_path: { available: false, reason: 'no verified existing asset cleared the fit floor' },
    purchase_path_live: false,
    destination_routable: false,
    risk: ['NO_ROUTABLE_ASSET'],
    reason: route.reason,
    // No code path in this repository creates a product. This field is documentation of
    // that fact, checked by acquisition/signal-intelligence/test/asset-fit.test.mjs.
    new_product_gate: outcome === 'NEW_PRODUCT_RECOMMENDATION' ? 'OPEN_FOR_HUMAN_REVIEW' : 'CLOSED',
    product_created: false,
    human_action: outcome === 'NEW_PRODUCT_RECOMMENDATION'
      ? 'Review whether the verified inventory can absorb this demand with a small reversible change before considering any new offer. The new-product gate in revenue-os/backlog.md still applies.'
      : outcome === 'WATCH_NO_ASSET_FIT'
        ? 'Corroborated demand with no verified asset fit. Keep watching; do not build.'
        : 'Evidence is not yet corroborated. This is a research gap, not an opportunity.',
    ranked_alternatives: route.ranked,
    channels: route.channels
  };
}
