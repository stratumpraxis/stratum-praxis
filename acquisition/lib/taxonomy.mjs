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
  'advisor_checkout',
  'advisor_intake',
  'b2b_diagnostic_answer',
  'b2b_diagnostic_audit_click',
  'b2b_diagnostic_complete',
  'b2b_diagnostic_copy',
  'b2b_diagnostic_entry_click',
  'b2b_diagnostic_reset',
  'b2b_diagnostic_start',
  'calculator_input',
  'calculator_preset',
  'checkout_click',
  'checkout_offer_exposure',
  'daily_edge_view',
  'diagnostic_complete',
  'diagnostic_start',
  'external_route_click',
  'funnel_view',
  'image_commerce_interest',
  'membership_interest_click',
  'network_route_click',
  'page_view',
  'paid_offer_exposure',
  'partner_request_click',
  'primary_cta_click',
  'qualified_tool_action',
  'result_view',
  'return_gate_arrival',
  'return_gate_entry_click',
  'return_gate_exit',
  'return_gate_return',
  'return_gate_view',
  'scos_checkout_click',
  'scos_landing_cta_click',
  'scos_landing_view',
  'scos_score_complete',
  'scos_score_start',
  'scos_score_view',
  'signal_article_click',
  'signal_distribution_click',
  'signal_filter',
  'signal_install_prompt',
  'signal_language_switch',
  'signal_outbound_click',
  'signal_save_toggle',
  'social_revenue_pathfinder_result',
  'stack_demo_change',
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
  'LIVE',
  'PAUSED_CHECKOUT',
  'DRAFT',
  'BLOCKED',
  'RETIRED'
]);

export const VERIFICATION_STATES = Object.freeze([
  'HTTP_VERIFIED',
  'REPO_AND_SITEMAP',
  'REPO_ONLY',
  'DOC_ONLY',
  'UNKNOWN',
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
  'INTERNAL_FUNNEL',
  'NONE',
  'PAUSED',
  'UNKNOWN'
]);

export const COMMERCIAL_INTENT = Object.freeze(['NONE', 'LOW', 'MID', 'HIGH']);
export const EVIDENCE_CLASSES = Object.freeze(['OBSERVED', 'ASSUMPTION', 'HYPOTHESIS']);

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

/**
 * Approval states are evidence-bearing execution gates, not a blanket human
 * requirement. SYSTEM_APPROVED is valid only when the safety layer proves an
 * already-authorized autonomous publisher lane, an owned verified destination,
 * no collision, and no warning requiring judgment. It never applies to KYC,
 * payment, account creation, auth, CAPTCHA, or unverified external actions.
 */
export const APPROVAL_STATES = Object.freeze([
  'PENDING_HUMAN',
  'SYSTEM_APPROVED',
  'HUMAN_APPROVED',
  'HUMAN_REJECTED'
]);

export const EXECUTION_APPROVAL_STATES = Object.freeze([
  'SYSTEM_APPROVED',
  'HUMAN_APPROVED'
]);

export const WINNER_VERDICTS = Object.freeze([
  'SCALE',
  'ITERATE',
  'STOP',
  'INSUFFICIENT_DATA'
]);

export const APPROVED_DESTINATION_DOMAINS = Object.freeze([
  'stratumpraxis.com'
]);

export const CHECKOUT_HOSTS = Object.freeze([
  'buy.stripe.com',
  'payhip.com',
  'gumroad.com',
  'stratumpraxis.gumroad.com'
]);

export function isOneOf(value, list) {
  return list.includes(value);
}
