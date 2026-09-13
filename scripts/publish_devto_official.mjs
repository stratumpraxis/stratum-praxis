#!/usr/bin/env node
import fs from 'node:fs';

const [,, packagePath] = process.argv;
if (!packagePath) throw new Error('usage: publish_devto_official.mjs <package.json>');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const fail = (m) => { console.error(`FAIL_CLOSED: ${m}`); process.exit(1); };

if (pkg.brand !== 'Stratum') fail('BRAND_CHECK failed');
if ((pkg.platform || '').toLowerCase() !== 'devto') fail('CHANNEL_CHECK failed');
if (!pkg.title || !pkg.source_path || !pkg.canonical_url) fail('title/source_path/canonical_url missing');
if (!fs.existsSync(pkg.source_path)) fail(`source file missing: ${pkg.source_path}`);

const apiKey = (process.env.DEVTO_API_KEY || '').trim();
if (!apiKey) fail('DEVTO_API_KEY missing');

const bodyMarkdown = fs.readFileSync(pkg.source_path, 'utf8').trim();
if (!bodyMarkdown) fail('source body empty');

const payload = {
  article: {
    title: pkg.title,
    body_markdown: bodyMarkdown,
    published: pkg.published !== false,
    canonical_url: pkg.canonical_url,
    description: pkg.description || '',
    tags: Array.isArray(pkg.tags) ? pkg.tags.slice(0, 4) : []
  }
};

const resp = await fetch('https://dev.to/api/articles', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'api-key': apiKey,
    'user-agent': 'Stratum-Praxis-Publisher/1.0'
  },
  body: JSON.stringify(payload)
});

const raw = await resp.text();
let out = {};
try { out = JSON.parse(raw); } catch {}
if (!resp.ok) fail(`DEV publish failed ${resp.status}: ${raw.slice(0, 500)}`);
if (!out.url || !out.id) fail('DEV response missing url/id');

const evidence = {
  brand: 'Stratum',
  platform: 'devto',
  platform_accepted: true,
  article_id: out.id,
  public_url: out.url,
  canonical_url: pkg.canonical_url,
  content_id: pkg.content_id,
  published_at: new Date().toISOString()
};
fs.mkdirSync('publishing/evidence', { recursive: true });
fs.writeFileSync(`publishing/evidence/${pkg.content_id}.json`, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence));
