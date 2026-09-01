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
    title: 'ChatGPT Ads Just Hit a $1B Run Rate — Here’s What Changes',
    description: 'ChatGPT Ads reached a $1 billion annualized revenue run rate in less than 200 days, according to OpenAI. The company says ChatGPT now serves more than 1 billion weekly active users and that tens of thousands of advertisers are using ChatGPT Ads.\n\nOpenAI says ads are shown separately from answers and do not influence the assistant’s response. Ads may appear for Free and Go users; Plus, Pro, Business, Enterprise, and Edu plans do not have ads.\n\nPrimary sources:\nOpenAI — A milestone in expanding access to AI (Aug 31, 2026)\nhttps://openai.com/index/expanding-access-to-ai-with-chatgpt-ads/\n\nOpenAI Help Center — Ads in ChatGPT\nhttps://help.openai.com/en/articles/20001047\n\nOpenAI — Ad policies\nhttps://openai.com/policies/ad-policies/\n\nProduction note: this Short uses original programmatically generated video clips, then edits those generated MP4s into a second-pass Remotion master. No copied ChatGPT interface, third-party news footage, or real-person likeness is used.\n\n#ChatGPT #OpenAI #AI #Advertising #TechNews #DigitalAds #Forwelle',
    tags: ['ChatGPT', 'OpenAI', 'ChatGPT Ads', 'AI advertising', 'digital advertising', 'AI business', 'tech news', 'generative AI', 'Forwelle'],
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
