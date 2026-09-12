#!/usr/bin/env node

import fs from 'node:fs/promises';
import { selectStore } from '../lib/store.mjs';
import { createExecutionProposal } from '../lib/execution.mjs';

function parseArgs(argv) {
  const out = { local: false, allowMediumAuto: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--local') out.local = true;
    else if (arg === '--allow-medium-auto') out.allowMediumAuto = true;
    else if (arg === '--signal-id') out.signalId = argv[++i];
    else if (arg === '--action-file') out.actionFile = argv[++i];
    else if (arg === '--proposed-by') out.proposedBy = argv[++i];
    else throw new Error(`unknown argument ${arg}`);
  }
  return out;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const args = parseArgs(process.argv.slice(2));
if (!args.signalId || !args.actionFile) {
  print({ ok: false, error: 'usage: propose-action.mjs --signal-id ID --action-file action.json [--local]' });
  process.exit(1);
}

const store = selectStore({ preferLocal: args.local });
if (!store.configured) {
  print({ ok: false, status: 'BLOCKED', reason: 'durable MARKET state store is not configured' });
  process.exit(2);
}

const signal = await store.get(args.signalId);
if (!signal) {
  print({ ok: false, error: `signal not found: ${args.signalId}` });
  process.exit(1);
}

let action;
try {
  action = JSON.parse(await fs.readFile(args.actionFile, 'utf8'));
} catch (error) {
  print({ ok: false, error: `cannot read action file: ${error.message}` });
  process.exit(1);
}

const proposed = createExecutionProposal(signal, action, {
  allowMediumAuto: args.allowMediumAuto,
  proposedBy: args.proposedBy ?? 'revenue-decision-engine'
});

if (!proposed.ok) {
  print({ ok: false, errors: proposed.errors });
  process.exit(1);
}

await store.put(proposed.signal);
print({
  ok: true,
  signal_id: proposed.signal.signal_id,
  execution_id: proposed.proposal.execution_id,
  action_type: proposed.proposal.action_type,
  risk_level: proposed.proposal.risk_level,
  expected_value: proposed.proposal.expected_value,
  approval: proposed.proposal.approval.status,
  next_allowed_action: proposed.signal.next_allowed_action
});
