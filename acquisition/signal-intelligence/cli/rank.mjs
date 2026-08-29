#!/usr/bin/env node
// Issue #53 - corroborate, score, fit and rank every thesis. Read-only.
//
//   node acquisition/signal-intelligence/cli/rank.mjs
//   node acquisition/signal-intelligence/cli/rank.mjs --json
//   node acquisition/signal-intelligence/cli/rank.mjs --thesis <thesis_id>

import { runDefaultPipeline } from '../lib/pipeline.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const only = args.includes('--thesis') ? args[args.indexOf('--thesis') + 1] : null;

const { result } = await runDefaultPipeline();
const candidates = only ? result.candidates.filter((c) => c.thesis_id === only) : result.candidates;

if (json) {
  console.log(JSON.stringify({ ...result, candidates }, null, 2));
} else {
  console.log('Acquisition Signal Intelligence - ranked theses');
  console.log('');
  for (const c of candidates) {
    console.log(`${c.thesis_id}`);
    console.log(`  status                 ${c.status}`);
    console.log(`  revenue signal score   ${c.revenue_signal_score}/100 (band ${c.revenue_signal_band}, raw ${c.revenue_signal_raw_score})`);
    console.log(`  claim strength         ${c.claim_strength}`);
    console.log(`  2-Signal Rule          ${c.corroboration_satisfied ? 'SATISFIED' : 'NOT SATISFIED'} (${c.evidence_strength})`);
    if (c.corroboration_failures.length) {
      for (const f of c.corroboration_failures) console.log(`    - ${f}`);
    }
    console.log(`  counted signals        ${c.supporting_signal_ids.join(', ') || 'none'}`);
    console.log(`  families / buckets     ${c.corroboration_families.join(', ') || 'none'} / ${c.corroboration_buckets.join(', ') || 'none'}`);
    if (c.excluded_as_dependent.length) {
      for (const x of c.excluded_as_dependent) {
        console.log(`    excluded ${x.signal_id}: ${x.reason} (conflicts with ${x.conflicts_with})`);
      }
    }
    for (const x of c.excluded_as_non_independent_source || []) {
      console.log(`    not demand evidence ${x.signal_id} (${x.post_type}): ${x.detail}`);
    }
    console.log(`  external consensus     ${c.external_consensus}`);
    console.log(`  asset fit              ${c.asset_fit_outcome} -> ${c.asset_id ?? 'NONE'} (${c.asset_fit_score})`);
    console.log(`  destination            ${c.destination_url ?? 'NONE'}`);
    console.log(`  measurement quality    ${c.measurement_quality}`);
    console.log(`  eligible lenses        ${c.eligible_lenses.join(', ') || 'none'}`);
    console.log(`  new product gate       ${c.new_product_gate} (product_created=${c.product_created})`);
    console.log('');
  }
  console.log('Ranking (exploration guard applied)');
  for (const r of result.ranking.ranked) {
    console.log(`  ${r.priority}  ${r.source_candidate_id}  lane=${r.lane}  prior=${r.prior_verdict}`);
  }
  for (const s of result.ranking.suppressed) {
    console.log(`  SUPPRESSED ${s.source_candidate_id}: ${s.detail}`);
  }
  console.log('');
  console.log(`RANK_OK promoted=${result.promoted_candidate_ids.length}`);
}
