// PostHog human-signal adapter.
//
// This is the lane that matters most before money: a human doing something
// deliberate is the strongest evidence available short of a payment. The events
// listed here are the ones already emitted by deployed pages - the vocabulary comes
// from acquisition/lib/taxonomy.mjs, not from a new list invented here, so a page
// and the engine cannot drift apart silently.
//
// PostHog is unreachable from the authoring sandbox (egress policy), so this runs
// from GitHub Actions where POSTHOG_PERSONAL_API_KEY exists. The contract is
// exercised by tests against fixtures either way.

import { normalizeSignal } from '../lib/signal.mjs';
import { makeEvidence } from '../lib/evidence.mjs';
import { proxyFetch } from '../lib/http.mjs';

// Which deployed events count as a human signal worth waking the loop for, and how
// close each one sits to money. A page view is not here on purpose: it is not a
// deliberate act.
export const HUMAN_EVENTS = Object.freeze({
  checkout_click:            { demand: 'EXPLICIT_INTENT',   distance: 'NEAR', confidence: 0.85, type: 'CHECKOUT' },
  primary_cta_click:         { demand: 'EXPLICIT_INTENT',   distance: 'MID',  confidence: 0.65, type: 'HUMAN_SIGNAL' },
  qualified_tool_action:     { demand: 'IMPLICIT_INTENT',   distance: 'MID',  confidence: 0.60, type: 'HUMAN_SIGNAL' },
  paid_offer_exposure:       { demand: 'IMPLICIT_INTENT',   distance: 'MID',  confidence: 0.45, type: 'HUMAN_SIGNAL' },
  checkout_offer_exposure:   { demand: 'IMPLICIT_INTENT',   distance: 'MID',  confidence: 0.50, type: 'HUMAN_SIGNAL' },
  b2b_diagnostic_complete:   { demand: 'EXPLICIT_INTENT',   distance: 'MID',  confidence: 0.70, type: 'HUMAN_SIGNAL' },
  b2b_diagnostic_audit_click:{ demand: 'EXPLICIT_INTENT',   distance: 'NEAR', confidence: 0.75, type: 'HUMAN_SIGNAL' },
  diagnostic_complete:       { demand: 'EXPLICIT_INTENT',   distance: 'MID',  confidence: 0.70, type: 'HUMAN_SIGNAL' },
  activation:                { demand: 'EXPLICIT_INTENT',   distance: 'NEAR', confidence: 0.80, type: 'HUMAN_SIGNAL' },
  verification_submit:       { demand: 'EXPLICIT_INTENT',   distance: 'NEAR', confidence: 0.80, type: 'HUMAN_SIGNAL' }
});

/**
 * Turn PostHog events into signals.
 *
 * A checkout_click becomes a CHECKOUT signal, which is as far as it can ever go on
 * its own: the state machine will not let it reach PAID without a payment-provider
 * event. That boundary is the whole reason this adapter does not set PAID itself.
 */
export function toSignals(events, { now = Date.now() } = {}) {
  const signals = [];
  const ignored = [];

  for (const event of events) {
    const name = event.event ?? event.name;
    const rule = HUMAN_EVENTS[name];
    if (!rule) { ignored.push({ id: event.id ?? null, event: name, reason: 'NOT_A_HUMAN_SIGNAL' }); continue; }

    const props = event.properties ?? {};
    signals.push(normalizeSignal({
      signal_type: rule.type,
      source: 'posthog',
      source_url: props.$current_url ?? props.path ?? null,
      // PostHog's own event uuid keeps the id stable across re-reads of the same
      // window; without it a re-query would mint a second signal for one human act.
      external_id: String(event.uuid ?? event.id ?? `${name}:${event.timestamp}`),
      source_event_id: String(event.uuid ?? event.id ?? `${name}:${event.timestamp}`),
      // The whole property bag, so the contract can rebuild the exact
      // client_reference_id this page would have written onto its checkout link.
      // That value - not cta_id - is what Stripe sees, so it is the only thing that
      // can join this click to the payment it may eventually produce.
      event_properties: props,
      detected_at: event.timestamp ?? new Date(now).toISOString(),
      subject: `${name} on ${props.path ?? props.funnel ?? 'unknown page'}`,
      buyer_or_human: props.distinct_id ?? event.distinct_id ?? null,
      demand_type: rule.demand,
      revenue_distance: rule.distance,
      confidence: rule.confidence,
      existing_asset_match: props.product ?? props.asset_id ?? null,
      route_id: props.cta_id ?? null,
      evidence: makeEvidence('ANALYTICS_EVENT', {
        ref: `posthog:${event.uuid ?? event.id ?? name}`,
        detail: `${name} (${props.cta_id ?? 'no cta_id'})`,
        observed_at: new Date(now).toISOString()
      }),
      raw_ref: `posthog:${event.uuid ?? event.id ?? name}`
    }, { now }));
  }

  return { signals, ignored };
}

/**
 * Query recent human events from PostHog.
 * Requires POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID; both live in Actions.
 */
export async function fetchRecentEvents({
  apiKey = process.env.POSTHOG_PERSONAL_API_KEY,
  projectId = process.env.POSTHOG_PROJECT_ID,
  host = process.env.POSTHOG_HOST ?? 'https://us.posthog.com',
  after = null,
  fetchImpl = proxyFetch
} = {}) {
  if (!apiKey || !projectId) {
    const err = new Error('POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID are required');
    err.failure_class = 'AUTH';
    throw err;
  }
  const names = Object.keys(HUMAN_EVENTS);
  const since = after ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const url = `${host}/api/projects/${projectId}/events/?after=${encodeURIComponent(since)}`
    + `&event=${encodeURIComponent(names.join(','))}&limit=200`;

  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) {
    const err = new Error(`posthog events ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  return { url, events: Array.isArray(body?.results) ? body.results : [] };
}

export async function ingest({ now = Date.now(), ...opts } = {}) {
  const { url, events } = await fetchRecentEvents(opts);
  const { signals, ignored } = toSignals(events, { now });
  return { source_url: url, fetched: events.length, signals, ignored };
}
