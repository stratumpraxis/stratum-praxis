import test from 'node:test';
import assert from 'node:assert/strict';
import { routeOpportunity, rankOpportunities } from '../lib/value-network.mjs';

const safeBase = {
  platform: 'kaggle',
  entry_fee: false,
  prize_release_fee: false,
  crypto_transfer_required: false,
  japan_eligible: true,
  individual_allowed: true,
  ai_policy: 'ALLOWED',
  open_ended_employment: false,
  mandatory_post_win_service: false,
  trusted_sponsor: true,
  ip_policy: 'LICENSE_ONLY',
  mandatory_phase_2: false,
  interview_required: false,
  publicity_required: false,
  post_win_hours_estimate: 1,
  payment_route_clear: true,
  expected_reward_usd: 1000,
  estimated_success_probability: 0.1,
  reuse_multiplier: 1,
  pre_win_hours_estimate: 2
};

test('safe bounded Kaggle candidate routes to ACHIEVE', () => {
  const result = routeOpportunity(safeBase);
  assert.equal(result.state, 'READY_TO_PREPARE');
  assert.equal(result.lane, 'ACHIEVE');
  assert.equal(result.audit.safe_to_submit_automatically, true);
});

test('binding rules and tax forms stop at HUMAN_REQUIRED', () => {
  const result = routeOpportunity({
    ...safeBase,
    rules_acceptance_required: true,
    tax_form_required: true,
    signature_required: true
  });
  assert.equal(result.state, 'HUMAN_REQUIRED');
  assert.equal(result.lane, 'HUMAN_GATE');
  assert.equal(result.audit.safe_to_submit_automatically, false);
});

test('pay-to-get-paid signal is immediately rejected', () => {
  const result = routeOpportunity({ ...safeBase, risk_signals: ['PAY_TO_GET_PAID'] });
  assert.equal(result.state, 'REJECTED');
  assert.equal(result.lane, 'SAFETY_REJECT');
});

test('higher expected value ranks first among safe opportunities', () => {
  const ranked = rankOpportunities([
    { ...safeBase, id: 'small', expected_reward_usd: 100 },
    { ...safeBase, id: 'large', expected_reward_usd: 10000 }
  ]);
  assert.equal(ranked[0].id, 'large');
});
