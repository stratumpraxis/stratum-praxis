#!/usr/bin/env node
import fs from 'node:fs';

const [,, packagePath] = process.argv;
if (!packagePath) throw new Error('usage: publish_bluesky_official.mjs <package.json>');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const fail = (m) => { console.error(`FAIL_CLOSED: ${m}`); process.exit(1); };

if (pkg.brand !== 'Stratum') fail('BRAND_CHECK failed');
if ((pkg.platform || '').toLowerCase() !== 'bluesky') fail('CHANNEL_CHECK failed');
if (!pkg.destination || !pkg.cta || !pkg.text) fail('DESTINATION/CTA/content missing');

const identifier = (process.env.BSKY_IDENTIFIER || '').trim();
const appPassword = (process.env.BSKY_APP_PASSWORD || '').trim();
if (!identifier || !appPassword) fail('Bluesky credentials missing');
if (!pkg.account_handle) fail('ACCOUNT_CHECK: account_handle missing');
if (pkg.account_handle.toLowerCase() !== identifier.toLowerCase()) fail('ACCOUNT_CHECK: package handle does not match authenticated handle');

if (pkg.repair_link_facets !== true && fs.existsSync(`publishing/evidence/${pkg.content_id}.json`)) fail('existing evidence: refuse duplicate publication');

const login = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
  method: 'POST', headers: {'content-type':'application/json'},
  body: JSON.stringify({identifier, password: appPassword})
});
if (!login.ok) {
  let detail = '';
  try { detail = await login.text(); } catch {}
  const safeDetail = detail.replace(/\s+/g, ' ').slice(0, 300);
  fail(`OAuth/session failed ${login.status}${safeDetail ? `: ${safeDetail}` : ''}`);
}
const session = await login.json();


if (pkg.repair_link_facets === true) {
  const evidencePath = `publishing/evidence/${pkg.content_id}.json`;
  if (!fs.existsSync(evidencePath)) fail('repair requires existing publication evidence');
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  if (evidence.account_handle !== identifier || evidence.destination !== pkg.destination ||
      !evidence.post_id?.startsWith(`at://${session.did}/app.bsky.feed.post/`)) fail('repair ownership mismatch');
  const rkey = evidence.post_id.split('/').pop();
  const query = new URLSearchParams({repo:session.did, collection:'app.bsky.feed.post', rkey});
  const existingResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.getRecord?' + query);
  if (!existingResponse.ok) fail('repair readback failed');
  const existing = await existingResponse.json();
  const expectedText = `${pkg.text}\n\n${pkg.cta}: ${pkg.destination}`;
  if (existing.value.text !== expectedText) fail('repair text mismatch');
  const start = Buffer.byteLength(expectedText.slice(0, expectedText.lastIndexOf(pkg.destination)));
  const facets = [{index:{byteStart:start,byteEnd:start+Buffer.byteLength(pkg.destination)},features:[{$type:'app.bsky.richtext.facet#link',uri:pkg.destination}]}];
  if (JSON.stringify(existing.value.facets) !== JSON.stringify(facets)) {
    const update = await fetch('https://bsky.social/xrpc/com.atproto.repo.putRecord', {
      method:'POST', headers:{'content-type':'application/json','authorization':`Bearer ${session.accessJwt}`},
      body:JSON.stringify({repo:session.did,collection:'app.bsky.feed.post',rkey,swapRecord:existing.cid,record:{...existing.value,facets}})
    });
    if (!update.ok) fail('repair update failed ' + update.status);
  }
  const checkedResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.getRecord?' + query);
  if (!checkedResponse.ok) fail('repair verification failed');
  const checked = await checkedResponse.json();
  if (checked.value.text !== expectedText || JSON.stringify(checked.value.facets) !== JSON.stringify(facets)) fail('repair not confirmed');
  fs.writeFileSync(evidencePath, JSON.stringify({...evidence,cid:checked.cid,link_facets_verified:true,link_repaired_at:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify({public_url:evidence.public_url,link_facets_verified:true,duplicate_created:false}));
  process.exit(0);
}

let embed;
let videoBytes = 0;
if (pkg.video_url) {
  const media = await fetch(pkg.video_url);
  if (!media.ok) fail(`video fetch failed ${media.status}`);
  const contentType = (media.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'video/mp4') fail(`video content-type must be video/mp4, got ${contentType || 'unknown'}`);
  const bytes = new Uint8Array(await media.arrayBuffer());
  videoBytes = bytes.byteLength;
  if (!videoBytes || videoBytes > 20 * 1024 * 1024) fail(`video size out of range: ${videoBytes}`);

  const upload = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
    method: 'POST',
    headers: {
      'content-type': 'video/mp4',
      'authorization': `Bearer ${session.accessJwt}`
    },
    body: bytes
  });
  if (!upload.ok) fail(`video upload failed ${upload.status}: ${await upload.text()}`);
  const uploaded = await upload.json();
  if (!uploaded.blob) fail('video upload returned no blob');
  const width = Number(pkg.video_width || 720);
  const height = Number(pkg.video_height || 1280);
  embed = {
    $type: 'app.bsky.embed.video',
    video: uploaded.blob,
    aspectRatio: {width, height},
    ...(pkg.video_alt ? {alt: String(pkg.video_alt).slice(0, 1000)} : {})
  };
}

const now = new Date().toISOString();
const postText = `${pkg.text}\n\n${pkg.cta}: ${pkg.destination}`;
if ([...postText].length > 300) fail(`post text exceeds 300 characters: ${[...postText].length}`);
const record = {
  $type:'app.bsky.feed.post',
  text: postText,
  createdAt: now,
  facets: [{index:{byteStart:Buffer.byteLength(postText.slice(0,postText.lastIndexOf(pkg.destination))),byteEnd:Buffer.byteLength(postText)},features:[{$type:'app.bsky.richtext.facet#link',uri:pkg.destination}]}],
  ...(embed ? {embed} : {})
};
const resp = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
  method: 'POST',
  headers: {'content-type':'application/json', 'authorization': `Bearer ${session.accessJwt}`},
  body: JSON.stringify({repo: session.did, collection:'app.bsky.feed.post', record})
});
if (!resp.ok) fail(`publish failed ${resp.status}: ${await resp.text()}`);
const out = await resp.json();
const rkey = out.uri.split('/').pop();
const publicUrl = `https://bsky.app/profile/${encodeURIComponent(identifier)}/post/${rkey}`;
const evidence = {
  brand:'Stratum', platform:'bluesky', account_handle:identifier,
  platform_accepted:true, account_verified:true,
  post_id:out.uri, cid:out.cid, public_url:publicUrl,
  destination:pkg.destination, content_id:pkg.content_id,
  media_type: embed ? 'video' : 'text',
  video_bytes: embed ? videoBytes : null,
  published_at:now
};
fs.mkdirSync('publishing/evidence',{recursive:true});
fs.writeFileSync(`publishing/evidence/${pkg.content_id}.json`, JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
