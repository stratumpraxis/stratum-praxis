import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateSystemApproval } from '../lib/autonomy.mjs';
import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { readJson } from '../lib/util.mjs';
import { runSafetyGate, validateItem } from '../lib/queue.mjs';

const sourceRouting = await loadSourceRouting();
const providerPolicy = await readJson('distribution/provider-policy.json');
const brandAccountPolicy = await readJson('acquisition/brand-account-policy.json');
const publisherEvidence = await readJson('distribution/buffer-channel-audit-result.json');
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const baseContext = { inventory, providerPolicy, sourceRouting, brandAccountPolicy, publisherEvidence };

const cleanInstagram = {
  queue_id: 'governance-kit-instagram-autonomy-test',
  platform: 'instagram',
  asset_id: 'agentic-ai-governance-permission-kit',
  content_angle: 'Unattended AI agents need explicit permissions, approval gates, retry ceilings, and rollback rules before production use.',
  cta: 'Review the governance and permission framework',
  destination_url: 'https://stratumpraxis.com/agentic-ai-governance-permission-kit.html?utm_source=instagram&utm_medium=social&utm_campaign=agent_governance_test&utm_content=bounded_test&asset_id=agentic-ai-governance-permission-kit',
  utm_parameters: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'agent_governance_test',
    utm_content: 'bounded_test',
    asset_id: 'agentic-ai-governance-permission-kit'
  },
  safety_status: 'UNCHECKED',
  approval_status: 'PENDING_HUMAN',
  status: 'DRAFT',
  scheduled_at: null,
  published_at: null,
  external_post_id: null,
  verification_status: null,
  automation: 'AUTOMATED_VIA_BUFFER',
  attempts: 0,
  history: []
};

test('fresh exact Stratum Buffer evidence can system-approve a clean bounded Instagram route', () => {
  const { item, verdict } = runSafetyGate(cleanInstagram, { ...baseContext, siblings: [] });
  assert.equal(verdict.ok, true);
  assert.equal(item.status, 'READY');
  assert.equal(item.approval_status, 'SYSTEM_APPROVED');
  assert.equal(item.system_approval.eligible, true);
  assert.equal(item.system_approval.publisher, 'buffer');
  assert.equal(item.system_approval.channel_id, '6a8e5b5accaf649a671a0cd9');
  assert.deepEqual(validateItem(item), []);
});

test('wrong account identity fails closed', () => {
  const wrong = structuredClone(brandAccountPolicy);
  wrong.brands['Stratum Praxis'].channels.instagram.account_name = 'wrong-account';
  const verdict = { ok: true, blocks: [], warnings: [], human_required: [] };
  const result = evaluateSystemApproval(cleanInstagram, { ...baseContext, brandAccountPolicy: wrong }, verdict);
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((x) => x.includes('identity mismatch')));
});

test('stale publisher audit fails closed', () => {
  const stale = structuredClone(publisherEvidence);
  stale.checkedAt = '2026-01-01T00:00:00.000Z';
  const verdict = { ok: true, blocks: [], warnings: [], human_required: [] };
  const result = evaluateSystemApproval(cleanInstagram, { ...baseContext, publisherEvidence: stale, now: Date.parse('2026-09-08T00:00:00Z') }, verdict);
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((x) => x.includes('stale')));
});

test('an unpinned or unverified platform remains human-gated', () => {
  const youtube = { ...cleanInstagram, platform: 'youtube', automation: 'AUTOMATED_VIA_BUFFER' };
  const verdict = { ok: true, blocks: [], warnings: [], human_required: [] };
  const result = evaluateSystemApproval(youtube, baseContext, verdict);
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((x) => x.includes('no verified youtube account')));
});

test('safety warnings prevent system approval even when the account is verified', () => {
  const verdict = { ok: true, blocks: [], warnings: ['needs judgment'], human_required: [] };
  const result = evaluateSystemApproval(cleanInstagram, baseContext, verdict);
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((x) => x.includes('warnings')));
});

test('SYSTEM_APPROVED cannot be forged without positive evidence', () => {
  const forged = {
    ...cleanInstagram,
    status: 'READY',
    safety_status: 'PASSED',
    approval_status: 'SYSTEM_APPROVED',
    system_approval: { eligible: true, publisher: 'buffer' }
  };
  const errors = validateItem(forged).join('\n');
  assert.match(errors, /requires system_approval.evidence/);
  assert.match(errors, /requires system_approval.channel_id/);
});
