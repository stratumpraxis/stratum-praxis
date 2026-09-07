// The evidence contract.
//
// Evidence is what makes a claim checkable by somebody who was not there. Every
// state change that asserts something about the outside world carries one, and the
// kinds are ranked so that "an agent said so" can never outrank "the payment
// provider said so".
//
// The ranking is the whole point. A model's own report of success is the weakest
// class in the system and is explicitly not sufficient for any money-bearing state.

export const EVIDENCE_KINDS = Object.freeze([
  'PAYMENT_PROVIDER',   // Stripe et al: a payment record with an id we can look up
  'PLATFORM_PAYLOAD',   // the external platform's own event body
  'HTTP_OBSERVATION',   // a live request we made and recorded the result of
  'ANALYTICS_EVENT',    // PostHog: a human did something measurable
  'REPO_STATE',         // a file or commit in the repository
  'MODEL_ASSERTION',    // an AI said it - the weakest class, never money-bearing
  'NONE'
]);

// Higher is stronger. Used when two pieces of evidence disagree.
export const EVIDENCE_STRENGTH = Object.freeze({
  PAYMENT_PROVIDER: 100,
  PLATFORM_PAYLOAD: 80,
  HTTP_OBSERVATION: 70,
  ANALYTICS_EVENT: 60,
  REPO_STATE: 40,
  MODEL_ASSERTION: 10,
  NONE: 0
});

/** The only payment_status values that mean money actually moved. */
export const PAID_STATUSES = Object.freeze(['paid', 'succeeded']);

// Only these may support a claim that money moved.
export const MONEY_BEARING = Object.freeze(['PAYMENT_PROVIDER']);

export function validateEvidence(evidence) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object') return ['evidence must be an object'];
  if (!EVIDENCE_KINDS.includes(evidence.kind)) {
    errors.push(`unknown evidence kind ${evidence.kind}; allowed: ${EVIDENCE_KINDS.join(', ')}`);
  }
  if (evidence.kind && evidence.kind !== 'NONE' && !evidence.ref) {
    errors.push(`${evidence.kind} evidence requires a ref that someone else can look up`);
  }
  if (evidence.kind === 'PAYMENT_PROVIDER' && !evidence.provider) {
    errors.push('PAYMENT_PROVIDER evidence must name the provider');
  }
  return errors;
}

export function strengthOf(evidence) {
  return EVIDENCE_STRENGTH[evidence?.kind] ?? 0;
}

export function canSupportMoneyClaim(evidence) {
  if (!MONEY_BEARING.includes(evidence?.kind)) return false;
  if (validateEvidence(evidence).length !== 0) return false;
  // Being a Stripe record is not the same as being a paid one. A Checkout Session
  // that was created and abandoned is PAYMENT_PROVIDER evidence of a NON-payment,
  // and treating the kind alone as sufficient is how an open session turns into
  // reported revenue. state.mjs applies the same rule; both are kept in force so
  // neither can be bypassed by calling the other.
  if (evidence.payment_status && !PAID_STATUSES.includes(evidence.payment_status)) return false;
  return true;
}


/**
 * Build an evidence record. Refuses to mint PAYMENT_PROVIDER evidence without the
 * fields that make it verifiable, so the strongest class cannot be forged by
 * accident somewhere upstream.
 */
export function makeEvidence(kind, { ref, provider = null, observed_at = null, detail = null,
                                     payment_status = null } = {}) {
  const record = {
    kind,
    ref: ref ?? null,
    provider,
    observed_at: observed_at ?? new Date().toISOString(),
    detail: detail ?? null,
    ...(payment_status ? { payment_status } : {})
  };
  const errors = validateEvidence(record);
  if (errors.length) throw new Error(`invalid evidence: ${errors.join('; ')}`);
  return record;
}

/**
 * A run trace. This is what makes a run auditable after the fact: what triggered it,
 * what it decided, what it actually did, and what it refused to claim.
 */
export function makeTrace({ run_id, trigger, signals_seen = 0, signals_new = 0,
                            decisions = [], actions = [], failures = [],
                            store_kind = null, started_at, finished_at = null }) {
  return {
    run_id,
    trigger,
    store_kind,
    started_at,
    finished_at: finished_at ?? new Date().toISOString(),
    signals_seen,
    signals_new,
    decisions,
    actions,
    failures,
    // Stated on every trace so a reader never has to infer it from absence.
    verified_revenue: 0,
    payment_evidence_present: decisions.some((d) => d.evidence && canSupportMoneyClaim(d.evidence))
  };
}
