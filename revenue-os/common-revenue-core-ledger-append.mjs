import { readFile } from 'node:fs/promises';
import {
  DEFAULT_LEDGER_FILE,
  appendCanonicalEvents,
  auditCanonicalLedger,
  readCanonicalLedger
} from './common-revenue-core-ledger-v0.mjs';

const ingestionFile = process.env.CRC_INGESTION_FILE || 'revenue-os/common-revenue-core-ingestion.runtime.json';
const ledgerFile = process.env.CRC_LEDGER_FILE || DEFAULT_LEDGER_FILE;

let input;
try {
  input = JSON.parse(await readFile(ingestionFile, 'utf8'));
} catch (error) {
  console.error(JSON.stringify({ status: 'BLOCKED', code: 'CONTRACT_INVALID', reason: `cannot_read_ingestion_file:${error.message}` }, null, 2));
  process.exit(2);
}

if (!input || !Array.isArray(input.events)) {
  console.error(JSON.stringify({ status: 'BLOCKED', code: 'CONTRACT_INVALID', reason: 'ingestion file must contain events[]' }, null, 2));
  process.exit(2);
}

const result = await appendCanonicalEvents(input.events, { ledgerFile });
const ledger = await readCanonicalLedger(ledgerFile);
const audit = auditCanonicalLedger(ledger);

console.log(JSON.stringify({
  status: result.status,
  ledger_file: ledgerFile,
  appended_count: result.appended_count,
  duplicate_noop_count: result.duplicate_noop_count,
  conflict_count: result.conflict_count,
  invalid_count: result.invalid_count,
  ledger_count: ledger.length,
  ledger_audit_ok: audit.ok
}, null, 2));

if (!audit.ok) process.exitCode = 4;
else if (result.conflict_count > 0 || result.invalid_count > 0) process.exitCode = 3;
