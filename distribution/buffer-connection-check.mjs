const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;

if (!key) {
  console.error('BUFFER_API_KEY missing');
  process.exit(2);
}

async function gql(query) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({ query })
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.errors) {
    console.error('Buffer API connection failed', { status: r.status, errors: body.errors || body });
    process.exit(3);
  }
  return body.data;
}

const account = await gql(`query { account { organizations { id channelCount } } }`);
const orgs = account.account?.organizations || [];
if (!orgs.length) {
  console.error('Authenticated, but no Buffer organization was returned');
  process.exit(4);
}

let channelCount = 0;
let lockedCount = 0;
let disconnectedCount = 0;
const services = new Set();
for (const org of orgs) {
  const data = await gql(`query { channels(input:{organizationId:${JSON.stringify(org.id)}}){service isLocked isDisconnected isQueuePaused} }`);
  for (const channel of data.channels || []) {
    channelCount += 1;
    if (channel.isLocked) lockedCount += 1;
    if (channel.isDisconnected) disconnectedCount += 1;
    if (channel.service) services.add(String(channel.service).toLowerCase());
  }
}

console.log('BUFFER_CONNECTION_OK');
console.log('organizations:', orgs.length);
console.log('organization_channelCount:', orgs.reduce((n,o)=>n+(o.channelCount||0),0));
console.log('channels_returned:', channelCount);
console.log('locked:', lockedCount);
console.log('disconnected:', disconnectedCount);
console.log('services:', [...services].sort().join(', ') || 'none');
// 2026-08-27: Revenue Distribution Run safe connection recheck; no posting.
