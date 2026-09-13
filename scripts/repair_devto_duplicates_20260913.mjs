import fs from 'node:fs';

const apiKey = (process.env.DEVTO_API_KEY || '').trim();
if (!apiKey) throw new Error('DEVTO_API_KEY missing');

const targets = [
  {
    file: 'content/ghost/ai-revenue-pipeline-diagnosis-ja.md',
    originalSlug: 'aidezuo-ruqian-ni-revenuenojie-mariwozhi-su-mai-renaipaipunozhen-duan-fa-3l8j',
    accidentalId: 4643235
  },
  {
    file: 'content/ghost/codex-revenue-company-ja.md',
    originalSlug: 'ai-codinghasu-inonimai-shang-gazeng-enaili-you-codexworevenue-loophejie-sok-suru-pc8',
    accidentalId: 4643236
  }
];

const headers = {
  'api-key': apiKey,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.forem.api-v1+json',
  'user-agent': 'Stratum-Praxis-Repair/4.0'
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
    title: lines[idx].replace(/^#\s+/, '').trim(),
    body: lines.slice(idx + 1).join('\n').trim()
  };
}

const report = [];
for (const target of targets) {
  const source = parse(target.file);

  const originalResp = await req(`https://dev.to/api/articles/stratumpraxis/${target.originalSlug}`, { headers });
  const originalText = await originalResp.text();
  if (!originalResp.ok) throw new Error(`Original resolve failed ${target.originalSlug}: ${originalResp.status} ${originalText}`);
  const original = JSON.parse(originalText);
  if (!original.id) throw new Error(`Original article missing id: ${target.originalSlug}`);

  const update = await req(`https://dev.to/api/articles/${original.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      article: {
        title: source.title,
        body_markdown: source.body,
        published: true,
        tags: ['ai','automation','productivity','business']
      }
    })
  });
  const updateText = await update.text();
  if (!update.ok) throw new Error(`Original update failed ${original.id}: ${update.status} ${updateText}`);
  const updated = JSON.parse(updateText);

  await sleep(32000);

  const retire = await req(`https://dev.to/api/articles/${target.accidentalId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ article: { published: false } })
  });
  const retireText = await retire.text();
  if (!retire.ok) throw new Error(`Accidental article retire failed ${target.accidentalId}: ${retire.status} ${retireText}`);

  report.push({
    title: source.title,
    original_id: original.id,
    original_url: updated.url,
    accidental_id: target.accidentalId,
    accidental_status: 'draft'
  });
  await sleep(32000);
}

console.log('DEV_DUPLICATE_REPAIR=' + JSON.stringify(report));
