#!/usr/bin/env node
// PHASE 10 - the daily acquisition report.
//
// Answers the twelve questions from the brief, in order, from repository state only.
// It never claims traffic, clicks, checkout or revenue that is not backed by a
// recorded measurement, and it prints NOT_MEASURED rather than 0 where nothing
// has been measured.
//
// Usage:
//   node acquisition/cli/daily-report.mjs [--json] [--write]

import { loadInventory, hasLiveCheckout } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { routeDemand } from '../lib/router.mjs';
import { describeClaim, scoreSignal } from '../lib/signal-score.mjs';
import { loadQueue } from '../lib/queue.mjs';
import { adaptTrendVideoLedger, loadLedger, summarize, unifiedView } from '../lib/ledger.mjs';
import { classifyAll, groupByVerdict } from '../lib/winner.mjs';
import { nowIso, readJson, repoPath, writeJson } from '../lib/util.mjs';

const argv = new Set(process.argv.slice(2));
const asJson = argv.has('--json');
const write = argv.has('--write');

const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const signalFile = await readJson('acquisition/demand-signals.json');
const queue = await loadQueue();
const ledger = await loadLedger();
const adapted = adaptTrendVideoLedger(await readJson('trend-video-engine/publish-ledger.json'));
const unified = unifiedView(ledger, adapted);
const ledgerSummary = summarize(unified);

// 1-3. Signals, matched assets, and where they should go.
const signals = signalFile.signals.map((signal) => {
  const score = scoreSignal(signal.scores);
  const route = routeDemand(signal, inventory, { sourceRouting, providerPolicy });
  return {
    signal_id: signal.signal_id,
    title: signal.title,
    score: `${score.total}/${score.max}`,
    verdict: score.verdict,
    claim_strength: score.claim_strength,
    claim_note: describeClaim(score),
    blocks: score.blocks,
    matched_asset: route.best_existing_asset,
    destination: route.destination_url,
    confidence: route.confidence,
    risk: route.risk,
    channels: route.channels.selected.map((c) => ({ channel: c.channel, automation: c.automation })),
    new_product_gate: route.new_product_gate
  };
});

// 4-5. What was actually published, and what was actually verified.
const publishedFromQueue = queue.items.filter((i) => ['PUBLISHED', 'VERIFIED'].includes(i.status));
const verifiedFromQueue = queue.items.filter((i) => i.status === 'VERIFIED');

// 6-9. Downstream evidence per route. Only measured records contribute.
const routes = unified.map((record) => ({
  route_id: record.ledger_id,
  destination_views: record.funnel.downstream_views,
  cta_clicks: record.funnel.cta_clicks,
  checkout: record.funnel.checkout,
  purchase: record.funnel.purchase,
  purchase_evidence: record.funnel.purchase_evidence || null
}));
const classified = classifyAll(routes);
const grouped = groupByVerdict(classified);

const measuredRoutes = classified.filter((c) => c.measurement.destination_views !== 'NOT_MEASURED');
const ctaRoutes = classified.filter((c) => c.measurement.cta_clicks !== 'NOT_MEASURED' && c.measurement.cta_clicks > 0);
const checkoutRoutes = classified.filter((c) => c.measurement.checkout !== 'NOT_MEASURED' && c.measurement.checkout > 0);
const purchaseRoutes = classified.filter((c) => c.measurement.purchase !== 'NOT_MEASURED' && c.measurement.purchase > 0);

const commercialGaps = inventory.assets
  .filter((asset) => asset.status !== 'RETIRED' && !hasLiveCheckout(asset) && asset.revenue_destination?.type !== 'INTERNAL_FUNNEL')
  .map((asset) => ({ asset_id: asset.asset_id, status: asset.status, destination_type: asset.revenue_destination?.type, note: asset.revenue_destination?.evidence }));

const humanRequired = [
  ...queue.items
    .filter((i) => i.human_required_reason)
    .map((i) => ({ scope: `queue:${i.queue_id}`, reason: i.human_required_reason })),
  ...queue.items
    .filter((i) => i.approval_status === 'PENDING_HUMAN' && ['READY', 'DRAFT'].includes(i.status))
    .map((i) => ({ scope: `queue:${i.queue_id}`, reason: 'awaiting a human approval decision before it may be scheduled' })),
  ...Object.entries(providerPolicy.providers || {})
    .filter(([, cfg]) => cfg?.publishingEnabled === false && String(cfg?.status || '').includes('candidate'))
    .map(([name, cfg]) => ({ scope: `provider:${name}`, reason: cfg.manualRequirement || 'account connection / authentication is a manual owner step' }))
];

const report = {
  generated_at: nowIso(),
  generated_by: 'acquisition/cli/daily-report.mjs',
  evidence_policy: 'Numbers appear only when a measurement was recorded. NOT_MEASURED and NOT_INSTRUMENTED are distinct from 0. No traffic, click, checkout or revenue figure in this report is inferred.',
  q1_demand_signals: signals.map((s) => ({ signal_id: s.signal_id, title: s.title, score: s.score, verdict: s.verdict, claim_strength: s.claim_strength, blocks: s.blocks })),
  q2_matched_assets: signals.map((s) => ({ signal_id: s.signal_id, asset_id: s.matched_asset, confidence: s.confidence, risk: s.risk, new_product_gate: s.new_product_gate })),
  q3_recommended_distribution: signals.filter((s) => s.verdict !== 'REJECT').map((s) => ({ signal_id: s.signal_id, destination: s.destination, channels: s.channels })),
  q4_actually_published: {
    from_acquisition_queue: publishedFromQueue.map((i) => ({ queue_id: i.queue_id, platform: i.platform, external_post_id: i.external_post_id, published_at: i.published_at })),
    from_all_lanes: ledgerSummary.published,
    in_flight_all_lanes: ledgerSummary.in_flight,
    errored_all_lanes: ledgerSummary.errored
  },
  q5_actually_verified: {
    from_acquisition_queue: verifiedFromQueue.map((i) => ({ queue_id: i.queue_id, evidence: i.verification_status?.evidence })),
    note: 'A PUBLISHED record becomes VERIFIED only after an independent status read. Buffer "sent" is treated as PUBLISHED, not VERIFIED.'
  },
  q6_qualified_traffic: measuredRoutes.length
    ? measuredRoutes.map((r) => ({ route_id: r.route_id, destination_views: r.measurement.destination_views }))
    : 'NOT_MEASURED - no route in the unified ledger carries a recorded destination_view count',
  q7_cta_activity: ctaRoutes.length
    ? ctaRoutes.map((r) => ({ route_id: r.route_id, cta_clicks: r.measurement.cta_clicks, cta_rate: r.measurement.cta_rate }))
    : 'NOT_MEASURED - no route carries a recorded cta_click count',
  q8_checkout_activity: checkoutRoutes.length
    ? checkoutRoutes.map((r) => ({ route_id: r.route_id, checkout: r.measurement.checkout }))
    : 'NOT_MEASURED - no route carries a recorded checkout count',
  q9_purchase_evidence: purchaseRoutes.length
    ? purchaseRoutes.map((r) => ({ route_id: r.route_id, purchase: r.measurement.purchase }))
    : 'NO_VERIFIED_PURCHASE - no route carries a purchase count backed by payment-provider evidence',
  q10_scale: grouped.SCALE,
  q11_stop: grouped.STOP,
  q12_insufficient_data: grouped.INSUFFICIENT_DATA,
  iterate: grouped.ITERATE,
  ledger_summary: ledgerSummary,
  attribution_gap: ledgerSummary.attribution,
  commercial_path_gaps: commercialGaps,
  human_required: humanRequired
};

if (write) {
  const date = report.generated_at.slice(0, 10);
  await writeJson(`acquisition/reports/${date}-acquisition-report.json`, report);
  console.error(`written: acquisition/reports/${date}-acquisition-report.json`);
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const line = (label, value) => console.log(`${String(label).padEnd(34)} ${value}`);
console.log(`ACQUISITION REPORT  ${report.generated_at}`);
console.log(report.evidence_policy);

console.log('\n1. Demand signals');
for (const s of report.q1_demand_signals) {
  line(`   ${s.signal_id}`, `${s.score} ${s.verdict} (${s.claim_strength})`);
  for (const block of s.blocks) line('     BLOCKED', block);
}

console.log('\n2. Matched existing assets');
for (const s of report.q2_matched_assets) line(`   ${s.signal_id}`, `${s.asset_id ?? 'NONE'} conf=${s.confidence} risk=${s.risk.join('/')} gate=${s.new_product_gate}`);

console.log('\n3. Recommended distribution');
for (const s of report.q3_recommended_distribution) line(`   ${s.signal_id}`, `${s.channels.map((c) => `${c.channel}[${c.automation}]`).join(', ') || 'none'} -> ${s.destination}`);

console.log('\n4. Actually published');
line('   acquisition queue', report.q4_actually_published.from_acquisition_queue.length);
line('   all lanes (published)', report.q4_actually_published.from_all_lanes);
line('   all lanes (in flight)', report.q4_actually_published.in_flight_all_lanes);
line('   all lanes (error)', report.q4_actually_published.errored_all_lanes);

console.log('\n5. Actually verified');
line('   acquisition queue', report.q5_actually_verified.from_acquisition_queue.length);
console.log(`   ${report.q5_actually_verified.note}`);

console.log('\n6-9. Downstream evidence');
line('   qualified traffic', typeof report.q6_qualified_traffic === 'string' ? report.q6_qualified_traffic : `${report.q6_qualified_traffic.length} route(s)`);
line('   CTA activity', typeof report.q7_cta_activity === 'string' ? report.q7_cta_activity : `${report.q7_cta_activity.length} route(s)`);
line('   checkout activity', typeof report.q8_checkout_activity === 'string' ? report.q8_checkout_activity : `${report.q8_checkout_activity.length} route(s)`);
line('   purchase evidence', typeof report.q9_purchase_evidence === 'string' ? report.q9_purchase_evidence : `${report.q9_purchase_evidence.length} route(s)`);

console.log('\n10-12. Winner engine');
line('   SCALE', report.q10_scale.length ? report.q10_scale.join(', ') : 'none');
line('   ITERATE', report.iterate.length ? report.iterate.join(', ') : 'none');
line('   STOP', report.q11_stop.length ? report.q11_stop.join(', ') : 'none');
line('   INSUFFICIENT_DATA', `${report.q12_insufficient_data.length} route(s)`);

console.log('\nAttribution gap (published posts that cannot be traced to a destination)');
line('   published, attributed', report.attribution_gap.published_with_attribution);
line('   published, unattributed', report.attribution_gap.published_without_attribution);

console.log('\nCommercial path gaps (routes that cannot end in a purchase)');
for (const gap of report.commercial_path_gaps) line(`   ${gap.asset_id}`, `${gap.status} / ${gap.destination_type}`);

console.log('\nHUMAN_REQUIRED');
for (const hr of report.human_required) line(`   ${hr.scope}`, hr.reason);

console.log('\nACQUISITION_REPORT_OK');
