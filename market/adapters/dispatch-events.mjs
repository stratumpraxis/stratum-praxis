// repository_dispatch adapter - the leg where Make hands an external event to the
// repository.
//
// This is the only inbound path that is genuinely event-driven. Every other adapter
// reads a feed on a schedule and is therefore polling, however short the interval.
// Here the external world decides when this repository runs, which is the whole
// point of the architecture.
//
// It is also the least trustworthy input in the system, and is treated that way. A
// repository_dispatch payload is whatever the caller typed. So this adapter is built
// around one rule, enforced rather than documented:
//
//   MAKE IS A BUS. IT MAY NOT ASSERT A PAYMENT.
//
// A payload claiming PAYMENT, or carrying PAYMENT_PROVIDER evidence, is refused -
// not downgraded quietly, refused with a reason. Payment evidence enters this system
// through market/adapters/stripe-events.mjs reading Stripe, and through nothing
// else. Without that rule the entire payment-evidence gate is decorative: anyone who
// can call the dispatch API could mint revenue.
//
// What Make legitimately sends is the fact that something happened out there, with
// the chain ids that let it be joined to the rest of its revenue attempt.

import { normalizeSignal } from '../lib/signal.mjs';
import { makeEvidence } from '../lib/evidence.mjs';

// Claims a bus is not entitled to make, whatever the payload says.
const FORBIDDEN_SIGNAL_TYPES = Object.freeze(['PAYMENT']);
const FORBIDDEN_EVIDENCE_KINDS = Object.freeze(['PAYMENT_PROVIDER']);

// A bus relays; it does not decide. A payload arriving pre-set to a state further
// down the machine would skip the transitions - and their guards - entirely.
const ALLOWED_INBOUND_STATUS = Object.freeze(['NEW']);

/**
 * Accept both shapes a dispatch can carry:
 *
 *   { events: [...] } / { signals: [...] }  a batch
 *   { ...one event }                        a single event, which is what a Make
 *                                           scenario writes when it has one thing
 *                                           to say and no reason to wrap it
 */
export function eventsFrom(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.signals)) return payload.signals;
  if (Array.isArray(payload)) return payload;
  // A bare pointer payload - the shape documented in market/MAKE-HANDOFF.md - has a
  // signal_id and no event body. It is a reference to state Make already holds, not
  // an event, and is reported as such rather than turned into a hollow signal.
  if (payload.signal_id && !payload.signal_type) return [];
  if (payload.signal_type) return [payload];
  return [];
}

/**
 * Turn a dispatch payload into signals.
 *
 * Everything refused lands in `ignored` with a reason. Nothing is dropped silently:
 * a Make scenario that is sending something this side will not accept needs to find
 * that out from the run trace, not from a metric that quietly stays flat.
 */
export function toSignals(payload, { now = Date.now(), dispatchId = null } = {}) {
  const signals = [];
  const ignored = [];
  const refused = [];

  const events = eventsFrom(payload);

  for (const event of events) {
    const label = event?.external_id ?? event?.source_event_id ?? event?.subject ?? 'unlabelled';

    if (!event || typeof event !== 'object') {
      ignored.push({ id: null, reason: 'NOT_AN_OBJECT' });
      continue;
    }
    if (!event.signal_type) {
      ignored.push({ id: label, reason: 'NO_SIGNAL_TYPE' });
      continue;
    }
    if (!event.subject) {
      ignored.push({ id: label, reason: 'NO_SUBJECT' });
      continue;
    }

    // ---- the rules a bus does not get to break --------------------------------
    if (FORBIDDEN_SIGNAL_TYPES.includes(event.signal_type)) {
      refused.push({
        id: label,
        reason: 'BUS_MAY_NOT_ASSERT_PAYMENT',
        detail: 'a PAYMENT signal is produced by reading the payment provider, never by a dispatch payload'
      });
      continue;
    }
    if (FORBIDDEN_EVIDENCE_KINDS.includes(event.evidence?.kind)) {
      refused.push({
        id: label,
        reason: 'BUS_MAY_NOT_SUPPLY_PAYMENT_EVIDENCE',
        detail: 'PAYMENT_PROVIDER evidence is minted from Stripe, not relayed through the event bus'
      });
      continue;
    }
    if (event.status && !ALLOWED_INBOUND_STATUS.includes(event.status)) {
      refused.push({
        id: label,
        reason: 'BUS_MAY_NOT_SET_STATE',
        detail: `a dispatch may not deliver a signal already in ${event.status}; the state machine decides that here`
      });
      continue;
    }

    // The upstream id. Make's own execution/bundle id when it sends one, otherwise
    // whatever the original platform called the event. A dispatch with neither
    // cannot be deduplicated, so it is refused rather than given a minted id - an
    // invented id would make every redelivery look like a new event.
    const sourceEventId = event.source_event_id ?? event.external_id ?? null;
    if (!sourceEventId) {
      refused.push({
        id: label,
        reason: 'NO_UPSTREAM_EVENT_ID',
        detail: 'without the upstream id a redelivery cannot be recognised, so every retry would be counted as new demand'
      });
      continue;
    }

    try {
      signals.push(normalizeSignal({
        signal_type: event.signal_type,
        // Namespaced so a signal that arrived through the bus is never mistaken for
        // one this repository read from the platform itself. They carry different
        // amounts of trust and the store should show which is which.
        source: event.source ? `dispatch:${event.source}` : 'dispatch',
        source_url: event.source_url ?? null,
        external_id: String(event.external_id ?? sourceEventId),
        source_event_id: String(sourceEventId),
        detected_at: event.detected_at ?? new Date(now).toISOString(),
        subject: event.subject,
        buyer_or_human: event.buyer_or_human ?? null,
        demand_type: event.demand_type,
        revenue_distance: event.revenue_distance,
        confidence: event.confidence,
        existing_asset_match: event.existing_asset_match ?? null,
        route_id: event.route_id ?? null,

        // Chain ids are relayed, not regenerated. Make may already have a chain
        // running - a scenario that saw the click is entitled to say which chain
        // this belongs to, and overwriting that would sever the link it just made.
        correlation_id: event.correlation_id ?? null,
        correlation_ref: event.correlation_ref ?? event.client_reference_id ?? null,
        event_properties: event.properties ?? null,
        causation_id: event.causation_id ?? null,
        action_id: event.action_id ?? null,

        // The evidence is the payload itself: this is what the bus delivered, and a
        // reader can go and look at the dispatch to check. That is a real class of
        // evidence, and a weaker one than reading the platform directly - which is
        // exactly how it ranks in market/lib/evidence.mjs.
        evidence: makeEvidence('PLATFORM_PAYLOAD', {
          ref: `dispatch:${dispatchId ?? 'unknown'}:${sourceEventId}`,
          detail: `relayed by ${event.source ?? 'the event bus'}`,
          observed_at: new Date(now).toISOString()
        }),
        raw_ref: `dispatch:${sourceEventId}`
      }, { now }));
    } catch (err) {
      ignored.push({ id: label, reason: 'CONTRACT_REJECTED', detail: err.message });
    }
  }

  return { signals, ignored, refused };
}

/**
 * Read the payload from a file (how a workflow hands it over - a client_payload can
 * contain anything, and putting it through a file rather than an argv string keeps
 * quoting out of the shell) or from an object already in hand.
 */
export async function ingest({ now = Date.now(), payload = null, payloadFile = null,
                              dispatchId = null } = {}) {
  let body = payload;
  if (!body && payloadFile) {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(payloadFile, 'utf8');
    try {
      body = JSON.parse(raw);
    } catch (err) {
      const parseError = new Error(`dispatch payload is not valid JSON: ${err.message}`);
      parseError.failure_class = 'PERMANENT';
      throw parseError;
    }
  }
  if (!body) {
    const err = new Error('the dispatch source needs a client_payload; pass --payload-file or --payload');
    err.failure_class = 'PERMANENT';
    throw err;
  }

  const { signals, ignored, refused } = toSignals(body, { now, dispatchId });
  return {
    source_url: `repository_dispatch:market_signal${dispatchId ? `:${dispatchId}` : ''}`,
    fetched: eventsFrom(body).length,
    signals,
    ignored,
    // Surfaced separately from `ignored` because a refusal is a rule firing, not a
    // shrug. A run whose refusals are climbing means something upstream is trying to
    // do what this side will not let it.
    refused
  };
}
