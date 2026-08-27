#!/usr/bin/env node
/**
 * Share/SEO metadata gate for published pages (zero dependency, offline).
 *
 * Every URL listed in a sitemap is a page the business is actively asking
 * search engines and social platforms to surface. A page without a title,
 * description, canonical or share card is published but not distributable —
 * it renders as a bare link everywhere it is shared.
 *
 * This check fails the build when a sitemap-listed page is missing required
 * metadata, so the gap cannot silently reappear on the next new page.
 *
 * Pages under active measurement are listed in HOLD and reported, not failed —
 * see revenue-os/backlog.md.
 *
 * Usage: node tools/check-page-metadata.mjs
 * Exit 0 = every published page is share-ready. Exit 1 = at least one gap.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SITE_ORIGIN = 'https://stratumpraxis.com';
const SITEMAPS = ['sitemap.xml', 'signal/sitemap.xml'];

/** Left alone while the AI/SaaS Spend measurement is open. Reported, not failed. */
const HOLD = new Set([
  'ai-saas-waste-calculator.html',
  'ai-saas-spend.html',
  'ai-saas-spend-audit-checklist.html',
  'ai-saas-spend-waste-audit.html',
  'ai-saas-spend-monitoring.html',
  'ai-saas-spend-decision-kit.html',
  'ai-saas-spend-buyers-guide.html',
  'ai-value-realization-kit.html',
  'saas-spend-management-small-business.html',
  'sales-funnel-ai-saas-spend.html',
  'guides/ai-saas-renewal-cost-check.html',
]);

const REQUIRED = [
  ['title', /<title>\s*[^<\s][^<]*<\/title>/i],
  ['meta description', /<meta[^>]+name\s*=\s*["']description["'][^>]*content\s*=\s*["'][^"']{20,}["']/i],
  ['canonical', /<link[^>]+rel\s*=\s*["']canonical["']/i],
  ['og:title', /<meta[^>]+property\s*=\s*["']og:title["'][^>]*content\s*=\s*["'][^"']+["']/i],
  ['og:url', /<meta[^>]+property\s*=\s*["']og:url["'][^>]*content\s*=\s*["'][^"']+["']/i],
  ['og:image', /<meta[^>]+property\s*=\s*["']og:image["'][^>]*content\s*=\s*["'][^"']+["']/i],
  ['twitter:card', /<meta[^>]+name\s*=\s*["']twitter:card["'][^>]*content\s*=\s*["'][^"']+["']/i],
];

function sitemapUrls() {
  const urls = new Set();
  for (const sitemap of SITEMAPS) {
    const path = join(REPO_ROOT, sitemap);
    if (!existsSync(path)) continue;
    for (const match of readFileSync(path, 'utf8').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      if (match[1].startsWith(SITE_ORIGIN)) urls.add(match[1]);
    }
  }
  return [...urls].sort();
}

function fileForUrl(url) {
  let relPath = (url.slice(SITE_ORIGIN.length) || '/').replace(/^\//, '');
  if (relPath === '' || relPath.endsWith('/')) relPath += 'index.html';
  const full = join(REPO_ROOT, relPath);
  return existsSync(full) ? { full, relPath } : null;
}

const urls = sitemapUrls();
const failures = [];
const held = [];
const orphans = [];
let checked = 0;

for (const url of urls) {
  const target = fileForUrl(url);
  if (!target) { orphans.push(url); continue; }
  const html = readFileSync(target.full, 'utf8');
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [, ''])[1];
  const missing = REQUIRED.filter(([, pattern]) => !pattern.test(head)).map(([label]) => label);

  // A share card that points at an image we do not ship is worse than none.
  const image = head.match(/<meta[^>]+property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (image && image[1].startsWith(SITE_ORIGIN)) {
    const imagePath = join(REPO_ROOT, image[1].slice(SITE_ORIGIN.length).replace(/^\//, ''));
    if (!existsSync(imagePath)) missing.push(`og:image target missing (${image[1]})`);
  }

  if (missing.length === 0) { checked += 1; continue; }
  if (HOLD.has(target.relPath)) held.push(`${target.relPath}: ${missing.join(', ')}`);
  else failures.push(`${target.relPath}: missing ${missing.join(', ')}`);
}

console.log(`Sitemap-listed pages: ${urls.length}. Fully share-ready: ${checked}.`);
if (held.length) {
  console.log(`\nOn measurement hold (not failed, see revenue-os/backlog.md): ${held.length}`);
  for (const item of held) console.log(`  ~ ${item}`);
}
if (orphans.length) {
  console.error(`\nSitemap lists ${orphans.length} URL(s) with no file in the repository:`);
  for (const item of orphans) console.error(`  ! ${item}`);
}
if (failures.length || orphans.length) {
  if (failures.length) {
    console.error(`\nPage metadata check FAILED — ${failures.length} page(s) not share-ready:`);
    for (const item of failures) console.error(`  - ${item}`);
    console.error('\nRun: node tools/backfill-page-metadata.mjs');
  }
  process.exit(1);
}
console.log('Page metadata check OK — every published page is share-ready.');
