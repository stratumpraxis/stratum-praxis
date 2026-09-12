const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
if (!key) throw new Error('BUFFER_API_KEY is not configured');

const posts = [
  { platform: 'tiktok', account: 'stratumpraxis', id: '6aa59825ef23d0656aec96d6' },
  { platform: 'instagram', account: 'praxisstratum', id: '6aa5983166679b076f14feb5' },
];

async function gql(query) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
}

const q = s => JSON.stringify(String(s));
let evidence = [];
for (const target of posts) {
  const data = await gql(`query { post(input:{id:${q(target.id)}}){ id channelId channelService status sentAt externalLink error { message supportUrl } } }`);
  evidence.push({ ...target, ...(data.post || {}) });
}
console.log('STRATUM_PUBLICATION_EVIDENCE=' + JSON.stringify(evidence));

const tiktok = evidence.find(x => x.platform === 'tiktok');
if (!tiktok || tiktok.status !== 'sent' || !tiktok.externalLink) {
  throw new Error(`TikTok publication not yet verified: ${JSON.stringify(tiktok)}`);
}
