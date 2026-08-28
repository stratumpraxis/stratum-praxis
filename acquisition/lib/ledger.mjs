// PHASE 9 - the unified distribution ledger.
//
// The existing trend-video-engine/publish-ledger.json is the video lane's source of
// truth and is NOT modified, moved, or replaced. This module ADAPTS it into a common
// record shape so video and image/text distribution can finally be compared side by
// side, and stores acquisition-owned records in acquisition/distribution-ledger.json.
//
// Records are append-only and keyed by ledger_id. Downstream funnel counters default
// to null, which means NOT_MEASURED - never 0.

import { FUNNEL_STAGES } from './taxonomy.mjs';
import { isMeasured, isPlainObject, nowIso, parseUrl, readJson, writeJson } from './util.mjs';

export const LEDGER_VERSION = 1;

/** Buffer statuses that prove the post actually went out, versus ones that do not. */
const SENT_STATES = new Set(['sent']);
const IN_FLIGHT_STATES = new Set(['attempted', 'accepted', 'buffer', 'scheduled', 'sending', 'unknown']);
const FAILED_STATES = new Set(['error', 'rejected', 'failed']);

export function normalizeExternalStatus(raw) {
  const status = String(raw || '').toLowerCase();
  if (SENT_STATES.has(status)) return 'PUBLISHED';
  if (FAILED_STATES.has(status)) return 'ERROR';
  if (IN_FLIGHT_STATES.has(status)) return 'IN_FLIGHT';
  return 'UNKNOWN';
}

/** Extract attribution parameters from a URL; null when the link carries none. */
function readUtm(url) {
  if (!url) return null;
  const found = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'asset_id']
    .map((key) => [key, url.searchParams.get(key)])
    .filter(([, value]) => value !== null));
  return Object.keys(found).length ? found : null;
}

export function emptyFunnel() {
  return {
    downstream_views: null,
    cta_clicks: null,
    checkout: null,
    purchase: null,
    measurement_source: null,
    measured_at: null
  };
}

/** Canonical record shape shared by every distribution lane. */
export function makeRecord(input) {
  return {
    ledger_id: input.ledger_id,
    lane: input.lane,                     // 'acquisition' | 'trend-video-engine'
    platform: String(input.platform || '').toLowerCase(),
    asset: input.asset ?? 'UNKNOWN',
    campaign: input.campaign ?? 'UNKNOWN',
    post_id: input.post_id ?? null,
    published_at: input.published_at ?? null,
    destination: input.destination ?? 'UNKNOWN',
    utm: isPlainObject(input.utm) ? input.utm : null,
    // PRESENT: the destination link carries attribution.
    // NONE_HISTORICAL: it does not, and that is the historical truth for this post.
    // Never back-fill attribution onto a post that was published without it.
    attribution_state: input.attribution_state
      ?? (isPlainObject(input.utm) && input.utm.utm_source ? 'PRESENT' : 'NONE_HISTORICAL'),
    status: input.status,                 // PUBLISHED | IN_FLIGHT | ERROR | UNKNOWN
    external_link: input.external_link ?? null,
    verification_time: input.verification_time ?? null,
    error: input.error ?? null,
    funnel: { ...emptyFunnel(), ...(isPlainObject(input.funnel) ? input.funnel : {}) },
    source_ref: input.source_ref ?? null,
    recorded_at: input.recorded_at ?? nowIso()
  };
}

/**
 * Read-only adapter over trend-video-engine/publish-ledger.json.
 * The video ledger's own file is never written by this module.
 */
export function adaptTrendVideoLedger(videoLedger, { sourceFile = 'trend-video-engine/publish-ledger.json' } = {}) {
  const records = [];
  const items = isPlainObject(videoLedger?.items) ? videoLedger.items : {};
  for (const [manifestId, services] of Object.entries(items)) {
    if (!isPlainObject(services)) continue;
    for (const [service, entry] of Object.entries(services)) {
      if (service.startsWith('_') || !isPlainObject(entry)) continue;
      const status = normalizeExternalStatus(entry.status);
      const destination = entry.externalLink || entry.videoUrl || 'UNKNOWN';
      const url = parseUrl(destination);
      records.push(makeRecord({
        ledger_id: `tve:${manifestId}:${service}`,
        lane: 'trend-video-engine',
        platform: service,
        asset: manifestId,
        campaign: 'UNKNOWN',
        post_id: entry.postId ?? null,
        published_at: entry.sentAt ?? null,
        destination,
        utm: readUtm(url),
        status,
        external_link: entry.externalLink ?? null,
        verification_time: entry.at ?? null,
        error: entry.message ?? entry.verifyError ?? null,
        source_ref: `${sourceFile}#${manifestId}.${service}`,
        recorded_at: entry.at ?? null
      }));
    }
  }
  return records.sort((a, b) => a.ledger_id.localeCompare(b.ledger_id));
}

/** Append-only upsert keyed by ledger_id. Existing evidence is never silently dropped. */
export function appendRecord(ledger, record) {
  const items = Array.isArray(ledger.records) ? [...ledger.records] : [];
  const index = items.findIndex((r) => r.ledger_id === record.ledger_id);
  if (index === -1) {
    items.push(record);
  } else {
    const prior = items[index];
    items[index] = {
      ...prior,
      ...record,
      funnel: { ...prior.funnel, ...record.funnel },
      history: [...(prior.history || []), { at: nowIso(), from_status: prior.status, to_status: record.status }]
    };
  }
  return { ...ledger, version: LEDGER_VERSION, records: items };
}

/**
 * Attach measured funnel numbers to a record.
 * Refuses to record a purchase without a payment-evidence reference - the single
 * most important guard in this file.
 */
export function recordMeasurement(ledger, ledgerId, measurement) {
  const index = (ledger.records || []).findIndex((r) => r.ledger_id === ledgerId);
  if (index === -1) throw new Error(`unknown ledger_id ${ledgerId}`);
  if (isMeasured(measurement.purchase) && measurement.purchase > 0 && !measurement.purchase_evidence) {
    throw new Error(`refusing to record ${measurement.purchase} purchase(s) for ${ledgerId} without purchase_evidence from a payment provider`);
  }
  if (!measurement.measurement_source) {
    throw new Error(`refusing to record measurement for ${ledgerId} without measurement_source`);
  }
  const records = [...ledger.records];
  records[index] = {
    ...records[index],
    funnel: {
      ...records[index].funnel,
      ...measurement,
      measured_at: measurement.measured_at || nowIso()
    }
  };
  return { ...ledger, records };
}

/** Merge acquisition-owned records with the adapted video-lane view for reporting. */
export function unifiedView(acquisitionLedger, adaptedRecords) {
  const own = Array.isArray(acquisitionLedger?.records) ? acquisitionLedger.records : [];
  const seen = new Set(own.map((r) => r.ledger_id));
  return [...own, ...adaptedRecords.filter((r) => !seen.has(r.ledger_id))];
}

/** Funnel roll-up that keeps NOT_MEASURED distinct from zero at every stage. */
export const LEDGER_STAGE_FIELDS = Object.freeze({
  destination_view: 'downstream_views',
  primary_cta_click: 'cta_clicks',
  checkout: 'checkout',
  purchase: 'purchase'
});

export function summarize(records) {
  const stages = {};
  // Stages the ledger does not carry a column for are NOT_INSTRUMENTED, which is a
  // different statement from "instrumented and nothing was measured".
  for (const stage of FUNNEL_STAGES) {
    stages[stage] = LEDGER_STAGE_FIELDS[stage]
      ? { measured: 0, total: 0, not_measured: 0 }
      : { instrumented: false, total: 'NOT_INSTRUMENTED' };
  }
  for (const record of records) {
    for (const [stage, field] of Object.entries(LEDGER_STAGE_FIELDS)) {
      const value = record.funnel?.[field];
      if (isMeasured(value)) {
        stages[stage].measured += 1;
        stages[stage].total += value;
      } else {
        stages[stage].not_measured += 1;
      }
    }
  }
  for (const stage of Object.keys(LEDGER_STAGE_FIELDS)) {
    if (stages[stage].measured === 0) stages[stage].total = 'NOT_MEASURED';
  }
  const published = records.filter((r) => r.status === 'PUBLISHED');
  const unattributedPublished = published.filter((r) => r.attribution_state !== 'PRESENT');

  return {
    records: records.length,
    published: published.length,
    attribution: {
      published_with_attribution: published.length - unattributedPublished.length,
      published_without_attribution: unattributedPublished.length,
      unattributed_ledger_ids: unattributedPublished.map((r) => r.ledger_id),
      note: 'A published post without attribution cannot be traced to a destination or a funnel stage. '
        + 'These are recorded as NONE_HISTORICAL and are never back-filled: the absence is the historical truth.'
    },
    in_flight: records.filter((r) => r.status === 'IN_FLIGHT').length,
    errored: records.filter((r) => r.status === 'ERROR').length,
    unknown: records.filter((r) => r.status === 'UNKNOWN').length,
    stages
  };
}

export async function loadLedger(file = 'acquisition/distribution-ledger.json') {
  try {
    const ledger = await readJson(file);
    return { version: LEDGER_VERSION, records: [], ...ledger };
  } catch (error) {
    if (error.code === 'ENOENT') return { version: LEDGER_VERSION, records: [] };
    throw error;
  }
}

export async function saveLedger(ledger, file = 'acquisition/distribution-ledger.json') {
  await writeJson(file, { ...ledger, version: LEDGER_VERSION, updated_at: nowIso() });
}
