// PHASE 8 - the distribution queue and its state machine.
//
// The states are kept strictly distinct. In particular:
//   - sending a request is not PUBLISHED
//   - PUBLISHED is not VERIFIED
//   - nothing is ever marked purchased here; purchases live in the ledger and
//     require payment-provider evidence.

import { APPROVAL_STATES, QUEUE_STATES, QUEUE_TRANSITIONS } from './taxonomy.mjs';
import { isPlainObject, nowIso, readJson, writeJson } from './util.mjs';
import { evaluateItem, evaluateQueue } from './safety.mjs';

const REQUIRED_FIELDS = [
  'queue_id',
  'platform',
  'asset_id',
  'content_angle',
  'cta',
  'destination_url',
  'utm_parameters',
  'safety_status',
  'approval_status',
  'status'
];

export const SAFETY_STATUSES = Object.freeze(['UNCHECKED', 'PASSED', 'BLOCKED']);

export function canTransition(from, to) {
  if (!QUEUE_STATES.includes(from) || !QUEUE_STATES.includes(to)) return false;
  return (QUEUE_TRANSITIONS[from] || []).includes(to);
}

/** Structural validation. Safety validation is separate (lib/safety.mjs). */
export function validateItem(item) {
  const errors = [];
  const label = isPlainObject(item) && item.queue_id ? item.queue_id : 'unnamed-item';
  if (!isPlainObject(item)) return [`${label}: queue item must be an object`];

  for (const field of REQUIRED_FIELDS) {
    if (item[field] === undefined) errors.push(`${label}: missing required field ${field}`);
  }
  if (typeof item.queue_id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(item.queue_id || '')) {
    errors.push(`${label}: queue_id must be lowercase kebab-case`);
  }
  if (!QUEUE_STATES.includes(item.status)) errors.push(`${label}: unknown status ${item.status}`);
  if (!SAFETY_STATUSES.includes(item.safety_status)) errors.push(`${label}: unknown safety_status ${item.safety_status}`);
  if (!APPROVAL_STATES.includes(item.approval_status)) errors.push(`${label}: unknown approval_status ${item.approval_status}`);
  if (!isPlainObject(item.utm_parameters)) errors.push(`${label}: utm_parameters must be an object`);

  // State preconditions. These are what stop a request from masquerading as a result.
  if (['READY', 'SCHEDULED', 'PUBLISHED', 'VERIFIED'].includes(item.status) && item.safety_status !== 'PASSED') {
    errors.push(`${label}: status ${item.status} requires safety_status PASSED`);
  }
  if (['SCHEDULED', 'PUBLISHED', 'VERIFIED'].includes(item.status) && item.approval_status !== 'HUMAN_APPROVED') {
    errors.push(`${label}: status ${item.status} requires approval_status HUMAN_APPROVED`);
  }
  if (item.status === 'SCHEDULED' && !item.scheduled_at) {
    errors.push(`${label}: SCHEDULED requires scheduled_at`);
  }
  if (item.status === 'PUBLISHED') {
    if (!item.external_post_id) errors.push(`${label}: PUBLISHED requires external_post_id; a sent request is not a publication`);
    if (!item.published_at) errors.push(`${label}: PUBLISHED requires published_at`);
  }
  if (item.status === 'VERIFIED') {
    if (!item.external_post_id) errors.push(`${label}: VERIFIED requires external_post_id`);
    if (!isPlainObject(item.verification_status)) {
      errors.push(`${label}: VERIFIED requires a verification_status object`);
    } else {
      if (item.verification_status.verified !== true) errors.push(`${label}: VERIFIED requires verification_status.verified === true`);
      if (!item.verification_status.checked_at) errors.push(`${label}: VERIFIED requires verification_status.checked_at`);
      if (!item.verification_status.evidence) errors.push(`${label}: VERIFIED requires verification_status.evidence`);
    }
  }
  if (item.status === 'ERROR' && !item.error) errors.push(`${label}: ERROR requires an error description`);

  if (item.history !== undefined && !Array.isArray(item.history)) {
    errors.push(`${label}: history must be an array when present`);
  }
  return errors;
}

export function validateQueue(queue) {
  if (!isPlainObject(queue) || !Array.isArray(queue.items)) {
    return ['queue must be an object with an items array'];
  }
  const errors = [];
  const seen = new Set();
  for (const item of queue.items) {
    const id = isPlainObject(item) ? item.queue_id : undefined;
    if (id !== undefined) {
      if (seen.has(id)) errors.push(`${id}: duplicate queue_id`);
      seen.add(id);
    }
    errors.push(...validateItem(item));
  }
  return errors;
}

/**
 * Advance one item. Returns a NEW item; the caller decides whether to persist.
 * Transitions are refused rather than forced, and every change is appended to history.
 */
export function transition(item, to, { reason = '', at = nowIso(), patch = {} } = {}) {
  const from = item?.status;
  if (!canTransition(from, to)) {
    throw new Error(`illegal transition ${from} -> ${to} for ${item?.queue_id}`);
  }
  const next = {
    ...item,
    ...patch,
    status: to,
    history: [...(item.history || []), { from, to, at, reason }]
  };
  const errors = validateItem(next);
  if (errors.length) {
    const error = new Error(`transition ${from} -> ${to} would produce an invalid item`);
    error.errors = errors;
    throw error;
  }
  return next;
}

/** Run the safety gate on a DRAFT/SAFETY_CHECK item and move it to READY or ERROR. */
export function runSafetyGate(item, context) {
  const verdict = evaluateItem(item, context);
  const staged = item.status === 'DRAFT'
    ? transition(item, 'SAFETY_CHECK', { reason: 'entering safety gate', patch: { safety_status: 'UNCHECKED' } })
    : item;

  if (!verdict.ok) {
    return {
      item: transition(staged, 'ERROR', {
        reason: 'safety gate blocked',
        patch: { safety_status: 'BLOCKED', error: verdict.blocks.join('; ') }
      }),
      verdict
    };
  }
  return {
    item: transition(staged, 'READY', {
      reason: verdict.human_required.length
        ? 'safety passed; publication requires a human step'
        : 'safety passed',
      patch: { safety_status: 'PASSED' }
    }),
    verdict
  };
}

export async function loadQueue(file = 'acquisition/distribution-queue.json') {
  const queue = await readJson(file);
  const errors = validateQueue(queue);
  if (errors.length) {
    const error = new Error(`distribution queue is invalid (${errors.length} problem(s))`);
    error.errors = errors;
    throw error;
  }
  return queue;
}

export async function saveQueue(queue, file = 'acquisition/distribution-queue.json') {
  const errors = validateQueue(queue);
  if (errors.length) {
    const error = new Error('refusing to save an invalid queue');
    error.errors = errors;
    throw error;
  }
  await writeJson(file, { ...queue, updated_at: nowIso() });
}

export { evaluateQueue };
