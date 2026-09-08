// Which routes have actually won, and what that changes.
//
// A "winner" is not the route with the most clicks, the best conversion rate, or
// the highest confidence score. It is a route where a human paid, and the payment
// provider says so. Nothing else qualifies - not a checkout that opened, not an
// analytics event, not a model's assessment, not an internal note.
//
// That bar is deliberately brutal, because the alternative is the failure mode this
// system exists to avoid: promoting a route on the strength of intermediate metrics
// and then discovering the funnel ended in nothing. Until a real purchase happens,
// the honest answer to "what is winning?" is "nothing is", and every function here
// returns that answer rather than the closest available substitute.
//
// The second job of this file is what follows a win. Once a route has produced
// money, attention should move toward signals that resemble it and away from
// exploring new capabilities. Exploration is not banned - it is DEPRIORITISED, and
// the reason is recorded, so the decision is visible rather than a silent change in
// behaviour.

import { canSupportMoneyClaim, PAID_STATUSES } from './evidence.mjs';

/**
 * Does this signal's evidence say money actually moved?
 *
 * Evidence only - it says nothing about the signal's state. Kept separate because a
 * freshly read Stripe payment carries verified evidence while still sitting at NEW,
 * and conflating "the evidence is good" with "we have accepted it" is how a record
 * gets promoted before anything checked which route it belongs to.
 */
export function carriesVerifiedPayment(signal) {
  if (!canSupportMoneyClaim(signal?.evidence)) return false;
  return PAID_STATUSES.includes(signal.evidence.payment_status);
}

/** A signal is a win only in this exact state, with this exact evidence. */
export function isWinningSignal(signal) {
  if (!signal || signal.status !== 'WON') return false;
  if (!canSupportMoneyClaim(signal.evidence)) return false;
  return PAID_STATUSES.includes(signal.evidence.payment_status);
}

/**
 * A payment that has been verified but whose route has not yet been promoted.
 *
 * Kept separate from a winner because they are different facts: PAID means the money
 * arrived, WON means we have accepted it as the outcome of a route. Collapsing them
 * would let a payment with no identifiable route promote something arbitrary.
 */
export function isVerifiedPayment(signal) {
  if (!signal) return false;
  if (signal.status !== 'PAID' && signal.status !== 'WON') return false;
  if (!canSupportMoneyClaim(signal.evidence)) return false;
  return PAID_STATUSES.includes(signal.evidence.payment_status);
}

/**
 * Everything a signal can be matched on when asking "is this like the thing that
 * won?". Ordered strongest first: the same chain is the same revenue attempt, the
 * same route is the same link, the same asset is the same product.
 */
function traitsOf(signal) {
  return {
    correlation_id: signal?.correlation_id ?? null,
    route_id: signal?.route_id ?? null,
    asset_id: signal?.existing_asset_match ?? null
  };
}

/**
 * Find the winners in a set of signals.
 *
 * Returns one entry per winning route, carrying the payment reference that proves
 * it. A caller that wants to know whether anything has won at all should check
 * `.length`; there is deliberately no "best candidate" fallback, because a
 * best-candidate winner is exactly the fiction this function exists to prevent.
 */
export function findWinners(signals = []) {
  const winners = new Map();
  for (const signal of signals) {
    if (!isWinningSignal(signal)) continue;
    const traits = traitsOf(signal);
    // Keyed on the strongest identifier the signal actually has. A win with no
    // route and no asset still counts as a win - it just cannot teach us which
    // route to prefer, and saying so is more useful than attributing it to a guess.
    const key = traits.route_id ?? traits.asset_id ?? traits.correlation_id;
    if (!key) continue;
    const prior = winners.get(key);
    const entry = prior ?? {
      key,
      route_id: traits.route_id,
      asset_id: traits.asset_id,
      correlation_ids: new Set(),
      payment_refs: [],
      wins: 0,
      first_won_at: signal.updated_at ?? signal.detected_at ?? null
    };
    entry.wins += 1;
    entry.payment_refs.push(signal.evidence.ref);
    if (traits.correlation_id) entry.correlation_ids.add(traits.correlation_id);
    if (!entry.route_id && traits.route_id) entry.route_id = traits.route_id;
    if (!entry.asset_id && traits.asset_id) entry.asset_id = traits.asset_id;
    winners.set(key, entry);
  }
  return [...winners.values()].map((w) => ({ ...w, correlation_ids: [...w.correlation_ids] }));
}

/**
 * Promote a verified payment to a winning route.
 *
 * Refuses, with a reason, in every case where promotion would assert something the
 * evidence does not support. The refusals are the point of the function; the
 * success path is one line.
 */
export function promoteToWinner(signal) {
  if (!signal) return { ok: false, reason: 'no signal' };
  if (!canSupportMoneyClaim(signal.evidence)) {
    return { ok: false, reason: 'a route is promoted by payment-provider evidence, not by a click, a checkout or a score' };
  }
  if (!PAID_STATUSES.includes(signal.evidence.payment_status)) {
    return { ok: false, reason: `payment_status ${signal.evidence.payment_status ?? 'absent'} does not mean money moved` };
  }
  if (signal.status !== 'PAID') {
    return { ok: false, reason: `a winner is promoted from PAID; this signal is ${signal.status}` };
  }
  if (!signal.route_id && !signal.existing_asset_match) {
    // The money is real, but nothing says which route earned it. Promoting anyway
    // would attribute a genuine payment to an arbitrary route, which is worse than
    // leaving it unattributed.
    return { ok: false, reason: 'payment is verified but carries no route_id or asset; it cannot promote a route it cannot name' };
  }
  return { ok: true, route_id: signal.route_id ?? null, asset_id: signal.existing_asset_match ?? null };
}

/**
 * How much a signal resembles something that has already won. 0 means no
 * resemblance; higher means a stronger reason to look at it first.
 */
export function similarityToWinners(signal, winners = []) {
  let best = 0;
  let matched = null;
  const traits = traitsOf(signal);
  for (const winner of winners) {
    let score = 0;
    if (traits.correlation_id && winner.correlation_ids.includes(traits.correlation_id)) score = 100;
    else if (traits.route_id && traits.route_id === winner.route_id) score = 70;
    else if (traits.asset_id && traits.asset_id === winner.asset_id) score = 40;
    if (score > best) { best = score; matched = winner.key; }
  }
  return { score: best, matched_winner: matched };
}

/**
 * Order work once something has won.
 *
 * Signal priority still dominates - a payment is read before a market observation
 * whatever else is true - and resemblance to a winner breaks ties beneath it. That
 * ordering is deliberate: winner-affinity should focus attention, not let a stale
 * market note outrank a live payment because it happens to mention the right asset.
 */
export function prioritise(signals, winners = [], { priorityOf }) {
  return [...signals]
    .map((signal) => ({ signal, similarity: similarityToWinners(signal, winners) }))
    .sort((a, b) => {
      const byPriority = priorityOf(b.signal) - priorityOf(a.signal);
      if (byPriority !== 0) return byPriority;
      return b.similarity.score - a.similarity.score;
    });
}

/**
 * Whether this run should still spend effort on new capabilities.
 *
 * With no winner, exploration is the only way to find one, so it stays open. With a
 * winner, it closes - not silently: the returned reason is written into the run
 * trace, so "we stopped exploring" is a recorded decision that can be revisited,
 * rather than a behaviour change nobody can point at.
 */
export function explorationPosture(winners = []) {
  if (!winners.length) {
    return {
      explore: true,
      reason: 'no route has produced verified payment evidence, so there is nothing yet to exploit'
    };
  }
  return {
    explore: false,
    reason: `${winners.length} route(s) have verified payments; effort goes to signals resembling them before any new capability`,
    winning_routes: winners.map((w) => w.route_id ?? w.asset_id ?? w.key)
  };
}
