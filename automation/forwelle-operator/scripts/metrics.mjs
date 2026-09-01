import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('automation/forwelle-operator');
const historyPath = path.join(ROOT, 'history.json');
const targetsPath = path.join(ROOT, 'metric-targets.json');
const livePath = path.join(ROOT, 'metrics-live.json');

let history = {version:1, items:[]};
try { history = JSON.parse(await fs.readFile(historyPath, 'utf8')); } catch {}
let targets = {version:1, items:[]};
try { targets = JSON.parse(await fs.readFile(targetsPath, 'utf8')); } catch {}

const required = ['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET','YOUTUBE_REFRESH_TOKEN'];
const hasYouTubeAuth = required.every(k => process.env[k]);
let youtubeToken = null;
async function getYouTubeToken() {
  if (!hasYouTubeAuth) return null;
  if (youtubeToken) return youtubeToken;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:process.env.YOUTUBE_CLIENT_ID,client_secret:process.env.YOUTUBE_CLIENT_SECRET,refresh_token:process.env.YOUTUBE_REFRESH_TOKEN,grant_type:'refresh_token'})
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`YouTube token refresh failed: ${j.error || r.status}`);
  youtubeToken = j.access_token; return youtubeToken;
}
function youtubeId(url) {
  try {
    const u = new URL(url); if (u.hostname.includes('youtu.be')) return u.pathname.split('/').filter(Boolean)[0] || null;
    return u.searchParams.get('v') || (u.pathname.includes('/shorts/') ? u.pathname.split('/shorts/')[1]?.split('/')[0] : null);
  } catch { return null; }
}
async function youtubeStats(id) {
  try {
    const token = await getYouTubeToken(); if (!token) return {status:'AUTH_NOT_CONFIGURED'};
    const u = new URL('https://www.googleapis.com/youtube/v3/videos');
    u.searchParams.set('part','snippet,status,statistics'); u.searchParams.set('id',id);
    const r = await fetch(u, {headers:{authorization:`Bearer ${token}`}}); const j = await r.json();
    if (!r.ok) return {status:'UNAVAILABLE', reason:j?.error?.message || String(r.status)};
    const v = j.items?.[0]; if (!v) return {status:'NOT_FOUND'};
    const s = v.statistics || {};
    return {
      status:'OK',
      title:v.snippet?.title || null,
      privacyStatus:v.status?.privacyStatus || null,
      views:Number(s.viewCount||0),
      likes:Number(s.likeCount||0),
      comments:Number(s.commentCount||0)
    };
  } catch (e) { return {status:'UNAVAILABLE', reason:String(e)}; }
}

const now = Date.now();
let changed = false;
for (const item of history.items || []) {
  const publishedAtRaw = item.platforms?.youtube?.sentAt || item.recordedAt || item.createdAt;
  const publishedAt = new Date(publishedAtRaw).getTime();
  if (!Number.isFinite(publishedAt)) continue;
  const ageH = (now - publishedAt) / 36e5;
  item.metrics ||= {};
  const url = item.platforms?.youtube?.externalLink;
  const id = youtubeId(url);
  for (const [label, minH] of [['24h', 23], ['72h', 71]]) {
    if (ageH < minH || item.metrics[label]?.youtube) continue;
    if (ageH > (label === '24h' ? 168 : 336)) continue;
    item.metrics[label] ||= {};
    item.metrics[label].capturedAt = new Date().toISOString();
    item.metrics[label].youtube = id ? await youtubeStats(id) : {status:'NO_PUBLISHED_URL'};
    item.metrics[label].instagram ||= {status:'ADAPTER_NOT_CONFIGURED'};
    item.metrics[label].tiktok ||= {status:'ADAPTER_NOT_CONFIGURED'};
    changed = true;
  }
}
if (changed) await fs.writeFile(historyPath, JSON.stringify(history, null, 2) + '\n');

const capturedAt = new Date().toISOString();
const liveItems = [];
for (const target of targets.items || []) {
  if (target.status && target.status !== 'ACTIVE') continue;
  const id = target.videoId || youtubeId(target.url);
  const youtube = id ? await youtubeStats(id) : {status:'NO_VIDEO_ID'};
  const baseline = target.baseline || {};
  const delta = youtube.status === 'OK' ? {
    views: Number.isFinite(Number(baseline.views)) ? youtube.views - Number(baseline.views) : null,
    likes: Number.isFinite(Number(baseline.likes)) ? youtube.likes - Number(baseline.likes) : null,
    comments: Number.isFinite(Number(baseline.comments)) ? youtube.comments - Number(baseline.comments) : null
  } : null;
  liveItems.push({
    id: target.id,
    goal: target.goal || null,
    url: target.url || (id ? `https://www.youtube.com/watch?v=${id}` : null),
    baseline,
    capturedAt,
    youtube,
    delta
  });
}
const live = {version:1, capturedAt, items:liveItems};
if (liveItems.length) await fs.writeFile(livePath, JSON.stringify(live, null, 2) + '\n');

console.log(JSON.stringify({
  changed,
  items: history.items?.length || 0,
  youtubeAuth: hasYouTubeAuth,
  liveTargets: liveItems
}, null, 2));
