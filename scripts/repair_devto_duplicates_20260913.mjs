import fs from 'node:fs';

const apiKey = (process.env.DEVTO_API_KEY || '').trim();
if (!apiKey) throw new Error('DEVTO_API_KEY missing');

const targets = [
  'content/ghost/ai-agent-operating-constitution-ja.md',
  'content/ghost/ai-handoff-system-ja.md'
];

const headers = {
  'api-key': apiKey,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.forem.api-v1+json',
  'user-agent': 'Stratum-Praxis-Repair/1.0'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function req(url, options = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(url, options);
    if (r.status !== 429) return r;
    if (attempt === 4) return r;
    const ra = Number(r.headers.get('retry-after'));
    await sleep(Number.isFinite(ra) && ra > 0 ? (ra + 2) * 1000 : 35000);
  }
}

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').trim();
  const lines = raw.split('\n');
  const idx = lines.findIndex(l => /^#\s+/.test(l));
  if (idx < 0) throw new Error(`No H1 in ${file}`);
  return {
    file,
    title: lines[idx].replace(/^#\s+/, '').trim(),
    body: lines.slice(idx + 1).join('\n').trim()
  };
}

const listResp = await req('https://dev.to/api/articles/me/all?per_page=1000', { headers });
const listText = await listResp.text();
if (!listResp.ok) throw new Error(`DEV list failed ${listResp.status}: ${listText}`);
const all = JSON.parse(listText);

const report = [];
for (const target of targets.map(parse)) {
  const matches = all.filter(a => a.title === target.title).sort((a, b) => Number(a.id) - Number(b.id));
  if (matches.length < 1) throw new Error(`No DEV article found for ${target.title}`);

  const keeper = matches[0];
  const updatePayload = {
    article: {
      title: target.title,
      body_markdown: target.body,
      published: true,
      tags: ['ai','automation','productivity','business']
    }
  };
  const update = await req(`https://dev.to/api/articles/${keeper.id}`, {
    method: 'PUT', headers, body: JSON.stringify(updatePayload)
  });
  const updateText = await update.text();
  if (!update.ok) throw new Error(`Keeper update failed ${keeper.id}: ${update.status} ${updateText}`);
  const updated = JSON.parse(updateText);

  const retired = [];
  for (const dup of matches.slice(1)) {
    const r = await req(`https://dev.to/api/articles/${dup.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ article: { published: false } })
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`Duplicate retire failed ${dup.id}: ${r.status} ${text}`);
    retired.push({ id: dup.id, old_url: dup.url });
  }

  report.push({ title: target.title, keeper_id: keeper.id, keeper_url: updated.url, retired });
  await sleep(32000);
}

console.log('DEV_DUPLICATE_REPAIR=' + JSON.stringify(report));
