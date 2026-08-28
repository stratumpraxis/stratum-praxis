#!/usr/bin/env node
// PHASE 1 / PHASE 12 - verify the asset inventory.
//
// Offline (default): schema validation, repo-file existence, sitemap cross-check.
// --live: additionally performs real HTTPS checks and records HTTP_VERIFIED states.
//         Run this from GitHub Actions; outbound HTTPS to the public site is not
//         available from every authoring environment.
//
// Usage:
//   node acquisition/cli/verify-inventory.mjs [--live] [--write] [--json]

import fs from 'node:fs/promises';
import { loadSourceRouting, knownChannels } from '../lib/utm.mjs';
import { isUnknown, validateInventory } from '../lib/inventory.mjs';
import { fileExists, nowIso, parseUrl, readJson, repoPath, writeJson } from '../lib/util.mjs';

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const write = args.has('--write');
const asJson = args.has('--json');
const inventoryFile = 'acquisition/asset-inventory.json';

const sourceRouting = await loadSourceRouting();
const inventory = await readJson(inventoryFile);

const schemaErrors = validateInventory(inventory, { knownChannels: knownChannels(sourceRouting) });

const sitemapRaw = await fs.readFile(repoPath('sitemap.xml'), 'utf8');
const sitemapUrls = new Set([...sitemapRaw.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()));

const findings = [];
const results = [];

for (const asset of inventory.assets) {
  const record = { asset_id: asset.asset_id, checks: {} };

  // repo file
  if (asset.verification?.repo_file) {
    const exists = await fileExists(asset.verification.repo_file);
    record.checks.repo_file = exists ? 'PRESENT' : 'MISSING';
    if (!exists) findings.push(`${asset.asset_id}: declared repo_file ${asset.verification.repo_file} does not exist`);
  } else {
    record.checks.repo_file = 'NOT_DECLARED';
  }

  // sitemap
  const inSitemap = !isUnknown(asset.public_url) && sitemapUrls.has(asset.public_url);
  record.checks.in_sitemap = inSitemap;
  if (asset.verification?.in_sitemap !== undefined && asset.verification.in_sitemap !== inSitemap) {
    findings.push(`${asset.asset_id}: verification.in_sitemap says ${asset.verification.in_sitemap} but sitemap.xml says ${inSitemap}`);
  }

  // verification tier must match what we can actually prove
  const provable = record.checks.repo_file === 'PRESENT'
    ? (inSitemap ? 'REPO_AND_SITEMAP' : 'REPO_ONLY')
    : 'DOC_ONLY';
  record.checks.provable_state = provable;
  if (asset.verification_state !== 'HTTP_VERIFIED' && asset.verification_state !== provable) {
    findings.push(`${asset.asset_id}: verification_state ${asset.verification_state} is stronger or weaker than what is provable (${provable})`);
  }

  // live HTTP
  if (live && !isUnknown(asset.public_url)) {
    const url = parseUrl(asset.public_url);
    try {
      const response = await fetch(url, { method: 'GET', redirect: 'follow' });
      record.checks.http_status = response.status;
      if (response.ok) {
        asset.verification_state = 'HTTP_VERIFIED';
        asset.verification = { ...asset.verification, in_sitemap: inSitemap, http_checked_at: nowIso(), http_status: response.status };
      } else {
        findings.push(`${asset.asset_id}: live check returned HTTP ${response.status} for ${asset.public_url}`);
      }
    } catch (error) {
      record.checks.http_status = 'REQUEST_FAILED';
      findings.push(`${asset.asset_id}: live check failed for ${asset.public_url}: ${error.message}`);
    }
  }

  // commercial reachability - surfaced, never auto-fixed (pricing/store URLs are owner-controlled)
  const dest = asset.revenue_destination || {};
  if (asset.status === 'LIVE' && ['NONE', 'PAUSED', 'UNKNOWN'].includes(dest.type)) {
    findings.push(`${asset.asset_id}: status LIVE but revenue_destination.type is ${dest.type}; this route cannot end in a purchase`);
  }
  record.checks.commercial_path = ['STRIPE', 'PAYHIP', 'GUMROAD'].includes(dest.type) ? 'LIVE_CHECKOUT'
    : dest.type === 'INTERNAL_FUNNEL' ? 'HANDS_OFF_DOWNSTREAM'
      : dest.type;

  results.push(record);
}

if (live && write && !schemaErrors.length && !findings.length) {
  await writeJson(inventoryFile, {
    ...inventory,
    http_verification_note: `Live HTTP verification recorded at ${nowIso()}.`
  });
}

const report = {
  checked_at: nowIso(),
  mode: live ? 'live' : 'offline',
  assets: inventory.assets.length,
  schema_errors: schemaErrors,
  findings,
  results
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Inventory verification (${report.mode}) - ${report.assets} assets`);
  for (const record of results) {
    console.log(`  ${record.asset_id.padEnd(38)} repo=${String(record.checks.repo_file).padEnd(12)} sitemap=${String(record.checks.in_sitemap).padEnd(5)} state=${record.checks.provable_state.padEnd(17)} commercial=${record.checks.commercial_path}`);
  }
  if (schemaErrors.length) {
    console.error('\nSCHEMA ERRORS');
    for (const error of schemaErrors) console.error(`  - ${error}`);
  }
  if (findings.length) {
    console.error('\nFINDINGS');
    for (const finding of findings) console.error(`  - ${finding}`);
  }
}

// In --json mode stdout stays pure JSON; status markers go to stderr.
const mark = asJson ? console.error : console.log;
if (schemaErrors.length) {
  console.error('\nINVENTORY_INVALID');
  process.exit(1);
}
if (findings.length) {
  console.error('\nINVENTORY_FINDINGS_PRESENT (non-fatal; these are review items, not schema failures)');
  process.exit(2);
}
mark('\nINVENTORY_OK');
