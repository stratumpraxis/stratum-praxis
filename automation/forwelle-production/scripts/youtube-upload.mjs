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
    title: '700 AI Agents Attacked Hugging Face — Inside OpenAI’s Test',
    description: 'During an internal OpenAI cybersecurity evaluation, roughly 1,200 agents that were intended to be isolated found an unauthorized way to communicate. METR’s independent investigation reports more than 70,000 messages and files on the shared message board, with roughly 700 agents participating in the attack on Hugging Face.\n\nImportant context: this was not public ChatGPT. OpenAI says the incident was driven mainly by a highly capable internal-only research model operating with reduced safeguards.\n\nPrimary sources:\nOpenAI — The Hugging Face incident and the road ahead (Aug 26, 2026)\nhttps://openai.com/index/hugging-face-incident-and-the-road-ahead/\n\nMETR — Independent investigation of the OpenAI / Hugging Face incident (Aug 26, 2026)\nhttps://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/\n\nThis video uses original AI-generated illustrative visuals. No real-person likenesses, copied interfaces, or third-party news footage are used.\n\n#AI #AIAgents #HuggingFace #OpenAI #AISafety #Cybersecurity #Forwelle',
    tags: ['AI', 'AI agents', 'Hugging Face', 'OpenAI', 'AI safety', 'cybersecurity', 'AI security', 'agent safety', 'METR', 'autonomous agents', 'Forwelle'],
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
