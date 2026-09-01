import fs from 'node:fs';

const videoPath = process.argv[2] || 'out/forwelle-ai-roi-horizontal.mp4';
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
    title: "Why AI Isn't Making You Money (The Workflow Trap)",
    description: `AI can make work faster without making the business richer. This video explains the gap between AI activity and measurable financial outcomes — and the revenue-first workflow that closes it.\n\nKey 2026 signals:\n• PwC Global CEO Survey: 56% of CEOs reported no significant financial benefit from AI; only 12% reported both cost and revenue gains.\n• PwC Global AI Performance Study: the top 20% of companies capture 74% of AI-driven returns.\n• BCG: more than half of CEOs cite a missing link between AI and P&L, while only 14% clearly define P&L impact for all AI initiatives.\n\nThe practical filter:\nExpensive pain → one workflow → one metric → one customer action → revenue/cost impact → scale or kill.\n\nPrimary sources:\nPwC 2026 Global CEO Survey\nhttps://www.pwc.com/gx/en/news-room/press-releases/2026/pwc-2026-global-ceo-survey.html\n\nPwC — How leading companies generate ROI from AI\nhttps://www.pwc.com/gx/en/issues/c-suite-insights/the-leadership-agenda/roi-from-ai.html\n\nBCG — CEOs Are Starting to See Value from AI. Now Comes Execution.\nhttps://www.bcg.com/press/22july2026-ceos-cost-revenue-benefits-ai-struggling-scale\n\nProduction note: original programmatic motion graphics, original generated music/SFX, synthetic narration, no copied news footage, no copied YouTube thumbnails, and no real-person likeness.\n\n#AI #ArtificialIntelligence #AIBusiness #AIROI #Automation #SmallBusiness #Entrepreneurship #Forwelle`,
    tags: ['AI', 'AI ROI', 'artificial intelligence', 'AI business', 'AI automation', 'make money with AI', 'AI workflow', 'small business AI', 'AI strategy', 'AI productivity', 'Forwelle'],
    categoryId: '28',
  },
  status: {
    privacyStatus,
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,
  },
};

const boundary = `forwelle_horizontal_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
