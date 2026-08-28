// Issue #53 - evidence record contract, validation and normalization.
//
// Every field the issue names is required. Anything the record does not prove is
// carried as an explicit unknown rather than filled in with a plausible default.

import { EVIDENCE_CLASSES } from '../../lib/taxonomy.mjs';
import { isPlainObject, readJson } from '../../lib/util.mjs';
import { fingerprint, originKey } from './fingerprint.mjs';
import { EVIDENCE_BUCKETS, validateBuckets } from './bucket.mjs';

export const REQUIRED_FIELDS = Object.freeze([
  'signal_id',
  'source_family',
  'evidence_buckets',
  'provider',
  'observed_at',
  'url_or_reference',
  'topic',
  'observation_summary',
  'evidence_class'
]);

const MS_PER_DAY = 86400000;

export async function loadPolicy(file = 'acquisition/signal-intelligence/policy.json') {
  const policy = await readJson(file);
  if (!isPlainObject(policy?.evidence_families)) {
    throw new Error('signal-intelligence policy.json is missing evidence_families');
  }
  return policy;
}

export async function loadProviders(file = 'acquisition/signal-intelligence/providers.json') {
  const providers = await readJson(file);
  if (!isPlainObject(providers?.providers)) {
    throw new Error('signal-intelligence providers.json is missing a providers map');
  }
  return providers;
}

function parseTime(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/**
 * Validate one evidence record against the policy.
 * Returns human-readable problems; an empty array means the record is structurally
 * usable, which is a much weaker statement than "this record is corroborating evidence".
 */
export function validateSignal(record, { policy, providers = null } = {}) {
  const errors = [];
  const label = isPlainObject(record) && record.signal_id ? record.signal_id : 'unnamed-signal';
  if (!isPlainObject(record)) return [`${label}: evidence record must be an object`];

  for (const field of REQUIRED_FIELDS) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      errors.push(`${label}: missing required field ${field}`);
    }
  }

  if (typeof record.signal_id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(record.signal_id || '')) {
    errors.push(`${label}: signal_id must be lowercase kebab-case`);
  }

  const family = policy?.evidence_families?.[record.source_family];
  if (!family) {
    errors.push(`${label}: unknown source_family ${record.source_family}; add it to acquisition/signal-intelligence/policy.json first`);
  }

  errors.push(...validateBuckets(record.evidence_buckets, label));

  if (!EVIDENCE_CLASSES.includes(record.evidence_class)) {
    errors.push(`${label}: evidence_class must be one of ${EVIDENCE_CLASSES.join(', ')}`);
  }

  if (record.observed_at !== undefined && parseTime(record.observed_at) === null) {
    errors.push(`${label}: observed_at must be an ISO timestamp`);
  }

  if (record.confidence !== undefined) {
    const value = record.confidence;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
      errors.push(`${label}: confidence must be a number between 0 and 1 when present`);
    }
  }

  if (record.commercial_intent_indicators !== undefined && !Array.isArray(record.commercial_intent_indicators)) {
    errors.push(`${label}: commercial_intent_indicators must be an array when present`);
  }
  if (record.topic_keys !== undefined && !Array.isArray(record.topic_keys)) {
    errors.push(`${label}: topic_keys must be an array when present`);
  }
  if (record.audience !== undefined && !Array.isArray(record.audience)) {
    errors.push(`${label}: audience must be an array when present`);
  }

  // An OBSERVED record has to say where it was observed. This is the single most
  // load-bearing rule in the file: it is what keeps a guess from being promoted.
  if (record.evidence_class === 'OBSERVED') {
    if (!String(record.url_or_reference || '').trim()) {
      errors.push(`${label}: OBSERVED evidence requires url_or_reference naming where it was read`);
    }
    if (!record.observed_at) {
      errors.push(`${label}: OBSERVED evidence requires observed_at`);
    }
  }

  if (providers) {
    const provider = providers.providers?.[record.provider];
    if (!provider) {
      errors.push(`${label}: provider ${record.provider} is not registered in acquisition/signal-intelligence/providers.json`);
    } else {
      if (Array.isArray(provider.families) && !provider.families.includes(record.source_family)) {
        errors.push(`${label}: provider ${record.provider} is not registered for family ${record.source_family}`);
      }
      if (provider.connection_state === 'CONTRACT_ONLY' && record.evidence_class === 'OBSERVED') {
        errors.push(`${label}: provider ${record.provider} is CONTRACT_ONLY, so it cannot supply OBSERVED evidence; connect it first or record the observation under the provider that actually produced it`);
      }
      if (provider.connection_state === 'BLOCKED') {
        errors.push(`${label}: provider ${record.provider} is BLOCKED and may not supply evidence`);
      }
    }
  }

  return errors;
}

/** Attach derived fields. Never overwrites an operator-declared shared_origin_key. */
export function normalizeSignal(record, { policy, now = Date.now() } = {}) {
  const family = policy?.evidence_families?.[record.source_family] || {};
  const observedAt = parseTime(record.observed_at);
  const ttlDays = Number.isFinite(record.freshness_ttl_days) ? record.freshness_ttl_days : family.ttl_days ?? 90;
  const ageDays = observedAt === null ? null : (now - observedAt) / MS_PER_DAY;
  const expired = ageDays === null ? true : ageDays > ttlDays;

  return {
    ...record,
    evidence_buckets: [...new Set(record.evidence_buckets || [])].filter((b) => EVIDENCE_BUCKETS.includes(b)),
    topic_keys: record.topic_keys || [],
    audience: record.audience || [],
    geography: record.geography ?? 'UNKNOWN',
    language: record.language ?? 'UNKNOWN',
    commercial_intent_indicators: record.commercial_intent_indicators || [],
    rights_policy_notes: record.rights_policy_notes ?? 'UNKNOWN',
    confidence: Number.isFinite(record.confidence) ? record.confidence : null,
    fingerprint: record.fingerprint || fingerprint(record),
    origin_key: originKey(record),
    tier: family.tier ?? null,
    independence_group: family.independence_group ?? `family:${record.source_family}`,
    external: family.external === true,
    freshness: {
      observed_at: record.observed_at ?? null,
      ttl_days: ttlDays,
      age_days: ageDays === null ? null : Number(ageDays.toFixed(2)),
      state: expired ? 'EXPIRED' : 'FRESH'
    }
  };
}

/**
 * Load and normalize the evidence set.
 * Duplicate fingerprints are collapsed idempotently: ingesting the same observation
 * twice must never double the apparent amount of evidence.
 */
export function ingest(records, { policy, providers = null, now = Date.now() } = {}) {
  const accepted = [];
  const rejected = [];
  const duplicates = [];
  const seen = new Map();

  for (const record of records || []) {
    const errors = validateSignal(record, { policy, providers });
    if (errors.length) {
      rejected.push({ signal_id: record?.signal_id ?? 'unnamed-signal', errors });
      continue;
    }
    const normalized = normalizeSignal(record, { policy, now });
    const prior = seen.get(normalized.fingerprint);
    if (prior) {
      duplicates.push({
        signal_id: normalized.signal_id,
        duplicate_of: prior.signal_id,
        fingerprint: normalized.fingerprint,
        reason: 'identical fingerprint; the second record adds no new evidence'
      });
      continue;
    }
    seen.set(normalized.fingerprint, normalized);
    accepted.push(normalized);
  }

  return { accepted, rejected, duplicates };
}

export async function loadSignals(file = 'acquisition/signal-intelligence/signals.json', options = {}) {
  const doc = await readJson(file);
  if (!Array.isArray(doc?.signals)) throw new Error(`${file} must contain a signals array`);
  const policy = options.policy || (await loadPolicy());
  const providers = options.providers === undefined ? await loadProviders() : options.providers;
  return { doc, policy, providers, ...ingest(doc.signals, { policy, providers, now: options.now }) };
}
