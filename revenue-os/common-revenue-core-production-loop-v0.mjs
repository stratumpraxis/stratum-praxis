import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { appendCanonicalEvents, auditCanonicalLedger, readCanonicalLedger } from './common-revenue-core-ledger-v0.mjs';
import { rollupCanonicalEconomics } from './common-revenue-core-economics-v0.mjs';
import { actionReceiptToCanonicalEvent } from './common-revenue-core-decision-evidence-v0.mjs';
import { allocateGlobalBudget, decidePortfolio } from './common-revenue-core-allocator-nba-v0.mjs';
import { classifyPermission, executeSafeAction } from './common-revenue-core-safe-execution-v0.mjs';
import { replayDecision } from './common-revenue-core-resilience-v0.mjs';

export const PRODUCTION_LOOP_VERSION = 'common-revenue-production-loop-v0';
export const EXECUTION_MODES = Object.freeze(['PLAN_ONLY', 'DRY_RUN', 'EXECUTE']);

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function hash(value) { return createHash('sha256').update(String(value)).digest('hex').slice(0, 24); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }

function sanitizeDecision(decision) {
  if (!decision) return null;
  return Object.freeze({
    decision_id: decision.decision_id,
    business_unit: decision.business_unit,
    decision: decision.decision,
    next_best_action: decision.next_best_action,
    reason: decision.reason,
    confidence: decision.confidence,
    uncertainty: decision.uncertainty,
    human_gate_required: decision.human_gate_required,
    max_bottleneck: decision.max_bottleneck,
    strongest_asset_id: decision.strongest_asset_id,
    strongest_route_id: decision.strongest_route_id,
    strongest_channel: decision.strongest_channel,
    purchase_count: decision.purchase_count,
    contribution_profit_amount: decision.contribution_profit_amount,
    currency: decision.currency,
    evidence_strength: decision.evidence_strength
  });
}

function selectDecision(portfolio, budget) {
  const decisions = Array.isArray(portfolio?.decisions) ? portfolio.decisions : [];
  const allocations = Array.isArray(budget?.allocations) ? [...budget.allocations] : [];
  allocations.sort((a, b) => b.allocation_share - a.allocation_share || String(a.decision_id).localeCompare(String(b.decision_id)));
  if (allocations.length > 0) {
    return decisions.find((decision) => decision.decision_id === allocations[0].decision_id) || null;
  }
  return decisions
    .filter((decision) => decision.decision !== 'STOP')
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0) || String(a.decision_id).localeCompare(String(b.decision_id)))[0] || null;
}

export function decisionToSafeAction(decision, { requested_at = new Date().toISOString() } = {}) {
  if (!decision || decision.decision === 'STOP') return null;

  const mapping = {
    SCALE: 'queue_existing_asset',
    KEEP: 'collect_evidence',
    TEST: 'record_experiment',
    FIX: 'prepare_existing_asset_copy',
    HOLD: 'collect_evidence'
  };
  const actionType = mapping[decision.decision];
  if (!actionType) return null;

  const action = {
    action_id: `act_${hash(`${decision.decision_id}|${actionType}`)}`,
    business_unit: decision.business_unit,
    action_type: actionType,
    asset_id: decision.strongest_asset_id || null,
    product_id: Array.isArray(decision.sold_product_ids) ? decision.sold_product_ids[0] || null : null,
    route_id: decision.strongest_route_id || null,
    channel: decision.strongest_channel || null,
    experiment_id: decision.decision === 'TEST' ? `exp_${hash(decision.decision_id)}` : null,
    cta_id: null,
    requested_at,
    expected_external_writes: 0,
    expected_cost_minor: 0,
    currency: decision.currency || null,
    payload: {
      decision_id: decision.decision_id,
      decision: decision.decision,
      recommendation: decision.next_best_action,
      bottleneck: decision.max_bottleneck
    }
  };

  const permission = classifyPermission(action, {});
  if (permission.level === 'BLOCKED' || permission.level === 'HUMAN_GATE') return null;
  return Object.freeze(action);
}

function verificationSnapshot(events, economics, ingestionStatus) {
  const strongPurchase = events.some((event) => event.event_type === 'purchase' && event.evidence_strength === 'STRONG');
  const strongCaptured = events.some((event) => event.event_type === 'payment_captured' && event.evidence_strength === 'STRONG');
  const strongSettled = events.some((event) => event.event_type === 'payment_settled' && event.evidence_strength === 'STRONG');
  const completeEconomics = Number(economics?.complete_transaction_count || 0) > 0;
  const positiveKnownGross = Array.isArray(economics?.per_currency) && economics.per_currency.some((row) => Number(row.gross_revenue_known_minor || 0) > 0);
  const profitKnown = Array.isArray(economics?.per_currency) && economics.per_currency.some((row) => row.all_economics_complete === true && Number.isFinite(row.contribution_profit_amount_minor));

  return Object.freeze({
    engineering_complete: true,
    live_provider_read_verified: ingestionStatus === 'LIVE',
    verified_purchase: strongPurchase,
    verified_payment_capture: strongCaptured,
    verified_payment_settlement: strongSettled,
    complete_economics_available: completeEconomics,
    positive_gross_revenue_observed: positiveKnownGross,
    contribution_profit_known: profitKnown,
    real_revenue_verified: strongPurchase && strongCaptured && positiveKnownGross,
    real_cash_verified: strongPurchase && strongSettled && positiveKnownGross,
    real_profit_verified: strongPurchase && strongCaptured && profitKnown
  });
}

export async function runProductionRevenueLoop({
  ingestion,
  ledger_file,
  execution_mode = 'DRY_RUN',
  adapters = {},
  execution_policy = {},
  approval = null,
  generated_at = new Date().toISOString(),
  now = () => new Date().toISOString()
} = {}) {
  if (!ingestion || typeof ingestion !== 'object' || !Array.isArray(ingestion.events)) {
    throw Object.assign(new Error('ingestion.events[] required'), { code: 'CONTRACT_INVALID' });
  }
  if (!text(ledger_file)) {
    throw Object.assign(new Error('ledger_file required'), { code: 'CONTRACT_INVALID' });
  }
  if (!EXECUTION_MODES.includes(execution_mode)) {
    throw Object.assign(new Error(`unsupported execution_mode: ${execution_mode}`), { code: 'CONTRACT_INVALID' });
  }

  const ingestionAppend = await appendCanonicalEvents(ingestion.events, { ledgerFile: ledger_file, now });
  let events = await readCanonicalLedger(ledger_file);
  let audit = auditCanonicalLedger(events);
  if (!audit.ok) throw Object.assign(new Error('ledger integrity failed after ingestion append'), { code: 'CORE_UNAVAILABLE', details: audit.errors });

  const portfolioBefore = decidePortfolio(events, { generated_at });
  const budgetBefore = allocateGlobalBudget(portfolioBefore, { execution_units: 1 });
  const selectedDecision = selectDecision(portfolioBefore, budgetBefore);
  const action = decisionToSafeAction(selectedDecision, { requested_at: generated_at });

  let execution = Object.freeze({ status: 'NO_ACTION', permission: null, receipt: null });
  let actionAppend = null;
  if (action && execution_mode === 'PLAN_ONLY') {
    execution = Object.freeze({ status: 'PLAN_ONLY', permission: classifyPermission(action, execution_policy), receipt: null });
  } else if (action) {
    execution = await executeSafeAction(action, {
      adapters,
      policy: execution_policy,
      approval,
      dry_run: execution_mode !== 'EXECUTE',
      now
    });

    if (execution.receipt) {
      const converted = actionReceiptToCanonicalEvent(execution.receipt);
      if (converted.status !== 'ACCEPTED') {
        throw Object.assign(new Error('action receipt failed canonical conversion'), { code: 'CONTRACT_INVALID', details: converted.errors });
      }
      actionAppend = await appendCanonicalEvents([converted.event], { ledgerFile: ledger_file, now });
    }
  }

  events = await readCanonicalLedger(ledger_file);
  audit = auditCanonicalLedger(events);
  if (!audit.ok) throw Object.assign(new Error('ledger integrity failed after action append'), { code: 'CORE_UNAVAILABLE', details: audit.errors });

  const economicsAfter = rollupCanonicalEconomics(events);
  const portfolioAfter = decidePortfolio(events, { generated_at });
  const budgetAfter = allocateGlobalBudget(portfolioAfter, { execution_units: 1 });
  const replay = replayDecision(events, portfolioAfter);
  if (!replay.ok) throw Object.assign(new Error('portfolio replay mismatch'), { code: 'CORE_UNAVAILABLE' });

  const verification = verificationSnapshot(events, economicsAfter, ingestion.status || null);
  return Object.freeze({
    production_loop_version: PRODUCTION_LOOP_VERSION,
    status: 'PASS',
    execution_mode,
    generated_at,
    ingestion_status: ingestion.status || null,
    source_status: ingestion.source_status || null,
    ledger_event_count: events.length,
    ingestion_append: Object.freeze({
      status: ingestionAppend.status,
      appended_count: ingestionAppend.appended_count,
      duplicate_noop_count: ingestionAppend.duplicate_noop_count,
      conflict_count: ingestionAppend.conflict_count,
      invalid_count: ingestionAppend.invalid_count
    }),
    selected_decision: sanitizeDecision(selectedDecision),
    action_request: action ? Object.freeze({
      action_id: action.action_id,
      business_unit: action.business_unit,
      action_type: action.action_type,
      asset_id: action.asset_id,
      product_id: action.product_id,
      route_id: action.route_id,
      channel: action.channel,
      experiment_id: action.experiment_id,
      expected_external_writes: action.expected_external_writes,
      expected_cost_minor: action.expected_cost_minor
    }) : null,
    execution: Object.freeze({
      status: execution.status,
      permission_level: execution.permission?.level || null,
      receipt_status: execution.receipt?.status || null,
      evidence_ref: Object.freeze(unique(execution.receipt?.evidence_ref || []))
    }),
    action_append: actionAppend ? Object.freeze({
      status: actionAppend.status,
      appended_count: actionAppend.appended_count,
      duplicate_noop_count: actionAppend.duplicate_noop_count,
      conflict_count: actionAppend.conflict_count,
      invalid_count: actionAppend.invalid_count
    }) : null,
    economics: Object.freeze({
      status: economicsAfter.status,
      transaction_count: economicsAfter.transaction_count,
      complete_transaction_count: economicsAfter.complete_transaction_count,
      partial_transaction_count: economicsAfter.partial_transaction_count,
      reconciliation_required_transaction_count: economicsAfter.reconciliation_required_transaction_count,
      cross_currency_aggregation: economicsAfter.cross_currency_aggregation
    }),
    portfolio: Object.freeze({
      decision_count: portfolioAfter.decision_count,
      decisions: Object.freeze(portfolioAfter.decisions.map(sanitizeDecision)),
      allocated_share: budgetAfter.allocated_share,
      reserve_share: budgetAfter.reserve_share
    }),
    replay_verified: replay.ok,
    verification
  });
}

async function cli() {
  const ingestionFile = process.env.CRC_INGESTION_FILE || 'revenue-os/common-revenue-core-ingestion.runtime.json';
  const ledgerFile = process.env.CRC_LEDGER_FILE || 'revenue-os/common-revenue-core-production.runtime.jsonl';
  const reportFile = process.env.CRC_PRODUCTION_REPORT || 'revenue-os/common-revenue-core-production.runtime.json';
  const executionMode = process.env.CRC_EXECUTION_MODE || 'DRY_RUN';

  if (executionMode === 'EXECUTE') {
    console.error(JSON.stringify({ status: 'BLOCKED', reason: 'CLI_EXECUTE_REQUIRES_INJECTED_BUSINESS_UNIT_ADAPTER' }, null, 2));
    process.exit(5);
  }

  const ingestion = JSON.parse(await readFile(ingestionFile, 'utf8'));
  const report = await runProductionRevenueLoop({
    ingestion,
    ledger_file: ledgerFile,
    execution_mode: executionMode
  });
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    status: report.status,
    execution_mode: report.execution_mode,
    ingestion_status: report.ingestion_status,
    ledger_event_count: report.ledger_event_count,
    selected_decision: report.selected_decision,
    execution: report.execution,
    verification: report.verification,
    report_file: reportFile,
    ledger_file: ledgerFile
  }, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  cli().catch((error) => {
    console.error(JSON.stringify({ status: 'FAILED', code: error.code || 'UNEXPECTED', message: error.message }, null, 2));
    process.exit(1);
  });
}
