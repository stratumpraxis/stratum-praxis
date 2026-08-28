import test from 'node:test';
import assert from 'node:assert/strict';

import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { routeDemand, ROUTE_FLOOR, scoreAssetForSignal, selectChannels } from '../lib/router.mjs';
import { readJson } from '../lib/util.mjs';

const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const context = { sourceRouting, providerPolicy };

const shadowAi = {
  signal_id: 'test-shadow-ai',
  problem_keys: ['shadow_ai', 'ai_saas_spend', 'cost_visibility'],
  target_audience: ['finance', 'ops_lead'],
  language: 'en'
};

test('a demand signal routes to the strongest existing asset', () => {
  const route = routeDemand(shadowAi, inventory, context);
  assert.equal(route.best_existing_asset, 'ai-saas-waste-calculator');
  assert.ok(route.confidence >= ROUTE_FLOOR);
  assert.ok(route.reason.includes('shadow_ai'));
});

test('the new-product gate stays closed whenever an existing asset fits', () => {
  const route = routeDemand(shadowAi, inventory, context);
  assert.equal(route.new_product_gate, 'BLOCKED_EXISTING_ASSET_SUFFICIENT');
});

test('the new-product gate only opens for review when nothing fits, and never instructs a build', () => {
  const alien = {
    signal_id: 'test-alien',
    problem_keys: ['deep_sea_welding_certification'],
    target_audience: ['welder'],
    language: 'fr'
  };
  const route = routeDemand(alien, inventory, context);
  assert.equal(route.best_existing_asset, null);
  assert.equal(route.new_product_gate, 'OPEN_FOR_REVIEW');
  assert.match(route.new_product_gate_note, /review trigger for a human, not an instruction to build/);
  assert.deepEqual(route.risk, ['NO_ROUTABLE_ASSET']);
});

test('a route ending at a paused checkout is flagged, not silently recommended', () => {
  const route = routeDemand({
    signal_id: 'test-return-gate',
    problem_keys: ['repeat_visits', 'retention_architecture'],
    target_audience: ['creator', 'site_owner'],
    language: 'en'
  }, inventory, context);
  assert.equal(route.best_existing_asset, 'return-gate-growth-os');
  assert.ok(route.risk.includes('CHECKOUT_PAUSED_NO_PURCHASE_POSSIBLE'));
  assert.equal(route.commercial_path.available, false);
});

test('an unverified DOC_ONLY asset never wins a route', () => {
  const route = routeDemand({
    signal_id: 'test-roi',
    problem_keys: ['roi_proof'],
    target_audience: ['founder'],
    language: 'en'
  }, inventory, context);
  assert.notEqual(route.best_existing_asset, 'roi-calculator-subdomain');
});

test('the secondary route complements the primary rather than repeating it', () => {
  const route = routeDemand(shadowAi, inventory, context);
  assert.ok(route.secondary_route);
  assert.notEqual(route.secondary_route.asset_id, route.best_existing_asset);
});

test('channel selection is asset-specific, not mass distribution', () => {
  const jaAsset = inventory.byId.get('ai-council-builder-ja');
  const enAsset = inventory.byId.get('ai-saas-spend-waste-audit');
  const ja = selectChannels(jaAsset, { ...context, limit: 5 });
  const en = selectChannels(enAsset, { ...context, limit: 5 });
  assert.ok(ja.all.some((c) => c.channel === 'note'), 'the Japanese asset keeps its Japanese channel');
  assert.ok(!en.all.some((c) => c.channel === 'note'), 'an English audit is not pushed to a Japanese channel');
  assert.ok(en.all.length < Object.keys(sourceRouting.sources).length, 'not every channel is used for every asset');
});

test('a channel with no enabled publisher is marked HUMAN_REQUIRED, never auto-published', () => {
  const asset = inventory.byId.get('ai-saas-spend-audit-checklist');
  const { all } = selectChannels(asset, { ...context, limit: 10 });
  const devto = all.find((c) => c.channel === 'devto');
  assert.equal(devto.automation, 'HUMAN_REQUIRED');
  assert.match(devto.human_required_reason, /publishingEnabled/);
});

test('an asset with an undefined channel is rejected rather than guessed', () => {
  const fake = { asset_id: 'fake', asset_type: 'GUIDE', distribution_candidates: ['myspace'] };
  const { rejected } = selectChannels(fake, context);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason, /not defined in distribution\/source-routing\.json/);
});

test('malformed router input is refused', () => {
  assert.throws(() => routeDemand(null, inventory, context), /signal must be an object/);
  assert.throws(() => routeDemand({}, inventory, context), /signal_id is required/);
  assert.throws(() => routeDemand(shadowAi, {}, context), /inventory\.assets must be an array/);
});

test('every scoring component is exposed for audit', () => {
  const { breakdown } = scoreAssetForSignal(shadowAi, inventory.byId.get('ai-saas-waste-calculator'));
  for (const key of ['problem_fit', 'audience_fit', 'language_fit', 'commercial_intent', 'friction', 'verified_destination', 'measurability']) {
    assert.ok(breakdown[key], `${key} must appear in the breakdown`);
    assert.equal(typeof breakdown[key].contribution, 'number');
  }
});
