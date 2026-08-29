#!/usr/bin/env node
// Two commands, both designed for CI.
//
//   node src/cli.mjs build  --routing r.json --channel x --asset a --campaign c --destination https://...
//   node src/cli.mjs verify --routing r.json --links links.json
//
// `verify` reads an array of URLs (or objects with a `url` field) and fails the run if
// any of them would arrive unattributed.

import fs from 'node:fs/promises';
import { loadRouting } from './routing.mjs';
import { buildTrackedUrl, verifyAttribution } from './attribution.mjs';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const command = process.argv[2];
const routingFile = arg('routing');

if (!command || !['build', 'verify'].includes(command) || !routingFile) {
  console.error('usage:');
  console.error('  node src/cli.mjs build  --routing <routing.json> --channel <c> --asset <id> --campaign <name> --destination <https url> [--angle <a>] [--variant <v>]');
  console.error('  node src/cli.mjs verify --routing <routing.json> --links <links.json>');
  process.exit(2);
}

let routing;
try {
  routing = await loadRouting(routingFile);
} catch (error) {
  console.error(`routing table rejected: ${error.message}`);
  for (const problem of error.errors || []) console.error(`  - ${problem}`);
  process.exit(2);
}

if (command === 'build') {
  try {
    const { url, params } = buildTrackedUrl({
      routing,
      channel: arg('channel'),
      assetId: arg('asset'),
      campaign: arg('campaign'),
      contentAngle: arg('angle'),
      variant: arg('variant'),
      destinationUrl: arg('destination')
    });
    console.log(url);
    console.error(JSON.stringify(params, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

const linksFile = arg('links');
if (!linksFile) {
  console.error('verify requires --links <links.json>');
  process.exit(2);
}

const entries = JSON.parse(await fs.readFile(linksFile, 'utf8'));
let failed = 0;

for (const entry of entries) {
  const url = typeof entry === 'string' ? entry : entry.url;
  const label = typeof entry === 'string' ? url : (entry.id || url);
  const result = verifyAttribution(url, { routing });
  if (result.ok) {
    const provider = result.checkout_provider ? ` checkout:${result.checkout_provider}` : '';
    console.log(`PASS  ${label}${provider}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}`);
    for (const problem of result.problems) console.error(`        ${problem}`);
  }
}

console.log(`\n${entries.length - failed}/${entries.length} link(s) attributable.`);
process.exit(failed ? 1 : 0);
