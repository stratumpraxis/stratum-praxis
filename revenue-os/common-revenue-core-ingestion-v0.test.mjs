import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deterministicEventId,
  inferBusinessUnit,
  ingestCanonicalCandidate,
  ingestPostHogEvent,
  ingestStripeCheckoutSession,
  ingestStripePaymentIntent,
  summarizeIngestion
} from './common-revenue-core-ingestion-v0.mjs';

const ts = '2026-09-04T03:00:00.000Z';

test('deterministic event IDs are stable and event-type specific', () => {
  const base = { source: 'posthog', source_event_id: 'abc', event_type: 'traffic', timestamp: ts };
  assert.equal(deterministicEventId(base), deterministicEventId(base));
  assert.notEqual(deterministicEventId(base), deterministicEventId({ ...base, event_type: 'cta_click' }));
});

test('business unit inference preserves explicit values and detects Vector routes', () => {
  assert.equal(inferBusinessUnit({ business_unit: 'stratum' }), 'stratum');
  assert.equal(inferBusinessUnit({ route_id: 'vpj_hub_cross_agent_v1' }), 'vector');
  assert.equal(inferBusinessUnit({ asset_id: 'vector_hub' }), 'vector');
  assert.equal(inferBusinessUnit({ current_url: 'https://stratumpraxis.com/x' }), 'stratum');
  assert.equal(inferBusinessUnit({}, null), null);
});

test('regular Stratum PostHog traffic maps to canonical traffic', () => {
  const result = ingestPostHogEvent({
    uuid: 'ph-1',
    event: 'traffic_session_start',
    timestamp: ts,
    properties: {
      $virt_traffic_type: 'Regular',
      $current_url: 'https://stratumpraxis.com/cross-agent-operating-kit.html',
      asset_id: 'cross_agent_operating_kit',
      route_id: 'cross_agent_personal_v1',
      utm_source: 'bluesky'
    }
  }, { project_id: '573335' });

  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.event.event_type, 'traffic');
  assert.equal(result.event.business_unit, 'stratum');
  assert.equal(result.event.sync_status, 'PENDING_SYNC');
  assert.equal(result.event.evidence_strength, 'MODERATE');
  assert.equal(result.event.attribution_state, 'ATTRIBUTED');
});

test('Vector PostHog route maps to business_unit vector without renaming route', () => {
  const result = ingestPostHogEvent({
    uuid: 'ph-vector-1',
    event: 'primary_cta_click',
    timestamp: ts,
    properties: {
      $virt_traffic_type: 'Regular',
      $current_url: 'https://vector-praxis-japan-hub.vercel.app/',
      asset_id: 'vector_hub',
      product_id: 'cross_agent_operating_kit',
      route_id: 'vpj_hub_cross_agent_v1',
      cta_id: 'vector_hub_cross_agent_kit'
    }
  });

  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.event.event_type, 'cta_click');
  assert.equal(result.event.business_unit, 'vector');
  assert.equal(result.event.route_id, 'vpj_hub_cross_agent_v1');
});

test('known QA / automation PostHog traffic is ignored', () => {
  const result = ingestPostHogEvent({
    uuid: 'qa-1',
    event: 'traffic_session_start',
    timestamp: ts,
    properties: {
      $virt_traffic_type: 'Automation',
      $current_url: 'https://stratumpraxis.com/',
      utm_source: 'codex_qa'
    }
  });
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: 'IGNORED', reason: 'QA_OR_AUTOMATION_TRAFFIC' });
});

test('analytics checkout_click never becomes checkout_started', () => {
  const result = ingestPostHogEvent({
    uuid: 'ph-checkout-click',
    event: 'checkout_click',
    timestamp: ts,
    properties: {
      $virt_traffic_type: 'Regular',
      $current_url: 'https://stratumpraxis.com/',
      route_id: 'cross_agent_personal_v1'
    }
  });
  assert.equal(result.status, 'IGNORED');
  assert.equal(result.reason, 'CHECKOUT_PROVIDER_EVIDENCE_REQUIRED');
});

test('generic funnel_view is not upgraded; explicit product context can qualify it', () => {
  const generic = ingestPostHogEvent({
    uuid: 'view-generic',
    event: 'funnel_view',
    timestamp: ts,
    properties: {
      $virt_traffic_type: 'Regular',
      $current_url: 'https://stratumpraxis.com/'
    }
  });
  assert.equal(generic.status, 'IGNORED');
  assert.equal(generic.reason, 'PRODUCT_VIEW_QUALIFICATION_REQUIRED');

  const product = ingestPostHogEvent({
    uuid: 'view-product',
    event: 'funnel_view',
    timestamp: ts,
    properties: {
      $virt_traffic_type: 'Regular',
      $current_url: 'https://stratumpraxis.com/product.html',
      product_id: 'p1'
    }
  });
  assert.equal(product.status, 'ACCEPTED');
  assert.equal(product.event.event_type, 'product_view');
});

test('unidentified PostHog source is accepted as weak evidence, not invented regular traffic', () => {
  const result = ingestPostHogEvent({
    uuid: 'ph-unknown',
    event: 'traffic_session_start',
    timestamp: ts,
    properties: { $current_url: 'https://stratumpraxis.com/' }
  });
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.event.traffic_class, 'UNVERIFIED');
  assert.equal(result.event.evidence_strength, 'WEAK');
});

test('Stripe open Checkout Session creates checkout_started only', () => {
  const result = ingestStripeCheckoutSession({
    id: 'cs_live_open_1',
    created: 1788490800,
    status: 'open',
    payment_status: 'unpaid',
    currency: 'usd',
    amount_total: 6900,
    client_reference_id: 'cross_agent_personal_v1',
    metadata: { route_id: 'cross_agent_personal_v1', product_id: 'cross_agent_operating_kit' }
  });
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].event_type, 'checkout_started');
});

test('Stripe complete paid Checkout Session creates checkout + verified purchase', () => {
  const result = ingestStripeCheckoutSession({
    id: 'cs_live_paid_1',
    created: 1788490800,
    status: 'complete',
    payment_status: 'paid',
    currency: 'usd',
    amount_total: 6900,
    client_reference_id: 'vpj_hub_cross_agent_v1',
    customer: 'cus_1',
    metadata: { route_id: 'vpj_hub_cross_agent_v1', product_id: 'cross_agent_operating_kit' }
  });
  assert.equal(result.status, 'ACCEPTED');
  assert.deepEqual(result.events.map((event) => event.event_type), ['checkout_started', 'purchase']);
  assert.equal(result.events[1].business_unit, 'vector');
  assert.equal(result.events[1].provider, 'stripe');
  assert.equal(result.events[1].provider_transaction_id, 'cs_live_paid_1');
  assert.equal(result.events[1].evidence_strength, 'STRONG');
});

test('Stripe QA session is excluded from revenue truth', () => {
  const result = ingestStripeCheckoutSession({
    id: 'cs_qa_1',
    created: 1788490800,
    status: 'complete',
    payment_status: 'paid',
    client_reference_id: 'codex_qa_checkout_1',
    metadata: {}
  });
  assert.equal(result.status, 'IGNORED');
  assert.equal(result.reason, 'QA_OR_AUTOMATION_TRANSACTION');
  assert.equal(result.events.length, 0);
});

test('Stripe succeeded PaymentIntent creates payment_captured, never payment_settled', () => {
  const captured = ingestStripePaymentIntent({
    id: 'pi_live_1',
    created: 1788490800,
    status: 'succeeded',
    currency: 'usd',
    amount: 6900,
    customer: 'cus_1',
    metadata: { route_id: 'cross_agent_personal_v1' }
  });
  assert.equal(captured.status, 'ACCEPTED');
  assert.equal(captured.event.event_type, 'payment_captured');

  const pending = ingestStripePaymentIntent({
    id: 'pi_live_2',
    created: 1788490800,
    status: 'requires_payment_method',
    metadata: {}
  });
  assert.equal(pending.status, 'IGNORED');
  assert.equal(pending.reason, 'PAYMENT_NOT_CAPTURED');
});

test('business-unit canonical handoff remains read-only PENDING_SYNC and fails closed on fake purchase', () => {
  const normal = ingestCanonicalCandidate({
    event_id: 'evt_action_1',
    event_type: 'action_executed',
    business_unit: 'vector',
    timestamp: ts,
    source: 'vector_execution_log',
    source_event_name: 'social_publish',
    evidence_ref: 'https://example.com/evidence'
  });
  assert.equal(normal.status, 'ACCEPTED');
  assert.equal(normal.event.sync_status, 'PENDING_SYNC');

  const fakePurchase = ingestCanonicalCandidate({
    event_id: 'evt_fake_purchase',
    event_type: 'purchase',
    business_unit: 'stratum',
    timestamp: ts,
    source: 'analytics',
    source_event_name: 'purchase',
    evidence_ref: 'analytics:event:1'
  });
  assert.equal(fakePurchase.status, 'INVALID');
  assert.ok(fakePurchase.errors.some((entry) => entry.code === 'PURCHASE_EVIDENCE_MISSING'));
});

test('ingestion summary does not confuse ignored with invalid', () => {
  assert.deepEqual(summarizeIngestion([
    { status: 'ACCEPTED' },
    { status: 'ACCEPTED' },
    { status: 'IGNORED' },
    { status: 'INVALID' }
  ]), { accepted: 2, ignored: 1, invalid: 1 });
});
