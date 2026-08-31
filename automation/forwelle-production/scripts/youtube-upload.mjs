import fs from 'node:fs';

const videoPath = process.argv[2] || 'out/forwelle-agent-stop-condition.mp4';
const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
if (!fs.existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`);

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
    title: 'AI Agents Are Leaving the Screen',
    description: 'AI agents are beginning to connect with programmable physical devices. Anthropic’s Model Hardware Standard research preview describes a shared interface for devices including microscopes, liquid handlers, and robotic arms, with the goal of reducing custom integration time and enabling agents to coordinate experiments and adjust parameters in real time.\n\nPrimary source: https://www.anthropic.com/news/model-hardware-standard-research-preview\nPublished by Anthropic: Aug 27, 2026\n\nThis video uses original AI-generated illustrative visuals. No real-person likenesses or third-party news footage are used.\n\n#AI #AIAgents #Robotics #Automation #Anthropic #Forwelle',
    tags: ['AI', 'AI agents', 'physical AI', 'robotics', 'automation', 'Model Hardware Standard', 'MHS', 'Anthropic', 'laboratory automation', 'Forwelle'],
    categoryId: '28',
  },
  status: {
    privacyStatus: 'private',
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
console.log(`PRIVACY_STATUS=${uploadJson.status?.privacyStatus || 'private'}`);
console.log(`SYNTHETIC_MEDIA_DISCLOSED=${uploadJson.status?.containsSyntheticMedia ?? true}`);
