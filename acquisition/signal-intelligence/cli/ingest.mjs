#!/usr/bin/env node
// Issue #53 - validate and normalize the evidence set. Read-only.
//
//   node acquisition/signal-intelligence/cli/ingest.mjs
//   node acquisition/signal-intelligence/cli/ingest.mjs --json

import { readJson } from '../../lib/util.mjs';
import { ingest, loadPolicy, loadProviders } from '../lib/normalize.mjs';

const json = process.argv.includes('--json');

const policy = await loadPolicy();
const providers = await loadProviders();
const doc = await readJson('acquisition/signal-intelligence/signals.json');
const result = ingest(doc.signals || [], { policy, providers });

const connected = Object.entries(providers.providers)
  .filter(([, p]) => p.connection_state !== 'CONTRACT_ONLY' && p.connection_state !== 'BLOCKED')
  .map(([name, p]) => ({ provider: name, connection_state: p.connection_state }));
const contractOnly = Object.entries(providers.providers)
  .filter(([, p]) => p.connection_state === 'CONTRACT_ONLY')
  .map(([name]) => name);

const report = {
  accepted: result.accepted.length,
  rejected: result.rejected,
  duplicates: result.duplicates,
  theses: (doc.theses || []).map((t) => t.thesis_id),
  by_family: countBy(result.accepted, (s) => s.source_family),
  by_class: countBy(result.accepted, (s) => s.evidence_class),
  by_bucket: result.accepted.flatMap((s) => s.evidence_buckets).reduce(tally, {}),
  expired: result.accepted.filter((s) => s.freshness.state === 'EXPIRED').map((s) => s.signal_id),
  providers_supplying_evidence: [...new Set(result.accepted.map((s) => s.provider))].sort(),
  providers_not_contract_only: connected,
  providers_contract_only_zero_evidence: contractOnly
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Signal intelligence ingest');
  console.log(`  accepted:   ${report.accepted}`);
  console.log(`  rejected:   ${report.rejected.length}`);
  for (const r of report.rejected) console.log(`    - ${r.signal_id}: ${r.errors.join('; ')}`);
  console.log(`  duplicates: ${report.duplicates.length}`);
  for (const d of report.duplicates) console.log(`    - ${d.signal_id} duplicates ${d.duplicate_of}`);
  console.log(`  expired:    ${report.expired.length ? report.expired.join(', ') : 'none'}`);
  console.log(`  families:   ${JSON.stringify(report.by_family)}`);
  console.log(`  classes:    ${JSON.stringify(report.by_class)}`);
  console.log(`  buckets:    ${JSON.stringify(report.by_bucket)}`);
  console.log(`  contract-only providers supplying zero evidence: ${report.providers_contract_only_zero_evidence.join(', ')}`);
  console.log(result.rejected.length ? 'INGEST_HAS_REJECTIONS' : 'INGEST_OK');
}

if (result.rejected.length) process.exitCode = 1;

function countBy(list, key) {
  return list.map(key).reduce(tally, {});
}
function tally(acc, value) {
  acc[value] = (acc[value] || 0) + 1;
  return acc;
}
