import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeDecisionEnvelope,
  resolveProjectAdapter,
  normalizeEvidenceReturn,
  buildNextDecisionTrigger
} from './project-adapter-router-v0.mjs';

const registry = JSON.parse(
  await readFile(new URL('./project-adapter-registry-v0.json', import.meta.url), 'utf8')
);

function decision(overrides = {}) {
  return {
    decision_id: 'dec_001',
    generated_at: '2026-09-26T00:00:00Z',
    business_unit: 'stratum',
    decision: 'KEEP',
    priority_ref: 'priority:upstream:001',
    permission_level: 'AUTO',
    evidence_ref: ['ledger:event:1'],
    action_request: {
      action_id: 'act_001',
      action_type: 'collect_evidence',
      asset_id: 'asset_001',
      route_id: 'route_001',
      expected_external_writes: 0,
      expected_cost_minor: 0,
      payload: {}
    },
    ...overrides
  };
}

test('normalizes already-decided upstream envelope without scoring or allocation', () => {
  const result = normalizeDecisionEnvelope(decision());
  assert.equal(result.ok, true);
  assert.equal(result.envelope.decision_id, 'dec_001');
  assert.equal(result.envelope.action_type, 'collect_evidence');
  assert.equal(result.envelope.priority_ref, 'priority:upstream:001');
});

test('routes Stratum collect_evidence to project-owned heartbeat', () => {
  const result = resolveProjectAdapter(decision(), registry);
  assert.equal(result.status, 'ROUTABLE');
  assert.equal(result.dispatch.repository, 'stratumpraxis/stratum-praxis');
  assert.equal(result.dispatch.workflow, 'project-heartbeat.yml');
  assert.equal(result.dispatch.inputs.control_loop_decision_id, 'dec_001');
  assert.equal(result.dispatch.inputs.control_loop_action_id, 'act_001');
});

test('routes Vector collect_evidence to Vector runtime without changing priority', () => {
  const result = resolveProjectAdapter(
    decision({
      business_unit: 'vector',
      action_request: {
        action_id: 'act_vector_001',
        action_type: 'collect_evidence',
        route_id: 'vpj_owned_ai_agent_bottleneck_v2',
        expected_external_writes: 0,
        expected_cost_minor: 0,
        payload: {}
      }
    }),
    registry
  );
  assert.equal(result.status, 'ROUTABLE');
  assert.equal(result.dispatch.repository, 'stratumpraxis/vector-praxis-japan');
  assert.equal(result.dispatch.workflow, 'vector-public-route-proof.yml');
});

test('does not dispatch upstream Human Gate decisions', () => {
  const result = resolveProjectAdapter(decision({ permission_level: 'HUMAN_GATE' }), registry);
  assert.equal(result.status, 'HUMAN_GATE');
  assert.equal(result.dispatch, null);
});

test('fails closed when a Project owner has not exposed an adapter route', () => {
  const result = resolveProjectAdapter(
    decision({
      action_request: {
        action_id: 'act_002',
        action_type: 'publish_existing_asset',
        expected_external_writes: 1,
        expected_cost_minor: 0,
        payload: {}
      },
      permission_level: 'LIMITED_AUTO'
    }),
    registry
  );
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'ACTION_ROUTE_MISSING');
});

test('rejects workflow success without direct evidence', () => {
  const result = normalizeEvidenceReturn({
    decision_id: 'dec_001',
    action_id: 'act_001',
    business_unit: 'stratum',
    project_runtime: 'project-heartbeat.yml',
    runtime_status: 'success',
    observed_at: '2026-09-26T00:03:00Z',
    direct_evidence: false,
    evidence_ref: ['github-run:123']
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /direct_evidence/);
});

test('normalizes Direct Evidence and emits next-decision trigger', () => {
  const evidence = {
    decision_id: 'dec_001',
    action_id: 'act_001',
    business_unit: 'stratum',
    project_runtime: 'project-heartbeat.yml',
    runtime_status: 'success',
    observed_at: '2026-09-26T00:03:00Z',
    direct_evidence: true,
    evidence_class: 'CURRENT_STATE_READBACK',
    evidence_ref: ['github:issue:175'],
    reality_change: 'STATE_OBSERVED',
    state_before: 'UNKNOWN',
    state_after: 'ATTENTION_REQUIRED'
  };

  const normalized = normalizeEvidenceReturn(evidence);
  assert.equal(normalized.ok, true);

  const trigger = buildNextDecisionTrigger(evidence);
  assert.equal(trigger.status, 'READY');
  assert.equal(trigger.event_type, 'common-revenue-state-changed');
  assert.equal(trigger.client_payload.decision_id, 'dec_001');
  assert.equal(trigger.client_payload.action_id, 'act_001');
});
