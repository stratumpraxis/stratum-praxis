#!/usr/bin/env node
// Report whether revenue routes are merely active, proven once, or repeatably proven.
// This command is read-only. It never publishes, sends, or fabricates downstream evidence.

import { adaptTrendVideoLedger, loadLedger, unifiedView } from '../lib/ledger.mjs';
import { assessRepeatability } from '../lib/repeatability.mjs';
import { readJson } from '../lib/util.mjs';

const argv = new Set(process.argv.slice(2));
const asJson = argv.has('--json');

const ledger = await loadLedger();
const adapted = adaptTrendVideoLedger(await readJson('trend-video-engine/publish-ledger.json'), {
  attributionOverlay: ledger.attribution_overlay || null
});
const unified = unifiedView(ledger, adapted);
const report = assessRepeatability(unified);

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log('REVENUE ROUTE REPEATABILITY');
console.log('Policy: one verified attributed purchase = PROVEN_ONCE; two independent verified attributed purchase runs in one route family = REPEATABLE_WIN.');
console.log('');
for (const [verdict, ids] of Object.entries(report.by_verdict)) {
  console.log(`${verdict.padEnd(20)} ${ids.length}`);
  for (const id of ids) console.log(`  - ${id}`);
}

console.log('');
for (const route of report.route_families) {
  console.log(`${route.revenue_route_id} :: ${route.verdict}`);
  console.log(`  ${route.reason}`);
  console.log(`  attributed=${route.evidence.attributed_runs} human=${route.evidence.explicit_human_signal_runs} cta=${route.evidence.cta_runs} checkout=${route.evidence.checkout_runs} verified_purchase_runs=${route.evidence.verified_purchase_runs}`);
}

console.log('\nREPEATABILITY_REPORT_OK');
