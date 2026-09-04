import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  LEDGER_VERSION,
  LedgerError,
  appendCanonicalEvents,
  auditCanonicalLedger,
  eventFingerprint,
  readCanonicalLedger
} from './common-revenue-core-ledger-v0.mjs';

const ts = '2026-09-04T04:00:00.000Z';
const recordedAt = '2026-09-04T04:05:00.000Z';

function trafficEvent(overrides = {}) {
  return {
    event_id: 'evt_traffic_1',
    event_type: 'traffic',
    business_unit: 'stratum',
    timestamp: ts,
    source: 'posthog',
    source_event_name: 'traffic_session_start',
    source_event_id: 'ph_traffic_1',
    evidence_ref: 'posthog:event:ph_traffic_1',
    evidence_strength: 'MODERATE',
    attribution_state: 'ATTRIBUTED',
    sync_status: 'PENDING_SYNC',
    route_id: 'route_1',
    traffic_class: 'REGULAR',
    ...overrides
  };
}

function purchaseEvent(overrides = {}) {
  return {
    event_id: 'evt_purchase_1',
    event_type: 'purchase',
    business_unit: 'vector',
    timestamp: ts,
    source: 'stripe',
    source_event_name: 'checkout.session.snapshot',
    source_event_id: 'cs_live_paid_1',
    evidence_ref: 'stripe:checkout.session.snapshot:cs_live_paid_1',
    evidence_strength: 'STRONG',
    attribution_state: 'ATTRIBUTED',
    sync_status: 'PENDING_SYNC',
    provider: 'stripe',
    provider_transaction_id: 'cs_live_paid_1',
    route_id: 'vpj_hub_cross_agent_v1',
    product_id: 'cross_agent_operating_kit',
    currency: 'usd',
    amount_total: 6900,
    ...overrides
  };
}

async function withTempLedger(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'crc-ledger-'));
  const file = join(dir, 'ledger.jsonl');
  try {
    await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('appends a valid PENDING_SYNC event as SYNCED without rewriting source facts', async () => {
  await withTempLedger(async (file) => {
    const input = trafficEvent();
    const result = await appendCanonicalEvents([input], { ledgerFile: file, now: () => recordedAt });
    assert.equal(result.status, 'SYNCED');
    assert.equal(result.appended_count, 1);

    const ledger = await readCanonicalLedger(file);
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].sync_status, 'SYNCED');
    assert.equal(ledger[0].ledger_version, LEDGER_VERSION);
    assert.equal(ledger[0].ledger_recorded_at, recordedAt);
    assert.equal(ledger[0].route_id, input.route_id);
    assert.equal(ledger[0].source_event_name, input.source_event_name);
    assert.equal(ledger[0].event_fingerprint, eventFingerprint(input));
  });
});

test('replaying the exact same event is an idempotent no-op', async () => {
  await withTempLedger(async (file) => {
    const input = purchaseEvent();
    const first = await appendCanonicalEvents([input], { ledgerFile: file, now: () => recordedAt });
    const second = await appendCanonicalEvents([input], { ledgerFile: file, now: () => '2026-09-04T04:10:00.000Z' });
    assert.equal(first.appended_count, 1);
    assert.equal(second.appended_count, 0);
    assert.equal(second.duplicate_noop_count, 1);
    assert.equal((await readCanonicalLedger(file)).length, 1);
  });
});

test('same event_id with changed facts fails closed as duplicate conflict', async () => {
  await withTempLedger(async (file) => {
    await appendCanonicalEvents([trafficEvent()], { ledgerFile: file, now: () => recordedAt });
    const result = await appendCanonicalEvents([trafficEvent({ route_id: 'route_changed' })], { ledgerFile: file });
    assert.equal(result.status, 'RECONCILIATION_REQUIRED');
    assert.equal(result.conflict_count, 1);
    assert.equal(result.appended_count, 0);
    assert.equal((await readCanonicalLedger(file)).length, 1);
  });
});

test('same provider transaction + event type with a different event_id is a conflict', async () => {
  await withTempLedger(async (file) => {
    await appendCanonicalEvents([purchaseEvent()], { ledgerFile: file, now: () => recordedAt });
    const result = await appendCanonicalEvents([purchaseEvent({ event_id: 'evt_purchase_duplicate' })], { ledgerFile: file });
    assert.equal(result.status, 'RECONCILIATION_REQUIRED');
    assert.equal(result.conflict_count, 1);
    assert.equal(result.conflicts[0].reason, 'PROVIDER_EVENT_ALREADY_SYNCED');
  });
});

test('same source event + canonical event type with a different event_id is a conflict', async () => {
  await withTempLedger(async (file) => {
    await appendCanonicalEvents([trafficEvent()], { ledgerFile: file, now: () => recordedAt });
    const result = await appendCanonicalEvents([trafficEvent({ event_id: 'evt_traffic_duplicate' })], { ledgerFile: file });
    assert.equal(result.status, 'RECONCILIATION_REQUIRED');
    assert.equal(result.conflict_count, 1);
    assert.equal(result.conflicts[0].reason, 'SOURCE_EVENT_ALREADY_SYNCED');
  });
});

test('purchase without provider identity/evidence is rejected and never written', async () => {
  await withTempLedger(async (file) => {
    const result = await appendCanonicalEvents([purchaseEvent({ provider: null, provider_transaction_id: null })], { ledgerFile: file });
    assert.equal(result.status, 'RECONCILIATION_REQUIRED');
    assert.equal(result.invalid_count, 1);
    assert.equal(result.appended_count, 0);
    assert.equal((await readCanonicalLedger(file)).length, 0);
  });
});

test('known QA/automation evidence is rejected as defense in depth', async () => {
  await withTempLedger(async (file) => {
    const result = await appendCanonicalEvents([trafficEvent({ traffic_class: 'EXCLUDED', utm_source: 'codex_qa' })], { ledgerFile: file });
    assert.equal(result.invalid_count, 1);
    assert.equal(result.invalid[0].code, 'QA_AUTOMATION_EXCLUDED');
    assert.equal((await readCanonicalLedger(file)).length, 0);
  });
});

test('ledger append accepts only PENDING_SYNC candidates', async () => {
  await withTempLedger(async (file) => {
    const result = await appendCanonicalEvents([trafficEvent({ sync_status: 'SYNCED' })], { ledgerFile: file });
    assert.equal(result.invalid_count, 1);
    assert.equal(result.appended_count, 0);
  });
});

test('multiple new events append without mutating earlier JSONL bytes', async () => {
  await withTempLedger(async (file) => {
    await appendCanonicalEvents([trafficEvent()], { ledgerFile: file, now: () => recordedAt });
    const before = await readFile(file, 'utf8');
    await appendCanonicalEvents([purchaseEvent()], { ledgerFile: file, now: () => '2026-09-04T04:06:00.000Z' });
    const after = await readFile(file, 'utf8');
    assert.ok(after.startsWith(before));
    assert.equal((await readCanonicalLedger(file)).length, 2);
  });
});

test('audit catches tampered event fingerprints', async () => {
  await withTempLedger(async (file) => {
    await appendCanonicalEvents([trafficEvent()], { ledgerFile: file, now: () => recordedAt });
    const ledger = await readCanonicalLedger(file);
    ledger[0].route_id = 'tampered_route';
    const audit = auditCanonicalLedger(ledger);
    assert.equal(audit.ok, false);
    assert.ok(audit.errors.some((entry) => entry.code === 'EVENT_FINGERPRINT_MISMATCH'));
  });
});

test('malformed JSONL fails closed as LEDGER_CORRUPT', async () => {
  await withTempLedger(async (file) => {
    await writeFile(file, '{bad json}\n', 'utf8');
    await assert.rejects(() => readCanonicalLedger(file), (error) => {
      assert.ok(error instanceof LedgerError);
      assert.equal(error.code, 'LEDGER_CORRUPT');
      return true;
    });
  });
});

test('mixed batch appends valid events while surfacing conflicts/invalids explicitly', async () => {
  await withTempLedger(async (file) => {
    const result = await appendCanonicalEvents([
      trafficEvent(),
      purchaseEvent(),
      trafficEvent({ event_id: 'evt_qa', source_event_id: 'ph_qa', traffic_class: 'EXCLUDED' })
    ], { ledgerFile: file, now: () => recordedAt });

    assert.equal(result.status, 'RECONCILIATION_REQUIRED');
    assert.equal(result.appended_count, 2);
    assert.equal(result.invalid_count, 1);
    const ledger = await readCanonicalLedger(file);
    assert.equal(ledger.length, 2);
    assert.equal(auditCanonicalLedger(ledger).ok, true);
  });
});
