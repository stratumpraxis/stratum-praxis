// B2B Buyer Reaction Ledger - evidence-backed movement from acquisition to revenue.
//
// This layer sits between demand routing and the distribution/payment ledgers. It does
// not infer a sale from traffic. It records observed buyer-side reactions and converts
// them into an auditable revenue distance. Payment is distance 0 only when payment
// evidence exists.

import { nowIso, readJson, writeJson } from './util.mjs';

export const BUYER_REACTION_VERSION = 1;

export const BUYER_STAGES = Object.freeze([
  'visit',
  'business_use',
  'problem_fit',
  'buying_condition',
  'offer',
  'qualified_action',
  'checkout',
  'contract',
  'payment_evidence'
]);

const STAGE_INDEX = new Map(BUYER_STAGES.map((stage, index) => [stage, index]));
const EVIDENCE_REQUIRED_FROM = STAGE_INDEX.get('qualified_action');
const DISALLOWED_IDENTITY_FIELDS = new Set([
  'email', 'email_address', 'phone', 'phone_number', 'full_name', 'first_name', 'last_name'
]);

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

function cleanStrings(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(cleanString).filter(Boolean))];
}

function assertNoDirectPersonalIdentity(input) {
  for (const key of Object.keys(input || {})) {
    if (DISALLOWED_IDENTITY_FIELDS.has(key)) {
      throw new Error(`buyer reaction must use opaque buyer_key/company_key; direct identity field ${key} is not allowed`);
    }
  }
}

export function revenueDistance(stage) {
  const index = STAGE_INDEX.get(stage);
  if (index === undefined) throw new Error(`unknown buyer stage ${stage}`);
  return BUYER_STAGES.length - 1 - index;
}

export function nextBuyerStage(stage) {
  const index = STAGE_INDEX.get(stage);
  if (index === undefined) throw new Error(`unknown buyer stage ${stage}`);
  return BUYER_STAGES[index + 1] ?? null;
}

/**
 * Convert one observed reaction into the canonical append-only record shape.
 * buyer_key/company_key are intentionally opaque identifiers; names, email addresses
 * and phone numbers do not belong in this acquisition evidence ledger.
 */
export function makeBuyerReaction(input) {
  if (!input || typeof input !== 'object') throw new Error('buyer reaction must be an object');
  assertNoDirectPersonalIdentity(input);

  const eventId = cleanString(input.event_id);
  const buyerKey = cleanString(input.buyer_key);
  const stage = cleanString(input.stage)?.toLowerCase();
  if (!eventId) throw new Error('event_id is required');
  if (!buyerKey) throw new Error('buyer_key is required');
  if (!STAGE_INDEX.has(stage)) throw new Error(`unknown buyer stage ${stage}`);

  const evidenceRef = cleanString(input.evidence_ref);
  const evidenceSource = cleanString(input.evidence_source);
  if (STAGE_INDEX.get(stage) >= EVIDENCE_REQUIRED_FROM && (!evidenceRef || !evidenceSource)) {
    throw new Error(`${stage} requires evidence_ref and evidence_source`);
  }
  if (stage === 'payment_evidence' && !/^stripe:|^payment:|^invoice:|^bank:|^provider:/i.test(evidenceRef || '')) {
    throw new Error('payment_evidence requires a payment-provider evidence_ref (stripe:, payment:, invoice:, bank:, or provider:)');
  }

  const occurredAt = cleanString(input.occurred_at);
  if (!occurredAt) throw new Error('occurred_at is required');
  if (Number.isNaN(Date.parse(occurredAt))) throw new Error('occurred_at must be an ISO-compatible date/time');

  return {
    event_id: eventId,
    buyer_key: buyerKey,
    company_key: cleanString(input.company_key),
    stage,
    revenue_distance: revenueDistance(stage),
    problem_keys: cleanStrings(input.problem_keys),
    buying_conditions: cleanStrings(input.buying_conditions),
    offer_asset_id: cleanString(input.offer_asset_id),
    revenue_route_id: cleanString(input.revenue_route_id),
    source_ledger_id: cleanString(input.source_ledger_id),
    evidence_ref: evidenceRef,
    evidence_source: evidenceSource,
    occurred_at: new Date(occurredAt).toISOString(),
    recorded_at: cleanString(input.recorded_at) || nowIso()
  };
}

function stableComparable(record) {
  const { recorded_at: _recordedAt, ...rest } = record;
  return JSON.stringify(rest);
}

/**
 * Append-only by event_id. Exact retries are idempotent; conflicting reuse of an
 * event_id is refused so historical buyer evidence cannot be silently rewritten.
 */
export function appendBuyerReaction(ledger, input) {
  const record = makeBuyerReaction(input);
  const records = Array.isArray(ledger?.records) ? [...ledger.records] : [];
  const existing = records.find((item) => item.event_id === record.event_id);
  if (existing) {
    if (stableComparable(existing) === stableComparable(record)) {
      return { ...ledger, version: BUYER_REACTION_VERSION, records };
    }
    throw new Error(`event_id ${record.event_id} already exists with different evidence`);
  }
  records.push(record);
  return { ...ledger, version: BUYER_REACTION_VERSION, records };
}

function compareReactionProgress(a, b) {
  const stageDelta = STAGE_INDEX.get(b.stage) - STAGE_INDEX.get(a.stage);
  if (stageDelta !== 0) return stageDelta;
  return Date.parse(b.occurred_at) - Date.parse(a.occurred_at);
}

/** Highest evidence-backed state for one buyer, regardless of late-arriving lower-stage events. */
export function buyerState(ledger, buyerKey) {
  const records = (ledger?.records || []).filter((record) => record.buyer_key === buyerKey);
  if (!records.length) return null;
  const ranked = [...records].sort(compareReactionProgress);
  const highest = ranked[0];
  return {
    buyer_key: buyerKey,
    company_key: highest.company_key ?? records.find((r) => r.company_key)?.company_key ?? null,
    highest_stage: highest.stage,
    revenue_distance: revenueDistance(highest.stage),
    next_stage: nextBuyerStage(highest.stage),
    problem_keys: [...new Set(records.flatMap((record) => record.problem_keys || []))],
    buying_conditions: [...new Set(records.flatMap((record) => record.buying_conditions || []))],
    offer_asset_ids: [...new Set(records.map((record) => record.offer_asset_id).filter(Boolean))],
    revenue_route_ids: [...new Set(records.map((record) => record.revenue_route_id).filter(Boolean))],
    reaction_count: records.length,
    latest_observed_at: [...records].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))[0].occurred_at,
    payment_evidence: records
      .filter((record) => record.stage === 'payment_evidence')
      .map((record) => ({ evidence_ref: record.evidence_ref, evidence_source: record.evidence_source, occurred_at: record.occurred_at }))
  };
}

/**
 * Revenue-first roll-up. Buyers nearest payment come first; ties prefer the most
 * recently observed reaction. Stage counts are event counts, while buyers_by_stage
 * uses each buyer's highest achieved stage.
 */
export function summarizeBuyerReactions(ledger) {
  const records = Array.isArray(ledger?.records) ? ledger.records : [];
  const buyerKeys = [...new Set(records.map((record) => record.buyer_key).filter(Boolean))];
  const buyers = buyerKeys
    .map((buyerKey) => buyerState({ records }, buyerKey))
    .filter(Boolean)
    .sort((a, b) => a.revenue_distance - b.revenue_distance
      || Date.parse(b.latest_observed_at) - Date.parse(a.latest_observed_at)
      || a.buyer_key.localeCompare(b.buyer_key));

  const stageEvents = Object.fromEntries(BUYER_STAGES.map((stage) => [stage, 0]));
  const buyersByStage = Object.fromEntries(BUYER_STAGES.map((stage) => [stage, 0]));
  for (const record of records) {
    if (stageEvents[record.stage] !== undefined) stageEvents[record.stage] += 1;
  }
  for (const buyer of buyers) buyersByStage[buyer.highest_stage] += 1;

  return {
    version: BUYER_REACTION_VERSION,
    reaction_events: records.length,
    buyers: buyers.length,
    payment_evidence_buyers: buyers.filter((buyer) => buyer.highest_stage === 'payment_evidence').length,
    qualified_or_better_buyers: buyers.filter((buyer) => buyer.revenue_distance <= revenueDistance('qualified_action')).length,
    stage_events: stageEvents,
    buyers_by_highest_stage: buyersByStage,
    priority_buyers: buyers
  };
}

export async function loadBuyerReactionLedger(file = 'acquisition/buyer-reaction-ledger.json') {
  try {
    const ledger = await readJson(file);
    return { version: BUYER_REACTION_VERSION, records: [], ...ledger };
  } catch (error) {
    if (error.code === 'ENOENT') return { version: BUYER_REACTION_VERSION, records: [] };
    throw error;
  }
}

export async function saveBuyerReactionLedger(ledger, file = 'acquisition/buyer-reaction-ledger.json') {
  await writeJson(file, { ...ledger, version: BUYER_REACTION_VERSION });
}
