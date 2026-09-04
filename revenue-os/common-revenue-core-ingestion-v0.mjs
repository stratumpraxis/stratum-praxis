import { createHash } from 'node:crypto';
import {
  BUSINESS_UNITS,
  mapNativeEvent,
  validateCanonicalEvent
} from './common-revenue-core-schema-v0.mjs';

export const INGESTION_RESULTS = Object.freeze(['ACCEPTED', 'IGNORED', 'INVALID']);

const KNOWN_QA_SOURCES = Object.freeze([
  'codex',
  'codex_qa',
  'qa',
  'automation',
  'synthetic'
]);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstText(...values) {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return '';
}

function isoFromUnix(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return '';
  return new Date(seconds * 1000).toISOString();
}

function stableHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export function deterministicEventId({ source, source_event_id, event_type, timestamp }) {
  const stable = [source, source_event_id, event_type, timestamp].map(text).join('|');
  if (!source || !source_event_id || !event_type || !timestamp) return null;
  return `crc_${stableHash(stable)}`;
}

function urlHost(value) {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return '';
  }
}

function containsQaMarker(value) {
  const normalized = text(value).toLowerCase();
  if (!normalized) return false;
  return KNOWN_QA_SOURCES.some((marker) => normalized === marker || normalized.startsWith(`${marker}_`) || normalized.startsWith(`${marker}-`));
}

export function inferBusinessUnit(context = {}, fallback = null) {
  const explicit = text(context.business_unit).toLowerCase();
  if (BUSINESS_UNITS.includes(explicit)) return explicit;

  const routeId = text(context.route_id).toLowerCase();
  const assetId = text(context.asset_id).toLowerCase();
  const utmSource = text(context.utm_source).toLowerCase();
  const currentHost = urlHost(firstText(context.current_url, context.source_url));

  if (
    routeId.startsWith('vp_') ||
    routeId.startsWith('vpj_') ||
    assetId.startsWith('vector_') ||
    utmSource === 'vector_praxis' ||
    utmSource === 'vector' ||
    currentHost.includes('vector-praxis') ||
    currentHost.includes('vectorpraxis')
  ) return 'vector';

  if (
    currentHost === 'stratumpraxis.com' ||
    currentHost.endsWith('.stratumpraxis.com') ||
    utmSource === 'stratum_praxis' ||
    utmSource === 'stratumpraxis'
  ) return 'stratum';

  const fallbackValue = text(fallback).toLowerCase();
  return BUSINESS_UNITS.includes(fallbackValue) ? fallbackValue : null;
}

function postHogTrafficClass(properties = {}) {
  const virtualType = firstText(properties.$virt_traffic_type, properties.virt_traffic_type, properties.traffic_type);
  if (virtualType) {
    const lowered = virtualType.toLowerCase();
    if (lowered === 'regular') return 'REGULAR';
    if (lowered.includes('automation') || lowered.includes('bot') || lowered.includes('qa') || lowered.includes('synthetic')) return 'EXCLUDED';
  }

  const source = firstText(properties.utm_source, properties.source, properties.client_reference_id);
  if (containsQaMarker(source)) return 'EXCLUDED';
  return 'UNVERIFIED';
}

function buildAttributionState(properties = {}) {
  const hasRoute = Boolean(text(properties.route_id));
  const hasUtm = Boolean(firstText(properties.utm_source, properties.utm_campaign, properties.utm_content));
  return hasRoute || hasUtm ? 'ATTRIBUTED' : 'UNATTRIBUTED';
}

function baseContextFields(properties = {}) {
  return {
    transaction_id: null,
    customer_id: null,
    asset_id: firstText(properties.asset_id, properties.destination_asset_id) || null,
    product_id: firstText(properties.product_id, properties.product) || null,
    channel: text(properties.channel) || null,
    channel_id: text(properties.channel_id) || null,
    route_id: text(properties.route_id) || null,
    experiment_id: text(properties.experiment_id) || null,
    action_id: text(properties.action_id) || null,
    cta_id: text(properties.cta_id) || null
  };
}

function validateAccepted(event) {
  const validation = validateCanonicalEvent(event, { require_trusted_evidence: true });
  if (validation.ok) return Object.freeze({ status: 'ACCEPTED', event: Object.freeze(event) });
  return Object.freeze({ status: 'INVALID', event: Object.freeze(event), errors: validation.errors });
}

/**
 * Read-only PostHog adapter.
 * It never upgrades checkout intent into checkout truth and never learns known QA/automation traffic.
 */
export function ingestPostHogEvent(raw, { business_unit = null, project_id = null, qualifies_as_product_view = false } = {}) {
  const sourceEventName = text(raw?.event);
  const sourceEventId = firstText(raw?.uuid, raw?.id);
  const timestamp = text(raw?.timestamp);
  const properties = raw?.properties && typeof raw.properties === 'object' ? raw.properties : {};
  const trafficClass = postHogTrafficClass(properties);

  if (trafficClass === 'EXCLUDED') {
    return Object.freeze({
      status: 'IGNORED',
      reason: 'QA_OR_AUTOMATION_TRAFFIC',
      source_event_name: sourceEventName || null,
      source_event_id: sourceEventId || null
    });
  }

  const mapping = mapNativeEvent(sourceEventName, {
    qualifies_as_product_view: qualifies_as_product_view === true || Boolean(text(properties.product_id))
  });

  if (!mapping.event_type) {
    return Object.freeze({
      status: 'IGNORED',
      reason: mapping.reason,
      source_event_name: sourceEventName || null,
      source_event_id: sourceEventId || null
    });
  }

  const context = baseContextFields(properties);
  const resolvedBusinessUnit = inferBusinessUnit({
    ...properties,
    ...context,
    current_url: firstText(properties.$current_url, properties.current_url),
    source_url: firstText(properties.$current_url, properties.current_url),
    utm_source: properties.utm_source
  }, business_unit);

  if (!resolvedBusinessUnit) {
    return Object.freeze({
      status: 'INVALID',
      reason: 'BUSINESS_UNIT_UNRESOLVED',
      source_event_name: sourceEventName || null,
      source_event_id: sourceEventId || null,
      errors: Object.freeze([{ code: 'CONTRACT_INVALID', field: 'business_unit', message: 'business_unit could not be resolved without guessing' }])
    });
  }

  const evidenceRef = project_id
    ? `posthog:project:${project_id}:event:${sourceEventId}`
    : `posthog:event:${sourceEventId}`;
  const eventId = deterministicEventId({
    source: 'posthog',
    source_event_id: sourceEventId,
    event_type: mapping.event_type,
    timestamp
  });

  const event = {
    event_id: eventId,
    event_type: mapping.event_type,
    business_unit: resolvedBusinessUnit,
    timestamp,
    source: 'posthog',
    source_event_name: sourceEventName,
    source_event_id: sourceEventId || null,
    evidence_ref: evidenceRef,
    evidence_strength: trafficClass === 'REGULAR' ? 'MODERATE' : 'WEAK',
    attribution_state: buildAttributionState(properties),
    sync_status: 'PENDING_SYNC',
    provider: null,
    provider_transaction_id: null,
    provider_customer_id: null,
    source_url: firstText(properties.$current_url, properties.current_url) || null,
    traffic_class: trafficClass,
    utm_source: text(properties.utm_source) || null,
    utm_medium: text(properties.utm_medium) || null,
    utm_campaign: text(properties.utm_campaign) || null,
    utm_content: text(properties.utm_content) || null,
    ...context
  };

  return validateAccepted(event);
}

function stripeContext(record = {}) {
  const metadata = record?.metadata && typeof record.metadata === 'object' ? record.metadata : {};
  const clientReferenceId = text(record?.client_reference_id);
  const routeId = firstText(metadata.route_id, clientReferenceId.startsWith('vp_') || clientReferenceId.startsWith('vpj_') ? clientReferenceId : '');
  const context = {
    business_unit: metadata.business_unit,
    route_id: routeId,
    asset_id: firstText(metadata.asset_id, metadata.destination_asset_id),
    product_id: firstText(metadata.product_id, metadata.product),
    utm_source: metadata.utm_source,
    source_url: firstText(record?.success_url, record?.url)
  };
  return { metadata, clientReferenceId, routeId, context };
}

function stripeIsExcluded(record = {}) {
  const { metadata, clientReferenceId } = stripeContext(record);
  if (containsQaMarker(clientReferenceId)) return true;
  if (containsQaMarker(metadata.utm_source)) return true;
  if (containsQaMarker(metadata.source)) return true;
  if (String(metadata.qa || '').toLowerCase() === 'true') return true;
  if (String(metadata.automation || '').toLowerCase() === 'true') return true;
  return false;
}

function makeStripeEvent(record, eventType, sourceEventName, { fallback_business_unit = 'stratum' } = {}) {
  const { metadata, routeId, context } = stripeContext(record);
  const sourceEventId = text(record?.id);
  const timestamp = isoFromUnix(record?.created);
  const resolvedBusinessUnit = inferBusinessUnit(context, fallback_business_unit);
  const providerCustomerId = typeof record?.customer === 'string' ? record.customer : text(record?.customer?.id);
  const evidenceRef = `stripe:${sourceEventName}:${sourceEventId}`;

  const event = {
    event_id: deterministicEventId({ source: 'stripe', source_event_id: sourceEventId, event_type: eventType, timestamp }),
    event_type: eventType,
    business_unit: resolvedBusinessUnit,
    timestamp,
    source: 'stripe',
    source_event_name: sourceEventName,
    source_event_id: sourceEventId || null,
    evidence_ref: evidenceRef,
    evidence_strength: 'STRONG',
    attribution_state: routeId ? 'ATTRIBUTED' : 'UNVERIFIED',
    sync_status: 'PENDING_SYNC',
    provider: 'stripe',
    provider_transaction_id: sourceEventId,
    provider_customer_id: providerCustomerId || null,
    source_url: firstText(record?.url, record?.success_url) || null,
    transaction_id: null,
    customer_id: null,
    asset_id: firstText(metadata.asset_id, metadata.destination_asset_id) || null,
    product_id: firstText(metadata.product_id, metadata.product) || null,
    channel: text(metadata.channel) || null,
    channel_id: text(metadata.channel_id) || null,
    route_id: routeId || null,
    experiment_id: text(metadata.experiment_id) || null,
    action_id: text(metadata.action_id) || null,
    cta_id: text(metadata.cta_id) || null,
    client_reference_id: text(record?.client_reference_id) || null,
    currency: text(record?.currency).toLowerCase() || null,
    amount_total: Number.isFinite(Number(record?.amount_total)) ? Number(record.amount_total) : null
  };

  return validateAccepted(event);
}

/**
 * A provider-created Checkout Session is checkout truth. A completed + paid
 * session is also purchase truth. Capture/settlement remain separate lifecycle facts.
 */
export function ingestStripeCheckoutSession(session, options = {}) {
  if (!session || typeof session !== 'object' || stripeIsExcluded(session)) {
    return Object.freeze({
      status: 'IGNORED',
      reason: session && stripeIsExcluded(session) ? 'QA_OR_AUTOMATION_TRANSACTION' : 'INVALID_SOURCE_RECORD',
      events: Object.freeze([])
    });
  }

  const events = [];
  const checkout = makeStripeEvent(session, 'checkout_started', 'checkout.session.snapshot', options);
  if (checkout.status === 'ACCEPTED') events.push(checkout.event);
  else return Object.freeze({ status: 'INVALID', reason: 'CHECKOUT_EVENT_INVALID', errors: checkout.errors, events: Object.freeze([]) });

  if (session.status === 'complete' && session.payment_status === 'paid') {
    const purchase = makeStripeEvent(session, 'purchase', 'checkout.session.snapshot', options);
    if (purchase.status === 'ACCEPTED') events.push(purchase.event);
    else return Object.freeze({ status: 'INVALID', reason: 'PURCHASE_EVENT_INVALID', errors: purchase.errors, events: Object.freeze(events) });
  }

  return Object.freeze({ status: 'ACCEPTED', events: Object.freeze(events) });
}

/** PaymentIntent `succeeded` is captured-payment evidence, not settlement evidence. */
export function ingestStripePaymentIntent(paymentIntent, options = {}) {
  if (!paymentIntent || typeof paymentIntent !== 'object') {
    return Object.freeze({ status: 'IGNORED', reason: 'INVALID_SOURCE_RECORD' });
  }
  if (stripeIsExcluded(paymentIntent)) {
    return Object.freeze({ status: 'IGNORED', reason: 'QA_OR_AUTOMATION_TRANSACTION' });
  }
  if (paymentIntent.status !== 'succeeded') {
    return Object.freeze({ status: 'IGNORED', reason: 'PAYMENT_NOT_CAPTURED' });
  }
  return makeStripeEvent(paymentIntent, 'payment_captured', 'payment_intent.snapshot', options);
}

/**
 * Accept a business-unit produced canonical candidate without persistence.
 * This is the handoff surface for Stratum/Vector execution logs and future
 * provider-native adapters. It cannot create trusted facts without contract evidence.
 */
export function ingestCanonicalCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return Object.freeze({ status: 'INVALID', errors: Object.freeze([{ code: 'CONTRACT_INVALID', field: '$', message: 'candidate must be an object' }]) });
  }
  const event = { ...candidate, sync_status: 'PENDING_SYNC' };
  const validation = validateCanonicalEvent(event, { require_trusted_evidence: true });
  return validation.ok
    ? Object.freeze({ status: 'ACCEPTED', event: Object.freeze(event) })
    : Object.freeze({ status: 'INVALID', event: Object.freeze(event), errors: validation.errors });
}

export function summarizeIngestion(results = []) {
  const summary = { accepted: 0, ignored: 0, invalid: 0 };
  for (const result of results) {
    if (result?.status === 'ACCEPTED') summary.accepted += 1;
    else if (result?.status === 'IGNORED') summary.ignored += 1;
    else summary.invalid += 1;
  }
  return Object.freeze(summary);
}
