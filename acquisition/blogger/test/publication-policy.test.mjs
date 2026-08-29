// Revenue Publisher v2 - the cost policy and the publication ladder.
//
// Two things this repository must never do quietly: spend money on a model, and treat a
// file it wrote as a publication that happened.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { PROOF_CONTRACT, PROOF_STATES } from '../../media-engine/lib/publisher-gate.mjs';
import { FREE_MODELS, PAID_PROVIDER_ENV, assertFreeOnly } from '../free-runner.mjs';

const RUNNER = new URL('../free-runner.mjs', import.meta.url);
const PUBLISHER = new URL('../owned-publisher.mjs', import.meta.url);

test('the model allowlist contains only free Workers AI models', async () => {
  for (const model of FREE_MODELS) {
    assert.match(model, /^@cf\//, `${model} is not a Cloudflare Workers AI model id`);
  }
  assert.ok(FREE_MODELS.size >= 1);
});

test('no billable provider is reachable from the generation lane', async () => {
  const source = await fs.readFile(RUNNER, 'utf8');
  const forbidden = [
    'api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com',
    'api.mistral.ai', 'api.cohere.ai', 'openai.azure.com'
  ];
  for (const host of forbidden) {
    assert.equal(source.includes(host), false, `${host} must not appear in the free-only lane`);
  }
  // Exactly one model endpoint, and it is the free Workers AI one.
  const endpoints = [...source.matchAll(/https:\/\/[a-z0-9.\-]+\//gi)].map((m) => m[0]);
  assert.deepEqual([...new Set(endpoints)], ['https://api.cloudflare.com/']);
});

test('there is no paid fallback path: an unallowlisted model throws instead of degrading', () => {
  const policy = assertFreeOnly();
  assert.equal(policy.allowlisted, true);
  assert.equal(policy.paid_fallback_used, false);

  for (const paidModel of ['gpt-5.6-sol', 'claude-opus-5', 'gemini-3-pro', '@cf/some/unlisted-model']) {
    assert.throws(() => assertFreeOnly(paidModel), /BLOGGER_FREE_MODEL_NOT_ALLOWLISTED/,
      `${paidModel} must be refused rather than silently used`);
  }
});

test('a paid credential in the environment is reported, never used', async () => {
  const source = await fs.readFile(RUNNER, 'utf8');
  for (const name of PAID_PROVIDER_ENV) {
    // The names appear only in the reporting list, never as a value read into a request.
    assert.equal(source.includes(`process.env.${name}`), false, `${name} must not be read as a credential`);
  }
  assert.ok(source.includes('paid_fallback_used: false'));
  assert.ok(source.includes('FREE_ONLY_NO_PAID_FALLBACK'));
});

test('free quota exhaustion stops the run and never upgrades', async () => {
  const source = await fs.readFile(RUNNER, 'utf8');
  assert.ok(source.includes('FREE_TIER_STOP'));
  assert.match(source, /429\s*\|\|\s*response\.status\s*===\s*403/);
  assert.equal(/fallbackModel|upgradeModel|PAID_MODEL/.test(source), false);
});

test('READY is not PUBLISHED and PUBLISH_REQUESTED is not VERIFIED', () => {
  assert.deepEqual(PROOF_STATES, ['DRAFT', 'READY', 'PUBLISH_REQUESTED', 'PUBLISHED', 'VERIFIED']);
  assert.ok(PROOF_STATES.indexOf('READY') < PROOF_STATES.indexOf('PUBLISHED'));
  assert.ok(PROOF_STATES.indexOf('PUBLISH_REQUESTED') < PROOF_STATES.indexOf('VERIFIED'));

  // Each rung needs evidence the rung below it does not have.
  assert.deepEqual(PROOF_CONTRACT.READY.requires, ['truth_gate_passed', 'duplication_gate_passed', 'safety_gate_passed']);
  assert.ok(PROOF_CONTRACT.PUBLISHED.requires.includes('external_post_id'));
  assert.ok(PROOF_CONTRACT.VERIFIED.requires.includes('independent_status_read'));
  for (const requirement of PROOF_CONTRACT.PUBLISHED.requires) {
    assert.equal(PROOF_CONTRACT.READY.requires.includes(requirement), false);
  }
});

test('writing the owned page requests publication; it never claims one', async () => {
  const source = await fs.readFile(PUBLISHER, 'utf8');
  // The only state the writer may assign is PUBLISH_REQUESTED.
  assert.ok(source.includes("publication_state='PUBLISH_REQUESTED'"));
  assert.equal(source.includes("publication_state='PUBLISHED'"), false);
  // VERIFIED is assigned only after an independent HTTP read of the canonical URL.
  const verifyBlock = source.slice(source.indexOf('async function verifyPrevious'), source.indexOf('async function listReady'));
  assert.ok(verifyBlock.includes('await fetch(pub.canonical_url'));
  assert.ok(verifyBlock.includes("pub.state='VERIFIED'"));
  assert.ok(verifyBlock.includes("pub.state !== 'PUBLISH_REQUESTED'"));
});

test('the live state file never claims a publication it has not verified', async () => {
  const state = JSON.parse(await fs.readFile(new URL('../state.json', import.meta.url), 'utf8'));
  for (const pub of Object.values(state.owned_publications || {})) {
    assert.ok(['PUBLISH_REQUESTED', 'VERIFIED'].includes(pub.state), `unexpected publication state ${pub.state}`);
    if (pub.state === 'VERIFIED') assert.ok(pub.verified_at, 'VERIFIED requires a verified_at timestamp');
    else assert.equal(pub.verified_at, undefined);
  }
});
