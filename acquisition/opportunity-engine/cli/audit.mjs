#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditOpportunity } from '../lib/audit.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const arg = process.argv[2];

function print(result, source) {
  process.stdout.write(`${JSON.stringify({ source, ...result }, null, 2)}\n`);
}

if (arg) {
  const inputPath = path.resolve(process.cwd(), arg);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  print(auditOpportunity(input), inputPath);
  process.exit(0);
}

const ledgerPath = path.join(root, 'opportunities.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
for (const item of ledger.items || []) {
  print(auditOpportunity(item), item.id || 'UNKNOWN');
}
