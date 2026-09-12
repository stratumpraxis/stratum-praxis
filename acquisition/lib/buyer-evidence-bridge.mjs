// Bridge verified payment-provider evidence into the B2B Buyer Reaction Ledger.
//
// This module reuses the existing Stripe adapter. It never treats a Checkout Session
// as payment unless stripe-route.mjs already proves it is a paid, attributed payment.
// It also refuses to invent a buyer identity: only an opaque metadata key or Stripe
// customer id can anchor a buyer reaction.

import { appendBuyerReaction, makeBuyerReaction } from './buyer-reaction.mjs';
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

function paymentOccurredAt(session) {
  if (!Number.isFinite(session?.created) || session.created <= 0) return null;
  const date = new Date(session.created * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveBuyerKey(session) {
  const declared = safeOpaqueKey(session?.metadata?.buyer_key);
  if (declared) return declared;
  const customerId = stripeCustomerId(session);
  return customerId ? `stripe-customer:${customerId}` : null;
}

/**
 * Convert one verified Stripe Checkout Session to one payment_evidence buyer event.
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

  const occurredAt = paymentOccurredAt(session);
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

/** Append a verified Checkout Session to the ledger without manufacturing an event. */
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
