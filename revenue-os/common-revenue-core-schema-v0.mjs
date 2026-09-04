const freeze = (values) => Object.freeze([...values]);

export const CANONICAL_EVENT_TYPES = freeze([
  'traffic',
  'product_view',
  'cta_click',
  'checkout_started',
  'purchase',
  'payment_captured',
  'payment_settled',
  'refund',
  'chargeback',
  'delivery',
  'usage',
  'repeat_purchase',
  'action_executed'
]);

export const BUSINESS_UNITS = freeze(['stratum', 'vector']);
export const ATTRIBUTION_STATES = freeze(['ATTRIBUTED', 'UNATTRIBUTED', 'NOT_APPLICABLE', 'UNVERIFIED']);
export const EVIDENCE_STRENGTHS = freeze(['STRONG', 'MODERATE', 'WEAK', 'UNVERIFIED']);
export const SYNC_STATES = freeze(['PENDING_SYNC', 'SYNCED', 'RECONCILIATION_REQUIRED', 'INVALID']);
export const DECISION_STATES = freeze(['SCALE', 'KEEP', 'TEST', 'FIX', 'HOLD', 'STOP']);
export const ERROR_CODES = freeze([
  'CONTRACT_INVALID',
  'EVIDENCE_MISSING',
  'PURCHASE_EVIDENCE_MISSING',
  'IDENTITY_CONFLICT',
  'DUPLICATE_CONFLICT',
  'ATTRIBUTION_CONFLICT',
  'ECONOMICS_INCOMPLETE',
  'PROVIDER_UNAVAILABLE',
  'CORE_UNAVAILABLE'
]);

export const COMMON_ID_FIELDS = freeze([
  'event_id',
  'transaction_id',
  'customer_id',
  'business_unit',
  'asset_id',
  'product_id',
  'channel',
  'channel_id',
  'route_id',
  'experiment_id',
  'action_id',
  'cta_id',
  'timestamp',
  'evidence_ref'
]);

export const REQUIRED_EVENT_FIELDS = freeze([
  'event_id',
  'event_type',
  'business_unit',
  'timestamp',
  'source',
  'source_event_name',
  'sync_status'
]);

export const NULLABLE_CONTEXT_FIELDS = freeze([
  'transaction_id',
  'customer_id',
  'asset_id',
  'product_id',
  'channel',
  'channel_id',
  'route_id',
  'experiment_id',
  'action_id',
  'cta_id',
  'evidence_ref',
  'provider',
  'provider_transaction_id',
  'provider_customer_id',
  'source_url',
  'attribution_state',
  'evidence_strength'
]);

export const PAYMENT_TRUTH_EVENT_TYPES = freeze([
  'purchase',
  'payment_captured',
  'payment_settled',
  'refund',
  'chargeback',
  'repeat_purchase'
]);

export const NATIVE_EVENT_MAP = Object.freeze({
  traffic_session_start: 'traffic',
  primary_cta_click: 'cta_click',
  commerce_entry_click: 'cta_click'
});

export const LEGACY_DECISION_MAP = Object.freeze({
  SCALE: 'SCALE',
  ITERATE: 'FIX',
  STOP: 'STOP',
  INSUFFICIENT_DATA: 'HOLD'
});

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value) {
  return value === undefined || value === null || typeof value === 'string';
}

function isIsoTimestamp(value) {
  if (!isNonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  return /T/.test(value);
}

function error(code, field, message) {
  return Object.freeze({ code, field, message });
}

/**
 * Map only source events whose canonical meaning is unambiguous.
 * Conditional mappings stay conditional so Phase 1 cannot upgrade intent into truth.
 */
export function mapNativeEvent(sourceEventName, context = {}) {
  if (!isNonEmptyString(sourceEventName)) {
    return Object.freeze({ event_type: null, reason: 'SOURCE_EVENT_NAME_REQUIRED' });
  }

  if (Object.hasOwn(NATIVE_EVENT_MAP, sourceEventName)) {
    return Object.freeze({ event_type: NATIVE_EVENT_MAP[sourceEventName], reason: 'DIRECT_MAPPING' });
  }

  if (sourceEventName === 'funnel_view') {
    return context.qualifies_as_product_view === true
      ? Object.freeze({ event_type: 'product_view', reason: 'QUALIFIED_PRODUCT_VIEW' })
      : Object.freeze({ event_type: null, reason: 'PRODUCT_VIEW_QUALIFICATION_REQUIRED' });
  }

  if (sourceEventName === 'checkout_click') {
    return Object.freeze({ event_type: null, reason: 'CHECKOUT_PROVIDER_EVIDENCE_REQUIRED' });
  }

  return Object.freeze({ event_type: null, reason: 'NO_CANONICAL_MAPPING' });
}

/**
 * Convert existing Stratum winner classifications into the six-state common vocabulary.
 * INSUFFICIENT_DATA may become TEST only when an explicit bounded test is eligible.
 */
export function mapLegacyDecision(value, { test_eligible = false } = {}) {
  if (value === 'INSUFFICIENT_DATA' && test_eligible === true) return 'TEST';
  return LEGACY_DECISION_MAP[value] ?? null;
}

/**
 * Zero-dependency validator for the Phase 0 contract envelope.
 * It validates structure and truth guards only. It does not persist, reconcile,
 * enrich identities, calculate economics, or implement Phase 2+ behavior.
 */
export function validateCanonicalEvent(input, { require_trusted_evidence = false } = {}) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Object.freeze({ ok: false, errors: freeze([error('CONTRACT_INVALID', '$', 'event must be an object')]) });
  }

  for (const field of REQUIRED_EVENT_FIELDS) {
    if (!isNonEmptyString(input[field])) {
      errors.push(error('CONTRACT_INVALID', field, `${field} is required`));
    }
  }

  if (isNonEmptyString(input.event_type) && !CANONICAL_EVENT_TYPES.includes(input.event_type)) {
    errors.push(error('CONTRACT_INVALID', 'event_type', `unsupported event_type: ${input.event_type}`));
  }

  if (isNonEmptyString(input.business_unit) && !BUSINESS_UNITS.includes(input.business_unit)) {
    errors.push(error('CONTRACT_INVALID', 'business_unit', `unsupported business_unit: ${input.business_unit}`));
  }

  if (isNonEmptyString(input.sync_status) && !SYNC_STATES.includes(input.sync_status)) {
    errors.push(error('CONTRACT_INVALID', 'sync_status', `unsupported sync_status: ${input.sync_status}`));
  }

  if (input.timestamp !== undefined && !isIsoTimestamp(input.timestamp)) {
    errors.push(error('CONTRACT_INVALID', 'timestamp', 'timestamp must be an ISO-like date-time string'));
  }

  if (input.attribution_state !== undefined && input.attribution_state !== null && !ATTRIBUTION_STATES.includes(input.attribution_state)) {
    errors.push(error('CONTRACT_INVALID', 'attribution_state', `unsupported attribution_state: ${input.attribution_state}`));
  }

  if (input.evidence_strength !== undefined && input.evidence_strength !== null && !EVIDENCE_STRENGTHS.includes(input.evidence_strength)) {
    errors.push(error('CONTRACT_INVALID', 'evidence_strength', `unsupported evidence_strength: ${input.evidence_strength}`));
  }

  for (const field of NULLABLE_CONTEXT_FIELDS) {
    if (!isNullableString(input[field])) {
      errors.push(error('CONTRACT_INVALID', field, `${field} must be a string, null, or absent`));
    }
  }

  const paymentTruthEvent = PAYMENT_TRUTH_EVENT_TYPES.includes(input.event_type);
  if (paymentTruthEvent) {
    if (!isNonEmptyString(input.evidence_ref)) {
      errors.push(error('PURCHASE_EVIDENCE_MISSING', 'evidence_ref', `${input.event_type} requires provider evidence_ref`));
    }
    if (!isNonEmptyString(input.provider)) {
      errors.push(error('PURCHASE_EVIDENCE_MISSING', 'provider', `${input.event_type} requires provider identity`));
    }
    if (!isNonEmptyString(input.provider_transaction_id)) {
      errors.push(error('PURCHASE_EVIDENCE_MISSING', 'provider_transaction_id', `${input.event_type} requires provider transaction identity`));
    }
  } else if (require_trusted_evidence && !isNonEmptyString(input.evidence_ref)) {
    errors.push(error('EVIDENCE_MISSING', 'evidence_ref', 'trusted event requires evidence_ref'));
  }

  return Object.freeze({ ok: errors.length === 0, errors: freeze(errors) });
}

export function validateDecisionOutput(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Object.freeze({ ok: false, errors: freeze([error('CONTRACT_INVALID', '$', 'decision must be an object')]) });
  }

  const requiredStrings = [
    'decision_id',
    'generated_at',
    'business_unit',
    'decision',
    'next_best_action',
    'reason',
    'evidence_strength',
    'max_bottleneck'
  ];

  for (const field of requiredStrings) {
    if (!isNonEmptyString(input[field])) errors.push(error('CONTRACT_INVALID', field, `${field} is required`));
  }

  if (isNonEmptyString(input.generated_at) && !isIsoTimestamp(input.generated_at)) {
    errors.push(error('CONTRACT_INVALID', 'generated_at', 'generated_at must be an ISO-like date-time string'));
  }
  if (isNonEmptyString(input.business_unit) && !BUSINESS_UNITS.includes(input.business_unit)) {
    errors.push(error('CONTRACT_INVALID', 'business_unit', `unsupported business_unit: ${input.business_unit}`));
  }
  if (isNonEmptyString(input.decision) && !DECISION_STATES.includes(input.decision)) {
    errors.push(error('CONTRACT_INVALID', 'decision', `unsupported decision: ${input.decision}`));
  }
  if (isNonEmptyString(input.evidence_strength) && !EVIDENCE_STRENGTHS.includes(input.evidence_strength)) {
    errors.push(error('CONTRACT_INVALID', 'evidence_strength', `unsupported evidence_strength: ${input.evidence_strength}`));
  }
  if (!Array.isArray(input.evidence_ref) || input.evidence_ref.some((value) => !isNonEmptyString(value))) {
    errors.push(error('CONTRACT_INVALID', 'evidence_ref', 'evidence_ref must be an array of non-empty strings'));
  }
  if (typeof input.confidence !== 'number' || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
    errors.push(error('CONTRACT_INVALID', 'confidence', 'confidence must be a number between 0 and 1'));
  }
  if (typeof input.human_gate_required !== 'boolean') {
    errors.push(error('CONTRACT_INVALID', 'human_gate_required', 'human_gate_required must be boolean'));
  }
  if (input.human_gate_required === true && !isNonEmptyString(input.human_gate_reason)) {
    errors.push(error('CONTRACT_INVALID', 'human_gate_reason', 'human_gate_reason is required when human_gate_required is true'));
  }
  if (input.sold_product_ids !== undefined && (!Array.isArray(input.sold_product_ids) || input.sold_product_ids.some((value) => !isNonEmptyString(value)))) {
    errors.push(error('CONTRACT_INVALID', 'sold_product_ids', 'sold_product_ids must be an array of non-empty strings'));
  }

  return Object.freeze({ ok: errors.length === 0, errors: freeze(errors) });
}
