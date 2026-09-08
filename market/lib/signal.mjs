// The external signal contract.
//
// Every external event that enters MARKET is normalised into one shape before
// anything else looks at it. Qualification, routing, dedupe and state transition
// never have to know which source an event came from.
//
// Two properties matter more than the field list:
//
//   1. signal_id is DETERMINISTIC. The same external fact produces the same id no
//      matter how many times, or through how many paths, it arrives. That is what
//      makes the pipeline idempotent - a Make retry, a webhook redelivery and a
//      manual replay all collapse onto one row.
//   2. Signals EXPIRE. Market information is perishable. A signal with no TTL will
//      still look "actionable" long after the opportunity is gone, which is how a
//      queue fills up with work nobody should do.

import crypto from 'node:crypto';

import {
  ACTION_ID_RE, CORRELATION_ID_RE, EVENT_ID_RE,
  checkoutReference, eventId, resolveCorrelation
} from './correlation.mjs';

export const SIGNAL_TYPES = Object.freeze([
  'PAYMENT',
  'HUMAN_SIGNAL',
  'CHECKOUT',
  'BUYER_DEMAND',
  'MARKET'
]);

// Priority order from the directive. PAYMENT outranks everything; a general market
// observation never outranks a human who actually did something.
export const SIGNAL_PRIORITY = Object.freeze({
  PAYMENT: 100,
  HUMAN_SIGNAL: 80,
  CHECKOUT: 60,
  BUYER_DEMAND: 40,
  MARKET: 20
});

export const DEMAND_TYPES = Object.freeze([
  'EXPLICIT_PURCHASE',
  'EXPLICIT_INTENT',
  'IMPLICIT_INTENT',
  'PROBLEM_STATEMENT',
  'RESEARCH',
  'NONE'
]);

// How far this signal sits from money. Used for ordering work, never as evidence
// that money moved.
export const REVENUE_DISTANCE = Object.freeze(['PAID', 'NEAR', 'MID', 'FAR', 'UNKNOWN']);

const REQUIRED = Object.freeze([
  'signal_id', 'signal_type', 'source', 'detected_at', 'subject',
  'demand_type', 'revenue_distance', 'confidence', 'status', 'evidence',
  // The chain ids are required, not optional enrichment. An event that cannot say
  // which upstream delivery it is, or which revenue attempt it belongs to, cannot be
  // traced end to end - and an untraceable event is exactly the one that later gets
  // counted twice or attributed to the wrong route.
  'event_id', 'source_event_id', 'correlation_id'
]);

// Time-to-live per signal type, in seconds. A payment is a permanent fact; a
// general market observation goes stale fast.
export const DEFAULT_TTL_SECONDS = Object.freeze({
  PAYMENT: 315360000,     // 10 years - a payment does not stop having happened
  HUMAN_SIGNAL: 604800,   // 7 days
  CHECKOUT: 259200,       // 3 days
  BUYER_DEMAND: 1209600,  // 14 days
  MARKET: 172800          // 48 hours
});

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

/**
 * Deterministic signal id.
 *
 * Built only from facts that identify the external event itself - never from the
 * time WE processed it, never from a random value. Two ingests of the same upstream
 * fact must produce the same id or idempotency is a lie.
 */
export function signalId({ source, signal_type: type, external_id: externalId, subject }) {
  const parts = [source, type, externalId ?? '', subject ?? ''].map((p) => String(p ?? '').trim());
  if (!parts[0] || !parts[1]) throw new Error('signalId requires at least source and signal_type');
  if (!parts[2] && !parts[3]) throw new Error('signalId requires external_id or subject to be stable');
  return `sig_${sha256(parts.join(' ')).slice(0, 32)}`;
}

export function isExpired(signal, now = Date.now()) {
  if (!signal?.expires_at) return false;
  const at = Date.parse(signal.expires_at);
  return Number.isFinite(at) && at <= now;
}

export function priorityOf(signal) {
  return SIGNAL_PRIORITY[signal?.signal_type] ?? 0;
}

function numberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalise a raw adapter payload into the signal contract.
 *
 * Adapters extract; this is the only place that decides the final shape, the id and
 * the expiry. Anything an adapter cannot honestly determine stays null rather than
 * being guessed - an invented confidence is worse than no confidence.
 */
export function normalizeSignal(raw, { now = Date.now(), ttlSeconds = null } = {}) {
  const type = raw.signal_type;
  if (!SIGNAL_TYPES.includes(type)) {
    throw new Error(`unknown signal_type ${type}; allowed: ${SIGNAL_TYPES.join(', ')}`);
  }
  const detectedAt = raw.detected_at ?? new Date(now).toISOString();
  const ttl = ttlSeconds ?? raw.ttl_seconds ?? DEFAULT_TTL_SECONDS[type];
  const base = Date.parse(detectedAt);
  const expiresAt = Number.isFinite(base)
    ? new Date(base + ttl * 1000).toISOString()
    : new Date(now + ttl * 1000).toISOString();

  const id = raw.signal_id ?? signalId(raw);

  // The upstream's own id for this delivery. It falls back to external_id because
  // for several sources they are the same thing - a GitHub event has one id and it
  // is both. Where they differ (Make redelivering a Stripe event, say) the adapter
  // passes both and the distinction is preserved.
  const sourceEventId = raw.source_event_id ?? raw.external_id ?? id;

  // What joins this event to the rest of its revenue attempt. An adapter may hand
  // over a reference it knows crosses the boundary; otherwise it is rebuilt from the
  // analytics properties the same way the page builds client_reference_id.
  const reference = raw.correlation_ref
    ?? (raw.event_properties ? checkoutReference(raw.event_properties) : null);
  const { correlation_id: correlationId, correlation_basis: correlationBasis } = resolveCorrelation({
    correlation_id: raw.correlation_id,
    reference,
    signal_id: id
  });

  return {
    signal_id: id,
    signal_type: type,
    source: raw.source,
    source_url: raw.source_url ?? null,
    external_id: raw.external_id ?? null,
    detected_at: detectedAt,
    ingested_at: new Date(now).toISOString(),
    expires_at: expiresAt,
    subject: raw.subject,
    buyer_or_human: raw.buyer_or_human ?? null,
    demand_type: DEMAND_TYPES.includes(raw.demand_type) ? raw.demand_type : 'NONE',
    existing_asset_match: raw.existing_asset_match ?? null,
    revenue_distance: REVENUE_DISTANCE.includes(raw.revenue_distance) ? raw.revenue_distance : 'UNKNOWN',
    revenue_probability: numberOrNull(raw.revenue_probability),
    confidence: numberOrNull(raw.confidence) ?? 0,
    urgency: raw.urgency ?? null,
    route_id: raw.route_id ?? null,

    // ---- chain identity -------------------------------------------------------
    source_event_id: String(sourceEventId),
    event_id: raw.event_id ?? eventId({ source: raw.source, source_event_id: sourceEventId }),
    correlation_id: correlationId,
    // How the chain root was decided. SELF means nothing joined this event to
    // anything else, which is a measurement fact worth keeping rather than hiding:
    // a run full of SELF correlations means attribution is not actually reaching
    // the boundary.
    correlation_basis: correlationBasis,
    correlation_ref: reference ?? null,
    causation_id: raw.causation_id ?? null,
    action_id: raw.action_id ?? null,

    status: raw.status ?? 'NEW',
    evidence: raw.evidence ?? { kind: 'NONE', ref: null },
    raw_ref: raw.raw_ref ?? null
  };
}

export function validateSignal(signal) {
  const errors = [];
  if (!signal || typeof signal !== 'object') return ['signal must be an object'];
  for (const field of REQUIRED) {
    if (signal[field] === undefined || signal[field] === null || signal[field] === '') {
      errors.push(`missing required field ${field}`);
    }
  }
  if (signal.signal_type && !SIGNAL_TYPES.includes(signal.signal_type)) {
    errors.push(`unknown signal_type ${signal.signal_type}`);
  }
  if (signal.demand_type && !DEMAND_TYPES.includes(signal.demand_type)) {
    errors.push(`unknown demand_type ${signal.demand_type}`);
  }
  if (signal.revenue_distance && !REVENUE_DISTANCE.includes(signal.revenue_distance)) {
    errors.push(`unknown revenue_distance ${signal.revenue_distance}`);
  }
  if (signal.confidence !== undefined && signal.confidence !== null) {
    const c = Number(signal.confidence);
    if (!Number.isFinite(c) || c < 0 || c > 1) errors.push('confidence must be between 0 and 1');
  }
  if (signal.signal_id && !/^sig_[0-9a-f]{32}$/.test(signal.signal_id)) {
    errors.push('signal_id must be a deterministic sig_<32 hex> value');
  }
  if (!signal.expires_at) {
    errors.push('expires_at is required: a signal without a TTL never goes stale');
  }
  // The chain ids are checked for shape, not just presence. A free-form string here
  // would join nothing while looking as if it did.
  if (signal.event_id && !EVENT_ID_RE.test(signal.event_id)) {
    errors.push('event_id must be a deterministic evt_<32 hex> value');
  }
  if (signal.correlation_id && !CORRELATION_ID_RE.test(signal.correlation_id)) {
    errors.push('correlation_id must be a deterministic cor_<32 hex> value');
  }
  if (signal.causation_id && !EVENT_ID_RE.test(signal.causation_id)) {
    errors.push('causation_id must reference an event_id, so the cause can be looked up');
  }
  if (signal.action_id && !ACTION_ID_RE.test(signal.action_id)) {
    errors.push('action_id must be a deterministic act_<32 hex> value');
  }
  if (signal.causation_id && signal.causation_id === signal.event_id) {
    errors.push('an event cannot be its own cause');
  }
  return errors;
}

/**
 * Duplicate guard. Returns the signals that are genuinely new against what the
 * store already holds, plus the ones suppressed and why.
 *
 * Suppression reasons are kept distinct rather than collapsed into one "duplicate":
 * a redelivery inside one batch and a signal we processed a week ago are different
 * operational facts even though both end in "do not process again".
 */
export function dedupe(incoming, known, { now = Date.now() } = {}) {
  const seen = new Map(known.map((s) => [s.signal_id, s]));
  const fresh = [];
  const suppressed = [];
  const withinBatch = new Set();

  for (const signal of incoming) {
    if (withinBatch.has(signal.signal_id)) {
      suppressed.push({ signal_id: signal.signal_id, reason: 'DUPLICATE_IN_BATCH' });
      continue;
    }
    withinBatch.add(signal.signal_id);

    const prior = seen.get(signal.signal_id);
    if (!prior) { fresh.push(signal); continue; }

    suppressed.push({
      signal_id: signal.signal_id,
      reason: isExpired(prior, now) ? 'ALREADY_KNOWN_EXPIRED' : 'ALREADY_KNOWN'
    });
  }
  return { fresh, suppressed };
}
