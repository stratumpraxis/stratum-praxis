#!/usr/bin/env node
// Human-burden-aware portfolio allocation report.
//
// This command is intentionally decision-only. It may rank and recommend. It may
// not publish, change checkout configuration, merge production code, or invent
// measurements that are not present in the repository ledgers.

import { loadInventory } from '../lib/inventory.mjs';
import { loadSourceRouting, knownChannels } from '../lib/utm.mjs';
import { adaptTrendVideoLedger, loadLedger, unifiedView } from '../lib/ledger.mjs';
import { buildPortfolioPlan, rankDemandProbes, rankMeasuredRoutes } from '../lib/portfolio-allocator.mjs';
import { nowIso, readJson, writeJson } from '../lib/util.mjs';

const argv = new Set(process.argv.slice(2));
const asJson = argv.has('--json');
const write = argv.has('--write');

const policy = await readJson('acquisition/portfolio-policy.json');
const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const signalFile = await readJson('acquisition/demand-signals.json');
const acquisitionLedger = await loadLedger();
const adaptedVideo = adaptTrendVideoLedger(await readJson('trend-video-engine/publish-ledger.json'), {
  attributionOverlay: acquisitionLedger.attribution_overlay || null
});
const records = unifiedView(acquisitionLedger, adaptedVideo);

const measuredRoutes = rankMeasuredRoutes(records, policy);
const demandProbes = rankDemandProbes(signalFile.signals || [], inventory, {
  sourceRouting,
  providerPolicy,
  policy
});
const plan = buildPortfolioPlan({ measuredRoutes, demandProbes, policy });

const report = {
  generated_at: nowIso(),
  generated_by: 'acquisition/cli/portfolio-report.mjs',
  evidence_policy: 'No revenue is inferred. Purchases count only when the ledger carries payment-provider evidence. Unmeasured values stay unmeasured.',
  autonomy_boundary: 'The controller may rank, prepare, test and report. External publication, irreversible changes, billing/payment changes and production merges remain human-gated.',
  plan,
  top_measured_routes: measuredRoutes.slice(0, 10),
  top_demand_probes: demandProbes.slice(0, 10)
};

if (write) {
  const date = report.generated_at.slice(0, 10);
  await writeJson(`acquisition/reports/${date}-portfolio-report.json`, report);
  console.error(`written: acquisition/reports/${date}-portfolio-report.json`);
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`PORTFOLIO REPORT  ${report.generated_at}`);
console.log(report.evidence_policy);
console.log(`budget=${plan.human_touch_budget_minutes}m allocated=${plan.human_touch_minutes_allocated}m actions=${plan.selected.length}/${plan.max_active_actions}`);
console.log('\nSELECTED');
for (const item of plan.selected) {
  console.log(`${item.type}\t${item.id}\tscore=${item.allocation_score}\thuman=${item.human_minutes}m\t${item.action}\tasset=${item.asset_id || 'UNKNOWN'}`);
}
console.log('\nSTOPPED');
for (const item of plan.stopped) console.log(`${item.id}\t${item.verdict}\t${item.asset_id || 'UNKNOWN'}`);
console.log('\nDEFERRED');
for (const item of plan.deferred.slice(0, 10)) console.log(`${item.type}\t${item.id}\tscore=${item.allocation_score}`);
console.log('\nPORTFOLIO_REPORT_OK');
