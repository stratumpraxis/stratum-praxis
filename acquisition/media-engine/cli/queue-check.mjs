#!/usr/bin/env node
// Issue #52 - run every gate over every derivation. Read-only.
//
//   node acquisition/media-engine/cli/queue-check.mjs
//   node acquisition/media-engine/cli/queue-check.mjs --json
//
// Exit code 1 when a derivation claims a state its evidence does not support. A gate
// that blocks is not an error: it is the gate working.

import { loadMediaContext, loadDerivations } from '../lib/context.mjs';
import { verifyDerivation } from '../lib/derive.mjs';

const json = process.argv.includes('--json');

const context = await loadMediaContext();
const doc = await loadDerivations();
const derivations = doc.derivations;

const results = derivations.map((derivation) => {
  const siblings = derivations.filter((d) => d.derivation_id !== derivation.derivation_id);
  const verdict = verifyDerivation(derivation, { ...context, siblings, published: [] });
  return {
    derivation_id: derivation.derivation_id,
    desk_id: derivation.desk_id,
    lens_id: derivation.lens_id,
    channel_id: derivation.channel_id,
    proof_state: derivation.proof_state,
    gates_ok: verdict.ok,
    publish_state: verdict.publish_state,
    max_proof_state: verdict.max_proof_state,
    problems: verdict.problems,
    truth_violations: verdict.gates.truth?.violations ?? [],
    localization_failures: verdict.gates.localization?.failures ?? [],
    localization_quality: verdict.gates.localization?.quality_score ?? null,
    duplication_blocks: verdict.gates.duplication?.blocks ?? [],
    attribution_chain: verdict.gates.attribution?.chain ?? [],
    attribution_problems: verdict.gates.attribution?.problems ?? [],
    unmet_publish_conditions: verdict.publish_gate?.unmet_conditions ?? [],
    publish_blockers: verdict.publish_gate?.blockers ?? [],
    human_steps: verdict.publish_gate?.human_steps ?? []
  };
});

// A derivation may never sit above the proof rung its evidence supports.
const PROOF_ORDER = ['DRAFT', 'READY', 'PUBLISH_REQUESTED', 'PUBLISHED', 'VERIFIED'];
const overclaimed = results.filter((r) => PROOF_ORDER.indexOf(r.proof_state) > PROOF_ORDER.indexOf(r.max_proof_state));

const report = {
  derivations: results,
  summary: {
    total: results.length,
    gates_passing: results.filter((r) => r.gates_ok).length,
    by_publish_state: results.reduce((acc, r) => {
      acc[r.publish_state] = (acc[r.publish_state] || 0) + 1;
      return acc;
    }, {}),
    auto_publish_allowed: results.filter((r) => r.publish_state === 'AUTO_PUBLISH_ALLOWED').length,
    published: results.filter((r) => r.proof_state === 'PUBLISHED' || r.proof_state === 'VERIFIED').length,
    overclaimed_proof_state: overclaimed.map((r) => r.derivation_id)
  }
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Media engine queue check');
  console.log('');
  for (const r of report.derivations) {
    console.log(`${r.derivation_id}`);
    console.log(`  route          ${r.desk_id} / ${r.lens_id} / ${r.channel_id}`);
    console.log(`  gates          ${r.gates_ok ? 'PASS' : 'FAIL'}`);
    for (const v of r.truth_violations) console.log(`    truth       ${v.claim_id}: ${v.sentence}`);
    for (const f of r.localization_failures) console.log(`    localize    ${f.check}: ${f.detail}`);
    for (const b of r.duplication_blocks) console.log(`    duplicate   ${b.rule}: ${b.detail}`);
    for (const p of r.attribution_problems) console.log(`    attribution ${p}`);
    console.log(`  publish state  ${r.publish_state}`);
    for (const b of r.publish_blockers) console.log(`    blocker     ${b}`);
    for (const h of r.human_steps) console.log(`    human step  ${h.condition}: ${h.one_time_owner_action ?? h.evidence}`);
    console.log(`  proof          ${r.proof_state} (max allowed ${r.max_proof_state})`);
    console.log(`  attribution    ${r.attribution_chain.join(' -> ') || 'INCOMPLETE'}`);
    console.log('');
  }
  console.log(`MEDIA_QUEUE_CHECK_OK gates_passing=${report.summary.gates_passing}/${report.summary.total} auto_publish=${report.summary.auto_publish_allowed} published=${report.summary.published}`);
}

if (overclaimed.length) {
  console.error(`refusing: ${overclaimed.length} derivation(s) claim a proof state their evidence does not support`);
  process.exitCode = 1;
}
