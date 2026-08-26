import fs from 'node:fs/promises';

const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const manifestFile = process.env.TREND_VIDEO_MANIFEST || 'trend-video-engine/current.json';
const videoUrl = process.env.TREND_VIDEO_URL;
const ledgerFile = 'trend-video-engine/publish-ledger.json';

if (!key) {
  console.log('BUFFER_API_KEY is not configured. Safe no-op.');
  process.exit(0);
}
if (!videoUrl || !videoUrl.startsWith('https://')) {
  console.log('TREND_VIDEO_URL is missing/non-public. Safe no-op.');
  process.exit(0);
}

const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
const publish = manifest.publish || {};
const services = (publish.services || ['instagram', 'tiktok', 'youtube'])
  .map(s => String(s).trim().toLowerCase())
  .filter(Boolean);
const mode = publish.mode === 'addToQueue' ? 'addToQueue' : 'shareNow';
const title = String(publish.title || manifest.title || 'Trend signal').slice(0, 95);
const caption = String(publish.caption || manifest.summary || title).trim();

let ledger = { version: 1, items: {} };
try { ledger = JSON.parse(await fs.readFile(ledgerFile, 'utf8')); } catch {}
ledger.items ||= {};
ledger.items[manifest.id] ||= {};

function q(s) { return JSON.stringify(String(s)); }
function now() { return new Date().toISOString(); }
async function saveLedger() {
  await fs.writeFile(ledgerFile, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}

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

function metadataFor(service) {
  if (service === 'instagram') {
    return 'metadata:{instagram:{type:reel,shouldShareToFeed:true,isAiGenerated:true}},';
  }
  if (service === 'tiktok') {
    return 'metadata:{tiktok:{isAiGenerated:true}},';
  }
  if (service === 'youtube') {
    const privacy = publish.youtubePrivacy === 'unlisted' ? 'unlisted' : 'public';
    return `metadata:{youtube:{title:${q(title)},categoryId:"28",privacy:${privacy},madeForKids:false,license:youtube,isAiGenerated:true,notifySubscribers:false,embeddable:true}},`;
  }
  return '';
}

const acct = await gql('query { account { organizations { id name } } }');
const org = acct.account?.organizations?.[0];
if (!org) {
  console.log('No Buffer organization found. Safe no-op.');
  process.exit(0);
}
const channelData = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const channels = (channelData.channels || []).filter(c => services.includes(String(c.service).toLowerCase()));
console.log('Eligible video channels:', channels.map(c => `${c.service}:${c.displayName || c.name}`).join(', ') || 'none');

if (!channels.length) {
  ledger.items[manifest.id]._state = {
    status: 'blocked-no-eligible-channel',
    at: now(),
    requestedServices: services,
    videoUrl
  };
  await saveLedger();
  process.exit(0);
}

for (const channel of channels) {
  const service = String(channel.service).toLowerCase();
  const prior = ledger.items[manifest.id][service];
  const nonRetryStates = ['attempted', 'accepted', 'buffer', 'scheduled', 'sending', 'sent', 'unknown'];
  if (prior && nonRetryStates.includes(prior.status)) {
    console.log(`Skip ${service}: prior state=${prior.status} for ${manifest.id}`);
    continue;
  }

  // Fail-safe idempotency marker. One external create attempt per manifest/service.
  ledger.items[manifest.id][service] = {
    status: 'attempted', at: now(), channelId: channel.id, videoUrl
  };
  await saveLedger();

  const video = `assets:[{video:{url:${q(videoUrl)},metadata:{thumbnailOffset:1000,title:${q(title)}}}}],`;
  const metadata = metadataFor(service);
  const mutation = `mutation { createPost(input:{text:${q(caption)},channelId:${q(channel.id)},${metadata}schedulingType:automatic,mode:${mode},${video}aiAssisted:true}) { ... on PostActionSuccess { post { id text dueAt status sentAt sharedNow externalLink } } ... on MutationError { message } } }`;

  try {
    const out = await gql(mutation);
    const result = out.createPost;
    if (result?.message) {
      ledger.items[manifest.id][service] = {
        ...ledger.items[manifest.id][service],
        status: 'rejected', at: now(), message: result.message
      };
      console.log(JSON.stringify({ channel: service, manifest: manifest.id, result }, null, 2));
    } else if (result?.post) {
      ledger.items[manifest.id][service] = {
        ...ledger.items[manifest.id][service],
        status: result.post.status || 'accepted', at: now(),
        postId: result.post.id, dueAt: result.post.dueAt || null,
        sentAt: result.post.sentAt || null, sharedNow: result.post.sharedNow || false,
        externalLink: result.post.externalLink || null
      };
      console.log(JSON.stringify({ channel: service, manifest: manifest.id, post: result.post }, null, 2));
    } else {
      ledger.items[manifest.id][service] = {
        ...ledger.items[manifest.id][service], status: 'unknown', at: now()
      };
    }
  } catch (error) {
    // Unknown external state: never auto-retry this manifest/service.
    ledger.items[manifest.id][service] = {
      ...ledger.items[manifest.id][service], status: 'unknown', at: now(), message: String(error)
    };
    console.error(`Buffer call for ${service} ended in unknown state:`, String(error));
  }
  await saveLedger();
  await new Promise(r => setTimeout(r, 1500));
}
