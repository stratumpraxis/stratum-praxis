#!/usr/bin/env node

import { selectStore } from '../lib/store.mjs';
import { decideApproval, dispatchExecution } from '../lib/execution.mjs';

function parseArgs(argv) {
  const out = { local: false, approve: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--local') out.local = true;
    else if (arg === '--signal-id') out.signalId = argv[++i];
    else if (arg === '--approve') out.approve = argv[++i];
    else if (arg === '--actor') out.actor = argv[++i];
    else if (arg === '--note') out.note = argv[++i];
    else throw new Error(`unknown argument ${arg}`);
  }
  return out;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const args = parseArgs(process.argv.slice(2));
if (!args.signalId) {
  print({ ok: false, error: 'usage: execute-action.mjs --signal-id ID [--approve yes|no --actor NAME] [--local]' });
  process.exit(1);
}

const store = selectStore({ preferLocal: args.local });
if (!store.configured) {
  print({ ok: false, status: 'BLOCKED', reason: 'durable MARKET state store is not configured' });
  process.exit(2);
}

let signal = await store.get(args.signalId);
if (!signal) {
  print({ ok: false, error: `signal not found: ${args.signalId}` });
  process.exit(1);
}

const proposal = signal.execution_proposal;
if (!proposal) {
  print({ ok: false, error: 'signal has no execution proposal' });
  process.exit(1);
}

if (proposal.approval?.required && proposal.approval.status === 'PENDING') {
  if (!args.approve) {
    print({
      ok: false,
      status: 'HUMAN_APPROVAL_REQUIRED',
      signal_id: signal.signal_id,
      execution_id: proposal.execution_id,
      action_type: proposal.action_type,
      risk_level: proposal.risk_level,
      expected_value: proposal.expected_value,
      target: proposal.target,
      rationale: proposal.rationale
    });
    process.exit(3);
  }

  const approved = ['yes', 'true', 'approve', 'approved'].includes(String(args.approve).toLowerCase());
  const denied = ['no', 'false', 'deny', 'denied'].includes(String(args.approve).toLowerCase());
  if (!approved && !denied) {
    print({ ok: false, error: '--approve must be yes or no' });
    process.exit(1);
  }
  if (!args.actor) {
    print({ ok: false, error: '--actor is required when recording a human approval decision' });
    process.exit(1);
  }

  const decision = decideApproval(signal, {
    approved,
    actor: args.actor,
    note: args.note ?? null
  });
  if (!decision.ok) {
    print({ ok: false, error: decision.reason });
    process.exit(1);
  }

  signal = decision.signal;
  await store.put(signal);

  if (!approved) {
    print({
      ok: true,
      status: 'DENIED',
      signal_id: signal.signal_id,
      execution_id: signal.execution_proposal.execution_id,
      next_allowed_action: signal.next_allowed_action
    });
    process.exit(0);
  }
}

let executed;
try {
  executed = await dispatchExecution(signal);
} catch (error) {
  print({
    ok: false,
    status: 'BLOCKED',
    reason: error.message,
    failure_class: error.failure_class ?? null
  });
  process.exit(error.failure_class === 'AUTH' ? 2 : 1);
}

if (executed.signal) await store.put(executed.signal);

if (!executed.ok) {
  print({
    ok: false,
    status: 'EXECUTION_FAILED',
    signal_id: executed.signal?.signal_id ?? signal.signal_id,
    execution_id: executed.signal?.execution_proposal?.execution_id ?? proposal.execution_id,
    reason: executed.reason,
    next_allowed_action: executed.signal?.next_allowed_action ?? null
  });
  process.exit(1);
}

print({
  ok: true,
  status: 'ACTIONED',
  signal_id: executed.signal.signal_id,
  execution_id: executed.signal.execution_proposal.execution_id,
  external_ref: executed.external_ref ?? null,
  next_allowed_action: executed.signal.next_allowed_action,
  result: executed.result ?? null
});
