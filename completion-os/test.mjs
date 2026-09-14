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

const revisionComplete = evaluateCompletion({
  asset_id: 'revision-bound',
  target: 'production',
  target_revision: 'commit-123',
  required_gates: ['source', 'deploy', 'live'],
  gates: {
    source: { status: 'pass', revision: 'commit-123', evidence: ['source commit'] },
    deploy: { status: 'pass', revision: 'commit-123', evidence: ['provider deployment'] },
    live: { status: 'pass', revision: 'commit-123', evidence: ['revision marker observed live'] }
  }
});
assert.equal(revisionComplete.complete, true);
assert.equal(revisionComplete.target_revision, 'commit-123');

const staleProductionEvidence = evaluateCompletion({
  asset_id: 'stale-production',
  target: 'production',
  target_revision: 'commit-new',
  required_gates: ['source', 'deploy', 'live'],
  gates: {
    source: { status: 'pass', revision: 'commit-new', evidence: ['new source exists'] },
    deploy: { status: 'pass', revision: 'commit-old', evidence: ['production deploy exists'] },
    live: { status: 'pass', revision: 'commit-old', evidence: ['production interaction passes'] }
  }
});
assert.equal(staleProductionEvidence.complete, false);
assert.equal(staleProductionEvidence.proven_through, 'source');
assert.equal(staleProductionEvidence.blocker_gate, 'deploy');
assert.equal(staleProductionEvidence.blocker_status, 'unknown');
assert.ok(staleProductionEvidence.blocker_evidence.some(x => x.includes('not target revision commit-new')));
assert.match(staleProductionEvidence.next_action, /target revision commit-new/);

const unboundLiveEvidence = evaluateCompletion({
  asset_id: 'unbound-live',
  target: 'production',
  target_revision: 'commit-xyz',
  required_gates: ['source', 'deploy', 'live'],
  gates: {
    source: { status: 'pass', revision: 'commit-xyz' },
    deploy: { status: 'pass', revision: 'commit-xyz' },
    live: { status: 'pass', evidence: ['browser interaction passed, revision not exposed'] }
  }
});
assert.equal(unboundLiveEvidence.complete, false);
assert.equal(unboundLiveEvidence.proven_through, 'deploy');
assert.equal(unboundLiveEvidence.blocker_gate, 'live');
assert.equal(unboundLiveEvidence.blocker_status, 'unknown');
assert.ok(unboundLiveEvidence.blocker_evidence.some(x => x.includes('not bound to target revision')));

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
