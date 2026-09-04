import { createHash } from 'node:crypto';
import { buildDecisionContexts } from './common-revenue-core-decision-evidence-v0.mjs';
import { validateDecisionOutput } from './common-revenue-core-schema-v0.mjs';

export const ALLOCATOR_VERSION = 'common-revenue-allocator-nba-v0';
export const DEFAULT_POLICY = Object.freeze({
  min_purchases_to_scale: 5,
  min_confidence_to_scale: 0.75,
  min_purchases_to_stop: 5,
  min_confidence_to_stop: 0.75,
  min_traffic_to_test: 20,
  stalled_traffic_threshold: 50,
  max_scale_share_per_scope: 0.6,
  max_test_share_per_scope: 0.2,
  max_fix_share_per_scope: 0.25
});

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function count(context, type) { return Number(context?.event_type_counts?.[type] || 0); }
function hash(value) { return createHash('sha256').update(String(value)).digest('hex').slice(0, 24); }
function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }

function economicSnapshot(context) {
  const rows = Array.isArray(context?.per_currency) ? context.per_currency : [];
  if (rows.length !== 1) {
    return { currency: null, complete: false, contribution_profit_minor: null, reason: rows.length > 1 ? 'MULTI_CURRENCY' : 'ECONOMICS_UNAVAILABLE' };
  }
  const row = rows[0];
  return {
    currency: row.currency || null,
    complete: row.all_economics_complete === true && Number.isFinite(row.contribution_profit_amount_minor),
    contribution_profit_minor: Number.isFinite(row.contribution_profit_amount_minor) ? row.contribution_profit_amount_minor : null,
    reason: row.all_economics_complete === true ? null : 'ECONOMICS_INCOMPLETE'
  };
}

function determineBottleneck(context, economics) {
  const traffic = count(context, 'traffic');
  const cta = count(context, 'cta_click');
  const checkout = count(context, 'checkout_started');
  const purchase = Number(context?.quality?.trusted_purchase_count || 0);
  const refundRate = context?.quality?.refund_rate;
  const chargebackRate = context?.quality?.chargeback_rate;

  if (traffic === 0) return 'TRAFFIC';
  if (cta === 0) return 'CTA';
  if (checkout === 0) return 'CHECKOUT';
  if (purchase === 0) return 'PURCHASE';
  if (refundRate !== null && refundRate !== undefined && refundRate >= 0.25) return 'REFUND_QUALITY';
  if (chargebackRate !== null && chargebackRate !== undefined && chargebackRate > 0) return 'CHARGEBACK_QUALITY';
  if (!economics.complete) return 'ECONOMICS_EVIDENCE';
  return 'NONE';
}

function decide(context, policy) {
  const quality = context.quality || {};
  const purchases = Number(quality.trusted_purchase_count || 0);
  const confidence = clamp01(context.confidence);
  const traffic = count(context, 'traffic');
  const cta = count(context, 'cta_click');
  const checkout = count(context, 'checkout_started');
  const refundRate = quality.refund_rate;
  const chargebackRate = quality.chargeback_rate;
  const economics = economicSnapshot(context);
  const bottleneck = determineBottleneck(context, economics);

  if (context.economics_status === 'INVALID' || context.economics_status === 'RECONCILIATION_REQUIRED') {
    return { decision: 'HOLD', reason: 'Revenue Truth requires reconciliation before allocation.', bottleneck, economics };
  }

  if (purchases === 0) {
    if (traffic >= policy.stalled_traffic_threshold && cta === 0) {
      return { decision: 'FIX', reason: 'Measured traffic exists but no CTA engagement is observed.', bottleneck, economics };
    }
    if (traffic >= policy.stalled_traffic_threshold && cta > 0 && checkout === 0) {
      return { decision: 'FIX', reason: 'CTA engagement exists but no verified checkout start is observed.', bottleneck, economics };
    }
    if (checkout > 0 || traffic >= policy.min_traffic_to_test) {
      return { decision: 'TEST', reason: 'Demand evidence exists but no verified purchase exists; run one bounded test.', bottleneck, economics };
    }
    return { decision: 'HOLD', reason: 'Evidence volume is too small for a commercial allocation decision.', bottleneck, economics };
  }

  if (chargebackRate !== null && chargebackRate !== undefined && chargebackRate >= 0.25) {
    if (purchases >= policy.min_purchases_to_stop && confidence >= policy.min_confidence_to_stop) {
      return { decision: 'STOP', reason: 'Verified chargeback rate is materially high with sufficient evidence.', bottleneck, economics };
    }
    return { decision: 'FIX', reason: 'Chargebacks are present; repair buyer/offer/delivery quality before scaling.', bottleneck, economics };
  }

  if (refundRate !== null && refundRate !== undefined && refundRate >= 0.5) {
    if (purchases >= policy.min_purchases_to_stop && confidence >= policy.min_confidence_to_stop) {
      return { decision: 'STOP', reason: 'Verified refund rate is materially high with sufficient evidence.', bottleneck, economics };
    }
    return { decision: 'FIX', reason: 'Refund quality is weak; repair the route before further allocation.', bottleneck, economics };
  }

  if (economics.complete && economics.contribution_profit_minor < 0) {
    if (purchases >= policy.min_purchases_to_stop && confidence >= policy.min_confidence_to_stop) {
      return { decision: 'STOP', reason: 'Contribution profit is negative with enough verified purchase evidence.', bottleneck, economics };
    }
    return { decision: 'FIX', reason: 'Contribution profit is negative; repair economics before scaling.', bottleneck, economics };
  }

  if (!economics.complete) {
    return { decision: 'KEEP', reason: 'Verified purchases exist, but economics are incomplete; preserve the route without scaling.', bottleneck, economics };
  }

  if (economics.contribution_profit_minor > 0 && purchases >= policy.min_purchases_to_scale && confidence >= policy.min_confidence_to_scale) {
    return { decision: 'SCALE', reason: 'Verified purchases, positive contribution profit, and evidence confidence meet the scale threshold.', bottleneck, economics };
  }

  return { decision: 'KEEP', reason: 'The route has verified revenue but not enough evidence for a scale or stop decision.', bottleneck, economics };
}

function nextBestAction(decision, bottleneck) {
  if (decision === 'SCALE') return 'Increase allocation to the existing proven route within the approved execution budget; do not create a new product.';
  if (decision === 'KEEP') return bottleneck === 'ECONOMICS_EVIDENCE'
    ? 'Keep the route active and collect missing fee/cost evidence before increasing allocation.'
    : 'Keep the current route active and collect more verified outcome evidence.';
  if (decision === 'TEST') return 'Run one bounded test using the existing asset and route, with an experiment_id and action receipt.';
  if (decision === 'FIX') {
    const map = {
      TRAFFIC: 'Repair or change the existing distribution route before changing the product.',
      CTA: 'Improve one primary CTA on the existing route and measure it as a bounded experiment.',
      CHECKOUT: 'Repair the CTA-to-checkout transition and verify provider checkout creation.',
      PURCHASE: 'Inspect checkout-to-purchase friction without changing payment truth.',
      REFUND_QUALITY: 'Inspect offer/delivery mismatch and reduce refund causes before scaling.',
      CHARGEBACK_QUALITY: 'Stop expansion and inspect buyer/offer/payment quality before further allocation.',
      ECONOMICS_EVIDENCE: 'Collect missing provider fee and variable cost evidence before scaling.'
    };
    return map[bottleneck] || 'Repair the largest verified bottleneck before allocating more resources.';
  }
  if (decision === 'STOP') return 'Stop new allocation to this route while preserving historical evidence and existing buyer access.';
  return 'Collect the missing evidence required for the next commercial decision; do not infer unknown values.';
}

function evidenceStrength(context) {
  const score = Number(context?.quality?.average_evidence_strength_score || 0);
  if (score >= 0.8) return 'STRONG';
  if (score >= 0.55) return 'MODERATE';
  if (score > 0.2) return 'WEAK';
  return 'UNVERIFIED';
}

export function decidePortfolio(events = [], { generated_at = new Date().toISOString(), policy = {} } = {}) {
  const effectivePolicy = Object.freeze({ ...DEFAULT_POLICY, ...policy });
  const contexts = buildDecisionContexts(events);
  const decisions = contexts.map((context) => {
    const result = decide(context, effectivePolicy);
    const scope = [context.business_unit, context.product_id, context.route_id, context.asset_id].map((v) => text(v) || '-').join('|');
    const output = {
      decision_id: `dec_${hash(`${scope}|${generated_at}|${result.decision}`)}`,
      generated_at,
      business_unit: context.business_unit,
      decision: result.decision,
      next_best_action: nextBestAction(result.decision, result.bottleneck),
      reason: result.reason,
      evidence_ref: context.evidence_ref,
      evidence_strength: evidenceStrength(context),
      confidence: clamp01(context.confidence),
      human_gate_required: false,
      human_gate_reason: null,
      max_bottleneck: result.bottleneck,
      sold_product_ids: context.quality.trusted_purchase_count > 0 && context.product_id ? [context.product_id] : [],
      strongest_asset_id: context.asset_id || null,
      strongest_route_id: context.route_id || null,
      strongest_channel: context.channel || null,
      gross_revenue_amount: context.per_currency?.length === 1 ? context.per_currency[0].gross_revenue_known_minor ?? null : null,
      contribution_profit_amount: result.economics.complete ? result.economics.contribution_profit_minor : null,
      currency: result.economics.currency,
      purchase_count: context.quality.trusted_purchase_count,
      uncertainty: context.uncertainty,
      allocator_version: ALLOCATOR_VERSION,
      execution_class: 'PLAN_ONLY'
    };
    const validation = validateDecisionOutput(output);
    return Object.freeze({ ...output, contract_valid: validation.ok, validation_errors: validation.errors });
  });

  return Object.freeze({
    allocator_version: ALLOCATOR_VERSION,
    generated_at,
    policy: effectivePolicy,
    decision_count: decisions.length,
    decisions: Object.freeze(decisions)
  });
}

function stateWeight(decision) {
  return { SCALE: 1, KEEP: 0.45, TEST: 0.35, FIX: 0.3, HOLD: 0, STOP: 0 }[decision] ?? 0;
}

function shareCap(decision, policy) {
  if (decision === 'SCALE') return policy.max_scale_share_per_scope;
  if (decision === 'TEST') return policy.max_test_share_per_scope;
  if (decision === 'FIX') return policy.max_fix_share_per_scope;
  if (decision === 'KEEP') return 0.3;
  return 0;
}

export function allocateGlobalBudget(portfolio, { execution_units = 1, human_minutes = null } = {}) {
  const decisions = Array.isArray(portfolio?.decisions) ? portfolio.decisions : [];
  const eligible = decisions.map((decision) => {
    const raw = stateWeight(decision.decision) * (0.5 + 0.5 * clamp01(decision.confidence));
    return { decision, raw, cap: shareCap(decision.decision, portfolio.policy || DEFAULT_POLICY) };
  }).filter((row) => row.raw > 0 && row.cap > 0);

  const rawTotal = eligible.reduce((sum, row) => sum + row.raw, 0);
  const allocations = eligible.map((row) => {
    const uncapped = rawTotal > 0 ? row.raw / rawTotal : 0;
    const share = Math.min(row.cap, uncapped);
    return {
      decision_id: row.decision.decision_id,
      business_unit: row.decision.business_unit,
      decision: row.decision.decision,
      allocation_share: share,
      execution_units: Number.isFinite(execution_units) ? execution_units * share : null,
      human_minutes: Number.isFinite(human_minutes) ? human_minutes * share : null
    };
  });

  const allocatedShare = allocations.reduce((sum, row) => sum + row.allocation_share, 0);
  return Object.freeze({
    allocator_version: ALLOCATOR_VERSION,
    allocated_share: allocatedShare,
    reserve_share: Math.max(0, 1 - allocatedShare),
    allocations: Object.freeze(allocations.map(Object.freeze)),
    rule: 'Unallocated capacity remains reserve; allocation never fabricates cash or cross-currency budget.'
  });
}
