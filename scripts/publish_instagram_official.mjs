import fs from 'node:fs';

const fail = (m) => { throw new Error(`FAIL_CLOSED: ${m}`); };
const pkgPath = process.argv[2];
if (!pkgPath) fail('publish package path required');
const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (p.brand !== 'Stratum') fail('brand must be Stratum');
if (p.platform !== 'instagram') fail('platform must be instagram');
if (p.account_handle !== 'praxisstratum') fail('account must be praxisstratum');
if (!p.image_url || !p.caption || !p.destination) fail('image_url, caption, destination required');

const token = (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim();
const igUserId = (process.env.INSTAGRAM_USER_ID || '').trim();
if (!token || !igUserId) fail('INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID required');

const api = 'https://graph.instagram.com';
const auth = { Authorization: `Bearer ${token}` };

const me = await fetch(`${api}/v24.0/me?fields=id,username`, { headers: auth });
const meBody = await me.text();
if (!me.ok) fail(`account verification failed ${me.status}: ${meBody}`);
const profile = JSON.parse(meBody);
if (String(profile.id) !== igUserId) fail('authenticated Instagram user ID mismatch');
if ((profile.username || '').toLowerCase() !== p.account_handle.toLowerCase()) fail(`authenticated username mismatch: ${profile.username || 'unknown'}`);

const create = await fetch(`${api}/v24.0/${igUserId}/media`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ image_url: p.image_url, caption: `${p.caption}\n\n${p.destination}` })
});
const createBody = await create.text();
if (!create.ok) fail(`media container failed ${create.status}: ${createBody}`);
const creationId = JSON.parse(createBody).id;
if (!creationId) fail('media container returned no id');

let ready = false;
for (let i=0; i<12; i++) {
  const s = await fetch(`${api}/v24.0/${creationId}?fields=status_code,status`, { headers: auth });
  const sb = await s.text();
  if (!s.ok) fail(`container status failed ${s.status}: ${sb}`);
  const status = JSON.parse(sb);
  if (status.status_code === 'FINISHED') { ready = true; break; }
  if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') fail(`container ${status.status_code}: ${status.status || ''}`);
  await new Promise(r => setTimeout(r, 5000));
}
if (!ready) fail('media container not ready before timeout');

const publish = await fetch(`${api}/v24.0/${igUserId}/media_publish`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ creation_id: creationId })
});
const publishBody = await publish.text();
if (!publish.ok) fail(`media_publish failed ${publish.status}: ${publishBody}`);
const mediaId = JSON.parse(publishBody).id;
if (!mediaId) fail('media_publish returned no id');

const media = await fetch(`${api}/v24.0/${mediaId}?fields=id,permalink,username,timestamp`, { headers: auth });
const mediaBody = await media.text();
if (!media.ok) fail(`published media verification failed ${media.status}: ${mediaBody}`);
const m = JSON.parse(mediaBody);
if ((m.username || '').toLowerCase() !== p.account_handle.toLowerCase()) fail('published account mismatch');
if (!m.permalink) fail('published media returned no permalink');

const evidence = {
  brand:'Stratum', platform:'instagram', account_handle:p.account_handle,
  platform_accepted:true, account_verified:true, post_id:mediaId,
  public_url:m.permalink, destination:p.destination, content_id:p.content_id,
  published_at:m.timestamp || new Date().toISOString()
};
fs.mkdirSync('publishing/evidence', { recursive:true });
fs.writeFileSync(`publishing/evidence/${p.content_id}.json`, JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
