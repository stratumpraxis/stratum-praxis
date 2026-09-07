import test from 'node:test';
import assert from 'node:assert/strict';

import { SUPPORTED_SOURCES, sourceConfig, sourceTrigger } from '../lib/source-adapter.mjs';

test('MARKET runtime exposes github, posthog and stripe as real source adapters', () => {
  assert.deepEqual(SUPPORTED_SOURCES, ['github', 'posthog', 'stripe']);
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
});

test('unknown source fails closed instead of silently falling back to github', () => {
  assert.throws(() => sourceConfig('unknown'), /supported sources: github, posthog, stripe/);
});

test('trace trigger names preserve the external source', () => {
  assert.equal(sourceTrigger('github', { owner: 'stratumpraxis', repo: 'stratum-praxis' }), 'github:stratumpraxis/stratum-praxis');
  assert.equal(sourceTrigger('posthog'), 'posthog:external');
  assert.equal(sourceTrigger('stripe'), 'stripe:external');
});
