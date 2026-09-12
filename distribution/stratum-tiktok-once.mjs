import { readFile, writeFile } from 'node:fs/promises';

const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY || '';
const QUEUE_FILE = new URL('./stratum-tiktok-revenue-queue.json', import.meta.url);
const EVIDENCE_FILE = new URL('./stratum-tiktok-revenue-evidence.json', import.meta.url);

if (!key) throw new Error('BUFFER_API_KEY is not configured');

function q(value) { return JSON.stringify(String(value)); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function gql(query) {
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20000),
  });
  const json = await response.json();
  if (!response.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

const queue = JSON.parse(await readFile(QUEUE_FILE, 'utf8'));
if (!Array.isArray(queue)) throw new Error('TikTok revenue queue must be an array');
const candidates = queue.filter(item => item.active !== false && Array.isArray(item.services) && item.services.includes('tiktok'));
if (candidates.length === 0) {
  console.log('No active Stratum TikTok revenue item. Safe no-op.');
  process.exit(0);
}
if (candidates.length !== 1) throw new Error(`Expected exactly one active TikTok item; found ${candidates.length}`);
const item = candidates[0];
if (!item.imageUrl) throw new Error(`${item.id}: TikTok imageUrl is required`);

const accountData = await gql('query { account { organizations { id name } } }');
const org = accountData.account?.organizations?.[0];
if (!org) throw new Error('No Buffer organization found');
const channelData = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const allChannels = channelData.channels || [];
const channels = allChannels.filter(channel => {
  const service = String(channel.service || '').toLowerCase();
  const identity = `${channel.displayName || ''} ${channel.name || ''}`.toLowerCase();
  return service === 'tiktok' && !channel.isQueuePaused && identity.includes('stratum');
});
console.log('STRATUM_TIKTOK_CHANNEL_AUDIT=' + JSON.stringify(allChannels.map(channel => ({
  service: channel.service,
  name: channel.name,
  displayName: channel.displayName,
  paused: channel.isQueuePaused,
  eligible: channels.some(match => match.id === channel.id),
}))));
if (channels.length !== 1) throw new Error(`Expected exactly one verified Stratum TikTok channel; found ${channels.length}`);
const channel = channels[0];

const text = `${item.text}\n\n${item.url}`.trim();
const title = String(item.title || 'Stratum Praxis').slice(0, 100);
const mutation = `mutation { createPost(input:{text:${q(text)},channelId:${q(channel.id)},metadata:{tiktok:{title:${q(title)}}},schedulingType:automatic,mode:shareNow,assets:[{image:{url:${q(item.imageUrl)}}}],aiAssisted:false}) { ... on PostActionSuccess { post { id text dueAt status } } ... on MutationError { message } } }`;
const created = await gql(mutation);
const result = created.createPost;
if (result?.message) throw new Error(`Buffer rejected TikTok post: ${result.message}`);
const postId = result?.post?.id;
if (!postId) throw new Error('Buffer did not return a TikTok post id');

// Once Buffer accepts a post, deactivate the item immediately so a delayed platform
// response can never cause an automatic duplicate on the next workflow run.
item.active = false;
item.bufferPostId = postId;
item.bufferSubmittedAt = new Date().toISOString();
await writeFile(QUEUE_FILE, `${JSON.stringify(queue, null, 2)}\n`);

let verified = null;
let lastStatus = null;
for (let attempt = 1; attempt <= 6; attempt += 1) {
  if (attempt > 1) await sleep(5000);
  const statusData = await gql(`query { post(input:{id:${q(postId)}}){ id channelId channelService status sentAt externalLink error { message rawError supportUrl } } }`);
  lastStatus = statusData.post || null;
  console.log(`VERIFY_ATTEMPT_${attempt}=` + JSON.stringify(lastStatus));
  if (lastStatus?.status === 'sent' && lastStatus?.externalLink) {
    verified = lastStatus;
    break;
  }
  if (lastStatus?.error?.message) break;
}

const evidence = {
  itemId: item.id,
  platform: 'tiktok',
  account: channel.displayName || channel.name,
  bufferPostId: postId,
  destination: item.url,
  submittedAt: item.bufferSubmittedAt,
  state: verified ? 'PUBLISHED' : 'BUFFER_SUBMITTED_UNVERIFIED',
  sentAt: verified?.sentAt || lastStatus?.sentAt || null,
  publicUrl: verified?.externalLink || lastStatus?.externalLink || null,
  bufferStatus: verified?.status || lastStatus?.status || result?.post?.status || null,
  error: lastStatus?.error || null,
};
await writeFile(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
console.log('STRATUM_TIKTOK_PUBLICATION_EVIDENCE=' + JSON.stringify(evidence));

if (!verified) {
  throw new Error(`TikTok accepted by Buffer but external publication is not yet verified: ${JSON.stringify(evidence)}`);
}
