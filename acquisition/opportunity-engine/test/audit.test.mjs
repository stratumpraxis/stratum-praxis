import test from 'node:test';
import assert from 'node:assert/strict';
import { auditOpportunity } from '../lib/audit.mjs';

const safe = {
  platform: 'kaggle',
  japan_eligible: true,
  individual_allowed: true,
  ai_policy: 'ALLOWED',
  trusted_sponsor: true,
  entry_fee: false,
  prize_release_fee: false,
  crypto_transfer_required: false,
  open_ended_employment: false,
  mandatory_post_win_service: false,
  ip_policy: 'RETAIN',
  mandatory_phase_2: false,
  interview_required: false,
  publicity_required: false,
  post_win_hours_estimate: 2,
  payment_route_clear: true
};

test('safe bounded Kaggle opportunity is auto eligible', () => {
  const r = auditOpportunity(safe);
  assert.equal(r.decision, 'AUTO_ELIGIBLE');
  assert.equal(r.safe_to_prepare, true);
  assert.equal(r.safe_to_submit_automatically, true);
});

test('terms acceptance creates a human gate', () => {
  const r = auditOpportunity({ ...safe, terms_acceptance_required: true });
  assert.equal(r.decision, 'HUMAN_REVIEW');
  assert.equal(r.safe_to_submit_automatically, false);
  assert.ok(r.required_human_gates.includes('TERMS_ACCEPTANCE_REQUIRED'));
});

test('captcha never passes automatically', () => {
  const r = auditOpportunity({ ...safe, captcha_or_liveness: true });
  assert.equal(r.decision, 'HUMAN_REVIEW');
  assert.ok(r.required_human_gates.includes('CAPTCHA_OR_LIVENESS'));
});

test('rate limit stops automation', () => {
  const r = auditOpportunity({ ...safe, http_status: 429 });
  assert.equal(r.decision, 'HUMAN_REVIEW');
  assert.equal(r.safe_to_submit_automatically, false);
});

test('entry fee is rejected', () => {
  const r = auditOpportunity({ ...safe, entry_fee: true });
  assert.equal(r.decision, 'REJECT');
  assert.equal(r.safe_to_prepare, false);
});

test('AI prohibited is rejected', () => {
  const r = auditOpportunity({ ...safe, ai_policy: 'PROHIBITED' });
  assert.equal(r.decision, 'REJECT');
});

test('IP assignment is human review rather than silent acceptance', () => {
  const r = auditOpportunity({ ...safe, ip_policy: 'ASSIGN_ALL' });
  assert.equal(r.decision, 'HUMAN_REVIEW');
});

test('Devpost never auto submits even if otherwise safe', () => {
  const r = auditOpportunity({ ...safe, platform: 'devpost' });
  assert.equal(r.decision, 'AUTO_ELIGIBLE');
  assert.equal(r.safe_to_submit_automatically, false);
});
