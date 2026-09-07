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
