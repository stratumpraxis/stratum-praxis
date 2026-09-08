import test from 'node:test';
import assert from 'node:assert/strict';

import { SUPPORTED_SOURCES, sourceConfig, sourceTrigger } from '../lib/source-adapter.mjs';

test('MARKET runtime exposes every wired source as a real adapter', () => {
  assert.deepEqual(SUPPORTED_SOURCES, ['github', 'posthog', 'stripe', 'dispatch']);
  for (const source of SUPPORTED_SOURCES) {
    const config = sourceConfig(source);
    assert.equal(config.source, source);
    assert.equal(typeof config.adapter.ingest, 'function');
  }
});

test('only github requires repository coordinates', () => {
  assert.equal(sourceConfig('github').requiresRepository, true);
  assert.equal(sourceConfig('posthog').requiresRepository, false);
  assert.equal(sourceConfig('stripe').requiresRepository, false);
  assert.equal(sourceConfig('dispatch').requiresRepository, false);
});

test('dispatch is the one source that needs a payload rather than a feed to read', () => {
  // The other three are reads - this system decides when to look. A dispatch is the
  // external world deciding, and it arrives carrying its own events.
  assert.equal(sourceConfig('dispatch').requiresPayload, true);
  for (const source of ['github', 'posthog', 'stripe']) {
    assert.notEqual(sourceConfig(source).requiresPayload, true, `${source} reads a feed, it is not handed one`);
  }
});

test('unknown source fails closed instead of silently falling back to github', () => {
  assert.throws(() => sourceConfig('unknown'), /supported sources: github, posthog, stripe, dispatch/);
});

test('trace trigger names preserve the external source', () => {
  assert.equal(sourceTrigger('github', { owner: 'stratumpraxis', repo: 'stratum-praxis' }), 'github:stratumpraxis/stratum-praxis');
  assert.equal(sourceTrigger('posthog'), 'posthog:external');
  assert.equal(sourceTrigger('stripe'), 'stripe:external');
  // A dispatch names the delivery, so a trace ties back to the workflow run and
  // through it to the Make execution that fired it.
  assert.equal(sourceTrigger('dispatch', { dispatchId: '1234' }), 'dispatch:1234');
  assert.equal(sourceTrigger('dispatch'), 'dispatch:market_signal');
});
