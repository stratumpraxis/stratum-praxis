import fs from 'node:fs/promises';

const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const manifestFile = process.env.TREND_VIDEO_MANIFEST || 'trend-video-engine/current.json';
const videoUrl = process.env.TREND_VIDEO_URL;
const ledgerFile = process.env.VIDEO_PUBLISH_LEDGER || 'trend-video-engine/publish-ledger.json';

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
const channelAllowlist = publish.channelAllowlist || {};
const routeMatch = caption.match(/(?:[?&]|\b)route_id=([^&\s]+)/i);
const routeId = routeMatch?.[1] || null;

let ledger = { version: 1, items: {} };
try { ledger = JSON.parse(await fs.readFile(ledgerFile, 'utf8')); } catch {}
ledger.items ||= {};
ledger.items[manifest.id] ||= {};

function q(s) { return JSON.stringify(String(s)); }
function now() { return new Date().toISOString(); }
async function saveLedger() {
  const parts = ledgerFile.split('/');
  if (parts.length > 1) await fs.mkdir(parts.slice(0, -1).join('/'), {recursive: true});
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

function channelMatchesAllowlist(channel, service) {
  const rules = Array.isArray(channelAllowlist?.[service]) ? channelAllowlist[service] : [];
  if (!rules.length) return true;
  const values = [channel.id, channel.name, channel.displayName].filter(Boolean).map(x => String(x).trim().toLowerCase());
  return rules.some(rule => values.includes(String(rule).trim().toLowerCase()));
}

async function recentPosts(orgId, channelId) {
  const data = await gql(`query { posts(first:50,input:{organizationId:${q(orgId)},filter:{channelIds:[${q(channelId)}]},sort:[{field:createdAt,direction:desc}]}) { edges { node { id text dueAt status sentAt externalLink error { message rawError supportUrl } } } } }`);
  return (data.posts?.edges || []).map(e => e?.node).filter(Boolean);
}

async function findRemoteExistingPost(orgId, channel) {
  const nodes = await recentPosts(orgId, channel.id);
  return nodes.find(p => {
    const text = String(p.text || '');
    if (routeId && text.includes(`route_id=${routeId}`)) return true;
    return text === caption;
  }) || null;
}

async function refreshPriorPost(orgId, channel, prior) {
  if (!prior?.postId) return false;
  const service = String(channel.service).toLowerCase();
  try {
    const nodes = await recentPosts(orgId, channel.id);
    const post = nodes.find(p => p.id === prior.postId);
    if (!post) {
      console.log(`Prior ${service} post ${prior.postId} not found in recent Buffer results; no retry.`);
      return true;
    }
    ledger.items[manifest.id][service] = {
      ...prior,
      status: post.status || prior.status,
      at: now(),
      dueAt: post.dueAt || prior.dueAt || null,
      sentAt: post.sentAt || prior.sentAt || null,
      externalLink: post.externalLink || prior.externalLink || null,
      error: post.error || prior.error || null
    };
    console.log(JSON.stringify({ channel: service, manifest: manifest.id, refreshedPost: post }, null, 2));
    await saveLedger();
    return true;
  } catch (error) {
    console.error(`Read-only Buffer verification failed for ${service}; no retry/create will occur:`, String(error));
    ledger.items[manifest.id][service] = { ...prior, verifyErrorAt: now(), verifyError: String(error) };
    await saveLedger();
    return true;
  }
}

const acct = await gql('query { account { organizations { id name } } }');
const org = acct.account?.organizations?.[0];
if (!org) {
  console.log('No Buffer organization found. Safe no-op.');
  process.exit(0);
}
const channelData = await gql(`query { channels(input:{organizationId:${q(org.id)},filter:{isLocked:false}}){id name displayName service isQueuePaused} }`);
const rawChannels = (channelData.channels || []).filter(c => services.includes(String(c.service).toLowerCase()));
const channels = [];
for (const service of services) {
  const serviceChannels = rawChannels.filter(c => String(c.service).toLowerCase() === service);
  const allowRules = Array.isArray(channelAllowlist?.[service]) ? channelAllowlist[service] : [];
  const matched = serviceChannels.filter(c => channelMatchesAllowlist(c, service));
  if (allowRules.length && matched.length !== 1) {
    ledger.items[manifest.id][service] = {
      status: 'blocked-channel-allowlist',
      at: now(),
      requestedAllowlist: allowRules,
      available: serviceChannels.map(c => ({id:c.id,name:c.name,displayName:c.displayName}))
    };
    console.log(`Block ${service}: expected exactly one allowlisted channel, found ${matched.length}.`);
    await saveLedger();
    continue;
  }
  channels.push(...matched);
}
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

  // Remote idempotency is authoritative. This protects reruns even when the job
  // checks out a commit from before the local ledger was written.
  try {
    const existing = await findRemoteExistingPost(org.id, channel);
    if (existing) {
      ledger.items[manifest.id][service] = {
        ...(ledger.items[manifest.id][service] || {}),
        status: existing.status || 'remote-existing',
        at: now(),
        channelId: channel.id,
        videoUrl,
        postId: existing.id,
        dueAt: existing.dueAt || null,
        sentAt: existing.sentAt || null,
        externalLink: existing.externalLink || null,
        error: existing.error || null,
        dedupeSource: routeId ? 'remote-route-id' : 'remote-exact-caption'
      };
      console.log(JSON.stringify({ channel: service, manifest: manifest.id, remoteExistingPost: existing, action: 'SKIP_CREATE' }, null, 2));
      await saveLedger();
      continue;
    }
  } catch (error) {
    console.error(`Remote dedupe check failed for ${service}; fail closed, no create:`, String(error));
    ledger.items[manifest.id][service] = {
      ...(ledger.items[manifest.id][service] || {}),
      status: 'blocked-dedupe-check-failed', at: now(), message: String(error)
    };
    await saveLedger();
    continue;
  }

  const prior = ledger.items[manifest.id][service];
  const nonRetryStates = ['attempted', 'accepted', 'buffer', 'scheduled', 'sending', 'sent', 'unknown'];
  if (prior && nonRetryStates.includes(prior.status)) {
    if (['scheduled', 'sending', 'accepted', 'buffer', 'sent'].includes(prior.status) && prior.postId) {
      await refreshPriorPost(org.id, channel, prior);
    } else {
      console.log(`Skip ${service}: prior state=${prior.status} for ${manifest.id}; no duplicate create.`);
    }
    continue;
  }

  ledger.items[manifest.id][service] = {
    status: 'attempted', at: now(), channelId: channel.id, videoUrl
  };
  await saveLedger();

  const video = `assets:[{video:{url:${q(videoUrl)},metadata:{thumbnailOffset:1000,title:${q(title)}}}}],`;
  const metadata = metadataFor(service);
  const mutation = `mutation { createPost(input:{text:${q(caption)},channelId:${q(channel.id)},${metadata}schedulingType:automatic,mode:${mode},${video}aiAssisted:true}) { ... on PostActionSuccess { post { id text dueAt status sentAt sharedNow externalLink error { message rawError supportUrl } } } ... on MutationError { message } } }`;

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
        externalLink: result.post.externalLink || null,
        error: result.post.error || null
      };
      console.log(JSON.stringify({ channel: service, manifest: manifest.id, post: result.post }, null, 2));
    } else {
      ledger.items[manifest.id][service] = {
        ...ledger.items[manifest.id][service], status: 'unknown', at: now()
      };
    }
  } catch (error) {
    ledger.items[manifest.id][service] = {
      ...ledger.items[manifest.id][service], status: 'unknown', at: now(), message: String(error)
    };
    console.error(`Buffer call for ${service} ended in unknown state:`, String(error));
  }
  await saveLedger();
  await new Promise(r => setTimeout(r, 1500));
}
