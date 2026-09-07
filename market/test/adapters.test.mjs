import test from 'node:test';
import assert from 'node:assert/strict';

import { HUMAN_EVENTS, toSignals as posthogSignals } from '../adapters/posthog-events.mjs';
import { toSignals as stripeSignals } from '../adapters/stripe-events.mjs';
import { canSupportMoneyClaim } from '../lib/evidence.mjs';
import { transition } from '../lib/state.mjs';
import { ANALYTICS_EVENTS } from '../../acquisition/lib/taxonomy.mjs';

// ---------------------------------------------------------------- posthog

test('every human event this adapter listens for is in the deployed taxonomy', () => {
  // If these drift apart, the adapter waits for an event no page emits - a lane that
  // is wired but permanently silent, which is worse than one that is missing.
  for (const name of Object.keys(HUMAN_EVENTS)) {
    assert.ok(ANALYTICS_EVENTS.includes(name), `${name} is not in the engine taxonomy`);
  }
});

test('a checkout_click becomes a CHECKOUT signal, never a payment', () => {
  const { signals } = posthogSignals([{
    event: 'checkout_click',
    uuid: 'evt-1',
    timestamp: '2026-09-06T10:00:00Z',
    properties: { path: '/prompt-store/', cta_id: 'prompt_store_offer_checkout', product: 'workflow_operator_bundle' }
  }]);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].signal_type, 'CHECKOUT');
  assert.equal(signals[0].route_id, 'prompt_store_offer_checkout');
  assert.equal(canSupportMoneyClaim(signals[0].evidence), false);
});

test('a click cannot be walked up to PAID however many transitions are tried', () => {
  const { signals } = posthogSignals([{
    event: 'checkout_click', uuid: 'evt-2', timestamp: '2026-09-06T10:00:00Z', properties: {}
  }]);
  const s = { ...signals[0], status: 'CHECKOUT' };
  assert.equal(transition(s, 'PAID').ok, false);
  assert.equal(transition(s, 'WON').ok, false);
});

test('a page view is not a human signal', () => {
  const { signals, ignored } = posthogSignals([{ event: 'funnel_view', uuid: 'v1', properties: {} }]);
  assert.equal(signals.length, 0);
  assert.equal(ignored[0].reason, 'NOT_A_HUMAN_SIGNAL');
});

test('the same posthog event read twice keeps one id', () => {
  const ev = { event: 'primary_cta_click', uuid: 'stable-uuid', timestamp: '2026-09-06T10:00:00Z', properties: {} };
  const a = posthogSignals([ev]).signals[0];
  const b = posthogSignals([ev], { now: Date.now() + 86400000 }).signals[0];
  assert.equal(a.signal_id, b.signal_id);
});

// ---------------------------------------------------------------- stripe

test('a paid session is a PAYMENT with money-bearing evidence', () => {
  const { signals } = stripeSignals([{
    id: 'cs_paid', object: 'checkout.session', payment_status: 'paid',
    amount_total: 1700, currency: 'usd', created: 1757000000,
    client_reference_id: 'prompt_store_owned_media'
  }]);
  assert.equal(signals[0].signal_type, 'PAYMENT');
  assert.equal(signals[0].route_id, 'prompt_store_owned_media');
  assert.equal(canSupportMoneyClaim(signals[0].evidence), true);
});

test('an unpaid session is ingested as CHECKOUT and cannot claim money', () => {
  const { signals } = stripeSignals([{
    id: 'cs_open', object: 'checkout.session', payment_status: 'unpaid',
    amount_total: 1700, currency: 'usd', created: 1757000000
  }]);
  assert.equal(signals[0].signal_type, 'CHECKOUT');
  assert.equal(canSupportMoneyClaim(signals[0].evidence), false,
    'an open session must not be able to support a revenue claim');
});

test('an unpaid session is kept, not dropped, so dead checkouts stay countable', () => {
  const { signals, ignored } = stripeSignals([
    { id: 'cs_a', payment_status: 'unpaid', created: 1757000000 },
    { id: 'cs_b', payment_status: 'paid', created: 1757000001 }
  ]);
  assert.equal(signals.length, 2);
  assert.equal(ignored.length, 0);
  assert.equal(signals.filter((s) => s.signal_type === 'CHECKOUT').length, 1);
});

test('only a genuinely paid session can carry the state machine to PAID', () => {
  const [unpaid, paid] = stripeSignals([
    { id: 'cs_u', payment_status: 'unpaid', created: 1 },
    { id: 'cs_p', payment_status: 'paid', created: 2 }
  ]).signals;

  assert.equal(transition({ ...unpaid, status: 'CHECKOUT' }, 'PAID', { evidence: unpaid.evidence }).ok, false);
  assert.equal(transition({ ...paid, status: 'CHECKOUT' }, 'PAID', { evidence: paid.evidence }).ok, true);
});

test('a session with no stripe id is refused rather than given a made-up one', () => {
  const { signals, ignored } = stripeSignals([{ payment_status: 'paid' }]);
  assert.equal(signals.length, 0);
  assert.equal(ignored[0].reason, 'NO_STRIPE_ID');
});
