const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const dryRun = process.env.DRY_RUN === '1';
const targetServices = (process.env.BUFFER_TARGET_SERVICES || 'bluesky,threads,linkedin').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);

if (!key) {
  console.log('BUFFER_API_KEY is not configured. Safe no-op.');
  process.exit(0);
}

async function gql(query) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body: JSON.stringify({query})
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
}

function q(s){ return JSON.stringify(String(s)); }
function dayNumberUTC(){ return Math.floor(Date.now() / 86400000); }

const acct = await gql(`query { account { organizations { id name } } }`);
const org = acct.account?.organizations?.[0];
if (!org) throw new Error('No Buffer organization found');

const data = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const channels = (data.channels || []).filter(c => targetServices.includes(String(c.service).toLowerCase()) && !c.isQueuePaused);
const queue = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./content-queue.json', import.meta.url), 'utf8'));
const active = queue.filter(x => x.active !== false && Array.isArray(x.services));

console.log('Eligible channels:', channels.map(c=>`${c.service}:${c.displayName||c.name}`).join(', ') || 'none');
if (!channels.length || !active.length) process.exit(0);

for (const channel of channels) {
  const service = String(channel.service).toLowerCase();
  const candidates = active.filter(x => x.services.includes(service));
  if (!candidates.length) continue;

  // One post per channel per day. This avoids filling free-plan queues and reduces spam/repetition risk.
  const item = candidates[dayNumberUTC() % candidates.length];
  const text = `${item.text}\n\n${item.url}`.trim();

  if (dryRun) {
    console.log(`[DRY RUN] ${service} / ${item.id} -> ${text}`);
    continue;
  }

  if (service === 'pinterest' && !item.imageUrl) {
    console.log(`Skip Pinterest item ${item.id}: no approved imageUrl`);
    continue;
  }

  let assets = '';
  if (item.imageUrl) assets = `assets:[{image:{url:${q(item.imageUrl)}}}],`;
  const mutation = `mutation { createPost(input:{text:${q(text)},channelId:${q(channel.id)},schedulingType:automatic,mode:addToQueue,${assets}aiAssisted:false}) { ... on PostActionSuccess { post { id text dueAt status } } ... on MutationError { message } } }`;
  const out = await gql(mutation);
  console.log(JSON.stringify({channel:service,item:item.id,result:out.createPost}, null, 2));
  await new Promise(r=>setTimeout(r,1500));
}
