const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const dryRun = process.env.DRY_RUN === '1';
const queueFile = process.env.BUFFER_QUEUE_FILE || 'content-queue.json';
const selectMode = process.env.BUFFER_SELECT_MODE || 'daily';
const itemIndexRaw = process.env.BUFFER_ITEM_INDEX;
const targetServices = (process.env.BUFFER_TARGET_SERVICES || 'bluesky,threads,linkedin').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const requireEligibleChannels = process.env.REQUIRE_ELIGIBLE_CHANNELS === '1';
const requireChannelNameContains = (process.env.REQUIRE_CHANNEL_NAME_CONTAINS || '').trim().toLowerCase();
const postMode = process.env.BUFFER_POST_MODE || 'addToQueue';
const allowedPostModes = new Set(['addToQueue', 'shareNow']);

if (!allowedPostModes.has(postMode)) throw new Error(`Unsupported BUFFER_POST_MODE: ${postMode}`);
if (!key) {
  const message = 'BUFFER_API_KEY is not configured';
  if (requireEligibleChannels) throw new Error(message);
  console.log(`${message}. Safe no-op.`);
  process.exit(0);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function gql(query) {
  const isMutation = query.trimStart().startsWith('mutation');
  const maxAttempts = isMutation ? 1 : 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':`Bearer ${key}`},
        body: JSON.stringify({query})
      });
      const text = await r.text();
      let j;
      try {
        j = text ? JSON.parse(text) : {};
      } catch {
        j = {error: text || `Non-JSON response (${r.status})`};
      }

      if (r.ok && !j.errors) return j.data;

      const payload = JSON.stringify(j.errors || j);
      const retryable = !isMutation && (r.status === 429 || r.status >= 500);
      if (!retryable || attempt === maxAttempts) throw new Error(payload);

      console.warn(`BUFFER_READ_RETRY attempt=${attempt}/${maxAttempts} status=${r.status} error=${payload}`);
      await sleep(500 * attempt);
    } catch (error) {
      lastError = error;
      if (isMutation || attempt === maxAttempts) throw error;
      console.warn(`BUFFER_READ_RETRY attempt=${attempt}/${maxAttempts} network_error=${error?.message || error}`);
      await sleep(500 * attempt);
    }
  }

  throw lastError || new Error('Buffer request failed');
}
function q(s){ return JSON.stringify(String(s)); }
function dayNumberUTC(){ return Math.floor(Date.now() / 86400000); }
function selectItem(candidates){
  if (itemIndexRaw !== undefined && itemIndexRaw !== '') {
    const idx = Number(itemIndexRaw);
    if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) throw new Error(`BUFFER_ITEM_INDEX out of range: ${itemIndexRaw} for ${candidates.length} candidates`);
    return candidates[idx];
  }
  return selectMode === 'first' ? candidates[0] : candidates[dayNumberUTC() % candidates.length];
}

const acct = await gql(`query { account { organizations { id name } } }`);
const org = acct.account?.organizations?.[0];
if (!org) throw new Error('No Buffer organization found');
const data = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const allChannels = data.channels || [];
console.log('BUFFER_CHANNEL_AUDIT:', JSON.stringify(allChannels.map(c=>({id:c.id,service:c.service,name:c.name,displayName:c.displayName,isQueuePaused:c.isQueuePaused}))));
let channels = allChannels.filter(c => targetServices.includes(String(c.service).toLowerCase()) && !c.isQueuePaused);
if (requireChannelNameContains) {
  const rejected = channels.filter(c => !`${c.displayName || ''} ${c.name || ''}`.toLowerCase().includes(requireChannelNameContains));
  if (rejected.length) console.log('Rejected non-Stratum channels:', rejected.map(c=>`${c.service}:${c.displayName||c.name}`).join(', '));
  channels = channels.filter(c => `${c.displayName || ''} ${c.name || ''}`.toLowerCase().includes(requireChannelNameContains));
}
const queue = JSON.parse(await (await import('node:fs/promises')).readFile(new URL(`./${queueFile}`, import.meta.url), 'utf8'));
const active = queue.filter(x => x.active !== false && Array.isArray(x.services));
console.log('Queue file:', queueFile, 'select mode:', selectMode, 'item index:', itemIndexRaw ?? 'auto', 'post mode:', postMode);
console.log('Eligible channels:', channels.map(c=>`${c.service}:${c.displayName||c.name}`).join(', ') || 'none');
if (!channels.length) {
  const message = `No eligible verified Stratum channels for requested services: ${targetServices.join(', ') || 'none'}`;
  if (requireEligibleChannels) throw new Error(message);
  console.log(`${message}. Safe no-op.`);
  process.exit(0);
}
if (!active.length) { console.log('No active queue items. Safe no-op.'); process.exit(0); }

for (const channel of channels) {
  const service = String(channel.service).toLowerCase();
  const candidates = active.filter(x => x.services.includes(service));
  if (!candidates.length) continue;
  const item = selectItem(candidates);
  const text = `${item.text}\n\n${item.url}`.trim();
  if (item.videoUrl && item.imageUrl) throw new Error(`Item ${item.id} must not set both videoUrl and imageUrl`);
  if (service === 'pinterest' && !item.imageUrl) throw new Error(`Pinterest item ${item.id} requires an approved imageUrl`);
  let metadata = '';
  if (service === 'instagram') {
    metadata = item.videoUrl
      ? 'metadata:{instagram:{type:reel,shouldShareToFeed:true,isAiGenerated:true}},'
      : 'metadata:{instagram:{type:post,shouldShareToFeed:true,isAiGenerated:true}},';
  } else if (service === 'tiktok') {
    metadata = item.videoUrl
      ? 'metadata:{tiktok:{isAiGenerated:true}},'
      : `metadata:{tiktok:{title:${q(String(item.title || 'AI Agent ROI Planning Check').slice(0,100))}}},`;
  } else if (service === 'pinterest') {
    const detail = await gql(`query { channel(input:{id:${q(channel.id)}}){ metadata { ... on PinterestMetadata { boards { serviceId name } } } }`);
    const boards = detail.channel?.metadata?.boards || [];
    if (boards.length !== 1) throw new Error(`Pinterest channel requires exactly one unambiguous board for autonomous posting; found ${boards.length}`);
    const board = boards[0];
    const title = String(item.title || item.text || 'Stratum Praxis').split(/[.!?\n]/)[0].trim().slice(0,100) || 'Stratum Praxis';
    metadata = `metadata:{pinterest:{boardServiceId:${q(board.serviceId)},title:${q(title)},url:${q(item.url)}}},`;
  }
  if (dryRun) { console.log(`[DRY RUN] ${service} / ${item.id} / ${postMode} -> ${text}`); continue; }
  let assets = '';
  if (item.videoUrl) {
    const offset = Number.isInteger(item.thumbnailOffsetMs) ? item.thumbnailOffsetMs : 2000;
    assets = `assets:[{video:{url:${q(item.videoUrl)},metadata:{thumbnailOffset:${offset}}}}],`;
  } else if (item.imageUrl) {
    assets = `assets:[{image:{url:${q(item.imageUrl)}}}],`;
  }
  const mutation = `mutation { createPost(input:{text:${q(text)},channelId:${q(channel.id)},${metadata}schedulingType:automatic,mode:${postMode},${assets}aiAssisted:false}) { ... on PostActionSuccess { post { id text dueAt status assets { source mimeType } } } ... on MutationError { message } } }`;
  const out = await gql(mutation);
  const result = out.createPost;
  console.log(JSON.stringify({channel:service,account:channel.displayName||channel.name,item:item.id,postMode,result},null,2));
  if (result?.message) throw new Error(`Buffer rejected ${service} post: ${result.message}`);
  if (!result?.post?.id) throw new Error(`Buffer did not return a post id for ${service}`);
  await sleep(1500);
}
