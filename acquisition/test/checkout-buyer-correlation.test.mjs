import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { appendAnalyticsEventToBuyerLedger } from '../lib/analytics-buyer-bridge.mjs';
import { appendCheckoutStageToBuyerLedger } from '../lib/buyer-evidence-bridge.mjs';
import { buyerState } from '../lib/buyer-reaction.mjs';

const actor = '123e4567-e89b-12d3-a456-426614174000';
const reference = `spb_${actor}__spr_workflow_audit`;

function analyticsEvent() {
  return {
    uuid: 'evt_workflow_audit_checkout_click',
    event: 'checkout_click',
    distinct_id: actor,
    timestamp: '2026-09-13T02:00:00.000Z',
    properties: {
      product: 'workflow-audit',
      path: '/workflow-audit.html'
    }
  };
}

function stripeSession() {
  return {
    id: 'cs_live_correlated_1',
    customer: null,
    payment_status: 'unpaid',
    mode: 'payment',
    payment_intent: null,
    amount_total: 49900,
    currency: 'usd',
    created: Math.floor(Date.parse('2026-09-13T02:00:05.000Z') / 1000),
    client_reference_id: reference,
    metadata: {}
  };
}

test('the same anonymous actor advances from qualified action to real checkout evidence', () => {
  let ledger = { version: 1, records: [] };
  const analytics = appendAnalyticsEventToBuyerLedger(ledger, analyticsEvent());
  assert.equal(analytics.accepted, true);
  ledger = analytics.ledger;

  const checkout = appendCheckoutStageToBuyerLedger(ledger, stripeSession());
  assert.equal(checkout.accepted, true);
  ledger = checkout.ledger;

  const state = buyerState(ledger, `posthog:${actor}`);
  assert.equal(state.highest_stage, 'checkout');
  assert.equal(state.revenue_distance, 2);
  assert.equal(state.reaction_count, 2);
  assert.deepEqual(state.revenue_route_ids, ['workflow_audit']);
});

test('Workflow Audit browser code writes the versioned anonymous buyer-route reference', async () => {
  const source = await readFile('workflow-audit-experience.js', 'utf8');
  assert.match(source, /sp_anonymous_id_v2/);
  assert.match(source, /spb_\$\{buyer\}__spr_\$\{CHECKOUT_ROUTE\}/);
  assert.match(source, /client_reference_id/);
  assert.match(source, /CHECKOUT_ROUTE='workflow_audit'/);
});
