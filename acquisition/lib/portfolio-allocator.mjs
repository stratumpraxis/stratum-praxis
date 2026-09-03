// Portfolio allocation layer for the Acquisition Intelligence Engine.
//
// It answers one question: given measured route evidence and current demand signals,
// where should the next small unit of attention go? It never publishes, changes a
// price, creates a product, or treats an unverified conversion as revenue.

import { classifyRoute } from './winner.mjs';
import { scoreSignal } from './signal-score.mjs';
import { routeDemand } from './router.mjs';
import { isMeasured } from './util.mjs';

function humanMinutes(channel, policy) {
  return Number(policy?.human_minutes_by_channel?.[channel]
    ?? policy?.human_minutes_by_channel?.default
    ?? 10);
}

function measuredCommercialBonus(measurement) {
  let bonus = 0;
  if (isMeasured(measurement.purchase) && measurement.purchase > 0) bonus += measurement.purchase * 250;
  if (isMeasured(measurement.checkout) && measurement.checkout > 0) bonus += Math.min(measurement.checkout, 20) * 20;
  if (isMeasured(measurement.cta_clicks) && measurement.cta_clicks > 0) bonus += Math.min(measurement.cta_clicks, 100) * 2;
  return bonus;
}

export function rankMeasuredRoutes(records, policy) {
  return records.map((record) => {
    const judged = classifyRoute({
      route_id: record.ledger_id,
      attribution_state: record.attribution_state,
      destination_views: record.funnel?.downstream_views,
      cta_clicks: record.funnel?.cta_clicks,
      checkout: record.funnel?.checkout,
      purchase: record.funnel?.purchase,
      purchase_evidence: record.funnel?.purchase_evidence,
      activation: record.funnel?.activation,
      revisits: record.funnel?.revisits
    });
    const base = Number(policy?.verdict_weight?.[judged.verdict] ?? 0);
    const bonus = measuredCommercialBonus(judged.measurement);
    const attributionMultiplier = record.attribution_state === 'ATTRIBUTED' ? 1 : 0.25;
    const burden = humanMinutes(record.platform, policy);
    const allocationScore = judged.verdict === 'STOP'
      ? 0
      : Number((((base + bonus) * attributionMultiplier) / Math.max(burden, 1)).toFixed(3));

    const action = judged.verdict === 'SCALE'
      ? 'SCALE_EXISTING_ROUTE'
      : judged.verdict === 'ITERATE'
        ? 'FIX_ONE_BOTTLENECK'
        : judged.verdict === 'STOP'
          ? 'STOP_INCREMENTAL_DISTRIBUTION'
          : 'MEASURE_BEFORE_ALLOCATING';

    return {
      type: 'MEASURED_ROUTE',
      id: record.ledger_id,
      asset_id: record.destination_asset_id || record.asset || null,
      platform: record.platform,
      verdict: judged.verdict,
      allocation_score: allocationScore,
      human_minutes: burden,
      action,
      measurement: judged.measurement,
      reasons: judged.reasons
    };
  }).sort((a, b) => b.allocation_score - a.allocation_score || a.id.localeCompare(b.id));
}

export function rankDemandProbes(signals, inventory, { sourceRouting, providerPolicy, policy } = {}) {
  const probes = [];
  for (const signal of signals) {
    const signalScore = scoreSignal(signal.scores);
    if (signalScore.verdict === 'REJECT') continue;
    const route = routeDemand(signal, inventory, { sourceRouting, providerPolicy });
    if (!route.best_existing_asset) continue;

    const channels = route.channels?.selected || [];
    const preferred = [...channels].sort((a, b) => humanMinutes(a.channel, policy) - humanMinutes(b.channel, policy))[0] || null;
    const burden = humanMinutes(preferred?.channel, policy);
    const claimMultiplier = Number(policy?.claim_multiplier?.[signalScore.claim_strength] ?? 0.25);
    const commercialPathMultiplier = route.commercial_path?.available ? 1.2 : 1;
    const automatedMultiplier = preferred && preferred.automation !== 'HUMAN_REQUIRED' ? 1.15 : 1;
    const allocationScore = Number((
      signalScore.percent * 100 *
      claimMultiplier *
      Math.max(route.confidence || 0, 0.1) *
      commercialPathMultiplier *
      automatedMultiplier /
      Math.max(burden, 1)
    ).toFixed(3));

    probes.push({
      type: 'DEMAND_PROBE',
      id: signal.signal_id,
      signal_title: signal.title,
      asset_id: route.best_existing_asset,
      destination: route.destination_url,
      channel: preferred?.channel || null,
      automation: preferred?.automation || 'NO_CHANNEL_SELECTED',
      signal_verdict: signalScore.verdict,
      claim_strength: signalScore.claim_strength,
      route_confidence: route.confidence,
      commercial_path: route.commercial_path || null,
      allocation_score: allocationScore,
      human_minutes: burden,
      action: signalScore.verdict === 'DISTRIBUTE' ? 'RUN_BOUNDED_PROBE' : 'PREPARE_AND_OBSERVE',
      safety_risk: route.risk
    });
  }
  return probes.sort((a, b) => b.allocation_score - a.allocation_score || a.id.localeCompare(b.id));
}

export function buildPortfolioPlan({ measuredRoutes = [], demandProbes = [], policy }) {
  const limit = Number(policy?.max_active_actions_per_cycle ?? 3);
  const budget = Number(policy?.human_touch_budget_minutes_per_cycle ?? 30);
  const candidates = [...measuredRoutes, ...demandProbes]
    .filter((x) => x.action !== 'STOP_INCREMENTAL_DISTRIBUTION')
    .sort((a, b) => b.allocation_score - a.allocation_score || a.id.localeCompare(b.id));

  const selected = [];
  let usedMinutes = 0;
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (usedMinutes + candidate.human_minutes > budget) continue;
    selected.push(candidate);
    usedMinutes += candidate.human_minutes;
  }

  return {
    human_touch_budget_minutes: budget,
    human_touch_minutes_allocated: usedMinutes,
    max_active_actions: limit,
    selected,
    stopped: measuredRoutes.filter((x) => x.action === 'STOP_INCREMENTAL_DISTRIBUTION'),
    deferred: candidates.filter((x) => !selected.some((s) => s.type === x.type && s.id === x.id)),
    rule: 'Measured commercial evidence outranks views. When evidence is weak, run only small existing-asset probes. Human burden is a denominator, not an afterthought.'
  };
}
