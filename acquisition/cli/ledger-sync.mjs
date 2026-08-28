#!/usr/bin/env node
// PHASE 9 - build the unified distribution ledger view.
//
// trend-video-engine/publish-ledger.json is read ONLY. This CLI never writes to it.
// Acquisition-owned records live in acquisition/distribution-ledger.json.
//
// Usage:
//   node acquisition/cli/ledger-sync.mjs           # dry run, prints the unified view
//   node acquisition/cli/ledger-sync.mjs --write   # persist adapted records into the acquisition ledger
//   node acquisition/cli/ledger-sync.mjs --json

import {
  adaptTrendVideoLedger,
  appendRecord,
  loadLedger,
  makeRecord,
  saveLedger,
  summarize,
  unifiedView
} from '../lib/ledger.mjs';
import { loadQueue } from '../lib/queue.mjs';
import { readJson } from '../lib/util.mjs';

const argv = new Set(process.argv.slice(2));
const write = argv.has('--write');
const asJson = argv.has('--json');

const videoLedger = await readJson('trend-video-engine/publish-ledger.json');
const videoBefore = JSON.stringify(videoLedger);
const adapted = adaptTrendVideoLedger(videoLedger);

let ledger = await loadLedger();

// Mirror queue items that have actually reached PUBLISHED or VERIFIED. Nothing
// earlier is a distribution event, so nothing earlier enters the ledger.
const queue = await loadQueue();
for (const item of queue.items) {
  if (!['PUBLISHED', 'VERIFIED'].includes(item.status)) continue;
  ledger = appendRecord(ledger, makeRecord({
    ledger_id: `acq:${item.queue_id}`,
    lane: 'acquisition',
    platform: item.platform,
    asset: item.asset_id,
    campaign: item.utm_parameters?.utm_campaign || 'UNKNOWN',
    post_id: item.external_post_id,
    published_at: item.published_at,
    destination: item.destination_url,
    utm: item.utm_parameters,
    status: item.status === 'VERIFIED' ? 'PUBLISHED' : 'IN_FLIGHT',
    verification_time: item.verification_status?.checked_at ?? null,
    error: item.error ?? null,
    source_ref: `acquisition/distribution-queue.json#${item.queue_id}`
  }));
}

if (write) {
  await saveLedger(ledger);
}

// Guard: prove the video ledger file was not mutated by this run.
const videoAfter = JSON.stringify(await readJson('trend-video-engine/publish-ledger.json'));
if (videoBefore !== videoAfter) {
  console.error('FATAL: trend-video-engine/publish-ledger.json changed during a read-only sync');
  process.exit(1);
}

const unified = unifiedView(ledger, adapted);
const summary = summarize(unified);

if (asJson) {
  console.log(JSON.stringify({ summary, records: unified }, null, 2));
} else {
  console.log(`Unified distribution ledger - ${summary.records} record(s)`);
  console.log(`  acquisition lane      : ${unified.filter((r) => r.lane === 'acquisition').length}`);
  console.log(`  trend-video-engine    : ${unified.filter((r) => r.lane === 'trend-video-engine').length} (adapted read-only)`);
  console.log(`  published / in-flight / error / unknown: ${summary.published} / ${summary.in_flight} / ${summary.errored} / ${summary.unknown}`);
  console.log('\n  Funnel roll-up (NOT_MEASURED is never counted as zero):');
  for (const [stage, value] of Object.entries(summary.stages)) {
    console.log(`    ${stage.padEnd(20)} ${JSON.stringify(value)}`);
  }
  console.log(`\n  Video ledger untouched: yes (${videoBefore.length} bytes before and after)`);
}
// In --json mode stdout stays pure JSON.
(asJson ? console.error : console.log)(`\nLEDGER_SYNC_OK write=${write}`);
