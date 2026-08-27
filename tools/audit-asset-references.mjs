#!/usr/bin/env node
/**
 * Classify every binary asset in the repository by how it is actually
 * referenced, so cleanup decisions rest on evidence instead of a guess.
 *
 * Deleting a production asset is not reversible in the way a code change is:
 * a rendered video is still being served to a published post through its
 * raw.githubusercontent.com URL, and a share image is fetched by platforms
 * long after the post goes out. This tool therefore never deletes anything.
 * It reports, using the classifications the recovery process expects:
 *
 *   IN_USE            referenced by a page, manifest, payload or workflow
 *   KEEP              referenced only by durable records (ledgers, evidence,
 *                     documentation) — deleting it would break the audit trail
 *   ARCHIVE           published externally and no longer referenced by any
 *                     live surface; safe to move out of the serving path, but
 *                     only deliberately
 *   DELETE_CANDIDATE  no reference anywhere in the repository
 *   UNKNOWN_REFERENCE its path is only ever built at runtime, so static
 *                     analysis cannot prove whether it is live
 *
 * Usage: node tools/audit-asset-references.mjs [--markdown <path>]
 * Always exits 0 — this is a report, not a gate.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, relative, resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const ASSET_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.ico', '.pdf', '.zip']);
const TEXT_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.md', '.xml', '.yml', '.yaml', '.txt', '.py', '.webmanifest', '.sh']);

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
const assets = allFiles.filter((f) => ASSET_EXT.has(extname(f).toLowerCase()));
const textFiles = allFiles.filter((f) => TEXT_EXT.has(extname(f).toLowerCase()));

/** Which kind of file mentions an asset decides what the mention means. */
function sourceClass(relPath) {
  if (/^\.github\/workflows\//.test(relPath)) return 'workflow';
  if (/\.(html|htm)$/.test(relPath)) return 'page';
  if (/(^|\/)(manifest\.json|.*\.webmanifest)$/.test(relPath)) return 'manifest';
  if (/^distribution\/.*\.json$/.test(relPath)) return 'payload';
  if (/publish-ledger\.json$|last-qa\.json$|^revenue-os\//.test(relPath)) return 'record';
  if (/\.md$/.test(relPath)) return 'documentation';
  if (/\.(xml)$/.test(relPath)) return 'page';
  return 'other';
}

const corpus = textFiles.map((file) => ({
  rel: relative(REPO_ROOT, file),
  kind: sourceClass(relative(REPO_ROOT, file)),
  text: readFileSync(file, 'utf8'),
}));

/** Published assets are named in a publish ledger with a sent externalLink. */
const publishedPaths = new Set();
for (const entry of corpus.filter((c) => /publish-ledger\.json$/.test(c.rel))) {
  for (const match of entry.text.matchAll(/raw\.githubusercontent\.com\/[^"'\s]+?\/main\/([^"'\s]+)/g)) {
    publishedPaths.add(match[1]);
  }
}

/**
 * A directory whose files are only ever addressed by a path assembled at
 * runtime cannot be resolved statically. Record that honestly instead of
 * calling the files unused.
 */
const dynamicPathHints = corpus.filter((c) => c.kind !== 'documentation')
  .some((c) => /store-screenshots\/|['"`]\s*\+\s*\w+\s*\+\s*['"`]/.test(c.text));

const rows = [];
const hashes = new Map();

for (const asset of assets) {
  const rel = relative(REPO_ROOT, asset);
  const name = basename(asset);
  const size = statSync(asset).size;
  const digest = createHash('sha256').update(readFileSync(asset)).digest('hex');
  if (!hashes.has(digest)) hashes.set(digest, []);
  hashes.get(digest).push(rel);

  const referencedBy = new Map();
  for (const entry of corpus) {
    if (entry.rel === rel) continue;
    // Match by full repo path or by filename — assets are addressed both ways
    // (relative hrefs, raw.githubusercontent URLs, workflow arguments).
    if (entry.text.includes(rel) || entry.text.includes(name)) {
      if (!referencedBy.has(entry.kind)) referencedBy.set(entry.kind, []);
      referencedBy.get(entry.kind).push(entry.rel);
    }
  }

  const kinds = new Set(referencedBy.keys());
  let classification;
  let reason;

  if (kinds.has('page') || kinds.has('manifest') || kinds.has('payload') || kinds.has('workflow')) {
    classification = 'IN_USE';
    reason = `referenced by ${[...kinds].filter((k) => ['page', 'manifest', 'payload', 'workflow'].includes(k)).join(', ')}`;
  } else if (kinds.has('record')) {
    classification = 'KEEP';
    reason = 'referenced only by durable records (publish ledger / QA / metrics) — removing it would break the evidence trail';
  } else if (publishedPaths.has(rel)) {
    classification = 'ARCHIVE';
    reason = 'published externally but no longer referenced by a live surface';
  } else if (kinds.has('documentation')) {
    classification = 'KEEP';
    reason = 'referenced only by documentation';
  } else if (dynamicPathHints && /store-screenshots\//.test(rel)) {
    classification = 'UNKNOWN_REFERENCE';
    reason = 'addressed through a store submission process rather than a static link';
  } else {
    classification = 'DELETE_CANDIDATE';
    reason = 'no reference found anywhere in the repository';
  }

  rows.push({ path: rel, size, classification, reason, referencedBy: Object.fromEntries([...referencedBy].map(([k, v]) => [k, v.slice(0, 4)])), digest });
}

const duplicates = [...hashes.entries()].filter(([, paths]) => paths.length > 1);

const order = ['DELETE_CANDIDATE', 'UNKNOWN_REFERENCE', 'ARCHIVE', 'KEEP', 'IN_USE'];
rows.sort((a, b) => order.indexOf(a.classification) - order.indexOf(b.classification) || a.path.localeCompare(b.path));

const counts = {};
for (const row of rows) counts[row.classification] = (counts[row.classification] || 0) + 1;

const lines = [];
lines.push('# Asset reference audit', '');
lines.push(`Generated by \`tools/audit-asset-references.mjs\` on ${new Date().toISOString().slice(0, 10)}.`, '');
lines.push('This is a report. Nothing is deleted by running it, and nothing should be');
lines.push('deleted on the strength of a classification alone — confirm against the');
lines.push('referencing files listed below first.', '');
lines.push('| Classification | Assets |');
lines.push('| --- | ---: |');
for (const key of order) lines.push(`| ${key} | ${counts[key] || 0} |`);
lines.push('', `Total: ${rows.length} asset(s), ${(rows.reduce((sum, r) => sum + r.size, 0) / 1048576).toFixed(1)} MB.`, '');

for (const key of order) {
  const group = rows.filter((r) => r.classification === key);
  if (group.length === 0) continue;
  lines.push(`## ${key} (${group.length})`, '');
  for (const row of group) {
    const refs = Object.entries(row.referencedBy)
      .map(([kind, files]) => `${kind}: ${files.join(', ')}`)
      .join('; ');
    lines.push(`- \`${row.path}\` — ${(row.size / 1024).toFixed(0)} KB — ${row.reason}${refs ? `  \n  referenced by ${refs}` : ''}`);
  }
  lines.push('');
}

lines.push('## Byte-identical duplicates', '');
if (duplicates.length === 0) lines.push('None. No asset is stored twice.', '');
else {
  for (const [, paths] of duplicates) lines.push(`- ${paths.map((p) => `\`${p}\``).join(' = ')}`);
  lines.push('');
}

const report = lines.join('\n');
console.log(report);

const flag = process.argv.indexOf('--markdown');
if (flag !== -1 && process.argv[flag + 1]) {
  writeFileSync(process.argv[flag + 1], `${report}\n`);
  console.error(`\nWrote ${process.argv[flag + 1]}`);
}
