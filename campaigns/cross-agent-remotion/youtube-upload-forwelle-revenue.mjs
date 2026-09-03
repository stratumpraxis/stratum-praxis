import fs from 'node:fs';

const file = process.argv[2] || 'output/forwelle-cross-agent-revenue-landscape.mp4';
for (const name of ['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET','YOUTUBE_REFRESH_TOKEN']) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}
if (!fs.existsSync(file)) throw new Error(`Missing video: ${file}`);

const destination = 'https://stratumpraxis.com/cross-agent-operating-kit.html?utm_source=forwelle&utm_medium=youtube_video&utm_campaign=cross_agent_personal&utm_content=permission_drift_v1&route_id=forwelle_youtube_permission_drift_v1_20260903';
const title = 'Your AI Agents Can All Be Right — And the System Can Still Fail';
const description = `Get the Cross-Agent Operating Kit — Personal · $69:\n${destination}\n\nYour agents can each behave correctly while the overall system still drifts. Permissions, human gates, budgets, handoffs and stop rules can disagree across runtimes. The bottleneck is often the operating layer around the models.\n\nCross-Agent Operating Kit v1.0 provides an editable master policy, runtime adapters, conflict checks, a Human Gate Matrix, budget / quota guards and migration tools for your own projects. One-time Personal license: $69. No subscription. No guaranteed performance or revenue outcome.\n\nCompatible use contexts include Claude Code, Codex, Cursor and other agent runtimes. Stratum Praxis is independent and is not an official product of those vendors.\n\nProduction: original programmatic creative, original/procedural audio bed, AI-generated English narration.\n\n#AIAgents #Automation #AIWorkflow #ClaudeCode #Codex #Cursor #Forwelle`;

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {'content-type':'application/x-www-form-urlencoded'},
  body: new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }),
});
const token = await tokenRes.json();
if (!tokenRes.ok || !token.access_token) throw new Error(`OAuth refresh failed: ${token.error || tokenRes.status}`);

const metadata = {
  snippet: {
    title,
    description,
    tags: ['AI agents','multi-agent AI','AI automation','AI workflow','Claude Code','Codex','Cursor','agent governance','Cross-Agent Operating Kit','Forwelle'],
    categoryId: '28',
  },
  status: {
    privacyStatus: 'public',
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: true,
  },
};

const boundary = `forwelle_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const video = fs.readFileSync(file);
const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`);
const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
const body = Buffer.concat([prefix, video, suffix]);
const res = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token.access_token}`,
    'content-type': `multipart/related; boundary=${boundary}`,
    'content-length': String(body.length),
  },
  body,
});
const payload = await res.json();
if (!res.ok || !payload.id) throw new Error(`YouTube upload failed: ${payload?.error?.errors?.[0]?.reason || payload?.error?.message || res.status}`);
const url = `https://www.youtube.com/watch?v=${payload.id}`;
const evidence = {
  videoId: payload.id,
  url,
  title,
  destination,
  creativeId: 'forwelle_cross_agent_permission_drift_landscape_v1',
  ownerProject: 'Stratum',
  productId: 'prod_VA15eq5Gxy3Zzj',
  product: 'cross_agent_personal',
  angle: 'contrarian_risk_avoidance',
  privacyStatus: payload.status?.privacyStatus || 'public',
  syntheticMedia: payload.status?.containsSyntheticMedia ?? true,
};
fs.writeFileSync('output/forwelle-cross-agent-revenue-upload.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
