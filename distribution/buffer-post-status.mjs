import fs from 'node:fs/promises';

const API = 'https://api.buffer.com';
const key = process.env.BUFFER_API_KEY;
const postIds = (process.env.BUFFER_POST_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

if (!key) {
  console.log('BUFFER_API_KEY is not configured. Safe no-op.');
  process.exit(0);
}
if (!postIds.length) {
  console.error('BUFFER_POST_IDS is required (comma-separated Buffer post ids).');
  process.exit(1);
}

function q(s) { return JSON.stringify(String(s)); }
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

const results = [];
for (const id of postIds) {
  try {
    const data = await gql(`query { post(input:{id:${q(id)}}) { id status dueAt sentAt sharedNow externalLink } }`);
    const post = data.post;
    if (!post) {
      console.log(`${id}: NOT_FOUND`);
      results.push({ id, found: false });
      continue;
    }
    console.log(JSON.stringify(post, null, 2));
    results.push({ id, found: true, ...post });
  } catch (error) {
    console.error(`${id}: status check failed safely: ${String(error)}`);
    results.push({ id, found: false, error: String(error) });
  }
}

await fs.mkdir('revenue-os', { recursive: true }).catch(() => {});
console.log('BUFFER_POST_STATUS_RESULTS=' + JSON.stringify(results));
