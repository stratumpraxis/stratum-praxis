// Where the Revenue Publisher actually sends a reader.
//
// This is the step nobody was testing. The publisher does not read
// asset-inventory.json at all - it picks a CTA purely from the source's own
// existing_product_routes, by numeric index, chosen by the model. So an asset can
// be perfectly registered in the inventory and still be unreachable from every
// published article, which is exactly the state the Systems Library was in before
// its routes were added.
//
// These assertions run against the REAL sources.json, not a fixture, because the
// question is not "can the function index an array" - it is "can the publisher, as
// shipped, reach the paid destination".

import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseCta, trackedUrl } from '../blogger/free-runner.mjs';
import { loadInventory } from '../lib/inventory.mjs';
import { loadSourceRouting, knownChannels } from '../lib/utm.mjs';
import { readJson } from '../lib/util.mjs';

const SOURCE_ID = 'repeat-visit-sites-win-owner-package';

async function sources() {
  return readJson('acquisition/media-engine/sources.json');
}

async function sourceById(id) {
  const doc = await sources();
  const found = doc.sources.find((s) => s.source_id === id);
  assert.ok(found, `source ${id} must exist`);
  return found;
}

const recommend = (index) => ({ cta_recommendation: { include: true, route_index: index } });

// ------------------------------------------------------------------ selectability

test('the publisher can select the Systems Library as a route', async () => {
  const source = await sourceById(SOURCE_ID);
  const routes = source.existing_product_routes ?? [];
  const index = routes.findIndex((r) => r.asset_id === 'systems-library');
  assert.ok(index >= 0, 'systems-library must be reachable from this source');

  const chosen = chooseCta(recommend(index), source);
  assert.ok(chosen, 'the publisher must resolve that index to a route');
  assert.equal(chosen.asset_id, 'systems-library');
  assert.equal(chosen.url, 'https://stratumpraxis.com/systems/');
});

test('the publisher can select the existing $17 paid bundle as a route', async () => {
  const source = await sourceById(SOURCE_ID);
  const routes = source.existing_product_routes ?? [];
  const index = routes.findIndex((r) => r.asset_id === 'ai-workflow-operator-bundle');
  assert.ok(index >= 0, 'the paid bundle must be reachable from this source');

  const chosen = chooseCta(recommend(index), source);
  assert.ok(chosen);
  assert.equal(chosen.asset_id, 'ai-workflow-operator-bundle');
  assert.equal(chosen.url, 'https://stratumpraxis.com/prompt-store/');
  assert.equal(chosen.role, 'PURCHASE_PATH', 'the paid route must be marked as the purchase path');
});

test('every route the publisher can pick resolves to a real inventory asset', async () => {
  // A route naming an asset the inventory does not know is a dead CTA: nothing
  // downstream can attribute it, and no one finds out until a reader clicks.
  const routing = await loadSourceRouting();
  const inventory = await loadInventory('acquisition/asset-inventory.json', {
    knownChannels: knownChannels(routing)
  });
  const doc = await sources();

  for (const source of doc.sources) {
    for (const [index, route] of (source.existing_product_routes ?? []).entries()) {
      const chosen = chooseCta(recommend(index), source);
      assert.ok(chosen, `${source.source_id}[${index}] must resolve`);
      assert.ok(
        inventory.byId.has(chosen.asset_id),
        `${source.source_id}[${index}] points at ${chosen.asset_id}, which is not in the inventory`
      );
    }
  }
});

// ------------------------------------------------------------------ tracked CTA

test('a selected route becomes a tracked CTA carrying its own attribution', async () => {
  const source = await sourceById(SOURCE_ID);
  const routes = source.existing_product_routes ?? [];
  const index = routes.findIndex((r) => r.asset_id === 'systems-library');

  const url = new URL(trackedUrl(chooseCta(recommend(index), source), source, 'structural_reflection'));
  assert.equal(url.origin + url.pathname, 'https://stratumpraxis.com/systems/');
  assert.equal(url.searchParams.get('utm_source'), 'owned_media');
  assert.equal(url.searchParams.get('utm_medium'), 'blog');
  assert.equal(url.searchParams.get('utm_campaign'), 'international_personal_media');
  assert.equal(url.searchParams.get('utm_content'), `${SOURCE_ID}:structural_reflection`);
});

test('the paid route keeps its destination when tracked', async () => {
  const source = await sourceById(SOURCE_ID);
  const routes = source.existing_product_routes ?? [];
  const index = routes.findIndex((r) => r.asset_id === 'ai-workflow-operator-bundle');

  const url = new URL(trackedUrl(chooseCta(recommend(index), source), source, 'practical_operator'));
  assert.equal(url.origin + url.pathname, 'https://stratumpraxis.com/prompt-store/',
    'tracking must not move the reader somewhere else');
  assert.equal(url.searchParams.get('utm_source'), 'owned_media');
});

// ------------------------------------------------------------------ no regression

test('the pre-existing shadow-ai routes still select exactly as before', async () => {
  const source = await sourceById('shadow-ai-spend-accountability-candidate');
  const routes = source.existing_product_routes ?? [];
  assert.equal(routes.length, 2, 'this source keeps its two original routes');

  assert.equal(chooseCta(recommend(0), source).asset_id, routes[0].asset_id);
  assert.equal(chooseCta(recommend(1), source).asset_id, routes[1].asset_id);
  assert.equal(chooseCta(recommend(0), source).role, 'PRIMARY');
});

// ------------------------------------------------------------------ failure modes

test('an article with no CTA recommendation gets no CTA, silently and on purpose', async () => {
  const source = await sourceById(SOURCE_ID);
  assert.equal(chooseCta({ cta_recommendation: { include: false, route_index: 0 } }, source), null);
  assert.equal(chooseCta({}, source), null);
});

test('an out-of-range index yields no CTA rather than a wrong destination', async () => {
  // This is the real failure mode behind an article that went out with no revenue
  // destination: the index comes from a model, and nothing upstream constrains it to
  // the number of routes that actually exist. Returning null is the safe outcome -
  // pointing a reader at an arbitrary route would be worse - but it means a missing
  // CTA is indistinguishable from a deliberate one, so it is pinned here.
  const source = await sourceById(SOURCE_ID);
  const count = (source.existing_product_routes ?? []).length;
  assert.equal(chooseCta(recommend(count), source), null);
  assert.equal(chooseCta(recommend(-1), source), null);
  assert.equal(chooseCta(recommend('two'), source), null);
});

test('a route with no url produces no tracked CTA', async () => {
  const source = await sourceById(SOURCE_ID);
  assert.equal(trackedUrl({ asset_id: 'x' }, source, 'lens'), null);
  assert.equal(trackedUrl(null, source, 'lens'), null);
});
