import test from 'node:test';
import assert from 'node:assert/strict';

import { loadIdentity, validateIdentity } from '../lib/identity.mjs';
import { checkPrivacy, checkTruth, checkLensRules } from '../lib/truth-gate.mjs';
import { readJson } from '../../lib/util.mjs';

const identity = await loadIdentity();
const lenses = (await readJson('acquisition/media-engine/lenses.json')).lenses;

const blocked = (text, claimId, options = {}) => {
  const result = checkTruth(text, { identity, ...options });
  assert.equal(result.ok, false, `expected "${text}" to be blocked`);
  const hit = result.violations.find((v) => v.claim_id === claimId);
  assert.ok(hit, `expected a ${claimId} violation, got ${result.violations.map((v) => v.claim_id).join(', ') || 'none'}`);
  assert.ok(hit.safe_rewrite, 'every violation must name a safe rewrite');
  return hit;
};

test('there is exactly one identity and it is not fictional', () => {
  assert.equal(identity.identity_id, 'jp_independent_freelancer');
  assert.equal(identity.is_fictional, false);
  assert.deepEqual(validateIdentity({ ...identity, identity_id: 'second_persona' }).length > 0, true);
  assert.ok(validateIdentity({ ...identity, is_fictional: true })
    .some((e) => e.includes('does not operate fictional identities')));
  assert.ok(validateIdentity({ ...identity, personas: [{ id: 'a' }] })
    .some((e) => e.includes('one identity, not a roster')));
});

test('every approved first-person claim carries evidence and a scope', () => {
  for (const claim of identity.approved_first_person_claims) {
    assert.ok(claim.evidence_ref, `${claim.claim_id} has no evidence_ref`);
    assert.ok(claim.scope, `${claim.claim_id} has no scope`);
  }
});

test('a fake testing claim is rejected', () => {
  blocked('I tested this agent for two weeks before writing about it.', 'personal_testing');
  blocked('En mis pruebas la herramienta fue mas rapida.', 'personal_testing');
});

test('a fake purchase claim is rejected', () => {
  blocked('I bought the annual plan to see whether it was worth it.', 'personal_purchase');
  blocked('Compre la version anual para comprobarlo.', 'personal_purchase');
});

test('a fake client claim is rejected', () => {
  blocked('One client cut their tooling bill in half after this review.', 'client_work');
  blocked('En mi trabajo con clientes esto aparece cada trimestre.', 'client_work');
});

test('a habitual-use claim is rejected', () => {
  blocked('I use this tool every day to keep my invoices straight.', 'daily_use');
});

test('a customer or revenue claim is rejected', () => {
  blocked('My customers tell me this is the part they struggle with.', 'customers_or_revenue');
  blocked('I earn $4000 from this workflow.', 'customers_or_revenue');
});

test('a fabricated biography is rejected across every one of its parts', () => {
  blocked('When I lived in Osaka the rules were different.', 'residence_history');
  blocked('I worked at a large consultancy before going independent.', 'employment_history');
  blocked('I am a certified cloud architect.', 'credentials');
  blocked('I am 34 years old and have been freelancing for a decade.', 'age_or_identity_details');
  blocked('I visited their Tokyo office last month.', 'travel_or_visits');
  blocked('A reader told me it saved them a fortune.', 'testimonial_or_result');
  blocked('As an expert in this field, the answer is obvious.', 'expertise_authority');
  blocked('I spoke with three founders about this.', 'interviews_or_sources');
});

test('the approved claims are allowed, and only within their scope', () => {
  const ok = checkTruth(
    'Japan-based independent freelancer here. The reducible-spend calculator I publish on stratumpraxis.com is free to run.',
    { identity }
  );
  assert.equal(ok.ok, true, JSON.stringify(ok.violations));

  // Country-level location is approved. A city is not.
  assert.equal(checkTruth('I live in Japan and work independently.', { identity }).ok, true);
  const narrow = checkTruth('I live in Yokohama and work independently.', { identity });
  assert.equal(narrow.ok, false);
  assert.equal(narrow.violations[0].gate, 'PRIVACY_LOCATION_SCOPE');
});

test('the safe rewrites the issue names are not themselves violations', () => {
  for (const safe of [
    'For independent workers, the practical question is which renewal falls first.',
    'From a Japan-based freelancer perspective, the cost question comes before the tool question.',
    'This appears useful when several tools overlap on one job.',
    'One practical implication is that the renewal date decides how cheap the decision is.'
  ]) {
    assert.equal(checkTruth(safe, { identity }).ok, true, `"${safe}" must be allowed`);
  }
});

test('a Spanish fabrication is blocked exactly like its English twin', () => {
  const en = checkTruth('I tested this tool for a month.', { identity });
  const es = checkTruth('Probe esta herramienta durante un mes.', { identity });
  assert.equal(en.ok, false);
  assert.equal(es.ok, false);
  assert.equal(es.violations[0].claim_id, en.violations[0].claim_id);
});

test('privacy leaks are blocked whether or not any claim matched', () => {
  const cases = [
    ['Reach me at private.person@example.com for details.', 'private_email'],
    ['api_key: sk-abcdefghijklmnopqrstuvwx', 'credential'],
    ['My coordinates are 35.68950, 139.69171 if you want to visit.', 'coordinates'],
    ['Call 03-1234-5678 any time.', 'phone_number']
  ];
  for (const [text, claimId] of cases) {
    const result = checkPrivacy(text, identity);
    assert.ok(result.some((v) => v.claim_id === claimId), `expected ${claimId} for "${text}"`);
  }
  // The already-public contact is not treated as a leak.
  assert.deepEqual(checkPrivacy('Write to stratumpraxis@gmail.com.', identity), []);
});

test('the japan_reality lens blocks sensational framing and unsupported generalisation', () => {
  const lens = lenses.japan_reality;
  const sensational = checkLensRules('The truth Japan does not want you to know about work culture.', lens);
  assert.ok(sensational.some((v) => v.claim_id === 'japan_reality_banned_phrase'));

  const generalisation = checkLensRules('Japan is a country where nobody takes holidays.', lens);
  assert.ok(generalisation.some((v) => v.claim_id === 'unsupported_national_generalisation'));

  // Scoped or sourced versions of the same sentence are fine.
  assert.deepEqual(
    checkLensRules('Publicly reported figures show Japan is above the OECD average on this measure.', lens),
    []
  );
  assert.deepEqual(checkLensRules('In this context, the system tends to reward staying late.', lens), []);
});

test('the practical_operator lens blocks invented client stories and manufactured urgency', () => {
  const lens = lenses.practical_operator;
  assert.ok(checkLensRules('One of my clients had this exact problem.', lens).length > 0);
  assert.ok(checkLensRules('Act now before the price changes.', lens).length > 0);
});

test('a claim the source itself restricts cannot appear in a derivative', () => {
  const source = {
    source_id: 'probe-source',
    restricted_claims: [{ phrase: 'our customers saved', safe_rewrite: 'There is no customer outcome to report.' }]
  };
  const result = checkTruth('Our customers saved thousands last quarter.', { identity, source });
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].gate, 'SOURCE_CONTRACT');
});
