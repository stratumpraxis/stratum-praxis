import test from 'node:test';
import assert from 'node:assert/strict';

import { hasLiveCheckout, isRoutableDestination, isUnknown, loadInventory, validateInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { readJson } from '../lib/util.mjs';

const sourceRouting = await loadSourceRouting();
const options = { knownChannels: knownChannels(sourceRouting) };

test('the production inventory loads and validates', async () => {
  const inventory = await loadInventory('acquisition/asset-inventory.json', options);
  assert.ok(inventory.assets.length > 0);
  assert.equal(inventory.byId.size, inventory.assets.length, 'asset ids must be unique');
});

test('every declared repo_file actually exists and every public_url is https on an approved host', async () => {
  const inventory = await loadInventory('acquisition/asset-inventory.json', options);
  for (const asset of inventory.assets) {
    if (isUnknown(asset.public_url)) continue;
    const url = new URL(asset.public_url);
    assert.equal(url.protocol, 'https:', `${asset.asset_id} must use https`);
    assert.ok(url.hostname.endsWith('stratumpraxis.com'), `${asset.asset_id} must stay on an approved domain`);
  }
});

test('deliberately invalid inventory is rejected, one error per defect', async () => {
  const bad = await readJson('acquisition/test/fixtures/invalid-inventory.json');
  const errors = validateInventory(bad, options);
  const joined = errors.join('\n');

  assert.ok(errors.length >= 8, `expected many errors, got ${errors.length}`);
  assert.match(joined, /asset_id must be a lowercase kebab-case string/);
  assert.match(joined, /public_url must use https/);
  assert.match(joined, /is not an approved domain/);
  assert.match(joined, /totally_made_up_event is not part of the deployed analytics taxonomy/);
  assert.match(joined, /status LIVE requires a known public_url/);
  assert.match(joined, /revenue_destination\.type STRIPE requires a known url/);
  assert.match(joined, /missing required field/);
  assert.match(joined, /duplicate asset_id/);
});

test('malformed input does not throw, it reports', () => {
  assert.deepEqual(validateInventory(null), ['inventory must be an object with an assets array']);
  assert.deepEqual(validateInventory({ assets: 'nope' }), ['inventory must be an object with an assets array']);
  assert.ok(validateInventory({ assets: [null] }).length > 0);
  assert.ok(validateInventory({ assets: [42] }).length > 0);
});

test('UNKNOWN and VERIFY are never treated as usable URLs', () => {
  assert.equal(isUnknown('UNKNOWN'), true);
  assert.equal(isUnknown('VERIFY'), true);
  assert.equal(isUnknown(''), true);
  assert.equal(isUnknown(null), true);
  assert.equal(isUnknown('https://stratumpraxis.com/x.html'), false);
});

test('a DOC_ONLY asset is never a routable destination', async () => {
  const inventory = await loadInventory('acquisition/asset-inventory.json', options);
  const docOnly = inventory.byId.get('roi-calculator-subdomain');
  assert.equal(docOnly.verification_state, 'DOC_ONLY');
  assert.equal(isRoutableDestination(docOnly), false);
});

test('a paused checkout is not a live commercial path', async () => {
  const inventory = await loadInventory('acquisition/asset-inventory.json', options);
  const paused = inventory.byId.get('return-gate-growth-os');
  assert.equal(paused.status, 'PAUSED_CHECKOUT');
  assert.equal(hasLiveCheckout(paused), false, 'a page with no payment link must never count as a purchase path');
  assert.equal(isRoutableDestination(paused), true, 'the page itself is still reachable content');
});

test('every asset claiming a checkout type carries a real checkout URL', async () => {
  const inventory = await loadInventory('acquisition/asset-inventory.json', options);
  for (const asset of inventory.assets) {
    if (!['STRIPE', 'PAYHIP', 'GUMROAD'].includes(asset.revenue_destination.type)) continue;
    assert.equal(isUnknown(asset.revenue_destination.url), false, `${asset.asset_id} claims ${asset.revenue_destination.type} without a URL`);
    assert.equal(hasLiveCheckout(asset), true);
  }
});
