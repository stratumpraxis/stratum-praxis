import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { REPO_ROOT, readJson, repoPath } from '../lib/util.mjs';
import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { routeDemand } from '../lib/router.mjs';
import { evaluateQueue } from '../lib/safety.mjs';
import { loadQueue } from '../lib/queue.mjs';

const run = promisify(execFile);
const node = process.execPath;

/** Files this engine must never modify. */
const PROTECTED = [
  'trend-video-engine/publish-ledger.json',
  'trend-video-engine/current.json',
  'trend-video-engine/last-qa.json',
  'trend-video-engine/tiktok-stratum-current.json',
  'trend-video-engine/variants/2026-08-27-agent-control-youtube-v5.json',
  'trend-video-engine/variants/2026-08-26-asking-to-doing-tiktok-v4.json',
  'async-ai-advisor.html',
  'unmanned/index.html',
  'distribution/provider-policy.json',
  'distribution/source-routing.json',
  'distribution/content-queue.json',
  'distribution/launch-now.json',
  'distribution/safety-audit.mjs',
  'distribution/distribution-safety-auditor.mjs',
  'revenue-os/metrics.json',
  'revenue-os/backlog.md',
  'revenue-link-ledger.md',
  'scos-analytics.js',
  'sitemap.xml',
  'AGENTS.md'
];

async function snapshot() {
  const out = {};
  for (const file of PROTECTED) out[file] = await fs.readFile(repoPath(file), 'utf8');
  return out;
}

test('every read-only CLI runs clean and leaves production files untouched', async () => {
  const before = await snapshot();

  for (const argv of [
    ['acquisition/cli/verify-inventory.mjs'],
    ['acquisition/cli/route.mjs', '--all'],
    ['acquisition/cli/queue-check.mjs'],
    ['acquisition/cli/ledger-sync.mjs'],
    ['acquisition/cli/daily-report.mjs'],
    ['acquisition/cli/attribution-backfill.mjs'],
    ['acquisition/cli/plan-video-attribution.mjs', '--asset', 'agentic-ai-governance-permission-kit', '--platform', 'youtube', '--campaign', 'probe']
  ]) {
    const { stdout } = await run(node, argv, { cwd: REPO_ROOT });
    assert.ok(stdout.length > 0, `${argv[0]} produced no output`);
  }

  const after = await snapshot();
  for (const file of PROTECTED) {
    assert.equal(after[file], before[file], `${file} must not be modified by the acquisition engine`);
  }
});

test('every CLI emits valid JSON in --json mode', async () => {
  for (const argv of [
    ['acquisition/cli/verify-inventory.mjs', '--json'],
    ['acquisition/cli/route.mjs', '--all', '--json'],
    ['acquisition/cli/queue-check.mjs', '--json'],
    ['acquisition/cli/daily-report.mjs', '--json'],
    ['acquisition/cli/attribution-backfill.mjs', '--json'],
    ['acquisition/cli/plan-video-attribution.mjs', '--asset', 'agentic-ai-governance-permission-kit', '--platform', 'youtube', '--campaign', 'probe', '--json']
  ]) {
    const { stdout } = await run(node, argv, { cwd: REPO_ROOT });
    assert.doesNotThrow(() => JSON.parse(stdout), `${argv[0]} did not emit parseable JSON`);
  }
});

test('the ledger sync refuses to run if the video ledger changes underneath it', async () => {
  const { stdout } = await run(node, ['acquisition/cli/ledger-sync.mjs'], { cwd: REPO_ROOT });
  assert.match(stdout, /Video ledger untouched: yes/);
  assert.match(stdout, /LEDGER_SYNC_OK/);
});

test('the daily report never claims unmeasured traffic or revenue', async () => {
  const { stdout } = await run(node, ['acquisition/cli/daily-report.mjs', '--json'], { cwd: REPO_ROOT });
  const report = JSON.parse(stdout);
  assert.equal(typeof report.q6_qualified_traffic, 'string');
  assert.match(report.q6_qualified_traffic, /NOT_MEASURED/);
  assert.match(report.q9_purchase_evidence, /NO_VERIFIED_PURCHASE/);
  assert.deepEqual(report.q10_scale, [], 'nothing may be marked SCALE without evidence');
  assert.equal(report.q4_actually_published.from_acquisition_queue.length, 0);
});

test('the daily report surfaces the paused-checkout gap it discovered', async () => {
  const { stdout } = await run(node, ['acquisition/cli/daily-report.mjs', '--json'], { cwd: REPO_ROOT });
  const report = JSON.parse(stdout);
  const gap = report.commercial_path_gaps.find((g) => g.asset_id === 'return-gate-growth-os');
  assert.ok(gap, 'the paused Growth OS checkout must be reported as a commercial gap');
  assert.equal(gap.destination_type, 'PAUSED');
});

test('the queue check blocks the item that collides with the live distribution lane', async () => {
  const { stdout } = await run(node, ['acquisition/cli/queue-check.mjs', '--json'], { cwd: REPO_ROOT });
  const report = JSON.parse(stdout);
  const blocked = report.items.filter((i) => !i.safety_ok);
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].queue_id, 'ai-saas-waste-calculator-instagram-v1');
  assert.ok(blocked[0].cross_lane_collisions.length > 0);
});

test('concurrent evaluations are independent and deterministic', async () => {
  const sourceRouting = await loadSourceRouting();
  const providerPolicy = await readJson('distribution/provider-policy.json');
  const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
  const queue = await loadQueue();
  const signal = {
    signal_id: 'concurrency-probe',
    problem_keys: ['ai_saas_spend', 'shadow_ai'],
    target_audience: ['finance'],
    language: 'en'
  };

  const results = await Promise.all(Array.from({ length: 12 }, async (_, index) => {
    // Interleave routing and queue auditing to surface any shared mutable state.
    const route = routeDemand(signal, inventory, { sourceRouting, providerPolicy });
    const audit = evaluateQueue(queue, { inventory, providerPolicy, sourceRouting });
    return { index, asset: route.best_existing_asset, confidence: route.confidence, blocks: audit.blocks.length };
  }));

  const first = results[0];
  for (const result of results) {
    assert.equal(result.asset, first.asset);
    assert.equal(result.confidence, first.confidence);
    assert.equal(result.blocks, first.blocks);
  }
});

test('concurrent CLI invocations do not corrupt shared state', async () => {
  const before = await snapshot();
  await Promise.all(Array.from({ length: 5 }, () =>
    run(node, ['acquisition/cli/queue-check.mjs', '--json'], { cwd: REPO_ROOT })));
  const queue = await loadQueue();
  assert.equal(queue.items.length, 2, 'the queue must be unchanged by concurrent read-only checks');
  const after = await snapshot();
  for (const file of PROTECTED) assert.equal(after[file], before[file]);
});

test('the routed draft in the shipped queue matches what the router produces today', async () => {
  const { stdout } = await run(node, ['acquisition/cli/route.mjs', '--all', '--json'], { cwd: REPO_ROOT });
  const routed = JSON.parse(stdout);
  const queue = await loadQueue();

  for (const entry of routed) {
    if (!entry.draft_queue_item) continue;
    const shipped = queue.items.find((i) => i.queue_id === entry.draft_queue_item.queue_id);
    if (!shipped) continue;
    assert.equal(shipped.destination_url, entry.draft_queue_item.destination_url,
      `${shipped.queue_id} attribution has drifted from what the router generates`);
    assert.deepEqual(shipped.utm_parameters, entry.draft_queue_item.utm_parameters);
  }
});

test('existing GitHub workflows still parse as YAML-ish and were not touched', async () => {
  const dir = repoPath('.github/workflows');
  const files = await fs.readdir(dir);
  assert.ok(files.length >= 14);
  for (const file of files) {
    const raw = await fs.readFile(`${dir}/${file}`, 'utf8');
    assert.match(raw, /^name:\s*\S/m, `${file} is missing a top-level name`);
    assert.match(raw, /^\s*(on|"on"):/m, `${file} is missing a trigger block`);
    assert.match(raw, /^jobs:/m, `${file} is missing a jobs block`);
    assert.ok(!raw.includes('\t'), `${file} contains a tab, which YAML forbids for indentation`);
  }
});
