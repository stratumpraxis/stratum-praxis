#!/usr/bin/env node
// Generate the attribution fields for a FUTURE trend-video manifest.
//
// Source and medium are never hardcoded here: they come from
// distribution/source-routing.json via acquisition/lib/utm.mjs, the same deterministic
// logic the rest of the engine uses.
//
// This CLI prints a manifest `publish` fragment. It writes nothing and publishes nothing.
//
// Usage:
//   node acquisition/cli/plan-video-attribution.mjs --asset <asset_id> --platform <channel> --campaign <token> [--content <angle>] [--json]
//   node acquisition/cli/plan-video-attribution.mjs --validate trend-video-engine/current.json

import { loadInventory, isRoutableDestination, hasLiveCheckout } from '../lib/inventory.mjs';
import { buildTrackedUrl, knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { validateManifestAttribution } from '../lib/attribution.mjs';
import { readJson } from '../lib/util.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1] ?? null;
};
const asJson = argv.includes('--json');

const sourceRouting = await loadSourceRouting();
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });

const validateFile = flag('--validate');
if (validateFile) {
  const manifest = await readJson(validateFile);
  const problems = validateManifestAttribution(manifest, { inventory });
  if (asJson) {
    console.log(JSON.stringify({ manifest: validateFile, id: manifest.id, problems, ok: problems.length === 0 }, null, 2));
  } else {
    console.log(`Manifest attribution validation: ${validateFile}`);
    console.log(`  id: ${manifest.id}`);
    if (!problems.length) console.log('  OK - no attribution problems');
    for (const p of problems) console.log(`  PROBLEM  ${p}`);
  }
  process.exit(problems.length ? 1 : 0);
}

const assetId = flag('--asset');
const platform = flag('--platform');
const campaign = flag('--campaign');
const content = flag('--content');

if (!assetId || !platform || !campaign) {
  console.error('Usage: node acquisition/cli/plan-video-attribution.mjs --asset <asset_id> --platform <channel> --campaign <token> [--content <angle>]');
  console.error('   or: node acquisition/cli/plan-video-attribution.mjs --validate <manifest.json>');
  console.error(`\nKnown channels: ${[...knownChannels(sourceRouting)].join(', ')}`);
  process.exit(2);
}

const asset = inventory.byId.get(assetId);
if (!asset) {
  console.error(`unknown asset "${assetId}". Known: ${[...inventory.byId.keys()].join(', ')}`);
  process.exit(1);
}
if (!isRoutableDestination(asset)) {
  console.error(`asset ${assetId} is not a verified live destination (status ${asset.status}, verification ${asset.verification_state}); refusing to plan a tracked post to it`);
  process.exit(1);
}
if (Array.isArray(asset.distribution_candidates) && asset.distribution_candidates.length
  && !asset.distribution_candidates.includes(platform)) {
  console.error(`${platform} is not an approved distribution candidate for ${assetId} (allowed: ${asset.distribution_candidates.join(', ') || 'none'})`);
  process.exit(1);
}

const { url, params } = buildTrackedUrl({
  channel: platform,
  assetId,
  campaign,
  contentAngle: content || campaign,
  destinationUrl: asset.public_url,
  sourceRouting
});

const fragment = {
  destination_url: url,
  destination_asset_id: assetId,
  campaign_id: params.utm_campaign
};

if (asJson) {
  console.log(JSON.stringify({ fragment, params, asset: { asset_id: asset.asset_id, has_live_checkout: hasLiveCheckout(asset) } }, null, 2));
} else {
  console.log(`Tracked destination for ${assetId} on ${platform}\n`);
  console.log(`  utm_source  ${params.utm_source}   (from distribution/source-routing.json)`);
  console.log(`  utm_medium  ${params.utm_medium}   (from distribution/source-routing.json)`);
  console.log(`  utm_campaign ${params.utm_campaign}`);
  console.log(`  utm_content  ${params.utm_content}`);
  console.log(`  live checkout at destination: ${hasLiveCheckout(asset) ? 'yes' : 'no'}\n`);
  console.log('  Add to the manifest\'s publish block, and include destination_url verbatim in the caption:\n');
  console.log(JSON.stringify(fragment, null, 2).split('\n').map((l) => `    ${l}`).join('\n'));
}
