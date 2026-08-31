import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('automation/forwelle-operator');
const manifestPath = path.join(ROOT, 'current.json');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const cfg = config.assetProviders?.moneyPrinterTurbo || {};
const baseRaw = String(process.env.MONEYPRINTERTURBO_BASE_URL || cfg.baseUrl || '').trim();
const apiKey = String(process.env.MONEYPRINTERTURBO_API_KEY || '').trim();
const required = cfg.required === true;
const candidateOnly = cfg.candidateOnly !== false;
const planPath = path.join(ROOT, 'asset-plan.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const headers = {'content-type':'application/json', ...(apiKey ? {'x-api-key':apiKey} : {})};
const writeState = async (status, extra = {}) => {
  manifest.assetCandidates ||= {};
  manifest.assetCandidates.moneyPrinterTurbo = {
    status,
    candidateOnly,
    promotedToPublication: false,
    provider: 'MoneyPrinterTurbo',
    ...extra
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    rendererPolicy: 'Remotion remains the preferred final-composition layer; candidate assets must pass rights/quality promotion before use.',
    providers: {moneyPrinterTurbo: manifest.assetCandidates.moneyPrinterTurbo}
  };
  await fs.writeFile(planPath, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
};

if (cfg.enabled === false) {
  await writeState('DISABLED');
  process.exit(0);
}
if (!baseRaw) {
  await writeState('SKIPPED_NOT_CONFIGURED', {reason:'Set MONEYPRINTERTURBO_BASE_URL to activate the candidate-material provider.'});
  process.exit(0);
}

let base;
try {
  const u = new URL(baseRaw);
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password) throw new Error('invalid URL');
  base = u.toString().replace(/\/$/, '');
} catch {
  await writeState('CONFIG_INVALID', {reason:'MONEYPRINTERTURBO_BASE_URL must be an http(s) URL without embedded credentials.'});
  if (required) process.exit(1);
  process.exit(0);
}

try {
  const body = {
    video_subject: String(manifest.topic || manifest.title || '').slice(0, 500),
    video_script: String(manifest.voiceover || '').slice(0, 8000),
    video_aspect: '9:16',
    video_count: 1,
    video_source: cfg.videoSource || 'pexels',
    subtitle_enabled: false,
    bgm_volume: 0,
    match_materials_to_script: true,
    video_clip_duration: Number(cfg.clipDurationSeconds || 4)
  };
  const create = await fetch(`${base}/api/v1/videos`, {method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(Number(cfg.requestTimeoutMs || 20000))});
  const created = await create.json().catch(()=>({}));
  if (!create.ok) throw new Error(`create ${create.status}: ${JSON.stringify(created).slice(0,500)}`);
  const taskId = created?.data?.task_id || created?.task_id;
  if (!taskId) throw new Error('MoneyPrinterTurbo returned no task_id');

  const maxPolls = Math.max(1, Math.min(40, Number(cfg.maxPolls || 20)));
  const pollMs = Math.max(2000, Math.min(30000, Number(cfg.pollMs || 6000)));
  let task = null;
  for (let i = 0; i < maxPolls; i++) {
    await sleep(i === 0 ? 1000 : pollMs);
    const r = await fetch(`${base}/api/v1/tasks/${encodeURIComponent(taskId)}`, {headers: apiKey ? {'x-api-key':apiKey} : {},signal:AbortSignal.timeout(Number(cfg.requestTimeoutMs || 20000))});
    const j = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(`task ${r.status}: ${JSON.stringify(j).slice(0,500)}`);
    task = j?.data || j;
    if (Number(task?.state) === 1) break;
    if (Number(task?.state) === -1) throw new Error(`task failed: ${task?.message || taskId}`);
  }
  const urls = [...(task?.combined_videos || []), ...(task?.videos || [])].filter(Boolean);
  if (Number(task?.state) !== 1 || urls.length === 0) {
    await writeState('SUBMITTED_NOT_READY', {taskId, reason:'Candidate generation did not finish inside the bounded polling window.'});
    process.exit(0);
  }

  const remote = new URL(String(urls[0]), `${base}/`).toString();
  const response = await fetch(remote, {headers: apiKey ? {'x-api-key':apiKey} : {},signal:AbortSignal.timeout(Number(cfg.downloadTimeoutMs || 60000))});
  if (!response.ok) throw new Error(`download ${response.status}`);
  const maxBytes = Number(cfg.maxCandidateBytes || 120_000_000);
  const length = Number(response.headers.get('content-length') || 0);
  if (length && length > maxBytes) throw new Error(`candidate too large: ${length} bytes`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100_000 || bytes.length > maxBytes) throw new Error(`candidate size rejected: ${bytes.length} bytes`);
  const dir = path.join(ROOT, 'assets', 'moneyprinter');
  await fs.mkdir(dir, {recursive:true});
  const file = path.join(dir, `${String(manifest.id).replace(/[^a-zA-Z0-9_-]+/g,'-')}.mp4`);
  await fs.writeFile(file, bytes);
  await writeState('CANDIDATE_READY', {
    taskId,
    localFile: path.relative(process.cwd(), file).replaceAll('\\','/'),
    sourceMode: cfg.videoSource || 'pexels',
    rightsStatus: 'REVIEW_REQUIRED',
    note: 'Candidate-only output. It is intentionally not added to thirdPartyAssets and cannot enter autonomous publication until source/license provenance is verified.'
  });
} catch (e) {
  await writeState('UNAVAILABLE', {reason:String(e).slice(0,700)});
  if (required) process.exit(1);
}
