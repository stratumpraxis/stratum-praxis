import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyDeployStatuses } from './github-deploy-status.mjs';

const rateLimited = JSON.parse(fs.readFileSync('completion-os/fixtures/vercel-rate-limit-status.json', 'utf8'));

const money = classifyDeployStatuses(rateLimited, '^Vercel – money-resilience$');
assert.equal(money.status, 'blocked');
assert.equal(money.retry_after, '24 hours');
assert.match(money.next_action, /Do not retry before/);
assert.equal(money.evidence.length, 1);
assert.match(money.evidence[0], /Deployment rate limited/);

const ordlume = classifyDeployStatuses(rateLimited, '^Vercel – ordlume$');
assert.equal(ordlume.status, 'blocked');
assert.equal(ordlume.retry_after, '24 hours');

const success = classifyDeployStatuses({
  statuses: [{ state: 'success', context: 'Vercel – app', description: 'Deployment ready' }]
}, '^Vercel – app$');
assert.equal(success.status, 'pass');

const hardFailure = classifyDeployStatuses({
  statuses: [{ state: 'failure', context: 'Vercel – app', description: 'Build failed: syntax error' }]
}, '^Vercel – app$');
assert.equal(hardFailure.status, 'fail');

const pending = classifyDeployStatuses({
  statuses: [{ state: 'pending', context: 'Vercel – app', description: 'Building' }]
}, '^Vercel – app$');
assert.equal(pending.status, 'unknown');
assert.match(pending.next_action, /duplicate deployment/);

const missing = classifyDeployStatuses({ statuses: [] }, '^Vercel – missing$');
assert.equal(missing.status, 'unknown');

console.log('GitHub deploy-status adapter tests passed');
