import fs from 'node:fs/promises';

const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const ledgerFile = 'trend-video-engine/publish-ledger.json';
const manifestFile = process.env.TREND_VIDEO_MANIFEST || 'trend-video-engine/current.json';

if (!key) {
  console.log('BUFFER_API_KEY is not configured. Safe no-op.');
  process.exit(0);
}

const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
const ledger = JSON.parse(await fs.readFile(ledgerFile, 'utf8'));
const item = ledger.items?.[manifest.id];
if (!item) {
  console.log('No ledger item for current manifest.');
  process.exit(0);
}

function q(s) { return JSON.stringify(String(s)); }
async function gql(query) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ query })
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
}

let changed = false;
for (const [service, state] of Object.entries(item)) {
  if (service.startsWith('_') || !state?.postId) continue;
  if (state.status === 'sent' && state.externalLink) continue;
  if (['rejected', 'unknown'].includes(state.status)) continue;

  try {
    const data = await gql(`query { post(input:{id:${q(state.postId)}}) { id status sentAt sharedNow externalLink } }`);
    const post = data.post;
    if (!post) continue;
    const next = {
      ...state,
      status: post.status || state.status,
      sentAt: post.sentAt || state.sentAt || null,
      sharedNow: post.sharedNow ?? state.sharedNow ?? false,
      externalLink: post.externalLink || state.externalLink || null
    };
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      item[service] = next;
      changed = true;
      console.log(JSON.stringify({ service, post }, null, 2));
    } else {
      console.log(`${service}: no material status change (${state.status})`);
    }
  } catch (error) {
    console.error(`${service}: status verification failed safely: ${String(error)}`);
  }
}

if (changed) {
  await fs.writeFile(ledgerFile, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  console.log('LEDGER_CHANGED=1');
} else {
  console.log('LEDGER_CHANGED=0');
}
