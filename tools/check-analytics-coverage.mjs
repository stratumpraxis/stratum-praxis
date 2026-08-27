#!/usr/bin/env node
/**
 * Analytics coverage gate for the money path (zero dependency, offline).
 *
 * scos-analytics.js is what turns a click into evidence: it emits
 * primary_cta_click and checkout_click, and carries UTM/first-touch/last-touch
 * attribution into PostHog. A page that links to Stripe, Payhip or Gumroad but
 * never loads it is unmeasurable — its checkout clicks simply do not exist in
 * the funnel, which is indistinguishable from nobody clicking.
 *
 * The current revenue priority is producing a first verified purchase while
 * improving measurement of CTA clicks, checkout starts and conversion rate
 * (AGENTS.md). A page that sells but does not report cannot participate in
 * that, so this check fails the build when one appears.
 *
 * Usage: node tools/check-analytics-coverage.mjs
 * Exit 0 = every checkout-bearing page reports. Exit 1 = at least one is blind.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const CHECKOUT_HOSTS = ['buy.stripe.com', 'payhip.com', 'gumroad.com'];
const ANALYTICS_SCRIPT = 'scos-analytics.js';

/**
 * Documented exemptions. Each is a deliberate decision with a reason, not a
 * page someone forgot — an unexplained entry here should be removed, not grown.
 */
const EXEMPT = new Map([
  ['microsoft-ai-roi-planner/index.html',
    'Store-submission PWA: its service worker precache and PWABuilder validation are verified as-is, and adding a network-dependent script would re-open that verification.'],
  ['ai-saas-spend.html', 'AI/SaaS Spend funnel — instrumentation deferred until the open measurement closes.'],
  ['ai-saas-spend-decision-kit.html', 'AI/SaaS Spend funnel — instrumentation deferred until the open measurement closes.'],
  ['ai-saas-spend-monitoring.html', 'AI/SaaS Spend funnel — instrumentation deferred until the open measurement closes.'],
  ['saas-spend-management-small-business.html', 'AI/SaaS Spend funnel — instrumentation deferred until the open measurement closes.'],
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') out.push(full);
  }
  return out;
}

const blind = [];
const exempted = [];
let covered = 0;

for (const file of walk(REPO_ROOT)) {
  const rel = relative(REPO_ROOT, file);
  const html = readFileSync(file, 'utf8');
  if (!CHECKOUT_HOSTS.some((host) => html.includes(host))) continue;
  if (html.includes(ANALYTICS_SCRIPT)) { covered += 1; continue; }
  if (EXEMPT.has(rel)) { exempted.push(`${rel} — ${EXEMPT.get(rel)}`); continue; }
  blind.push(rel);
}

console.log(`Checkout-bearing pages reporting to analytics: ${covered}.`);
if (exempted.length) {
  console.log(`\nDocumented exemptions: ${exempted.length}`);
  for (const item of exempted) console.log(`  ~ ${item}`);
}
if (blind.length) {
  console.error(`\nAnalytics coverage FAILED — ${blind.length} page(s) link to checkout but load no analytics:`);
  for (const item of blind) console.error(`  - ${item}`);
  console.error(`\nAdd <script defer src="/${ANALYTICS_SCRIPT}"></script> before </head>, or add a documented exemption.`);
  process.exit(1);
}
console.log('Analytics coverage OK — every checkout-bearing page reports its clicks.');
