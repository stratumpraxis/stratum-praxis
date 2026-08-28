#!/usr/bin/env node
// Issue #52 - the publish-proof audit. Read-only.
//
//   node acquisition/media-engine/cli/publish-check.mjs
//   node acquisition/media-engine/cli/publish-check.mjs --json
//
// This is the file that refuses to let a request look like a result. It checks each
// derivation against the rung it claims, and reports what evidence the next rung needs.

import { loadDerivations, loadMediaContext } from '../lib/context.mjs';
import { PROOF_CONTRACT, PROOF_STATES, resolvePublishState, validateProofState } from '../lib/publisher-gate.mjs';
import { verifyDerivation } from '../lib/derive.mjs';

const json = process.argv.includes('--json');

const context = await loadMediaContext();
const doc = await loadDerivations();

const rows = doc.derivations.map((derivation) => {
  const siblings = doc.derivations.filter((d) => d.derivation_id !== derivation.derivation_id);
  const verdict = verifyDerivation(derivation, { ...context, siblings });
  const proofErrors = validateProofState(derivation);
  const index = PROOF_STATES.indexOf(derivation.proof_state);
  const nextState = PROOF_STATES[index + 1] ?? null;

  return {
    derivation_id: derivation.derivation_id,
    proof_state: derivation.proof_state,
    queue_state_equivalent: PROOF_CONTRACT[derivation.proof_state]?.queue_state ?? null,
    proof_errors: proofErrors,
    publish_state: verdict.publish_state,
    next_state: nextState,
    next_state_requires: nextState ? PROOF_CONTRACT[nextState].requires : [],
    // What actually stands between this record and the next rung right now.
    blocking: nextState
      ? blockingFor(nextState, derivation, verdict)
      : [],
    external_post_id: derivation.publish_proof?.external_post_id ?? null,
    canonical_url: derivation.publish_proof?.canonical_url ?? null,
    account_id: derivation.publish_proof?.account_id ?? null,
    independent_status_read: derivation.publish_proof?.independent_status_read ?? null
  };
});

const report = {
  ladder: PROOF_STATES,
  contract: PROOF_CONTRACT,
  rows,
  summary: {
    total: rows.length,
    by_proof_state: rows.reduce((acc, r) => {
      acc[r.proof_state] = (acc[r.proof_state] || 0) + 1;
      return acc;
    }, {}),
    publish_requested: rows.filter((r) => r.proof_state === 'PUBLISH_REQUESTED').length,
    published: rows.filter((r) => r.proof_state === 'PUBLISHED').length,
    verified: rows.filter((r) => r.proof_state === 'VERIFIED').length,
    invalid: rows.filter((r) => r.proof_errors.length).map((r) => r.derivation_id)
  },
  statement: 'PUBLISH_REQUESTED is not PUBLISHED. PUBLISHED is not VERIFIED. Each rung requires its own evidence and no code in this engine sets one without it.'
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Media engine publish proof');
  console.log(`  ladder: ${PROOF_STATES.join(' -> ')}`);
  console.log('');
  for (const row of report.rows) {
    console.log(`${row.derivation_id}`);
    console.log(`  proof state    ${row.proof_state} (acquisition queue equivalent: ${row.queue_state_equivalent})`);
    console.log(`  publish gate   ${row.publish_state}`);
    console.log(`  next rung      ${row.next_state ?? 'none'} requires ${row.next_state_requires.join(', ') || 'nothing'}`);
    for (const b of row.blocking) console.log(`    blocked by   ${b}`);
    for (const e of row.proof_errors) console.log(`    INVALID      ${e}`);
    console.log('');
  }
  console.log(`PUBLISH_CHECK_OK published=${report.summary.published} verified=${report.summary.verified} invalid=${report.summary.invalid.length}`);
}

if (report.summary.invalid.length) process.exitCode = 1;

function blockingFor(nextState, derivation, verdict) {
  const blocking = [];
  if (nextState === 'READY' && !verdict.ok) {
    for (const [name, gate] of Object.entries(verdict.gates)) {
      if (gate && gate.ok === false) blocking.push(`${name} gate has not passed`);
    }
  }
  if (nextState === 'PUBLISH_REQUESTED') {
    if (verdict.publish_state === 'BLOCKED') blocking.push(...verdict.publish_gate.blockers);
    for (const step of verdict.publish_gate?.human_steps ?? []) {
      blocking.push(`${step.condition}: ${step.one_time_owner_action ?? step.evidence}`);
    }
    if (derivation.publish_proof?.human_approved !== true) {
      blocking.push('human_approved is not set; no code in this engine sets it');
    }
  }
  if (nextState === 'PUBLISHED') {
    blocking.push('an external_post_id, published_at and account_id from the platform are required; a sent request is not a publication');
  }
  if (nextState === 'VERIFIED') {
    blocking.push('an independent status read of the canonical URL is required; a publish response is not a verification');
  }
  return blocking;
}

export { resolvePublishState };
