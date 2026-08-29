import test from 'node:test';
import assert from 'node:assert/strict';
import { loadIdentity, validateIdentity } from '../src/identity.mjs';
import { checkDraft, checkPrivacy, checkTruth } from '../src/truth-gate.mjs';

const identity = await loadIdentity(new URL('../examples/identity.example.json', import.meta.url).pathname);
const lens = JSON.parse(
  await (await import('node:fs/promises')).readFile(new URL('../examples/lens.example.json', import.meta.url), 'utf8')
);

test('the example contract loads and is valid', () => {
  assert.equal(validateIdentity(identity).length, 0);
});

test('a contract describing more than one identity is refused', () => {
  const errors = validateIdentity({ ...identity, personas: [{ id: 'a' }, { id: 'b' }] });
  assert.ok(errors.some((e) => /roster/.test(e)));
});

test('a fictional identity is refused', () => {
  assert.ok(validateIdentity({ ...identity, is_fictional: true }).some((e) => /is_fictional/.test(e)));
});

test('an approved claim without evidence_ref or scope is refused', () => {
  const errors = validateIdentity({
    ...identity,
    approved_first_person_claims: [{ claim_id: 'personal_testing' }]
  });
  assert.ok(errors.some((e) => /no evidence_ref/.test(e)));
  assert.ok(errors.some((e) => /no scope/.test(e)));
});

test('unapproved first-person claims are rejected in English', () => {
  for (const text of [
    'I tested this tool for a week.',
    'I bought the paid plan.',
    'My clients keep asking for this.',
    'My revenue went up.',
    'I worked at a large company.',
    'I am certified in this.',
    'I interviewed the founder.',
    'As an expert, I can guarantee results.'
  ]) {
    assert.equal(checkTruth(text, { identity }).ok, false, text);
  }
});

test('the same fabrication does not survive by being written in Spanish', () => {
  for (const text of [
    'Ya lo probé durante una semana.',
    'Compré el plan de pago.',
    'Mis clientes me dijeron que funciona.',
    'Tengo 10 años de experiencia.',
    'Como experto, te lo garantizo.'
  ]) {
    assert.equal(checkTruth(text, { identity }).ok, false, text);
  }
});

test('an approved claim passes only inside its declared scope', () => {
  // operates_own_assets is approved, and the sentence is about an owned asset.
  assert.equal(checkTruth('I built the checklist I publish at example.com.', { identity }).ok, true);
  // The same verb about something the operator does not own is still a violation.
  assert.equal(checkTruth('I built the payment system at another company.', { identity }).ok, false);
});

test('a location narrower than the approved scope is rejected', () => {
  assert.equal(checkTruth('I live in Examplestan.', { identity }).ok, true);
  assert.equal(checkTruth('I live in Exampleburg.', { identity }).ok, false);
});

test('credentials, addresses and card numbers never pass the privacy gate', () => {
  for (const text of [
    'api_key: sk-abcdefghijklmnopqrstuvwx',
    'Call me on +1 555-123-4567.',
    'Card 4111 1111 1111 1111 on file.',
    'We are at 120 Example Street.'
  ]) {
    assert.equal(checkPrivacy(text, identity).length > 0, true, text);
  }
});

test('an allowlisted public contact is not treated as a leak', () => {
  assert.equal(checkPrivacy('Write to hello@example.com.', identity).length, 0);
  assert.equal(checkPrivacy('Write to private.person@somewhere.test.', identity).length, 1);
});

test('a lens blocks an unsupported collective generalisation but allows a sourced one', () => {
  const bare = checkTruth('Examplestan is a country where everyone works late.', { identity, lens });
  assert.equal(bare.ok, false);
  const sourced = checkTruth('According to survey data, Examplestan is above the regional average.', { identity, lens });
  assert.equal(sourced.ok, true);
});

test('a claim the source marks restricted cannot appear in a derivative', () => {
  const source = { source_id: 's1', restricted_claims: [{ phrase: 'guaranteed refund', safe_rewrite: 'omit' }] };
  assert.equal(checkTruth('There is a guaranteed refund.', { identity, source }).ok, false);
});

test('every violation names a field and a safe rewrite', () => {
  const result = checkDraft(
    { title: 'Fine title', hook: 'I tested this.', body: 'My clients agree.', cta_text: 'Read more' },
    { identity }
  );
  assert.equal(result.ok, false);
  for (const violation of result.violations) {
    assert.ok(violation.field, 'field');
    assert.ok(violation.safe_rewrite, 'safe_rewrite');
    assert.ok(violation.gate, 'gate');
  }
});

test('a clean draft passes', () => {
  const result = checkDraft(
    {
      title: 'What the new pricing page changes',
      hook: 'Published pricing moved; here is what that implies.',
      body: 'According to the vendor page, the per-seat cost rose. One practical implication is that annual plans now need re-checking.',
      cta_text: 'Read the checklist I publish at example.com'
    },
    { identity }
  );
  assert.equal(result.ok, true, JSON.stringify(result.violations, null, 2));
});
