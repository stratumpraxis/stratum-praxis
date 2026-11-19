import crypto from 'node:crypto';
import { transition } from './state.mjs';

export const RISK_LEVELS = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);

export const ACTION_RISK = Object.freeze({
  read_data: 'LOW',
  analyze: 'LOW',
  generate_candidates: 'LOW',
  draft_text: 'LOW',
  classify: 'LOW',
  score: 'LOW',
  reuse_plan: 'LOW',
  summarize: 'LOW',
  compare: 'LOW',

  social_post: 'MEDIUM',
  sales_email: 'MEDIUM',
  light_page_edit: 'MEDIUM',
  prospect_followup: 'MEDIUM',

  bulk_send: 'HIGH',
  price_change: 'HIGH',
  contract: 'HIGH',
  payment: 'HIGH',
  key_account_contact: 'HIGH',
  mass_site_delete: 'HIGH',
  brand_change: 'HIGH',
  legal_action: 'HIGH'
});

const REQUIRED_ACTION_FIELDS = Object.freeze([
  'action_type',
  'description',
  'expected_value',
  'target'
]);

function stableId(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export function riskForAction(actionType) {
  return ACTION_RISK[actionType] ?? 'HIGH';
}

export function validateActionInput(action) {
  const errors = [];
  if (!action || typeof action !== 'object') return ['action must be an object'];

  for (const field of REQUIRED_ACTION_FIELDS) {
    if (action[field] === undefined || action[field] === null || action[field] === '') {
      errors.push(`missing required field ${field}`);
    }
  }

  if (action.action_type && !Object.hasOwn(ACTION_RISK, action.action_type)) {
    errors.push(`unknown action_type ${action.action_type}`);
  }

  const expected = Number(action.expected_value);
  if (!Number.isFinite(expected)) errors.push('expected_value must be a finite number');

  if (action.assets !== undefined && !Array.isArray(action.assets)) {
    errors.push('assets must be an array when provided');
  }

  return errors;
}

export function createExecutionProposal(signal, action, {
  now = Date.now(),
  allowMediumAuto = false,
  proposedBy = 'revenue-decision-engine'
} = {}) {
  const errors = validateActionInput(action);
  if (errors.length) return { ok: false, errors };
  if (!signal?.signal_id) return { ok: false, errors: ['signal_id is required'] };
  if (signal.status !== 'ACTIONABLE') {
    return { ok: false, errors: [`proposal requires ACTIONABLE signal, got ${signal.status}`] };
  }

  const risk = riskForAction(action.action_type);
  const approvalRequired = risk === 'HIGH' || (risk === 'MEDIUM' && !allowMediumAuto);
  const executionId = `act_${stableId(JSON.stringify({
    signal_id: signal.signal_id,
    action_type: action.action_type,
    target: action.target,
    assets: action.assets ?? [],
    description: action.description
  }))}`;

  const proposal = {
    execution_id: executionId,
    signal_id: signal.signal_id,
    correlation_id: signal.correlation_id ?? null,
    route_id: signal.route_id ?? null,
    action_type: action.action_type,
    description: action.description,
    expected_value: Number(action.expected_value),
    assets: action.assets ?? [],
    target: action.target,
    payload: action.payload ?? null,
    rationale: action.rationale ?? null,
    risk_level: risk,
    proposed_by: proposedBy,
    proposed_at: new Date(now).toISOString(),
    approval: {
      required: approvalRequired,
      status: approvalRequired ? 'PENDING' : 'NOT_REQUIRED',
      approved_by: null,
      approved_at: null,
      denied_by: null,
      denied_at: null,
      note: null
    },
    execution: {
      status: 'NOT_STARTED',
      attempted_at: null,
      completed_at: null,
      external_ref: null,
      result: null,
      failure: null
    }
  };

  let nextSignal = signal;
  if (approvalRequired) {
    const moved = transition(signal, 'HUMAN_REQUIRED', {
      reason: `${risk} risk action requires human approval`,
      now
    });
    if (!moved.ok) return { ok: false, errors: [moved.reason] };
    nextSignal = moved.signal;
  }

  return {
    ok: true,
    proposal,
    signal: {
      ...nextSignal,
      action_id: executionId,
      execution_proposal: proposal,
      next_allowed_action: approvalRequired ? 'HUMAN_REQUIRED' : 'EXECUTE'
    }
  };
}

export function decideApproval(signal, {
  approved,
  actor,
  note = null,
  now = Date.now()
} = {}) {
  const proposal = signal?.execution_proposal;
  if (!proposal) return { ok: false, reason: 'no execution proposal on signal' };
  if (!proposal.approval?.required) return { ok: false, reason: 'proposal does not require approval' };
  if (proposal.approval.status !== 'PENDING') {
    return { ok: false, reason: `approval already ${proposal.approval.status}` };
  }
  if (!actor) return { ok: false, reason: 'approval actor is required' };

  if (!approved) {
    const moved = transition(signal, 'PAUSED', { reason: 'human denied execution', now });
    if (!moved.ok) return { ok: false, reason: moved.reason };
    const nextProposal = {
      ...proposal,
      approval: {
        ...proposal.approval,
        status: 'DENIED',
        denied_by: actor,
        denied_at: new Date(now).toISOString(),
        note
      }
    };
    return {
      ok: true,
      signal: {
        ...moved.signal,
        execution_proposal: nextProposal,
        next_allowed_action: 'STOP'
      }
    };
  }

  const moved = transition(signal, 'ACTIONABLE', { reason: 'human approved execution', now });
  if (!moved.ok) return { ok: false, reason: moved.reason };
  const nextProposal = {
    ...proposal,
    approval: {
      ...proposal.approval,
      status: 'APPROVED',
      approved_by: actor,
      approved_at: new Date(now).toISOString(),
      note
    }
  };
  return {
    ok: true,
    signal: {
      ...moved.signal,
      execution_proposal: nextProposal,
      next_allowed_action: 'EXECUTE'
    }
  };
}

export function canExecute(signal) {
  const proposal = signal?.execution_proposal;
  if (!proposal) return { ok: false, reason: 'no execution proposal on signal' };
  if (signal.status !== 'ACTIONABLE') {
    return { ok: false, reason: `execution requires ACTIONABLE signal, got ${signal.status}` };
  }
  if (proposal.execution?.status === 'SUCCEEDED') {
    return { ok: false, reason: 'execution already succeeded' };
  }
  if (proposal.approval?.required && proposal.approval.status !== 'APPROVED') {
    return { ok: false, reason: `approval is ${proposal.approval.status}, not APPROVED` };
  }
  return { ok: true, proposal };
}

async function signature(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export async function dispatchExecution(signal, {
  endpoint = process.env.MARKET_EXECUTION_ENDPOINT,
  secret = process.env.MARKET_EXECUTION_SECRET,
  fetchImpl = globalThis.fetch,
  now = Date.now()
} = {}) {
  const check = canExecute(signal);
  if (!check.ok) return check;
  if (!endpoint || !secret) {
    const err = new Error('MARKET_EXECUTION_ENDPOINT / MARKET_EXECUTION_SECRET are not set');
    err.failure_class = 'AUTH';
    throw err;
  }

  const proposal = check.proposal;
  const attemptedAt = new Date(now).toISOString();
  const envelope = {
    execution_id: proposal.execution_id,
    signal_id: signal.signal_id,
    correlation_id: signal.correlation_id ?? null,
    route_id: signal.route_id ?? null,
    action_type: proposal.action_type,
    target: proposal.target,
    assets: proposal.assets,
    payload: proposal.payload,
    approval: proposal.approval,
    expected_value: proposal.expected_value
  };
  const body = JSON.stringify(envelope);

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Market-Execution-Signature': await signature(body, secret),
        'Idempotency-Key': proposal.execution_id
      },
      body
    });
  } catch (error) {
    return markExecutionFailure(signal, error, { now });
  }

  let result = null;
  try { result = await response.json(); } catch { result = null; }

  if (!response.ok || result?.ok === false) {
    const error = new Error(result?.error ?? `execution endpoint failed: ${response.status}`);
    error.status = response.status;
    return markExecutionFailure(signal, error, { now });
  }

  const moved = transition(signal, 'ACTIONED', {
    reason: `execution ${proposal.execution_id} completed`,
    now
  });
  if (!moved.ok) return { ok: false, reason: moved.reason };

  const nextProposal = {
    ...proposal,
    execution: {
      status: 'SUCCEEDED',
      attempted_at: attemptedAt,
      completed_at: new Date(now).toISOString(),
      external_ref: result?.external_ref ?? null,
      result: result?.result ?? result ?? null,
      failure: null
    }
  };

  return {
    ok: true,
    signal: {
      ...moved.signal,
      execution_proposal: nextProposal,
      last_external_action: proposal.action_type,
      next_allowed_action: 'WAIT_FOR_RESULT'
    },
    external_ref: nextProposal.execution.external_ref,
    result: nextProposal.execution.result
  };
}

export function markExecutionFailure(signal, error, { now = Date.now() } = {}) {
  const proposal = signal?.execution_proposal;
  if (!proposal) return { ok: false, reason: 'no execution proposal on signal' };
  const failure = {
    class: error?.failure_class ?? (error?.status ? 'HTTP' : 'EXECUTION'),
    message: error?.message ?? String(error),
    at: new Date(now).toISOString()
  };
  const nextProposal = {
    ...proposal,
    execution: {
      ...proposal.execution,
      status: 'FAILED',
      attempted_at: proposal.execution?.attempted_at ?? new Date(now).toISOString(),
      completed_at: new Date(now).toISOString(),
      failure
    }
  };
  return {
    ok: false,
    reason: failure.message,
    signal: {
      ...signal,
      execution_proposal: nextProposal,
      last_failure: failure,
      next_allowed_action: 'HUMAN_REQUIRED'
    }
  };
}
