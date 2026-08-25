const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const dryRun = process.env.DRY_RUN === '1';
const targetServices = (process.env.BUFFER_TARGET_SERVICES || 'bluesky,threads,pinterest').split(',').map(s=>s.trim()).filter(Boolean);

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

function q(s){return JSON.stringify(String(s));}

const acct = await gql(`query { account { organizations { id name } } }`);
const org = acct.account?.organizations?.[0];
if (!org) throw new Error('No Buffer organization found');
const data = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const channels = (data.channels || []).filter(c => targetServices.includes(String(c.service).toLowerCase()) && !c.isQueuePaused);

const queue = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./content-queue.json', import.meta.url), 'utf8'));
const selected = queue.filter(x => x.active !== false);

console.log('Eligible channels:', channels.map(c=>`${c.service}:${c.displayName||c.name}`).join(', ') || 'none');
if (!channels.length) process.exit(0);

for (const item of selected) {
  for (const channel of channels) {
    const service = String(channel.service).toLowerCase();
    if (item.services && !item.services.includes(service)) continue;
    const text = `${item.text}\n\n${item.url}`.trim();
    if (dryRun) {
      console.log(`[DRY RUN] ${service} -> ${text}`);
      continue;
    }
    // Text/link posts are intentionally used by default. Pinterest items require an image URL and are skipped here
    // until an approved creative URL is supplied, avoiding broken or low-quality Pins.
    if (service === 'pinterest' && !item.imageUrl) {
      console.log(`Skip Pinterest item ${item.id}: no approved imageUrl`);
      continue;
    }
    let assets = '';
    if (item.imageUrl) assets = `assets:[{image:{url:${q(item.imageUrl)}}}],`;
    const mutation = `mutation { createPost(input:{text:${q(text)},channelId:${q(channel.id)},schedulingType:automatic,mode:addToQueue,${assets}aiAssisted:true}) { ... on PostActionSuccess { post { id text dueAt status } } ... on MutationError { message } } }`;
    const out = await gql(mutation);
    console.log(JSON.stringify({channel:service,item:item.id,result:out.createPost}, null, 2));
    await new Promise(r=>setTimeout(r,1200));
  }
}
