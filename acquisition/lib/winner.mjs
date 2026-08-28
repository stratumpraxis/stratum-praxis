// PHASE 7 - route classification.
//
// Rules that must hold:
//   - views alone can never produce SCALE
//   - NOT_MEASURED is never treated as zero
//   - a purchase count is only usable when payment evidence backs it
//   - too little data yields INSUFFICIENT_DATA, not a guess

import { WINNER_VERDICTS } from './taxonomy.mjs';
import { isMeasured, rate } from './util.mjs';

export const DEFAULT_THRESHOLDS = Object.freeze({
  minDestinationViews: 30,   // below this, no verdict other than INSUFFICIENT_DATA
  minCtaRate: 0.04,
  minCheckoutRate: 0.01,
  stopCtaRate: 0.01,
  minViewsForStop: 100,      // do not kill a route on a small sample
  scaleRequiresCommercialSignal: true
});

/**
 * @param {object} route  { route_id, destination_views, cta_clicks, checkout, purchase,
 *                          purchase_evidence, activation, revisits, impressions }
 */
export function classifyRoute(route, thresholds = DEFAULT_THRESHOLDS) {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons = [];

  // Attribution gate. A distribution route whose payload carried no tracked destination
  // cannot have produced the traffic being measured, so its numbers cannot justify SCALE.
  // UNVERIFIED is treated exactly like UNATTRIBUTED: unproven is not proven.
  const attribution = route.attribution_state;
  const attributionKnown = attribution !== undefined && attribution !== null;
  if (attributionKnown && attribution !== 'ATTRIBUTED') {
    reasons.push(attribution === 'NOT_APPLICABLE'
      ? 'route is awareness-only (NOT_APPLICABLE); it has no destination and cannot produce routing evidence'
      : `route attribution_state is ${attribution}; downstream numbers cannot be associated with this post`);
    return verdict('INSUFFICIENT_DATA', reasons, measurementOf(route), t, attribution);
  }

  const views = route.destination_views;
  const cta = route.cta_clicks;
  const checkout = route.checkout;
  const purchase = route.purchase;
  const hasPurchaseEvidence = Boolean(route.purchase_evidence);

  // A purchase number without payment evidence is not a purchase number.
  const usablePurchase = isMeasured(purchase) && hasPurchaseEvidence ? purchase : null;
  if (isMeasured(purchase) && purchase > 0 && !hasPurchaseEvidence) {
    reasons.push('purchase count ignored: no payment-provider evidence reference was supplied');
  }

  const ctaRate = rate(cta, views);
  const checkoutRate = rate(checkout, views);

  const measurement = measurementOf(route, { usablePurchase });

  // Gate 1: is there enough qualified-traffic measurement to say anything at all?
  if (!isMeasured(views)) {
    reasons.push('destination_views is NOT_MEASURED; qualified traffic is unknown');
    return verdict('INSUFFICIENT_DATA', reasons, measurement, t, attribution);
  }
  if (views < t.minDestinationViews) {
    reasons.push(`only ${views} destination views; below the minimum sample of ${t.minDestinationViews}`);
    return verdict('INSUFFICIENT_DATA', reasons, measurement, t, attribution);
  }
  if (!isMeasured(cta)) {
    reasons.push('cta_clicks is NOT_MEASURED; intent quality cannot be judged from views alone');
    return verdict('INSUFFICIENT_DATA', reasons, measurement, t, attribution);
  }

  // Gate 2: real purchase evidence is the strongest possible signal.
  if (usablePurchase !== null && usablePurchase > 0) {
    reasons.push(`${usablePurchase} verified purchase(s) with evidence ${route.purchase_evidence}`);
    return verdict('SCALE', reasons, measurement, t, attribution);
  }

  // Gate 3: commercial progression without a purchase yet.
  const commercialSignal = isMeasured(checkout) && checkoutRate !== null && checkoutRate >= t.minCheckoutRate;
  if (ctaRate !== null && ctaRate >= t.minCtaRate) {
    if (commercialSignal) {
      reasons.push(`CTA rate ${measurement.cta_rate} >= ${t.minCtaRate} and checkout rate ${measurement.checkout_rate} >= ${t.minCheckoutRate}`);
      return verdict('SCALE', reasons, measurement, t, attribution);
    }
    if (t.scaleRequiresCommercialSignal) {
      reasons.push(isMeasured(checkout)
        ? `CTA rate is healthy but checkout rate ${measurement.checkout_rate} is below ${t.minCheckoutRate}`
        : 'CTA rate is healthy but checkout is NOT_MEASURED, so commercial progression is unproven');
      return verdict('ITERATE', reasons, measurement, t, attribution);
    }
  }

  // Gate 4: enough traffic, demonstrably low intent.
  if (ctaRate !== null && ctaRate < t.stopCtaRate && views >= t.minViewsForStop) {
    reasons.push(`CTA rate ${measurement.cta_rate} is below ${t.stopCtaRate} across ${views} views: high traffic, low intent`);
    return verdict('STOP', reasons, measurement, t, attribution);
  }

  reasons.push(`CTA rate ${measurement.cta_rate} is below the scale threshold ${t.minCtaRate} but the sample does not justify stopping`);
  return verdict('ITERATE', reasons, measurement, t, attribution);
}

/** Build the measurement view. Shared so the attribution gate reports the same numbers. */
export function measurementOf(route, { usablePurchase } = {}) {
  const views = route.destination_views;
  const cta = route.cta_clicks;
  const checkout = route.checkout;
  const purchase = usablePurchase !== undefined
    ? usablePurchase
    : (isMeasured(route.purchase) && route.purchase_evidence ? route.purchase : null);
  const ctaRate = rate(cta, views);
  const checkoutRate = rate(checkout, views);

  return {
    impressions: isMeasured(route.impressions) ? route.impressions : 'NOT_MEASURED',
    destination_views: isMeasured(views) ? views : 'NOT_MEASURED',
    cta_clicks: isMeasured(cta) ? cta : 'NOT_MEASURED',
    checkout: isMeasured(checkout) ? checkout : 'NOT_MEASURED',
    purchase: purchase === null || purchase === undefined ? 'NOT_MEASURED' : purchase,
    activation: isMeasured(route.activation) ? route.activation : 'NOT_MEASURED',
    revisits: isMeasured(route.revisits) ? route.revisits : 'NOT_MEASURED',
    cta_rate: ctaRate === null ? 'NOT_MEASURED' : Number(ctaRate.toFixed(4)),
    checkout_rate: checkoutRate === null ? 'NOT_MEASURED' : Number(checkoutRate.toFixed(4))
  };
}

function verdict(name, reasons, measurement, thresholds, attribution = null) {
  if (!WINNER_VERDICTS.includes(name)) throw new Error(`unknown verdict ${name}`);
  if (name === 'SCALE' && attribution !== null && attribution !== 'ATTRIBUTED') {
    // Defence in depth: SCALE must never escape the attribution gate.
    throw new Error(`refusing to SCALE a route whose attribution_state is ${attribution}`);
  }
  return {
    verdict: name,
    reasons,
    measurement,
    attribution_state: attribution ?? 'NOT_TRACKED',
    thresholds,
    // Explicit guard against the "it got lots of views so it won" failure mode.
    views_only_warning: measurement.cta_clicks === 'NOT_MEASURED' && measurement.destination_views !== 'NOT_MEASURED'
      ? 'This route has traffic numbers but no intent measurement. Views alone never justify scaling.'
      : null
  };
}

export function classifyAll(routes, thresholds) {
  return routes.map((route) => ({ route_id: route.route_id, ...classifyRoute(route, thresholds) }));
}

export function groupByVerdict(classified) {
  const grouped = Object.fromEntries(WINNER_VERDICTS.map((v) => [v, []]));
  for (const item of classified) grouped[item.verdict].push(item.route_id);
  return grouped;
}
