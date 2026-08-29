#!/usr/bin/env node
// Validation command: check a draft against a published catalogue.
//
//   node src/cli.mjs --draft <draft.json> --catalog <catalog.json> [--source <source.json>]
//
// Exits 0 when clean, 1 when blocked, 2 on bad usage. Warnings never fail the run.

import fs from 'node:fs/promises';
import { checkDuplication } from './duplicate-guard.mjs';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

const draftFile = arg('draft');
const catalogFile = arg('catalog');
const sourceFile = arg('source');

if (!draftFile) {
  console.error('usage: node src/cli.mjs --draft <draft.json> [--catalog <catalog.json>] [--source <source.json>]');
  process.exit(2);
}

const draft = await readJson(draftFile);
const published = catalogFile ? await readJson(catalogFile) : [];
const source = sourceFile ? await readJson(sourceFile) : null;

const result = checkDuplication(draft, { published, source });

for (const warning of result.warnings) {
  console.error(`WARN  [${warning.rule}] ${warning.detail}`);
}

if (result.ok) {
  console.log(`PASS - checked against ${published.length} published item(s), 0 blocks, ${result.warnings.length} warning(s).`);
  process.exit(0);
}

console.error(`\nBLOCKED - ${result.blocks.length} rule(s) triggered.\n`);
for (const block of result.blocks) {
  console.error(`[${block.rule}]${block.against ? ` vs ${block.against}` : ''}`);
  console.error(`  ${block.detail}\n`);
}
process.exit(1);
