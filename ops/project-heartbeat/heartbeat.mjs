import fs from 'node:fs/promises';

const configPath = process.env.HEARTBEAT_CONFIG || 'ops/project-heartbeat/config.json';
const cfg = JSON.parse(await fs.readFile(configPath, 'utf8'));
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if (!token || !repository) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
const api = 'https://api.github.com/repos/' + repository;
const now = Date.now();

async function gh(path, options = {}) {
  const res = await fetch(api + path, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: 'Bearer ' + token,
      'x-github-api-version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(path + ' -> ' + res.status + ' ' + text.slice(0, 400));
  return text ? JSON.parse(text) : null;
}

function hoursSince(value) {
  if (!value) return Infinity;
  const t = Date.parse(value);
  return Number.isFinite(t) ? (now - t) / 3600000 : Infinity;
}

async function latestWorkflowRun(workflow) {
  const data = await gh('/actions/workflows/' + encodeURIComponent(workflow) + '/runs?branch=' + encodeURIComponent(cfg.branch || 'main') + '&per_page=5');
  return (data?.workflow_runs || [])[0] || null;
}

async function dispatch(role) {
  await gh('/actions/workflows/' + encodeURIComponent(role.workflow) + '/dispatches', {
    method: 'POST',
    body: JSON.stringify({ ref: cfg.branch || 'main', inputs: role.inputs || {} })
  });
}

async function checkUrl(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': cfg.project + '-ProjectHeartbeat/1.0' } });
    return { reachable: r.ok, status: r.status, final_url: r.url };
  } catch (e) {
    return { reachable: false, status: 0, error: String(e).slice(0, 240) };
  }
}

async function readReceipt(path) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return null; }
}

async function upsertIssue(title, body) {
  const list = await gh('/issues?state=open&per_page=100');
  const existing = (list || []).find(i => !i.pull_request && i.title === title);
  if (existing) {
    if ((existing.body || '') !== body) {
      await gh('/issues/' + existing.number, { method: 'PATCH', body: JSON.stringify({ body }) });
    }
    return existing.number;
  }
  const created = await gh('/issues', { method: 'POST', body: JSON.stringify({ title, body }) });
  return created.number;
}

const rows = [];
let dispatches = 0;

for (const role of cfg.roles || []) {
  if (role.capability_gap) {
    rows.push({ id: role.id, state: 'CAPABILITY_GAP', latest: '-', next: role.reason || 'Worker required' });
    continue;
  }

  let run = null;
  try { run = await latestWorkflowRun(role.workflow); }
  catch (e) {
    rows.push({ id: role.id, state: 'READBACK_ERROR', latest: '-', next: String(e).slice(0, 180) });
    continue;
  }

  const age = hoursSince(run?.updated_at || run?.created_at);
  const successFresh = run?.status === 'completed' && run?.conclusion === 'success' && age <= role.stale_after_hours;
  const running = run && run.status !== 'completed';
  let state = successFresh ? 'HEALTHY' : running ? 'RUNNING' : run ? 'STALE_OR_FAILED' : 'NO_EVIDENCE';
  let next = role.external_action ? 'Observe only; external mutation remains gated.' : 'No action';

  if (!successFresh && !running && role.safe_dispatch) {
    const recentFailure = run?.conclusion && run.conclusion !== 'success' && age < (role.retry_after_hours || 2);
    if (recentFailure) {
      state = 'RECENT_FAILURE';
      next = 'Bounded retry hold; do not storm.';
    } else if (dispatches < (cfg.policy?.max_safe_dispatches_per_run || 2)) {
      try {
        await dispatch(role);
        dispatches++;
        state = 'DISPATCHED';
        next = 'Safe internal worker dispatched; await direct readback.';
      } catch (e) {
        state = 'DISPATCH_ERROR';
        next = String(e).slice(0, 180);
      }
    } else {
      state = 'DEFERRED';
      next = 'Dispatch budget reached; next heartbeat.';
    }
  }

  rows.push({
    id: role.id,
    state,
    latest: run ? ((run.conclusion || run.status) + ' @ ' + (run.updated_at || run.created_at)) : '-',
    next
  });
}

if (cfg.wordpress) {
  const live = await checkUrl(cfg.wordpress.url);
  const receipt = await readReceipt(cfg.wordpress.receipt_path);
  const receiptAge = hoursSince(receipt?.last_activity_at || receipt?.verified_at);
  const fresh = live.reachable && receipt && receiptAge <= cfg.wordpress.stale_after_hours && receipt.activity_today !== false;
  rows.unshift({
    id: cfg.wordpress.id || 'wordpress',
    state: fresh ? 'HEALTHY' : live.reachable ? 'ACTION_REQUIRED' : 'UNREACHABLE',
    latest: receipt ? ((receipt.last_activity_at || receipt.verified_at || 'receipt') + ' / HTTP ' + live.status) : ('NO_RECEIPT / HTTP ' + live.status),
    next: fresh
      ? 'WordPress evidence is fresh.'
      : 'Connected WordPress executor must inspect Current Reality, perform at most one justified safe action, read back live state, then refresh the receipt.'
  });
}

const generatedAt = new Date().toISOString();
const blocking = rows.filter(r => !['HEALTHY','RUNNING','DISPATCHED'].includes(r.state));
const state = {
  project: cfg.project,
  generated_at: generatedAt,
  repository,
  dispatches,
  overall_state: blocking.length ? 'ATTENTION_REQUIRED' : 'HEALTHY',
  roles: rows
};
await fs.writeFile('ops/project-heartbeat/runtime-state.json', JSON.stringify(state, null, 2) + '\n');

const lines = [
  '# ' + cfg.project + ' Project Heartbeat',
  '',
  'Generated: ' + generatedAt,
  '',
  'Policy: a successful GitHub run is not revenue evidence; WordPress and payment circulation cannot disappear behind a green infrastructure check.',
  '',
  '| Role | State | Latest evidence | Next |',
  '|---|---|---|---|',
  ...rows.map(r => '| ' + r.id + ' | ' + r.state + ' | ' + String(r.latest).replace(/\|/g,'/') + ' | ' + String(r.next).replace(/\|/g,'/') + ' |'),
  '',
  'Safe internal dispatches this run: **' + dispatches + '**.',
  '',
  'External mutation guard: WordPress writes, outbound sales, social publication, payment/refund/price/identity changes remain gated unless separately authorized.',
  '',
  'Heartbeat purpose: Current Reality -> weakest required role -> one bounded safe action -> readback -> evidence -> next wake.'
];
const body = lines.join('\n');
const issueNumber = await upsertIssue(cfg.issue_title, body);
await fs.appendFile(process.env.GITHUB_STEP_SUMMARY || '/dev/null', body + '\n\nTracking issue: #' + issueNumber + '\n');
console.log(JSON.stringify(state, null, 2));
