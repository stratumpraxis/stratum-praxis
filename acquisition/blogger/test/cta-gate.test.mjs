// Revenue Publisher v2 - the CTA gate.
//
// v1 rendered "Continue" and a button reading "Open the relevant tool", pointed at
// whichever route index the model happened to name. These tests hold the replacement.

import test from 'node:test';
import assert from 'node:assert/strict';

import { checkCta, isGenericLabel, labelQuality, trackedUrl } from '../lib/cta-gate.mjs';
import { CALCULATOR_PAGE_TEXT, GOOD_CTA, INVENTORY, SOURCE, VERTICAL } from './helpers.mjs';

const context = { source: SOURCE, inventory: INVENTORY, vertical: VERTICAL, assetPageText: CALCULATOR_PAGE_TEXT };
const failureCodes = (v) => v.failures.map((f) => f.code);

test('a CTA that names a verified existing route passes', () => {
  const verdict = checkCta(GOOD_CTA, context);
  assert.equal(verdict.ok, true, JSON.stringify(verdict.failures));
  assert.equal(verdict.asset_id, 'ai-saas-waste-calculator');
  assert.ok(verdict.score >= 8);
});

test('a generic label is rejected however verified the route is', () => {
  for (const label of ['Continue', 'Learn more', 'Open the relevant tool', 'Click here', 'Read more', 'Explore']) {
    const verdict = checkCta({ ...GOOD_CTA, label }, context);
    assert.equal(verdict.ok, false, `"${label}" should have been rejected`);
    assert.ok(failureCodes(verdict).includes('CTA_GENERIC'));
    assert.equal(verdict.score, 0);
  }
  assert.equal(isGenericLabel('Continue'), true);
  assert.equal(isGenericLabel('Estimate how much of your AI/SaaS spend is reducible'), false);
});

test('an empty label falls back to the CTA the inventory verifies, never to a generic one', () => {
  const verdict = checkCta({ ...GOOD_CTA, label: '' }, context);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.label, 'Estimate how much of your AI/SaaS spend is reducible');
});

test('a route the source does not declare is refused', () => {
  const verdict = checkCta({ ...GOOD_CTA, route_index: 7 }, context);
  assert.equal(verdict.ok, false);
  assert.ok(failureCodes(verdict).includes('CTA_ROUTE_NOT_VERIFIED'));
});

test('an unverified or non-live destination is refused', () => {
  const source = {
    ...SOURCE,
    existing_product_routes: [{ role: 'PRIMARY', asset_id: 'draft-unverified-asset', url: 'https://stratumpraxis.com/draft-unverified-asset.html', cta: 'Read the draft guide' }]
  };
  const verdict = checkCta({ include: true, route_index: 0, label: 'Review the draft spend guide' }, { ...context, source });
  assert.equal(verdict.ok, false);
  const details = verdict.failures.map((f) => f.detail).join(' | ');
  assert.match(details, /not LIVE/);
  assert.match(details, /verification_state/);
});

test('a route url that disagrees with the verified public_url is refused', () => {
  const source = {
    ...SOURCE,
    existing_product_routes: [{ role: 'PRIMARY', asset_id: 'ai-saas-waste-calculator', url: 'https://example.test/elsewhere.html', cta: 'Estimate reducible spend' }]
  };
  const verdict = checkCta({ include: true, route_index: 0, label: 'Estimate your reducible AI spend' }, { ...context, source });
  assert.equal(verdict.ok, false);
  assert.ok(failureCodes(verdict).includes('CTA_ROUTE_NOT_VERIFIED'));
});

test('microcopy survives only when the live page proves it', () => {
  const proven = checkCta(GOOD_CTA, context);
  assert.deepEqual(proven.microcopy, ['free', 'no_signup']);
  assert.equal(proven.microcopy_text, 'Free · No signup');

  const unproven = checkCta({ ...GOOD_CTA, microcopy: 'Free · No signup · Instant results' }, { ...context, assetPageText: '' });
  assert.deepEqual(unproven.microcopy, []);
  assert.equal(unproven.microcopy_text, null);
  assert.ok(unproven.warnings.some((w) => w.code === 'CTA_MICROCOPY_UNVERIFIED'));
});

test('a vertical that requires a CTA refuses an article with none', () => {
  const verdict = checkCta({ include: false }, context);
  assert.equal(verdict.ok, false);
  assert.ok(failureCodes(verdict).includes('CTA_ROUTE_NOT_VERIFIED'));

  const optional = checkCta({ include: false }, { ...context, vertical: { ...VERTICAL, cta_required: false } });
  assert.equal(optional.ok, true);
});

test('a CTA that leaves the vertical primary asset is warned about, not silently accepted', () => {
  const verdict = checkCta({ include: true, route_index: 1, label: 'Start the spend audit checklist' }, context);
  assert.ok(verdict.warnings.some((w) => w.code === 'CTA_NOT_VERTICAL_PRIMARY'));
});

test('label quality rewards a decision verb and the thing being decided', () => {
  const route = SOURCE.existing_product_routes[0];
  assert.equal(labelQuality('Estimate how much of your AI/SaaS spend is reducible', route).score, 10);
  assert.ok(labelQuality('See the tool', route).score < 5);
});

test('the tracked url preserves every attribution dimension', () => {
  const url = new URL(trackedUrl(SOURCE.existing_product_routes[0], {
    source: SOURCE, lensId: 'practical_operator', verticalId: 'ai_subscription_rationalization'
  }));
  assert.equal(url.origin + url.pathname, 'https://stratumpraxis.com/ai-saas-waste-calculator.html');
  assert.equal(url.searchParams.get('utm_source'), 'owned_media');
  assert.equal(url.searchParams.get('utm_medium'), 'blog');
  assert.equal(url.searchParams.get('utm_campaign'), 'autonomous_revenue_publisher');
  assert.equal(url.searchParams.get('utm_content'), 'probe-subscription-rationalization:practical_operator');
  assert.equal(url.searchParams.get('utm_term'), 'ai_subscription_rationalization');
  assert.equal(url.searchParams.get('sp_channel'), 'owned_signal');
});

test('the shipped calculator page really does carry the microcopy claims', async () => {
  const { loadAssetPageText } = await import('../lib/cta-gate.mjs');
  const text = await loadAssetPageText({ verification: { repo_file: 'ai-saas-waste-calculator.html' } });
  assert.match(text, /\bfree\b/i);
  assert.match(text, /no\s*signup/i);
});
