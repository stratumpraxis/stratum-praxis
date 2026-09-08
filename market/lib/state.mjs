// The signal state machine.
//
// A signal's status is the one thing every part of the system agrees on, so the
// transitions are enumerated rather than left to whoever happens to be writing.
// Two rules are enforced here because breaking either one is how a system starts
// reporting revenue it does not have:
//
//   - PAID is reachable only from CHECKOUT, and only with payment-provider evidence.
//   - WON is reachable only from PAID. A click is not a checkout, a checkout is not
//     a payment, and a payment is not a win until it is verified.

export const STATUSES = Object.freeze([
  'NEW',
  'QUALIFIED',
  'ACTIONABLE',
  'ACTIONED',
  'WAITING',
  'HUMAN_SIGNAL',
  'CHECKOUT',
  'PAID',
  'WON',
  'PAUSED',
  'KILLED',
  'EXPIRED',
  'HUMAN_REQUIRED'
]);

// Terminal states never transition again. EXPIRED is terminal by design: a stale
// signal is re-ingested as a NEW signal with a fresh id, it is not resurrected.
export const TERMINAL = Object.freeze(['WON', 'KILLED', 'EXPIRED']);

const TRANSITIONS = Object.freeze({
  NEW:            ['QUALIFIED', 'WATCHING', 'PAUSED', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  QUALIFIED:      ['ACTIONABLE', 'WAITING', 'PAUSED', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  ACTIONABLE:     ['ACTIONED', 'WAITING', 'PAUSED', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  ACTIONED:       ['HUMAN_SIGNAL', 'WAITING', 'PAUSED', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  WAITING:        ['ACTIONABLE', 'ACTIONED', 'HUMAN_SIGNAL', 'PAUSED', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  HUMAN_SIGNAL:   ['CHECKOUT', 'WAITING', 'PAUSED', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  CHECKOUT:       ['PAID', 'WAITING', 'PAUSED', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  PAID:           ['WON', 'HUMAN_REQUIRED'],
  WON:            [],
  PAUSED:         ['QUALIFIED', 'ACTIONABLE', 'KILLED', 'EXPIRED', 'HUMAN_REQUIRED'],
  KILLED:         [],
  EXPIRED:        [],
  HUMAN_REQUIRED: ['QUALIFIED', 'ACTIONABLE', 'ACTIONED', 'PAUSED', 'KILLED', 'EXPIRED']
});

// WATCHING is an alias the decision contract may emit; it parks a signal without
// claiming it was qualified.
const ALIASES = Object.freeze({ WATCHING: 'WAITING' });

export function canTransition(from, to) {
  const target = ALIASES[to] ?? to;
  if (!STATUSES.includes(from)) return { ok: false, reason: `unknown current status ${from}` };
  if (!STATUSES.includes(target)) return { ok: false, reason: `unknown target status ${to}` };
  if (TERMINAL.includes(from)) return { ok: false, reason: `${from} is terminal` };
  const allowed = (TRANSITIONS[from] ?? []).map((s) => ALIASES[s] ?? s);
  if (!allowed.includes(target)) {
    return { ok: false, reason: `${from} -> ${target} is not an allowed transition` };
  }
  return { ok: true, target };
}

/**
 * Payment evidence gate.
 *
 * PAID and WON require a reference that a payment provider actually produced. A
 * checkout_click, a session id with no payment, or an internal note are all
 * refused. This is the single place that decides whether money is real, so it does
 * not accept a caller's word for it.
 */
export function hasPaymentEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') return false;
  if (evidence.kind !== 'PAYMENT_PROVIDER') return false;
  if (!evidence.provider || !evidence.ref) return false;
  // A Stripe Checkout Session that was merely created is not a payment.
  if (evidence.payment_status && evidence.payment_status !== 'paid') return false;
  return true;
}

/**
 * Apply a transition, returning the updated signal or an explicit refusal.
 * Never mutates the input.
 */
export function transition(signal, to, { evidence = null, reason = null, now = Date.now() } = {}) {
  const check = canTransition(signal.status, to);
  if (!check.ok) return { ok: false, reason: check.reason, signal };

  const target = check.target;
  if ((target === 'PAID' || target === 'WON') && !hasPaymentEvidence(evidence ?? signal.evidence)) {
    return {
      ok: false,
      reason: `${target} requires payment-provider evidence; a click or an open checkout session is not a payment`,
      signal
    };
  }

  return {
    ok: true,
    signal: {
      ...signal,
      status: target,
      updated_at: new Date(now).toISOString(),
      ...(evidence ? { evidence } : {}),
      transition_reason: reason ?? null
    }
  };
}

// States a signal may be walked THROUGH on its way somewhere else. Deliberately
// excludes every money-bearing state: PAID and WON are reached by one explicit,
// guarded step or not at all, so no amount of path-finding can arrive at them.
const WALKABLE = Object.freeze(['QUALIFIED', 'ACTIONABLE', 'ACTIONED', 'WAITING', 'HUMAN_SIGNAL']);
const NOT_WALKABLE_TO = Object.freeze(['PAID', 'WON']);

/**
 * Move a signal to a target status, walking the intermediate steps it must pass
 * through.
 *
 * This exists because of a real defect: the classifier decides ACTION on a signal
 * that is still NEW, and NEW -> ACTIONABLE is not a legal hop. The transition failed,
 * the signal stayed at NEW, and it was therefore never counted as an actionable
 * revenue route - a qualified buyer landed in the store and nothing downstream could
 * see it. Silently allowing NEW -> ACTIONABLE would have fixed the symptom by
 * deleting the qualification step; walking it keeps the step and records that it
 * happened.
 *
 * The walk is breadth-first over legal transitions and is hard-capped: money states
 * are never a waypoint and never a destination here, so the payment gate cannot be
 * routed around by asking for a target several hops away.
 */
export function advance(signal, to, { reason = null, now = Date.now() } = {}) {
  const target = ALIASES[to] ?? to;
  if (NOT_WALKABLE_TO.includes(target)) {
    return { ok: false, reason: `${target} is reached by one explicit guarded step, never by walking`, signal, path: [] };
  }
  const direct = transition(signal, target, { reason, now });
  if (direct.ok) return { ...direct, path: [target] };

  // One intermediate hop is enough for every legal shape in this machine, and
  // capping it there keeps the walk from inventing long journeys nobody intended.
  for (const via of WALKABLE) {
    if (via === target) continue;
    const first = transition(signal, via, { reason: `${reason ?? 'advance'} (via ${via})`, now });
    if (!first.ok) continue;
    const second = transition(first.signal, target, { reason, now });
    if (!second.ok) continue;
    return { ok: true, signal: second.signal, path: [via, target] };
  }
  return { ok: false, reason: direct.reason, signal, path: [] };
}

/**
 * The sources permitted to state that money moved.
 *
 * Hard-coded and short on purpose. Note what is NOT here: `dispatch:stripe`. An
 * event relayed through the bus carries Stripe's name but not Stripe's authority -
 * only a read this system performed directly against the payment provider counts.
 * The dispatch adapter refuses such a payload too; both locks stay in place so
 * neither can be removed by mistake.
 */
export const PAYMENT_PROVIDER_SOURCES = Object.freeze(['stripe']);

/**
 * Admit a payment record at PAID without walking the funnel.
 *
 * A Stripe payment does not click its way through the state machine - it IS the
 * payment, read from the provider, born at the end of the funnel. Forcing it through
 * NEW -> ... -> CHECKOUT would mean inventing a click that never happened, which is
 * the fabrication this system exists to prevent.
 *
 * So the entry exists, and it is deliberately narrow: payment-provider source,
 * PAYMENT type, paid provider evidence, and a record that has not been moved yet.
 * This is NOT a general NEW -> PAID transition - `canTransition('NEW', 'PAID')` stays
 * false, so a click, a market signal, or anything relayed by the bus still cannot
 * reach PAID however it is dressed up.
 */
export function admitPayment(signal, { now = Date.now() } = {}) {
  if (!signal || typeof signal !== 'object') return { ok: false, reason: 'no signal' };
  if (!PAYMENT_PROVIDER_SOURCES.includes(signal.source)) {
    return { ok: false, reason: `${signal.source} is not a payment provider; only ${PAYMENT_PROVIDER_SOURCES.join(', ')} may admit a payment` };
  }
  if (signal.signal_type !== 'PAYMENT') {
    return { ok: false, reason: `a ${signal.signal_type} signal is not a payment record` };
  }
  if (signal.status !== 'NEW') {
    return { ok: false, reason: `payment admission is for a freshly read record; this one is ${signal.status}` };
  }
  if (!hasPaymentEvidence(signal.evidence)) {
    return { ok: false, reason: 'admission requires payment-provider evidence saying the money moved' };
  }
  return {
    ok: true,
    signal: {
      ...signal,
      status: 'PAID',
      updated_at: new Date(now).toISOString(),
      transition_reason: 'payment record read directly from the payment provider'
    }
  };
}

/**
 * Sources whose events are a direct observation of a human act.
 *
 * PostHog only, and again not `dispatch:posthog`: the same event relayed through the
 * bus is a claim about an observation, not the observation.
 */
export const BEHAVIOUR_SOURCES = Object.freeze(['posthog']);

// What an observed act may be admitted as. Both are states a human reaches by
// acting, which is exactly what these events record. Neither is money-bearing.
const ADMISSIBLE_OBSERVATIONS = Object.freeze(['HUMAN_SIGNAL', 'CHECKOUT']);

/**
 * Admit an observed human act at the state it was observed in.
 *
 * The same argument as admitPayment, one step earlier in the funnel. A PostHog
 * `checkout_click` IS a human at a checkout; walking it there through ACTIONABLE and
 * ACTIONED would assert that this system decided on a route and took an action, when
 * in reality it only watched somebody click. The invented steps would then be
 * indistinguishable, in the ledger, from ones we actually took.
 *
 * The guard rails are the same and are what keep this from being a back door:
 * behaviour-source only, one of two non-money states only, and analytics evidence
 * only - so an event carrying payment evidence is refused here and has to go through
 * the payment lane, where the real gate is.
 */
export function admitObservation(signal, { now = Date.now() } = {}) {
  if (!signal || typeof signal !== 'object') return { ok: false, reason: 'no signal' };
  if (!BEHAVIOUR_SOURCES.includes(signal.source)) {
    return { ok: false, reason: `${signal.source} is not a source of observed behaviour` };
  }
  if (!ADMISSIBLE_OBSERVATIONS.includes(signal.signal_type)) {
    return { ok: false, reason: `a ${signal.signal_type} signal is not an observed human act` };
  }
  if (signal.status !== 'NEW') {
    return { ok: false, reason: `observation admission is for a freshly read event; this one is ${signal.status}` };
  }
  if (signal.evidence?.kind !== 'ANALYTICS_EVENT') {
    return { ok: false, reason: 'an observed act is admitted on analytics evidence; anything stronger belongs in its own lane' };
  }
  return {
    ok: true,
    signal: {
      ...signal,
      // The signal type IS the state: a checkout_click is at CHECKOUT, a cta click is
      // at HUMAN_SIGNAL. Neither can go further without evidence it does not carry.
      status: signal.signal_type,
      updated_at: new Date(now).toISOString(),
      transition_reason: 'human act observed directly by the analytics source'
    }
  };
}

/**
 * Sweep expired signals. Returns the signals whose TTL has passed and that are not
 * already terminal, so a caller can move them to EXPIRED in one pass.
 */
export function sweepExpired(signals, now = Date.now()) {
  return signals.filter((s) => {
    if (TERMINAL.includes(s.status)) return false;
    const at = Date.parse(s.expires_at ?? '');
    return Number.isFinite(at) && at <= now;
  });
}
