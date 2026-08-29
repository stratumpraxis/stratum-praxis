import { auditOpportunity } from './audit.mjs';

export const REJECT_SIGNALS = new Set([
  'PAY_TO_GET_PAID',
  'CRYPTO_DEPOSIT',
  'PRIZE_RELEASE_FEE',
  'VIP_UPGRADE_REQUIRED',
  'NEGATIVE_BALANCE_TOPUP',
  'GIFT_CARD_PAYMENT_REQUIRED',
  'OFF_PLATFORM_WIRE_REQUIRED'
]);

export function scoreOpportunity(input = {}, audit = auditOpportunity(input)) {
  if (audit.decision === 'REJECT') return -Infinity;
  const reward = Math.max(0, Number(input.expected_reward_usd ?? input.prize_usd ?? 0));
  const probability = Math.min(1, Math.max(0, Number(input.estimated_success_probability ?? 0.01)));
  const reuse = Math.max(0.25, Number(input.reuse_multiplier ?? 1));
  const effort = Math.max(0.5, Number(input.pre_win_hours_estimate ?? 1));
  const post = Math.max(0, Number(audit.post_win_burden_hours ?? 0));
  const risk = audit.decision === 'HUMAN_REVIEW' ? 2 : 1;
  return (reward * probability * reuse) / (effort + post + risk);
}

export function routeOpportunity(input = {}) {
  const explicitSignals = Array.isArray(input.risk_signals) ? input.risk_signals : [];
  const hardSignal = explicitSignals.find((signal) => REJECT_SIGNALS.has(signal));
  if (hardSignal) {
    return {
      state: 'REJECTED',
      lane: 'SAFETY_REJECT',
      reason: hardSignal,
      score: -Infinity,
      audit: null
    };
  }

  const audit = auditOpportunity(input);
  const score = scoreOpportunity(input, audit);
  let state = 'READY_TO_PREPARE';
  let lane = 'ACHIEVE';

  if (audit.decision === 'REJECT') {
    state = 'REJECTED';
    lane = 'SAFETY_REJECT';
  } else if (audit.decision === 'HUMAN_REVIEW') {
    state = 'HUMAN_REQUIRED';
    lane = 'HUMAN_GATE';
  }

  return { state, lane, score, audit };
}

export function rankOpportunities(items = []) {
  return items
    .map((item) => ({ ...item, routing: routeOpportunity(item) }))
    .sort((a, b) => (b.routing.score ?? -Infinity) - (a.routing.score ?? -Infinity));
}
