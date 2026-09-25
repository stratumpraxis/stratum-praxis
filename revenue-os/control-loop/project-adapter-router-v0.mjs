import fs from 'node:fs/promises';

export const CONTROL_LOOP_VERSION = 'autonomous-control-loop-v0';
export const ROUTABLE_PERMISSION_LEVELS = Object.freeze(new Set(['AUTO', 'LIMITED_AUTO']));

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function loadProjectAdapterRegistry(
  path = 'revenue-os/control-loop/project-adapter-registry-v0.json'
) {
  const registry = JSON.parse(await fs.readFile(path, 'utf8'));
  if (registry?.version !== 1 || !registry?.projects || typeof registry.projects !== 'object') {
    throw Object.assign(new Error('project adapter registry invalid'), { code: 'REGISTRY_INVALID' });
  }
  return Object.freeze(registry);
}

export function normalizeDecisionEnvelope(input = {}) {
  const action = input.action_request || input.action || {};
  const envelope = {
    control_loop_version: CONTROL_LOOP_VERSION,
    decision_id: text(input.decision_id),
    generated_at: text(input.generated_at) || null,
    business_unit: text(input.business_unit),
    decision: text(input.decision) || null,
    priority_ref: text(input.priority_ref) || null,
    allocation_ref: text(input.allocation_ref) || null,
    action_id: text(action.action_id),
    action_type: text(action.action_type),
    permission_level: text(input.permission_level || action.permission_level),
    asset_id: text(action.asset_id) || null,
    product_id: text(action.product_id) || null,
    route_id: text(action.route_id) || null,
    channel: text(action.channel) || null,
    experiment_id: text(action.experiment_id) || null,
    expected_external_writes:
      Number.isSafeInteger(Number(action.expected_external_writes))
        ? Number(action.expected_external_writes)
        : null,
    expected_cost_minor:
      Number.isSafeInteger(Number(action.expected_cost_minor))
        ? Number(action.expected_cost_minor)
        : null,
    currency: text(action.currency) || null,
    upstream_evidence_ref: Array.isArray(input.evidence_ref)
      ? input.evidence_ref.map(text).filter(Boolean)
      : [],
    raw_action_payload:
      action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
        ? clone(action.payload)
        : {}
  };

  const errors = [];
  if (!envelope.decision_id) errors.push('decision_id required');
  if (!envelope.business_unit) errors.push('business_unit required');
  if (!envelope.action_id) errors.push('action_id required');
  if (!envelope.action_type) errors.push('action_type required');
  if (!envelope.permission_level) errors.push('permission_level required');

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    envelope: Object.freeze(envelope)
  });
}

export function resolveProjectAdapter(decisionInput, registry) {
  const normalized = normalizeDecisionEnvelope(decisionInput);
  if (!normalized.ok) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'DECISION_ENVELOPE_INVALID',
      errors: normalized.errors,
      decision: normalized.envelope,
      dispatch: null
    });
  }

  const decision = normalized.envelope;

  if (!ROUTABLE_PERMISSION_LEVELS.has(decision.permission_level)) {
    return Object.freeze({
      status: decision.permission_level === 'HUMAN_GATE' ? 'HUMAN_GATE' : 'BLOCKED',
      reason:
        decision.permission_level === 'HUMAN_GATE'
          ? 'UPSTREAM_HUMAN_GATE'
          : 'UPSTREAM_PERMISSION_NOT_ROUTABLE',
      errors: Object.freeze([]),
      decision,
      dispatch: null
    });
  }

  const project = registry?.projects?.[decision.business_unit];
  if (!project) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'PROJECT_ADAPTER_MISSING',
      errors: Object.freeze([]),
      decision,
      dispatch: null
    });
  }

  const route = project?.routes?.[decision.action_type];
  if (!route) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'ACTION_ROUTE_MISSING',
      errors: Object.freeze([]),
      decision,
      dispatch: null
    });
  }

  if (
    Array.isArray(route.permission_levels) &&
    !route.permission_levels.includes(decision.permission_level)
  ) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'ROUTE_PERMISSION_MISMATCH',
      errors: Object.freeze([]),
      decision,
      dispatch: null
    });
  }

  const dispatch = Object.freeze({
    repository: text(project.repository),
    workflow: text(route.workflow),
    ref: text(route.ref || project.default_ref || 'main'),
    runtime_owner: text(route.runtime_owner) || decision.business_unit,
    inputs: Object.freeze({
      control_loop_decision_id: decision.decision_id,
      control_loop_action_id: decision.action_id
    }),
    evidence_probe: route.evidence_probe ? Object.freeze(clone(route.evidence_probe)) : null
  });

  if (!dispatch.repository || !dispatch.workflow) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'ADAPTER_TARGET_INVALID',
      errors: Object.freeze([]),
      decision,
      dispatch: null
    });
  }

  return Object.freeze({
    status: 'ROUTABLE',
    reason: 'PROJECT_ADAPTER_RESOLVED',
    errors: Object.freeze([]),
    decision,
    dispatch
  });
}

export function normalizeEvidenceReturn(input = {}) {
  const evidenceRefs = Array.isArray(input.evidence_ref)
    ? [...new Set(input.evidence_ref.map(text).filter(Boolean))]
    : [];

  const envelope = {
    control_loop_version: CONTROL_LOOP_VERSION,
    decision_id: text(input.decision_id),
    action_id: text(input.action_id),
    business_unit: text(input.business_unit),
    project_runtime: text(input.project_runtime),
    runtime_status: text(input.runtime_status),
    observed_at: text(input.observed_at),
    direct_evidence: input.direct_evidence === true,
    evidence_class: text(input.evidence_class) || null,
    evidence_ref: evidenceRefs,
    reality_change: text(input.reality_change) || 'UNKNOWN',
    state_before: text(input.state_before) || null,
    state_after: text(input.state_after) || null,
    notes: text(input.notes) || null
  };

  const errors = [];
  if (!envelope.decision_id) errors.push('decision_id required');
  if (!envelope.action_id) errors.push('action_id required');
  if (!envelope.business_unit) errors.push('business_unit required');
  if (!envelope.project_runtime) errors.push('project_runtime required');
  if (!envelope.runtime_status) errors.push('runtime_status required');
  if (!envelope.observed_at || !Number.isFinite(Date.parse(envelope.observed_at))) {
    errors.push('valid observed_at required');
  }
  if (envelope.direct_evidence !== true) errors.push('direct_evidence must be true');
  if (evidenceRefs.length === 0) errors.push('evidence_ref required');

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    evidence: Object.freeze(envelope)
  });
}

export function buildNextDecisionTrigger(evidenceInput) {
  const normalized = normalizeEvidenceReturn(evidenceInput);
  if (!normalized.ok) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'EVIDENCE_RETURN_INVALID',
      errors: normalized.errors,
      event_type: null,
      client_payload: null
    });
  }

  const evidence = normalized.evidence;
  return Object.freeze({
    status: 'READY',
    reason: 'DIRECT_EVIDENCE_NORMALIZED',
    errors: Object.freeze([]),
    event_type: 'common-revenue-state-changed',
    client_payload: Object.freeze({
      source: CONTROL_LOOP_VERSION,
      decision_id: evidence.decision_id,
      action_id: evidence.action_id,
      business_unit: evidence.business_unit,
      evidence
    })
  });
}
