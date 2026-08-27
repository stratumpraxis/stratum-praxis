#!/usr/bin/env node
/**
 * Backfill missing share/canonical metadata on sitemap-listed pages.
 *
 * Why this exists: most published pages had no Open Graph or Twitter card
 * metadata, so every share of those URLs on X, LinkedIn, Slack, Instagram bio
 * links or messaging apps rendered as a bare link with no title, description
 * or image. Distribution is the active revenue channel, so this silently
 * suppressed click-through on work that had already been paid for.
 *
 * Rules this script obeys:
 *   - Additive only. An existing tag is never rewritten or removed.
 *   - No invented copy. og:title comes from the page's own <title>,
 *     og:description from its own meta description or its own lead paragraph.
 *   - Idempotent. Running it twice changes nothing the second time.
 *   - Pages under active measurement are skipped (see EXPERIMENT_HOLD).
 *
 * Usage:
 *   node tools/backfill-page-metadata.mjs --dry-run   # report only
 *   node tools/backfill-page-metadata.mjs             # write changes
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SITE_ORIGIN = 'https://stratumpraxis.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/media/og/stratum-praxis-og-default.png`;
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * The AI/SaaS Spend funnel is the subject of a live pre/post measurement
 * (see revenue-os/backlog.md "P1 — market-signal LP strengthening"). Changing
 * how these pages render when shared would change their traffic mix mid-test,
 * so they are deliberately left alone until that measurement closes.
 */
const EXPERIMENT_HOLD = new Set([
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

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function encodeAttribute(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collapse(text) {
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

/** Site URL -> repository file, following GitHub Pages directory-index rules. */
function fileForUrl(url) {
  const path = url.slice(SITE_ORIGIN.length) || '/';
  let relPath = path.replace(/^\//, '');
  if (relPath === '' || relPath.endsWith('/')) relPath += 'index.html';
  const full = join(REPO_ROOT, relPath);
  return existsSync(full) ? { full, relPath } : null;
}

function readSitemapUrls() {
  const urls = new Set();
  for (const sitemap of ['sitemap.xml', 'signal/sitemap.xml']) {
    const path = join(REPO_ROOT, sitemap);
    if (!existsSync(path)) continue;
    const xml = readFileSync(path, 'utf8');
    for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      if (match[1].startsWith(SITE_ORIGIN)) urls.add(match[1]);
    }
  }
  return [...urls].sort();
}

const headOf = (html) => {
  const match = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1] : '';
};

const hasMetaProperty = (head, property) =>
  new RegExp(`<meta[^>]+property\\s*=\\s*["']${property}["']`, 'i').test(head);
const hasMetaName = (head, name) =>
  new RegExp(`<meta[^>]+name\\s*=\\s*["']${name}["']`, 'i').test(head);
const hasCanonical = (head) => /<link[^>]+rel\s*=\s*["']canonical["']/i.test(head);

function extractTitle(head) {
  const match = head.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? collapse(match[1]) : '';
}

function extractDescription(head) {
  const match = head.match(/<meta[^>]+name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i);
  return match ? collapse(match[1]) : '';
}

/**
 * Fallback description source: the page's own first substantive paragraph.
 * Never invents copy — if the page says nothing quotable, og:description is
 * simply omitted rather than made up.
 */
function extractLeadParagraph(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const match of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = collapse(match[1].replace(/<[^>]+>/g, ' '));
    if (text.length >= 60) return text.length > 200 ? `${text.slice(0, 197).trimEnd()}…` : text;
  }
  return '';
}

/** "Foo | Stratum Praxis" reads badly as a card headline; keep the real subject. */
function shareTitle(title) {
  return title.replace(/\s*[|｜]\s*(Stratum Praxis|Signal Praxis)\s*$/i, '').trim() || title;
}

const urls = readSitemapUrls();
const changed = [];
const skipped = [];
const missingFiles = [];

for (const url of urls) {
  const target = fileForUrl(url);
  if (!target) { missingFiles.push(url); continue; }
  if (EXPERIMENT_HOLD.has(target.relPath)) {
    skipped.push(`${target.relPath} (under active measurement)`);
    continue;
  }

  const html = readFileSync(target.full, 'utf8');
  const head = headOf(html);
  if (!head) { skipped.push(`${target.relPath} (no <head>)`); continue; }

  const title = extractTitle(head);
  if (!title) { skipped.push(`${target.relPath} (no <title> to derive from)`); continue; }
  const description = extractDescription(head) || extractLeadParagraph(html);

  const additions = [];
  if (!hasCanonical(head)) additions.push(`<link rel="canonical" href="${encodeAttribute(url)}">`);
  if (!hasMetaProperty(head, 'og:type')) additions.push('<meta property="og:type" content="website">');
  if (!hasMetaProperty(head, 'og:title')) additions.push(`<meta property="og:title" content="${encodeAttribute(shareTitle(title))}">`);
  if (description && !hasMetaProperty(head, 'og:description')) {
    additions.push(`<meta property="og:description" content="${encodeAttribute(description)}">`);
  }
  if (!hasMetaProperty(head, 'og:url')) additions.push(`<meta property="og:url" content="${encodeAttribute(url)}">`);
  if (!hasMetaProperty(head, 'og:image')) {
    additions.push(`<meta property="og:image" content="${DEFAULT_OG_IMAGE}">`);
    additions.push('<meta property="og:image:width" content="1200">');
    additions.push('<meta property="og:image:height" content="630">');
  }
  if (!hasMetaName(head, 'twitter:card')) additions.push('<meta name="twitter:card" content="summary_large_image">');
  if (!hasMetaName(head, 'twitter:title')) additions.push(`<meta name="twitter:title" content="${encodeAttribute(shareTitle(title))}">`);
  if (description && !hasMetaName(head, 'twitter:description')) {
    additions.push(`<meta name="twitter:description" content="${encodeAttribute(description)}">`);
  }
  if (!hasMetaName(head, 'twitter:image')) additions.push(`<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">`);

  if (additions.length === 0) continue;

  // Minified single-line heads exist across this site; match the file's own
  // formatting instead of imposing a new one.
  const multiline = /<head\b[^>]*>\s*\n/i.test(html);
  const block = multiline ? `\n${additions.join('\n')}` : additions.join('');
  const updated = html.replace(/<\/head>/i, (multiline ? `${block}\n</head>` : `${block}</head>`));
  if (updated === html) { skipped.push(`${target.relPath} (no </head> anchor)`); continue; }

  if (!DRY_RUN) writeFileSync(target.full, updated);
  changed.push(`${target.relPath}: +${additions.length} tag(s)`);
}

console.log(`${DRY_RUN ? 'DRY RUN — ' : ''}sitemap pages examined: ${urls.length}`);
console.log(`Pages updated: ${changed.length}`);
for (const item of changed) console.log(`  + ${item}`);
if (skipped.length) {
  console.log(`Deliberately skipped: ${skipped.length}`);
  for (const item of skipped) console.log(`  - ${item}`);
}
if (missingFiles.length) {
  console.log(`Sitemap URLs with no file in repo: ${missingFiles.length}`);
  for (const item of missingFiles) console.log(`  ! ${item}`);
}
