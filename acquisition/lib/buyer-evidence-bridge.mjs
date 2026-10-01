// Bridge payment-provider evidence into the B2B Buyer Reaction Ledger.
//
// Checkout existence and payment are deliberately separate claims. A Stripe Checkout
// Session can prove checkout arrival; only stripe-route.mjs may prove paid revenue.
// Direct personal identity is never used as a buyer key.

import { appendBuyerReaction, makeBuyerReaction } from './buyer-reaction.mjs';
import { parseCheckoutReference } from './checkout-reference.mjs';
import { purchaseFromCheckoutSession } from './stripe-route.mjs';

const OPAQUE_KEY = /^[a-zA-Z0-9:_-]{3,200}$/;

function clean(value) {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

function safeOpaqueKey(value) {
  const key = clean(value);
  return key && OPAQUE_KEY.test(key) ? key : null;
}

function stripeCustomerId(session) {
  if (typeof session?.customer === 'string') return safeOpaqueKey(session.customer);
  if (session?.customer && typeof session.customer === 'object') return safeOpaqueKey(session.customer.id);
  return null;
}

function sessionOccurredAt(session) {
  if (!Number.isFinite(session?.created) || session.created <= 0) return null;
  const date = new Date(session.created * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveBuyerKey(session) {
  const declared = safeOpaqueKey(session?.metadata?.buyer_key);
  if (declared) return declared;
  const correlated = parseCheckoutReference(session?.client_reference_id).buyer_key;
  if (correlated) return correlated;
  const customerId = stripeCustomerId(session);
  return customerId ? `stripe-customer:${customerId}` : null;
}

function resolveRouteId(session) {
  const declared = parseCheckoutReference(session?.metadata?.attribution_route_id).route_id;
  if (declared) return declared;
  return parseCheckoutReference(session?.client_reference_id).route_id;
}

/**
 * A real Stripe Checkout Session proves checkout arrival, not payment. This admission
 * path is intentionally weaker than buyerReactionFromCheckoutSession().
 */
export function checkoutReactionFromCheckoutSession(session) {
  if (session?.mode !== 'payment') {
    return { accepted: false, reason: 'NOT_ONE_TIME_CHECKOUT', reaction: null };
  }

  const routeId = resolveRouteId(session);
  if (!routeId) {
    return { accepted: false, reason: 'ATTRIBUTED_ROUTE_MISSING', reaction: null };
  }

  const buyerKey = resolveBuyerKey(session);
  if (!buyerKey) {
    return { accepted: false, reason: 'OPAQUE_BUYER_KEY_MISSING', reaction: null };
  }

  const occurredAt = sessionOccurredAt(session);
  if (!occurredAt) {
    return { accepted: false, reason: 'CHECKOUT_TIME_MISSING', reaction: null };
  }

  const sessionId = safeOpaqueKey(session?.id);
  if (!sessionId) {
    return { accepted: false, reason: 'CHECKOUT_SESSION_ID_INVALID', reaction: null };
  }

  const reaction = makeBuyerReaction({
    event_id: `stripe-checkout-stage:${sessionId}`,
    buyer_key: buyerKey,
    company_key: safeOpaqueKey(session?.metadata?.company_key),
    stage: 'checkout',
    problem_keys: [],
    buying_conditions: ['checkout-session-created'],
    offer_asset_id: clean(session?.metadata?.offer_asset_id),
    revenue_route_id: routeId,
    source_ledger_id: clean(session?.metadata?.source_ledger_id),
    evidence_ref: `stripe-session:${sessionId}`,
    evidence_source: 'stripe-checkout-session',
    occurred_at: occurredAt
  });

  return {
    accepted: true,
    reason: 'VERIFIED_CHECKOUT_EVIDENCE',
    reaction,
    checkout: {
      checkout_session_id: sessionId,
      payment_status: clean(session?.payment_status),
      status: clean(session?.status)
    }
  };
}

/**
 * Convert one verified paid Stripe Checkout Session to one payment_evidence buyer event.
 * Returns a decision envelope so callers can preserve why a session was not admitted.
 */
export function buyerReactionFromCheckoutSession(session) {
  const purchase = purchaseFromCheckoutSession(session);
  if (!purchase) {
    return { accepted: false, reason: 'NOT_VERIFIED_ATTRIBUTED_PURCHASE', reaction: null };
  }

  const buyerKey = resolveBuyerKey(session);
  if (!buyerKey) {
    return { accepted: false, reason: 'OPAQUE_BUYER_KEY_MISSING', reaction: null };
  }

  const occurredAt = sessionOccurredAt(session);
  if (!occurredAt) {
    return { accepted: false, reason: 'PAYMENT_TIME_MISSING', reaction: null };
  }

  const sessionId = safeOpaqueKey(session?.id);
  if (!sessionId) {
    return { accepted: false, reason: 'CHECKOUT_SESSION_ID_INVALID', reaction: null };
  }

  const reaction = makeBuyerReaction({
    event_id: `stripe-checkout:${sessionId}`,
    buyer_key: buyerKey,
    company_key: safeOpaqueKey(session?.metadata?.company_key),
    stage: 'payment_evidence',
    problem_keys: [],
    buying_conditions: ['payment-completed'],
    offer_asset_id: clean(session?.metadata?.offer_asset_id),
    revenue_route_id: purchase.route_id,
    source_ledger_id: clean(session?.metadata?.source_ledger_id),
    evidence_ref: purchase.purchase_evidence,
    evidence_source: 'stripe-checkout-session',
    occurred_at: occurredAt
  });

  return {
    accepted: true,
    reason: 'VERIFIED_PAYMENT_EVIDENCE',
    reaction,
    payment: {
      revenue_cents: purchase.revenue_cents,
      currency: purchase.currency,
      activation: purchase.activation,
      checkout_session_id: purchase.checkout_session_id
    }
  };
}

export function appendCheckoutStageToBuyerLedger(ledger, session) {
  const decision = checkoutReactionFromCheckoutSession(session);
  if (!decision.accepted) return { ...decision, ledger };
  return {
    ...decision,
    ledger: appendBuyerReaction(ledger, decision.reaction)
  };
}

/** Append a verified paid Checkout Session to the ledger without manufacturing an event. */
export function appendCheckoutSessionToBuyerLedger(ledger, session) {
  const decision = buyerReactionFromCheckoutSession(session);
  if (!decision.accepted) {
    return { ...decision, ledger };
  }
  return {
    ...decision,
    ledger: appendBuyerReaction(ledger, decision.reaction)
  };
}
