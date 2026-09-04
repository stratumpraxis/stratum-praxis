import { createHash } from 'node:crypto';
import { validateActionReceipt } from './common-revenue-core-decision-evidence-v0.mjs';

export const SAFE_EXECUTION_VERSION = 'common-revenue-safe-execution-v0';
export const PERMISSION_LEVELS = Object.freeze(['AUTO', 'LIMITED_AUTO', 'HUMAN_GATE', 'BLOCKED']);

export const AUTO_ACTIONS = Object.freeze(new Set([
  'read_analytics',
  'collect_evidence',
  'generate_utm',
  'record_experiment',
  'recompute_decision',
  'prepare_existing_asset_copy',
  'queue_existing_asset'
]));

export const LIMITED_AUTO_ACTIONS = Object.freeze(new Set([
  'publish_existing_asset',
  'update_existing_cta',
  'adjust_existing_distribution'
]));

export const HUMAN_GATE_ACTIONS = Object.freeze(new Set([
  'change_price',
  'change_payment_configuration',
  'issue_refund',
  'sign_contract',
  'accept_legal_terms',
  'spend_money',
  'change_public_identity',
  'delete_production_data',
  'production_migration',
  'merge_main',
  'change_secret'
]));

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function hash(value) { return createHash('sha256').update(String(value)).digest('hex').slice(0, 24); }
function nowIso(now) { return typeof now === 'function' ? now() : new Date().toISOString(); }
function optionalSafeInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function normalizedAction(input = {}) {
  return Object.freeze({
    action_id: text(input.action_id),
    business_unit: text(input.business_unit),
    action_type: text(input.action_type),
    asset_id: text(input.asset_id) || null,
    product_id: text(input.product_id) || null,
    route_id: text(input.route_id) || null,
    channel: text(input.channel) || null,
    experiment_id: text(input.experiment_id) || null,
    cta_id: text(input.cta_id) || null,
    payload: input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload) ? input.payload : {},
    requested_at: text(input.requested_at) || null,
    expected_external_writes: optionalSafeInteger(input.expected_external_writes),
    expected_cost_minor: optionalSafeInteger(input.expected_cost_minor),
    currency: text(input.currency) || null
  });
}

export function classifyPermission(action, policy = {}) {
  const item = normalizedAction(action);
  const actionType = item.action_type;
  if (!actionType || !item.action_id || !['stratum', 'vector'].includes(item.business_unit)) {
    return Object.freeze({ level: 'BLOCKED', reason: 'ACTION_CONTRACT_INVALID' });
  }
  if (HUMAN_GATE_ACTIONS.has(actionType)) return Object.freeze({ level: 'HUMAN_GATE', reason: 'SENSITIVE_ACTION' });
  if (AUTO_ACTIONS.has(actionType)) return Object.freeze({ level: 'AUTO', reason: 'READ_OR_INTERNAL_LOW_RISK_ACTION' });
  if (LIMITED_AUTO_ACTIONS.has(actionType)) {
    const allowedRoutes = new Set(Array.isArray(policy.allowed_route_ids) ? policy.allowed_route_ids.filter(Boolean) : []);
    const allowedAssets = new Set(Array.isArray(policy.allowed_asset_ids) ? policy.allowed_asset_ids.filter(Boolean) : []);
    if (item.expected_external_writes === null || item.expected_external_writes < 0 || item.expected_external_writes > 1) {
      return Object.freeze({ level: 'BLOCKED', reason: 'LIMITED_ACTION_REQUIRES_MAX_ONE_EXTERNAL_WRITE' });
    }
    if (item.expected_cost_minor === null || item.expected_cost_minor !== 0) {
      return Object.freeze({ level: 'HUMAN_GATE', reason: 'NONZERO_OR_UNKNOWN_COST_REQUIRES_HUMAN' });
    }
    if (item.route_id && allowedRoutes.size > 0 && !allowedRoutes.has(item.route_id)) {
      return Object.freeze({ level: 'BLOCKED', reason: 'ROUTE_NOT_ALLOWLISTED' });
    }
    if (item.asset_id && allowedAssets.size > 0 && !allowedAssets.has(item.asset_id)) {
      return Object.freeze({ level: 'BLOCKED', reason: 'ASSET_NOT_ALLOWLISTED' });
    }
    return Object.freeze({ level: 'LIMITED_AUTO', reason: 'BOUNDED_ZERO_COST_EXISTING_ASSET_ACTION' });
  }
  return Object.freeze({ level: 'BLOCKED', reason: 'UNCLASSIFIED_ACTION_FAIL_CLOSED' });
}

function approvalValid(approval) {
  return Boolean(
    approval &&
    approval.actor_type === 'human' &&
    text(approval.approval_ref) &&
    text(approval.approved_at) &&
    Number.isFinite(Date.parse(approval.approved_at))
  );
}

function receiptBase(action, permission, { now, dry_run, humanGateRequired }) {
  const executedAt = nowIso(now);
  return {
    action_id: action.action_id,
    business_unit: action.business_unit,
    action_type: action.action_type,
    executed_at: executedAt,
    human_gate_required: humanGateRequired,
    dry_run,
    asset_id: action.asset_id,
    product_id: action.product_id,
    route_id: action.route_id,
    channel: action.channel,
    experiment_id: action.experiment_id,
    cta_id: action.cta_id,
    permission_level: permission.level,
    permission_reason: permission.reason,
    input_fingerprint: `in_${hash(JSON.stringify(action))}`,
    evidence_ref: []
  };
}

export async function executeSafeAction(actionInput, {
  adapters = {},
  policy = {},
  approval = null,
  dry_run = true,
  now = () => new Date().toISOString()
} = {}) {
  const action = normalizedAction(actionInput);
  const permission = classifyPermission(action, policy);
  const humanGateRequired = permission.level === 'HUMAN_GATE';
  const base = receiptBase(action, permission, { now, dry_run, humanGateRequired });

  if (permission.level === 'BLOCKED') {
    const receipt = Object.freeze({ ...base, status: 'BLOCKED', result_summary: permission.reason, result_fingerprint: null, evidence_ref: Object.freeze([]) });
    return Object.freeze({ status: 'BLOCKED', permission, receipt });
  }

  if (humanGateRequired && !approvalValid(approval)) {
    const receipt = Object.freeze({ ...base, status: 'BLOCKED', result_summary: 'HUMAN_APPROVAL_REQUIRED', result_fingerprint: null, evidence_ref: Object.freeze([]) });
    return Object.freeze({ status: 'BLOCKED', permission, receipt });
  }

  if (dry_run === true) {
    const receipt = Object.freeze({
      ...base,
      status: 'SKIPPED',
      result_summary: 'DRY_RUN_NO_EXTERNAL_SIDE_EFFECT',
      result_fingerprint: `out_${hash(`${action.action_id}|dry-run`)}`,
      evidence_ref: Object.freeze([`dry-run:${action.action_id}`])
    });
    return Object.freeze({ status: 'DRY_RUN', permission, receipt });
  }

  const adapter = adapters[action.business_unit];
  if (typeof adapter !== 'function') {
    const receipt = Object.freeze({ ...base, status: 'BLOCKED', result_summary: 'BUSINESS_UNIT_ADAPTER_MISSING', result_fingerprint: null, evidence_ref: Object.freeze([]) });
    return Object.freeze({ status: 'BLOCKED', permission, receipt });
  }

  try {
    const result = await adapter(action, Object.freeze({ permission, approval }));
    const evidence = Array.isArray(result?.evidence_ref) ? result.evidence_ref.filter((value) => text(value)) : [];
    if (evidence.length === 0) {
      const receipt = Object.freeze({ ...base, status: 'FAILED', result_summary: 'EXECUTION_RETURNED_NO_EVIDENCE', result_fingerprint: null, evidence_ref: Object.freeze([]) });
      return Object.freeze({ status: 'FAILED', permission, receipt });
    }
    const receipt = Object.freeze({
      ...base,
      status: result?.status === 'SKIPPED' ? 'SKIPPED' : 'EXECUTED',
      result_summary: text(result?.result_summary) || 'EXECUTED_WITH_EVIDENCE',
      result_fingerprint: `out_${hash(JSON.stringify(result))}`,
      evidence_ref: Object.freeze([...new Set(evidence)])
    });
    const validation = validateActionReceipt(receipt);
    if (!validation.ok) {
      return Object.freeze({ status: 'FAILED', permission, receipt, validation_errors: validation.errors });
    }
    return Object.freeze({ status: receipt.status, permission, receipt });
  } catch (error) {
    const receipt = Object.freeze({
      ...base,
      status: 'FAILED',
      result_summary: `ADAPTER_ERROR:${text(error?.code) || text(error?.name) || 'UNKNOWN'}`,
      result_fingerprint: null,
      evidence_ref: Object.freeze([])
    });
    return Object.freeze({ status: 'FAILED', permission, receipt, error_code: text(error?.code) || 'ADAPTER_ERROR' });
  }
}
