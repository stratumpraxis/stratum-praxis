import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = 'content/ghost';
const OUT_DIR = 'distribution/publication-hub';
const TIPS_DIR = path.join(OUT_DIR, 'tips-ready');
const SOCIAL_DIR = path.join(OUT_DIR, 'social-ready');
const DEV_MAP_PATH = path.join(OUT_DIR, 'devto-map.json');
fs.mkdirSync(TIPS_DIR, { recursive: true });
fs.mkdirSync(SOCIAL_DIR, { recursive: true });

const files = fs.readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort();

const devMap = fs.existsSync(DEV_MAP_PATH)
  ? JSON.parse(fs.readFileSync(DEV_MAP_PATH, 'utf8'))
  : {};

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
  const titleIndex = lines.findIndex((l) => /^#\s+/.test(l));
  const titleLine = titleIndex >= 0 ? lines[titleIndex] : `# ${path.basename(file, '.md')}`;
  const title = titleLine.replace(/^#\s+/, '').trim();
  const slug = path.basename(file, '.md');
  const body = titleIndex >= 0 ? lines.slice(titleIndex + 1).join('\n').trim() : source;
  const plain = stripMd(body);
  const excerpt = plain.slice(0, 220);
  return { file, source, title, slug, body, excerpt };
}

function saveDevMap() {
  fs.writeFileSync(DEV_MAP_PATH, JSON.stringify(devMap, null, 2) + '\n');
}

async function resolveMappedArticle(article, headers) {
  const mapped = devMap[article.slug];
  if (!mapped) return null;
  if (mapped.article_id) return { id: Number(mapped.article_id), source: 'map_id' };
  if (!mapped.username || !mapped.path_slug) return null;

  const r = await fetchWithRateLimitRetry(
    `https://dev.to/api/articles/${encodeURIComponent(mapped.username)}/${encodeURIComponent(mapped.path_slug)}`,
    { headers },
    `DEV mapped resolve ${article.slug}`
  );
  if (r.status === 404) return null;
  const text = await r.text();
  if (!r.ok) throw new Error(`DEV mapped resolve failed ${r.status}: ${text}`);
  const data = JSON.parse(text);
  if (!data.id) return null;
  mapped.article_id = Number(data.id);
  saveDevMap();
  return { id: Number(data.id), source: 'map_path' };
}

async function devtoPublish(article) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) return { platform: 'devto', status: 'waiting_for_secret' };

  const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.forem.api-v1+json',
    'user-agent': 'Stratum-Praxis-Publisher/3.0'
  };
  const canonicalUrl = process.env.GHOST_PUBLIC_BASE_URL
    ? `${process.env.GHOST_PUBLIC_BASE_URL.replace(/\/$/, '')}/${article.slug}/`
    : undefined;

  let existing = await resolveMappedArticle(article, headers);

  if (!existing) {
    const me = await fetchWithRateLimitRetry(
      'https://dev.to/api/articles/me?per_page=1000',
      { headers },
      `DEV lookup ${article.slug}`
    );
    if (!me.ok) throw new Error(`DEV lookup failed ${me.status}: ${await me.text()}`);
    const list = await me.json();
    const found = list.find((x) =>
      x.title === article.title || (canonicalUrl && x.canonical_url === canonicalUrl)
    );
    if (found?.id) existing = { id: Number(found.id), source: 'published_lookup' };
  }

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

  const endpoint = existing ? `https://dev.to/api/articles/${existing.id}` : 'https://dev.to/api/articles';
  const r = await fetchWithRateLimitRetry(
    endpoint,
    {
      method: existing ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify(payload)
    },
    `DEV publish ${article.slug}`
  );
  if (!r.ok) throw new Error(`DEV publish failed ${r.status}: ${await r.text()}`);
  const data = await r.json();

  let publicPathSlug = data.slug || '';
  if (!publicPathSlug && data.url) {
    try { publicPathSlug = new URL(data.url).pathname.split('/').filter(Boolean).pop() || ''; } catch {}
  }
  devMap[article.slug] = {
    username: 'stratumpraxis',
    path_slug: publicPathSlug || devMap[article.slug]?.path_slug || '',
    article_id: Number(data.id)
  };
  saveDevMap();

  return {
    platform: 'devto',
    status: 'published',
    mode: existing ? 'updated' : 'created',
    identity_source: existing?.source || 'new_article',
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

saveDevMap();
fs.writeFileSync(path.join(OUT_DIR, 'publication-ledger.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  article_count: ledger.length,
  articles: ledger
}, null, 2) + '\n');

console.log(`PUBLICATION_HUB_ARTICLES=${ledger.length}`);
console.log(`DEVTO_READY=${Boolean(process.env.DEVTO_API_KEY)}`);
console.log('DEV_IDENTITY_MAP=ENFORCED');
console.log('TIPS_PACKETS=READY');
console.log('SOCIAL_PACKETS=READY');
