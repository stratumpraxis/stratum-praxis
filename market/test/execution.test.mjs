import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createExecutionProposal,
  decideApproval,
  canExecute,
  dispatchExecution,
  riskForAction
} from '../lib/execution.mjs';

function signal(overrides = {}) {
  return {
    signal_id: 'sig_1234567890abcdef1234567890abcdef',
    correlation_id: 'cor_1234567890abcdef1234567890abcdef',
    route_id: 'workflow-audit',
    status: 'ACTIONABLE',
    updated_at: '2026-09-12T00:00:00.000Z',
    ...overrides
  };
}

function action(action_type, overrides = {}) {
  return {
    action_type,
    description: `do ${action_type}`,
    expected_value: 42,
    target: { kind: 'test', id: 'buyer-1' },
    assets: ['asset-1'],
    payload: { message: 'hello' },
    rationale: 'closest safe action to revenue',
    ...overrides
  };
}

test('risk map follows low / medium / high execution boundary', () => {
  assert.equal(riskForAction('analyze'), 'LOW');
  assert.equal(riskForAction('sales_email'), 'MEDIUM');
  assert.equal(riskForAction('price_change'), 'HIGH');
});

test('low-risk action does not require approval', () => {
  const out = createExecutionProposal(signal(), action('analyze'));
  assert.equal(out.ok, true);
  assert.equal(out.proposal.approval.status, 'NOT_REQUIRED');
  assert.equal(out.signal.status, 'ACTIONABLE');
  assert.equal(out.signal.next_allowed_action, 'EXECUTE');
});

test('medium-risk action requires approval by default', () => {
  const out = createExecutionProposal(signal(), action('sales_email'));
  assert.equal(out.ok, true);
  assert.equal(out.proposal.risk_level, 'MEDIUM');
  assert.equal(out.proposal.approval.status, 'PENDING');
  assert.equal(out.signal.status, 'HUMAN_REQUIRED');
  assert.equal(canExecute(out.signal).ok, false);
});

test('medium-risk action may auto execute only under explicit runtime policy', () => {
  const out = createExecutionProposal(signal(), action('sales_email'), { allowMediumAuto: true });
  assert.equal(out.ok, true);
  assert.equal(out.proposal.approval.status, 'NOT_REQUIRED');
  assert.equal(out.signal.status, 'ACTIONABLE');
});

test('high-risk action always requires human approval even when medium auto policy is on', () => {
  const out = createExecutionProposal(signal(), action('price_change'), { allowMediumAuto: true });
  assert.equal(out.ok, true);
  assert.equal(out.proposal.risk_level, 'HIGH');
  assert.equal(out.proposal.approval.status, 'PENDING');
  assert.equal(out.signal.status, 'HUMAN_REQUIRED');
});

test('human approval returns proposal to ACTIONABLE', () => {
  const proposed = createExecutionProposal(signal(), action('sales_email'));
  const approved = decideApproval(proposed.signal, {
    approved: true,
    actor: 'owner@example',
    now: Date.parse('2026-09-12T01:00:00Z')
  });
  assert.equal(approved.ok, true);
  assert.equal(approved.signal.status, 'ACTIONABLE');
  assert.equal(approved.signal.execution_proposal.approval.status, 'APPROVED');
  assert.equal(canExecute(approved.signal).ok, true);
});

test('human denial pauses the route and prevents execution', () => {
  const proposed = createExecutionProposal(signal(), action('sales_email'));
  const denied = decideApproval(proposed.signal, {
    approved: false,
    actor: 'owner@example'
  });
  assert.equal(denied.ok, true);
  assert.equal(denied.signal.status, 'PAUSED');
  assert.equal(denied.signal.execution_proposal.approval.status, 'DENIED');
  assert.equal(canExecute(denied.signal).ok, false);
});

test('execution sends one signed idempotent request and records ACTIONED result', async () => {
  const proposed = createExecutionProposal(signal(), action('analyze'));
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, external_ref: 'job_123', result: { rows: 7 } };
      }
    };
  };

  const executed = await dispatchExecution(proposed.signal, {
    endpoint: 'https://example.test/execute',
    secret: 'secret',
    fetchImpl,
    now: Date.parse('2026-09-12T02:00:00Z')
  });

  assert.equal(executed.ok, true);
  assert.equal(executed.signal.status, 'ACTIONED');
  assert.equal(executed.signal.execution_proposal.execution.status, 'SUCCEEDED');
  assert.equal(executed.signal.execution_proposal.execution.external_ref, 'job_123');
  assert.equal(executed.signal.next_allowed_action, 'WAIT_FOR_RESULT');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers['Idempotency-Key'], proposed.proposal.execution_id);
  assert.ok(calls[0].init.headers['X-Market-Execution-Signature']);

  const second = canExecute(executed.signal);
  assert.equal(second.ok, false);
});
