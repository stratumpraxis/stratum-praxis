import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CADENCE, checkExternalLaneCollisions, evaluateItem, evaluateQueue, publisherFor } from '../lib/safety.mjs';
import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { loadQueue } from '../lib/queue.mjs';
import { readJson } from '../lib/util.mjs';

const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const context = { inventory, providerPolicy, sourceRouting };
const unsafe = await readJson('acquisition/test/fixtures/unsafe-queue.json');
const byId = Object.fromEntries(unsafe.items.map((i) => [i.queue_id, i]));

function verdictFor(id) {
  return evaluateItem(byId[id], { ...context, siblings: unsafe.items });
}

test('misleading earnings claims are blocked', () => {
  const verdict = verdictFor('earnings-claim');
  assert.equal(verdict.ok, false);
  assert.ok(verdict.blocks.some((b) => b.includes('blocked claim pattern')));
});

test('an unverified destination is blocked', () => {
  const verdict = verdictFor('unverified-destination');
  assert.equal(verdict.ok, false);
  assert.ok(verdict.blocks.some((b) => b.includes('not a verified live destination')));
});

test('an untracked destination is blocked so nothing publishes unattributed', () => {
  const verdict = verdictFor('no-attribution');
  assert.equal(verdict.ok, false);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'asset_id']) {
    assert.ok(verdict.blocks.some((b) => b.includes(key)), `expected a block naming ${key}`);
  }
});

test('infinite retries are blocked at the ceiling', () => {
  const verdict = verdictFor('retry-storm');
  assert.equal(verdict.ok, false);
  assert.ok(verdict.blocks.some((b) => b.includes(`exceeds the retry ceiling of ${DEFAULT_CADENCE.maxAttemptsPerQueueItem}`)));
});

test('an asset is not pushed to a channel it was never approved for', () => {
  const verdict = verdictFor('wrong-platform-for-asset');
  assert.equal(verdict.ok, false);
  assert.ok(verdict.blocks.some((b) => b.includes('not an approved distribution candidate')));
});

test('a destination that disagrees with the declared asset is blocked', () => {
  const verdict = verdictFor('destination-asset-mismatch');
  assert.equal(verdict.ok, false);
  assert.ok(verdict.blocks.some((b) => b.includes('does not point at the declared asset')));
});

test('the whole unsafe fixture fails - not one item slips through', () => {
  const audit = evaluateQueue(unsafe, context);
  assert.equal(audit.ok, false);
  for (const result of audit.results) {
    assert.equal(result.ok, false, `${result.queue_id} should have been blocked`);
  }
});

test('duplicate campaign lanes are blocked', () => {
  const base = {
    queue_id: 'dup-a',
    platform: 'tiktok',
    asset_id: 'ai-saas-waste-calculator',
    content_angle: 'A perfectly reasonable piece of copy about making reducible AI and SaaS spend visible before renewal.',
    cta: 'Run the estimate',
    destination_url: 'https://stratumpraxis.com/ai-saas-waste-calculator.html?utm_source=tiktok&utm_medium=social_video&utm_campaign=dup&utm_content=a&asset_id=ai-saas-waste-calculator',
    utm_parameters: { utm_source: 'tiktok', utm_medium: 'social_video', utm_campaign: 'dup', utm_content: 'a', asset_id: 'ai-saas-waste-calculator' },
    safety_status: 'UNCHECKED',
    approval_status: 'PENDING_HUMAN',
    status: 'DRAFT',
    scheduled_at: '2026-09-01T09:00:00.000Z'
  };
  const twin = { ...base, queue_id: 'dup-b', status: 'SCHEDULED', scheduled_at: '2026-09-05T09:00:00.000Z' };
  const verdict = evaluateItem(base, { ...context, siblings: [base, twin] });
  assert.ok(verdict.blocks.some((b) => b.includes('duplicate campaign lane')));
  assert.ok(verdict.blocks.some((b) => b.includes('identical copy')));
});

test('short-interval posting on the same platform is blocked', () => {
  const first = {
    queue_id: 'cadence-a',
    platform: 'tiktok',
    asset_id: 'ai-saas-waste-calculator',
    content_angle: 'One angle on making reducible AI and SaaS spend visible before the next renewal decision.',
    cta: 'Run the estimate',
    destination_url: 'https://stratumpraxis.com/ai-saas-waste-calculator.html?utm_source=tiktok&utm_medium=social_video&utm_campaign=c1&utm_content=a&asset_id=ai-saas-waste-calculator',
    utm_parameters: { utm_source: 'tiktok', utm_medium: 'social_video', utm_campaign: 'c1', utm_content: 'a', asset_id: 'ai-saas-waste-calculator' },
    safety_status: 'UNCHECKED', approval_status: 'PENDING_HUMAN', status: 'DRAFT',
    scheduled_at: '2026-09-01T09:00:00.000Z'
  };
  const second = {
    ...first,
    queue_id: 'cadence-b',
    status: 'SCHEDULED',
    content_angle: 'A different angle entirely, about the overlap between tools nobody has audited in two quarters.',
    destination_url: first.destination_url.replace('utm_campaign=c1&utm_content=a', 'utm_campaign=c2&utm_content=b'),
    utm_parameters: { ...first.utm_parameters, utm_campaign: 'c2', utm_content: 'b' },
    scheduled_at: '2026-09-01T09:30:00.000Z'
  };
  const verdict = evaluateItem(first, { ...context, siblings: [first, second] });
  assert.ok(verdict.blocks.some((b) => b.includes(`within ${DEFAULT_CADENCE.minMinutesBetweenPostsPerPlatform} minutes`)));
});

test('bulk posting on one platform in one day is blocked', () => {
  const make = (n, hour) => ({
    queue_id: `bulk-${n}`,
    platform: 'instagram',
    asset_id: 'ai-saas-waste-calculator',
    content_angle: `Distinct angle number ${n} on reducible AI and SaaS spend before the next renewal decision arrives.`,
    cta: 'Run the estimate',
    destination_url: `https://stratumpraxis.com/ai-saas-waste-calculator.html?utm_source=instagram&utm_medium=social&utm_campaign=bulk${n}&utm_content=c${n}&asset_id=ai-saas-waste-calculator`,
    utm_parameters: { utm_source: 'instagram', utm_medium: 'social', utm_campaign: `bulk${n}`, utm_content: `c${n}`, asset_id: 'ai-saas-waste-calculator' },
    safety_status: 'UNCHECKED', approval_status: 'PENDING_HUMAN', status: 'SCHEDULED',
    scheduled_at: `2026-09-01T0${hour}:00:00.000Z`
  });
  const items = [make(1, 1), make(2, 5), make(3, 9)];
  const verdict = evaluateItem(items[0], { ...context, siblings: items });
  assert.ok(verdict.blocks.some((b) => b.includes(`exceeds the cadence limit of ${DEFAULT_CADENCE.maxActivePerPlatformPerDay}`)));
});

test('platform publishing rights come from the existing provider policy', () => {
  assert.equal(publisherFor('instagram', providerPolicy).publisher, 'buffer');
  assert.equal(publisherFor('tiktok', providerPolicy).publisher, 'buffer');
  assert.equal(publisherFor('pinterest', providerPolicy).publisher, null);
  assert.equal(publisherFor('bluesky', providerPolicy).publisher, null);
});

test('a platform without a publisher is HUMAN_REQUIRED, never auto-published', () => {
  const item = {
    queue_id: 'manual-lane',
    platform: 'devto',
    asset_id: 'ai-saas-spend-audit-checklist',
    content_angle: 'A canonical technical write-up of the spend audit procedure for an English developer audience.',
    cta: 'Start the spend audit',
    destination_url: 'https://stratumpraxis.com/ai-saas-spend-audit-checklist.html?utm_source=devto&utm_medium=community_content&utm_campaign=audit&utm_content=a&asset_id=ai-saas-spend-audit-checklist',
    utm_parameters: { utm_source: 'devto', utm_medium: 'community_content', utm_campaign: 'audit', utm_content: 'a', asset_id: 'ai-saas-spend-audit-checklist' },
    safety_status: 'UNCHECKED', approval_status: 'PENDING_HUMAN', status: 'DRAFT'
  };
  const verdict = evaluateItem(item, { ...context, siblings: [item] });
  assert.equal(verdict.ok, true, 'a manual lane is safe, it just is not automatic');
  assert.equal(verdict.human_required.length, 1);
  assert.match(verdict.human_required[0].manual_step, /by hand/);
});

test('a paused-checkout destination produces a warning, not a silent pass', () => {
  const item = {
    queue_id: 'paused-dest',
    platform: 'instagram',
    asset_id: 'return-gate-growth-os',
    content_angle: 'A piece about designing genuine reasons for a visitor to come back to a site they have already seen.',
    cta: 'See the live concept',
    destination_url: 'https://stratumpraxis.com/return-gate-growth-os.html?utm_source=instagram&utm_medium=social&utm_campaign=rg&utm_content=a&asset_id=return-gate-growth-os',
    utm_parameters: { utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'rg', utm_content: 'a', asset_id: 'return-gate-growth-os' },
    safety_status: 'UNCHECKED', approval_status: 'PENDING_HUMAN', status: 'DRAFT'
  };
  const verdict = evaluateItem(item, { ...context, siblings: [item] });
  assert.ok(verdict.warnings.some((w) => w.includes('paused checkout')));
});

test('cross-lane collisions are detected deterministically', async () => {
  const queue = await loadQueue();
  const item = queue.items.find((candidate) => candidate.queue_id === 'ai-saas-waste-calculator-instagram-v1');
  assert.ok(item, 'expected the seeded acquisition queue item');
  const inFlight = [{
    lane: 'fixture/external-lane',
    platform: item.platform,
    destination_url: item.destination_url,
    campaign: item.utm_parameters.utm_campaign,
    state: 'SCHEDULED'
  }];

  const collisions = checkExternalLaneCollisions(queue.items, inFlight);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].queue_id, item.queue_id);
  assert.equal(collisions[0].lane, 'fixture/external-lane');
  assert.match(collisions[0].reason, /do not queue another payload/);
});

test('a lane entry that already failed does not block new work', () => {
  const item = {
    queue_id: 'after-failure',
    platform: 'instagram',
    asset_id: 'ai-saas-waste-calculator',
    destination_url: 'https://stratumpraxis.com/ai-saas-waste-calculator.html?utm_campaign=x',
    utm_parameters: { utm_campaign: 'x' },
    status: 'DRAFT'
  };
  const collisions = checkExternalLaneCollisions([item], [{
    lane: 'distribution/launch-now.json',
    platform: 'instagram',
    destination_url: 'https://stratumpraxis.com/ai-saas-waste-calculator.html',
    campaign: 'x',
    state: 'ERROR'
  }]);
  assert.equal(collisions.length, 0);
});

test('malformed safety input does not throw', () => {
  const verdict = evaluateItem(null, context);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.blocks.length > 0);
});
