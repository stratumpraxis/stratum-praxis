const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const dryRun = process.env.DRY_RUN === '1';
const queueFile = process.env.BUFFER_QUEUE_FILE || 'content-queue.json';
const selectMode = process.env.BUFFER_SELECT_MODE || 'daily';
const itemIndexRaw = process.env.BUFFER_ITEM_INDEX;
const targetServices = (process.env.BUFFER_TARGET_SERVICES || 'bluesky,threads,linkedin').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const requireEligibleChannels = process.env.REQUIRE_ELIGIBLE_CHANNELS === '1';

if (!key) {
  const message = 'BUFFER_API_KEY is not configured';
  if (requireEligibleChannels) throw new Error(message);
  console.log(`${message}. Safe no-op.`);
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
function selectItem(candidates){
  if (itemIndexRaw !== undefined && itemIndexRaw !== '') {
    const idx = Number(itemIndexRaw);
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) {
      throw new Error(`BUFFER_ITEM_INDEX out of range: ${itemIndexRaw} for ${candidates.length} candidates`);
    }
    return candidates[idx];
  }
  return selectMode === 'first' ? candidates[0] : candidates[dayNumberUTC() % candidates.length];
}

const acct = await gql(`query { account { organizations { id name } } }`);
const org = acct.account?.organizations?.[0];
if (!org) throw new Error('No Buffer organization found');

const data = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const channels = (data.channels || []).filter(c => targetServices.includes(String(c.service).toLowerCase()) && !c.isQueuePaused);
const queue = JSON.parse(await (await import('node:fs/promises')).readFile(new URL(`./${queueFile}`, import.meta.url), 'utf8'));
const active = queue.filter(x => x.active !== false && Array.isArray(x.services));

console.log('Queue file:', queueFile, 'select mode:', selectMode, 'item index:', itemIndexRaw ?? 'auto');
console.log('Eligible channels:', channels.map(c=>`${c.service}:${c.displayName||c.name}`).join(', ') || 'none');
if (!channels.length) {
  const message = `No eligible Buffer channels for requested services: ${targetServices.join(', ') || 'none'}`;
  if (requireEligibleChannels) throw new Error(message);
  console.log(`${message}. Safe no-op.`);
  process.exit(0);
}
if (!active.length) {
  console.log('No active queue items. Safe no-op.');
  process.exit(0);
}

for (const channel of channels) {
  const service = String(channel.service).toLowerCase();
  const candidates = active.filter(x => x.services.includes(service));
  if (!candidates.length) continue;

  const item = selectItem(candidates);
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
  const metadata = service === 'instagram'
    ? 'metadata:{instagram:{type:post,shouldShareToFeed:true,isAiGenerated:true}},'
    : '';
  const mutation = `mutation { createPost(input:{text:${q(text)},channelId:${q(channel.id)},${metadata}schedulingType:automatic,mode:addToQueue,${assets}aiAssisted:false}) { ... on PostActionSuccess { post { id text dueAt status } } ... on MutationError { message } } }`;
  const out = await gql(mutation);
  const result = out.createPost;
  console.log(JSON.stringify({channel:service,item:item.id,result}, null, 2));
  if (result?.message) throw new Error(`Buffer rejected ${service} post: ${result.message}`);
  await new Promise(r=>setTimeout(r,1500));
}
