// Historical records are durable truth.
//
// The publishing, revenue and distribution ledgers describe things that actually
// happened. A later feature may append to them through their own tooling; nothing in the
// Revenue Publisher may rewrite them. These digests were taken before the v2 work began.
// If one of them fails, either history was edited or a ledger legitimately moved on -
// and in the second case the digest is updated deliberately, in its own commit, with the
// reason recorded here.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

import { repoPath } from '../lib/util.mjs';

const PINNED = Object.freeze({
  'revenue-link-ledger.md': '154c7d66d56af6c90618a38b9f63c236942853d46dbc90f533cf6c8c45ea6889',
  'acquisition/distribution-ledger.json': '31fb2bb7651569a454910c67b93310fde0e8667ff1768a7f12603ae092adc4a7',
  'acquisition/distribution-queue.json': 'f952a7713dcf28218d64d130c8c2522598719b5b65490abe978c0d01a5f59483',
  'acquisition/demand-signals.json': 'fd19013cd8b7caf0c12c98999e4a9af1abe537bd937ebd577f3717662dbcd8b0',
  'revenue-os/metrics.json': 'dfe5a26b51caa37a4464c3e0b9931a785bc4494d9a818c1a335be93f4f62f3a2',
  'trend-video-engine/publish-ledger.json': '067d4a32c7273bb6282142fedda186088666e6fcc2be12a3d333059a8b74eb8c',
  'distribution/provider-policy.json': '4e2ed16524fb9252243f868112f2db0bc91948cf408db98e60b1662efc5a8b56',
  'distribution/source-routing.json': '296268468a534335585c4ca1a3e7386725d5958892e2149b12b28dd9bb8d9dfb'
});

async function digest(file) {
  const raw = await fs.readFile(repoPath(file));
  return crypto.createHash('sha256').update(raw).digest('hex');
}

test('every historical ledger is byte-identical to the pre-v2 record', async () => {
  const drifted = [];
  for (const [file, expected] of Object.entries(PINNED)) {
    const actual = await digest(file);
    if (actual !== expected) drifted.push(`${file}: expected ${expected}, found ${actual}`);
  }
  assert.deepEqual(drifted, [], `historical records were modified:\n${drifted.join('\n')}`);
});

test('no revenue, publication or purchase figure was invented anywhere in the new work', async () => {
  const metrics = JSON.parse(await fs.readFile(repoPath('revenue-os/metrics.json'), 'utf8'));
  const flat = JSON.stringify(metrics);
  // The measured zero stays a measured zero. If this ever becomes non-zero it must come
  // from a payment provider record, not from anything the publisher wrote.
  assert.match(flat, /"stripe_live_payment_intents":\s*0/);

  const candidates = JSON.parse(await fs.readFile(repoPath('acquisition/signal-intelligence/candidates.json'), 'utf8'));
  for (const candidate of candidates.candidates) {
    assert.equal(candidate.product_created, false);
    assert.ok(candidate.prohibited_claims.some((c) => c.claim_pattern === 'VERIFIED_REVENUE_FROM_THIS_THESIS'));
  }

  // The subscription thesis rests on owned behaviour plus public posts. Neither is
  // external commercial consensus, so that flag must stay false and the claim must stay
  // prohibited.
  const subscription = candidates.candidates.find((c) => c.thesis_id === 'ai-subscription-rationalization-2026-08');
  assert.equal(subscription.external_consensus, false);
  assert.ok(subscription.prohibited_claims.some((c) => c.claim_pattern === 'EXTERNAL_CONSENSUS'));
  assert.ok(subscription.prohibited_claims.some((c) => c.claim_pattern === 'IN_POST_CLAIM_AS_VERIFIED_FACT'));
});

test('the publisher writes only where it is allowed to write', async () => {
  const runner = await fs.readFile(repoPath('acquisition/blogger/free-runner.mjs'), 'utf8');
  const publisher = await fs.readFile(repoPath('acquisition/blogger/owned-publisher.mjs'), 'utf8');
  for (const source of [runner, publisher]) {
    for (const ledger of Object.keys(PINNED)) {
      assert.equal(source.includes(ledger), false, `the publisher must not reference ${ledger} as a write target`);
    }
  }
});
