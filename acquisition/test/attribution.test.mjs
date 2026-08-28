import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  ATTRIBUTION_STATES,
  LEDGER_PUBLISHER_PROOFS,
  UNPROVEN_PUBLISHERS,
  classifyAttribution,
  establishCaptionProof,
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
const VIDEO_LEDGER = 'trend-video-engine/publish-ledger.json';
// Established once from the real publisher source, exactly as the backfill does.
const captionProof = await establishCaptionProof(VIDEO_LEDGER);
const ctx = (platform = 'youtube', manifestId = 'm1') => ({ platform, manifestId, inventory, sourceRouting, captionProof });

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
      records.push(classifyAttribution(manifests.get(manifestId) || null, entry, { platform, manifestId, inventory, sourceRouting, captionProof }));
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
      classifyAttribution(manifests.get(manifestId) || null, entry, { platform, manifestId, inventory, sourceRouting, captionProof });
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

// ---- the caption proof is a property of the publishing path, not of manifests -------

test('the caption proof holds for the video ledger, established from the real publisher source', async () => {
  const proof = await establishCaptionProof(VIDEO_LEDGER);
  assert.equal(proof.proven, true);
  assert.equal(proof.publisher, 'distribution/buffer-video-publisher.mjs');
  assert.equal(proof.payload_source, 'publish.caption');
});

test('the real publisher still satisfies both halves of the proof', async () => {
  // If someone edits buffer-video-publisher.mjs so it no longer reads publish.caption,
  // or no longer sends that caption as the post text, this fails loudly instead of
  // letting the engine keep claiming attribution it can no longer justify.
  const spec = LEDGER_PUBLISHER_PROOFS[VIDEO_LEDGER];
  const source = await fs.readFile(repoPath(spec.publisher), 'utf8');
  assert.match(source, spec.assignment, 'publisher no longer reads the body from publish.caption');
  assert.match(source, spec.transmission, 'publisher no longer sends that caption as the post text');
});

test('a ledger with no registered publishing path is never proven', async () => {
  const proof = await establishCaptionProof('distribution/content-queue.json');
  assert.equal(proof.proven, false);
  assert.match(proof.reasons[0], /no publishing path is registered/);
});

test('a publisher that stopped reading publish.caption breaks the proof', async () => {
  const proof = await establishCaptionProof(VIDEO_LEDGER, {
    readFile: async () => 'const caption = String(manifest.summary).trim();\nconst m = `createPost(input:{text:${q(caption)}`;'
  });
  assert.equal(proof.proven, false);
  assert.ok(proof.reasons.some((r) => r.includes('no longer reads the post body')));
});

test('a publisher that stopped transmitting the caption breaks the proof', async () => {
  const proof = await establishCaptionProof(VIDEO_LEDGER, {
    readFile: async () => 'const caption = String(publish.caption).trim();\nconst m = `createPost(input:{text:${q(title)}`;'
  });
  assert.equal(proof.proven, false);
  assert.ok(proof.reasons.some((r) => r.includes('no longer transmits')));
});

test('an unreadable publisher breaks the proof rather than defaulting to true', async () => {
  const proof = await establishCaptionProof(VIDEO_LEDGER, {
    readFile: async () => { throw new Error('ENOENT'); }
  });
  assert.equal(proof.proven, false);
  assert.ok(proof.reasons.some((r) => r.includes('could not read')));
});

test('without a proven path a perfect tracked caption is still only UNVERIFIED', async () => {
  const broken = { proven: false, publisher: 'distribution/buffer-video-publisher.mjs', reasons: ['publisher changed'] };
  const record = classifyAttribution(await fixture('attributed-youtube'), sent, {
    platform: 'youtube', manifestId: 'm1', inventory, sourceRouting, captionProof: broken
  });
  assert.equal(record.attribution_state, 'UNVERIFIED');
  assert.equal(record.destination_asset_id, null);
  assert.match(record.attribution_evidence, /does not prove that the manifest caption was the transmitted payload/);
  assert.ok(record.problems.includes('publisher changed'));
});

test('omitting the caption proof entirely yields UNVERIFIED, never ATTRIBUTED', async () => {
  const record = classifyAttribution(await fixture('attributed-youtube'), sent, {
    platform: 'youtube', manifestId: 'm1', inventory, sourceRouting
  });
  assert.equal(record.attribution_state, 'UNVERIFIED');
  assert.equal(record.payload_proof.proven, false);
});

test('an awareness-only manifest also needs a proven path before it can be NOT_APPLICABLE', async () => {
  const broken = { proven: false, publisher: null, reasons: ['no proof'] };
  const record = classifyAttribution(await fixture('awareness-only'), sent, {
    platform: 'tiktok', manifestId: 'm1', inventory, sourceRouting, captionProof: broken
  });
  assert.equal(record.attribution_state, 'UNVERIFIED');
});

test('every classified record carries the payload proof it was judged under', async () => {
  const record = classifyAttribution(await fixture('attributed-youtube'), sent, ctx());
  assert.equal(record.payload_proof.proven, true);
  assert.equal(record.payload_proof.publisher, 'distribution/buffer-video-publisher.mjs');
  assert.match(record.attribution_evidence, /buffer-video-publisher\.mjs/);
});

test('the image/text lane is explicitly recorded as not covered by this proof', () => {
  assert.ok(UNPROVEN_PUBLISHERS['distribution/buffer-publisher.mjs']);
  assert.match(UNPROVEN_PUBLISHERS['distribution/buffer-publisher.mjs'], /content-queue\.json/);
  assert.ok(UNPROVEN_PUBLISHERS['distribution/buffer-video-status.mjs']);
  assert.match(UNPROVEN_PUBLISHERS['distribution/buffer-video-status.mjs'], /creates no records/);
});

test('the image/text publisher genuinely uses a different payload shape', async () => {
  // Guards the boundary: if buffer-publisher.mjs ever started sending publish.caption,
  // this assumption would need revisiting rather than silently persisting.
  const source = await fs.readFile(repoPath('distribution/buffer-publisher.mjs'), 'utf8');
  assert.doesNotMatch(source, /publish\.caption/, 'the image/text lane must not be assumed to share the video caption contract');
  assert.match(source, /item\.text/, 'the image/text lane builds its payload from the queue item');
});

test('buffer-video-status.mjs cannot introduce a record whose payload is unproven', async () => {
  const source = await fs.readFile(repoPath('distribution/buffer-video-status.mjs'), 'utf8');
  // It reads the existing item and bails when absent, so it never creates a new post record.
  assert.match(source, /ledger\.items\?\.\[manifest\.id\]/);
  assert.doesNotMatch(source, /createPost\(/, 'the status checker must never create posts');
});

test('every workflow that writes the video ledger routes through a registered publisher', async () => {
  const registered = new Set(Object.values(LEDGER_PUBLISHER_PROOFS).map((p) => p.publisher));
  // Status-only writers are allowed because they create no records.
  const statusOnly = new Set(['distribution/buffer-video-status.mjs']);

  const dir = repoPath('.github/workflows');
  for (const file of await fs.readdir(dir)) {
    const raw = await fs.readFile(`${dir}/${file}`, 'utf8');
    if (!raw.includes('publish-ledger.json') && !raw.includes('buffer-video-publisher')) continue;
    const invoked = [...raw.matchAll(/node\s+(distribution\/[\w.-]+\.mjs)/g)].map((m) => m[1]);
    for (const script of invoked) {
      if (!script.includes('video')) continue;
      assert.ok(
        registered.has(script) || statusOnly.has(script),
        `${file} invokes ${script}, which is neither a registered caption-proving publisher nor a status-only writer`
      );
    }
  }
});
