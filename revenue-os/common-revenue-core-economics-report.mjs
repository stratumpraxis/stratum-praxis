import { writeFile } from 'node:fs/promises';
import { projectCanonicalLedgerEconomics } from './common-revenue-core-economics-v0.mjs';

const ledgerFile = process.env.CRC_LEDGER_FILE || 'revenue-os/common-revenue-ledger-v0.jsonl';
const outputFile = process.env.CRC_ECONOMICS_OUT || 'revenue-os/common-revenue-core-economics.runtime.json';

const report = await projectCanonicalLedgerEconomics(ledgerFile);
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: report.status,
  reconciliation_status: report.reconciliation_status,
  transaction_count: report.transaction_count,
  complete_transaction_count: report.complete_transaction_count,
  partial_transaction_count: report.partial_transaction_count,
  unavailable_transaction_count: report.unavailable_transaction_count,
  reconciliation_required_transaction_count: report.reconciliation_required_transaction_count,
  portfolio_currency: report.portfolio_currency,
  portfolio_contribution_profit_amount: report.portfolio_contribution_profit_amount,
  cross_currency_aggregation: report.cross_currency_aggregation,
  output: outputFile
}, null, 2));

if (report.status === 'INVALID') process.exitCode = 2;
if (report.status === 'RECONCILIATION_REQUIRED') process.exitCode = Math.max(process.exitCode || 0, 3);
