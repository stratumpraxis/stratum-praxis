#!/usr/bin/env node
import fs from 'node:fs';

const [,, packagePath] = process.argv;
if (!packagePath) throw new Error('usage: publish_bluesky_official.mjs <package.json>');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const fail = (m) => { console.error(`FAIL_CLOSED: ${m}`); process.exit(1); };

if (pkg.brand !== 'Stratum') fail('BRAND_CHECK failed');
if ((pkg.platform || '').toLowerCase() !== 'bluesky') fail('CHANNEL_CHECK failed');
if (!pkg.destination || !pkg.cta || !pkg.text) fail('DESTINATION/CTA/content missing');

const identifier = process.env.BSKY_IDENTIFIER;
const appPassword = process.env.BSKY_APP_PASSWORD;
if (!identifier || !appPassword) fail('Bluesky credentials missing');
if (!pkg.account_handle) fail('ACCOUNT_CHECK: account_handle missing');
if (pkg.account_handle.toLowerCase() !== identifier.toLowerCase()) fail('ACCOUNT_CHECK: package handle does not match authenticated handle');

const login = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
  method: 'POST', headers: {'content-type':'application/json'},
  body: JSON.stringify({identifier, password: appPassword})
});
if (!login.ok) fail(`OAuth/session failed ${login.status}`);
const session = await login.json();

const now = new Date().toISOString();
const postText = `${pkg.text}\n\n${pkg.cta}: ${pkg.destination}`;
const rec = {
  repo: 'app.bsky.feed.post',
  collection: 'app.bsky.feed.post',
  record: {$type:'app.bsky.feed.post', text: postText, createdAt: now},
  rkey: undefined
};
const resp = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
  method: 'POST',
  headers: {'content-type':'application/json', 'authorization': `Bearer ${session.accessJwt}`},
  body: JSON.stringify({repo: session.did, collection:'app.bsky.feed.post', record: rec.record})
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
  published_at:now
};
fs.mkdirSync('publishing/evidence',{recursive:true});
fs.writeFileSync(`publishing/evidence/${pkg.content_id}.json`, JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
