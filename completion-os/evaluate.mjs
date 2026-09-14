import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const GATE_ORDER = ['source', 'deploy', 'live', 'usage', 'action', 'payment'];
export const STATUSES = new Set(['pass', 'fail', 'blocked', 'unknown', 'not_required']);

const DEFAULT_NEXT = {
  source: 'Repair or verify the source, then record commit or file evidence.',
  deploy: 'Produce verified deployment evidence for the intended revision.',
  live: 'Check the public endpoint and record expected live behavior.',
  usage: 'Produce real usage/value evidence from the intended user flow.',
  action: 'Verify the intended downstream action with evidence.',
  payment: 'Verify a real payment from the payment provider before claiming revenue.'
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function evaluateCompletion(state) {
  assert(state && typeof state === 'object', 'state must be an object');
  assert(typeof state.asset_id === 'string' && state.asset_id.trim(), 'asset_id is required');
  assert(Array.isArray(state.required_gates) && state.required_gates.length > 0, 'required_gates must be a non-empty array');
  assert(state.gates && typeof state.gates === 'object', 'gates object is required');

  let lastIndex = -1;
  for (const gate of state.required_gates) {
    const index = GATE_ORDER.indexOf(gate);
    assert(index >= 0, `unknown gate: ${gate}`);
    assert(index > lastIndex, 'required_gates must follow canonical gate order without duplicates');
    lastIndex = index;

    const entry = state.gates[gate];
    assert(entry && typeof entry === 'object', `missing gate state: ${gate}`);
    assert(STATUSES.has(entry.status), `invalid status for ${gate}: ${entry.status}`);
    assert(entry.status !== 'not_required', `${gate} is required but marked not_required`);
  }

  const passed = [];
  for (const gate of state.required_gates) {
    const entry = state.gates[gate];
    if (entry.status === 'pass') {
      passed.push(gate);
      continue;
    }

    const later = state.required_gates.slice(state.required_gates.indexOf(gate) + 1);
    return {
      asset_id: state.asset_id,
      target: state.target || null,
      complete: false,
      proven_through: passed.at(-1) || null,
      blocker_gate: gate,
      blocker_status: entry.status,
      blocker_evidence: Array.isArray(entry.evidence) ? entry.evidence : [],
      next_action: entry.next_action || DEFAULT_NEXT[gate],
      retry_after: entry.retry_after || null,
      human_gate: Boolean(entry.human_gate),
      later_gates_not_proven: later,
      rule: 'Act only on the first unmet required gate. Do not infer later completion.'
    };
  }

  return {
    asset_id: state.asset_id,
    target: state.target || null,
    complete: true,
    proven_through: state.required_gates.at(-1),
    blocker_gate: null,
    blocker_status: null,
    blocker_evidence: [],
    next_action: null,
    retry_after: null,
    human_gate: false,
    later_gates_not_proven: [],
    rule: 'All required gates have explicit pass evidence.'
  };
}

export function evaluatePortfolio(states) {
  assert(Array.isArray(states) && states.length > 0, 'portfolio must be a non-empty array');
  return states.map(evaluateCompletion);
}

function readInput(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node completion-os/evaluate.mjs <state.json>');
    process.exit(2);
  }
  try {
    const input = readInput(file);
    const result = Array.isArray(input) ? evaluatePortfolio(input) : evaluateCompletion(input);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`Completion OS error: ${error.message}`);
    process.exit(1);
  }
}
