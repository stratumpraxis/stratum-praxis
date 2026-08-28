#!/usr/bin/env node
// Issue #52 - plan which desk x lens combinations each derivable source should produce.
// Read-only. It prints a plan; it does not write content and it does not queue anything.
//
//   node acquisition/media-engine/cli/derive.mjs
//   node acquisition/media-engine/cli/derive.mjs --json
//   node acquisition/media-engine/cli/derive.mjs --source <source_id>

import { loadCandidateStore } from '../lib/source.mjs';
import { loadPolicy } from '../../signal-intelligence/lib/normalize.mjs';
import { loadMediaContext, loadDerivations } from '../lib/context.mjs';
import { isDerivable } from '../lib/source.mjs';
import { planDerivations } from '../lib/derive.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const only = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;

const context = await loadMediaContext();
const candidateStore = await loadCandidateStore();
const existing = (await loadDerivations()).derivations;
// Family tiers come from the Issue #53 policy so the two layers cannot disagree about
// which evidence is strongest.
const signalPolicy = await loadPolicy();
const familyTiers = Object.fromEntries(
  Object.entries(signalPolicy.evidence_families).map(([name, cfg]) => [name, cfg.tier]));

const plans = [];
for (const source of context.sourceSet.accepted) {
  if (only && source.source_id !== only) continue;
  const derivable = isDerivable(source);
  if (!derivable.ok) {
    plans.push({ source_id: source.source_id, derivable: false, reason: derivable.reason, selected: [] });
    continue;
  }
  const candidate = source.source_candidate_id
    ? (candidateStore.candidates || []).find((c) => c.source_candidate_id === source.source_candidate_id) || null
    : null;

  const plan = planDerivations(source, {
    desks: context.desks,
    lenses: context.lenses,
    derivationRule: context.derivationRule,
    candidate,
    channels: Object.values(context.channels),
    familyTiers,
    existing,
    now: context.now
  });
  plans.push({ source_id: source.source_id, derivable: true, ...plan });
}

if (json) {
  console.log(JSON.stringify({ plans }, null, 2));
} else {
  console.log('Media engine derivation plan');
  console.log('');
  for (const plan of plans) {
    console.log(plan.source_id);
    if (!plan.derivable) {
      console.log(`  NOT DERIVABLE: ${plan.reason}`);
      console.log('');
      continue;
    }
    console.log(`  ${plan.eligible} of ${plan.considered} desk x lens combinations eligible; cap ${plan.cap}`);
    for (const s of plan.selected) console.log(`    SELECTED ${s.desk_id} / ${s.lens_id}  score ${s.score}`);
    for (const r of plan.rejected.slice(0, 4)) {
      console.log(`    rejected ${r.desk_id} / ${r.lens_id}  score ${r.score}: ${r.reasons[0] || 'below the eligibility floor'}`);
    }
    console.log('');
  }
  console.log('DERIVE_PLAN_OK');
}
