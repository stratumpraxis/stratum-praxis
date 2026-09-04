import { createHash } from 'node:crypto';
import { appendFile, mkdir, open, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { decidePortfolio } from './common-revenue-core-allocator-nba-v0.mjs';
import { classifyPermission, executeSafeAction } from './common-revenue-core-safe-execution-v0.mjs';

export const RESILIENCE_VERSION = 'common-revenue-resilience-v0';
export const DEFAULT_ACTION_JOURNAL = 'revenue-os/common-revenue-action-journal-v0.jsonl';

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function hash(value) { return createHash('sha256').update(String(value)).digest('hex'); }
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}
function stableStringify(value) { return JSON.stringify(stableValue(value)); }
function actionFingerprint(action) {
  const copy = { ...(action || {}) };
  delete copy.requested_at;
  return hash(stableStringify(copy));
}
async function sleep(ms) { await new Promise((resolve) => setTimeout(resolve, ms)); }

async function acquireJournalLock(lockFile, retries = 5, delayMs = 50) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const handle = await open(lockFile, 'wx');
      await handle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`, 'utf8');
      return handle;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (attempt === retries) throw Object.assign(new Error('action journal lock unavailable'), { code: 'ACTION_JOURNAL_LOCKED' });
      await sleep(delayMs);
    }
  }
  throw Object.assign(new Error('action journal lock unavailable'), { code: 'ACTION_JOURNAL_LOCKED' });
}
async function releaseJournalLock(handle, lockFile) {
  try { await handle?.close(); } catch {}
  try { await rm(lockFile, { force: true }); } catch {}
}

export async function readActionJournal(file = DEFAULT_ACTION_JOURNAL) {
  let raw = '';
  try { raw = await readFile(file, 'utf8'); }
  catch (error) { if (error?.code === 'ENOENT') return []; throw error; }
  const rows = [];
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); }
    catch { throw Object.assign(new Error(`invalid action journal JSONL line ${index + 1}`), { code: 'ACTION_JOURNAL_CORRUPT' }); }
  }
  return rows;
}

export async function appendActionJournal(record, file = DEFAULT_ACTION_JOURNAL) {
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

function previousForAction(rows, actionId) {
  return [...rows].reverse().find((row) => row.action_id === actionId && ['EXECUTED','SKIPPED','BLOCKED','FAILED'].includes(row.status)) || null;
}

function retryAllowed(action, permission, policy) {
  if (permission.level === 'AUTO') return true;
  if (permission.level !== 'LIMITED_AUTO') return false;
  const allow = new Set(Array.isArray(policy?.idempotent_limited_action_types) ? policy.idempotent_limited_action_types : []);
  return allow.has(action.action_type);
}

function retryableFailure(result) {
  if (result?.status !== 'FAILED') return false;
  const code = text(result.error_code) || text(result.receipt?.result_summary).replace(/^ADAPTER_ERROR:/, '');
  return new Set(['PROVIDER_UNAVAILABLE','CORE_UNAVAILABLE','TIMEOUT','RATE_LIMIT','ECONNRESET','ETIMEDOUT']).has(code);
}

export async function executeWithJournal(action, {
  journal_file = DEFAULT_ACTION_JOURNAL,
  adapters = {},
  policy = {},
  approval = null,
  dry_run = false,
  max_attempts = 2,
  lock_retries = 5,
  lock_delay_ms = 50,
  now = () => new Date().toISOString()
} = {}) {
  await mkdir(dirname(journal_file), { recursive: true });
  const lockFile = `${journal_file}.lock`;
  const lockHandle = await acquireJournalLock(lockFile, lock_retries, lock_delay_ms);
  try {
    const rows = await readActionJournal(journal_file);
    const actionId = text(action?.action_id);
    const fingerprint = actionFingerprint(action);
    const prior = previousForAction(rows, actionId);
    if (prior) {
      if (prior.action_fingerprint !== fingerprint) {
        return Object.freeze({ status: 'BLOCKED', reason: 'ACTION_ID_FINGERPRINT_CONFLICT', prior, attempts: 0 });
      }
      if (prior.status === 'EXECUTED' || prior.status === 'SKIPPED') {
        return Object.freeze({ status: 'REPLAY_NOOP', prior, attempts: 0 });
      }
    }

    const permission = classifyPermission(action, policy);
    const attemptsAllowed = retryAllowed(action, permission, policy) ? Math.max(1, Math.min(3, Number(max_attempts) || 1)) : 1;
    let result = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= attemptsAllowed; attempt += 1) {
      attempts = attempt;
      result = await executeSafeAction(action, { adapters, policy, approval, dry_run, now });
      const record = {
        resilience_version: RESILIENCE_VERSION,
        action_id: actionId,
        action_fingerprint: fingerprint,
        attempt,
        permission_level: result.permission?.level || permission.level,
        status: result.receipt?.status || result.status,
        result_status: result.status,
        executed_at: result.receipt?.executed_at || now(),
        evidence_ref: result.receipt?.evidence_ref || [],
        result_summary: result.receipt?.result_summary || null,
        error_code: result.error_code || null
      };
      await appendActionJournal(record, journal_file);
      if (!retryableFailure(result) || attempt === attemptsAllowed) break;
    }
    return Object.freeze({ ...result, attempts });
  } finally {
    await releaseJournalLock(lockHandle, lockFile);
  }
}

export function selectAdapterRoute(action, {
  primary_health = 'HEALTHY',
  fallback_health = 'HEALTHY',
  fallback_action_types = []
} = {}) {
  const permission = classifyPermission(action, {});
  if (permission.level === 'HUMAN_GATE' || permission.level === 'BLOCKED') {
    return Object.freeze({ route: 'NONE', reason: 'SENSITIVE_OR_BLOCKED_ACTION_NO_AUTOMATIC_FAILOVER' });
  }
  if (primary_health === 'HEALTHY') return Object.freeze({ route: 'PRIMARY', reason: 'PRIMARY_HEALTHY' });
  const allowed = new Set(fallback_action_types);
  if (fallback_health === 'HEALTHY' && allowed.has(action.action_type)) {
    return Object.freeze({ route: 'FALLBACK', reason: 'PRIMARY_UNHEALTHY_EXPLICIT_FAILOVER_ALLOWED' });
  }
  return Object.freeze({ route: 'NONE', reason: 'NO_SAFE_HEALTHY_ROUTE' });
}

export async function executeWithFailover(action, {
  primary_adapter = null,
  fallback_adapter = null,
  primary_health = 'HEALTHY',
  fallback_health = 'HEALTHY',
  fallback_action_types = [],
  policy = {},
  approval = null,
  dry_run = false,
  now = () => new Date().toISOString()
} = {}) {
  const selection = selectAdapterRoute(action, { primary_health, fallback_health, fallback_action_types });
  if (selection.route === 'NONE') return Object.freeze({ status: 'BLOCKED', failover: selection });
  const adapter = selection.route === 'PRIMARY' ? primary_adapter : fallback_adapter;
  if (typeof adapter !== 'function') return Object.freeze({ status: 'BLOCKED', failover: selection, reason: 'SELECTED_ADAPTER_MISSING' });
  const result = await executeSafeAction(action, {
    adapters: { [action.business_unit]: adapter }, policy, approval, dry_run, now
  });
  return Object.freeze({ ...result, failover: selection });
}

export function replayDecision(events, storedPortfolio) {
  if (!storedPortfolio?.generated_at) return Object.freeze({ ok: false, reason: 'STORED_GENERATED_AT_REQUIRED' });
  const replayed = decidePortfolio(events, { generated_at: storedPortfolio.generated_at, policy: storedPortfolio.policy || {} });
  const expected = stableStringify({ policy: storedPortfolio.policy, decisions: storedPortfolio.decisions });
  const actual = stableStringify({ policy: replayed.policy, decisions: replayed.decisions });
  return Object.freeze({
    ok: expected === actual,
    expected_fingerprint: hash(expected),
    actual_fingerprint: hash(actual),
    replayed
  });
}

export function assessMigrationPlan(plan = {}) {
  const issues = [];
  if (!text(plan.migration_id)) issues.push('MIGRATION_ID_REQUIRED');
  if (!text(plan.source_snapshot_ref)) issues.push('SOURCE_SNAPSHOT_REQUIRED');
  if (!text(plan.rollback_plan_ref)) issues.push('ROLLBACK_PLAN_REQUIRED');
  if (plan.compatibility_tests_passed !== true) issues.push('COMPATIBILITY_TESTS_REQUIRED');
  if (plan.dry_run_passed !== true) issues.push('DRY_RUN_REQUIRED');
  if (plan.preserve_history !== true) issues.push('HISTORY_PRESERVATION_REQUIRED');
  if (plan.production === true) {
    if (plan.human_approval?.actor_type !== 'human' || !text(plan.human_approval?.approval_ref)) issues.push('HUMAN_APPROVAL_REQUIRED');
  }
  return Object.freeze({
    ready: issues.length === 0,
    status: issues.length === 0 ? 'READY' : 'BLOCKED',
    issues: Object.freeze(issues),
    rule: 'Migration never rewrites canonical history and production cutover requires explicit Human Gate approval.'
  });
}
