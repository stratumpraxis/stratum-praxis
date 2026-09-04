import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { auditCanonicalLedger, readCanonicalLedger } from './common-revenue-core-ledger-v0.mjs';
import { runProductionRevenueLoop } from './common-revenue-core-production-loop-v0.mjs';

const TS = '2026-09-04T06:00:00.000Z';
const NOW = () => TS;

function baseContext() {
  return {
    business_unit: 'stratum',
    asset_id: 'asset_cross_agent',
    product_id: 'cross_agent_69',
    channel: 'owned_web',
    channel_id: 'stratum_site',
    route_id: 'route_cross_agent',
    experiment_id: null,
    action_id: null,
    cta_id: 'cta_buy',
    transaction_id: null,
    customer_id: null
  };
}

function nonPaymentEvent({ id, type, sourceName }) {
  return {
    event_id: id,
    event_type: type,
    timestamp: TS,
    source: 'posthog',
    source_event_name: sourceName,
    source_event_id: id,
    evidence_ref: `posthog:event:${id}`,
    evidence_strength: 'MODERATE',
    attribution_state: 'ATTRIBUTED',
    sync_status: 'PENDING_SYNC',
    provider: null,
    provider_transaction_id: null,
    provider_customer_id: null,
    ...baseContext()
  };
}

function stripeEvent({ id, type, objectType, providerId, links = {}, amount = 6900, extras = {} }) {
  return {
    event_id: id,
    event_type: type,
    timestamp: TS,
    source: 'stripe',
    source_event_name: `${objectType}.snapshot`,
    source_event_id: providerId,
    evidence_ref: `stripe:${objectType}:${providerId}`,
    evidence_strength: 'STRONG',
    attribution_state: 'ATTRIBUTED',
    sync_status: 'PENDING_SYNC',
    provider: 'stripe',
    provider_object_type: objectType,
    provider_transaction_id: providerId,
    provider_customer_id: 'cus_real_1',
    provider_links: links,
    currency: 'usd',
    amount_minor: amount,
    ...baseContext(),
    ...extras
  };
}

function ingestionFixture() {
  return {
    contract: 'common-revenue-core-contract-v0',
    status: 'LIVE',
    source_status: {
      posthog: { status: 'LIVE' },
      stripe: { status: 'LIVE' }
    },
    events: [
      nonPaymentEvent({ id: 'evt_traffic_1', type: 'traffic', sourceName: 'traffic_session_start' }),
      nonPaymentEvent({ id: 'evt_cta_1', type: 'cta_click', sourceName: 'primary_cta_click' }),
      stripeEvent({
        id: 'evt_checkout_1',
        type: 'checkout_started',
        objectType: 'checkout_session',
        providerId: 'cs_1',
        links: { payment_intent: 'pi_1' }
      }),
      stripeEvent({
        id: 'evt_purchase_1',
        type: 'purchase',
        objectType: 'checkout_session',
        providerId: 'cs_1',
        links: { payment_intent: 'pi_1' },
        extras: {
          refund_state_known: true,
          chargeback_state_known: true,
          provider_fee_state_known: true,
          provider_fee_total_minor: 300,
          variable_cost_state_known: true,
          variable_cost_total_minor: 100
        }
      }),
      stripeEvent({
        id: 'evt_capture_1',
        type: 'payment_captured',
        objectType: 'payment_intent',
        providerId: 'pi_1',
        links: { charge: 'ch_1' }
      })
    ]
  };
}

async function withLedger(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'crc-production-loop-'));
  const ledger = join(dir, 'ledger.jsonl');
  try { await fn(ledger); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test('DRY_RUN closes a safe evidence loop without invoking adapters', async () => {
  await withLedger(async (ledger) => {
    let calls = 0;
    const report = await runProductionRevenueLoop({
      ingestion: ingestionFixture(),
      ledger_file: ledger,
      execution_mode: 'DRY_RUN',
      adapters: { stratum: async () => { calls += 1; return { evidence_ref: ['should-not-run'] }; } },
      generated_at: TS,
      now: NOW
    });

    assert.equal(report.status, 'PASS');
    assert.equal(calls, 0);
    assert.equal(report.execution.status, 'DRY_RUN');
    assert.equal(report.execution.receipt_status, 'SKIPPED');
    assert.equal(report.replay_verified, true);
    assert.equal(report.verification.engineering_complete, true);
    assert.equal(report.verification.live_provider_read_verified, true);
    assert.equal(report.verification.verified_purchase, true);
    assert.equal(report.verification.verified_payment_capture, true);
    assert.equal(report.verification.verified_payment_settlement, false);
    assert.equal(report.verification.real_revenue_verified, true);
    assert.equal(report.verification.real_cash_verified, false);
    assert.equal(report.verification.real_profit_verified, true);

    const events = await readCanonicalLedger(ledger);
    assert.equal(events.filter((event) => event.event_type === 'action_executed').length, 1);
    assert.equal(auditCanonicalLedger(events).ok, true);
  });
});

test('EXECUTE only reaches an injected business-unit adapter and records durable evidence', async () => {
  await withLedger(async (ledger) => {
    let calls = 0;
    const report = await runProductionRevenueLoop({
      ingestion: ingestionFixture(),
      ledger_file: ledger,
      execution_mode: 'EXECUTE',
      adapters: {
        stratum: async (action) => {
          calls += 1;
          return {
            status: 'EXECUTED',
            result_summary: `handled:${action.action_type}`,
            evidence_ref: [`lane:stratum:action:${action.action_id}`]
          };
        }
      },
      generated_at: TS,
      now: NOW
    });

    assert.equal(calls, 1);
    assert.equal(report.execution.status, 'EXECUTED');
    assert.equal(report.execution.receipt_status, 'EXECUTED');
    assert.equal(report.execution.permission_level, 'AUTO');
    assert.match(report.execution.evidence_ref[0], /^lane:stratum:action:/);

    const events = await readCanonicalLedger(ledger);
    const action = events.find((event) => event.event_type === 'action_executed');
    assert.ok(action);
    assert.equal(action.action_status, 'EXECUTED');
    assert.equal(action.dry_run, false);
    assert.equal(auditCanonicalLedger(events).ok, true);
  });
});

test('re-running the same cycle is idempotent for source facts and action receipt', async () => {
  await withLedger(async (ledger) => {
    const first = await runProductionRevenueLoop({
      ingestion: ingestionFixture(),
      ledger_file: ledger,
      execution_mode: 'DRY_RUN',
      generated_at: TS,
      now: NOW
    });
    const firstRaw = await readFile(ledger, 'utf8');

    const second = await runProductionRevenueLoop({
      ingestion: ingestionFixture(),
      ledger_file: ledger,
      execution_mode: 'DRY_RUN',
      generated_at: TS,
      now: NOW
    });
    const secondRaw = await readFile(ledger, 'utf8');

    assert.equal(first.ingestion_append.appended_count, 5);
    assert.equal(second.ingestion_append.appended_count, 0);
    assert.equal(second.ingestion_append.duplicate_noop_count, 5);
    assert.equal(second.action_append.appended_count, 0);
    assert.equal(second.action_append.duplicate_noop_count, 1);
    assert.equal(secondRaw, firstRaw);
  });
});

test('PLAN_ONLY produces no Action Receipt side effect', async () => {
  await withLedger(async (ledger) => {
    const report = await runProductionRevenueLoop({
      ingestion: ingestionFixture(),
      ledger_file: ledger,
      execution_mode: 'PLAN_ONLY',
      generated_at: TS,
      now: NOW
    });
    assert.equal(report.execution.status, 'PLAN_ONLY');
    assert.equal(report.action_append, null);
    const events = await readCanonicalLedger(ledger);
    assert.equal(events.some((event) => event.event_type === 'action_executed'), false);
  });
});

test('unknown execution mode fails closed', async () => {
  await withLedger(async (ledger) => {
    await assert.rejects(
      runProductionRevenueLoop({ ingestion: ingestionFixture(), ledger_file: ledger, execution_mode: 'YOLO' }),
      (error) => error.code === 'CONTRACT_INVALID'
    );
  });
});
