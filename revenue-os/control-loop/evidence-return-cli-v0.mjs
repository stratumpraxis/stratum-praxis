import fs from 'node:fs/promises';
import {
  normalizeEvidenceReturn,
  buildNextDecisionTrigger
} from './project-adapter-router-v0.mjs';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function main() {
  const inputFile =
    process.argv[2] ||
    process.env.CONTROL_LOOP_EVIDENCE_FILE ||
    '/tmp/control-loop-evidence.json';
  const evidenceOut =
    process.env.CONTROL_LOOP_EVIDENCE_OUT ||
    'revenue-os/control-loop/evidence-return.runtime.json';
  const triggerOut =
    process.env.CONTROL_LOOP_NEXT_TRIGGER_OUT ||
    'revenue-os/control-loop/next-decision-trigger.runtime.json';

  const input = JSON.parse(await fs.readFile(inputFile, 'utf8'));
  const normalized = normalizeEvidenceReturn(input);
  const trigger = buildNextDecisionTrigger(input);

  const evidenceReceipt = {
    control_loop_version: 'autonomous-control-loop-v0',
    normalized_at: new Date().toISOString(),
    status: normalized.ok ? 'EVIDENCE_NORMALIZED' : 'BLOCKED',
    errors: normalized.errors,
    evidence: normalized.evidence
  };

  await fs.writeFile(evidenceOut, JSON.stringify(evidenceReceipt, null, 2) + '\n', 'utf8');
  await fs.writeFile(triggerOut, JSON.stringify(trigger, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({ evidenceReceipt, trigger }, null, 2));
  if (!normalized.ok || trigger.status !== 'READY') process.exit(3);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        control_loop_version: 'autonomous-control-loop-v0',
        status: 'FAILED',
        reason: text(error?.code) || text(error?.name) || 'UNEXPECTED',
        message: text(error?.message) || String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});
