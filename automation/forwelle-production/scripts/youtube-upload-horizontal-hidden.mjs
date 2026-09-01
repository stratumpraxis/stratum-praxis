import fs from 'node:fs';

const videoPath = process.argv[2] || 'out/forwelle-hidden-bottleneck.mp4';
const required = ['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET','YOUTUBE_REFRESH_TOKEN'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
if (!fs.existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`);

const privacyStatus = process.env.YOUTUBE_PRIVACY_STATUS || 'private';
if (!['private','unlisted','public'].includes(privacyStatus)) throw new Error(`Invalid YOUTUBE_PRIVACY_STATUS: ${privacyStatus}`);

const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:process.env.YOUTUBE_CLIENT_ID,client_secret:process.env.YOUTUBE_CLIENT_SECRET,refresh_token:process.env.YOUTUBE_REFRESH_TOKEN,grant_type:'refresh_token'}),
});
const tokenJson = await tokenResponse.json();
if (!tokenResponse.ok || !tokenJson.access_token) throw new Error(`OAuth refresh failed: ${tokenJson.error || tokenResponse.status}`);

const metadata = {
  snippet: {
    title: "AI Isn't Making You Money — The Hidden Bottleneck",
    description: `AI can make tasks faster while leaving the business stuck. The hidden problem is often not the model — it is the layer being automated.\n\nThis video breaks down five ideas:\n• task-level automation vs economic constraints\n• why more output can produce the same revenue\n• the bottleneck where profit is actually blocked\n• the verification tax created by excess AI output\n• a constraint-first loop: signal → decision → action → measurement\n\nThe core idea: do not optimize AI for maximum output. Use it to remove a measurable constraint that blocks customers, time, or revenue.\n\nProduction note: original programmatic motion graphics, original generated BGM and SFX, synthetic English narration, no copied airline jingle or radio theme, no copied third-party footage, no real-person likeness.\n\n#AI #ArtificialIntelligence #AIROI #Automation #AIBusiness #Workflow #Forwelle`,
    tags: ['AI','AI ROI','AI business','AI automation','AI workflow','business bottleneck','AI productivity','automation strategy','Forwelle'],
    categoryId:'28',
  },
  status: {privacyStatus,selfDeclaredMadeForKids:false,containsSyntheticMedia:true},
};

const boundary = `forwelle_hidden_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const video = fs.readFileSync(videoPath);
const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`);
const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
const body = Buffer.concat([prefix,video,suffix]);

const uploadResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart', {
  method:'POST',
  headers:{authorization:`Bearer ${tokenJson.access_token}`,'content-type':`multipart/related; boundary=${boundary}`,'content-length':String(body.length)},
  body,
});
const uploadJson = await uploadResponse.json();
if (!uploadResponse.ok || !uploadJson.id) throw new Error(`YouTube upload failed: ${uploadJson?.error?.message || uploadResponse.status}`);
console.log(`YOUTUBE_VIDEO_ID=${uploadJson.id}`);
console.log(`YOUTUBE_VIDEO_URL=https://www.youtube.com/watch?v=${uploadJson.id}`);
console.log(`PRIVACY_STATUS=${uploadJson.status?.privacyStatus || privacyStatus}`);
console.log(`SYNTHETIC_MEDIA_DISCLOSED=${uploadJson.status?.containsSyntheticMedia ?? true}`);
