// Existing-asset fit.
//
// This is a thin bridge, on purpose. The repository already has a routing engine
// with a scoring floor, a channel selector and an inventory schema that knows which
// assets have live checkouts. Re-implementing any of that here would create a
// second opinion about which asset a signal belongs to, and two opinions about
// money is worse than one.
//
// So: translate a MARKET signal into the shape acquisition/lib/router.mjs already
// understands, ask it, and translate the answer back.

import { loadInventory, hasLiveCheckout } from '../../acquisition/lib/inventory.mjs';
import { routeDemand, ROUTE_FLOOR } from '../../acquisition/lib/router.mjs';
import { loadSourceRouting, knownChannels } from '../../acquisition/lib/utm.mjs';
import { readJson } from '../../acquisition/lib/util.mjs';

// Words that suggest a problem the catalogue actually addresses. Deliberately small
// and explicit: a long fuzzy keyword list produces confident-looking matches for
// signals that have nothing to do with the offer.
const PROBLEM_HINTS = Object.freeze({
  ai_saas_spend: ['spend', 'cost', 'billing', 'subscription', 'invoice', 'budget', 'waste'],
  agent_portability: ['agent', 'agents', 'runtime', 'portability', 'migrate', 'cursor', 'codex'],
  workflow_architecture: ['workflow', 'sop', 'process', 'repeatable', 'handoff', 'pipeline'],
  agent_governance: ['permission', 'governance', 'control', 'approval', 'boundary', 'guardrail'],
  attribution_measurement: ['attribution', 'utm', 'tracking', 'analytics', 'measure'],
  repeatable_execution: ['automation', 'automate', 'orchestration', 'reliability']
});

export function problemKeysFor(signal) {
  const text = `${signal.subject ?? ''}`.toLowerCase();
  const keys = [];
  for (const [key, hints] of Object.entries(PROBLEM_HINTS)) {
    if (hints.some((h) => text.includes(h))) keys.push(key);
  }
  return keys;
}

/**
 * Find the best existing asset for a signal.
 *
 * Returns match: null when nothing clears the router's own floor. That is a real
 * answer, not a failure - most external events genuinely do not map to an offer,
 * and pretending otherwise is how content gets published at destinations that make
 * no sense.
 */
export async function fitExistingAsset(signal, { inventory = null, sourceRouting = null,
                                                 providerPolicy = null } = {}) {
  const routing = sourceRouting ?? await loadSourceRouting();
  const inv = inventory ?? await loadInventory('acquisition/asset-inventory.json', {
    knownChannels: knownChannels(routing)
  });
  const policy = providerPolicy ?? await readJson('distribution/provider-policy.json');

  const problemKeys = problemKeysFor(signal);
  if (!problemKeys.length) {
    return { match: null, reason: 'NO_PROBLEM_KEY_MATCH', floor: ROUTE_FLOOR, candidates: [] };
  }

  const routed = routeDemand(
    {
      signal_id: signal.signal_id,
      problem_keys: problemKeys,
      target_audience: [],
      language: 'en'
    },
    inv,
    { sourceRouting: routing, providerPolicy: policy }
  );

  const candidates = routed?.ranked ?? [];

  if (!routed?.best_existing_asset) {
    return {
      match: null,
      reason: routed?.reason ?? 'BELOW_ROUTER_FLOOR',
      floor: ROUTE_FLOOR,
      candidates,
      problemKeys
    };
  }

  const asset = inv.byId.get(routed.best_existing_asset);
  return {
    match: routed.best_existing_asset,
    score: routed.confidence ?? null,
    reason: routed.reason,
    has_live_checkout: asset ? hasLiveCheckout(asset) : false,
    // The public page a reader would land on, and the checkout behind it. Kept
    // separate: a live page with no live checkout is a real and common state.
    destination: routed.destination_url ?? null,
    checkout_url: asset?.revenue_destination?.url ?? null,
    price: asset?.revenue_destination?.price ?? null,
    commercial_path: routed.commercial_path ?? null,
    secondary_route: routed.secondary_route ?? null,
    floor: ROUTE_FLOOR,
    problemKeys,
    candidates
  };
}
