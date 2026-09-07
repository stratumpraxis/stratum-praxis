// The AI judgment contract.
//
// AI is used as a classifier with a fixed output shape, not as a conversation that
// happens to end in an action. A free-form reply cannot be validated, cannot be
// diffed against the last run, and cannot be replayed - so it is not accepted here.
//
// The rule this file exists to enforce: a decision may never assert money. It can
// say "route this to an existing paid offer"; it cannot say "this was purchased".
// Payment state comes from the payment provider, through state.mjs, and nowhere else.

export const DECISIONS = Object.freeze([
  'QUALIFY',
  'ACTION',
  'WATCH',
  'HOLD',
  'KILL',
  'HUMAN_REQUIRED'
]);

export const RECOMMENDED_ACTIONS = Object.freeze([
  'route_to_existing_offer',
  'publish_owned_content',
  'update_existing_asset',
  'collect_more_evidence',
  'no_action'
]);

// Which status each decision maps to. Kept here so the mapping is one table rather
// than scattered conditionals, and so it can be asserted in tests.
export const DECISION_TO_STATUS = Object.freeze({
  QUALIFY: 'QUALIFIED',
  ACTION: 'ACTIONABLE',
  WATCH: 'WAITING',
  HOLD: 'PAUSED',
  KILL: 'KILLED',
  HUMAN_REQUIRED: 'HUMAN_REQUIRED'
});

const REQUIRED = Object.freeze(['decision', 'confidence', 'reason']);

export function validateDecision(decision) {
  const errors = [];
  if (!decision || typeof decision !== 'object') return ['decision must be an object'];

  for (const field of REQUIRED) {
    if (decision[field] === undefined || decision[field] === null || decision[field] === '') {
      errors.push(`missing required field ${field}`);
    }
  }
  if (decision.decision && !DECISIONS.includes(decision.decision)) {
    errors.push(`unknown decision ${decision.decision}; allowed: ${DECISIONS.join(', ')}`);
  }
  if (decision.recommended_action && !RECOMMENDED_ACTIONS.includes(decision.recommended_action)) {
    errors.push(`unknown recommended_action ${decision.recommended_action}`);
  }
  for (const key of ['confidence', 'revenue_probability']) {
    const v = decision[key];
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 1) errors.push(`${key} must be between 0 and 1`);
  }

  // An ACTION that routes to an offer has to name which offer. "Take action" with no
  // destination is how work gets created that lands nowhere.
  if (decision.decision === 'ACTION') {
    if (decision.recommended_action === 'route_to_existing_offer' && !decision.asset_match) {
      errors.push('ACTION with route_to_existing_offer requires asset_match naming an existing asset');
    }
    if (!decision.recommended_action) {
      errors.push('ACTION requires a recommended_action');
    }
  }

  // The hard line: a classifier may not declare revenue.
  if (decision.paid === true || decision.won === true || decision.verified_revenue) {
    errors.push('a decision may not assert payment, a win, or revenue; that comes from payment evidence only');
  }

  return errors;
}

/**
 * Turn a validated decision into a state transition request.
 * Returns null when the decision is not one that moves state.
 */
export function decisionToTransition(decision) {
  const errors = validateDecision(decision);
  if (errors.length) return { ok: false, errors };
  const status = DECISION_TO_STATUS[decision.decision];
  return {
    ok: true,
    status,
    reason: decision.reason,
    asset_match: decision.asset_match ?? null,
    recommended_action: decision.recommended_action ?? null
  };
}

/**
 * A deterministic fallback classifier.
 *
 * This is not a model. It applies the rules that do not need one, so the pipeline
 * has a defined decision even when no AI capacity is available - which is the
 * free-first constraint: no silent paid fallback, and no stalling either.
 */
export function classifyDeterministic(signal) {
  const reasonParts = [];

  if (signal.signal_type === 'PAYMENT') {
    return {
      decision: 'ACTION',
      asset_match: signal.existing_asset_match ?? null,
      recommended_action: signal.existing_asset_match ? 'route_to_existing_offer' : 'collect_more_evidence',
      revenue_probability: 1,
      revenue_distance: 'PAID',
      confidence: 1,
      reason: 'payment-provider event: the strongest signal class, handled before anything else',
      classifier: 'deterministic'
    };
  }

  if (signal.demand_type === 'EXPLICIT_INTENT' && signal.existing_asset_match) {
    reasonParts.push('explicit intent with an existing paid destination');
    return {
      decision: 'ACTION',
      asset_match: signal.existing_asset_match,
      recommended_action: 'route_to_existing_offer',
      revenue_probability: null,
      revenue_distance: signal.revenue_distance ?? 'NEAR',
      confidence: Math.min(0.8, Number(signal.confidence) || 0.5),
      reason: reasonParts.join('; '),
      classifier: 'deterministic'
    };
  }

  if (signal.demand_type === 'NONE' || signal.confidence < 0.3) {
    return {
      decision: 'WATCH',
      recommended_action: 'collect_more_evidence',
      confidence: Number(signal.confidence) || 0,
      reason: 'no stated demand or confidence below the floor: parked rather than actioned',
      classifier: 'deterministic'
    };
  }

  // Two genuinely different situations end in QUALIFY, and saying so matters: one is
  // "we found nothing to sell them", the other is "we found something but they have
  // not said they want it". Reporting the second as the first is a contradiction a
  // reader would have to catch by cross-checking asset_match against the reason text.
  if (signal.existing_asset_match) {
    return {
      decision: 'QUALIFY',
      asset_match: signal.existing_asset_match,
      recommended_action: 'collect_more_evidence',
      confidence: Number(signal.confidence) || 0,
      reason: `matched existing asset ${signal.existing_asset_match}, but demand is ${signal.demand_type} rather than explicit intent: qualified, not actioned`,
      classifier: 'deterministic'
    };
  }

  return {
    decision: 'QUALIFY',
    recommended_action: 'collect_more_evidence',
    confidence: Number(signal.confidence) || 0,
    reason: 'demand present but no existing asset cleared the routing floor',
    classifier: 'deterministic'
  };
}
