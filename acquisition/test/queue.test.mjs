import test from 'node:test';
import assert from 'node:assert/strict';

import { QUEUE_STATES } from '../lib/taxonomy.mjs';
import { canTransition, loadQueue, runSafetyGate, saveQueue, transition, validateItem, validateQueue } from '../lib/queue.mjs';
import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { readJson } from '../lib/util.mjs';

const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const context = { inventory, providerPolicy, sourceRouting };

test('the production queue is structurally valid', async () => {
  const queue = await loadQueue();
  assert.ok(queue.items.length > 0);
});

test('the state contract allows only the declared transitions', () => {
  assert.equal(canTransition('DRAFT', 'SAFETY_CHECK'), true);
  assert.equal(canTransition('SAFETY_CHECK', 'READY'), true);
  assert.equal(canTransition('READY', 'SCHEDULED'), true);
  assert.equal(canTransition('SCHEDULED', 'PUBLISHED'), true);
  assert.equal(canTransition('PUBLISHED', 'VERIFIED'), true);

  assert.equal(canTransition('DRAFT', 'PUBLISHED'), false, 'a draft can never jump straight to published');
  assert.equal(canTransition('DRAFT', 'VERIFIED'), false);
  assert.equal(canTransition('READY', 'PUBLISHED'), false, 'skipping SCHEDULED hides who approved the send');
  assert.equal(canTransition('SCHEDULED', 'VERIFIED'), false, 'a scheduled item was never observed live');
  assert.equal(canTransition('STOPPED', 'READY'), false, 'STOPPED is terminal');
  assert.equal(canTransition('PUBLISHED', 'DRAFT'), false);
  assert.equal(canTransition('DRAFT', 'PURCHASED'), false, 'PURCHASED is not a queue state at all');
});

test('every declared state has a transition rule', () => {
  for (const state of QUEUE_STATES) {
    assert.ok(canTransition(state, 'STOPPED') || state === 'STOPPED' || state === 'PUBLISHED' || state === 'VERIFIED',
      `${state} needs a defined escape hatch`);
  }
});

test('an illegal transition throws rather than being coerced', async () => {
  const queue = await loadQueue();
  const item = queue.items[0];
  assert.throws(() => transition(item, 'PUBLISHED'), /illegal transition DRAFT -> PUBLISHED/);
});

test('a request is never PUBLISHED and a publish is never VERIFIED', async () => {
  const bad = await readJson('acquisition/test/fixtures/invalid-queue.json');
  const errors = validateQueue(bad).join('\n');
  assert.match(errors, /PUBLISHED requires external_post_id; a sent request is not a publication/);
  assert.match(errors, /VERIFIED requires a verification_status object/);
  assert.match(errors, /status SCHEDULED requires approval_status HUMAN_APPROVED/);
  assert.match(errors, /SCHEDULED requires scheduled_at/);
  assert.match(errors, /unknown status PURCHASED/);
});

test('malformed queue input is reported, not thrown', () => {
  assert.deepEqual(validateQueue(null), ['queue must be an object with an items array']);
  assert.deepEqual(validateQueue({ items: 'nope' }), ['queue must be an object with an items array']);
  assert.ok(validateItem(null).length > 0);
  assert.ok(validateItem({ queue_id: 'Bad_ID' }).some((e) => e.includes('kebab-case')));
});

test('duplicate queue ids are caught', () => {
  const item = { queue_id: 'a', platform: 'tiktok', asset_id: 'x', content_angle: 'y', cta: 'z', destination_url: 'https://stratumpraxis.com/a', utm_parameters: {}, safety_status: 'UNCHECKED', approval_status: 'PENDING_HUMAN', status: 'DRAFT' };
  assert.ok(validateQueue({ items: [item, { ...item }] }).some((e) => e.includes('duplicate queue_id')));
});

test('the safety gate advances a clean draft to READY but leaves approval with a human', async () => {
  const queue = await loadQueue();
  const clean = queue.items.find((i) => i.queue_id === 'ai-agent-cost-roi-calculator-youtube-v1');
  const { item, verdict } = runSafetyGate(clean, { ...context, siblings: queue.items });
  assert.equal(verdict.ok, true);
  assert.equal(item.status, 'READY');
  assert.equal(item.safety_status, 'PASSED');
  assert.equal(item.approval_status, 'PENDING_HUMAN', 'the gate must never grant its own approval');
  assert.equal(item.history.at(-1).to, 'READY');
});

test('the safety gate routes a blocked draft to ERROR with the reason recorded', async () => {
  const unsafe = await readJson('acquisition/test/fixtures/unsafe-queue.json');
  const claim = unsafe.items.find((i) => i.queue_id === 'earnings-claim');
  const { item, verdict } = runSafetyGate(claim, { ...context, siblings: unsafe.items });
  assert.equal(verdict.ok, false);
  assert.equal(item.status, 'ERROR');
  assert.equal(item.safety_status, 'BLOCKED');
  assert.match(item.error, /blocked claim pattern/);
});

test('a transition that would produce an invalid item is refused', async () => {
  const queue = await loadQueue();
  const ready = runSafetyGate(queue.items[1], { ...context, siblings: queue.items }).item;
  // READY -> SCHEDULED is legal, but only with approval and a time.
  assert.throws(() => transition(ready, 'SCHEDULED', { reason: 'forced' }), /would produce an invalid item/);
  const approved = { ...ready, approval_status: 'HUMAN_APPROVED' };
  const scheduled = transition(approved, 'SCHEDULED', { reason: 'approved by owner', patch: { scheduled_at: '2026-09-10T09:00:00.000Z' } });
  assert.equal(scheduled.status, 'SCHEDULED');
});

test('saveQueue refuses to persist an invalid queue', async () => {
  await assert.rejects(
    () => saveQueue({ items: [{ queue_id: 'broken' }] }, 'acquisition/test/fixtures/should-never-be-written.json'),
    /refusing to save an invalid queue/
  );
});

test('history is appended, never replaced', async () => {
  const queue = await loadQueue();
  const first = transition(queue.items[1], 'SAFETY_CHECK', { reason: 'one' });
  const second = transition(first, 'READY', { reason: 'two', patch: { safety_status: 'PASSED' } });
  assert.equal(second.history.length, 2);
  assert.equal(second.history[0].reason, 'one');
  assert.equal(second.history[1].reason, 'two');
});
