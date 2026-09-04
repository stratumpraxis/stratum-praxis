import test from 'node:test';
import assert from 'node:assert/strict';
import { eventFingerprint, LEDGER_VERSION } from './common-revenue-core-ledger-v0.mjs';
import {
  projectCanonicalEconomics,
  rollupCanonicalEconomics
} from './common-revenue-core-economics-v0.mjs';

let sequence = 0;
function syncedEvent(overrides = {}) {
  sequence += 1;
  const providerId = overrides.provider_transaction_id || `pi_econ_${sequence}`;
  const event = {
    event_id: overrides.event_id || `evt_econ_${sequence}`,
    event_type: overrides.event_type || 'purchase',
    business_unit: overrides.business_unit || 'stratum',
    timestamp: overrides.timestamp || `2026-09-04T00:00:${String(sequence).padStart(2, '0')}.000Z`,
    source: overrides.source || 'stripe',
    source_event_name: overrides.source_event_name || 'payment_intent.snapshot',
    source_event_id: overrides.source_event_id || providerId,
    evidence_ref: overrides.evidence_ref || `stripe:test:${providerId}:${sequence}`,
    evidence_strength: overrides.evidence_strength || 'STRONG',
    attribution_state: overrides.attribution_state || 'ATTRIBUTED',
    sync_status: 'SYNCED',
    provider: overrides.provider || 'stripe',
    provider_object_type: overrides.provider_object_type || 'payment_intent',
    provider_transaction_id: providerId,
    provider_customer_id: Object.hasOwn(overrides, 'provider_customer_id') ? overrides.provider_customer_id : 'cus_econ_1',
    provider_links: overrides.provider_links || {},
    transaction_id: overrides.transaction_id ?? null,
    customer_id: overrides.customer_id ?? null,
    asset_id: overrides.asset_id ?? 'asset_econ',
    product_id: overrides.product_id ?? 'product_econ',
    channel: overrides.channel ?? 'owned',
    channel_id: overrides.channel_id ?? null,
    route_id: overrides.route_id ?? 'route_econ',
    experiment_id: overrides.experiment_id ?? null,
    action_id: overrides.action_id ?? null,
    cta_id: overrides.cta_id ?? 'cta_econ',
    source_url: overrides.source_url ?? 'https://stratumpraxis.com/economics',
    currency: overrides.currency ?? 'usd',
    amount_minor: Object.hasOwn(overrides, 'amount_minor') ? overrides.amount_minor : 6900,
    ledger_version: LEDGER_VERSION,
    ledger_recorded_at: overrides.ledger_recorded_at || `2026-09-04T00:01:${String(sequence).padStart(2, '0')}.000Z`
  };

  for (const [key, value] of Object.entries(overrides)) {
    event[key] = value;
  }
  event.event_fingerprint = eventFingerprint(event);
  return event;
}

function completePurchase(overrides = {}) {
  return syncedEvent({
    event_type: 'purchase',
    refund_state_known: true,
    chargeback_state_known: true,
    provider_fee_state_known: true,
    provider_fee_amount_minor: 200,
    variable_cost_state_known: true,
    variable_cost_amount_minor: 100,
    ...overrides
  });
}

test('revenue lifecycle is recognized once instead of double-counting purchase and capture', () => {
  const purchase = completePurchase({
    event_id: 'evt_purchase_once',
    provider_transaction_id: 'cs_once',
    provider_object_type: 'checkout_session',
    source_event_name: 'checkout.session.snapshot',
    source_event_id: 'cs_once',
    provider_links: { payment_intent: 'pi_once' }
  });
  const capture = syncedEvent({
    event_id: 'evt_capture_once',
    event_type: 'payment_captured',
    provider_transaction_id: 'pi_once',
    source_event_id: 'pi_once',
    provider_links: {},
    amount_minor: 6900
  });

  const result = projectCanonicalEconomics([purchase, capture]);
  assert.equal(result.status, 'READY');
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].gross_revenue_amount_minor, 6900);
  assert.equal(result.transactions[0].contribution_profit_amount_minor, 6600);
});

test('unknown fees and costs remain unknown rather than silently becoming zero', () => {
  const purchase = syncedEvent({
    event_id: 'evt_partial',
    provider_transaction_id: 'pi_partial',
    refund_state_known: true,
    chargeback_state_known: true
  });
  const result = projectCanonicalEconomics([purchase]);
  const economics = result.transactions[0];
  assert.equal(economics.economics_status, 'PARTIAL');
  assert.equal(economics.provider_fee_amount_minor, null);
  assert.equal(economics.variable_cost_amount_minor, null);
  assert.equal(economics.net_revenue_amount_minor, null);
  assert.equal(economics.contribution_profit_amount_minor, null);
  assert.ok(economics.unknown_fields.includes('provider_fee_amount'));
  assert.ok(economics.unknown_fields.includes('variable_cost_amount'));
});

test('explicit known-zero states allow complete economics without invented defaults', () => {
  const purchase = syncedEvent({
    event_id: 'evt_zero_cost',
    provider_transaction_id: 'pi_zero_cost',
    amount_minor: 6900,
    refund_state_known: true,
    chargeback_state_known: true,
    provider_fee_state_known: true,
    variable_cost_state_known: true
  });
  const result = projectCanonicalEconomics([purchase]);
  const economics = result.transactions[0];
  assert.equal(economics.economics_status, 'COMPLETE');
  assert.equal(economics.refund_amount_minor, 0);
  assert.equal(economics.chargeback_amount_minor, 0);
  assert.equal(economics.provider_fee_amount_minor, 0);
  assert.equal(economics.variable_cost_amount_minor, 0);
  assert.equal(economics.contribution_profit_amount_minor, 6900);
  assert.equal(economics.contribution_profit_amount, '69.00');
});

test('verified refund and chargeback events reduce economics without mutating gross revenue', () => {
  const purchase = completePurchase({
    event_id: 'evt_loss_purchase',
    provider_transaction_id: 'cs_loss',
    provider_object_type: 'checkout_session',
    source_event_name: 'checkout.session.snapshot',
    source_event_id: 'cs_loss',
    provider_links: { payment_intent: 'pi_loss' },
    provider_fee_amount_minor: 200,
    variable_cost_amount_minor: 100
  });
  const refund = syncedEvent({
    event_id: 'evt_refund',
    event_type: 'refund',
    provider_transaction_id: 're_loss',
    provider_object_type: 'refund',
    source_event_name: 'refund.snapshot',
    source_event_id: 're_loss',
    provider_links: { payment_intent: 'pi_loss' },
    amount_minor: 1000,
    route_id: null
  });
  const chargeback = syncedEvent({
    event_id: 'evt_chargeback',
    event_type: 'chargeback',
    provider_transaction_id: 'dp_loss',
    provider_object_type: 'chargeback',
    source_event_name: 'chargeback.snapshot',
    source_event_id: 'dp_loss',
    provider_links: { payment_intent: 'pi_loss' },
    amount_minor: 500,
    route_id: null
  });

  const result = projectCanonicalEconomics([purchase, refund, chargeback]);
  const economics = result.transactions[0];
  assert.equal(economics.gross_revenue_amount_minor, 6900);
  assert.equal(economics.refund_amount_minor, 1000);
  assert.equal(economics.chargeback_amount_minor, 500);
  assert.equal(economics.net_revenue_amount_minor, 5200);
  assert.equal(economics.contribution_profit_amount_minor, 5100);
});

test('reconciliation conflict blocks economics rather than producing false profit', () => {
  const purchase = completePurchase({
    event_id: 'evt_conflict_purchase',
    provider_transaction_id: 'cs_conflict',
    provider_object_type: 'checkout_session',
    source_event_name: 'checkout.session.snapshot',
    source_event_id: 'cs_conflict',
    provider_links: { payment_intent: 'pi_conflict' },
    amount_minor: 6900
  });
  const capture = syncedEvent({
    event_id: 'evt_conflict_capture',
    event_type: 'payment_captured',
    provider_transaction_id: 'pi_conflict',
    source_event_id: 'pi_conflict',
    amount_minor: 7000
  });

  const result = projectCanonicalEconomics([purchase, capture]);
  assert.equal(result.status, 'RECONCILIATION_REQUIRED');
  assert.equal(result.transactions[0].economics_status, 'RECONCILIATION_REQUIRED');
  assert.equal(result.transactions[0].contribution_profit_amount_minor, null);
});

test('cross-currency portfolio aggregation is disallowed without explicit FX', () => {
  const usd = completePurchase({
    event_id: 'evt_usd',
    provider_transaction_id: 'pi_usd',
    provider_customer_id: 'cus_usd',
    currency: 'usd',
    amount_minor: 6900
  });
  const jpy = completePurchase({
    event_id: 'evt_jpy',
    provider_transaction_id: 'pi_jpy',
    provider_customer_id: 'cus_jpy',
    currency: 'jpy',
    amount_minor: 980,
    provider_fee_amount_minor: 30,
    variable_cost_amount_minor: 0
  });

  const result = rollupCanonicalEconomics([usd, jpy]);
  assert.equal(result.cross_currency_aggregation, 'DISALLOWED_WITHOUT_EXPLICIT_FX');
  assert.equal(result.portfolio_currency, null);
  assert.equal(result.portfolio_contribution_profit_amount_minor, null);
  assert.equal(result.per_currency.length, 2);
});

test('partial transaction prevents declaring portfolio contribution profit', () => {
  const complete = completePurchase({
    event_id: 'evt_complete',
    provider_transaction_id: 'pi_complete',
    provider_customer_id: 'cus_complete'
  });
  const partial = syncedEvent({
    event_id: 'evt_partial_rollup',
    provider_transaction_id: 'pi_partial_rollup',
    provider_customer_id: 'cus_partial_rollup',
    refund_state_known: true,
    chargeback_state_known: true
  });

  const result = rollupCanonicalEconomics([complete, partial]);
  assert.equal(result.portfolio_currency, 'usd');
  assert.equal(result.per_currency[0].all_economics_complete, false);
  assert.equal(result.portfolio_contribution_profit_amount_minor, null);
});
