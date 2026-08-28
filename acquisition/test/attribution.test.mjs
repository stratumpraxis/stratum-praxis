import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  ATTRIBUTION_STATES,
  classifyAttribution,
  contributesEvidence,
  extractUrls,
  findTrackedDestination,
  matchAsset,
  publicationState,
  summarizeAttribution,
  validateManifestAttribution
} from '../lib/attribution.mjs';
import { collectManifests } from '../lib/manifest-sources.mjs';
import { loadInventory } from '../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../lib/utm.mjs';
import { readJson, repoPath } from '../lib/util.mjs';

const sourceRouting = await loadSourceRouting();
const inventory = await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) });
const fixture = (name) => readJson(`acquisition/test/fixtures/manifests/${name}.json`);
const sent = { status: 'sent', postId: 'p1', sentAt: '2026-08-27T09:59:15.685Z', externalLink: 'https://www.youtube.com/watch?v=X' };
const sending = { status: 'sending', postId: 'p2', sentAt: null, externalLink: null };
const ctx = (platform = 'youtube', manifestId = 'm1') => ({ platform, manifestId, inventory, sourceRouting });

test('a published post whose caption carried a tracked URL is ATTRIBUTED', async () => {
  const record = classifyAttribution(await fixture('attributed-youtube'), sent, ctx());
  assert.equal(record.attribution_state, 'ATTRIBUTED');
  assert.equal(record.publication_state, 'PUBLISHED');
  assert.equal(record.destination_asset_id, 'agentic-ai-governance-permission-kit');
  assert.equal(record.utm_source, 'youtube');
  assert.equal(record.utm_campaign, 'fixture_campaign');
  assert.ok(record.attribution_verified_at);
  assert.match(record.attribution_evidence, /publish\.caption/);
  assert.equal(contributesEvidence(record), true);
});

test('a published post with no destination in the caption is UNATTRIBUTED', async () => {
  const record = classifyAttribution(await fixture('no-destination'), sent, ctx('tiktok'));
  assert.equal(record.attribution_state, 'UNATTRIBUTED');
  assert.equal(record.destination_url, null);
  assert.equal(record.destination_asset_id, null);
  assert.equal(contributesEvidence(record), false);
});

test('a deliberate awareness post is NOT_APPLICABLE, not a failure', async () => {
  const record = classifyAttribution(await fixture('awareness-only'), sent, ctx('tiktok'));
  assert.equal(record.attribution_state, 'NOT_APPLICABLE');
  assert.match(record.attribution_evidence, /awareness_only/);
  assert.equal(contributesEvidence(record), false);
});

test('a post with no surviving manifest is UNVERIFIED, never assumed either way', () => {
  const record = classifyAttribution(null, sent, ctx());
  assert.equal(record.attribution_state, 'UNVERIFIED');
  assert.match(record.attribution_evidence, /no manifest found/);
  assert.equal(contributesEvidence(record), false);
});

test('a sending post is never treated as published, even when fully attributed', async () => {
  const record = classifyAttribution(await fixture('attributed-youtube'), sending, ctx());
  assert.equal(record.attribution_state, 'ATTRIBUTED', 'the payload is still known');
  assert.equal(record.publication_state, 'IN_FLIGHT');
  assert.equal(record.published_at, null, 'an in-flight post has no publication time');
  assert.equal(contributesEvidence(record), false, 'an unpublished post contributes no evidence');
});

test('an off-domain caption link is rejected with a stated reason', async () => {
  const record = classifyAttribution(await fixture('offdomain-destination'), sent, ctx());
  assert.equal(record.attribution_state, 'UNATTRIBUTED');
  assert.ok(record.problems.some((p) => p.includes('not an approved destination domain')));
  assert.equal(record.destination_url, null);
});

test('an http:// caption link is rejected', async () => {
  const record = classifyAttribution(await fixture('insecure-destination'), sent, ctx());
  assert.equal(record.attribution_state, 'UNATTRIBUTED');
  assert.ok(record.problems.some((p) => p.includes('https')));
});

test('a declared asset id that disagrees with the sent URL is rejected', async () => {
  const record = classifyAttribution(await fixture('asset-mismatch'), sent, ctx());
  assert.equal(record.attribution_state, 'UNATTRIBUTED');
  assert.equal(record.destination_asset_id, null);
  assert.ok(record.problems.some((p) => p.includes('disagrees') || p.includes('destination_asset_id')));
});

test('a destination that maps to no inventory asset does not become ATTRIBUTED', () => {
  const manifest = {
    id: 'x',
    publish: { services: ['youtube'], caption: 'See https://stratumpraxis.com/does-not-exist-in-inventory.html?utm_source=youtube&utm_medium=video&utm_campaign=c' }
  };
  const record = classifyAttribution(manifest, sent, ctx());
  assert.equal(record.attribution_state, 'UNATTRIBUTED');
  assert.ok(record.problems.some((p) => p.includes('does not match any asset')));
});

test('publication state mapping keeps a request distinct from a result', () => {
  assert.equal(publicationState('sent'), 'PUBLISHED');
  for (const s of ['sending', 'scheduled', 'attempted', 'accepted', 'buffer', 'unknown']) {
    assert.equal(publicationState(s), 'IN_FLIGHT', `${s} must not be PUBLISHED`);
  }
  assert.equal(publicationState('error'), 'ERROR');
  assert.equal(publicationState(undefined), 'UNKNOWN');
});

test('URL extraction handles punctuation and multiple links', () => {
  const urls = extractUrls('see https://a.example/x?y=1, then https://b.example/z.');
  assert.deepEqual(urls, ['https://a.example/x?y=1', 'https://b.example/z']);
  assert.deepEqual(extractUrls(null), []);
  assert.deepEqual(extractUrls(''), []);
});

test('findTrackedDestination prefers the first usable owned link and reports the rest', () => {
  const { url, rejected } = findTrackedDestination(
    'bad http://stratumpraxis.com/a.html then https://evil.example/x then good https://stratumpraxis.com/b.html'
  );
  assert.equal(url.pathname, '/b.html');
  assert.equal(rejected.length, 2);
});

test('matchAsset compares origin+pathname, ignoring query differences', () => {
  const asset = matchAsset(new URL('https://stratumpraxis.com/agentic-ai-governance-permission-kit.html?utm_source=anything'), inventory);
  assert.equal(asset.asset_id, 'agentic-ai-governance-permission-kit');
  assert.equal(matchAsset(new URL('https://stratumpraxis.com/nope.html'), inventory), null);
  assert.equal(matchAsset(null, inventory), null);
});

test('every attribution state is one of the four contract values', async () => {
  for (const name of ['attributed-youtube', 'no-destination', 'awareness-only', 'offdomain-destination']) {
    const record = classifyAttribution(await fixture(name), sent, ctx());
    assert.ok(ATTRIBUTION_STATES.includes(record.attribution_state));
  }
  assert.ok(ATTRIBUTION_STATES.includes(classifyAttribution(null, sent, ctx()).attribution_state));
});

test('summary counts only published+ATTRIBUTED, never in-flight', async () => {
  const published = classifyAttribution(await fixture('attributed-youtube'), sent, ctx('youtube', 'a'));
  const inFlight = classifyAttribution(await fixture('attributed-youtube'), sending, ctx('instagram', 'b'));
  const none = classifyAttribution(await fixture('no-destination'), sent, ctx('tiktok', 'c'));

  const summary = summarizeAttribution([published, inFlight, none]);
  assert.equal(summary.published, 2);
  assert.equal(summary.in_flight, 1);
  assert.equal(summary.published_with_attribution, 1, 'the in-flight attributed post must not be counted');
  assert.deepEqual(summary.evidence_capable_routes, [published.ledger_id]);
});

// ---- manifest contract validation -----------------------------------------

test('a well-formed attributed manifest validates', async () => {
  assert.deepEqual(validateManifestAttribution(await fixture('attributed-youtube'), { inventory }), []);
});

test('a legacy manifest declaring nothing is not a validation failure', async () => {
  assert.deepEqual(validateManifestAttribution(await fixture('no-destination'), { inventory }), []);
});

test('a declared destination absent from the caption is rejected: it would never be sent', async () => {
  const problems = validateManifestAttribution(await fixture('destination-not-in-caption'), { inventory });
  assert.ok(problems.some((p) => p.includes('does not appear in publish.caption')));
});

test('awareness_only combined with a destination is contradictory and rejected', () => {
  const problems = validateManifestAttribution({
    id: 'contradiction',
    publish: { awareness_only: true, destination_url: 'https://stratumpraxis.com/a.html', caption: 'x' }
  }, { inventory });
  assert.ok(problems.some((p) => p.includes('awareness_only cannot be combined')));
});

test('manifest validation rejects malformed and off-domain declarations', () => {
  assert.ok(validateManifestAttribution({ id: 'a', publish: { destination_url: 'not a url', caption: 'not a url' } }, { inventory })
    .some((p) => p.includes('not a valid URL')));
  assert.ok(validateManifestAttribution({
    id: 'b',
    publish: { destination_url: 'https://evil.example/x?utm_source=a&utm_medium=b&utm_campaign=c', caption: 'https://evil.example/x?utm_source=a&utm_medium=b&utm_campaign=c' }
  }, { inventory }).some((p) => p.includes('not an approved destination domain')));
  assert.deepEqual(validateManifestAttribution(null), ['manifest must be an object']);
});

test('manifest validation rejects a destination missing attribution parameters', () => {
  const url = 'https://stratumpraxis.com/agentic-ai-governance-permission-kit.html';
  const problems = validateManifestAttribution({
    id: 'c',
    publish: { destination_url: url, caption: `see ${url}`, destination_asset_id: 'agentic-ai-governance-permission-kit' }
  }, { inventory });
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    assert.ok(problems.some((p) => p.includes(key)), `expected a problem naming ${key}`);
  }
});

// ---- real repository state -------------------------------------------------

test('the real video ledger classifies without error and produces the recorded counts', async () => {
  const videoLedger = await readJson('trend-video-engine/publish-ledger.json');
  const { manifests } = await collectManifests();
  const records = [];
  for (const [manifestId, services] of Object.entries(videoLedger.items || {})) {
    for (const [platform, entry] of Object.entries(services || {})) {
      if (platform.startsWith('_')) continue;
      records.push(classifyAttribution(manifests.get(manifestId) || null, entry, { platform, manifestId, inventory, sourceRouting }));
    }
  }
  const summary = summarizeAttribution(records);

  assert.ok(summary.published_with_attribution >= 1,
    'at least the agent-control-youtube-v5 post is provably attributed');
  assert.equal(
    summary.published_by_attribution_state.ATTRIBUTED
    + summary.published_by_attribution_state.UNATTRIBUTED
    + summary.published_by_attribution_state.NOT_APPLICABLE
    + summary.published_by_attribution_state.UNVERIFIED,
    summary.published,
    'every published post falls into exactly one attribution state'
  );
  const attributed = records.find((r) => r.ledger_id === 'tve:2026-08-27-agent-control-youtube-v5:youtube');
  assert.equal(attributed.attribution_state, 'ATTRIBUTED');
  assert.equal(attributed.destination_asset_id, 'agentic-ai-governance-permission-kit');
});

test('classifying the real ledger leaves the video ledger byte-identical', async () => {
  const before = await fs.readFile(repoPath('trend-video-engine/publish-ledger.json'), 'utf8');
  const videoLedger = JSON.parse(before);
  const { manifests } = await collectManifests();
  for (const [manifestId, services] of Object.entries(videoLedger.items || {})) {
    for (const [platform, entry] of Object.entries(services || {})) {
      if (platform.startsWith('_')) continue;
      classifyAttribution(manifests.get(manifestId) || null, entry, { platform, manifestId, inventory, sourceRouting });
    }
  }
  const after = await fs.readFile(repoPath('trend-video-engine/publish-ledger.json'), 'utf8');
  assert.equal(before, after);
});

test('the manifest resolver finds a manifest for the attributed post', async () => {
  const { manifests, sources } = await collectManifests();
  assert.ok(manifests.has('2026-08-27-agent-control-youtube-v5'));
  assert.ok(sources.get('2026-08-27-agent-control-youtube-v5').includes('variants/'));
});
