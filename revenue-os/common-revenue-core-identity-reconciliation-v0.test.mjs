import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ingestStripeCheckoutSession,
  ingestStripePaymentIntent
} from './common-revenue-core-ingestion-v0.mjs';
import {
  LEDGER_VERSION,
  eventFingerprint
} from './common-revenue-core-ledger-v0.mjs';
import {
  reconcileCanonicalEvents,
  resolveCanonicalIdentities
} from './common-revenue-core-identity-reconciliation-v0.mjs';

function syncedEvent(overrides = {}) {
  const event = {
    event_id: overrides.event_id || `evt_${Math.random().toString(16).slice(2)}`,
    event_type: overrides.event_type || 'purchase',
    business_unit: overrides.business_unit || 'stratum',
    timestamp: overrides.timestamp || '2026-09-04T00:00:00.000Z',
    source: overrides.source || 'stripe',
    source_event_name: overrides.source_event_name || 'checkout.session.snapshot',
    source_event_id: overrides.source_event_id || overrides.provider_transaction_id || 'cs_default',
    evidence_ref: overrides.evidence_ref || `stripe:test:${overrides.source_event_id || overrides.provider_transaction_id || 'cs_default'}`,
    evidence_strength: overrides.evidence_strength || 'STRONG',
    attribution_state: overrides.attribution_state || 'ATTRIBUTED',
    sync_status: 'SYNCED',
    provider: overrides.provider || 'stripe',
    provider_object_type: overrides.provider_object_type || 'checkout_session',
    provider_transaction_id: overrides.provider_transaction_id || 'cs_default',
    provider_customer_id: Object.prototype.hasOwnProperty.call(overrides, 'provider_customer_id') ? overrides.provider_customer_id : 'cus_provider_1',
    provider_links: overrides.provider_links || {},
    transaction_id: overrides.transaction_id ?? null,
    customer_id: overrides.customer_id ?? null,
    asset_id: overrides.asset_id ?? 'asset_a',
    product_id: overrides.product_id ?? 'product_a',
    channel: overrides.channel ?? 'owned',
    channel_id: overrides.channel_id ?? null,
    route_id: overrides.route_id ?? 'route_a',
    experiment_id: overrides.experiment_id ?? null,
    action_id: overrides.action_id ?? null,
    cta_id: overrides.cta_id ?? 'cta_a',
    source_url: overrides.source_url ?? 'https://stratumpraxis.com/test',
    currency: overrides.currency ?? 'usd',
    amount_minor: overrides.amount_minor ?? 6900,
    ledger_version: LEDGER_VERSION,
    ledger_recorded_at: overrides.ledger_recorded_at || '2026-09-04T00:01:00.000Z'
  };
  event.event_fingerprint = eventFingerprint(event);
  return event;
}

test('Stripe ingestion preserves Checkout Session to PaymentIntent relation', () => {
  const session = {
    id: 'cs_test_1',
    created: 1788480000,
    status: 'complete',
    payment_status: 'paid',
    payment_intent: 'pi_test_1',
    customer: 'cus_test_1',
    currency: 'usd',
    amount_total: 6900,
    metadata: { business_unit: 'stratum', route_id: 'route_a', product_id: 'product_a' }
  };

  const result = ingestStripeCheckoutSession(session);
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.events.length, 2);
  for (const event of result.events) {
    assert.equal(event.provider_object_type, 'checkout_session');
    assert.equal(event.provider_links.payment_intent, 'pi_test_1');
    assert.equal(event.amount_minor, 6900);
  }
});

test('Stripe PaymentIntent preserves captured amount and charge relation', () => {
  const intent = {
    id: 'pi_test_1',
    created: 1788480010,
    status: 'succeeded',
    customer: 'cus_test_1',
    latest_charge: 'ch_test_1',
    currency: 'usd',
    amount_received: 6900,
    metadata: { business_unit: 'stratum', route_id: 'route_a', product_id: 'product_a' }
  };
  const result = ingestStripePaymentIntent(intent);
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.event.provider_object_type, 'payment_intent');
  assert.equal(result.event.provider_links.charge, 'ch_test_1');
  assert.equal(result.event.amount_minor, 6900);
});

test('Checkout and PaymentIntent become one transaction only through strong provider link', () => {
  const checkout = syncedEvent({
    event_id: 'evt_checkout',
    event_type: 'purchase',
    source_event_id: 'cs_1',
    provider_transaction_id: 'cs_1',
    provider_object_type: 'checkout_session',
    provider_links: { payment_intent: 'pi_1' },
    ledger_recorded_at: '2026-09-04T00:01:00.000Z'
  });
  const capture = syncedEvent({
    event_id: 'evt_capture',
    event_type: 'payment_captured',
    source_event_name: 'payment_intent.snapshot',
    source_event_id: 'pi_1',
    provider_transaction_id: 'pi_1',
    provider_object_type: 'payment_intent',
    provider_links: {},
    ledger_recorded_at: '2026-09-04T00:02:00.000Z'
  });

  const resolved = resolveCanonicalIdentities([checkout, capture]);
  assert.equal(resolved.transactions.length, 1);
  assert.equal(resolved.transactions[0].event_ids.length, 2);
  assert.ok(resolved.transactions[0].transaction_id.startsWith('txn_'));
  assert.ok(resolved.transactions[0].customer_id.startsWith('cus_'));
});

test('Unlinked provider objects are never merged from amount/customer similarity alone', () => {
  const one = syncedEvent({ event_id: 'evt_one', provider_transaction_id: 'cs_one', source_event_id: 'cs_one', provider_links: {} });
  const two = syncedEvent({ event_id: 'evt_two', provider_transaction_id: 'cs_two', source_event_id: 'cs_two', provider_links: {} });
  const resolved = resolveCanonicalIdentities([one, two]);
  assert.equal(resolved.transactions.length, 2);
  assert.notEqual(resolved.transactions[0].transaction_id, resolved.transactions[1].transaction_id);
});

test('Canonical transaction anchor remains stable when later linked evidence arrives', () => {
  const earlyIntent = syncedEvent({
    event_id: 'evt_pi_early',
    event_type: 'payment_captured',
    source_event_name: 'payment_intent.snapshot',
    source_event_id: 'pi_early',
    provider_transaction_id: 'pi_early',
    provider_object_type: 'payment_intent',
    ledger_recorded_at: '2026-09-04T00:01:00.000Z'
  });
  const laterSession = syncedEvent({
    event_id: 'evt_cs_later',
    source_event_id: 'cs_later',
    provider_transaction_id: 'cs_later',
    provider_object_type: 'checkout_session',
    provider_links: { payment_intent: 'pi_early' },
    ledger_recorded_at: '2026-09-04T00:03:00.000Z'
  });

  const first = resolveCanonicalIdentities([earlyIntent]);
  const combined = resolveCanonicalIdentities([earlyIntent, laterSession]);
  assert.equal(first.transactions[0].transaction_id, combined.transactions[0].transaction_id);
});

test('Conflicting amount facts fail closed into reconciliation required', () => {
  const checkout = syncedEvent({
    event_id: 'evt_amount_1',
    event_type: 'purchase',
    source_event_id: 'cs_amount',
    provider_transaction_id: 'cs_amount',
    provider_object_type: 'checkout_session',
    provider_links: { payment_intent: 'pi_amount' },
    amount_minor: 6900
  });
  const capture = syncedEvent({
    event_id: 'evt_amount_2',
    event_type: 'payment_captured',
    source_event_name: 'payment_intent.snapshot',
    source_event_id: 'pi_amount',
    provider_transaction_id: 'pi_amount',
    provider_object_type: 'payment_intent',
    amount_minor: 7000
  });
  const result = reconcileCanonicalEvents([checkout, capture]);
  assert.equal(result.status, 'RECONCILIATION_REQUIRED');
  assert.ok(result.issues.some((issue) => issue.reason === 'PAYMENT_AMOUNT_CONFLICT'));
});

test('Conflicting business units fail closed', () => {
  const checkout = syncedEvent({
    event_id: 'evt_unit_1',
    source_event_id: 'cs_unit',
    provider_transaction_id: 'cs_unit',
    provider_links: { payment_intent: 'pi_unit' },
    business_unit: 'stratum'
  });
  const capture = syncedEvent({
    event_id: 'evt_unit_2',
    event_type: 'payment_captured',
    source_event_name: 'payment_intent.snapshot',
    source_event_id: 'pi_unit',
    provider_transaction_id: 'pi_unit',
    provider_object_type: 'payment_intent',
    business_unit: 'vector'
  });
  const result = reconcileCanonicalEvents([checkout, capture]);
  assert.equal(result.status, 'RECONCILIATION_REQUIRED');
  assert.ok(result.issues.some((issue) => issue.field === 'business_unit'));
});

test('Different provider customer IDs in one provider transaction fail closed', () => {
  const checkout = syncedEvent({
    event_id: 'evt_cus_1',
    source_event_id: 'cs_cus',
    provider_transaction_id: 'cs_cus',
    provider_links: { payment_intent: 'pi_cus' },
    provider_customer_id: 'cus_a'
  });
  const capture = syncedEvent({
    event_id: 'evt_cus_2',
    event_type: 'payment_captured',
    source_event_name: 'payment_intent.snapshot',
    source_event_id: 'pi_cus',
    provider_transaction_id: 'pi_cus',
    provider_object_type: 'payment_intent',
    provider_customer_id: 'cus_b'
  });
  const result = reconcileCanonicalEvents([checkout, capture]);
  assert.equal(result.status, 'RECONCILIATION_REQUIRED');
  assert.ok(result.issues.some((issue) => issue.reason === 'MULTIPLE_PROVIDER_CUSTOMERS_IN_ONE_TRANSACTION'));
});

test('Unresolved customer identity alone does not invent a customer or block transaction truth', () => {
  const event = syncedEvent({
    event_id: 'evt_no_customer',
    source_event_id: 'cs_no_customer',
    provider_transaction_id: 'cs_no_customer',
    provider_customer_id: null
  });
  const result = reconcileCanonicalEvents([event]);
  assert.equal(result.status, 'SYNCED');
  assert.equal(result.transactions[0].customer_id, null);
  assert.equal(result.unresolved_customer_count, 1);
});

test('Reconciliation is read-only and does not rewrite ledger event facts', () => {
  const event = syncedEvent({ event_id: 'evt_immutable', source_event_id: 'cs_immutable', provider_transaction_id: 'cs_immutable' });
  const before = JSON.stringify(event);
  const result = reconcileCanonicalEvents([event]);
  assert.equal(result.status, 'SYNCED');
  assert.equal(JSON.stringify(event), before);
  assert.equal(event.transaction_id, null);
});
