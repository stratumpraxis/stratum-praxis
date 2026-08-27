#!/usr/bin/env node
/**
 * Internal reference integrity check (zero dependency, offline).
 *
 * Why this exists: the revenue funnel has repeatedly shipped links that point
 * at nothing — a dead worker host, a page path that was renamed, an og:image
 * that was never committed. Each one is silently lost revenue: the visitor
 * hits a 404 on the way to checkout and nobody finds out until a human clicks
 * through by hand.
 *
 * This validates every *repository-internal* reference offline, so it runs on
 * every push without network access or secrets:
 *   - href/src/action targets in HTML that resolve inside the repo
 *   - og:image / twitter:image / canonical paths
 *   - <loc> entries in every sitemap*.xml and <link>/<guid> in every feed*.xml
 *   - manifest icon/screenshot paths in any *.webmanifest / manifest.json
 *
 * External URLs are reported as a count only; liveness is checked separately
 * by the scheduled live-site-health workflow, which has network access.
 *
 * Usage: node tools/check-internal-links.mjs
 * Exit 0 = every internal reference resolves. Exit 1 = at least one is broken.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, relative, resolve, dirname, posix } from 'node:path';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SITE_ORIGIN = 'https://stratumpraxis.com';
const SKIP_DIRS = new Set(['.git', 'node_modules']);

/** Paths that are served by an external host, not by this repository. */
const EXTERNAL_PREFIXES = ['http://', 'https://', 'mailto:', 'tel:', 'data:', 'javascript:', '#', '//'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const allFiles = walk(REPO_ROOT);
const htmlFiles = allFiles.filter((f) => extname(f).toLowerCase() === '.html');

/** Resolve a site path the way GitHub Pages does, including directory indexes. */
function resolveInternal(rawTarget, fromFile) {
  let target = rawTarget.trim();
  if (!target) return { skip: true };
  // Values built at runtime inside inline scripts/templates are not static
  // references and cannot be resolved on disk.
  if (target.includes('${') || target.includes('{{') || target.includes("' +") || target.includes('" +')) {
    return { skip: true };
  }
  for (const prefix of EXTERNAL_PREFIXES) {
    if (target.toLowerCase().startsWith(prefix)) return { external: true };
  }
  target = target.split('#')[0].split('?')[0];
  if (!target) return { skip: true };

  const base = target.startsWith('/')
    ? join(REPO_ROOT, target)
    : join(dirname(fromFile), target);
  const candidates = [base];
  if (target.endsWith('/') || !extname(target)) {
    candidates.push(join(base, 'index.html'));
    if (!target.endsWith('/')) candidates.push(`${base}.html`);
  }
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return { ok: true, resolved: candidate };
  }
  if (existsSync(base) && statSync(base).isDirectory()) {
    return { ok: false, reason: 'directory exists but has no index.html' };
  }
  return { ok: false, reason: 'no matching file in repository' };
}

const broken = [];
let internalChecked = 0;
let externalCount = 0;

const ATTR_PATTERN = /(?:href|src|action|data-href)\s*=\s*["']([^"']+)["']/gi;
const META_CONTENT_PATTERN =
  /<(?:meta|link)\b[^>]*?(?:property|name|rel)\s*=\s*["'](og:image|og:url|twitter:image|canonical|apple-touch-icon|icon|manifest)["'][^>]*?(?:content|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;

function record(target, file, context) {
  const result = resolveInternal(target, file);
  if (result.skip) return;
  if (result.external) { externalCount += 1; return; }
  internalChecked += 1;
  if (!result.ok) {
    broken.push({ file: relative(REPO_ROOT, file), target, context, reason: result.reason });
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(ATTR_PATTERN)) record(match[1], file, 'attribute');
  for (const match of html.matchAll(META_CONTENT_PATTERN)) record(match[2], file, `meta ${match[1]}`);
}

/**
 * Site-absolute URLs on our own origin are internal references wearing an
 * external costume — an og:image or sitemap entry pointing at
 * https://stratumpraxis.com/gone.png is just as dead as /gone.png.
 */
function recordSiteAbsolute(url, file, context) {
  if (!url.startsWith(SITE_ORIGIN)) return;
  const path = url.slice(SITE_ORIGIN.length) || '/';
  const result = resolveInternal(path, join(REPO_ROOT, 'index.html'));
  if (result.skip || result.external) return;
  internalChecked += 1;
  if (!result.ok) {
    broken.push({ file: relative(REPO_ROOT, file), target: url, context, reason: result.reason });
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/["'](https:\/\/stratumpraxis\.com\/[^"']*)["']/g)) {
    recordSiteAbsolute(match[1], file, 'absolute self-link');
  }
}

const sitemaps = allFiles.filter((f) => /(^|\/)sitemap[\w-]*\.xml$/.test(f.replace(/\\/g, '/')));
for (const sitemapPath of sitemaps) {
  const xml = readFileSync(sitemapPath, 'utf8');
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    recordSiteAbsolute(match[1], sitemapPath, 'sitemap <loc>');
  }
}

const feeds = allFiles.filter((f) => /(^|\/)feed[\w-]*\.xml$/.test(f.replace(/\\/g, '/')));
for (const feedPath of feeds) {
  const xml = readFileSync(feedPath, 'utf8');
  for (const match of xml.matchAll(/<(?:link|guid)[^>]*>\s*(https:\/\/[^<\s]+)\s*<\//g)) {
    recordSiteAbsolute(match[1], feedPath, 'feed entry');
  }
  for (const match of xml.matchAll(/<link[^>]*href\s*=\s*["'](https:\/\/[^"']+)["']/g)) {
    recordSiteAbsolute(match[1], feedPath, 'feed link');
  }
}

const manifests = allFiles.filter((f) => /\.webmanifest$|(^|\/)manifest\.json$/.test(f.replace(/\\/g, '/')));
for (const file of manifests) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    broken.push({ file: relative(REPO_ROOT, file), target: '(whole file)', context: 'manifest', reason: `invalid JSON: ${error.message}` });
    continue;
  }
  const refs = [];
  for (const key of ['icons', 'screenshots', 'shortcuts']) {
    for (const item of manifest[key] || []) {
      if (item.src) refs.push([item.src, `manifest ${key}`]);
      for (const icon of item.icons || []) if (icon.src) refs.push([icon.src, `manifest ${key} icon`]);
    }
  }
  if (manifest.start_url) refs.push([manifest.start_url, 'manifest start_url']);
  for (const [target, context] of refs) {
    const relTarget = target.startsWith('/') ? target : posix.join(posix.dirname(relative(REPO_ROOT, file).replace(/\\/g, '/')), target);
    const result = resolveInternal(relTarget.startsWith('/') ? relTarget : `/${relTarget}`, file);
    if (result.skip || result.external) continue;
    internalChecked += 1;
    if (!result.ok) {
      broken.push({ file: relative(REPO_ROOT, file), target, context, reason: result.reason });
    }
  }
}

console.log(`Checked ${internalChecked} internal reference(s) across ${htmlFiles.length} HTML file(s), ${sitemaps.length} sitemap(s), ${feeds.length} feed(s) and ${manifests.length} manifest(s).`);
console.log(`Skipped ${externalCount} external reference(s) — liveness is covered by the live-site-health workflow.`);

if (broken.length > 0) {
  console.error(`\nInternal link check FAILED — ${broken.length} broken reference(s):`);
  for (const item of broken) {
    console.error(`  - ${item.file} [${item.context}] -> ${item.target}  (${item.reason})`);
  }
  process.exit(1);
}
console.log('Internal link check OK — every repository-internal reference resolves.');
