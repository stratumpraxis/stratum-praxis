// Convert high-intent analytics events into evidence-backed B2B buyer reactions.
//
// Analytics may prove buyer intent, but never checkout completion or payment. Events
// that merely indicate a checkout click stay at qualified_action; actual checkout is
// admitted only from a payment-provider Checkout Session in buyer-evidence-bridge.mjs.

import { appendBuyerReaction, makeBuyerReaction } from './buyer-reaction.mjs';

const OPAQUE_KEY = /^[a-zA-Z0-9:_-]{3,200}$/;

const QUALIFIED_EVENTS = Object.freeze({
  qualified_tool_action: 'qualified-tool-action',
  b2b_diagnostic_audit_click: 'b2b-audit-intent',
  partner_request_click: 'partner-intent',
  checkout_click: 'checkout-intent',
  scos_checkout_click: 'checkout-intent',
  advisor_checkout: 'checkout-intent'
});

function clean(value) {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

function safeOpaqueKey(value) {
  const key = clean(value);
  return key && OPAQUE_KEY.test(key) ? key : null;
}

function strings(value) {
  if (Array.isArray(value)) return [...new Set(value.map(clean).filter(Boolean))];
  const one = clean(value);
  return one ? [one] : [];
}

function occurredAt(event) {
  const raw = clean(event?.timestamp || event?.properties?.timestamp || event?.properties?.occurred_at);
  if (!raw || Number.isNaN(Date.parse(raw))) return null;
  return new Date(raw).toISOString();
}

function eventId(event) {
  return safeOpaqueKey(event?.uuid || event?.id || event?.event_id);
}

function buyerKey(event) {
  const declared = safeOpaqueKey(event?.properties?.buyer_key);
  if (declared) return declared;
  const distinct = safeOpaqueKey(event?.distinct_id || event?.properties?.distinct_id);
  return distinct ? `posthog:${distinct}` : null;
}

/**
 * Convert one PostHog-style event into a qualified_action reaction.
 * Returns a decision envelope so rejected analytics never mutate the ledger.
 */
export function buyerReactionFromAnalyticsEvent(event) {
  const name = clean(event?.event)?.toLowerCase();
  const intentCondition = QUALIFIED_EVENTS[name];
  if (!intentCondition) {
    return { accepted: false, reason: 'EVENT_NOT_QUALIFIED', reaction: null };
  }

  const id = eventId(event);
  if (!id) {
    return { accepted: false, reason: 'ANALYTICS_EVENT_ID_MISSING', reaction: null };
  }

  const buyer = buyerKey(event);
  if (!buyer) {
    return { accepted: false, reason: 'OPAQUE_BUYER_KEY_MISSING', reaction: null };
  }

  const at = occurredAt(event);
  if (!at) {
    return { accepted: false, reason: 'ANALYTICS_EVENT_TIME_MISSING', reaction: null };
  }

  const props = event?.properties || {};
  const declaredConditions = strings(props.buying_conditions);
  const reaction = makeBuyerReaction({
    event_id: `posthog:${id}`,
    buyer_key: buyer,
    company_key: safeOpaqueKey(props.company_key),
    stage: 'qualified_action',
    problem_keys: strings(props.problem_keys || props.problem_key),
    buying_conditions: [...new Set([...declaredConditions, intentCondition])],
    offer_asset_id: clean(props.offer_asset_id || props.asset_id || props.product),
    revenue_route_id: clean(props.revenue_route_id || props.route_id || props.attribution_route_id),
    source_ledger_id: clean(props.source_ledger_id || props.ledger_id),
    evidence_ref: `posthog-event:${id}`,
    evidence_source: 'posthog',
    occurred_at: at
  });

  return {
    accepted: true,
    reason: 'QUALIFIED_ANALYTICS_EVIDENCE',
    reaction,
    analytics: {
      event: name,
      intent_condition: intentCondition
    }
  };
}

export function appendAnalyticsEventToBuyerLedger(ledger, event) {
  const decision = buyerReactionFromAnalyticsEvent(event);
  if (!decision.accepted) return { ...decision, ledger };
  return {
    ...decision,
    ledger: appendBuyerReaction(ledger, decision.reaction)
  };
}

export const QUALIFIED_BUYER_ANALYTICS_EVENTS = Object.freeze(Object.keys(QUALIFIED_EVENTS));
