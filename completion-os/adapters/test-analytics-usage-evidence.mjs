import assert from 'node:assert/strict';
import { classifyUsageEvidence } from './analytics-usage-evidence.mjs';

const human = classifyUsageEvidence({
  asset_id: 'human-usage',
  instrumentation: 'present',
  meaningful_events: [{ name: 'result_generated', total: 5, human: 3 }],
  exposure_events: [{ name: 'loaded', total: 10 }]
});
assert.equal(human.status, 'pass');
assert.equal(human.usage_passed, true);
assert.equal(human.human_meaningful_events, 3);

const automated = classifyUsageEvidence({
  asset_id: 'automated-only',
  instrumentation: 'present',
  meaningful_events: [{ name: 'refresh', total: 2, human: 0 }]
});
assert.equal(automated.status, 'unknown');
assert.equal(automated.automated_only, true);
assert.equal(automated.usage_passed, false);

const measurementGap = classifyUsageEvidence({
  asset_id: 'no-provider-events',
  instrumentation: 'not_in_provider',
  meaningful_events: [],
  exposure_events: []
});
assert.equal(measurementGap.status, 'unknown');
assert.equal(measurementGap.measurement_gap, true);

const loadsOnly = classifyUsageEvidence({
  asset_id: 'loads-only',
  instrumentation: 'present',
  meaningful_events: [],
  exposure_events: [{ name: 'page_loaded', total: 200 }]
});
assert.equal(loadsOnly.status, 'unknown');
assert.equal(loadsOnly.usage_passed, false);
assert.ok(loadsOnly.evidence.some(x => x.startsWith('Exposure only')));

assert.throws(() => classifyUsageEvidence({
  asset_id: 'bad-count',
  instrumentation: 'present',
  meaningful_events: [{ name: 'x', total: 1, human: 2 }]
}), /cannot exceed total/);

console.log('Analytics Usage evidence tests passed');
