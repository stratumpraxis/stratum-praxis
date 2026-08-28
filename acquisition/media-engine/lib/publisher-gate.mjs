// Issue #52 - the channel / provider gate and the publish-proof ladder.
//
// No platform is hard-coded as safe. Every destination resolves through
// distribution/provider-policy.json, which stays authoritative and is never written
// here. AUTO_PUBLISH_ALLOWED requires all nine conditions the issue lists to be
// individually proven; a missing proof produces HUMAN_REVIEW_REQUIRED,
// HUMAN_PUBLISH_REQUIRED or BLOCKED, and that is a correct outcome rather than an
// obstacle to route around.

import { publisherFor } from '../../lib/safety.mjs';
import { isPlainObject } from '../../lib/util.mjs';

export const PUBLISH_STATES = Object.freeze([
  'AUTO_PUBLISH_ALLOWED',
  'HUMAN_REVIEW_REQUIRED',
  'HUMAN_PUBLISH_REQUIRED',
  'BLOCKED'
]);

/**
 * The publish-proof ladder from Issue #52. Each rung requires the evidence named in
 * `requires`. The mapping to the existing acquisition queue states is explicit so this
 * engine reuses acquisition/lib/queue.mjs rather than running a second state machine.
 */
export const PROOF_STATES = Object.freeze(['DRAFT', 'READY', 'PUBLISH_REQUESTED', 'PUBLISHED', 'VERIFIED']);

export const PROOF_CONTRACT = Object.freeze({
  DRAFT: { queue_state: 'DRAFT', requires: [] },
  READY: { queue_state: 'READY', requires: ['truth_gate_passed', 'duplication_gate_passed', 'safety_gate_passed'] },
  PUBLISH_REQUESTED: { queue_state: 'SCHEDULED', requires: ['human_approved', 'requested_at'] },
  PUBLISHED: { queue_state: 'PUBLISHED', requires: ['external_post_id', 'published_at', 'account_id'] },
  VERIFIED: { queue_state: 'VERIFIED', requires: ['external_post_id', 'canonical_url', 'independent_status_read', 'verified_at'] }
});

/** The nine conditions Issue #52 requires before anything may auto-publish. */
export const AUTO_PUBLISH_CONDITIONS = Object.freeze([
  'destination_configured',
  'account_authorized',
  'provider_publishing_enabled',
  'automation_allowed',
  'ai_content_policy_compatible',
  'disclosure_satisfied',
  'truth_gate_passed',
  'duplication_gate_passed',
  'safety_gates_passed'
]);

/**
 * Resolve the publishing state for one derivation on one channel.
 *
 * @param {object} derivation
 * @param {object} context { channel, desk, providerPolicy, sourceRouting, gates }
 */
export function resolvePublishState(derivation, context = {}) {
  const { channel, desk, providerPolicy, sourceRouting, gates = {} } = context;
  const conditions = {};
  const blockers = [];
  const humanSteps = [];

  if (!channel) {
    return blocked(`no channel binding exists for ${derivation.channel_id}`, conditions, ['channel is not bound in acquisition/media-engine/channels.json']);
  }

  // Hard blocks first: a channel that cannot carry this desk is not a human-review case.
  if (!Array.isArray(channel.supported_desks) || !channel.supported_desks.includes(desk.desk_id)) {
    blockers.push(`channel ${channel.channel_id} does not carry ${desk.desk_id} (supported: ${(channel.supported_desks || []).join(', ') || 'none'})`);
  }
  if (!(channel.supported_languages || []).includes(desk.language)) {
    blockers.push(`channel ${channel.channel_id} does not support ${desk.language}`);
  }

  // 1. destination configured - the channel must exist in the routing map that owns
  //    utm_source/utm_medium, so an undefined channel can never be invented here.
  const routingSource = sourceRouting?.sources?.[channel.source_routing_key];
  conditions.destination_configured = Boolean(routingSource);
  if (!routingSource) {
    blockers.push(`channel ${channel.channel_id} is not defined in distribution/source-routing.json`);
  }

  // 2. account authorized
  conditions.account_authorized = channel.account_state === 'CONNECTED' && Boolean(channel.account_alias) && channel.account_alias !== 'UNKNOWN';
  if (!conditions.account_authorized) {
    humanSteps.push({
      condition: 'account_authorized',
      state: channel.account_state,
      evidence: channel.account_evidence,
      one_time_owner_action: channel.one_time_owner_action
    });
  }

  // 3 + 4. provider policy and automation
  const { publisher, count } = publisherFor(channel.source_routing_key, providerPolicy);
  conditions.provider_publishing_enabled = Boolean(publisher);
  conditions.automation_allowed = Boolean(publisher) && count === 1;
  if (!publisher) {
    humanSteps.push({
      condition: 'provider_publishing_enabled',
      state: 'NO_ACTIVE_PUBLISHER',
      evidence: `no active provider in distribution/provider-policy.json has publishingEnabled for ${channel.source_routing_key}`,
      one_time_owner_action: channel.one_time_owner_action
    });
  } else if (count > 1) {
    blockers.push(`${count} active publishers claim ${channel.source_routing_key}; the single-publisher rule forbids queueing`);
  }

  // 5. AI content policy
  conditions.ai_content_policy_compatible = channel.ai_content_policy_state === 'VERIFIED_COMPATIBLE';
  if (!conditions.ai_content_policy_compatible) {
    humanSteps.push({
      condition: 'ai_content_policy_compatible',
      state: channel.ai_content_policy_state,
      evidence: channel.ai_content_policy_note || 'the platform position on AI-assisted publishing has not been recorded',
      one_time_owner_action: `Read and record ${channel.channel_id}'s current AI-content policy before any automated publish.`
    });
  }

  // 6. disclosure
  const disclosure = checkDisclosure(derivation, channel);
  conditions.disclosure_satisfied = disclosure.ok;
  if (!disclosure.ok) {
    // An unmet disclosure requirement is a block, not a review note. Publishing without
    // a required disclosure is the failure this gate exists to prevent.
    blockers.push(...disclosure.missing.map((m) => `disclosure requirement "${m}" is not satisfied for ${channel.channel_id}`));
  }

  // 7-9. the engine's own gates
  conditions.truth_gate_passed = gates.truth === true;
  conditions.duplication_gate_passed = gates.duplication === true;
  conditions.safety_gates_passed = gates.safety === true;
  for (const [key, label] of [['truth', 'truth_gate_passed'], ['duplication', 'duplication_gate_passed'], ['safety', 'safety_gates_passed']]) {
    if (gates[key] !== true) blockers.push(`${label} is not proven for ${derivation.derivation_id}`);
  }

  const unmet = AUTO_PUBLISH_CONDITIONS.filter((c) => conditions[c] !== true);

  let state;
  if (blockers.length) state = 'BLOCKED';
  else if (!unmet.length) state = 'AUTO_PUBLISH_ALLOWED';
  else if (conditions.provider_publishing_enabled && conditions.account_authorized) state = 'HUMAN_REVIEW_REQUIRED';
  else state = 'HUMAN_PUBLISH_REQUIRED';

  return {
    state,
    channel_id: channel.channel_id,
    conditions,
    unmet_conditions: unmet,
    blockers,
    human_steps: humanSteps,
    publisher: publisher || null,
    disclosure,
    max_proof_state: state === 'BLOCKED' ? 'DRAFT' : 'READY',
    note: state === 'AUTO_PUBLISH_ALLOWED'
      ? 'Every condition is individually proven.'
      : 'Publication stops here. No code in this engine bypasses authentication, solves a CAPTCHA, creates an account, retries aggressively, or fabricates publish evidence.'
  };
}

function blocked(reason, conditions, blockers) {
  return {
    state: 'BLOCKED',
    channel_id: null,
    conditions,
    unmet_conditions: AUTO_PUBLISH_CONDITIONS,
    blockers,
    human_steps: [],
    publisher: null,
    disclosure: { ok: false, missing: [], satisfied: [] },
    max_proof_state: 'DRAFT',
    note: reason
  };
}

export function checkDisclosure(derivation, channel) {
  const required = channel.disclosure_required || [];
  const declared = isPlainObject(derivation.disclosure) ? derivation.disclosure : {};
  const satisfied = [];
  const missing = [];
  for (const requirement of required) {
    const value = declared[requirement];
    // A disclosure is satisfied only when its text is actually present in the output.
    const present = typeof value === 'string' && value.trim().length > 0
      && String(derivation.body || '').includes(value.trim());
    if (present) satisfied.push(requirement);
    else missing.push(requirement);
  }
  return { ok: missing.length === 0, required, satisfied, missing };
}

/**
 * Validate one rung of the publish-proof ladder.
 * PUBLISH_REQUESTED is not PUBLISHED. PUBLISHED is not VERIFIED.
 */
export function validateProofState(record) {
  const state = record?.proof_state;
  const errors = [];
  if (!PROOF_STATES.includes(state)) return [`unknown proof_state ${state}`];

  const contract = PROOF_CONTRACT[state];
  const proof = isPlainObject(record.publish_proof) ? record.publish_proof : {};
  for (const requirement of contract.requires) {
    const value = proof[requirement] ?? record[requirement];
    if (value === undefined || value === null || value === '' || value === false) {
      errors.push(`proof_state ${state} requires ${requirement}`);
    }
  }
  if (state === 'VERIFIED') {
    const read = proof.independent_status_read;
    if (isPlainObject(read) && read.verified !== true) {
      errors.push('VERIFIED requires independent_status_read.verified === true');
    }
  }
  return errors;
}

/** The queue state this proof rung corresponds to in acquisition/lib/queue.mjs. */
export function queueStateFor(proofState) {
  return PROOF_CONTRACT[proofState]?.queue_state ?? null;
}
