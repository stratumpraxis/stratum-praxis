import { createHash } from 'node:crypto';
import { appendFile, mkdir, open, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { validateCanonicalEvent } from './common-revenue-core-schema-v0.mjs';

export const LEDGER_VERSION = 'common-revenue-ledger-v0';
export const DEFAULT_LEDGER_FILE = 'revenue-os/common-revenue-ledger-v0.jsonl';

export class LedgerError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'LedgerError';
    this.code = code;
    this.details = details;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function semanticEvent(event) {
  if (!event || typeof event !== 'object') return event;
  const copy = { ...event };
  delete copy.sync_status;
  delete copy.ledger_version;
  delete copy.ledger_recorded_at;
  delete copy.event_fingerprint;
  return copy;
}

export function eventFingerprint(event) {
  return sha256(stableStringify(semanticEvent(event)));
}

function providerIdentityKey(event) {
  if (!event?.provider || !event?.provider_transaction_id || !event?.event_type) return null;
  return `${event.provider}|${event.provider_transaction_id}|${event.event_type}`;
}

function sourceIdentityKey(event) {
  if (!event?.source || !event?.source_event_id || !event?.event_type) return null;
  return `${event.source}|${event.source_event_id}|${event.event_type}`;
}

function isQaOrAutomation(event) {
  if (event?.qa_flag === true || event?.automation === true) return true;
  const trafficClass = String(event?.traffic_class || '').toUpperCase();
  if (trafficClass === 'EXCLUDED' || trafficClass === 'AUTOMATION' || trafficClass === 'QA') return true;
  const source = String(event?.utm_source || '').toLowerCase();
  return source === 'codex' || source === 'codex_qa' || source.startsWith('qa_') || source.startsWith('automation_');
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock(lockFile, retries, delayMs) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const handle = await open(lockFile, 'wx');
      await handle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`, 'utf8');
      return handle;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (attempt === retries) {
        throw new LedgerError('LEDGER_LOCKED', `ledger lock remained busy after ${retries + 1} bounded attempts`, { lockFile });
      }
      await sleep(delayMs);
    }
  }
  throw new LedgerError('LEDGER_LOCKED', 'unable to acquire ledger lock', { lockFile });
}

async function releaseLock(handle, lockFile) {
  try { await handle?.close(); } catch {}
  try { await rm(lockFile, { force: true }); } catch {}
}

export async function readCanonicalLedger(ledgerFile = DEFAULT_LEDGER_FILE) {
  let raw = '';
  try {
    raw = await readFile(ledgerFile, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const events = [];
  const lines = raw.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      throw new LedgerError('LEDGER_CORRUPT', `invalid JSONL at line ${index + 1}`, { line: index + 1, cause: error.message });
    }
  }
  return events;
}

export function auditCanonicalLedger(events = []) {
  const errors = [];
  const eventIds = new Map();
  const providerKeys = new Map();
  const sourceKeys = new Map();

  for (const [index, event] of events.entries()) {
    const line = index + 1;
    const validation = validateCanonicalEvent(event, { require_trusted_evidence: true });
    if (!validation.ok) {
      errors.push({ code: 'CONTRACT_INVALID', line, event_id: event?.event_id || null, errors: validation.errors });
      continue;
    }
    if (event.sync_status !== 'SYNCED') {
      errors.push({ code: 'LEDGER_SYNC_STATE_INVALID', line, event_id: event.event_id, sync_status: event.sync_status });
    }
    if (event.ledger_version !== LEDGER_VERSION) {
      errors.push({ code: 'LEDGER_VERSION_INVALID', line, event_id: event.event_id, ledger_version: event.ledger_version || null });
    }
    const actualFingerprint = eventFingerprint(event);
    if (event.event_fingerprint !== actualFingerprint) {
      errors.push({ code: 'EVENT_FINGERPRINT_MISMATCH', line, event_id: event.event_id });
    }

    if (eventIds.has(event.event_id)) {
      errors.push({ code: 'DUPLICATE_CONFLICT', line, event_id: event.event_id, first_line: eventIds.get(event.event_id) });
    } else {
      eventIds.set(event.event_id, line);
    }

    const providerKey = providerIdentityKey(event);
    if (providerKey) {
      if (providerKeys.has(providerKey)) {
        errors.push({ code: 'DUPLICATE_CONFLICT', line, provider_key: providerKey, first_line: providerKeys.get(providerKey) });
      } else providerKeys.set(providerKey, line);
    }

    const sourceKey = sourceIdentityKey(event);
    if (sourceKey) {
      if (sourceKeys.has(sourceKey)) {
        errors.push({ code: 'DUPLICATE_CONFLICT', line, source_key: sourceKey, first_line: sourceKeys.get(sourceKey) });
      } else sourceKeys.set(sourceKey, line);
    }
  }

  return Object.freeze({ ok: errors.length === 0, count: events.length, errors: Object.freeze(errors) });
}

export async function appendCanonicalEvents(
  candidates,
  {
    ledgerFile = DEFAULT_LEDGER_FILE,
    now = () => new Date().toISOString(),
    lockRetries = 5,
    lockDelayMs = 100
  } = {}
) {
  if (!Array.isArray(candidates)) {
    throw new LedgerError('CONTRACT_INVALID', 'candidates must be an array');
  }

  await mkdir(dirname(ledgerFile), { recursive: true });
  const lockFile = `${ledgerFile}.lock`;
  const lockHandle = await acquireLock(lockFile, lockRetries, lockDelayMs);

  try {
    const existing = await readCanonicalLedger(ledgerFile);
    const audit = auditCanonicalLedger(existing);
    if (!audit.ok) throw new LedgerError('LEDGER_CORRUPT', 'existing ledger failed integrity audit', audit.errors);

    const byEventId = new Map(existing.map((event) => [event.event_id, event]));
    const byProvider = new Map();
    const bySource = new Map();
    for (const event of existing) {
      const providerKey = providerIdentityKey(event);
      if (providerKey) byProvider.set(providerKey, event);
      const sourceKey = sourceIdentityKey(event);
      if (sourceKey) bySource.set(sourceKey, event);
    }

    const appended = [];
    const duplicateNoops = [];
    const conflicts = [];
    const invalid = [];

    for (const candidate of candidates) {
      const validation = validateCanonicalEvent(candidate, { require_trusted_evidence: true });
      if (!validation.ok) {
        invalid.push({ event_id: candidate?.event_id || null, code: 'CONTRACT_INVALID', errors: validation.errors });
        continue;
      }
      if (candidate.sync_status !== 'PENDING_SYNC') {
        invalid.push({
          event_id: candidate.event_id,
          code: 'CONTRACT_INVALID',
          errors: [{ code: 'CONTRACT_INVALID', field: 'sync_status', message: 'ledger append accepts PENDING_SYNC candidates only' }]
        });
        continue;
      }
      if (isQaOrAutomation(candidate)) {
        invalid.push({
          event_id: candidate.event_id,
          code: 'QA_AUTOMATION_EXCLUDED',
          errors: [{ code: 'CONTRACT_INVALID', field: 'traffic_class', message: 'known QA/automation evidence cannot enter Revenue Truth' }]
        });
        continue;
      }

      const fingerprint = eventFingerprint(candidate);
      const existingById = byEventId.get(candidate.event_id);
      if (existingById) {
        if (existingById.event_fingerprint === fingerprint || eventFingerprint(existingById) === fingerprint) {
          duplicateNoops.push({ event_id: candidate.event_id, reason: 'EVENT_ID_ALREADY_SYNCED' });
        } else {
          conflicts.push({ event_id: candidate.event_id, code: 'DUPLICATE_CONFLICT', reason: 'EVENT_ID_CONTENT_MISMATCH' });
        }
        continue;
      }

      const providerKey = providerIdentityKey(candidate);
      if (providerKey && byProvider.has(providerKey)) {
        conflicts.push({
          event_id: candidate.event_id,
          code: 'DUPLICATE_CONFLICT',
          reason: 'PROVIDER_EVENT_ALREADY_SYNCED',
          existing_event_id: byProvider.get(providerKey).event_id
        });
        continue;
      }

      const sourceKey = sourceIdentityKey(candidate);
      if (sourceKey && bySource.has(sourceKey)) {
        conflicts.push({
          event_id: candidate.event_id,
          code: 'DUPLICATE_CONFLICT',
          reason: 'SOURCE_EVENT_ALREADY_SYNCED',
          existing_event_id: bySource.get(sourceKey).event_id
        });
        continue;
      }

      const entry = Object.freeze({
        ...candidate,
        sync_status: 'SYNCED',
        ledger_version: LEDGER_VERSION,
        ledger_recorded_at: now(),
        event_fingerprint: fingerprint
      });
      appended.push(entry);
      byEventId.set(entry.event_id, entry);
      if (providerKey) byProvider.set(providerKey, entry);
      if (sourceKey) bySource.set(sourceKey, entry);
    }

    if (appended.length > 0) {
      const chunk = `${appended.map((event) => JSON.stringify(event)).join('\n')}\n`;
      await appendFile(ledgerFile, chunk, { encoding: 'utf8', flag: 'a' });
    }

    const result = {
      status: conflicts.length > 0 || invalid.length > 0 ? 'RECONCILIATION_REQUIRED' : 'SYNCED',
      ledger_file: ledgerFile,
      existing_count: existing.length,
      appended_count: appended.length,
      duplicate_noop_count: duplicateNoops.length,
      conflict_count: conflicts.length,
      invalid_count: invalid.length,
      appended,
      duplicate_noops: duplicateNoops,
      conflicts,
      invalid
    };
    return Object.freeze(result);
  } finally {
    await releaseLock(lockHandle, lockFile);
  }
}
