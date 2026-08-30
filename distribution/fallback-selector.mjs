import { readFile, writeFile } from 'node:fs/promises';

const SOURCE_FILE = new URL('./agent-control-auditor-queue.json', import.meta.url);
const OUT_FILE = new URL('./agent-control-auditor-generated-queue.json', import.meta.url);
const STATE_FILE = new URL('./agent-control-auditor-fallback-state.json', import.meta.url);

async function readJson(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch { return fallback; }
}

const queue = await readJson(SOURCE_FILE, []);
if (!Array.isArray(queue)) throw new Error('Fallback queue must be an array');

const state = await readJson(STATE_FILE, { used_ids: [], last_used_at: null });
const used = new Set(Array.isArray(state.used_ids) ? state.used_ids : []);
const next = queue.find(item => item?.active !== false && item?.id && !used.has(item.id));

if (!next) {
  await writeFile(OUT_FILE, '[]\n');
  console.log('Fallback queue exhausted. Safe no-op; no post will be published.');
  process.exit(0);
}

await writeFile(OUT_FILE, `${JSON.stringify([next], null, 2)}\n`);
state.used_ids = [...used, next.id];
state.last_used_at = new Date().toISOString();
state.last_used_id = next.id;
await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify({ status: 'FALLBACK_READY', id: next.id }, null, 2));
