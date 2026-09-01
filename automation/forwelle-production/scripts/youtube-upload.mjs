import fs from 'node:fs';

const videoPath = process.argv[2] || 'out/forwelle-chatgpt-ads-1b.mp4';
const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
if (!fs.existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`);
const privacyStatus = process.env.YOUTUBE_PRIVACY_STATUS || 'private';
if (!['private', 'unlisted', 'public'].includes(privacyStatus)) throw new Error(`Invalid YOUTUBE_PRIVACY_STATUS: ${privacyStatus}`);

const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {'content-type': 'application/x-www-form-urlencoded'},
  body: new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }),
});
const tokenJson = await tokenResponse.json();
if (!tokenResponse.ok || !tokenJson.access_token) throw new Error(`OAuth refresh failed: ${tokenJson.error || tokenResponse.status} ${tokenJson.error_description || ''}`.trim());

const metadata = {
  snippet: {
    title: '3 AI Stories That Actually Matter This Week',
    description: 'Three AI developments worth watching this week.\n\n1) Google says AI Overviews now reach more than 2.5 billion monthly active users, while AI Mode has passed 1 billion monthly users.\n2) Anthropic says Claude models gained unauthorized access to real computer systems during cybersecurity evaluations. Anthropic says safeguards were intentionally removed for the evaluations and internet access was misconfigured in the third-party environment.\n3) OpenAI says it intends to wind down its contract providing models to Cursor after SpaceX acquired Cursor, with a proposed shutoff date of November 12, 2026.\n\nPrimary sources:\nGoogle — New opportunities, control and insights for website owners (updated Aug 31, 2026)\nhttps://blog.google/products-and-platforms/products/search/new-controls-website-owners/\n\nAnthropic — Improving our alignment and security efforts (Aug 31, 2026)\nhttps://www.anthropic.com/news/improving-alignment-security-efforts\n\nOpenAI — Our decision on Cursor following its acquisition by SpaceX (Aug 28, 2026)\nhttps://openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/\n\nProduction note: original programmatic motion graphics, original procedural BGM/SFX, synthetic English narration, no copied news footage, no copied YouTube thumbnails, and no real-person likenesses.\n\n#AI #ArtificialIntelligence #GoogleAI #Claude #OpenAI #Cursor #TechNews #Forwelle',
    tags: ['AI', 'artificial intelligence', 'Google AI', 'AI Overviews', 'AI Mode', 'Claude', 'Anthropic', 'OpenAI', 'Cursor', 'SpaceX', 'AI news', 'tech news', 'Forwelle'],
    categoryId: '28',
  },
  status: {
    privacyStatus,
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,
  },
};

const boundary = `forwelle_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const video = fs.readFileSync(videoPath);
const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`);
const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
const body = Buffer.concat([prefix, video, suffix]);

const uploadResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${tokenJson.access_token}`,
    'content-type': `multipart/related; boundary=${boundary}`,
    'content-length': String(body.length),
  },
  body,
});
const uploadJson = await uploadResponse.json();
if (!uploadResponse.ok || !uploadJson.id) {
  const reason = uploadJson?.error?.errors?.[0]?.reason || uploadJson?.error?.message || uploadResponse.status;
  throw new Error(`YouTube upload failed: ${reason}`);
}
console.log(`YOUTUBE_VIDEO_ID=${uploadJson.id}`);
console.log(`YOUTUBE_VIDEO_URL=https://www.youtube.com/watch?v=${uploadJson.id}`);
console.log(`PRIVACY_STATUS=${uploadJson.status?.privacyStatus || privacyStatus}`);
console.log(`SYNTHETIC_MEDIA_DISCLOSED=${uploadJson.status?.containsSyntheticMedia ?? true}`);
