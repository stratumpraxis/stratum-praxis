// Frozen vocabularies for the Acquisition Intelligence Engine.
//
// These values are DERIVED from systems that already exist in this repository.
// They are not a new parallel taxonomy:
//   - ANALYTICS_EVENTS mirrors the events emitted by scos-analytics.js / signal/analytics.js
//   - UTM sources/mediums come from distribution/source-routing.json at run time
//   - Publisher rights come from distribution/provider-policy.json at run time

/** Event names actually emitted by the deployed analytics layer. */
export const ANALYTICS_EVENTS = Object.freeze([
  'access_denied',
  'access_granted',
  'activation',
  'calculator_input',
  'calculator_preset',
  'checkout_click',
  'daily_edge_view',
  'diagnostic_complete',
  'diagnostic_start',
  'external_route_click',
  'funnel_view',
  'network_route_click',
  'page_view',
  'primary_cta_click',
  'result_view',
  'return_gate_arrival',
  'return_gate_entry_click',
  'return_gate_exit',
  'return_gate_return',
  'return_gate_view',
  'scos_checkout_click',
  'scos_landing_cta_click',
  'scos_landing_view',
  'signal_article_click',
  'signal_distribution_click',
  'signal_outbound_click',
  'traffic_session_start',
  'verification_submit'
]);

/**
 * PHASE 6 funnel. Order matters: each stage may only be claimed when the stage
 * itself has evidence. A later stage never implies an earlier one was measured.
 */
export const FUNNEL_STAGES = Object.freeze([
  'impression',
  'profile_visit',
  'external_click',
  'destination_view',
  'funnel_view',
  'primary_cta_click',
  'checkout',
  'purchase',
  'activation',
  'revisit'
]);

/** Stages whose only trustworthy source is a payment provider record, never analytics. */
export const PAYMENT_EVIDENCE_STAGES = Object.freeze(['purchase']);

export const ASSET_TYPES = Object.freeze([
  'FREE_CALCULATOR',
  'FREE_CHECKLIST',
  'FREE_DIAGNOSTIC',
  'GUIDE',
  'HUB',
  'PROOF',
  'ROUTER',
  'PAID_PRODUCT',
  'PAID_SERVICE',
  'SUBSCRIPTION'
]);

export const ASSET_STATUSES = Object.freeze([
  'LIVE',            // publicly reachable and commercially usable
  'PAUSED_CHECKOUT', // page is live, but its purchase path is deliberately closed
  'DRAFT',           // exists in repo, not fit to receive paid distribution
  'BLOCKED',         // known blocker; never a distribution destination
  'RETIRED'
]);

/**
 * Verification tiers, strongest first. Anything below REPO_ONLY must never be
 * used as a live distribution destination.
 */
export const VERIFICATION_STATES = Object.freeze([
  'HTTP_VERIFIED',    // a real HTTP check succeeded and was recorded
  'REPO_AND_SITEMAP', // source file exists in this repo AND is published in sitemap.xml
  'REPO_ONLY',        // source file exists in this repo, not in sitemap.xml
  'DOC_ONLY',         // asserted by an operational document, not confirmed here
  'UNKNOWN',          // explicitly unknown - never silently guessed
  'UNVERIFIED'
]);

export const ROUTABLE_VERIFICATION_STATES = Object.freeze([
  'HTTP_VERIFIED',
  'REPO_AND_SITEMAP',
  'REPO_ONLY'
]);

export const REVENUE_DESTINATION_TYPES = Object.freeze([
  'STRIPE',
  'PAYHIP',
  'GUMROAD',
  'INTERNAL_FUNNEL', // free asset whose job is to hand off to a paid asset
  'NONE',
  'PAUSED',
  'UNKNOWN'
]);

export const COMMERCIAL_INTENT = Object.freeze(['NONE', 'LOW', 'MID', 'HIGH']);

/** PHASE 3 evidence classes. A hypothesis is never reported as evidence. */
export const EVIDENCE_CLASSES = Object.freeze(['OBSERVED', 'ASSUMPTION', 'HYPOTHESIS']);

/** PHASE 8 queue states. Distinct by design - "requested" is not "published". */
export const QUEUE_STATES = Object.freeze([
  'DRAFT',
  'SAFETY_CHECK',
  'READY',
  'SCHEDULED',
  'PUBLISHED',
  'VERIFIED',
  'ERROR',
  'STOPPED'
]);

/** Only these transitions are legal. Anything else is a bug or a forged state. */
export const QUEUE_TRANSITIONS = Object.freeze({
  DRAFT: ['SAFETY_CHECK', 'STOPPED'],
  SAFETY_CHECK: ['READY', 'ERROR', 'STOPPED'],
  READY: ['SCHEDULED', 'STOPPED', 'ERROR'],
  SCHEDULED: ['PUBLISHED', 'ERROR', 'STOPPED'],
  PUBLISHED: ['VERIFIED', 'ERROR'],
  VERIFIED: ['STOPPED'],
  ERROR: ['DRAFT', 'STOPPED'],
  STOPPED: []
});

/** States a human owner must sign off before the item may advance. */
export const APPROVAL_STATES = Object.freeze([
  'PENDING_HUMAN',
  'HUMAN_APPROVED',
  'HUMAN_REJECTED'
]);

export const WINNER_VERDICTS = Object.freeze([
  'SCALE',
  'ITERATE',
  'STOP',
  'INSUFFICIENT_DATA'
]);

/** Hosts allowed to receive owned traffic. Keep in sync with distribution/safety-audit.mjs. */
export const APPROVED_DESTINATION_DOMAINS = Object.freeze([
  'stratumpraxis.com'
]);

/** Checkout hosts recognised by scos-analytics.js; used to classify revenue destinations. */
export const CHECKOUT_HOSTS = Object.freeze([
  'buy.stripe.com',
  'payhip.com',
  'gumroad.com',
  'stratumpraxis.gumroad.com'
]);

export function isOneOf(value, list) {
  return list.includes(value);
}
