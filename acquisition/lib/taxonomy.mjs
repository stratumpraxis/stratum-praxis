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
  'agent_economics_result',
  'agent_lab_entry_click',
  'agent_lab_portal_view',
  'b2b_diagnostic_answer',
  'b2b_diagnostic_audit_click',
  'b2b_diagnostic_complete',
  'b2b_diagnostic_copy',
  'b2b_diagnostic_entry_click',
  'b2b_diagnostic_reset',
  'b2b_diagnostic_start',
  'buyer_workspace_route_select',
  'calculator_input',
  'calculator_preset',
  'checkout_cancelled',
  'checkout_click',
  'checkout_departure_confirmed',
  'checkout_navigation',
  'checkout_offer_exposure',
  'cinematic_buyer_morph',
  'cinematic_home_morph',
  'cinematic_preview_morph',
  'cinematic_route_morph',
  'cinematic_story_jump',
  'cinematic_story_step',
  'cinematic_ui_ready',
  'copy',
  'daily_edge_view',
  'diagnostic_complete',
  'diagnostic_start',
  'diagnostic_view',
  'evolution_action',
  'evolution_engine_ready',
  'evolution_form_friction',
  'evolution_invalid_field',
  'evolution_journey_step',
  'evolution_link_health',
  'evolution_quality_snapshot',
  'evolution_rage_click',
  'evolution_result_visible',
  'evolution_scroll_depth',
  'evolution_section_view',
  'evolution_web_vitals',
  'external_route_click',
  'funnel_view',
  'growth_nav_action',
  'growth_nav_close',
  'growth_nav_open',
  'growth_nav_result_ready',
  'growth_ui_ready',
  'home_decision_interaction',
  'home_integrity_input_started',
  'hub_intent_selected',
  'hub_legacy_product_label_corrected',
  'hub_surface_handoff',
  'image_commerce_interest',
  'input_complete',
  'lab_explicit_intent_continued',
  'lab_search',
  'lab_tool_open',
  'lab_visual_intent_select',
  'live_lab_compare_selection',
  'live_lab_compare_toggle',
  'live_lab_intent_arrival',
  'live_lab_search_state',
  'live_lab_tool_open',
  'market_intake_complete',
  'market_intake_cta_click',
  'market_intake_routed',
  'market_intake_start',
  'membership_interest_click',
  'money_resilience_experience_v2_loaded',
  'money_resilience_experience_v3_loaded',
  'money_resilience_language_change',
  'money_resilience_market_pulse_error',
  'money_resilience_market_pulse_loaded',
  'money_resilience_mobile_result_sheet',
  'money_resilience_mobile_state_jump',
  'money_resilience_pressure_focus',
  'money_resilience_reset',
  'money_resilience_result_copy',
  'money_resilience_result_generated',
  'money_resilience_result_print',
  'money_resilience_result_share',
  'money_resilience_scenario_change',
  'money_resilience_site_power_loaded',
  'money_resilience_snapshot_copy',
  'money_resilience_snapshot_print',
  'money_resilience_start',
  'money_resilience_stress_dial_click',
  'money_resilience_stress_swipe',
  'money_resilience_tool_switch',
  'money_resilience_v3_loaded',
  'money_resilience_vnext_loaded',
  'money_resilience_vnext_polish_loaded',
  'motion_engine_ready',
  'motion_scene_ready',
  'motion_scene_view',
  'motion_state_change',
  'network_route_click',
  'page_view',
  'paid_offer_exposure',
  'paid_product_view',
  'partner_request_click',
  'primary_cta_click',
  'print',
  'priority_entry_click',
  'priority_entry_exposure',
  'product_video_complete',
  'product_video_half',
  'product_video_play',
  'qualified_tool_action',
  'readiness_v3_gear_click',
  'readiness_v3_loaded',
  'readiness_v3_plan_click',
  'resilience_bridge_click',
  'resilience_utility_bridge_click',
  'result_cta_click',
  'result_generated',
  'result_success',
  'result_type',
  'result_view',
  'return_gate_arrival',
  'return_gate_entry_click',
  'return_gate_exit',
  'return_gate_return',
  'return_gate_view',
  'revenue_pump_auto_complete',
  'revenue_pump_auto_cta_click',
  'revenue_pump_auto_fetch_blocked',
  'revenue_pump_cta_click',
  'revenue_pump_scan_complete',
  'revenue_pump_scan_start',
  'revenue_route_click',
  'revenue_route_recommended',
  'router_brief_next',
  'router_compare_toggle',
  'router_destination_open',
  'router_recovery_to_lab',
  'router_route_selected',
  'sample_audit_experience_ready',
  'sample_audit_section',
  'scos_checkout_click',
  'scos_landing_cta_click',
  'scos_landing_view',
  'scos_score_complete',
  'scos_score_start',
  'scos_score_view',
  'share',
  'signal_article_click',
  'signal_distribution_click',
  'signal_filter',
  'signal_install_prompt',
  'signal_language_switch',
  'signal_outbound_click',
  'signal_save_toggle',
  'site_kernel_circulation_ready',
  'site_kernel_closed_loop',
  'site_kernel_monitoring_preview',
  'site_kernel_preview_ready',
  'site_kernel_preview_tab',
  'site_kernel_priority_ranked',
  'site_kernel_ready',
  'site_kernel_runtime_preview',
  'social_revenue_pathfinder_result',
  'spend_calculator_result',
  'stack_demo_change',
  'tip_clicked',
  'tip_shown',
  'traffic_session_start',
  'trust_layer_ready',
  'trust_route_click',
  'utility_start',
  'verification_submit',
  'workflow_audit_checkout_reassurance_click',
  'workflow_audit_checkout_reassurance_exposure',
  'workflow_audit_preview_ready',
  'workflow_audit_preview_tab'
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
