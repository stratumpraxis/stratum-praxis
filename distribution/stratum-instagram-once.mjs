import { readFile, writeFile } from 'node:fs/promises';

const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY || '';
const QUEUE_FILE = new URL('./stratum-instagram-revenue-queue.json', import.meta.url);
const EVIDENCE_FILE = new URL('./stratum-instagram-revenue-evidence.json', import.meta.url);

if (!key) throw new Error('BUFFER_API_KEY is not configured');
function q(value) { return JSON.stringify(String(value)); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function gql(query) {
  const response = await fetch(API, {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body: JSON.stringify({query}),
    signal: AbortSignal.timeout(20000),
  });
  const json = await response.json();
  if (!response.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

const queue = JSON.parse(await readFile(QUEUE_FILE, 'utf8'));
const candidates = queue.filter(item => item.active !== false && item.services?.includes('instagram'));
if (candidates.length === 0) { console.log('No active Stratum Instagram revenue item. Safe no-op.'); process.exit(0); }
if (candidates.length !== 1) throw new Error(`Expected exactly one active Instagram item; found ${candidates.length}`);
const item = candidates[0];
if (!item.imageUrl) throw new Error(`${item.id}: Instagram imageUrl is required`);

const accountData = await gql('query { account { organizations { id name } } }');
const org = accountData.account?.organizations?.[0];
if (!org) throw new Error('No Buffer organization found');
const channelData = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const allChannels = channelData.channels || [];
const channels = allChannels.filter(channel => {
  const service = String(channel.service || '').toLowerCase();
  const identity = `${channel.displayName || ''} ${channel.name || ''}`.toLowerCase();
  return service === 'instagram' && !channel.isQueuePaused && identity.includes('praxisstratum');
});
console.log('STRATUM_INSTAGRAM_CHANNEL_AUDIT=' + JSON.stringify(allChannels.map(channel => ({
  service: channel.service, name: channel.name, displayName: channel.displayName,
  paused: channel.isQueuePaused, eligible: channels.some(match => match.id === channel.id),
}))));
if (channels.length !== 1) throw new Error(`Expected exactly one verified Stratum Instagram channel; found ${channels.length}`);
const channel = channels[0];

const text = `${item.text}\n\n${item.url}`.trim();
const mutation = `mutation { createPost(input:{text:${q(text)},channelId:${q(channel.id)},metadata:{instagram:{type:post,shouldShareToFeed:true,isAiGenerated:true}},schedulingType:automatic,mode:shareNow,assets:[{image:{url:${q(item.imageUrl)}}}],aiAssisted:false}) { ... on PostActionSuccess { post { id text dueAt status } } ... on MutationError { message } } }`;
const created = await gql(mutation);
const result = created.createPost;
if (result?.message) throw new Error(`Buffer rejected Instagram post: ${result.message}`);
const postId = result?.post?.id;
if (!postId) throw new Error('Buffer did not return an Instagram post id');

item.active = false;
item.bufferPostId = postId;
item.bufferSubmittedAt = new Date().toISOString();
await writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2) + '\n');

let verified = null;
let lastStatus = null;
for (let attempt = 1; attempt <= 12; attempt += 1) {
  if (attempt > 1) await sleep(5000);
  const statusData = await gql(`query { post(input:{id:${q(postId)}}){ id channelId channelService status sentAt externalLink error { message rawError supportUrl } } }`);
  lastStatus = statusData.post || null;
  console.log(`VERIFY_ATTEMPT_${attempt}=` + JSON.stringify(lastStatus));
  if (lastStatus?.status === 'sent' && lastStatus?.externalLink) { verified = lastStatus; break; }
  if (lastStatus?.error?.message) break;
}

const evidence = {
  itemId:item.id, platform:'instagram', account:channel.displayName || channel.name,
  bufferPostId:postId, destination:item.url, submittedAt:item.bufferSubmittedAt,
  state:verified ? 'PUBLISHED' : 'BUFFER_SUBMITTED_UNVERIFIED',
  sentAt:verified?.sentAt || lastStatus?.sentAt || null,
  publicUrl:verified?.externalLink || lastStatus?.externalLink || null,
  bufferStatus:verified?.status || lastStatus?.status || result?.post?.status || null,
  error:lastStatus?.error || null,
  verifiedAt:verified ? new Date().toISOString() : null,
};
await writeFile(EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n');
console.log('STRATUM_INSTAGRAM_PUBLICATION_EVIDENCE=' + JSON.stringify(evidence));
if (!verified) throw new Error(`Instagram accepted by Buffer but external publication is not yet verified: ${JSON.stringify(evidence)}`);
