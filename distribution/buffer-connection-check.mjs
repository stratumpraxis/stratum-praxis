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

const account = await gql(`query { account { organizations { id } } }`);
const orgs = account.account?.organizations || [];
if (!orgs.length) {
  console.error('Authenticated, but no Buffer organization was returned');
  process.exit(4);
}

let channelCount = 0;
const services = new Set();
for (const org of orgs) {
  const data = await gql(`query { channels(input:{organizationId:${JSON.stringify(org.id)},filter:{isLocked:false}}){service isQueuePaused} }`);
  for (const channel of data.channels || []) {
    channelCount += 1;
    if (channel.service) services.add(String(channel.service).toLowerCase());
  }
}

console.log('BUFFER_CONNECTION_OK');
console.log('organizations:', orgs.length);
console.log('channels:', channelCount);
console.log('services:', [...services].sort().join(', ') || 'none');
