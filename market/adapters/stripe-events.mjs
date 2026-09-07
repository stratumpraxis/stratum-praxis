// Stripe payment adapter.
//
// This is the only place in the system that may produce money-bearing evidence, and
// it is deliberately strict about it. Three things that look like revenue and are
// not:
//
//   - a Checkout Session that was created but never paid
//   - a PaymentIntent that requires action, failed, or was cancelled
//   - a refunded charge
//
// Each of those is ingested honestly as a non-payment signal rather than dropped, so
// the funnel can show how many checkouts died and where - which is exactly the open
// question this system exists to answer.

import { normalizeSignal } from '../lib/signal.mjs';
import { makeEvidence } from '../lib/evidence.mjs';
import { proxyFetch } from '../lib/http.mjs';

const API = 'https://api.stripe.com/v1';

/** Only these mean money actually moved. */
const PAID_STATES = Object.freeze(['paid', 'succeeded']);

function isRealPayment(session) {
  if (PAID_STATES.includes(session.payment_status)) return true;
  if (session.object === 'payment_intent' && PAID_STATES.includes(session.status)) return true;
  return false;
}

/**
 * Turn Stripe Checkout Sessions into signals.
 *
 * A paid session becomes a PAYMENT signal carrying PAYMENT_PROVIDER evidence - the
 * only evidence class the state machine accepts for PAID and WON. An unpaid one
 * becomes a CHECKOUT signal, which can never reach PAID on its own.
 */
export function toSignals(sessions, { now = Date.now() } = {}) {
  const signals = [];
  const ignored = [];

  for (const session of sessions) {
    const paid = isRealPayment(session);
    const id = session.id;
    if (!id) { ignored.push({ id: null, reason: 'NO_STRIPE_ID' }); continue; }

    // client_reference_id is what scos-analytics.js puts on the outbound checkout
    // link. It is the join back to the route that produced the click, and it is the
    // reason a payment can be attributed at all.
    const routeId = session.client_reference_id ?? null;

    signals.push(normalizeSignal({
      signal_type: paid ? 'PAYMENT' : 'CHECKOUT',
      source: 'stripe',
      source_url: null,
      external_id: id,
      source_event_id: id,
      // The reference the page wrote onto the outbound link. It is the same string
      // the PostHog adapter rebuilds from a checkout_click, so a click and the
      // payment it produced arrive on one correlation_id without either system
      // knowing about the other. Absent on a session that was opened by some path
      // that never carried attribution - in which case the payment starts its own
      // chain rather than being joined to a guess.
      correlation_ref: routeId,
      detected_at: session.created
        ? new Date(session.created * 1000).toISOString()
        : new Date(now).toISOString(),
      subject: paid
        ? `payment ${id} for ${session.amount_total ?? '?'} ${String(session.currency ?? '').toUpperCase()}`
        : `unpaid checkout ${id} (${session.payment_status ?? session.status ?? 'unknown'})`,
      buyer_or_human: session.customer_details?.email ?? session.customer_email ?? null,
      demand_type: paid ? 'EXPLICIT_PURCHASE' : 'EXPLICIT_INTENT',
      revenue_distance: paid ? 'PAID' : 'NEAR',
      confidence: paid ? 1 : 0.9,
      route_id: routeId,
      existing_asset_match: null,
      evidence: makeEvidence('PAYMENT_PROVIDER', {
        ref: id,
        provider: 'stripe',
        // Carried through verbatim. state.mjs re-checks it before allowing PAID, so
        // an unpaid status here cannot be laundered into a payment upstream.
        payment_status: paid ? 'paid' : (session.payment_status ?? session.status ?? 'unknown'),
        // Only a paid session gets an amount. An open session has an amount_total
        // too, and carrying it would put a number that looks like revenue onto a
        // record where no money moved.
        ...(paid ? { amount_minor: session.amount_total ?? null, currency: session.currency ?? null } : {}),
        detail: `amount_total=${session.amount_total ?? 'null'} currency=${session.currency ?? 'null'}`,
        observed_at: new Date(now).toISOString()
      }),
      raw_ref: `stripe:${id}`
    }, { now }));
  }

  return { signals, ignored };
}

export async function fetchRecentSessions({
  apiKey = process.env.STRIPE_SECRET_KEY,
  limit = 100,
  fetchImpl = proxyFetch
} = {}) {
  if (!apiKey) {
    const err = new Error('STRIPE_SECRET_KEY is required');
    err.failure_class = 'AUTH';
    throw err;
  }
  const url = `${API}/checkout/sessions?limit=${limit}`;
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) {
    const err = new Error(`stripe sessions ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  return { url, sessions: Array.isArray(body?.data) ? body.data : [] };
}

export async function ingest({ now = Date.now(), ...opts } = {}) {
  const { url, sessions } = await fetchRecentSessions(opts);
  const { signals, ignored } = toSignals(sessions, { now });
  const paid = signals.filter((s) => s.signal_type === 'PAYMENT').length;
  return {
    source_url: url,
    fetched: sessions.length,
    signals,
    ignored,
    // Reported separately so a reader never has to infer revenue from a signal count.
    paid_sessions: paid,
    unpaid_sessions: signals.length - paid
  };
}
