#!/usr/bin/env node
// PHASE 2/3/4/5 - score a demand signal, route it to an existing asset, and emit
// a ready-to-review DRAFT queue item with attribution already attached.
//
// Usage:
//   node acquisition/cli/route.mjs --signal <signal_id> [--json] [--emit-draft]
//   node acquisition/cli/route.mjs --all

import { loadInventory } from '../lib/inventory.mjs';
import { buildTrackedUrl, knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { routeDemand } from '../lib/router.mjs';
import { describeClaim, scoreSignal } from '../lib/signal-score.mjs';
import { readJson, slug } from '../lib/util.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1] ?? true;
};
const has = (name) => argv.includes(name);

const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const signalFile = await readJson('acquisition/demand-signals.json');

const wanted = flag('--signal');
const signals = has('--all') || !wanted
  ? signalFile.signals
  : signalFile.signals.filter((s) => s.signal_id === wanted);

if (!signals.length) {
  console.error(`no signal matched "${wanted}". Known: ${signalFile.signals.map((s) => s.signal_id).join(', ')}`);
  process.exit(1);
}

const output = [];

for (const signal of signals) {
  const score = scoreSignal(signal.scores);
  const route = routeDemand(signal, inventory, { sourceRouting, providerPolicy });

  const draft = score.verdict === 'REJECT' || !route.best_existing_asset
    ? null
    : buildDraft(signal, route, score);

  output.push({
    signal_id: signal.signal_id,
    title: signal.title,
    score: {
      total: score.total,
      max: score.max,
      verdict: score.verdict,
      claim_strength: score.claim_strength,
      claim_note: describeClaim(score),
      blocks: score.blocks,
      observed_dimensions: score.dimensions_by_class.OBSERVED,
      assumption_dimensions: score.dimensions_by_class.ASSUMPTION,
      hypothesis_dimensions: score.dimensions_by_class.HYPOTHESIS
    },
    route,
    draft_queue_item: draft
  });
}

function buildDraft(signal, route, score) {
  const channel = route.channels.selected[0];
  if (!channel) return null;
  const campaign = slug(signal.signal_id.replace(/-\d{4}-\d{2}$/, ''), 60);
  const { url, params } = buildTrackedUrl({
    channel: channel.channel,
    assetId: route.best_existing_asset,
    campaign,
    contentAngle: signal.title,
    variant: 'v1',
    destinationUrl: route.destination_url,
    sourceRouting
  });
  return {
    queue_id: `${slug(route.best_existing_asset, 30).replace(/_/g, '-')}-${slug(channel.channel, 12)}-v1`.replace(/_/g, '-'),
    platform: channel.channel,
    asset_id: route.best_existing_asset,
    content_angle: `${signal.user_problem} ${route.primary_cta}.`,
    cta: route.primary_cta,
    destination_url: url,
    utm_parameters: params,
    safety_status: 'UNCHECKED',
    approval_status: 'PENDING_HUMAN',
    status: 'DRAFT',
    scheduled_at: null,
    published_at: null,
    external_post_id: null,
    verification_status: null,
    automation: channel.automation,
    human_required_reason: channel.human_required_reason,
    signal_ref: signal.signal_id,
    signal_claim_strength: score.claim_strength
  };
}

if (has('--json')) {
  console.log(JSON.stringify(output, null, 2));
} else {
  for (const entry of output) {
    console.log(`\n=== ${entry.signal_id} ===`);
    console.log(`title            : ${entry.title}`);
    console.log(`signal score     : ${entry.score.total}/${entry.score.max} -> ${entry.score.verdict}`);
    console.log(`claim strength   : ${entry.score.claim_strength} (${entry.score.claim_note})`);
    if (entry.score.hypothesis_dimensions.length) {
      console.log(`hypothesis only  : ${entry.score.hypothesis_dimensions.join(', ')} <- not evidence`);
    }
    for (const block of entry.score.blocks) console.log(`BLOCKED          : ${block}`);
    console.log(`best asset       : ${entry.route.best_existing_asset ?? 'NONE'}`);
    console.log(`reason           : ${entry.route.reason}`);
    console.log(`primary cta      : ${entry.route.primary_cta ?? 'n/a'}`);
    console.log(`destination      : ${entry.route.destination_url ?? 'n/a'}`);
    console.log(`secondary route  : ${entry.route.secondary_route ? `${entry.route.secondary_route.asset_id} (${entry.route.secondary_route.role})` : 'none'}`);
    console.log(`confidence       : ${entry.route.confidence}`);
    console.log(`risk             : ${entry.route.risk.join(', ')}`);
    console.log(`verification     : ${entry.route.verification_state}`);
    console.log(`new-product gate : ${entry.route.new_product_gate}`);
    console.log(`channels         : ${entry.route.channels.selected.map((c) => `${c.channel}[${c.automation}]`).join(', ') || 'none'}`);
    if (entry.draft_queue_item) {
      console.log(`draft queue item : ${entry.draft_queue_item.queue_id}`);
      console.log(`tracked url      : ${entry.draft_queue_item.destination_url}`);
    } else {
      console.log('draft queue item : none (signal rejected or no routable asset)');
    }
  }
}
