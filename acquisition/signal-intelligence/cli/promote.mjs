#!/usr/bin/env node
// Issue #53 - write the candidate store. Read-only unless --write is passed.
//
//   node acquisition/signal-intelligence/cli/promote.mjs
//   node acquisition/signal-intelligence/cli/promote.mjs --write
//
// The only file this can ever write is acquisition/signal-intelligence/candidates.json.
// Promotion is not publication and not approval: it makes a candidate readable by the
// media engine, which then runs its own truth, localization, duplication and provider
// gates before anything reaches a queue.

import { readJson, writeJson } from '../../lib/util.mjs';
import { runDefaultPipeline } from '../lib/pipeline.mjs';
import { upsertCandidate, validateCandidate } from '../lib/source-candidate.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const write = args.includes('--write');
const STORE = 'acquisition/signal-intelligence/candidates.json';

const { result } = await runDefaultPipeline();

let store;
try {
  store = await readJson(STORE);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  store = { version: 1, purpose: 'Issue #53 source candidates. Append-only history per candidate.', candidates: [] };
}

const problems = [];
let next = store;
for (const candidate of result.candidates) {
  const errors = validateCandidate(candidate);
  if (errors.length) {
    problems.push(...errors);
    continue;
  }
  next = upsertCandidate(next, candidate);
}

const summary = {
  evaluated: result.candidates.length,
  promoted: result.promoted_candidate_ids,
  by_status: result.candidates.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {}),
  validation_problems: problems,
  written: false,
  store: STORE
};

if (problems.length) {
  console.error(`refusing to write: ${problems.length} validation problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exitCode = 1;
} else if (write) {
  await writeJson(STORE, { ...next, updated_at: new Date().toISOString() });
  summary.written = true;
}

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Candidates evaluated: ${summary.evaluated}`);
  console.log(`  by status: ${JSON.stringify(summary.by_status)}`);
  console.log(`  promoted:  ${summary.promoted.join(', ') || 'none'}`);
  console.log(`PROMOTE_OK write=${summary.written}`);
}
