import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ANALYTICS_EVENTS } from '../lib/taxonomy.mjs';
import { REPO_ROOT, readJson } from '../lib/util.mjs';

/**
 * The engine's analytics vocabulary must track the deployed pages, not the other
 * way round. When main ships a page emitting a new event, this test fails until
 * lib/taxonomy.mjs is updated - which is how the Async AI Advisor's advisor_intake
 * and advisor_checkout events were caught during integration.
 */
const EMIT_PATTERNS = [
  /scosCapture\(\s*'([a-z][a-z0-9_]*)'/g,
  /\bcapture\(\s*'([a-z][a-z0-9_]*)'/g
];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'media', 'delivery', 'downloads', 'acquisition']);

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(html|js|mjs)$/.test(entry.name)) yield full;
  }
}

test('every analytics event emitted by a deployed page is in the engine taxonomy', async () => {
  const emitted = new Map();
  for await (const file of walk(REPO_ROOT)) {
    const raw = await fs.readFile(file, 'utf8');
    for (const pattern of EMIT_PATTERNS) {
      for (const match of raw.matchAll(pattern)) {
        const rel = path.relative(REPO_ROOT, file);
        if (!emitted.has(match[1])) emitted.set(match[1], rel);
      }
    }
  }

  assert.ok(emitted.size > 10, 'the scan found suspiciously few events; the walker may be broken');

  const missing = [...emitted.entries()].filter(([event]) => !ANALYTICS_EVENTS.includes(event));
  assert.deepEqual(
    missing.map(([event, file]) => `${event} (emitted by ${file})`),
    [],
    'a deployed page emits an event the engine taxonomy does not know about; add it to lib/taxonomy.mjs'
  );
});

test('the new Async AI Advisor events from main are covered', () => {
  assert.ok(ANALYTICS_EVENTS.includes('advisor_intake'));
  assert.ok(ANALYTICS_EVENTS.includes('advisor_checkout'));
});

test('every event an inventory asset declares is a real deployed event', async () => {
  const inventory = await readJson('acquisition/asset-inventory.json');
  for (const asset of inventory.assets) {
    for (const event of asset.analytics_events || []) {
      assert.ok(ANALYTICS_EVENTS.includes(event), `${asset.asset_id} declares unknown event ${event}`);
    }
  }
});

test('the taxonomy stays sorted and free of duplicates', () => {
  assert.deepEqual([...ANALYTICS_EVENTS], [...ANALYTICS_EVENTS].sort(), 'keep ANALYTICS_EVENTS sorted');
  assert.equal(new Set(ANALYTICS_EVENTS).size, ANALYTICS_EVENTS.length);
});
