import fs from 'node:fs/promises';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node claude-bridge/validate-candidate.mjs <candidate.json>');
  process.exit(2);
}

const fail = (msg) => {
  console.error(`CLAUDE_BRIDGE_REJECT: ${msg}`);
  process.exit(1);
};

const raw = await fs.readFile(file, 'utf8');
let candidate;
try { candidate = JSON.parse(raw); } catch { fail('invalid JSON'); }

for (const key of ['id','target','platform','format','text','destination_url','revenue_route','source_basis','safety']) {
  if (candidate[key] === undefined || candidate[key] === null || candidate[key] === '') fail(`missing ${key}`);
}

if (!Array.isArray(candidate.source_basis) || candidate.source_basis.length === 0) fail('source_basis must be a non-empty array');
if (candidate.safety.requires_human_review !== true) fail('requires_human_review must remain true');
if (candidate.safety.original_copy !== true) fail('original_copy must be true');
if (candidate.safety.copyrighted_media === true) fail('copyrighted media not allowed in inbox lane');
if (candidate.safety.real_person_likeness === true) fail('real-person likeness not allowed in inbox lane');
if (candidate.safety.earnings_claim === true) fail('earnings claims not allowed in autonomous draft lane');
if (candidate.safety.contains_private_data === true) fail('private data not allowed');

let u;
try { u = new URL(candidate.destination_url); } catch { fail('destination_url must be a valid URL'); }
if (u.protocol !== 'https:') fail('destination_url must use https');
if (!['stratumpraxis.com','www.stratumpraxis.com'].includes(u.hostname)) fail('destination_url must currently stay on approved Stratum Praxis domain');
for (const key of ['utm_source','utm_medium','utm_campaign','utm_content']) {
  if (!u.searchParams.get(key)) fail(`destination_url missing ${key}`);
}

const platform = String(candidate.platform).toLowerCase();
if (!['instagram','tiktok','youtube'].includes(platform)) fail(`platform ${platform} is not in the currently approved bridge scope`);
if (String(candidate.text).length < 40 || String(candidate.text).length > 2200) fail('text length outside safe bounds');

const forbidden = [/guaranteed income/i,/guaranteed revenue/i,/get rich/i,/risk[- ]free profit/i,/\$\d+[kKmM]?\s*(?:per|\/)?\s*month/i];
for (const re of forbidden) if (re.test(candidate.text)) fail(`copy contains blocked claim pattern: ${re}`);

console.log('CLAUDE_BRIDGE_STRUCTURAL_QA_OK');
console.log(`candidate=${path.basename(file)}`);
console.log(`platform=${platform}`);
console.log(`route=${candidate.revenue_route}`);
console.log('NOTE: structural QA is not publication approval; human/ChatGPT safety review is still required.');
