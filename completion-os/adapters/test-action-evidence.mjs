import assert from 'node:assert/strict';
import { classifyActionEvidence } from './action-evidence.mjs';

const supportHuman = classifyActionEvidence({
  asset_id: 'support-human',
  required_level: 'support_intent',
  route: 'present',
  instrumentation: 'present',
  events: [
    { name: 'share', level: 'engagement', total: 3, human: 3 },
    { name: 'support_click', level: 'support_intent', total: 1, human: 1 }
  ]
});
assert.equal(supportHuman.status, 'pass');
assert.equal(supportHuman.best_observed_level, 'support_intent');

const engagementOnly = classifyActionEvidence({
  asset_id: 'engagement-only',
  required_level: 'support_intent',
  route: 'present',
  instrumentation: 'present',
  events: [{ name: 'share', level: 'engagement', total: 4, human: 2 }]
});
assert.equal(engagementOnly.status, 'unknown');
assert.equal(engagementOnly.best_observed_level, 'engagement');
assert.match(engagementOnly.next_action, /transition to support_intent/);

const missingRoute = classifyActionEvidence({
  asset_id: 'missing-route',
  required_level: 'support_intent',
  route: 'missing',
  instrumentation: 'present',
  events: []
});
assert.equal(missingRoute.status, 'fail');
assert.equal(missingRoute.route_gap, true);

const measurementGap = classifyActionEvidence({
  asset_id: 'measurement-gap',
  required_level: 'support_intent',
  route: 'present',
  instrumentation: 'not_in_provider',
  events: []
});
assert.equal(measurementGap.status, 'unknown');
assert.equal(measurementGap.measurement_gap, true);

const checkoutDoesNotBecomePayment = classifyActionEvidence({
  asset_id: 'checkout-only',
  required_level: 'checkout',
  route: 'present',
  instrumentation: 'present',
  events: [{ name: 'checkout_started', level: 'checkout', total: 1, human: 1 }]
});
assert.equal(checkoutDoesNotBecomePayment.status, 'pass');
assert.equal(checkoutDoesNotBecomePayment.required_level, 'checkout');
assert.equal('payment_passed' in checkoutDoesNotBecomePayment, false);

const automatedSupport = classifyActionEvidence({
  asset_id: 'automated-support',
  required_level: 'support_intent',
  route: 'present',
  instrumentation: 'present',
  events: [{ name: 'support_click', level: 'support_intent', total: 2, human: 0 }]
});
assert.equal(automatedSupport.status, 'unknown');
assert.equal(automatedSupport.automated_only, true);

assert.throws(() => classifyActionEvidence({
  asset_id: 'bad-level', required_level: 'payment', route: 'present', instrumentation: 'present', events: []
}), /unknown action level/);

console.log('Action evidence tests passed');
