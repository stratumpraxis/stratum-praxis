#!/usr/bin/env node
// Issue #53 - the signal intelligence report. Read-only.
//
//   node acquisition/signal-intelligence/cli/report.mjs
//   node acquisition/signal-intelligence/cli/report.mjs --json
//
// Every line answers a question with evidence or says NOT_MEASURED / CONTRACT_ONLY.

import { readJson } from '../../lib/util.mjs';
import { runDefaultPipeline } from '../lib/pipeline.mjs';

const json = process.argv.includes('--json');

const { result, context } = await runDefaultPipeline();
const providers = context.providers.providers;

const connectionStates = Object.entries(providers).reduce((acc, [name, p]) => {
  (acc[p.connection_state] ||= []).push(name);
  return acc;
}, {});

const supplying = new Set(result.signals.map((s) => s.provider));

const report = {
  generated_for: result.generated_for,
  q1_evidence_records: result.ingest.accepted,
  q2_rejected_records: result.ingest.rejected,
  q3_duplicate_records: result.ingest.duplicates,
  q4_provider_connection_states: connectionStates,
  q5_providers_actually_supplying_evidence: [...supplying].sort(),
  q6_contract_only_providers_with_zero_evidence: (connectionStates.CONTRACT_ONLY || [])
    .filter((name) => !supplying.has(name)),
  q7_theses: result.candidates.map((c) => ({
    thesis_id: c.thesis_id,
    status: c.status,
    revenue_signal_score: c.revenue_signal_score,
    band: c.revenue_signal_band,
    claim_strength: c.claim_strength,
    two_signal_rule: c.corroboration_satisfied ? 'SATISFIED' : 'NOT_SATISFIED',
    corroboration_failures: c.corroboration_failures,
    corroboration_families: c.corroboration_families,
    corroboration_buckets: c.corroboration_buckets,
    external_consensus: c.external_consensus,
    asset_fit_outcome: c.asset_fit_outcome,
    best_existing_asset: c.best_existing_asset,
    asset_fit_score: c.asset_fit_score,
    verification_state: c.verification_state,
    measurement_quality: c.measurement_quality,
    destination_url: c.destination_url,
    eligible_lenses: c.eligible_lenses
  })),
  q8_promoted_to_issue_52: result.promoted_candidate_ids,
  q9_ranking: result.ranking.ranked,
  q10_suppressed_by_cooldown: result.ranking.suppressed,
  q11_exploration_guard: result.ranking.exploration,
  q12_products_created: 0,
  q13_purchase_evidence: await purchaseEvidence(),
  q14_safety: {
    publishes: 'NONE. This layer produces candidate records only.',
    scraping: 'NONE. Every OBSERVED record was read from a file in this repository.',
    account_creation: 'NONE.',
    credentials: 'NONE stored in this directory.'
  }
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Acquisition Signal Intelligence report');
  console.log(`  evidence records accepted            ${report.q1_evidence_records}`);
  console.log(`  rejected / duplicate                 ${report.q2_rejected_records.length} / ${report.q3_duplicate_records.length}`);
  console.log(`  providers supplying evidence         ${report.q5_providers_actually_supplying_evidence.join(', ')}`);
  console.log(`  contract-only, zero evidence         ${report.q6_contract_only_providers_with_zero_evidence.join(', ')}`);
  console.log('');
  for (const t of report.q7_theses) {
    console.log(`  ${t.thesis_id}`);
    console.log(`      ${t.status}  score ${t.revenue_signal_score}  2-signal ${t.two_signal_rule}  asset ${t.best_existing_asset ?? 'NONE'}`);
  }
  console.log('');
  console.log(`  promoted to Issue #52                ${report.q8_promoted_to_issue_52.join(', ') || 'none'}`);
  console.log(`  products created by this layer       ${report.q12_products_created}`);
  console.log(`  purchase evidence                    ${report.q13_purchase_evidence}`);
  console.log('SIGNAL_INTELLIGENCE_REPORT_OK');
}

async function purchaseEvidence() {
  try {
    const metrics = await readJson('revenue-os/metrics.json');
    if (metrics.verified_revenue) return `VERIFIED_REVENUE recorded in revenue-os/metrics.json`;
    return `NO_VERIFIED_PURCHASE: revenue-os/metrics.json records verified_revenue null and stripe_live_payment_intents ${metrics.stripe_live_payment_intents}`;
  } catch {
    return 'NO_VERIFIED_PURCHASE: revenue-os/metrics.json could not be read';
  }
}
