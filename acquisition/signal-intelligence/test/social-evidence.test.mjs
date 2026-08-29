// Revenue Publisher v2 - the social-post evidence contract.
//
// Two claims this repository must never make on the strength of a post: that a vendor
// advertising its product is buyer demand, and that something written inside a post is
// a verified fact.

import test from 'node:test';
import assert from 'node:assert/strict';

import { corroborate } from '../lib/corroborate.mjs';
import { moneyEvidenceProfile } from '../lib/bucket.mjs';
import { validateSignal } from '../lib/normalize.mjs';
import { prohibitedClaims } from '../lib/source-candidate.mjs';
import {
  NON_INDEPENDENT_POST_TYPES,
  isIndependentDemandEvidence,
  prohibitedClaimsFromSocial,
  unverifiedClaims,
  validateSocialEvidence
} from '../lib/social-evidence.mjs';
import { NOW, policy, signal } from './helpers.mjs';

function integrity(overrides = {}) {
  return {
    post_type: 'ORGANIC_USER_POST',
    independent_demand_evidence: true,
    observed_claim_scope: 'POST_EXISTENCE_ONLY',
    observation_ref: 'acquisition/signal-intelligence/observations/probe.json#one',
    claims_inside_post: [],
    factual_verification_required_before_publication: false,
    ...overrides
  };
}

function post(overrides = {}, integrityOverrides = {}) {
  return signal({
    source_family: 'social_public_post',
    evidence_buckets: ['PAIN_SIGNAL', 'DEMAND_SIGNAL'],
    provider: 'x_public_posts',
    content_integrity: integrity(integrityOverrides),
    ...overrides
  });
}

test('a social record must declare what kind of post it is', () => {
  const errors = validateSocialEvidence({ source_family: 'social_public_post' }, 'probe');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /content_integrity/);
});

test('observing a post never verifies what the post says', () => {
  const wrongScope = validateSocialEvidence(
    { source_family: 'social_public_post', content_integrity: integrity({ observed_claim_scope: 'CLAIMS_VERIFIED' }) },
    'probe'
  );
  assert.ok(wrongScope.some((e) => /POST_EXISTENCE_ONLY/.test(e)));

  // A record carrying an unverified in-post claim must say verification is still needed.
  const claim = { claim: '80% of teams overpay', status: 'UNVERIFIED_PUBLIC_CLAIM', reason: 'not checked against any primary source' };
  const notFlagged = validateSocialEvidence(
    { source_family: 'social_public_post', content_integrity: integrity({ claims_inside_post: [claim] }) },
    'probe'
  );
  assert.ok(notFlagged.some((e) => /does not require verification before publication/.test(e)));

  const flagged = { source_family: 'social_public_post', content_integrity: integrity({ claims_inside_post: [claim], factual_verification_required_before_publication: true }) };
  assert.deepEqual(validateSocialEvidence(flagged, 'probe'), []);
  assert.equal(unverifiedClaims(flagged).length, 1);
});

test('a claim marked verified must name the primary source that verified it', () => {
  const errors = validateSocialEvidence({
    source_family: 'social_public_post',
    content_integrity: integrity({
      claims_inside_post: [{ claim: 'the price is $20', status: 'VERIFIED_AGAINST_PRIMARY_SOURCE' }],
      factual_verification_required_before_publication: false
    })
  }, 'probe');
  assert.ok(errors.some((e) => /primary_source_ref/.test(e)));
});

test('a promotional post is not automatically independent demand evidence', () => {
  for (const postType of NON_INDEPENDENT_POST_TYPES) {
    const record = post({}, { post_type: postType, independent_demand_evidence: false, non_independence_reason: 'declared' });
    assert.equal(isIndependentDemandEvidence(record), false, `${postType} must not count`);
  }
  // And a record cannot simply declare itself independent to get around it.
  const lying = { source_family: 'social_public_post', content_integrity: integrity({ post_type: 'PROMOTIONAL', independent_demand_evidence: true }) };
  assert.ok(validateSocialEvidence(lying, 'probe').some((e) => /cannot be independent demand evidence/.test(e)));
  assert.equal(isIndependentDemandEvidence(lying), false);
});

test('promotional and echo posts are dropped before the 2-Signal Rule is counted', () => {
  const organic = post({ signal_id: 'organic-pain', observation_summary: 'a person paying for several assistants asks which of them they actually still open each week' });
  const promo = post({ signal_id: 'vendor-promo', observation_summary: 'a router product advertises that it sends requests to whichever qualified provider is cheapest today' },
    { post_type: 'PROMOTIONAL', independent_demand_evidence: false, non_independence_reason: 'supply-side marketing' });
  const echo = post({ signal_id: 'quote-echo', observation_summary: 'a quote post restating the earlier complaint about having too many tools to evaluate properly' },
    { post_type: 'QUOTE_ECHO', independent_demand_evidence: false, non_independence_reason: 'same original counted twice' });
  const owned = signal({ signal_id: 'owned-funnel', source_family: 'owned_behavior', evidence_buckets: ['MONEY_SIGNAL'], observation_summary: 'owned funnel checkout clicks recorded over the last thirty days on the spend pages' });

  const result = corroborate([organic, promo, echo, owned], policy);

  assert.deepEqual(result.corroborating_signal_ids.sort(), ['organic-pain', 'owned-funnel']);
  assert.equal(result.excluded_as_non_independent_source.length, 2);
  assert.deepEqual(
    result.excluded_as_non_independent_source.map((x) => x.signal_id).sort(),
    ['quote-echo', 'vendor-promo']
  );
  for (const excluded of result.excluded_as_non_independent_source) {
    assert.equal(excluded.reason, 'NOT_INDEPENDENT_DEMAND_EVIDENCE');
    assert.ok(excluded.detail);
  }
});

test('three organic posts still corroborate only once: they share one independence group', () => {
  const posts = ['a', 'b', 'c'].map((k, i) => post({
    signal_id: `organic-${k}`,
    observation_summary: `distinct observation number ${i} about paying for tools that go unopened, worded differently enough to avoid the mirror threshold entirely ${k.repeat(i + 1)}`
  }));
  const result = corroborate(posts, policy);
  assert.equal(result.counted_signal_count, 1);
  assert.equal(result.satisfied, false);
  assert.ok(result.failures.some((f) => /independence group/.test(f)));
});

test('money language in a public post is not external commercial consensus', () => {
  const pricingPost = post({ signal_id: 'pricing-talk', evidence_buckets: ['MONEY_SIGNAL'] });
  const profile = moneyEvidenceProfile([pricingPost]);
  assert.equal(profile.external_consensus, false);
  assert.deepEqual(profile.social_money_signals, ['pricing-talk']);
  assert.match(profile.note, /not evidence of external commercial consensus/);
});

test('social evidence forces its own prohibitions onto the candidate', () => {
  const record = post({ signal_id: 'pricing-claim' }, {
    claims_inside_post: [{ claim: 'the pro plan costs $30', status: 'UNVERIFIED_PUBLIC_CLAIM', reason: 'not checked' }],
    factual_verification_required_before_publication: true
  });
  const forced = prohibitedClaimsFromSocial([record]);
  assert.ok(forced.some((c) => c.claim_pattern === 'IN_POST_CLAIM_AS_VERIFIED_FACT'));
  assert.ok(forced.some((c) => c.claim_pattern.includes('the pro plan costs $30')));

  const assetFit = { fits: true, asset_id: 'ai-saas-waste-calculator', purchase_path_live: false };
  const corroboration = { money_evidence: { external_consensus: false, note: 'owned only' } };
  const claims = prohibitedClaims(assetFit, corroboration, null, [record]);
  assert.ok(claims.some((c) => c.claim_pattern === 'IN_POST_CLAIM_AS_VERIFIED_FACT'));
});

test('the shipped X evidence set obeys the contract', async () => {
  const { readJson } = await import('../../lib/util.mjs');
  const [doc, providers] = await Promise.all([
    readJson('acquisition/signal-intelligence/signals.json'),
    readJson('acquisition/signal-intelligence/providers.json')
  ]);
  const social = doc.signals.filter((s) => s.source_family === 'social_public_post');
  assert.ok(social.length >= 6, 'the X observation pass should be recorded as evidence');

  for (const record of social) {
    assert.deepEqual(validateSignal(record, { policy, providers }), []);
    assert.equal(record.provider, 'x_public_posts');
    assert.equal(record.content_integrity.observed_claim_scope, 'POST_EXISTENCE_ONLY');
    // Post identity was never invented. Where it is unrecorded, it says so.
    assert.equal(record.content_integrity.post_identity_state, 'UNRECORDED_PENDING_OWNER_ENTRY');
    assert.equal(record.evidence_buckets.includes('MONEY_SIGNAL'), false,
      'a public post must not carry the money bucket that drives external_consensus');
  }
  assert.ok(social.some((s) => s.content_integrity.post_type === 'PROMOTIONAL'));
  assert.ok(social.some((s) => s.content_integrity.post_type === 'QUOTE_ECHO'));
  assert.equal(providers.providers.x_public_posts.connection_state, 'MANUAL_EVIDENCE_ONLY');
  assert.equal(providers.providers.x_public_posts.automation_allowed, false);
});

test('the recorded observation file never invents a post url or an account', async () => {
  const { readJson } = await import('../../lib/util.mjs');
  const doc = await readJson('acquisition/signal-intelligence/observations/2026-08-29-x-ai-subscription-rationalization.json');
  assert.equal(doc.post_identity_state, 'UNRECORDED_PENDING_OWNER_ENTRY');
  for (const observation of doc.observations) {
    assert.equal(observation.post_url, 'UNRECORDED');
    assert.equal(observation.account, 'UNRECORDED');
    assert.ok(observation.raw_pain);
    assert.ok(observation.evidence_family_pattern);
    assert.ok(observation.observed_on);
    assert.ok(observation.commercial_intent_strength);
    assert.equal(typeof observation.independent_demand_evidence, 'boolean');
    assert.equal(typeof observation.factual_verification_required_before_publication, 'boolean');
  }
  assert.equal(NOW > 0, true);
});
