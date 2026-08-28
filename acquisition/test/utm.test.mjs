import test from 'node:test';
import assert from 'node:assert/strict';

import { applyUtm, buildTrackedUrl, buildUtm, campaignKey, loadSourceRouting, verifyAttribution } from '../lib/utm.mjs';

const sourceRouting = await loadSourceRouting();
const base = {
  channel: 'tiktok',
  assetId: 'ai-saas-waste-calculator',
  campaign: 'AI/SaaS Spend',
  contentAngle: 'Shadow AI cost',
  variant: 'v1',
  destinationUrl: 'https://stratumpraxis.com/ai-saas-waste-calculator.html',
  sourceRouting
};

test('campaign naming is deterministic', () => {
  const a = buildUtm(base);
  const b = buildUtm({ ...base, campaign: 'ai saas spend', contentAngle: 'shadow  ai   cost' });
  assert.deepEqual(a, b, 'the same intent must always produce the same campaign token');
  assert.equal(a.utm_campaign, 'ai_saas_spend');
  assert.equal(a.utm_content, 'shadow_ai_cost_v1');
});

test('source and medium come from the existing source-routing taxonomy, not from this module', () => {
  assert.equal(buildUtm(base).utm_source, sourceRouting.sources.tiktok.utm_source);
  assert.equal(buildUtm(base).utm_medium, sourceRouting.sources.tiktok.utm_medium);
  assert.equal(buildUtm({ ...base, channel: 'note' }).utm_medium, sourceRouting.sources.note.utm_medium);
});

test('an unknown channel is refused rather than invented', () => {
  assert.throws(() => buildUtm({ ...base, channel: 'myspace' }), /unknown distribution channel/);
});

test('missing asset or campaign is refused', () => {
  assert.throws(() => buildUtm({ ...base, assetId: '' }), /assetId is required/);
  assert.throws(() => buildUtm({ ...base, campaign: '' }), /campaign is required/);
});

test('existing hand-built attribution is preserved unless overwrite is explicit', () => {
  const tagged = 'https://stratumpraxis.com/x.html?utm_source=github&utm_medium=referral';
  const params = buildUtm(base);
  assert.match(applyUtm(tagged, params), /utm_source=github/);
  assert.match(applyUtm(tagged, params, { overwrite: true }), /utm_source=tiktok/);
});

test('non-https and malformed destinations are refused', () => {
  assert.throws(() => applyUtm('http://stratumpraxis.com/x.html', {}), /https/);
  assert.throws(() => applyUtm('not a url', {}), /not a valid URL/);
});

test('verifyAttribution catches every missing parameter', () => {
  const bare = verifyAttribution('https://stratumpraxis.com/x.html');
  assert.equal(bare.ok, false);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'asset_id']) {
    assert.ok(bare.problems.some((p) => p.includes(key)), `expected a problem mentioning ${key}`);
  }
  assert.equal(verifyAttribution(buildTrackedUrl(base).url).ok, true);
});

test('verifyAttribution rejects an off-domain destination', () => {
  const result = verifyAttribution('https://example.com/x.html?utm_source=a&utm_medium=b&utm_campaign=c&utm_content=d&asset_id=e');
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes('not an approved destination')));
});

test('verifyAttribution accepts a known checkout host', () => {
  const result = verifyAttribution('https://buy.stripe.com/abc?utm_source=a&utm_medium=b&utm_campaign=c&utm_content=d&asset_id=e');
  assert.equal(result.ok, true);
  assert.equal(result.checkoutHost, true);
});

test('campaignKey identifies the same lane regardless of spelling', () => {
  assert.equal(
    campaignKey({ platform: 'TikTok', assetId: 'ai-saas-waste-calculator', campaign: 'AI SaaS Spend' }),
    campaignKey({ platform: 'tiktok', assetId: 'ai-saas-waste-calculator', campaign: 'ai_saas_spend' })
  );
});

test('the built URL matches the attribution structure named in the brief', () => {
  const url = new URL(buildTrackedUrl(base).url);
  assert.equal(url.searchParams.get('utm_source'), 'tiktok');
  assert.equal(url.searchParams.get('utm_medium'), 'social_video');
  assert.equal(url.searchParams.get('utm_campaign'), 'ai_saas_spend');
  assert.equal(url.searchParams.get('utm_content'), 'shadow_ai_cost_v1');
  assert.equal(url.searchParams.get('asset_id'), 'ai-saas-waste-calculator');
});
