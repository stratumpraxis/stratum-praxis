import { createHash } from 'node:crypto';
import { auditCanonicalLedger, readCanonicalLedger } from './common-revenue-core-ledger-v0.mjs';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hashId(prefix, value) {
  return `${prefix}_${createHash('sha256').update(String(value)).digest('hex').slice(0, 24)}`;
}

function objectType(event) {
  const explicit = text(event?.provider_object_type);
  if (explicit) return explicit;
  const source = text(event?.source_event_name);
  if (source.includes('checkout.session')) return 'checkout_session';
  if (source.includes('payment_intent')) return 'payment_intent';
  if (source.includes('charge')) return 'charge';
  if (source.includes('refund')) return 'refund';
  return 'object';
}

function primaryProviderRef(event) {
  const provider = text(event?.provider);
  const id = text(event?.provider_transaction_id);
  if (!provider || !id) return null;
  return `${provider}:${objectType(event)}:${id}`;
}

function providerRefs(event) {
  const refs = [];
  const primary = primaryProviderRef(event);
  if (primary) refs.push(primary);

  const provider = text(event?.provider);
  const links = event?.provider_links && typeof event.provider_links === 'object' && !Array.isArray(event.provider_links)
    ? event.provider_links
    : {};
  for (const [kind, raw] of Object.entries(links)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      const id = text(value);
      if (provider && id) refs.push(`${provider}:${kind}:${id}`);
    }
  }
  return [...new Set(refs)];
}

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, index) => index);
    this.rank = Array(size).fill(0);
  }

  find(value) {
    let root = value;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[value] !== value) {
      const next = this.parent[value];
      this.parent[value] = root;
      value = next;
    }
    return root;
  }

  union(left, right) {
    let a = this.find(left);
    let b = this.find(right);
    if (a === b) return;
    if (this.rank[a] < this.rank[b]) [a, b] = [b, a];
    this.parent[b] = a;
    if (this.rank[a] === this.rank[b]) this.rank[a] += 1;
  }
}

function stableAnchor(component) {
  return [...component].sort((left, right) => {
    const leftRecorded = text(left.event.ledger_recorded_at) || text(left.event.timestamp);
    const rightRecorded = text(right.event.ledger_recorded_at) || text(right.event.timestamp);
    const timeOrder = leftRecorded.localeCompare(rightRecorded);
    if (timeOrder !== 0) return timeOrder;
    return text(left.event.event_id).localeCompare(text(right.event.event_id));
  })[0]?.event || null;
}

function canonicalTransactionId(component) {
  const explicit = [...new Set(component.map(({ event }) => text(event.transaction_id)).filter(Boolean))];
  if (explicit.length === 1) return { transaction_id: explicit[0], issues: [] };
  if (explicit.length > 1) {
    return {
      transaction_id: null,
      issues: [{ code: 'IDENTITY_CONFLICT', field: 'transaction_id', values: explicit, reason: 'MULTIPLE_CANONICAL_TRANSACTION_IDS' }]
    };
  }

  const anchor = stableAnchor(component);
  if (!anchor) return { transaction_id: null, issues: [] };
  const providerRef = primaryProviderRef(anchor);
  const seed = providerRef || text(anchor.event_id);
  return seed
    ? { transaction_id: hashId('txn', seed), issues: [] }
    : { transaction_id: null, issues: [] };
}

function canonicalCustomerId(component) {
  const explicit = [...new Set(component.map(({ event }) => text(event.customer_id)).filter(Boolean))];
  if (explicit.length === 1) return { customer_id: explicit[0], issues: [] };
  if (explicit.length > 1) {
    return {
      customer_id: null,
      issues: [{ code: 'IDENTITY_CONFLICT', field: 'customer_id', values: explicit, reason: 'MULTIPLE_CANONICAL_CUSTOMER_IDS' }]
    };
  }

  const identities = component
    .map(({ event }) => ({ provider: text(event.provider), id: text(event.provider_customer_id) }))
    .filter(({ provider, id }) => provider && id);
  const unique = new Map(identities.map((identity) => [`${identity.provider}|${identity.id}`, identity]));
  if (unique.size === 0) return { customer_id: null, issues: [] };
  if (unique.size === 1) {
    const only = [...unique.keys()][0];
    return { customer_id: hashId('cus', only), issues: [] };
  }

  const byProvider = new Map();
  for (const identity of unique.values()) {
    if (!byProvider.has(identity.provider)) byProvider.set(identity.provider, new Set());
    byProvider.get(identity.provider).add(identity.id);
  }
  const conflictingProvider = [...byProvider.entries()].find(([, ids]) => ids.size > 1);
  if (conflictingProvider) {
    return {
      customer_id: null,
      issues: [{
        code: 'IDENTITY_CONFLICT',
        field: 'provider_customer_id',
        provider: conflictingProvider[0],
        values: [...conflictingProvider[1]],
        reason: 'MULTIPLE_PROVIDER_CUSTOMERS_IN_ONE_TRANSACTION'
      }]
    };
  }

  // Different providers may identify the same buyer differently. Without a strong
  // cross-provider identity link, preserve unknown rather than guessing.
  return {
    customer_id: null,
    issues: [{ code: 'IDENTITY_UNRESOLVED', field: 'customer_id', reason: 'CROSS_PROVIDER_IDENTITY_NOT_PROVEN' }]
  };
}

export function resolveCanonicalIdentities(events = []) {
  const uf = new UnionFind(events.length);
  const refOwner = new Map();
  const explicitTransactionOwner = new Map();

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    for (const ref of providerRefs(event)) {
      if (refOwner.has(ref)) uf.union(index, refOwner.get(ref));
      else refOwner.set(ref, index);
    }

    const explicitTransactionId = text(event?.transaction_id);
    if (explicitTransactionId) {
      if (explicitTransactionOwner.has(explicitTransactionId)) uf.union(index, explicitTransactionOwner.get(explicitTransactionId));
      else explicitTransactionOwner.set(explicitTransactionId, index);
    }
  }

  const components = new Map();
  for (let index = 0; index < events.length; index += 1) {
    const root = uf.find(index);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push({ index, event: events[index] });
  }

  const transactions = [];
  const eventIdentity = new Map();
  for (const component of components.values()) {
    const txn = canonicalTransactionId(component);
    const customer = canonicalCustomerId(component);
    const businessUnits = [...new Set(component.map(({ event }) => text(event.business_unit)).filter(Boolean))];
    const issues = [...txn.issues, ...customer.issues];
    if (businessUnits.length > 1) {
      issues.push({ code: 'IDENTITY_CONFLICT', field: 'business_unit', values: businessUnits, reason: 'MULTIPLE_BUSINESS_UNITS_IN_ONE_TRANSACTION' });
    }

    const projection = {
      transaction_id: txn.transaction_id,
      customer_id: customer.customer_id,
      business_unit: businessUnits.length === 1 ? businessUnits[0] : null,
      event_ids: component.map(({ event }) => event.event_id),
      provider_refs: [...new Set(component.flatMap(({ event }) => providerRefs(event)))],
      identity_issues: issues
    };
    transactions.push(projection);
    for (const { event } of component) {
      eventIdentity.set(event.event_id, {
        transaction_id: projection.transaction_id,
        customer_id: projection.customer_id,
        identity_issues: projection.identity_issues
      });
    }
  }

  return Object.freeze({
    transactions: Object.freeze(transactions.map((transaction) => Object.freeze(transaction))),
    event_identity: eventIdentity
  });
}

function amountMinor(event) {
  const direct = Number(event?.amount_minor);
  if (Number.isFinite(direct)) return direct;
  const legacy = Number(event?.amount_total);
  return Number.isFinite(legacy) ? legacy : null;
}

function transactionReconciliation(component, identity) {
  const issues = [...identity.identity_issues];
  const events = component.map(({ event }) => event);

  const currencies = [...new Set(events.map((event) => text(event.currency).toLowerCase()).filter(Boolean))];
  if (currencies.length > 1) {
    issues.push({ code: 'ECONOMICS_INCOMPLETE', field: 'currency', values: currencies, reason: 'CURRENCY_CONFLICT' });
  }

  const revenueLifecycle = events.filter((event) => ['purchase', 'payment_captured', 'payment_settled'].includes(event.event_type));
  const knownAmounts = [...new Set(revenueLifecycle.map(amountMinor).filter((value) => value !== null))];
  if (knownAmounts.length > 1) {
    issues.push({ code: 'DUPLICATE_CONFLICT', field: 'amount_minor', values: knownAmounts, reason: 'PAYMENT_AMOUNT_CONFLICT' });
  }

  const routeIds = [...new Set(revenueLifecycle.map((event) => text(event.route_id)).filter(Boolean))];
  if (routeIds.length > 1) {
    issues.push({ code: 'ATTRIBUTION_CONFLICT', field: 'route_id', values: routeIds, reason: 'MULTIPLE_REVENUE_ROUTES_FOR_TRANSACTION' });
  }

  const purchaseEvents = events.filter((event) => event.event_type === 'purchase');
  const strongPurchaseEvents = purchaseEvents.filter((event) => event.evidence_strength === 'STRONG' && event.provider && event.provider_transaction_id);
  if (purchaseEvents.length > 0 && strongPurchaseEvents.length !== purchaseEvents.length) {
    issues.push({ code: 'EVIDENCE_MISSING', field: 'purchase', reason: 'PURCHASE_WITHOUT_STRONG_PROVIDER_EVIDENCE' });
  }

  return {
    transaction_id: identity.transaction_id,
    customer_id: identity.customer_id,
    business_unit: identity.business_unit,
    event_ids: events.map((event) => event.event_id),
    event_types: events.map((event) => event.event_type),
    currency: currencies.length === 1 ? currencies[0] : null,
    amount_minor: knownAmounts.length === 1 ? knownAmounts[0] : null,
    route_id: routeIds.length === 1 ? routeIds[0] : null,
    reconciliation_required: issues.some((issue) => issue.code !== 'IDENTITY_UNRESOLVED'),
    issues
  };
}

export function reconcileCanonicalEvents(events = [], { require_ledger_audit = true } = {}) {
  if (!Array.isArray(events)) {
    return Object.freeze({ status: 'INVALID', reconciliation_required: true, issues: Object.freeze([{ code: 'CONTRACT_INVALID', field: '$', reason: 'EVENTS_MUST_BE_ARRAY' }]), transactions: Object.freeze([]) });
  }

  if (require_ledger_audit) {
    const audit = auditCanonicalLedger(events);
    if (!audit.ok) {
      return Object.freeze({
        status: 'INVALID',
        reconciliation_required: true,
        issues: Object.freeze([{ code: 'CONTRACT_INVALID', field: 'ledger', reason: 'LEDGER_INTEGRITY_FAILED', details: audit.errors }]),
        transactions: Object.freeze([])
      });
    }
  }

  const resolved = resolveCanonicalIdentities(events);
  const byEventId = new Map(events.map((event, index) => [event.event_id, { index, event }]));
  const transactions = [];
  for (const identity of resolved.transactions) {
    const component = identity.event_ids.map((eventId) => byEventId.get(eventId)).filter(Boolean);
    transactions.push(transactionReconciliation(component, identity));
  }

  const blockingIssues = transactions.flatMap((transaction) => transaction.issues.filter((issue) => issue.code !== 'IDENTITY_UNRESOLVED'));
  return Object.freeze({
    status: blockingIssues.length > 0 ? 'RECONCILIATION_REQUIRED' : 'SYNCED',
    reconciliation_required: blockingIssues.length > 0,
    event_count: events.length,
    transaction_count: transactions.length,
    unresolved_customer_count: transactions.filter((transaction) => !transaction.customer_id).length,
    issues: Object.freeze(blockingIssues),
    transactions: Object.freeze(transactions.map((transaction) => Object.freeze(transaction)))
  });
}

export async function reconcileCanonicalLedger(ledgerFile) {
  const events = await readCanonicalLedger(ledgerFile);
  return reconcileCanonicalEvents(events, { require_ledger_audit: true });
}
