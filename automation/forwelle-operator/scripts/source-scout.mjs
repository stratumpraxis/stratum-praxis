import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('automation/forwelle-operator');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const manual = JSON.parse(await fs.readFile(path.join(ROOT, 'manual-intake.json'), 'utf8'));
let state = {version: 1, recentCandidateIds: [], lastScoutAt: null};
try { state = JSON.parse(await fs.readFile(path.join(ROOT, 'state.json'), 'utf8')); } catch {}

const now = Date.now();
const blockedTerms = (config.safety?.blockedTerms || []).map(x => String(x).toLowerCase());
const trustedDomains = new Set((config.safety?.trustedFactDomains || []).map(x => String(x).toLowerCase()));
const themeTerms = (config.scout?.themeTerms || []).map(x => String(x).toLowerCase());
const revenueTerms = (config.scout?.revenueTerms || []).map(x => String(x).toLowerCase());
const recent = new Set(state.recentCandidateIds || []);

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
function isTrusted(url) {
  const host = hostOf(url);
  return [...trustedDomains].some(d => host === d || host.endsWith(`.${d}`));
}
function decodeXml(v) {
  return String(v || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripHtml(v) {
  return decodeXml(v).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
}
function cleanText(v, max = 500) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function slug(v) {
  return cleanText(v, 120).toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'signal';
}
function hasBlocked(text) {
  const x = text.toLowerCase();
  return blockedTerms.some(term => term && x.includes(term));
}
function wordHits(text, terms) {
  const x = text.toLowerCase();
  return terms.reduce((n, t) => n + (t && x.includes(t) ? 1 : 0), 0);
}
function ageHours(ts) {
  if (!ts) return 999;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) ? Math.max(0, (now - t) / 36e5) : 999;
}
function scoreCandidate(c) {
  const text = `${c.title} ${c.summary || ''}`;
  const age = ageHours(c.publishedAt);
  const freshness = age <= 6 ? 10 : age <= 24 ? 8 : age <= 48 ? 6 : age <= 96 ? 4 : age <= 168 ? 3 : 2;
  const themeFit = Math.min(10, 3 + wordHits(text, themeTerms) * 2);
  const revenueFit = Math.min(10, 2 + wordHits(text, revenueTerms) * 2);
  const engagement = Math.min(10, Math.round(Math.log10(Math.max(1, Number(c.engagement || 0))) * 3));
  const sourceTrust = c.verified ? 10 : c.sourceType === 'manual' ? 5 : 2;
  const originalityOpportunity = hasBlocked(text) ? 0 : 8;
  const officialFeedBoost = c.sourceType === 'official-feed' ? 6 : 0;
  const total = freshness + themeFit + revenueFit + engagement + sourceTrust + originalityOpportunity + officialFeedBoost + (c.sourceType === 'manual' ? 8 : 0);
  return {freshness, themeFit, revenueFit, engagement, sourceTrust, originalityOpportunity, officialFeedBoost, total, max: 74};
}

async function fetchJson(url, timeoutMs = 9000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {headers: {'user-agent': 'ForwelleSourceScout/1.1'}, signal: ac.signal});
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}
async function fetchText(url, timeoutMs = 12000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {headers: {'user-agent': 'ForwelleSourceScout/1.1', 'accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'}, signal: ac.signal});
    if (!r.ok) throw new Error(`${r.status}`);
    return await r.text();
  } finally { clearTimeout(timer); }
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? cleanText(stripHtml(m[1]), 1000) : '';
}
function attrLink(block) {
  const matches = [...block.matchAll(/<link\b([^>]*)>/gi)];
  for (const m of matches) {
    const attrs = m[1] || '';
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
    const rel = attrs.match(/rel=["']([^"']+)["']/i)?.[1] || '';
    if (href && (!rel || rel === 'alternate')) return decodeXml(href);
  }
  return '';
}
function parseFeed(xml, feed) {
  const blocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(m => m[0]);
  if (!blocks.length) blocks.push(...[...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(m => m[0]));
  const limit = Number(feed.limit || 8);
  return blocks.slice(0, limit).map((block, i) => {
    const title = tag(block, 'title');
    const url = tag(block, 'link') || attrLink(block) || tag(block, 'guid') || tag(block, 'id');
    const summary = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content') || tag(block, 'content:encoded');
    const publishedAt = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date') || null;
    return {title, url, summary, publishedAt, index: i};
  }).filter(x => x.title && x.url);
}

const candidates = [];

for (const item of manual.items || []) {
  if (item.disabled === true) continue;
  const title = cleanText(item.title || item.note || item.url, 180);
  if (!title || hasBlocked(`${title} ${item.note || ''}`)) continue;
  const id = `manual:${item.id || slug(title)}`;
  if (recent.has(id)) continue;
  candidates.push({
    id,
    sourceType: 'manual',
    sourceName: 'User / ChatGPT intake',
    title,
    summary: cleanText(item.note || item.angle || '', 500),
    angle: cleanText(item.angle || '', 300),
    url: String(item.url || '').trim(),
    publishedAt: item.addedAt || new Date().toISOString(),
    engagement: Number(item.engagement || 0),
    verified: item.verified === true,
    verificationNote: cleanText(item.verificationNote || '', 240)
  });
}

// First-party RSS/Atom feeds are the default factual source lane. They make the
// operator self-sufficient without turning social posts into unverified facts.
for (const feed of config.scout?.officialFeeds || []) {
  try {
    const xml = await fetchText(feed.url);
    for (const x of parseFeed(xml, feed)) {
      if (hasBlocked(`${x.title} ${x.summary}`)) continue;
      const actualHost = hostOf(x.url);
      const configuredDomain = String(feed.domain || '').toLowerCase();
      const domainMatches = actualHost === configuredDomain || actualHost.endsWith(`.${configuredDomain}`);
      if (!domainMatches || !isTrusted(x.url)) continue;
      const id = `feed:${slug(feed.name)}:${slug(x.url || x.title)}`;
      if (recent.has(id)) continue;
      candidates.push({
        id, sourceType: 'official-feed', sourceName: feed.name,
        title: cleanText(x.title, 180), summary: cleanText(x.summary, 500), url: x.url,
        publishedAt: x.publishedAt, engagement: 0, verified: true,
        verificationNote: `First-party RSS/Atom item whose destination matches ${configuredDomain}.`
      });
    }
  } catch (e) {
    console.warn(`Official feed unavailable (${feed.name}):`, String(e));
  }
}

if (config.scout?.hackerNews !== false) {
  try {
    const ids = (await fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json')).slice(0, Number(config.scout?.hackerNewsLimit || 24));
    const stories = await Promise.all(ids.map(async id => {
      try { return await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 6000); } catch { return null; }
    }));
    for (const s of stories.filter(Boolean)) {
      if (!s.title || !s.url) continue;
      const title = cleanText(s.title, 180);
      if (hasBlocked(title)) continue;
      const id = `hn:${s.id}`;
      if (recent.has(id)) continue;
      candidates.push({
        id, sourceType: 'hacker-news', sourceName: 'Hacker News signal', title,
        summary: '', url: s.url, publishedAt: s.time ? new Date(s.time * 1000).toISOString() : null,
        engagement: Number(s.score || 0) + Number(s.descendants || 0), verified: isTrusted(s.url),
        verificationNote: isTrusted(s.url) ? 'Destination is on the configured first-party fact-domain allowlist.' : 'Trend signal only; not approved as a factual source.'
      });
    }
  } catch (e) {
    console.warn('HN scout unavailable:', String(e));
  }
}

// Bluesky is a discovery-only lane. It is intentionally fail-soft: a public
// endpoint failure must never stop verified first-party feeds or owner intake.
for (const query of config.scout?.blueskyQueries || []) {
  try {
    const u = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts');
    u.searchParams.set('q', query);
    u.searchParams.set('sort', 'top');
    u.searchParams.set('limit', String(config.scout?.blueskyLimit || 12));
    const data = await fetchJson(u.toString());
    for (const p of data.posts || []) {
      const text = cleanText(p.record?.text || '', 360);
      if (!text || hasBlocked(text)) continue;
      const rkey = String(p.uri || '').split('/').pop();
      const handle = p.author?.handle;
      const url = handle && rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : '';
      const id = `bsky:${p.uri || slug(text)}`;
      if (recent.has(id)) continue;
      candidates.push({
        id, sourceType: 'bluesky', sourceName: 'Bluesky social signal',
        title: cleanText(text, 180), summary: text, url,
        publishedAt: p.indexedAt || p.record?.createdAt || null,
        engagement: Number(p.likeCount || 0) + Number(p.repostCount || 0) * 2 + Number(p.replyCount || 0),
        verified: false,
        verificationNote: 'Social signal only. Requires a separate first-party factual source before autonomous publication.'
      });
    }
  } catch (e) {
    console.warn(`Bluesky scout unavailable for ${query}:`, String(e));
  }
}

const dedup = new Map();
for (const c of candidates) {
  const key = c.url ? `${hostOf(c.url)}|${slug(c.title)}` : slug(c.title);
  const scored = {...c, scores: scoreCandidate(c)};
  const prev = dedup.get(key);
  if (!prev || scored.scores.total > prev.scores.total) dedup.set(key, scored);
}

const ranked = [...dedup.values()]
  .filter(c => c.scores.total >= Number(config.scout?.minCandidateScore || 30))
  .sort((a, b) => b.scores.total - a.scores.total)
  .slice(0, Number(config.scout?.maxCandidates || 24));

const verified = ranked.filter(c => c.verified === true);
const report = {
  version: 2,
  scoutedAt: new Date().toISOString(),
  totalCandidates: ranked.length,
  verifiedCandidates: verified.length,
  publishableCandidateId: verified[0]?.id || null,
  candidates: ranked
};
await fs.writeFile(path.join(ROOT, 'scout-latest.json'), JSON.stringify(report, null, 2) + '\n');
state.lastScoutAt = report.scoutedAt;
await fs.writeFile(path.join(ROOT, 'state.json'), JSON.stringify(state, null, 2) + '\n');
console.log(JSON.stringify({total: ranked.length, verified: verified.length, selected: verified[0]?.id || null}));
