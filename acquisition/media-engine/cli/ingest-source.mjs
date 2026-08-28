#!/usr/bin/env node
// Issue #52 - validate the source register. Read-only.
//
//   node acquisition/media-engine/cli/ingest-source.mjs
//   node acquisition/media-engine/cli/ingest-source.mjs --json

import { isDerivable, loadSources } from '../lib/source.mjs';

const json = process.argv.includes('--json');
const result = await loadSources();

const report = {
  accepted: result.accepted.map((s) => ({
    source_id: s.source_id,
    source_type: s.source_type,
    status: s.status,
    language: s.language,
    derivable: isDerivable(s).ok,
    derivable_reason: isDerivable(s).reason,
    source_candidate_id: s.source_candidate_id ?? null,
    content_hash: s.content_hash,
    evidence_refs: s.evidence_refs.length,
    restricted_claims: s.restricted_claims.length,
    unproven_personal_claims: (s.personal_experience_claims || []).filter((c) => !c.evidence_ref).length
  })),
  rejected: result.rejected,
  duplicates: result.duplicates
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Media engine source register');
  for (const s of report.accepted) {
    console.log(`  ${s.source_id}`);
    console.log(`      ${s.source_type} / ${s.status} / ${s.language} / derivable=${s.derivable} (${s.derivable_reason})`);
  }
  for (const r of report.rejected) console.log(`  REJECTED ${r.source_id}: ${r.errors.join('; ')}`);
  for (const d of report.duplicates) console.log(`  DUPLICATE ${d.source_id} of ${d.duplicate_of}`);
  console.log(`SOURCE_INGEST_OK accepted=${report.accepted.length} rejected=${report.rejected.length} duplicates=${report.duplicates.length}`);
}
