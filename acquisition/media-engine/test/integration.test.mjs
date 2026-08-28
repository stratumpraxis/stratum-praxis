import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { REPO_ROOT, repoPath } from '../../lib/util.mjs';

const run = promisify(execFile);
const node = process.execPath;

/**
 * Files neither new subsystem may modify. The first block is the existing acquisition
 * engine's own protected list; the second is the historical acquisition state that
 * Issue #53 and Issue #52 must leave untouched.
 */
const PROTECTED = [
  'trend-video-engine/publish-ledger.json',
  'trend-video-engine/current.json',
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
  'AGENTS.md',
  'content/note-publish-queue/2026-08-26-repeat-visit-sites-win.md',
  'content/note-drafts/2026-08-26-routine-information-assets.md',
  // The existing acquisition engine's own durable state.
  'acquisition/distribution-ledger.json',
  'acquisition/distribution-queue.json',
  'acquisition/asset-inventory.json',
  'acquisition/demand-signals.json'
];

const READ_ONLY_CLIS = [
  ['acquisition/signal-intelligence/cli/ingest.mjs'],
  ['acquisition/signal-intelligence/cli/rank.mjs'],
  ['acquisition/signal-intelligence/cli/promote.mjs'],
  ['acquisition/signal-intelligence/cli/report.mjs'],
  ['acquisition/media-engine/cli/ingest-source.mjs'],
  ['acquisition/media-engine/cli/derive.mjs'],
  ['acquisition/media-engine/cli/queue-check.mjs'],
  ['acquisition/media-engine/cli/publish-check.mjs'],
  ['acquisition/media-engine/cli/report.mjs']
];

async function snapshot() {
  const out = {};
  for (const file of PROTECTED) out[file] = await fs.readFile(repoPath(file), 'utf8');
  return out;
}

test('every new CLI runs clean and leaves historical state byte-identical', async () => {
  const before = await snapshot();
  for (const argv of READ_ONLY_CLIS) {
    const { stdout } = await run(node, argv, { cwd: REPO_ROOT });
    assert.ok(stdout.length > 0, `${argv[0]} produced no output`);
  }
  const after = await snapshot();
  for (const file of PROTECTED) {
    assert.equal(after[file], before[file], `${file} must not be modified by the signal-intelligence or media-engine layers`);
  }
});

test('every new CLI emits valid JSON in --json mode', async () => {
  for (const argv of READ_ONLY_CLIS) {
    const { stdout } = await run(node, [...argv, '--json'], { cwd: REPO_ROOT });
    assert.doesNotThrow(() => JSON.parse(stdout), `${argv[0]} did not emit parseable JSON`);
  }
});

test('the existing acquisition engine still passes its own checks', async () => {
  for (const argv of [
    ['acquisition/cli/verify-inventory.mjs'],
    ['acquisition/cli/queue-check.mjs'],
    ['acquisition/cli/ledger-sync.mjs'],
    ['acquisition/cli/daily-report.mjs']
  ]) {
    const { stdout } = await run(node, argv, { cwd: REPO_ROOT });
    assert.ok(stdout.length > 0, `${argv[0]} produced no output`);
  }
});

test('the candidate store write path touches only its own file', async () => {
  const store = repoPath('acquisition/signal-intelligence/candidates.json');
  const storeBefore = await fs.readFile(store, 'utf8');
  const before = await snapshot();
  try {
    const { stdout } = await run(node, ['acquisition/signal-intelligence/cli/promote.mjs', '--write'], { cwd: REPO_ROOT });
    assert.match(stdout, /PROMOTE_OK write=true/);
    const after = await snapshot();
    for (const file of PROTECTED) assert.equal(after[file], before[file], `${file} changed during a --write run`);
  } finally {
    await fs.writeFile(store, storeBefore, 'utf8');
  }
});

test('the signal intelligence layer reports zero products created and zero purchases', async () => {
  const { stdout } = await run(node, ['acquisition/signal-intelligence/cli/report.mjs', '--json'], { cwd: REPO_ROOT });
  const report = JSON.parse(stdout);
  assert.equal(report.q12_products_created, 0);
  assert.match(report.q13_purchase_evidence, /NO_VERIFIED_PURCHASE/);
  assert.equal(report.q14_safety.publishes, 'NONE. This layer produces candidate records only.');
});

test('the media engine reports one identity, zero accounts and zero publishes', async () => {
  const { stdout } = await run(node, ['acquisition/media-engine/cli/report.mjs', '--json'], { cwd: REPO_ROOT });
  const report = JSON.parse(stdout);
  assert.equal(report.q1_identity.identities_in_system, 1);
  assert.equal(report.q1_identity.is_fictional, false);
  assert.equal(report.q11_safety.identities_created, 0);
  assert.equal(report.q11_safety.accounts_created, 0);
  assert.equal(report.q11_safety.personas_created, 0);
  assert.equal(report.q11_safety.publishes_performed, 0);
  assert.equal(report.q11_safety.auto_publish_allowed_routes, 0);
  assert.deepEqual(report.q6_channel_lanes.AUTO_PUBLISH_ALLOWED, []);
  assert.match(report.q10_purchase_evidence, /NO_VERIFIED_PURCHASE/);
});

test('no module in either layer contains publishing, account-creation or bypass code', async () => {
  // These match code that would DO the thing - a call, an import, a loop - rather than
  // prose that names it. Several modules describe these behaviours in order to state
  // that they are forbidden, and saying so must not look like doing so.
  const forbidden = [
    { pattern: /\bfetch\s*\(/, label: 'an outbound HTTP call' },
    { pattern: /\b(?:https?|net|dgram)\s*\.\s*request\s*\(/, label: 'an outbound socket call' },
    { pattern: /\b(?:createAccount|signUp|registerAccount)\s*\(/i, label: 'account creation' },
    { pattern: /\bsolve[A-Za-z]*captcha\s*\(|\bcaptcha\s*\./i, label: 'CAPTCHA handling' },
    { pattern: /(?:from|require\s*\()\s*['"][^'"]*(?:puppeteer|playwright|webdriver|selenium)/i, label: 'browser automation' },
    { pattern: /\bsetInterval\s*\(|while\s*\(\s*true\s*\)/, label: 'a retry loop' }
  ];
  const roots = ['acquisition/signal-intelligence', 'acquisition/media-engine'];
  const files = [];
  for (const root of roots) {
    for (const dir of ['lib', 'cli']) {
      const full = repoPath(root, dir);
      for (const entry of await fs.readdir(full)) {
        if (entry.endsWith('.mjs')) files.push(path.join(full, entry));
      }
    }
  }
  assert.ok(files.length >= 20, `expected the module scan to find both layers, found ${files.length}`);

  for (const file of files) {
    // Comments are stripped first: several modules discuss these behaviours in order to
    // document that they are forbidden, and saying so must not look like doing so.
    const code = stripComments(await fs.readFile(file, 'utf8'));
    for (const { pattern, label } of forbidden) {
      assert.equal(pattern.test(code), false,
        `${path.relative(REPO_ROOT, file)} contains ${label}, which neither layer is permitted to do`);
    }
  }
});

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

test('no credential-shaped literal is committed in either layer', async () => {
  const secretish = [
    /\bsk-[A-Za-z0-9]{16,}/,
    /\bghp_[A-Za-z0-9]{20,}/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i
  ];
  for (const root of ['acquisition/signal-intelligence', 'acquisition/media-engine']) {
    for await (const file of walk(repoPath(root))) {
      // The truth gate and its tests carry these patterns on purpose, to detect leaks.
      if (/truth-gate\.mjs$|truth-gate\.test\.mjs$/.test(file)) continue;
      const raw = await fs.readFile(file, 'utf8');
      for (const pattern of secretish) {
        assert.equal(pattern.test(raw), false, `${path.relative(REPO_ROOT, file)} contains a credential-shaped literal`);
      }
    }
  }
});

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}
