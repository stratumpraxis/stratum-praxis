#!/usr/bin/env node
// Derive attribution for every trend-video post from the manifest that produced it.
//
// trend-video-engine/publish-ledger.json is READ-ONLY here. Everything derived is written
// into acquisition/distribution-ledger.json under `attribution_overlay`, keyed by ledger_id.
// A byte-identity guard aborts the run if the video ledger changes underneath it.
//
// Usage:
//   node acquisition/cli/attribution-backfill.mjs           # report only (safe default)
//   node acquisition/cli/attribution-backfill.mjs --write    # persist the overlay
//   node acquisition/cli/attribution-backfill.mjs --json

import fs from 'node:fs/promises';

import { classifyAttribution, establishCaptionProof, ledgerFingerprint, summarizeAttribution } from '../lib/attribution.mjs';
import { collectManifests } from '../lib/manifest-sources.mjs';
import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { loadLedger, saveLedger } from '../lib/ledger.mjs';
import { nowIso, readJson, repoPath } from '../lib/util.mjs';

const argv = new Set(process.argv.slice(2));
const write = argv.has('--write');
const asJson = argv.has('--json');

const VIDEO_LEDGER = 'trend-video-engine/publish-ledger.json';

const before = await fs.readFile(repoPath(VIDEO_LEDGER), 'utf8');
const fingerprintBefore = await ledgerFingerprint(VIDEO_LEDGER);
const videoLedger = JSON.parse(before);

const sourceRouting = await loadSourceRouting();
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const { manifests, sources } = await collectManifests();

// Re-establish the caption proof from the publisher's own source before classifying
// anything. If the publisher changed, every record degrades to UNVERIFIED.
const captionProof = await establishCaptionProof(VIDEO_LEDGER);

const records = [];
for (const [manifestId, services] of Object.entries(videoLedger.items || {})) {
  for (const [platform, entry] of Object.entries(services || {})) {
    if (platform.startsWith('_') || !entry) continue;
    const manifest = manifests.get(manifestId) || null;
    const manifestRef = manifest ? sources.get(manifestId) : null;
    const record = classifyAttribution(manifest, entry, {
      platform, manifestId, inventory, sourceRouting, captionProof, manifestRef
    });
    records.push({ ...record, manifest_source: manifestRef });
  }
}

const summary = summarizeAttribution(records);

// Byte-identity guard: prove we did not touch the production ledger.
const after = await fs.readFile(repoPath(VIDEO_LEDGER), 'utf8');
const fingerprintAfter = await ledgerFingerprint(VIDEO_LEDGER);
if (before !== after || fingerprintBefore.sha256 !== fingerprintAfter.sha256) {
  console.error(`FATAL: ${VIDEO_LEDGER} changed during a read-only backfill`);
  console.error(`  sha256 before ${fingerprintBefore.sha256}`);
  console.error(`  sha256 after  ${fingerprintAfter.sha256}`);
  process.exit(1);
}

if (write) {
  const ledger = await loadLedger();
  await saveLedger({
    ...ledger,
    attribution_overlay: Object.fromEntries(records.map((r) => [r.ledger_id, r])),
    attribution_payload_proof: captionProof,
    attribution_source_ledger_fingerprint: fingerprintAfter,
    attribution_overlay_note:
      'Derived, additive attribution for the trend-video lane. Source of truth for publication remains '
      + `${VIDEO_LEDGER}, which this process never writes. Regenerate with acquisition/cli/attribution-backfill.mjs --write.`,
    attribution_generated_at: nowIso()
  });
}

const report = { generated_at: nowIso(), video_ledger_untouched: true, ledger_fingerprint: fingerprintAfter, caption_proof: captionProof, summary, records };

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Video-lane attribution backfill${write ? ' (written)' : ' (report only)'}`);
  console.log(`  manifests resolved: ${manifests.size}`);
  console.log(`  payload proof     : ${captionProof.proven ? 'PROVEN' : 'NOT PROVEN'} via ${captionProof.publisher || 'no registered publisher'}`);
  for (const reason of captionProof.reasons) console.log(`    ${reason}`);
  console.log('');
  const width = Math.max(9, ...records.map((r) => r.ledger_id.length)) + 2;
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`  ${pad('LEDGER_ID', width)}${pad('PUBLICATION', 12)}${pad('ATTRIBUTION', 16)}DESTINATION`);
  for (const r of records) {
    console.log(`  ${pad(r.ledger_id, width)}${pad(r.publication_state, 12)}${pad(r.attribution_state, 16)}${r.destination_asset_id || '-'}`);
  }
  console.log('\n  Published posts by attribution state:');
  for (const [state, count] of Object.entries(summary.published_by_attribution_state)) {
    console.log(`    ${pad(state, 18)}${count}`);
  }
  console.log(`\n  published_with_attribution : ${summary.published_with_attribution}`);
  console.log(`  published_without_attribution: ${summary.published_without_attribution}`);
  console.log(`  routes that can contribute evidence: ${summary.evidence_capable_routes.join(', ') || 'none'}`);
  console.log('\n  Evidence table:');
  const w = (v, n) => String(v ?? '-').padEnd(n);
  console.log(`    ${w('POST_ID', 26)}${w('PLATFORM', 11)}${w('PUBLICATION', 12)}${w('ATTRIBUTION', 16)}${w('DESTINATION_ASSET', 38)}${w('EVIDENCE_TYPE', 24)}DOWNSTREAM`);
  for (const r of records) {
    console.log(`    ${w(r.post_id, 26)}${w(r.platform, 11)}${w(r.publication_state, 12)}${w(r.attribution_state, 16)}${w(r.destination_asset_id, 38)}${w(r.attribution_evidence_type, 24)}${r.downstream_measurement_state}`);
  }

  const conflicted = records.filter((r) => r.routing_conflicts?.length);
  if (conflicted.length) {
    console.log('\n  Routing conflicts (sent value kept as historical truth, never rewritten):');
    for (const r of conflicted) for (const c of r.routing_conflicts) console.log(`    ${r.ledger_id}: ${c}`);
  }

  const withProblems = records.filter((r) => r.problems.length);
  if (withProblems.length) {
    console.log('\n  Problems recorded (never silently resolved):');
    for (const r of withProblems) for (const p of r.problems) console.log(`    ${r.ledger_id}: ${p}`);
  }
  console.log(`\n  ${VIDEO_LEDGER} untouched: yes`);
  console.log(`    sha256 ${fingerprintAfter.sha256} (${fingerprintAfter.bytes} bytes), identical before and after`);
}

// In --json mode stdout stays pure JSON; the status marker goes to stderr.
(asJson ? console.error : console.log)(`\nATTRIBUTION_BACKFILL_OK write=${write}`);
