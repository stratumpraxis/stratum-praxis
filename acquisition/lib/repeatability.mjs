// Revenue-route repeatability assessment.
//
// A single sale is valuable evidence, but it is not yet a repeatable pipeline.
// This module separates:
//   UNPROVEN -> TRAFFIC_ONLY -> COMMERCIAL_SIGNAL -> PROVEN_ONCE -> REPEATABLE_WIN
//
// Hard rules:
//   - a purchase counts only when payment-provider evidence exists
//   - only ATTRIBUTED records can prove a route produced downstream outcomes
//   - two independent attributed purchase-bearing ledger records are required for REPEATABLE_WIN
//   - views alone never establish repeatability
//   - missing measurement is never converted to zero

import { isMeasured, isPlainObject } from './util.mjs';

export const REPEATABILITY_VERDICTS = Object.freeze([
  'REPEATABLE_WIN',
  'PROVEN_ONCE',
  'COMMERCIAL_SIGNAL',
  'TRAFFIC_ONLY',
  'UNPROVEN'
]);

function clean(value) {
  return value === undefined || value === null || value === '' ? null : String(value);
}

/**
 * Prefer an explicit stable route id. For legacy records, derive a conservative family
 * key from attribution fields and destination. The fallback is intentionally specific:
 * unrelated campaigns are never merged just because they point at the same product.
 */
export function routeFamilyKey(record) {
  const explicit = clean(record.revenue_route_id);
  if (explicit) return explicit;

  const utm = isPlainObject(record.utm) ? record.utm : {};
  const parts = [
    clean(utm.utm_source),
    clean(utm.utm_medium),
    clean(utm.utm_campaign),
    clean(utm.utm_content),
    clean(record.destination_asset_id || record.asset)
  ];
  if (parts.every((v) => v === null)) return `ledger:${record.ledger_id}`;
  return `derived:${parts.map((v) => v ?? 'UNKNOWN').join('|')}`;
}

export function hasVerifiedPurchase(record) {
  const purchase = record?.funnel?.purchase;
  return record?.attribution_state === 'ATTRIBUTED'
    && isMeasured(purchase)
    && purchase > 0
    && Boolean(record?.funnel?.purchase_evidence);
}

function hasMeasuredPositive(record, field) {
  const value = record?.funnel?.[field];
  return isMeasured(value) && value > 0;
}

function hasExplicitHumanSignal(record) {
  const signal = record?.human_signal;
  return isPlainObject(signal)
    && Boolean(clean(signal.type))
    && Boolean(clean(signal.evidence_ref));
}

function summarizeGroup(routeId, records) {
  const attributed = records.filter((r) => r.attribution_state === 'ATTRIBUTED');
  const purchaseRuns = records.filter(hasVerifiedPurchase);
  const checkoutRuns = attributed.filter((r) => hasMeasuredPositive(r, 'checkout'));
  const ctaRuns = attributed.filter((r) => hasMeasuredPositive(r, 'cta_clicks'));
  const trafficRuns = attributed.filter((r) => hasMeasuredPositive(r, 'downstream_views'));
  const humanRuns = attributed.filter(hasExplicitHumanSignal);
  const signalLinkedRuns = attributed.filter((r) => Boolean(clean(r.signal_id)));
  const externalActionRuns = attributed.filter((r) => ['PUBLISHED', 'VERIFIED'].includes(r.status));

  let verdict = 'UNPROVEN';
  let reason = 'No attributed downstream evidence has been recorded for this route family.';

  if (purchaseRuns.length >= 2) {
    verdict = 'REPEATABLE_WIN';
    reason = `${purchaseRuns.length} independent attributed ledger records carry verified purchase evidence.`;
  } else if (purchaseRuns.length === 1) {
    verdict = 'PROVEN_ONCE';
    reason = 'One attributed ledger record carries verified purchase evidence; repeatability is not proven until the route wins again.';
  } else if (checkoutRuns.length > 0 || humanRuns.length > 0) {
    verdict = 'COMMERCIAL_SIGNAL';
    reason = checkoutRuns.length > 0
      ? `${checkoutRuns.length} attributed run(s) reached measured checkout, but no verified purchase is attributed yet.`
      : `${humanRuns.length} attributed run(s) contain an explicit evidence-backed human signal, but no verified purchase is attributed yet.`;
  } else if (ctaRuns.length > 0 || trafficRuns.length > 0) {
    verdict = 'TRAFFIC_ONLY';
    reason = ctaRuns.length > 0
      ? 'Attributed CTA activity exists, but no checkout, evidence-backed human signal, or verified purchase is recorded.'
      : 'Attributed destination traffic exists, but no stronger downstream evidence is recorded.';
  }

  return {
    revenue_route_id: routeId,
    verdict,
    reason,
    evidence: {
      total_runs: records.length,
      attributed_runs: attributed.length,
      signal_linked_runs: signalLinkedRuns.length,
      external_action_runs: externalActionRuns.length,
      explicit_human_signal_runs: humanRuns.length,
      cta_runs: ctaRuns.length,
      checkout_runs: checkoutRuns.length,
      verified_purchase_runs: purchaseRuns.length,
      verified_purchase_evidence: purchaseRuns.map((r) => ({
        ledger_id: r.ledger_id,
        purchase: r.funnel.purchase,
        purchase_evidence: r.funnel.purchase_evidence
      }))
    },
    path_coverage: {
      signal: signalLinkedRuns.length > 0,
      external_action: externalActionRuns.length > 0,
      human_reaction: humanRuns.length > 0,
      cta: ctaRuns.length > 0,
      checkout: checkoutRuns.length > 0,
      verified_revenue: purchaseRuns.length > 0
    }
  };
}

/** Assess every route family represented in the unified ledger. */
export function assessRepeatability(records = []) {
  const groups = new Map();
  for (const record of records) {
    const key = routeFamilyKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const routeFamilies = [...groups.entries()]
    .map(([routeId, group]) => summarizeGroup(routeId, group))
    .sort((a, b) => {
      const rank = Object.fromEntries(REPEATABILITY_VERDICTS.map((v, i) => [v, i]));
      return rank[a.verdict] - rank[b.verdict]
        || b.evidence.verified_purchase_runs - a.evidence.verified_purchase_runs
        || a.revenue_route_id.localeCompare(b.revenue_route_id);
    });

  const byVerdict = Object.fromEntries(REPEATABILITY_VERDICTS.map((v) => [v, []]));
  for (const route of routeFamilies) byVerdict[route.verdict].push(route.revenue_route_id);

  return {
    policy: {
      first_verified_win: 'PROVEN_ONCE requires >=1 ATTRIBUTED ledger record with purchase > 0 and payment-provider purchase_evidence.',
      repeatable_win: 'REPEATABLE_WIN requires >=2 independent ATTRIBUTED ledger records in the same route family, each with verified purchase evidence.',
      human_signal: 'Human reaction is counted only when an explicit human_signal.type and human_signal.evidence_ref are recorded; CTA activity is reported separately.',
      no_inference: 'Views, CTA clicks, checkout, replies and purchases are never synthesized from later stages.'
    },
    route_families: routeFamilies,
    by_verdict: byVerdict
  };
}
