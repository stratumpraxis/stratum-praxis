#!/usr/bin/env node
// PHASE 8 / PHASE 11 - validate the distribution queue and run the safety gate.
//
// Usage:
//   node acquisition/cli/queue-check.mjs            # report only (safe default)
//   node acquisition/cli/queue-check.mjs --apply    # persist DRAFT -> READY/ERROR
//   node acquisition/cli/queue-check.mjs --json
//
// This CLI never publishes anything. Publication requires HUMAN_APPROVED plus a
// publisher lane, and both are checked elsewhere.

import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { evaluateQueue, loadQueue, runSafetyGate, saveQueue, validateQueue } from '../lib/queue.mjs';
import { checkExternalLaneCollisions } from '../lib/safety.mjs';
import { normalizeExternalStatus } from '../lib/ledger.mjs';
import { readJson } from '../lib/util.mjs';

const argv = new Set(process.argv.slice(2));
const apply = argv.has('--apply');
const asJson = argv.has('--json');

const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });

let queue;
try {
  queue = await loadQueue();
} catch (error) {
  console.error(`QUEUE_INVALID: ${error.message}`);
  for (const problem of error.errors || []) console.error(`  - ${problem}`);
  process.exit(1);
}

/** Build the in-flight picture from the OTHER distribution lanes (read-only). */
async function collectInFlight() {
  const inFlight = [];

  for (const file of ['distribution/launch-now.json', 'distribution/content-queue.json']) {
    try {
      const items = await readJson(file);
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (item?.active === false) continue;
        const url = item?.url ? new URL(item.url) : null;
        for (const service of item?.services || []) {
          inFlight.push({
            lane: file,
            platform: String(service).toLowerCase(),
            destination_url: item.url,
            campaign: url?.searchParams.get('utm_campaign') || '',
            state: 'SCHEDULED'
          });
        }
      }
    } catch { /* lane file absent is not an error */ }
  }

  try {
    const videoLedger = await readJson('trend-video-engine/publish-ledger.json');
    for (const [manifestId, services] of Object.entries(videoLedger.items || {})) {
      for (const [service, entry] of Object.entries(services || {})) {
        if (service.startsWith('_') || !entry) continue;
        inFlight.push({
          lane: 'trend-video-engine/publish-ledger.json',
          platform: service.toLowerCase(),
          destination_url: entry.externalLink || '',
          campaign: manifestId,
          state: normalizeExternalStatus(entry.status)
        });
      }
    }
  } catch { /* absent is not an error */ }

  return inFlight;
}

const inFlight = await collectInFlight();
const collisions = checkExternalLaneCollisions(queue.items, inFlight);
const collisionsById = new Map();
for (const collision of collisions) {
  if (!collisionsById.has(collision.queue_id)) collisionsById.set(collision.queue_id, []);
  collisionsById.get(collision.queue_id).push(collision);
}

const context = { inventory, providerPolicy, sourceRouting };
const audit = evaluateQueue(queue, context);

const perItem = queue.items.map((item) => {
  const verdict = audit.results.find((r) => r.queue_id === item.queue_id) || { ok: false, blocks: ['no verdict'], warnings: [], human_required: [] };
  const itemCollisions = collisionsById.get(item.queue_id) || [];
  const blocks = [...verdict.blocks, ...itemCollisions.map((c) => `${item.queue_id}: ${c.reason}`)];
  return { item, verdict: { ...verdict, ok: blocks.length === 0, blocks }, collisions: itemCollisions };
});

let nextQueue = queue;
if (apply) {
  const updated = [];
  for (const { item, verdict } of perItem) {
    if (item.status !== 'DRAFT' && item.status !== 'SAFETY_CHECK') {
      updated.push(item);
      continue;
    }
    // runSafetyGate covers in-queue safety; cross-lane collisions are applied here
    // because they depend on files this queue does not own.
    updated.push(verdict.ok ? runSafetyGate(item, { ...context, siblings: queue.items }).item : {
      ...item,
      status: 'ERROR',
      safety_status: 'BLOCKED',
      error: verdict.blocks.join('; '),
      history: [...(item.history || []), { from: item.status, to: 'ERROR', at: new Date().toISOString(), reason: 'safety gate or cross-lane collision blocked' }]
    });
  }
  nextQueue = { ...queue, items: updated };
  const errors = validateQueue(nextQueue);
  if (errors.length) {
    console.error('REFUSING_TO_WRITE: gate produced an invalid queue');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  await saveQueue(nextQueue);
}

const report = {
  checked_at: new Date().toISOString(),
  applied: apply,
  items: perItem.map(({ item, verdict, collisions: c }) => ({
    queue_id: item.queue_id,
    platform: item.platform,
    asset_id: item.asset_id,
    status: apply ? nextQueue.items.find((i) => i.queue_id === item.queue_id).status : item.status,
    approval_status: item.approval_status,
    automation: item.automation,
    safety_ok: verdict.ok,
    blocks: verdict.blocks,
    warnings: verdict.warnings,
    human_required: verdict.human_required,
    cross_lane_collisions: c
  })),
  external_lanes_scanned: [...new Set(inFlight.map((x) => x.lane))],
  human_required: audit.human_required
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Queue check${apply ? ' (applied)' : ' (report only)'} - ${report.items.length} item(s)`);
  console.log(`External lanes scanned: ${report.external_lanes_scanned.join(', ') || 'none'}`);
  for (const entry of report.items) {
    console.log(`\n  ${entry.queue_id}`);
    console.log(`    platform=${entry.platform} asset=${entry.asset_id} status=${entry.status} approval=${entry.approval_status} automation=${entry.automation}`);
    console.log(`    safety=${entry.safety_ok ? 'PASS' : 'BLOCKED'}`);
    for (const block of entry.blocks) console.log(`    BLOCK   ${block}`);
    for (const warning of entry.warnings) console.log(`    WARN    ${warning}`);
    for (const hr of entry.human_required) console.log(`    HUMAN_REQUIRED  ${hr.platform}: ${hr.reason}`);
  }
}

// A blocked item is a correct outcome, not a build failure: exit 0 unless the queue
// itself is structurally invalid (handled above). In --json mode stdout stays pure JSON.
const mark = asJson ? console.error : console.log;
mark(`\nQUEUE_CHECK_COMPLETE blocked=${report.items.filter((i) => !i.safety_ok).length}/${report.items.length}`);
