import test from 'node:test';
import assert from 'node:assert/strict';

import { THRESHOLDS, checkDuplication, structureSimilarity } from '../lib/duplication.mjs';
import { loadDerivations, loadMediaContext } from '../lib/context.mjs';

const context = await loadMediaContext();
const doc = await loadDerivations();
const en = doc.derivations.find((d) => d.desk_id === 'en_desk');
const es = doc.derivations.find((d) => d.desk_id === 'es_desk');
const NOW = Date.parse('2026-08-28T00:00:00Z');

test('the two shipped outputs are differentiated enough to coexist', () => {
  const result = checkDuplication(en, { source: context.sources.get(en.source_id), siblings: [es], now: NOW });
  assert.deepEqual(result.blocks, [], JSON.stringify(result.blocks, null, 2));
});

test('the English output is materially transformed, not the source restated', () => {
  const source = context.sources.get(en.source_id);
  const echo = checkDuplication(
    { ...en, derivation_id: 'echo-probe', body: source.excerpt, title: 'x', hook: 'y', cta_text: 'z' },
    { source, now: NOW }
  );
  assert.ok(echo.blocks.some((b) => b.rule === 'SOURCE_ECHO'),
    'restating the source must be blocked');

  const real = checkDuplication(en, { source, now: NOW });
  assert.equal(real.blocks.some((b) => b.rule === 'SOURCE_ECHO'), false,
    'the shipped output transforms its source');
});

test('sentence-level copy-spin inside one language is blocked', () => {
  const spun = {
    ...en,
    derivation_id: 'spun-en',
    title: 'Before the next renewal, someone must name the number',
    channel_id: 'bluesky',
    campaign: 'other_campaign'
  };
  const result = checkDuplication(spun, { siblings: [en], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'COPY_SPIN'));
});

test('a different language alone is not differentiation', () => {
  // A word-for-word Spanish rendering keeps the same anchors and the same skeleton.
  const mirrored = {
    derivation_id: 'mirror-es',
    source_id: 'other-source',
    language: 'es',
    channel_id: 'bluesky',
    campaign: 'mirror',
    title: 'Antes de la proxima renovacion',
    hook: 'hook',
    body: en.body,
    cta_text: en.cta_text
  };
  const result = checkDuplication(mirrored, { siblings: [en], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'CROSS_LANGUAGE_DUPLICATE'),
    `expected a cross-language block, got ${result.blocks.map((b) => b.rule).join(', ') || 'none'}`);
});

test('a repeated title or hook is blocked', () => {
  const sameTitle = {
    derivation_id: 'same-title',
    source_id: 'other-source',
    language: 'en',
    channel_id: 'threads',
    campaign: 'other',
    title: en.title,
    hook: 'a completely different opening line about something else entirely',
    body: 'Unrelated body text about an unrelated subject with no shared phrasing whatsoever.',
    cta_text: 'Different call to action.'
  };
  const result = checkDuplication(sameTitle, { siblings: [en], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'REPEATED_TITLE'));
});

test('an identical skeleton with words swapped is surfaced', () => {
  const skeleton = (a, b, c) => `## ${a}\n\nSome opening text here to fill the section with enough words that the rhythm measurement has something to work with at all.\n\n## ${b}\n\nMore text in the second section, again long enough that the paragraph length bucket is stable and comparable.\n\n## ${c}\n\nA closing section with a similar amount of text so the shape of the two documents matches closely.`;
  const first = { derivation_id: 'a', body: skeleton('The problem', 'The diagnosis', 'The next step') };
  const second = { derivation_id: 'b', body: skeleton('The problem', 'The diagnosis', 'The next step') };
  assert.ok(structureSimilarity(first, second) >= THRESHOLDS.structure_similarity);
});

test('the same source going to the same channel inside the cooldown is blocked', () => {
  const earlier = {
    ...en,
    derivation_id: 'earlier-devto',
    title: 'A different title entirely',
    hook: 'A different hook entirely about a different framing of the subject',
    body: 'Unrelated body text with no shared phrasing at all, written about a separate question.',
    cta_text: 'Another call to action.',
    published_at: new Date(NOW - 3 * 86400000).toISOString()
  };
  const result = checkDuplication(en, { siblings: [earlier], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'SAME_SOURCE_SAME_CHANNEL_COOLDOWN'));

  // Outside the cooldown it is allowed again.
  const old = { ...earlier, published_at: new Date(NOW - 60 * 86400000).toISOString() };
  const later = checkDuplication(en, { siblings: [old], now: NOW });
  assert.equal(later.blocks.some((b) => b.rule === 'SAME_SOURCE_SAME_CHANNEL_COOLDOWN'), false);
});

test('the same audience, CTA and destination inside the cooldown is blocked', () => {
  const twin = {
    derivation_id: 'twin-lane',
    source_id: 'a-different-source',
    language: 'en',
    channel_id: en.channel_id,
    campaign: en.campaign,
    target_asset: en.target_asset,
    cta_id: en.cta_id,
    audience: ['finance'],
    title: 'An entirely separate headline on a separate question',
    hook: 'A separate opening sentence with no shared wording',
    body: 'Separate body copy about a separate topic, sharing nothing with the other article.',
    cta_text: 'Separate call to action.',
    published_at: new Date(NOW - 86400000).toISOString()
  };
  const result = checkDuplication(en, { siblings: [twin], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'SAME_AUDIENCE_CTA_COOLDOWN'));
});

test('an undated sibling is treated as inside the cooldown, not outside it', () => {
  const undated = {
    ...en,
    derivation_id: 'undated-sibling',
    title: 'A different title entirely',
    hook: 'A different hook entirely about a different framing',
    body: 'Unrelated body text with no shared phrasing at all.',
    cta_text: 'Another call to action.',
    created_at: null,
    published_at: null
  };
  const result = checkDuplication(en, { siblings: [undated], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'SAME_SOURCE_SAME_CHANNEL_COOLDOWN'));
});
