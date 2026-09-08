// Historical evidence is append-only.
//
// This file exists because of a specific mistake, not a hypothetical one. While
// clearing local run traces between verification passes, a `rm -f
// market/evidence/run_*.json` matched three traces that were committed evidence of
// earlier production runs, not scratch output. They were restored from git within
// the same session, but nothing in the repository would have caught it - and the
// class of failure it belongs to is the worst one available here: quietly deleting
// the record of what actually happened, leaving only the record of what is claimed
// to have happened.
//
// So the traces are pinned by name and by content hash. A deletion fails. An edit
// fails. Adding a new trace does not, because that is what append-only means.
//
// If a trace ever legitimately has to change - it never should - this list is
// updated in the same commit as the change, so the alteration is reviewable rather
// than silent.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT } from '../../acquisition/lib/util.mjs';

const EVIDENCE_DIR = path.join(REPO_ROOT, 'market', 'evidence');

// sha256 of each protected file as committed. Content, not just presence: a file
// that still exists but has been rewritten to say something more flattering is the
// failure this is actually guarding against.
const PROTECTED = Object.freeze({
  'run_409801da-a5ff-4ddc-8be6-646ec22e8a9c.json': '128e11b5d61c7cf3e17c730c948d308cb06dfc9d1d8bb01f40f30444cbd90b38',
  'run_90c37efd-1c12-4223-9381-25209f9eceb1.json': '44d3efad8078d28d7b64ba23464e47d6389942683831d29d04eeeea29d02f6e8',
  'run_bf185b72-0be7-4fe3-b804-c86a69595250.json': 'feed3e837cc76c5eeac93a165cc8a1e4aef2e419624c59856a8e0082edf2675e',
  'publisher-route-to-stripe-boundary.json': '3aa4c12318a9cf548b668c62d2afdae5706aeec4454d79504ec0bb52911fb4d8',
  'paid-page-measurability.json': '2b04c3416e5a710103ce297842df8f2fa3e3eb5b6ac44cbedc167939f8b22926',
  // The two records of the external-loop work, pinned now that both are complete.
  // The live-run file was deliberately left unpinned while it still carried a
  // pending result; a hash on a document still being written would have to be
  // updated every time it changed, which trains people to update the list instead
  // of questioning the change.
  'external-loop-runtime-wiring.json': '60bb52a9123e632db4668dcc22289ba91c5d5aae4ea67bf619d45950d0cf1808',
  'live-actions-run-credential-state.json': 'c5213f5847cda8f80278aa680e4e1a2c00ae337eeae71282135587290ddca0ce'
});

async function digest(file) {
  const raw = await fs.readFile(path.join(EVIDENCE_DIR, file));
  return crypto.createHash('sha256').update(raw).digest('hex');
}

test('every historical evidence file still exists', async () => {
  const present = await fs.readdir(EVIDENCE_DIR);
  const missing = Object.keys(PROTECTED).filter((f) => !present.includes(f));
  assert.deepEqual(missing, [],
    'a committed evidence file was deleted; historical evidence is append-only, so restore it from git rather than updating this list');
});

test('no historical evidence file has been rewritten', async () => {
  const altered = [];
  for (const [file, expected] of Object.entries(PROTECTED)) {
    const actual = await digest(file).catch(() => null);
    if (actual && actual !== expected) altered.push(`${file} (expected ${expected.slice(0, 12)}, got ${actual.slice(0, 12)})`);
  }
  assert.deepEqual(altered, [],
    'a past measurement was edited; rewriting old evidence to match current behaviour is the thing this guard exists to stop');
});

test('a run trace never claims revenue it cannot reference', async () => {
  // Applies to every trace in the directory, including ones added after this test
  // was written. A trace is the record a future reader trusts; one that reports
  // money without the provider reference proving it is worse than no trace at all.
  const files = (await fs.readdir(EVIDENCE_DIR)).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'the evidence directory must not be empty');

  const bad = [];
  for (const file of files) {
    const doc = JSON.parse(await fs.readFile(path.join(EVIDENCE_DIR, file), 'utf8'));
    const revenue = Number(doc.verified_revenue ?? 0);
    if (revenue === 0) continue;
    if (!doc.payment_evidence_present) { bad.push(`${file}: revenue ${revenue} with no payment evidence`); continue; }
    const refs = doc.payment_refs ?? [];
    if (refs.length !== revenue) bad.push(`${file}: revenue ${revenue} but ${refs.length} provider reference(s)`);
  }
  assert.deepEqual(bad, [], 'a trace reported revenue that nothing can be looked up against');
});
