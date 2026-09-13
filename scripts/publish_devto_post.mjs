import fs from 'node:fs';
import path from 'node:path';

const apiKey = process.env.DEVTO_API_KEY;
const sourcePath = process.env.PUBLISH_SOURCE_PATH;
if (!apiKey) throw new Error('Missing DEVTO_API_KEY');
if (!sourcePath) throw new Error('Missing PUBLISH_SOURCE_PATH');

const raw = fs.readFileSync(sourcePath, 'utf8').trim();
const lines = raw.split('\n');
const titleLine = lines.findIndex(l => /^#\s+/.test(l));
if (titleLine < 0) throw new Error(`No H1 title found in ${sourcePath}`);
const title = lines[titleLine].replace(/^#\s+/, '').trim();
const body = lines.slice(titleLine + 1).join('\n').trim();
const slug = path.basename(sourcePath, '.md');
const canonicalBase = process.env.CANONICAL_BASE_URL?.replace(/\/$/, '');
const canonicalUrl = canonicalBase ? `${canonicalBase}/${slug}/` : undefined;

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.forem.api-v1+json',
  'api-key': apiKey,
  'user-agent': 'Stratum-Praxis-Publisher/2.0'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function requestWith429(url, options = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(url, options);
    if (r.status !== 429) return r;
    if (attempt === 4) return r;
    const retryAfter = Number(r.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? (retryAfter + 2) * 1000 : 35000);
  }
}

const listResp = await requestWith429('https://dev.to/api/articles/me/all?per_page=1000', { headers });
const listText = await listResp.text();
if (!listResp.ok) throw new Error(`DEV lookup failed: ${listResp.status} ${listText}`);
const existing = JSON.parse(listText).find(a => a.title === title || (canonicalUrl && a.canonical_url === canonicalUrl));

const payload = {
  article: {
    title,
    published: true,
    body_markdown: body,
    tags: ['ai','automation','productivity','business'],
    ...(canonicalUrl ? { canonical_url: canonicalUrl } : {})
  }
};

const endpoint = existing ? `https://dev.to/api/articles/${existing.id}` : 'https://dev.to/api/articles';
const r = await requestWith429(endpoint, {
  method: existing ? 'PUT' : 'POST',
  headers,
  body: JSON.stringify(payload)
});
const text = await r.text();
if (!r.ok) throw new Error(`DEV publish failed: ${r.status} ${text}`);
const data = JSON.parse(text);
console.log(`DEVTO_PUBLIC_URL=${data.url || ''}`);
console.log(`DEVTO_ARTICLE_ID=${data.id || ''}`);
console.log(`DEVTO_MODE=${existing ? 'updated' : 'created'}`);
console.log('DEVTO_STATUS=published');
