import fs from 'node:fs/promises';
import path from 'node:path';

const planPath = process.env.VISUAL_PLAN || 'trend-video-engine/visual-plan.json';
const key = process.env.LAS_API_KEY;
const allowPaid = process.env.SEEDANCE_ALLOW_PAID === '1';
const base = (process.env.SEEDANCE_BASE_URL || 'https://operator.las.ap-southeast-1.bytepluses.com').replace(/\/$/, '');
const target = process.env.SEEDANCE_OUTPUT || 'campaigns/cross-agent-remotion/public/seedance-hook.mp4';
const assetState = process.env.SEEDANCE_ASSET_STATE || 'campaigns/cross-agent-remotion/src/generated-assets.json';
const pollMs = Number(process.env.SEEDANCE_POLL_MS || 10000);
const maxPolls = Number(process.env.SEEDANCE_MAX_POLLS || 90);

const plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
const cfg = plan.seedance25;

async function writeState(state) {
  await fs.mkdir(path.dirname(assetState), {recursive:true});
  await fs.writeFile(assetState, JSON.stringify({seedanceHook: state}, null, 2) + '\n', 'utf8');
}

if (!allowPaid) {
  await writeState({enabled:false, src:'seedance-hook.mp4', reason:'paid-generation-not-enabled'});
  console.log('SEEDANCE_PLAN_ONLY: paid generation is disabled. Remotion fallback remains active.');
  process.exit(0);
}

if (!key) {
  await writeState({enabled:false, src:'seedance-hook.mp4', reason:'missing-LAS_API_KEY'});
  console.log('SEEDANCE_BLOCKED: LAS_API_KEY is not configured. Remotion fallback remains active.');
  process.exit(0);
}

const body = {
  model: cfg.model || 'dreamina-seedance-2-5-260628',
  content: [{type:'text', text: cfg.prompt}],
  generate_audio: false,
  duration: Number(cfg.durationSeconds || 4),
  ratio: cfg.ratio || '9:16',
  resolution: cfg.resolution || '720p',
  watermark: false,
  return_last_frame: false,
  execution_expires_after: 3600
};

const create = await fetch(`${base}/api/v1/contents/generations/tasks`, {
  method:'POST',
  headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify(body)
});
const createdText = await create.text();
let created;
try { created = JSON.parse(createdText); } catch { created = null; }
if (!create.ok || !created?.id) {
  await writeState({enabled:false, src:'seedance-hook.mp4', reason:'create-failed'});
  throw new Error(`Seedance create failed (${create.status}): ${createdText.slice(0,1000)}`);
}

console.log(`SEEDANCE_TASK_CREATED=${created.id}`);
let result;
for (let i=0; i<maxPolls; i++) {
  await new Promise(r => setTimeout(r, pollMs));
  const r = await fetch(`${base}/api/v1/contents/generations/tasks/${encodeURIComponent(created.id)}`, {
    headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'}
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Seedance status failed (${r.status}): ${text.slice(0,1000)}`);
  result = JSON.parse(text);
  console.log(`SEEDANCE_STATUS=${result.status}`);
  if (result.status === 'succeeded') break;
  if (['failed','cancelled','expired'].includes(result.status)) {
    await writeState({enabled:false, src:'seedance-hook.mp4', reason:`task-${result.status}`});
    throw new Error(`Seedance task ended: ${JSON.stringify(result.error || result.status)}`);
  }
}

if (result?.status !== 'succeeded' || !result?.content?.video_url) {
  await writeState({enabled:false, src:'seedance-hook.mp4', reason:'poll-timeout'});
  throw new Error('Seedance task did not complete within the polling window.');
}

const video = await fetch(result.content.video_url);
if (!video.ok) throw new Error(`Seedance output download failed (${video.status})`);
const bytes = Buffer.from(await video.arrayBuffer());
await fs.mkdir(path.dirname(target), {recursive:true});
await fs.writeFile(target, bytes);
await writeState({enabled:true, src:path.basename(target), taskId:created.id, model:result.model || cfg.model, resolution:result.resolution || cfg.resolution, duration:result.duration || cfg.durationSeconds});
console.log(JSON.stringify({status:'SEEDANCE_READY', target, bytes:bytes.length, taskId:created.id}, null, 2));
