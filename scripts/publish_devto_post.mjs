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

const payload = {
  article: {
    title,
    published: true,
    body_markdown: body,
    tags: ['ai','automation','productivity','business'],
    ...(canonicalUrl ? { canonical_url: canonicalUrl } : {})
  }
};

const r = await fetch('https://dev.to/api/articles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.forem.api-v1+json',
    'api-key': apiKey
  },
  body: JSON.stringify(payload)
});
const text = await r.text();
if (!r.ok) throw new Error(`DEV publish failed: ${r.status} ${text}`);
const data = JSON.parse(text);
console.log(`DEVTO_PUBLIC_URL=${data.url || ''}`);
console.log(`DEVTO_ARTICLE_ID=${data.id || ''}`);
console.log(`DEVTO_STATUS=published`);
