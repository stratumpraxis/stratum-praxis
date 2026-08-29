import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRouting, validateRouting } from '../src/routing.mjs';
import {
  applyUtm, buildTrackedUrl, buildUtm, campaignKey, isMeasured, measuredOr,
  rate, slug, summariseFunnel, verifyAttribution, verifyRevenueClaim
} from '../src/attribution.mjs';

const routing = await loadRouting(new URL('../examples/routing.example.json', import.meta.url).pathname);

test('the example routing table is valid', () => {
  assert.equal(validateRouting(routing).length, 0);
});

test('a channel without utm_source or utm_medium is refused at load', () => {
  const errors = validateRouting({ channels: { x: { utm_source: 'x' } }, owned_domains: [], checkout_hosts: [] });
  assert.ok(errors.some((e) => /utm_medium/.test(e)));
});

test('an undeclared channel is refused, never guessed', () => {
  assert.throws(
    () => buildUtm({ routing, channel: 'tiktok', assetId: 'a', campaign: 'c' }),
    /unknown channel "tiktok"/
  );
});

test('the same campaign under two spellings produces one lane', () => {
  const a = buildUtm({ routing, channel: 'x', assetId: 'Check-List', campaign: 'Tool Sprawl' });
  const b = buildUtm({ routing, channel: 'x', assetId: 'Check-List', campaign: 'tool_sprawl' });
  assert.deepEqual(a, b);
  assert.equal(
    campaignKey({ channel: 'X', assetId: 'Check List', campaign: 'Tool  Sprawl' }),
    campaignKey({ channel: 'x', assetId: 'check_list', campaign: 'tool_sprawl' })
  );
});

test('building the same link twice is byte-identical', () => {
  const options = { routing, channel: 'newsletter', assetId: 'kit', campaign: 'launch', destinationUrl: 'https://example.com/kit' };
  assert.equal(buildTrackedUrl(options).url, buildTrackedUrl(options).url);
});

test('assetId and campaign are required', () => {
  assert.throws(() => buildUtm({ routing, channel: 'x', campaign: 'c' }), /assetId is required/);
  assert.throws(() => buildUtm({ routing, channel: 'x', assetId: 'a' }), /campaign is required/);
});

test('attribution may only be attached to https destinations', () => {
  assert.throws(() => applyUtm('http://example.com/a', { utm_source: 'x' }), /https/);
  assert.throws(() => applyUtm('not a url', { utm_source: 'x' }), /not a valid URL/);
});

test('a link a human already tagged is not silently rewritten', () => {
  const tagged = 'https://example.com/a?utm_source=handmade';
  assert.match(applyUtm(tagged, { utm_source: 'x', utm_medium: 'social' }), /utm_source=handmade/);
  assert.match(applyUtm(tagged, { utm_source: 'x' }, { overwrite: true }), /utm_source=x/);
});

test('verifyAttribution names every missing parameter rather than passing', () => {
  const result = verifyAttribution('https://example.com/a', { routing });
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 5);
});

test('a checkout destination is recognised and its provider is reported', () => {
  const { url } = buildTrackedUrl({
    routing, channel: 'x', assetId: 'kit', campaign: 'launch',
    destinationUrl: 'https://buy.stripe.com/test_abc'
  });
  const result = verifyAttribution(url, { routing });
  assert.equal(result.ok, true);
  assert.equal(result.checkout_destination, true);
  assert.equal(result.checkout_provider, 'buy.stripe.com');
});

test('an unapproved destination host is rejected', () => {
  const result = verifyAttribution('https://random.test/a?utm_source=x&utm_medium=social&utm_campaign=c&utm_content=d&asset_id=e', { routing });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => /not an approved destination/.test(p)));
});

test('a subdomain of an owned domain is accepted', () => {
  const result = verifyAttribution('https://shop.example.com/a?utm_source=x&utm_medium=social&utm_campaign=c&utm_content=d&asset_id=e', { routing });
  assert.equal(result.ok, true);
  assert.equal(result.owned_destination, true);
});

test('NOT_MEASURED never collapses into zero', () => {
  assert.equal(measuredOr(undefined), 'NOT_MEASURED');
  assert.equal(measuredOr(null), 'NOT_MEASURED');
  assert.equal(measuredOr(0), 0);
  assert.equal(isMeasured(0), true);
  assert.equal(isMeasured(Number.NaN), false);
});

test('a rate refuses to exist without a measured, non-zero denominator', () => {
  assert.equal(rate(3, 0), null);
  assert.equal(rate(3, null), null);
  assert.equal(rate(3, 6), 0.5);
});

test('a funnel with a gap reports the gap instead of a conversion rate', () => {
  const summary = summariseFunnel({ landing: 100, checkout_click: 4, purchase: 1 });
  assert.equal(summary.stages.primary_cta_click, 'NOT_MEASURED');
  assert.equal(summary.complete_chain, false);
  assert.ok(summary.gaps.length > 0);
  assert.equal(summary.checkout_rate, null);
});

test('a fully measured funnel reports a complete chain and real rates', () => {
  const summary = summariseFunnel({
    impression: 1000, landing: 200, primary_cta_click: 40, checkout_click: 10, purchase: 2, delivery: 2
  });
  assert.equal(summary.complete_chain, true);
  assert.equal(summary.cta_rate, 0.2);
  assert.equal(summary.purchase_rate, 0.2);
});

test('revenue cannot be attributed from an analytics event alone', () => {
  assert.equal(verifyRevenueClaim({ purchase_count: 1 }).ok, false);
  assert.equal(verifyRevenueClaim({ purchase_count: 0, payment_provider_evidence: 'x' }).ok, false);
  assert.equal(
    verifyRevenueClaim({ purchase_count: 1, payment_provider_evidence: 'stripe:pi_123', verified_revenue: 17 }).ok,
    true
  );
});

test('slug is deterministic and bounded', () => {
  assert.equal(slug('Tool  Sprawl!! 2026'), 'tool_sprawl_2026');
  assert.equal(slug('x'.repeat(200), 10).length, 10);
  assert.equal(slug(null), '');
});
