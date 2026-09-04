import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eventFingerprint, LEDGER_VERSION } from './common-revenue-core-ledger-v0.mjs';
import { decidePortfolio } from './common-revenue-core-allocator-nba-v0.mjs';
import { assessMigrationPlan, executeWithFailover, executeWithJournal, readActionJournal, replayDecision, selectAdapterRoute } from './common-revenue-core-resilience-v0.mjs';

function action(overrides = {}) {
  return {
    action_id: 'act_1', business_unit: 'stratum', action_type: 'collect_evidence', asset_id: 'asset_a', product_id: 'product_a', route_id: 'route_a',
    expected_external_writes: 0, expected_cost_minor: 0, ...overrides
  };
}

let seq = 0;
function ledgerEvent(overrides = {}) {
  seq += 1;
  const row = {
    event_id: `evt_${seq}`, event_type: overrides.event_type || 'purchase', business_unit: 'stratum',
    timestamp: `2026-09-04T00:${String(seq).padStart(2,'0')}:00.000Z`, source: 'test', source_event_name: `src_${seq}`, source_event_id: `src_${seq}`,
    evidence_ref: `evidence:${seq}`, evidence_strength: overrides.evidence_strength || 'STRONG', attribution_state: 'ATTRIBUTED', sync_status: 'SYNCED',
    provider: overrides.provider ?? 'stripe', provider_transaction_id: overrides.provider_transaction_id ?? `cs_${seq}`, provider_customer_id: null,
    transaction_id: null, customer_id: null, asset_id: 'asset_a', product_id: 'product_a', channel: 'owned', channel_id: null, route_id: 'route_a', experiment_id: null, action_id: null, cta_id: null,
    amount_minor: overrides.amount_minor ?? 1000, currency: 'usd', refund_state_known: true, chargeback_state_known: true, provider_fee_state_known: true, variable_cost_state_known: true,
    provider_fee_amount_minor: 0, variable_cost_amount_minor: 0, ledger_version: LEDGER_VERSION, ledger_recorded_at: `2026-09-04T01:${String(seq).padStart(2,'0')}:00.000Z`
  };
  row.event_fingerprint = eventFingerprint(row);
  return row;
}

async function withJournal(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'crc-resilience-'));
  const file = join(dir, 'journal.jsonl');
  try { return await fn(file); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('successful journaled execution replays as no-op without a second adapter call', async () => {
  await withJournal(async (journal_file) => {
    let calls = 0;
    const adapters = { stratum: async () => { calls += 1; return { evidence_ref: ['repo:evidence:1'] }; } };
    const first = await executeWithJournal(action(), { journal_file, adapters, dry_run: false, now: () => '2026-09-04T07:00:00.000Z' });
    const second = await executeWithJournal(action(), { journal_file, adapters, dry_run: false, now: () => '2026-09-04T07:01:00.000Z' });
    assert.equal(first.status, 'EXECUTED');
    assert.equal(second.status, 'REPLAY_NOOP');
    assert.equal(calls, 1);
  });
});

test('same action_id with changed payload fails closed', async () => {
  await withJournal(async (journal_file) => {
    const adapters = { stratum: async () => ({ evidence_ref: ['repo:evidence:1'] }) };
    await executeWithJournal(action(), { journal_file, adapters, dry_run: false });
    const changed = await executeWithJournal(action({ payload: { changed: true } }), { journal_file, adapters, dry_run: false });
    assert.equal(changed.status, 'BLOCKED');
    assert.equal(changed.reason, 'ACTION_ID_FINGERPRINT_CONFLICT');
  });
});

test('AUTO transient provider failure retries only within bounded attempts', async () => {
  await withJournal(async (journal_file) => {
    let calls = 0;
    const adapters = { stratum: async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('temporary'), { code: 'PROVIDER_UNAVAILABLE' });
      return { evidence_ref: ['repo:evidence:recovered'] };
    } };
    const result = await executeWithJournal(action(), { journal_file, adapters, dry_run: false, max_attempts: 3 });
    assert.equal(result.status, 'EXECUTED');
    assert.equal(result.attempts, 2);
    assert.equal(calls, 2);
    assert.equal((await readActionJournal(journal_file)).length, 2);
  });
});

test('LIMITED_AUTO ambiguous failure is not automatically retried or replayed', async () => {
  await withJournal(async (journal_file) => {
    let calls = 0;
    const limited = action({ action_type: 'publish_existing_asset', expected_external_writes: 1 });
    const adapters = { stratum: async () => { calls += 1; throw Object.assign(new Error('timeout'), { code: 'TIMEOUT' }); } };
    const first = await executeWithJournal(limited, { journal_file, adapters, dry_run: false, max_attempts: 3 });
    const second = await executeWithJournal(limited, { journal_file, adapters, dry_run: false, max_attempts: 3 });
    assert.equal(first.attempts, 1);
    assert.equal(second.status, 'BLOCKED');
    assert.equal(second.reason, 'PRIOR_AMBIGUOUS_FAILURE_REQUIRES_RECONCILIATION');
    assert.equal(calls, 1);
  });
});

test('concurrent identical actions serialize and execute at most once', async () => {
  await withJournal(async (journal_file) => {
    let calls = 0;
    const adapters = { stratum: async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 80)); return { evidence_ref: ['repo:evidence:one'] }; } };
    const [a, b] = await Promise.all([
      executeWithJournal(action(), { journal_file, adapters, dry_run: false, lock_retries: 20, lock_delay_ms: 10 }),
      executeWithJournal(action(), { journal_file, adapters, dry_run: false, lock_retries: 20, lock_delay_ms: 10 })
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(new Set([a.status, b.status]), new Set(['EXECUTED','REPLAY_NOOP']));
  });
});

test('dry run may later transition to one real execution with the same action id', async () => {
  await withJournal(async (journal_file) => {
    let calls = 0;
    const adapters = { stratum: async () => { calls += 1; return { evidence_ref: ['repo:evidence:real'] }; } };
    const dry = await executeWithJournal(action(), { journal_file, adapters, dry_run: true });
    const real = await executeWithJournal(action(), { journal_file, adapters, dry_run: false });
    assert.equal(dry.status, 'DRY_RUN');
    assert.equal(real.status, 'EXECUTED');
    assert.equal(calls, 1);
  });
});

test('automatic failover is explicit and never used for sensitive actions', async () => {
  const safe = action({ action_type: 'collect_evidence' });
  assert.equal(selectAdapterRoute(safe, { primary_health: 'DOWN', fallback_health: 'HEALTHY', fallback_action_types: ['collect_evidence'] }).route, 'FALLBACK');
  const sensitive = action({ action_type: 'change_price' });
  assert.equal(selectAdapterRoute(sensitive, { primary_health: 'DOWN', fallback_health: 'HEALTHY', fallback_action_types: ['change_price'] }).route, 'NONE');

  let fallbackCalls = 0;
  const result = await executeWithFailover(safe, {
    primary_health: 'DOWN', fallback_health: 'HEALTHY', fallback_action_types: ['collect_evidence'],
    fallback_adapter: async () => { fallbackCalls += 1; return { evidence_ref: ['fallback:evidence:1'] }; }, dry_run: false
  });
  assert.equal(result.status, 'EXECUTED');
  assert.equal(result.failover.route, 'FALLBACK');
  assert.equal(fallbackCalls, 1);
});

test('portfolio decision replay is deterministic for identical evidence and policy', () => {
  const events = Array.from({ length: 5 }, () => ledgerEvent());
  const stored = decidePortfolio(events, { generated_at: '2026-09-04T07:30:00.000Z' });
  const replay = replayDecision(events, stored);
  assert.equal(replay.ok, true);
  assert.equal(replay.expected_fingerprint, replay.actual_fingerprint);
});

test('production migration remains blocked without snapshot rollback dry-run compatibility and human approval', () => {
  const blocked = assessMigrationPlan({ production: true });
  assert.equal(blocked.ready, false);
  assert.ok(blocked.issues.includes('HUMAN_APPROVAL_REQUIRED'));
  const ready = assessMigrationPlan({
    migration_id: 'mig_1', source_snapshot_ref: 'snapshot:1', rollback_plan_ref: 'rollback:1', compatibility_tests_passed: true,
    dry_run_passed: true, preserve_history: true, production: true,
    human_approval: { actor_type: 'human', approval_ref: 'human:approval:1' }
  });
  assert.equal(ready.ready, true);
});
