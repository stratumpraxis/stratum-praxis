import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const GATE_ORDER = ['source', 'deploy', 'live', 'usage', 'action', 'payment'];
export const STATUSES = new Set(['pass', 'fail', 'blocked', 'unknown', 'not_required']);
const REVISION_BOUND_GATES = new Set(['source', 'deploy', 'live']);

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

function revisionScope(state, gate, entry) {
  if (!state.target_revision || !REVISION_BOUND_GATES.has(gate) || entry.status !== 'pass') return null;
  const target = String(state.target_revision).trim();
  const evidenceRevision = entry.revision == null ? '' : String(entry.revision).trim();

  if (!evidenceRevision) {
    return {
      status: 'unknown',
      evidence: [`${gate} has pass-like evidence, but it is not bound to target revision ${target}.`],
      next_action: `Bind ${gate} evidence to the intended revision ${target} before claiming this gate as pass.`
    };
  }

  if (evidenceRevision !== target) {
    return {
      status: 'unknown',
      evidence: [`${gate} evidence applies to revision ${evidenceRevision}, not target revision ${target}.`],
      next_action: `Produce ${gate} evidence for target revision ${target}; do not reuse evidence from ${evidenceRevision}.`
    };
  }

  return null;
}

export function evaluateCompletion(state) {
  assert(state && typeof state === 'object', 'state must be an object');
  assert(typeof state.asset_id === 'string' && state.asset_id.trim(), 'asset_id is required');
  assert(Array.isArray(state.required_gates) && state.required_gates.length > 0, 'required_gates must be a non-empty array');
  assert(state.gates && typeof state.gates === 'object', 'gates object is required');
  if (state.target_revision != null) assert(String(state.target_revision).trim(), 'target_revision must be non-empty when provided');

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
    const scopeProblem = revisionScope(state, gate, entry);
    const effectiveStatus = scopeProblem?.status || entry.status;

    if (effectiveStatus === 'pass') {
      passed.push(gate);
      continue;
    }

    const later = state.required_gates.slice(state.required_gates.indexOf(gate) + 1);
    const entryEvidence = Array.isArray(entry.evidence) ? entry.evidence : [];
    return {
      asset_id: state.asset_id,
      target: state.target || null,
      target_revision: state.target_revision || null,
      complete: false,
      proven_through: passed.at(-1) || null,
      blocker_gate: gate,
      blocker_status: effectiveStatus,
      blocker_evidence: [...entryEvidence, ...(scopeProblem?.evidence || [])],
      next_action: scopeProblem?.next_action || entry.next_action || DEFAULT_NEXT[gate],
      retry_after: scopeProblem ? null : (entry.retry_after || null),
      human_gate: scopeProblem ? false : Boolean(entry.human_gate),
      later_gates_not_proven: later,
      rule: 'Act only on the first unmet required gate. Do not infer later completion or reuse revision-mismatched evidence.'
    };
  }

  return {
    asset_id: state.asset_id,
    target: state.target || null,
    target_revision: state.target_revision || null,
    complete: true,
    proven_through: state.required_gates.at(-1),
    blocker_gate: null,
    blocker_status: null,
    blocker_evidence: [],
    next_action: null,
    retry_after: null,
    human_gate: false,
    later_gates_not_proven: [],
    rule: 'All required gates have explicit pass evidence for the intended revision where revision binding is required.'
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
