import { createHash } from 'node:crypto';
import { rollupCanonicalEconomics } from './common-revenue-core-economics-v0.mjs';
import { validateCanonicalEvent } from './common-revenue-core-schema-v0.mjs';

export const DECISION_EVIDENCE_VERSION = 'common-revenue-decision-evidence-v0';
export const ACTION_RECEIPT_STATUSES = Object.freeze(['EXECUTED', 'FAILED', 'SKIPPED', 'BLOCKED']);

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function hash(value) { return createHash('sha256').update(String(value)).digest('hex').slice(0, 24); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function ratio(n, d) { return d > 0 ? n / d : null; }
function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

export function validateActionReceipt(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: [{ field: '$', reason: 'OBJECT_REQUIRED' }] };
  for (const field of ['action_id', 'business_unit', 'action_type', 'status', 'executed_at']) {
    if (!text(input[field])) errors.push({ field, reason: 'REQUIRED' });
  }
  if (!['stratum', 'vector'].includes(input.business_unit)) errors.push({ field: 'business_unit', reason: 'UNSUPPORTED' });
  if (!ACTION_RECEIPT_STATUSES.includes(input.status)) errors.push({ field: 'status', reason: 'UNSUPPORTED' });
  if (!Number.isFinite(Date.parse(input.executed_at || ''))) errors.push({ field: 'executed_at', reason: 'INVALID_TIMESTAMP' });
  if (typeof input.human_gate_required !== 'boolean') errors.push({ field: 'human_gate_required', reason: 'BOOLEAN_REQUIRED' });
  if (typeof input.dry_run !== 'boolean') errors.push({ field: 'dry_run', reason: 'BOOLEAN_REQUIRED' });
  if (!Array.isArray(input.evidence_ref) || input.evidence_ref.some((v) => !text(v))) errors.push({ field: 'evidence_ref', reason: 'NON_EMPTY_ARRAY_REQUIRED' });
  if (input.status === 'EXECUTED' && input.evidence_ref?.length === 0) errors.push({ field: 'evidence_ref', reason: 'EXECUTION_EVIDENCE_REQUIRED' });
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

export function actionReceiptToCanonicalEvent(receipt) {
  const validation = validateActionReceipt(receipt);
  if (!validation.ok) return Object.freeze({ status: 'INVALID', errors: validation.errors });
  const evidenceRef = receipt.evidence_ref[0] || `action:${receipt.action_id}`;
  const event = {
    event_id: `crc_action_${hash(`${receipt.action_id}|${receipt.executed_at}|${receipt.status}`)}`,
    event_type: 'action_executed',
    business_unit: receipt.business_unit,
    timestamp: receipt.executed_at,
    source: 'common_revenue_core_action_receipt',
    source_event_name: 'action_receipt.v0',
    source_event_id: receipt.action_id,
    evidence_ref: evidenceRef,
    evidence_strength: receipt.status === 'EXECUTED' && receipt.dry_run === false ? 'MODERATE' : 'WEAK',
    attribution_state: 'NOT_APPLICABLE',
    sync_status: 'PENDING_SYNC',
    provider: null,
    provider_transaction_id: null,
    provider_customer_id: null,
    transaction_id: null,
    customer_id: null,
    asset_id: receipt.asset_id || null,
    product_id: receipt.product_id || null,
    channel: receipt.channel || null,
    channel_id: receipt.channel_id || null,
    route_id: receipt.route_id || null,
    experiment_id: receipt.experiment_id || null,
    action_id: receipt.action_id,
    cta_id: receipt.cta_id || null,
    action_type: receipt.action_type,
    action_status: receipt.status,
    dry_run: receipt.dry_run,
    human_gate_required: receipt.human_gate_required,
    result_summary: text(receipt.result_summary) || null,
    input_fingerprint: text(receipt.input_fingerprint) || null,
    result_fingerprint: text(receipt.result_fingerprint) || null
  };
  const canonical = validateCanonicalEvent(event, { require_trusted_evidence: true });
  return canonical.ok
    ? Object.freeze({ status: 'ACCEPTED', event: Object.freeze(event) })
    : Object.freeze({ status: 'INVALID', errors: canonical.errors });
}

function evidenceScore(event) {
  return { STRONG: 1, MODERATE: 0.65, WEAK: 0.3, UNVERIFIED: 0 }[event?.evidence_strength] ?? 0;
}

function concentration(events, field) {
  const counts = new Map();
  for (const event of events) {
    const key = text(event?.[field]);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return { top_share: null, top_value: null, distinct: 0 };
  const [topValue, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { top_share: topCount / total, top_value: topValue, distinct: counts.size };
}

function scopeKey(event) {
  return [text(event.business_unit), text(event.product_id), text(event.route_id), text(event.asset_id)].join('|');
}

function transactionEvents(events) {
  return events.filter((event) => ['purchase','payment_captured','payment_settled','refund','chargeback','repeat_purchase'].includes(event.event_type));
}

export function buildExperimentContexts(events = []) {
  const groups = new Map();
  for (const event of events) {
    const id = text(event?.experiment_id);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(event);
  }
  return Object.freeze([...groups.entries()].map(([experiment_id, rows]) => {
    const sorted = [...rows].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    return Object.freeze({
      experiment_id,
      business_units: Object.freeze(unique(rows.map((e) => text(e.business_unit)))),
      first_seen_at: sorted[0]?.timestamp || null,
      last_seen_at: sorted.at(-1)?.timestamp || null,
      action_count: rows.filter((e) => e.event_type === 'action_executed').length,
      traffic_count: rows.filter((e) => e.event_type === 'traffic').length,
      checkout_count: rows.filter((e) => e.event_type === 'checkout_started').length,
      verified_purchase_count: rows.filter((e) => e.event_type === 'purchase' && e.evidence_strength === 'STRONG').length,
      evidence_ref: Object.freeze(unique(rows.map((e) => text(e.evidence_ref)))),
      causal_status: 'OBSERVATIONAL',
      causal_claim_allowed: false
    });
  }));
}

export function projectRevenueQuality(events = []) {
  const trustedPurchases = events.filter((e) => e.event_type === 'purchase' && e.evidence_strength === 'STRONG');
  const repeatPurchases = events.filter((e) => e.event_type === 'repeat_purchase' && e.evidence_strength === 'STRONG');
  const refunds = events.filter((e) => e.event_type === 'refund' && e.evidence_strength === 'STRONG');
  const chargebacks = events.filter((e) => e.event_type === 'chargeback' && e.evidence_strength === 'STRONG');
  const attributable = transactionEvents(events).filter((e) => e.attribution_state === 'ATTRIBUTED');
  const monetary = transactionEvents(events);
  const avgEvidence = events.length ? events.reduce((sum, e) => sum + evidenceScore(e), 0) / events.length : 0;
  const purchaseSample = trustedPurchases.length;
  const attributionCoverage = ratio(attributable.length, monetary.length);
  const refundRate = ratio(refunds.length, trustedPurchases.length);
  const chargebackRate = ratio(chargebacks.length, trustedPurchases.length);
  const repeatRate = ratio(repeatPurchases.length, trustedPurchases.length);
  const routeConcentration = concentration(trustedPurchases, 'route_id');
  const productConcentration = concentration(trustedPurchases, 'product_id');
  const sampleConfidence = 1 - Math.exp(-purchaseSample / 5);
  const evidenceConfidence = avgEvidence;
  const attributionConfidence = attributionCoverage ?? 0.25;
  const confidence = clamp01(sampleConfidence * 0.5 + evidenceConfidence * 0.3 + attributionConfidence * 0.2);
  const uncertainty = 1 - confidence;

  return Object.freeze({
    trusted_purchase_count: trustedPurchases.length,
    repeat_purchase_count: repeatPurchases.length,
    refund_count: refunds.length,
    chargeback_count: chargebacks.length,
    refund_rate: refundRate,
    chargeback_rate: chargebackRate,
    repeat_purchase_rate: repeatRate,
    attribution_coverage: attributionCoverage,
    average_evidence_strength_score: avgEvidence,
    route_concentration: Object.freeze(routeConcentration),
    product_concentration: Object.freeze(productConcentration),
    confidence,
    uncertainty,
    evidence_ref: Object.freeze(unique(events.map((e) => text(e.evidence_ref))))
  });
}

export function buildDecisionContexts(events = []) {
  const groups = new Map();
  for (const event of events) {
    const key = scopeKey(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  const contexts = [];
  for (const rows of groups.values()) {
    const first = rows[0] || {};
    const quality = projectRevenueQuality(rows);
    const economics = rollupCanonicalEconomics(rows);
    const eventTypes = Object.fromEntries([...new Set(rows.map((e) => e.event_type))].map((type) => [type, rows.filter((e) => e.event_type === type).length]));
    const actionRows = rows.filter((e) => e.event_type === 'action_executed');
    contexts.push(Object.freeze({
      decision_context_version: DECISION_EVIDENCE_VERSION,
      business_unit: first.business_unit || null,
      product_id: first.product_id || null,
      route_id: first.route_id || null,
      asset_id: first.asset_id || null,
      channel: first.channel || null,
      event_count: rows.length,
      event_type_counts: Object.freeze(eventTypes),
      quality,
      economics_status: economics.status,
      per_currency: economics.per_currency || Object.freeze([]),
      portfolio_currency: economics.portfolio_currency || null,
      portfolio_contribution_profit_amount_minor: economics.portfolio_contribution_profit_amount_minor ?? null,
      action_count: actionRows.length,
      last_action_at: actionRows.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))[0]?.timestamp || null,
      experiment_ids: Object.freeze(unique(rows.map((e) => text(e.experiment_id)))),
      evidence_ref: Object.freeze(unique(rows.map((e) => text(e.evidence_ref)))),
      confidence: quality.confidence,
      uncertainty: quality.uncertainty
    }));
  }
  return Object.freeze(contexts);
}
