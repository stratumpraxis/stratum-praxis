import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPermission, executeSafeAction } from './common-revenue-core-safe-execution-v0.mjs';

function action(overrides = {}) {
  return {
    action_id: 'act_1',
    business_unit: 'stratum',
    action_type: 'collect_evidence',
    asset_id: 'asset_a',
    product_id: 'product_a',
    route_id: 'route_a',
    channel: 'owned',
    experiment_id: 'exp_1',
    expected_external_writes: 0,
    expected_cost_minor: 0,
    requested_at: '2026-09-04T06:00:00.000Z',
    ...overrides
  };
}

test('unknown actions fail closed', () => {
  const result = classifyPermission(action({ action_type: 'mystery_action' }));
  assert.equal(result.level, 'BLOCKED');
});

test('payment, price, refund and main merge remain Human Gates', () => {
  for (const action_type of ['change_price','change_payment_configuration','issue_refund','merge_main']) {
    assert.equal(classifyPermission(action({ action_type })).level, 'HUMAN_GATE');
  }
});

test('limited external action requires one-or-fewer writes, zero known cost and allowlist', () => {
  const item = action({ action_type: 'publish_existing_asset', expected_external_writes: 1, expected_cost_minor: 0 });
  const allowed = classifyPermission(item, { allowed_route_ids: ['route_a'], allowed_asset_ids: ['asset_a'] });
  assert.equal(allowed.level, 'LIMITED_AUTO');
  const denied = classifyPermission({ ...item, route_id: 'route_other' }, { allowed_route_ids: ['route_a'] });
  assert.equal(denied.level, 'BLOCKED');
});

test('nonzero or unknown limited-action cost escalates to Human Gate', () => {
  assert.equal(classifyPermission(action({ action_type: 'update_existing_cta', expected_external_writes: 1, expected_cost_minor: 10 })).level, 'HUMAN_GATE');
  assert.equal(classifyPermission(action({ action_type: 'update_existing_cta', expected_external_writes: 1, expected_cost_minor: null })).level, 'HUMAN_GATE');
});

test('dry run never calls external adapter', async () => {
  let calls = 0;
  const result = await executeSafeAction(action(), {
    dry_run: true,
    adapters: { stratum: async () => { calls += 1; return { evidence_ref: ['should-not-run'] }; } },
    now: () => '2026-09-04T06:01:00.000Z'
  });
  assert.equal(calls, 0);
  assert.equal(result.status, 'DRY_RUN');
  assert.equal(result.receipt.status, 'SKIPPED');
});

test('real AUTO execution requires a business-unit adapter and execution evidence', async () => {
  const noAdapter = await executeSafeAction(action(), { dry_run: false, now: () => '2026-09-04T06:02:00.000Z' });
  assert.equal(noAdapter.status, 'BLOCKED');

  const noEvidence = await executeSafeAction(action(), {
    dry_run: false,
    adapters: { stratum: async () => ({ status: 'EXECUTED', evidence_ref: [] }) },
    now: () => '2026-09-04T06:03:00.000Z'
  });
  assert.equal(noEvidence.status, 'FAILED');

  const executed = await executeSafeAction(action(), {
    dry_run: false,
    adapters: { stratum: async () => ({ status: 'EXECUTED', result_summary: 'evidence collected', evidence_ref: ['repo:evidence:1'] }) },
    now: () => '2026-09-04T06:04:00.000Z'
  });
  assert.equal(executed.status, 'EXECUTED');
  assert.deepEqual(executed.receipt.evidence_ref, ['repo:evidence:1']);
});

test('Human Gate action cannot execute without explicit human approval reference', async () => {
  let calls = 0;
  const sensitive = action({ action_type: 'change_price' });
  const blocked = await executeSafeAction(sensitive, {
    dry_run: false,
    adapters: { stratum: async () => { calls += 1; return { evidence_ref: ['x'] }; } },
    now: () => '2026-09-04T06:05:00.000Z'
  });
  assert.equal(blocked.status, 'BLOCKED');
  assert.equal(calls, 0);

  const approved = await executeSafeAction(sensitive, {
    dry_run: false,
    approval: { actor_type: 'human', approval_ref: 'human:approval:123', approved_at: '2026-09-04T06:05:30.000Z' },
    adapters: { stratum: async () => { calls += 1; return { evidence_ref: ['provider:price-change:1'], result_summary: 'approved test adapter' }; } },
    now: () => '2026-09-04T06:06:00.000Z'
  });
  assert.equal(approved.status, 'EXECUTED');
  assert.equal(calls, 1);
});
