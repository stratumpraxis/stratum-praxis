// Revenue Publisher v2 - gate composition.
//
// Section 8 of the brief asked for one of two things: run the authoritative media-engine
// gates in the Blogger lane, or stop claiming them in the published disclosure. These
// tests hold the first option, and they hold the disclosure to what actually ran.

import test from 'node:test';
import assert from 'node:assert/strict';

import { GATE_IDS, derivationFrom, disclosureFor, runEditorialGates } from '../lib/gates.mjs';
import {
  CALCULATOR_PAGE_TEXT, IDENTITY, INVENTORY, LENS, SOURCE, STRONG_ARTICLE, VERTICAL, withBody
} from './helpers.mjs';

const base = {
  source: SOURCE,
  identity: IDENTITY,
  lens: LENS,
  lensId: 'practical_operator',
  vertical: VERTICAL,
  inventory: INVENTORY,
  assetPageText: CALCULATOR_PAGE_TEXT,
  minWords: 400
};

test('a strong article passes every gate and reaches READY', () => {
  const result = runEditorialGates(STRONG_ARTICLE, base);
  assert.equal(result.status, 'READY');
  assert.equal(result.publishable, true);
  assert.deepEqual(result.blocking_reasons, []);
  assert.equal(result.truth.ok, true);
  assert.equal(result.duplication.ok, true);
  assert.equal(result.cta.ok, true);
});

test('the authoritative first-person truth gate really runs in this lane', () => {
  const result = runEditorialGates(
    withBody(STRONG_ARTICLE, `I bought three of these subscriptions last year.\n\n${STRONG_ARTICLE.body}`),
    base
  );
  assert.equal(result.truth.ok, false);
  assert.ok(result.truth.violations.some((v) => v.gate === 'FIRST_PERSON_TRUTH'));
  assert.equal(result.truth.gate, 'acquisition/media-engine/lib/truth-gate.mjs');
  assert.equal(result.status, 'DRAFT');
});

test('the privacy gate runs too', () => {
  const result = runEditorialGates(
    withBody(STRONG_ARTICLE, `${STRONG_ARTICLE.body}\n\nWrite to someone@example.com about it.`),
    base
  );
  assert.ok(result.truth.violations.some((v) => v.gate === 'PRIVACY'));
  assert.equal(result.publishable, false);
});

test('a duplicate or cannibalizing article is rejected', () => {
  const published = [derivationFrom(
    { ...STRONG_ARTICLE, output_id: 'already-published' },
    { source: SOURCE, lensId: 'practical_operator', ctaAssetId: 'ai-saas-waste-calculator', createdAt: new Date().toISOString() }
  )];
  const result = runEditorialGates(STRONG_ARTICLE, { ...base, published });

  assert.equal(result.duplication.ok, false);
  assert.ok(result.duplication.blocks.length > 0);
  assert.equal(result.status, 'DRAFT');
  assert.ok(result.blocking_reasons.some((r) => r.startsWith('COPY_SPIN') || r.startsWith('REPEATED_TITLE')));
  assert.ok(result.quality.critical_failures.some((f) => f.code === 'DUPLICATE_OR_CANNIBALIZING'));
});

test('a genuinely different article on the same source is not treated as a duplicate', () => {
  const other = derivationFrom(
    {
      output_id: 'different-piece',
      title: 'Reading a renewal notice before it turns into a decision',
      dek: 'What a renewal date actually tells you.',
      body: 'A renewal date is a deadline someone else chose. Treating it as a prompt to review, rather than a prompt to pay, is the only part of the calendar you control. The work is deciding what the tool replaced, and whether that thing is still happening at all.'
    },
    { source: SOURCE, lensId: 'independent_builder', ctaAssetId: 'ai-saas-spend-audit-checklist', createdAt: '2026-01-01T00:00:00Z' }
  );
  const result = runEditorialGates(STRONG_ARTICLE, { ...base, published: [other] });
  assert.equal(result.duplication.ok, true, JSON.stringify(result.duplication.blocks));
});

test('the disclosure names only the gates that actually executed', () => {
  const withIdentity = runEditorialGates(STRONG_ARTICLE, base);
  const withoutIdentity = runEditorialGates(STRONG_ARTICLE, { ...base, identity: null });

  assert.ok(disclosureFor(withIdentity).includes('first-person truth'));
  assert.equal(disclosureFor(withoutIdentity).includes('first-person truth'), false);

  for (const text of [disclosureFor(withIdentity), disclosureFor(withoutIdentity)]) {
    assert.ok(text.startsWith('AI-assisted editorial production.'));
    assert.ok(text.includes('may require independent verification'));
    // The v1 wording claimed gates the runtime did not run.
    assert.equal(text.includes('constrained by recorded source evidence and automated truth/quality gates'), false);
  }
});

test('the gate list the artifact records is the list this module runs', () => {
  const result = runEditorialGates(STRONG_ARTICLE, base);
  assert.deepEqual(result.gates_executed, GATE_IDS);
  assert.ok(result.gates_executed.includes('editorial_quality_v2'));
  assert.ok(result.gates_executed.includes('duplication_gate'));
  assert.ok(result.gates_executed.includes('cta_route_verification_gate'));
});

test('an article below the quality threshold is DRAFT even with every hard gate green', () => {
  const thin = `Subscriptions are a recurring cost. Reviewing them is sensible.
Many teams do this once a year. Some do it more often than that.

Reviewing tools helps keep costs visible for anyone who pays for software regularly.`;
  const result = runEditorialGates(withBody(STRONG_ARTICLE, thin), base);
  assert.equal(result.truth.ok, true);
  assert.equal(result.cta.ok, true);
  assert.equal(result.status, 'DRAFT');
  assert.ok(result.blocking_reasons.some((r) => r.startsWith('QUALITY_BELOW_THRESHOLD')));
});
