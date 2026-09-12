import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = 'content/ghost';
const OUT_DIR = 'distribution/publication-hub';
const TIPS_DIR = path.join(OUT_DIR, 'tips-ready');
const SOCIAL_DIR = path.join(OUT_DIR, 'social-ready');
fs.mkdirSync(TIPS_DIR, { recursive: true });
fs.mkdirSync(SOCIAL_DIR, { recursive: true });

const files = fs.readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRateLimitRetry(url, options = {}, label = 'DEV request') {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429) return response;
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? (retryAfter + 2) * 1000
      : 35000;
    const body = await response.text();
    console.log(`${label}: rate limited on attempt ${attempt}/${maxAttempts}; waiting ${Math.round(waitMs / 1000)}s; ${body.slice(0, 160)}`);
    if (attempt === maxAttempts) {
      return new Response(body, { status: 429, headers: response.headers });
    }
    await sleep(waitMs);
  }
}

const stripMd = (s) => s
  .replace(/```[\s\S]*?```/g, '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[#>*_`~-]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function parseArticle(file) {
  const source = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8').trim();
  const lines = source.split('\n');
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || `# ${path.basename(file, '.md')}`;
  const title = titleLine.replace(/^#\s+/, '').trim();
  const slug = path.basename(file, '.md');
  const body = lines.filter((l) => l !== titleLine).join('\n').trim();
  const plain = stripMd(body);
  const excerpt = plain.slice(0, 220);
  return { file, source, title, slug, body, excerpt };
}

async function devtoPublish(article) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return { platform: 'devto', status: 'waiting_for_secret' };

  const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.forem.api-v1+json'
  };
  const canonicalUrl = process.env.GHOST_PUBLIC_BASE_URL
    ? `${process.env.GHOST_PUBLIC_BASE_URL.replace(/\/$/, '')}/${article.slug}/`
    : undefined;

  const me = await fetchWithRateLimitRetry(
    'https://dev.to/api/articles/me/all?per_page=1000',
    { headers },
    `DEV lookup ${article.slug}`
  );
  if (!me.ok) throw new Error(`DEV lookup failed ${me.status}: ${await me.text()}`);
  const existing = (await me.json()).find((x) =>
    x.title === article.title || (canonicalUrl && x.canonical_url === canonicalUrl)
  );

  const payload = {
    article: {
      title: article.title,
      published: true,
      body_markdown: article.body,
      description: article.excerpt,
      tags: ['ai', 'automation', 'business', 'productivity'],
      ...(canonicalUrl ? { canonical_url: canonicalUrl } : {})
    }
  };

  const url = existing ? `https://dev.to/api/articles/${existing.id}` : 'https://dev.to/api/articles';
  const r = await fetchWithRateLimitRetry(
    url,
    {
      method: existing ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify(payload)
    },
    `DEV publish ${article.slug}`
  );
  if (!r.ok) throw new Error(`DEV publish failed ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return {
    platform: 'devto',
    status: 'published',
    id: data.id,
    url: data.url,
    canonical_url: data.canonical_url || canonicalUrl || null
  };
}

const ledger = [];
for (const file of files) {
  const a = parseArticle(file);

  const tipsPath = path.join(TIPS_DIR, file);
  fs.writeFileSync(tipsPath, `${a.source}\n\n---\n\nStratum Praxis: https://stratumpraxis.com/\n`, 'utf8');

  const social = {
    source: a.file,
    title: a.title,
    slug: a.slug,
    bluesky: `${a.title}\n\n${a.excerpt.slice(0, 180)}…\n\nhttps://stratumpraxis.com/`,
    instagram_caption: `${a.title}\n\n${a.excerpt}\n\n続きはプロフィールのStratum Praxisへ。`,
    tiktok_caption: `${a.title} — Stratum Praxis`,
    pinterest_title: a.title,
    pinterest_description: a.excerpt,
    generated_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(SOCIAL_DIR, `${a.slug}.json`), JSON.stringify(social, null, 2) + '\n');

  let devto;
  try {
    devto = await devtoPublish(a);
  } catch (err) {
    devto = { platform: 'devto', status: 'error', error: String(err.message || err) };
  }

  ledger.push({
    source: a.file,
    slug: a.slug,
    title: a.title,
    ghost: { status: 'managed_by_publish_ghost_workflow' },
    devto,
    tips: { status: 'ready_for_mcp', file: tipsPath },
    social: { status: 'ready', file: path.join(SOCIAL_DIR, `${a.slug}.json`) },
    checked_at: new Date().toISOString()
  });
}

fs.writeFileSync(path.join(OUT_DIR, 'publication-ledger.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  article_count: ledger.length,
  articles: ledger
}, null, 2) + '\n');

console.log(`PUBLICATION_HUB_ARTICLES=${ledger.length}`);
console.log(`DEVTO_READY=${Boolean(process.env.DEVTO_API_KEY)}`);
console.log('TIPS_PACKETS=READY');
console.log('SOCIAL_PACKETS=READY');
