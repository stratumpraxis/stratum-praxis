import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ledgerPath = path.join(here, 'ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

const thirdPartyCommerceHosts = [
  'buy.stripe.com',
  'payhip.com',
  'gumroad.com',
  'stratumpraxis.gumroad.com'
];

const errors = [];
const warnings = [];

function isOwnedPath(value) {
  return typeof value === 'string' && value.startsWith('/');
}

function containsThirdPartyCommerce(value) {
  return thirdPartyCommerceHosts.some((host) => String(value || '').includes(host));
}

if (!Array.isArray(ledger.loops) || ledger.loops.length === 0) {
  errors.push('ledger.loops must contain at least one loop');
}

const ids = new Set();
for (const loop of ledger.loops || []) {
  if (!loop.id) errors.push('Every loop needs an id');
  if (ids.has(loop.id)) errors.push(`Duplicate loop id: ${loop.id}`);
  ids.add(loop.id);

  for (const key of ['capture', 'free_value', 'offer_page', 'return_route']) {
    if (!loop[key]) errors.push(`${loop.id || 'unknown'} missing ${key}`);
    else if (!isOwnedPath(loop[key])) errors.push(`${loop.id}: ${key} must be an owned path beginning with /`);
    if (containsThirdPartyCommerce(loop[key])) errors.push(`${loop.id}: ${key} must not point directly to third-party checkout`);
  }

  if (loop.escalation_offer_page) {
    if (!isOwnedPath(loop.escalation_offer_page)) errors.push(`${loop.id}: escalation_offer_page must be an owned path`);
    if (containsThirdPartyCommerce(loop.escalation_offer_page)) errors.push(`${loop.id}: escalation_offer_page must not point directly to third-party checkout`);
  }

  if (!loop.primary_metric) errors.push(`${loop.id}: missing primary_metric`);
  if (!Array.isArray(loop.supporting_metrics)) warnings.push(`${loop.id}: supporting_metrics should be an array`);
  if (!ledger.allowed_evidence_states.includes(loop.current_evidence_state)) {
    errors.push(`${loop.id}: invalid current_evidence_state ${loop.current_evidence_state}`);
  }
  if (!loop.problem) warnings.push(`${loop.id}: problem statement is empty`);
}

for (const [key, value] of Object.entries(ledger.guardrails || {})) {
  if (containsThirdPartyCommerce(JSON.stringify(value))) {
    errors.push(`guardrail ${key} unexpectedly contains a direct commerce host`);
  }
}

const output = {
  ok: errors.length === 0,
  version: ledger.version,
  loops: (ledger.loops || []).length,
  errors,
  warnings
};

console.log(JSON.stringify(output, null, 2));
if (errors.length) process.exit(1);
