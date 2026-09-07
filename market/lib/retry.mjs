// Retry and circuit breaker contract.
//
// Every automated route carries its own retry budget. There is no global "just try
// again" - a route that fails the same way repeatedly stops and asks for a human
// rather than burning free API quota or getting an account rate-limited.
//
// The distinction that matters: a TRANSIENT failure is worth retrying, a
// PERMANENT one is not, and an UNKNOWN one is retried a bounded number of times
// and then escalated. Classifying every failure as transient is how a loop spins
// for a day against a 401.

export const FAILURE_CLASSES = Object.freeze([
  'TRANSIENT',      // network blip, 5xx, timeout - worth another attempt
  'RATE_LIMITED',   // back off hard, the upstream is telling us to slow down
  'PERMANENT',      // 4xx that will not change on retry: bad request, not found
  'AUTH',           // credentials wrong or expired - a human must fix it
  'QUOTA_EXHAUSTED',// free capacity gone - defer, do not upgrade to paid
  'UNKNOWN'
]);

export const CIRCUIT_STATES = Object.freeze(['CLOSED', 'OPEN', 'HALF_OPEN']);

export const DEFAULT_POLICY = Object.freeze({
  max_attempts: 3,
  base_backoff_seconds: 30,
  max_backoff_seconds: 3600,
  open_after_consecutive_failures: 3,
  // How long the breaker stays open before one probe is allowed through.
  cooldown_seconds: 1800
});

// Which classes are worth another attempt at all.
const RETRYABLE = Object.freeze(['TRANSIENT', 'RATE_LIMITED', 'UNKNOWN']);

// Classes that must never be retried silently - they need a person.
const HUMAN_CLASSES = Object.freeze(['AUTH']);

export function classifyFailure({ status = null, code = null, message = '' } = {}) {
  const text = String(message || '').toLowerCase();
  if (status === 401 || status === 403 || /unauthor|forbidden|invalid api key|credential/.test(text)) {
    return 'AUTH';
  }
  if (status === 429 || /rate limit|too many requests/.test(text)) return 'RATE_LIMITED';
  if (/quota|capacity|exhaust|neuron|free tier/.test(text)) return 'QUOTA_EXHAUSTED';
  if (status !== null && status >= 500) return 'TRANSIENT';
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND' || /timeout|socket hang up/.test(text)) {
    return 'TRANSIENT';
  }
  if (status !== null && status >= 400) return 'PERMANENT';
  return 'UNKNOWN';
}

function backoffSeconds(attempt, policy) {
  const raw = policy.base_backoff_seconds * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(raw, policy.max_backoff_seconds);
}

/**
 * Decide what happens after a failure.
 *
 * Returns the updated retry state plus the next allowed action, so the caller never
 * has to work out "should I try again?" on its own.
 */
export function recordFailure(state, failure, { policy = DEFAULT_POLICY, now = Date.now() } = {}) {
  const failureClass = failure.failure_class ?? classifyFailure(failure);
  const retryCount = (state?.retry_count ?? 0) + 1;
  const consecutive = (state?.consecutive_failures ?? 0) + 1;

  const base = {
    retry_count: retryCount,
    consecutive_failures: consecutive,
    last_failure: {
      class: failureClass,
      message: String(failure.message ?? '').slice(0, 500),
      at: new Date(now).toISOString()
    }
  };

  if (HUMAN_CLASSES.includes(failureClass)) {
    return {
      ...base,
      circuit_state: 'OPEN',
      next_retry_at: null,
      next_allowed_action: 'HUMAN_REQUIRED',
      resume_condition: 'a human fixes the credential, then the route is re-enabled'
    };
  }

  if (failureClass === 'QUOTA_EXHAUSTED') {
    return {
      ...base,
      circuit_state: 'OPEN',
      next_retry_at: new Date(now + policy.cooldown_seconds * 1000).toISOString(),
      next_allowed_action: 'WAITING_FOR_FREE_CAPACITY',
      resume_condition: 'free capacity returns; never upgrade to a paid tier to get past this'
    };
  }

  if (!RETRYABLE.includes(failureClass)) {
    return {
      ...base,
      circuit_state: 'OPEN',
      next_retry_at: null,
      next_allowed_action: 'STOP',
      resume_condition: 'the underlying request must change; retrying it unchanged cannot succeed'
    };
  }

  if (retryCount >= policy.max_attempts || consecutive >= policy.open_after_consecutive_failures) {
    return {
      ...base,
      circuit_state: 'OPEN',
      next_retry_at: new Date(now + policy.cooldown_seconds * 1000).toISOString(),
      next_allowed_action: 'PAUSE',
      resume_condition: `cooldown of ${policy.cooldown_seconds}s elapses, then one probe attempt`
    };
  }

  return {
    ...base,
    circuit_state: 'CLOSED',
    next_retry_at: new Date(now + backoffSeconds(retryCount, policy) * 1000).toISOString(),
    next_allowed_action: 'RETRY',
    resume_condition: null
  };
}

export function recordSuccess(state, { now = Date.now() } = {}) {
  return {
    retry_count: 0,
    consecutive_failures: 0,
    last_failure: state?.last_failure ?? null,
    circuit_state: 'CLOSED',
    next_retry_at: null,
    next_allowed_action: 'PROCEED',
    resume_condition: null,
    last_success_at: new Date(now).toISOString()
  };
}

/**
 * May this route run right now?
 * An OPEN breaker whose cooldown has passed is allowed exactly one probe.
 */
export function mayAttempt(state, { now = Date.now() } = {}) {
  if (!state || state.circuit_state === 'CLOSED') return { ok: true, mode: 'NORMAL' };
  if (state.next_allowed_action === 'HUMAN_REQUIRED') {
    return { ok: false, reason: 'HUMAN_REQUIRED', detail: state.resume_condition };
  }
  if (!state.next_retry_at) {
    return { ok: false, reason: state.next_allowed_action ?? 'STOP', detail: state.resume_condition };
  }
  const at = Date.parse(state.next_retry_at);
  if (Number.isFinite(at) && at <= now) return { ok: true, mode: 'HALF_OPEN' };
  return { ok: false, reason: 'COOLING_DOWN', detail: `next attempt at ${state.next_retry_at}` };
}
