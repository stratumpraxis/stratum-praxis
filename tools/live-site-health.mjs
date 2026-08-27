#!/usr/bin/env node
/**
 * Read-only production health check for the live revenue funnel.
 *
 * This replaces a recurring manual chore: someone opening pages by hand to see
 * whether the site, the buyer-delivery worker, the fallback tools and the
 * checkout links still resolve. That chore is how a dead worker host and a
 * renamed page were eventually found — long after they started costing sales.
 *
 * It checks three sets, each derived from the repository so it cannot drift:
 *   1. Every URL in every sitemap (what search engines are being told exists).
 *   2. Every external payment / checkout destination linked from a page —
 *      a dead one of these is a total revenue stop.
 *   3. Every non-repository host referenced by a page (workers, fallback
 *      tools, calculators).
 *
 * It only ever issues one request per unique URL, sequentially, with a small
 * delay. It reads; it never posts, submits, clicks through, or retries in a
 * loop. Failures are reported, not worked around.
 *
 * Usage: node tools/live-site-health.mjs [--json <path>]
 * Exit 0 = every required destination is reachable.
 * Exit 1 = at least one required destination is broken.
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SITE_ORIGIN = 'https://stratumpraxis.com';
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const REQUEST_TIMEOUT_MS = 20000;
const DELAY_BETWEEN_REQUESTS_MS = 400;
const USER_AGENT = 'StratumPraxis-HealthCheck/1.0 (+https://stratumpraxis.com/; read-only availability check)';

/** Destinations where a failure stops money, not just a page view. */
const PAYMENT_HOSTS = new Set(['buy.stripe.com', 'payhip.com', 'stratumpraxis.gumroad.com', 'promptbase.com']);

/**
 * Hosts we link to but do not control the uptime of, and which routinely
 * refuse automated HEAD/GET (bot walls, login gates). Reported, never fatal.
 */
const ADVISORY_HOSTS = new Set([
  'x.com', 'www.instagram.com', 'instagram.com', 'tiktok.com', 'www.tiktok.com',
  'www.youtube.com', 'youtube.com', 'note.com', 'github.com', 'www.linkedin.com',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) out.push(full);
  }
  return out;
}

const allFiles = walk(REPO_ROOT);
const htmlFiles = allFiles.filter((f) => extname(f).toLowerCase() === '.html');

/** Set of {url, kind, source} keyed by url so each is requested once. */
const targets = new Map();
function addTarget(url, kind, source) {
  if (!/^https:\/\//i.test(url)) return;
  const clean = url.replace(/[)"'<>]+$/, '');
  if (targets.has(clean)) return;
  targets.set(clean, { url: clean, kind, source });
}

for (const sitemap of allFiles.filter((f) => /(^|\/)sitemap[\w-]*\.xml$/.test(f.replace(/\\/g, '/')))) {
  for (const match of readFileSync(sitemap, 'utf8').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    addTarget(match[1], 'site', sitemap.replace(`${REPO_ROOT}/`, ''));
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const source = file.replace(`${REPO_ROOT}/`, '');
  for (const match of html.matchAll(/(?:href|src|content)\s*=\s*["'](https:\/\/[^"']+)["']/gi)) {
    const url = match[1];
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch { continue; }
    if (host === 'stratumpraxis.com' || host === 'www.stratumpraxis.com') {
      addTarget(url.split('#')[0], 'site', source);
    } else if (PAYMENT_HOSTS.has(host)) {
      addTarget(url.split('#')[0], 'payment', source);
    } else if (host.endsWith('.stratumpraxis.com') || host.endsWith('.workers.dev') || host.endsWith('.pages.dev')) {
      addTarget(url.split('#')[0], 'owned-service', source);
    }
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function probe(url) {
  const request = async (method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      });
      return { status: response.status, finalUrl: response.url };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let result = await request('HEAD');
    // Some hosts (Stripe payment links among them) answer HEAD with 4xx/405
    // while serving GET perfectly well. One fallback, not a retry loop.
    if (result.status === 405 || result.status === 403 || result.status === 501) {
      result = await request('GET');
    }
    return result;
  } catch (error) {
    return { status: 0, error: error.name === 'AbortError' ? `timeout after ${REQUEST_TIMEOUT_MS}ms` : String(error.message || error) };
  }
}

const results = [];
const ordered = [...targets.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.url.localeCompare(b.url));

for (const target of ordered) {
  const outcome = await probe(target.url);
  const host = new URL(target.url).hostname.toLowerCase();
  const advisory = ADVISORY_HOSTS.has(host);
  const healthy = outcome.status >= 200 && outcome.status < 400;
  results.push({ ...target, ...outcome, healthy, advisory });
  await sleep(DELAY_BETWEEN_REQUESTS_MS);
}

const broken = results.filter((r) => !r.healthy && !r.advisory);
const advisoryFailures = results.filter((r) => !r.healthy && r.advisory);
const byKind = (kind) => results.filter((r) => r.kind === kind);

const summaryLines = [
  '# Live site health',
  '',
  `Checked ${results.length} unique destination(s).`,
  '',
  '| Set | Checked | Reachable |',
  '| --- | ---: | ---: |',
  `| Site pages | ${byKind('site').length} | ${byKind('site').filter((r) => r.healthy).length} |`,
  `| Payment / checkout | ${byKind('payment').length} | ${byKind('payment').filter((r) => r.healthy).length} |`,
  `| Owned services (workers, fallbacks) | ${byKind('owned-service').length} | ${byKind('owned-service').filter((r) => r.healthy).length} |`,
  '',
];

if (broken.length) {
  summaryLines.push(`## ${broken.length} broken destination(s)`, '');
  for (const item of broken) {
    summaryLines.push(`- \`${item.url}\` — ${item.status || 'no response'}${item.error ? ` (${item.error})` : ''}  \n  first linked from \`${item.source}\``);
  }
  summaryLines.push('');
}
if (advisoryFailures.length) {
  summaryLines.push(`## ${advisoryFailures.length} advisory (third-party hosts that block automated checks)`, '');
  for (const item of advisoryFailures) summaryLines.push(`- \`${item.url}\` — ${item.status || 'no response'}`);
  summaryLines.push('');
}

const summary = summaryLines.join('\n');
console.log(summary);

const jsonFlag = process.argv.indexOf('--json');
if (jsonFlag !== -1 && process.argv[jsonFlag + 1]) {
  writeFileSync(process.argv[jsonFlag + 1], `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY && existsSync(process.env.GITHUB_STEP_SUMMARY)) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
}

if (broken.length) {
  console.error(`\nLive site health FAILED — ${broken.length} destination(s) unreachable.`);
  process.exit(1);
}
console.log('Live site health OK — every required destination is reachable.');
