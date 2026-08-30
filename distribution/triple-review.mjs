import { readFile } from 'node:fs/promises';

const queueFile = process.env.BUFFER_QUEUE_FILE || 'agent-control-auditor-queue.json';
const queue = JSON.parse(await readFile(new URL(`./${queueFile}`, import.meta.url), 'utf8'));
if (!Array.isArray(queue)) throw new Error('Queue must be an array');

const failures = [];

function fail(id, review, reason) { failures.push(`${id} [${review}] ${reason}`); }

for (const item of queue.filter(x => x.active !== false)) {
  const id = item.id || 'unknown';
  const text = String(item.text || '').trim();
  const url = String(item.url || '').trim();
  let parsed;
  try { parsed = new URL(url); } catch { fail(id, 'R1', 'invalid URL'); continue; }

  // Review 1 — factual integrity / evidence discipline.
  if (!text) fail(id, 'R1', 'empty text');
  if (/guarantee|guaranteed|always works|zero risk|100%|proven to|will make|will earn/i.test(text)) fail(id, 'R1', 'unsupported certainty or outcome claim');
  if (/\$\d+|\d+%|\d+x/i.test(text) && !/\$29\b/.test(text)) fail(id, 'R1', 'numeric claim requires explicit verified source');
  if (parsed.hostname !== 'stratumpraxis.com') fail(id, 'R1', 'destination must be stratumpraxis.com');

  // Review 2 — safety / policy / reputation.
  if (/jailbreak|bypass|evade|exploit|malware|ransomware|rootkit|bootkit|c2 beacon/i.test(text)) fail(id, 'R2', 'unsafe security language');
  if (/act now|last chance|limited time|secret loophole|get rich|easy money|passive income/i.test(text)) fail(id, 'R2', 'pressure or misleading promotional language');
  if (/financial advice|investment advice|medical advice|legal advice/i.test(text)) fail(id, 'R2', 'high-stakes advice framing');

  // Review 3 — quality / platform fit.
  const full = `${text}\n\n${url}`;
  if (full.length > 300) fail(id, 'R3', `Bluesky-safe length exceeded (${full.length}/300)`);
  if (text.length < 70) fail(id, 'R3', 'too thin to provide useful context');
  if ((text.match(/!/g) || []).length > 1) fail(id, 'R3', 'excessive promotional punctuation');
  if ((text.match(/#/g) || []).length > 0) fail(id, 'R3', 'hashtags disabled for this B2B campaign');
  if (!/[.!?]$/.test(text)) fail(id, 'R3', 'post must end cleanly');
  if (!parsed.searchParams.get('utm_source') || !parsed.searchParams.get('utm_medium') || !parsed.searchParams.get('utm_campaign')) fail(id, 'R3', 'UTM attribution missing');
}

if (failures.length) {
  console.error('Triple review FAILED');
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}

console.log(`Triple review passed for ${queue.filter(x => x.active !== false).length} posts: R1 factual integrity, R2 safety, R3 quality/platform fit.`);
