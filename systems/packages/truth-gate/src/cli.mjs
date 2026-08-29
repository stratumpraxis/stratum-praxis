#!/usr/bin/env node
// Validation command: run the gate over a draft and exit non-zero on any violation.
//
//   node src/cli.mjs --identity <contract.json> --draft <draft.json> [--lens <lens.json>]
//
// Designed to be dropped into CI: a failing draft fails the job.

import fs from 'node:fs/promises';
import { loadIdentity } from './identity.mjs';
import { checkDraft } from './truth-gate.mjs';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

const identityFile = arg('identity');
const draftFile = arg('draft');
const lensFile = arg('lens');

if (!identityFile || !draftFile) {
  console.error('usage: node src/cli.mjs --identity <contract.json> --draft <draft.json> [--lens <lens.json>]');
  process.exit(2);
}

let identity;
try {
  identity = await loadIdentity(identityFile);
} catch (error) {
  console.error(`identity contract rejected: ${error.message}`);
  for (const problem of error.errors || []) console.error(`  - ${problem}`);
  process.exit(2);
}

const draft = await readJson(draftFile);
const lens = lensFile ? await readJson(lensFile) : null;
const result = checkDraft(draft, { identity, lens });

if (result.ok) {
  console.log(`PASS - ${result.checked_sentences} sentence(s) checked, 0 violations.`);
  process.exit(0);
}

console.error(`FAIL - ${result.violations.length} violation(s) across ${result.checked_sentences} sentence(s).\n`);
for (const violation of result.violations) {
  console.error(`[${violation.gate}] ${violation.claim_id} (${violation.field})`);
  console.error(`  sentence : ${violation.sentence}`);
  console.error(`  rewrite  : ${violation.safe_rewrite}\n`);
}
process.exit(1);
