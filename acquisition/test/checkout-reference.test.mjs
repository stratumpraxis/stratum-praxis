import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCheckoutReference } from '../lib/checkout-reference.mjs';

test('compound reference restores anonymous buyer and stable route', () => {
  const parsed = parseCheckoutReference('spb_123e4567-e89b-12d3-a456-426614174000__spr_workflow_audit');
  assert.deepEqual(parsed, {
    valid: true,
    version: 1,
    reference: 'spb_123e4567-e89b-12d3-a456-426614174000__spr_workflow_audit',
    buyer_key: 'posthog:123e4567-e89b-12d3-a456-426614174000',
    route_id: 'workflow_audit'
  });
});

test('legacy route-only references remain backwards compatible', () => {
  const parsed = parseCheckoutReference('vpj_hub_cross_agent_v1');
  assert.equal(parsed.valid, true);
  assert.equal(parsed.version, 0);
  assert.equal(parsed.buyer_key, null);
  assert.equal(parsed.route_id, 'vpj_hub_cross_agent_v1');
});

test('malformed, sensitive-shaped and oversized references fail closed', () => {
  assert.equal(parseCheckoutReference('person@example.com').valid, false);
  assert.equal(parseCheckoutReference('contains spaces').valid, false);
  assert.equal(parseCheckoutReference('x'.repeat(201)).valid, false);
  assert.equal(parseCheckoutReference(null).valid, false);
});
