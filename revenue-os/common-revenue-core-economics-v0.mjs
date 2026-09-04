import { readCanonicalLedger } from './common-revenue-core-ledger-v0.mjs';
import { reconcileCanonicalEvents } from './common-revenue-core-identity-reconciliation-v0.mjs';

export const ECONOMICS_VERSION = 'common-revenue-economics-v0';
export const ECONOMICS_STATUSES = Object.freeze([
  'COMPLETE',
  'PARTIAL',
  'UNAVAILABLE',
  'RECONCILIATION_REQUIRED'
]);

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw']);
const TWO_DECIMAL_CURRENCIES = new Set(['usd', 'eur', 'gbp', 'aud', 'cad', 'nzd']);

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function finiteInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function firstInteger(...values) {
  for (const value of values) {
    const number = finiteInteger(value);
    if (number !== null) return number;
  }
  return null;
}

function currencyExponent(currency) {
  const normalized = text(currency).toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) return 0;
  if (TWO_DECIMAL_CURRENCIES.has(normalized)) return 2;
  return null;
}

function formatMinor(minor, currency) {
  if (minor === null) return null;
  const exponent = currencyExponent(currency);
  if (exponent === null) return null;
  if (exponent === 0) return String(minor);
  const negative = minor < 0;
  const absolute = Math.abs(minor);
  const scale = 10 ** exponent;
  const whole = Math.floor(absolute / scale);
  const fraction = String(absolute % scale).padStart(exponent, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

function sumExactAmounts(events, fieldNames) {
  let found = false;
  let sum = 0;
  for (const event of events) {
    const amount = firstInteger(...fieldNames.map((field) => event?.[field]));
    if (amount === null) continue;
    found = true;
    sum += amount;
  }
  return found ? sum : null;
}

function stateKnown(events, field) {
  return events.some((event) => event?.[field] === true);
}

function lifecycleGross(events) {
  const priorities = ['payment_settled', 'payment_captured', 'purchase'];
  for (const eventType of priorities) {
    const amounts = events
      .filter((event) => event?.event_type === eventType)
      .map((event) => firstInteger(event?.amount_minor, event?.amount_total))
      .filter((value) => value !== null);
    if (amounts.length === 0) continue;
    const unique = [...new Set(amounts)];
    return unique.length === 1 ? unique[0] : null;
  }
  return null;
}

function refundAmount(events) {
  const refundEvents = events.filter((event) => event?.event_type === 'refund');
  if (refundEvents.length > 0) {
    const amounts = refundEvents.map((event) => firstInteger(event?.amount_minor, event?.refund_amount_minor));
    if (amounts.some((value) => value === null)) return null;
    return amounts.reduce((sum, value) => sum + value, 0);
  }
  const explicitTotal = firstInteger(...events.map((event) => event?.refund_total_minor));
  if (explicitTotal !== null) return explicitTotal;
  return stateKnown(events, 'refund_state_known') ? 0 : null;
}

function chargebackAmount(events) {
  const chargebackEvents = events.filter((event) => event?.event_type === 'chargeback');
  if (chargebackEvents.length > 0) {
    const amounts = chargebackEvents.map((event) => firstInteger(event?.amount_minor, event?.chargeback_amount_minor));
    if (amounts.some((value) => value === null)) return null;
    return amounts.reduce((sum, value) => sum + value, 0);
  }
  const explicitTotal = firstInteger(...events.map((event) => event?.chargeback_total_minor));
  if (explicitTotal !== null) return explicitTotal;
  return stateKnown(events, 'chargeback_state_known') ? 0 : null;
}

function providerFeeAmount(events) {
  const explicitTotal = firstInteger(...events.map((event) => event?.provider_fee_total_minor));
  if (explicitTotal !== null) return explicitTotal;
  if (!stateKnown(events, 'provider_fee_state_known')) return null;
  return sumExactAmounts(events, ['provider_fee_amount_minor', 'provider_fee_minor']) ?? 0;
}

function variableCostAmount(events) {
  const explicitTotal = firstInteger(...events.map((event) => event?.variable_cost_total_minor));
  if (explicitTotal !== null) return explicitTotal;
  if (!stateKnown(events, 'variable_cost_state_known')) return null;
  return sumExactAmounts(events, ['variable_cost_amount_minor', 'variable_cost_minor']) ?? 0;
}

function transactionEconomics(transaction, events) {
  if (transaction.reconciliation_required) {
    return Object.freeze({
      economics_version: ECONOMICS_VERSION,
      transaction_id: transaction.transaction_id,
      customer_id: transaction.customer_id,
      business_unit: transaction.business_unit,
      currency: transaction.currency,
      economics_status: 'RECONCILIATION_REQUIRED',
      gross_revenue_amount_minor: null,
      refund_amount_minor: null,
      chargeback_amount_minor: null,
      provider_fee_amount_minor: null,
      variable_cost_amount_minor: null,
      net_revenue_amount_minor: null,
      contribution_profit_amount_minor: null,
      gross_revenue_amount: null,
      refund_amount: null,
      chargeback_amount: null,
      provider_fee_amount: null,
      variable_cost_amount: null,
      net_revenue_amount: null,
      contribution_profit_amount: null,
      unknown_fields: Object.freeze([]),
      evidence_ref: Object.freeze([...new Set(events.map((event) => text(event.evidence_ref)).filter(Boolean))]),
      issues: Object.freeze(transaction.issues || [])
    });
  }

  const currency = text(transaction.currency).toLowerCase() || null;
  const gross = lifecycleGross(events);
  const refunds = refundAmount(events);
  const chargebacks = chargebackAmount(events);
  const providerFees = providerFeeAmount(events);
  const variableCosts = variableCostAmount(events);

  const unknownFields = [];
  if (gross === null) unknownFields.push('gross_revenue_amount');
  if (refunds === null) unknownFields.push('refund_amount');
  if (chargebacks === null) unknownFields.push('chargeback_amount');
  if (providerFees === null) unknownFields.push('provider_fee_amount');
  if (variableCosts === null) unknownFields.push('variable_cost_amount');

  const netRevenue = [gross, refunds, chargebacks, providerFees].every((value) => value !== null)
    ? gross - refunds - chargebacks - providerFees
    : null;
  const contributionProfit = netRevenue !== null && variableCosts !== null
    ? netRevenue - variableCosts
    : null;

  const economicsStatus = gross === null
    ? 'UNAVAILABLE'
    : unknownFields.length === 0
      ? 'COMPLETE'
      : 'PARTIAL';

  return Object.freeze({
    economics_version: ECONOMICS_VERSION,
    transaction_id: transaction.transaction_id,
    customer_id: transaction.customer_id,
    business_unit: transaction.business_unit,
    currency,
    economics_status: economicsStatus,
    gross_revenue_amount_minor: gross,
    refund_amount_minor: refunds,
    chargeback_amount_minor: chargebacks,
    provider_fee_amount_minor: providerFees,
    variable_cost_amount_minor: variableCosts,
    net_revenue_amount_minor: netRevenue,
    contribution_profit_amount_minor: contributionProfit,
    gross_revenue_amount: formatMinor(gross, currency),
    refund_amount: formatMinor(refunds, currency),
    chargeback_amount: formatMinor(chargebacks, currency),
    provider_fee_amount: formatMinor(providerFees, currency),
    variable_cost_amount: formatMinor(variableCosts, currency),
    net_revenue_amount: formatMinor(netRevenue, currency),
    contribution_profit_amount: formatMinor(contributionProfit, currency),
    unknown_fields: Object.freeze(unknownFields),
    evidence_ref: Object.freeze([...new Set(events.map((event) => text(event.evidence_ref)).filter(Boolean))]),
    issues: Object.freeze([])
  });
}

export function projectCanonicalEconomics(events = []) {
  const reconciliation = reconcileCanonicalEvents(events, { require_ledger_audit: true });
  if (reconciliation.status === 'INVALID') {
    return Object.freeze({
      status: 'INVALID',
      economics_version: ECONOMICS_VERSION,
      reconciliation_status: reconciliation.status,
      transaction_count: 0,
      complete_transaction_count: 0,
      partial_transaction_count: 0,
      unavailable_transaction_count: 0,
      reconciliation_required_transaction_count: 0,
      transactions: Object.freeze([]),
      issues: reconciliation.issues
    });
  }

  const eventById = new Map(events.map((event) => [event.event_id, event]));
  const transactions = reconciliation.transactions.map((transaction) => {
    const transactionEvents = transaction.event_ids.map((eventId) => eventById.get(eventId)).filter(Boolean);
    return transactionEconomics(transaction, transactionEvents);
  });

  return Object.freeze({
    status: reconciliation.reconciliation_required ? 'RECONCILIATION_REQUIRED' : 'READY',
    economics_version: ECONOMICS_VERSION,
    reconciliation_status: reconciliation.status,
    transaction_count: transactions.length,
    complete_transaction_count: transactions.filter((transaction) => transaction.economics_status === 'COMPLETE').length,
    partial_transaction_count: transactions.filter((transaction) => transaction.economics_status === 'PARTIAL').length,
    unavailable_transaction_count: transactions.filter((transaction) => transaction.economics_status === 'UNAVAILABLE').length,
    reconciliation_required_transaction_count: transactions.filter((transaction) => transaction.economics_status === 'RECONCILIATION_REQUIRED').length,
    transactions: Object.freeze(transactions),
    issues: reconciliation.issues
  });
}

export function rollupCanonicalEconomics(events = []) {
  const projection = projectCanonicalEconomics(events);
  if (projection.status === 'INVALID') return projection;

  const perCurrency = new Map();
  for (const transaction of projection.transactions) {
    if (!transaction.currency) continue;
    if (!perCurrency.has(transaction.currency)) {
      perCurrency.set(transaction.currency, {
        currency: transaction.currency,
        transaction_count: 0,
        complete_transaction_count: 0,
        partial_or_blocked_transaction_count: 0,
        gross_revenue_known_minor: 0,
        contribution_profit_known_minor: 0,
        all_economics_complete: true
      });
    }
    const bucket = perCurrency.get(transaction.currency);
    bucket.transaction_count += 1;
    if (transaction.gross_revenue_amount_minor !== null) bucket.gross_revenue_known_minor += transaction.gross_revenue_amount_minor;
    if (transaction.economics_status === 'COMPLETE') {
      bucket.complete_transaction_count += 1;
      bucket.contribution_profit_known_minor += transaction.contribution_profit_amount_minor;
    } else {
      bucket.partial_or_blocked_transaction_count += 1;
      bucket.all_economics_complete = false;
    }
  }

  const rollups = [...perCurrency.values()].map((bucket) => Object.freeze({
    ...bucket,
    contribution_profit_amount_minor: bucket.all_economics_complete ? bucket.contribution_profit_known_minor : null,
    contribution_profit_amount: bucket.all_economics_complete
      ? formatMinor(bucket.contribution_profit_known_minor, bucket.currency)
      : null
  }));

  const currencies = rollups.map((rollup) => rollup.currency);
  return Object.freeze({
    ...projection,
    per_currency: Object.freeze(rollups),
    portfolio_currency: currencies.length === 1 ? currencies[0] : null,
    portfolio_contribution_profit_amount_minor: currencies.length === 1 && rollups[0]?.all_economics_complete
      ? rollups[0].contribution_profit_amount_minor
      : null,
    portfolio_contribution_profit_amount: currencies.length === 1 && rollups[0]?.all_economics_complete
      ? rollups[0].contribution_profit_amount
      : null,
    cross_currency_aggregation: currencies.length > 1 ? 'DISALLOWED_WITHOUT_EXPLICIT_FX' : 'NOT_REQUIRED'
  });
}

export async function projectCanonicalLedgerEconomics(ledgerFile) {
  const events = await readCanonicalLedger(ledgerFile);
  return rollupCanonicalEconomics(events);
}
