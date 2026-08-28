// Issue #53 - measured feedback into candidate ranking.
//
// The verdicts are not recomputed here. acquisition/lib/winner.mjs is the authority on
// SCALE / ITERATE / STOP / INSUFFICIENT_DATA, and this module only converts verdicts
// that already exist into a ranking prior, subject to two guards:
//
//   1. a STOP route is in cooldown and is not regenerated during the window
//   2. a reserved share of ranked capacity always goes to candidates with no prior
//      measured outcome, so yesterday's winner cannot suppress new evidence

import { classifyRoute } from '../../lib/winner.mjs';

const MS_PER_DAY = 86400000;

export const VERDICT_PRIOR = Object.freeze({
  SCALE: 1.25,
  ITERATE: 1.0,
  STOP: 0.0,
  INSUFFICIENT_DATA: 1.0
});

/**
 * Classify measured outcomes per asset route using the existing winner logic.
 * @param {Array} routes route measurement records, in the shape lib/winner.mjs expects
 */
export function classifyOutcomes(routes = []) {
  const byAsset = new Map();
  for (const route of routes) {
    const verdict = classifyRoute(route);
    const key = route.asset_id || route.route_id;
    const prior = byAsset.get(key);
    // Worst verdict wins per asset: one STOPped route holds the whole asset in cooldown
    // rather than being averaged away by a healthier sibling.
    const rank = { STOP: 0, INSUFFICIENT_DATA: 1, ITERATE: 2, SCALE: 3 };
    if (!prior || rank[verdict.verdict] < rank[prior.verdict]) {
      byAsset.set(key, {
        asset_id: key,
        verdict: verdict.verdict,
        reasons: verdict.reasons,
        measurement: verdict.measurement,
        decided_at: route.decided_at || null
      });
    }
  }
  return byAsset;
}

/** Is this asset inside a STOP cooldown window? */
export function inStopCooldown(outcome, policy, now = Date.now()) {
  if (!outcome || outcome.verdict !== 'STOP') return { stopped: false };
  const days = policy?.exploration?.stop_cooldown_days ?? 14;
  const decided = Date.parse(outcome.decided_at);
  if (!Number.isFinite(decided)) {
    return { stopped: true, until: null, reason: `route is STOPped and carries no decision date; it stays in cooldown until one is recorded` };
  }
  const until = decided + days * MS_PER_DAY;
  if (now < until) {
    return { stopped: true, until: new Date(until).toISOString(), reason: `STOP verdict is in a ${days}-day cooldown until ${new Date(until).toISOString()}` };
  }
  return { stopped: false, until: new Date(until).toISOString() };
}

/**
 * Rank promoted candidates.
 *
 * Returns { ranked, suppressed, exploration } where `ranked` is ordered by
 * priority score, `suppressed` lists candidates held out of the run and why, and
 * `exploration` reports how the reserved capacity was honoured.
 */
export function rankCandidates(candidates, { policy, outcomes = new Map(), now = Date.now(), capacity = null } = {}) {
  const maxBoost = policy?.exploration?.max_winner_boost ?? 1.25;
  const reservedShare = policy?.exploration?.reserved_share ?? 0.3;

  const suppressed = [];
  const scored = [];

  for (const candidate of candidates) {
    const outcome = candidate.asset_id ? outcomes.get(candidate.asset_id) : null;
    const cooldown = inStopCooldown(outcome, policy, now);
    if (cooldown.stopped) {
      suppressed.push({
        source_candidate_id: candidate.source_candidate_id,
        asset_id: candidate.asset_id,
        reason: 'STOP_COOLDOWN',
        detail: cooldown.reason,
        until: cooldown.until
      });
      continue;
    }

    const prior = outcome ? Math.min(VERDICT_PRIOR[outcome.verdict] ?? 1, maxBoost) : 1;
    const explored = Boolean(outcome && outcome.verdict !== 'INSUFFICIENT_DATA');
    scored.push({
      source_candidate_id: candidate.source_candidate_id,
      thesis_id: candidate.thesis_id,
      asset_id: candidate.asset_id,
      status: candidate.status,
      revenue_signal_score: candidate.revenue_signal_score,
      evidence_strength: candidate.evidence_strength,
      asset_fit_score: candidate.asset_fit_score,
      prior_verdict: outcome?.verdict ?? 'NO_MEASURED_OUTCOME',
      prior_multiplier: prior,
      lane: explored ? 'EXPLOIT' : 'EXPLORE',
      priority: Number((candidate.revenue_signal_score * prior).toFixed(2))
    });
  }

  scored.sort((a, b) =>
    b.priority - a.priority ||
    b.asset_fit_score - a.asset_fit_score ||
    a.source_candidate_id.localeCompare(b.source_candidate_id));

  const slots = Number.isFinite(capacity) ? capacity : scored.length;
  const reserved = Math.min(
    Math.floor(slots * reservedShare) || (slots > 0 && reservedShare > 0 ? 1 : 0),
    scored.filter((c) => c.lane === 'EXPLORE').length
  );

  // Interleave: fill the reserved slots with the strongest unexplored candidates first,
  // then fill the remainder by raw priority. Without this an asset that already won once
  // would take every slot forever.
  const explore = scored.filter((c) => c.lane === 'EXPLORE');
  const ranked = [];
  const taken = new Set();
  for (const candidate of explore.slice(0, reserved)) {
    ranked.push(candidate);
    taken.add(candidate.source_candidate_id);
  }
  for (const candidate of scored) {
    if (ranked.length >= slots) break;
    if (taken.has(candidate.source_candidate_id)) continue;
    ranked.push(candidate);
    taken.add(candidate.source_candidate_id);
  }
  ranked.sort((a, b) => b.priority - a.priority || a.source_candidate_id.localeCompare(b.source_candidate_id));

  return {
    ranked,
    suppressed,
    exploration: {
      reserved_share: reservedShare,
      reserved_slots: reserved,
      explore_candidates: explore.length,
      exploit_candidates: scored.length - explore.length,
      granted_explore_slots: ranked.filter((c) => c.lane === 'EXPLORE').length,
      note: 'Reserved capacity guarantees newly corroborated demand is ranked even when an existing route already has a measured win.'
    }
  };
}
