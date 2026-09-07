#!/usr/bin/env node

import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const API_BASE = process.env.T2000_API_BASE || 'https://api.t2000.ai/v1';
const MIN_SCORE = Number(process.env.T2000_MIN_SCORE || 80);
const MIN_BUDGET = Number(process.env.T2000_MIN_BUDGET_USDC || 0.05);
const mode = process.argv[2] || 'scan';
const openingIdArg = process.argv[3] || '';
const deliveryArg = process.argv[4] || process.env.T2000_DELIVERY_TEXT || '';

const BLOCK_PATTERNS = [
  /\b(tweet|twitter|x\.com|reddit|discord|telegram|join (a )?community|referral|refer|invite)\b/i,
  /\b(login|log in|sign in|password|credential|api key|private key|seed phrase|captcha|kyc|identity verification)\b/i,
  /\b(send|transfer|deposit|fund|buy|purchase|stake|swap)\b.*\b(usdc|crypto|token|coin|wallet|money|usd|\$)\b/i,
  /\b(call|phone|interview|meeting|travel|in person|selfie|photo of yourself|video of yourself)\b/i,
  /\b(exploit|malware|credential theft|phishing|ransomware|intrusion|steal)\b/i,
];

const POSITIVE_PATTERNS = [
  /\b(write|rewrite|summari[sz]e|explain|translate|research|analy[sz]e|compare|review|classify|extract|list|draft)\b/i,
  /\b(markdown|plain text|json|report|brief|answer|table|checklist)\b/i,
  /\b(public (url|page|site|api|documentation)|source|citation|evidence)\b/i,
];

function textOf(job) {
  return [job.title, job.brief, job.briefPreview].filter(Boolean).join('\n');
}

function scoreJob(job) {
  const text = textOf(job);
  const reasons = [];
  let score = 0;

  if (job.status !== 'open') reasons.push('not_open');
  else score += 10;

  const budget = Number(job.maxUsdc || 0);
  if (budget >= 5) score += 20;
  else if (budget >= 1) score += 18;
  else if (budget >= 0.25) score += 15;
  else if (budget >= MIN_BUDGET) score += 10;
  else if (budget > 0) score += 4;
  else reasons.push('no_budget');

  const blocked = BLOCK_PATTERNS.filter((p) => p.test(text)).map((p) => p.source);
  if (blocked.length) {
    reasons.push('blocked_external_or_sensitive_action');
  } else {
    score += 20;
  }

  const positives = POSITIVE_PATTERNS.filter((p) => p.test(text)).length;
  score += Math.min(20, positives * 7);
  if (!positives) reasons.push('weak_ai_deliverability');

  const minSellerLevel = Number(job.minSellerLevel || 0);
  if (minSellerLevel === 0) score += 10;
  else reasons.push(`trust_gate_${minSellerLevel}`);

  const sla = Number(job.slaMinutes || 0);
  if (!sla || sla >= 120) score += 10;
  else if (sla >= 60) score += 5;
  else reasons.push('sla_too_short');

  const remainingMs = Number(job.openUntilMs || 0) - Date.now();
  if (!job.openUntilMs || remainingMs > 60 * 60 * 1000) score += 5;
  else reasons.push('closing_soon');

  if (job.kind === 'batch' && Number(job.slotsRemaining || 0) <= 0) {
    reasons.push('batch_full');
  } else {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));
  const eligible =
    job.status === 'open' &&
    budget >= MIN_BUDGET &&
    blocked.length === 0 &&
    positives > 0 &&
    minSellerLevel === 0 &&
    score >= MIN_SCORE;

  return { score, eligible, budget, reasons };
}

async function api(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: 'application/json' },
  });
  const body = await res.text();
  let json;
  try { json = JSON.parse(body); } catch { json = { raw: body }; }
  if (!res.ok) throw new Error(`t2000 API ${res.status}: ${body.slice(0, 500)}`);
  return json;
}

async function listAllOpen(limit = 100) {
  const rows = [];
  let offset = 0;
  while (rows.length < limit) {
    const page = await api(`/open-jobs?status=open&limit=24&offset=${offset}`);
    const jobs = Array.isArray(page.openJobs) ? page.openJobs : [];
    rows.push(...jobs);
    if (!page.truncated || typeof page.nextOffset !== 'number' || jobs.length === 0) break;
    offset = page.nextOffset;
  }
  return rows.slice(0, limit);
}

async function getOpening(id) {
  const json = await api(`/open-jobs/${encodeURIComponent(id)}`);
  return json.openJob || json;
}

function runT2(args, keyPath) {
  const result = spawnSync('t2', ['--key', keyPath, ...args, '--json'], {
    encoding: 'utf8',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`t2 ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').slice(0, 2000)}`);
  }
  const out = (result.stdout || '').trim();
  try { return JSON.parse(out); } catch { return { raw: out }; }
}

async function withWallet(fn) {
  const secret = (process.env.T2000_WALLET_SECRET || '').trim();
  if (!secret.startsWith('suiprivkey1')) {
    throw new Error('T2000_WALLET_SECRET is missing or is not a suiprivkey1… secret.');
  }
  const dir = await mkdtemp(join(tmpdir(), 't2000-runner-'));
  const keyPath = join(dir, 'wallet.key');
  try {
    await writeFile(keyPath, `${JSON.stringify({ version: 2, secret })}\n`, { mode: 0o600 });
    await chmod(keyPath, 0o600);
    return await fn(keyPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function scan() {
  const jobs = await listAllOpen();
  const enriched = [];
  for (const row of jobs) {
    let full = row;
    try {
      full = await getOpening(row.id);
    } catch {
      // bounded board preview is still enough to safely downgrade.
    }
    enriched.push({ ...full, evaluation: scoreJob(full) });
  }
  enriched.sort((a, b) => b.evaluation.score - a.evaluation.score || b.evaluation.budget - a.evaluation.budget);
  const report = {
    generatedAt: new Date().toISOString(),
    source: `${API_BASE}/open-jobs`,
    totalOpen: jobs.length,
    minScore: MIN_SCORE,
    minBudgetUsdc: MIN_BUDGET,
    eligible: enriched.filter((j) => j.evaluation.eligible),
    top: enriched.slice(0, 10),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function claimAndDeliver(openingId, deliveryText) {
  if (!openingId) throw new Error('openingId is required.');
  if (!deliveryText || deliveryText.trim().length < 2) {
    throw new Error('delivery text is required before claim; runner refuses claim-without-delivery.');
  }

  const opening = await getOpening(openingId);
  const evaluation = scoreJob(opening);
  if (!evaluation.eligible) {
    throw new Error(`Opening refused by guard: score=${evaluation.score}, reasons=${evaluation.reasons.join(',')}`);
  }

  return await withWallet(async (keyPath) => {
    // Idempotent; ensures the wallet has an active Agent ID before claim.
    const register = runT2(['agent', 'register'], keyPath);
    const claim = runT2(['job', 'claim', openingId], keyPath);

    // The opening read-model gains jobId after the on-chain claim lands.
    let claimed = null;
    for (let i = 0; i < 12; i += 1) {
      await new Promise((r) => setTimeout(r, 2500));
      claimed = await getOpening(openingId);
      if (claimed.jobId) break;
    }
    if (!claimed?.jobId) throw new Error('Claim landed but jobId did not appear in the read model. Stop; do not retry claim.');

    const delivery = runT2(['job', 'deliver', claimed.jobId, deliveryText], keyPath);
    const result = {
      ok: true,
      openingId,
      jobId: claimed.jobId,
      evaluation,
      register,
      claim,
      delivery,
      state: 'DELIVERED_WAITING_BUYER_REVIEW',
      revenueRecognized: false,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  });
}

try {
  if (mode === 'scan') {
    await scan();
  } else if (mode === 'claim-deliver') {
    await claimAndDeliver(openingIdArg, deliveryArg);
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
} catch (error) {
  console.error(JSON.stringify({ ok: false, mode, error: error?.message || String(error) }, null, 2));
  process.exit(1);
}
