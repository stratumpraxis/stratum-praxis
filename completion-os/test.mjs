import assert from 'node:assert/strict';
import { evaluateCompletion } from './evaluate.mjs';

const blockedDeploy = evaluateCompletion({
  asset_id: 'money-resilience',
  target: 'production',
  required_gates: ['source', 'deploy', 'live'],
  gates: {
    source: { status: 'pass', evidence: ['commit:abc'] },
    deploy: { status: 'blocked', evidence: ['provider rate limit'], next_action: 'Retry after provider limit clears.', retry_after: 'provider-defined' },
    live: { status: 'unknown' }
  }
});

assert.equal(blockedDeploy.complete, false);
assert.equal(blockedDeploy.proven_through, 'source');
assert.equal(blockedDeploy.blocker_gate, 'deploy');
assert.equal(blockedDeploy.blocker_status, 'blocked');
assert.deepEqual(blockedDeploy.later_gates_not_proven, ['live']);
assert.equal(blockedDeploy.next_action, 'Retry after provider limit clears.');

const revenueComplete = evaluateCompletion({
  asset_id: 'paid-route',
  target: 'revenue',
  required_gates: ['source', 'deploy', 'live', 'usage', 'action', 'payment'],
  gates: {
    source: { status: 'pass' },
    deploy: { status: 'pass' },
    live: { status: 'pass' },
    usage: { status: 'pass' },
    action: { status: 'pass' },
    payment: { status: 'pass', evidence: ['provider payment id'] }
  }
});

assert.equal(revenueComplete.complete, true);
assert.equal(revenueComplete.proven_through, 'payment');
assert.equal(revenueComplete.blocker_gate, null);

assert.throws(() => evaluateCompletion({
  asset_id: 'bad-order',
  required_gates: ['live', 'deploy'],
  gates: { live: { status: 'pass' }, deploy: { status: 'pass' } }
}), /canonical gate order/);

assert.throws(() => evaluateCompletion({
  asset_id: 'missing-evidence-state',
  required_gates: ['source', 'deploy'],
  gates: { source: { status: 'pass' } }
}), /missing gate state: deploy/);

console.log('Completion OS tests passed');
