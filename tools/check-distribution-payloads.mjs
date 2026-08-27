#!/usr/bin/env node
/**
 * Pre-publish validation for every Buffer distribution payload (offline).
 *
 * The 2026-08-27 ai_saas_cost_review Instagram post was accepted by Buffer and
 * then failed at send time with status=error, sentAt=null — it reached nobody.
 * Root cause: the payload's imageUrl pointed at a committed PNG that was
 * truncated. Buffer could not fetch a usable image, and the failure only became
 * visible hours later when a human ran a status query by hand.
 *
 * distribution/safety-audit.mjs already covers text, URL and UTM safety, but it
 * never looked at the media a payload references, and it only ran on the
 * scheduled queue — not on the one-shot launch payloads that actually publish.
 *
 * This check closes both gaps for every payload in distribution/, offline and
 * with no credentials, so a broken payload is caught at merge instead of at
 * send time:
 *   - media referenced from this repository must exist and be structurally valid
 *   - Instagram items must carry an image (Buffer rejects them otherwise)
 *   - ids unique, text present, destination HTTPS + UTM-tagged
 *
 * Usage: node tools/check-distribution-payloads.mjs
 * Exit 0 = every payload is publishable. Exit 1 = at least one would fail.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = resolve(new URL('..', import.meta.url).pathname);
const DIST_DIR = join(REPO_ROOT, 'distribution');
const RAW_PREFIX = 'https://raw.githubusercontent.com/stratumpraxis/stratum-praxis/';
const IMAGE_REQUIRED_SERVICES = new Set(['instagram', 'pinterest']);
const APPROVED_LINK_HOSTS = ['stratumpraxis.com', 'note.com'];

function payloadFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) payloadFiles(full, out);
    else if (entry.isFile() && extname(entry.name) === '.json') out.push(full);
  }
  return out;
}

/**
 * distribution/provider-policy.json is the record of which services Buffer is
 * actually authorized to publish to. A payload aimed somewhere else is not an
 * error — the publisher simply skips channels that are not connected — but it
 * is drift between what the queue intends and what policy permits, and it
 * should be visible rather than silently inert.
 */
function policyAllowedServices() {
  const path = join(DIST_DIR, 'provider-policy.json');
  if (!existsSync(path)) return null;
  try {
    const policy = JSON.parse(readFileSync(path, 'utf8'));
    const buffer = policy.providers?.buffer;
    if (!buffer?.publishingEnabled || !Array.isArray(buffer.allowedServices)) return null;
    return new Set(buffer.allowedServices.map((s) => String(s).toLowerCase()));
  } catch {
    return null;
  }
}

const allowedServices = policyAllowedServices();
const errors = [];
const notes = [];
const policyDrift = new Set();
const mediaToVerify = new Set();
let itemCount = 0;
let payloadCount = 0;

for (const file of payloadFiles(DIST_DIR)) {
  const rel = relative(REPO_ROOT, file);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${rel}: invalid JSON — ${error.message}`);
    continue;
  }
  // Config files (provider policy, routing tables) are objects, not post queues.
  if (!Array.isArray(parsed)) continue;
  payloadCount += 1;

  const seenIds = new Set();
  for (const [index, item] of parsed.entries()) {
    const label = `${rel}[${item?.id || index}]`;
    if (!item || typeof item !== 'object') { errors.push(`${label}: not an object`); continue; }
    if (!item.id || typeof item.id !== 'string') errors.push(`${label}: missing string id`);
    else if (seenIds.has(item.id)) errors.push(`${label}: duplicate id within this payload`);
    else seenIds.add(item.id);

    if (item.active === false) continue;
    itemCount += 1;

    const services = Array.isArray(item.services) ? item.services.map((s) => String(s).toLowerCase()) : [];
    if (services.length === 0) errors.push(`${label}: no target services`);
    if (!String(item.text || '').trim()) errors.push(`${label}: empty post text`);

    if (!item.url) {
      errors.push(`${label}: missing destination url`);
    } else {
      let url;
      try { url = new URL(item.url); } catch { url = null; }
      if (!url) errors.push(`${label}: invalid destination url`);
      else {
        if (url.protocol !== 'https:') errors.push(`${label}: destination must use HTTPS`);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        if (!APPROVED_LINK_HOSTS.some((d) => host === d || host.endsWith(`.${d}`))) {
          errors.push(`${label}: unapproved destination host ${host}`);
        }
        for (const param of ['utm_source', 'utm_medium', 'utm_campaign']) {
          if (!url.searchParams.get(param)) errors.push(`${label}: destination missing ${param}`);
        }
      }
    }

    const mediaRefs = ['imageUrl', 'videoUrl', 'mediaUrl']
      .filter((key) => item[key])
      .map((key) => [key, String(item[key])]);

    for (const service of services) {
      if (allowedServices && !allowedServices.has(service)) {
        policyDrift.add(`${rel}: targets "${service}", which provider-policy.json does not list as a Buffer publishing service`);
      }
      if (IMAGE_REQUIRED_SERVICES.has(service) && mediaRefs.length === 0) {
        errors.push(`${label}: ${service} requires media but the payload has none — Buffer will reject or drop it`);
      }
    }

    for (const [key, value] of mediaRefs) {
      if (!value.startsWith('https://')) { errors.push(`${label}: ${key} must be HTTPS`); continue; }
      if (!value.startsWith(RAW_PREFIX)) {
        // Media hosted elsewhere cannot be validated offline; the live-site
        // health workflow checks that it is fetchable.
        notes.push(`${label}: ${key} is hosted off-repo (${new URL(value).hostname}) — liveness covered by live-site-health`);
        continue;
      }
      const remainder = value.slice(RAW_PREFIX.length);
      const slash = remainder.indexOf('/');
      const ref = remainder.slice(0, slash);
      const path = remainder.slice(slash + 1);
      if (ref !== 'main') {
        errors.push(`${label}: ${key} pins ref "${ref}" — publish media from main so it stays reachable`);
      }
      const local = join(REPO_ROOT, path);
      if (!existsSync(local) || !statSync(local).isFile()) {
        errors.push(`${label}: ${key} points at ${path}, which does not exist in this repository`);
        continue;
      }
      mediaToVerify.add(local);
    }
  }
}

// Reuse the media integrity checker rather than duplicating its format rules,
// so "valid media" means exactly one thing across the repository.
if (mediaToVerify.size > 0) {
  try {
    execFileSync(process.execPath, [join(REPO_ROOT, 'tools', 'check-media-integrity.mjs'), ...mediaToVerify], {
      stdio: 'pipe',
    });
  } catch (error) {
    const output = `${error.stdout || ''}${error.stderr || ''}`.trim();
    errors.push(`referenced media failed integrity check:\n${output}`);
  }
}

console.log(`Validated ${itemCount} active item(s) across ${payloadCount} distribution payload(s).`);
console.log(`Repository-hosted media referenced: ${mediaToVerify.size} file(s).`);
for (const note of notes) console.log(`  note: ${note}`);
if (policyDrift.size > 0) {
  console.log(`\nProvider-policy drift (reported, not fatal): ${policyDrift.size}`);
  for (const item of policyDrift) console.log(`  ~ ${item}`);
  console.log('  Either connect and authorize the service in provider-policy.json, or retire the payload.');
}

if (errors.length > 0) {
  console.error(`\nDistribution payload check FAILED — ${errors.length} problem(s):`);
  for (const item of errors) console.error(`  - ${item}`);
  console.error('\nA payload that fails here will be accepted by Buffer and then fail silently at send time.');
  process.exit(1);
}
console.log('Distribution payload check OK — every active item is publishable.');
