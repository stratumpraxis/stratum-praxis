import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDuplication, crossLanguageAnchorOverlap, structureSimilarity } from '../src/duplicate-guard.mjs';
import { jaccard, laneKey, normalizeCopy, shingles, textSimilarity } from '../src/text.mjs';

const NOW = Date.parse('2026-08-29T00:00:00Z');
const days = (n) => new Date(NOW - n * 86400000).toISOString();

const base = {
  id: 'draft-1',
  title: 'Where small teams lose time on AI tooling',
  hook: 'Three tools, one job, nobody owns the decision.',
  body: 'Small teams add an AI tool for each new problem, and Notion, Slack and Linear each grow a subscription.\n\nNobody retires the previous one, so 3 tools cover 1 job by March 2026.\n\nThe cost shows up at renewal, not at purchase, and the invoice reads $99 per seat.',
  cta_text: 'Run the checklist',
  language: 'en',
  channel_id: 'newsletter',
  source_id: 'src-1',
  target_asset: 'checklist',
  campaign: 'tool-sprawl',
  cta_id: 'checklist_cta',
  audience: ['founder'],
  created_at: days(0)
};

test('a genuinely different draft passes', () => {
  const other = {
    ...base,
    id: 'prior-1',
    title: 'How renewal dates hide the real cost of software',
    hook: 'The invoice arrives eleven months after the decision.',
    body: 'Renewal is the moment a purchase decision is finally priced.\n\nMost teams never revisit it.',
    campaign: 'renewals',
    target_asset: 'guide',
    cta_id: 'guide_cta',
    source_id: 'src-2',
    channel_id: 'blog',
    created_at: days(40)
  };
  assert.equal(checkDuplication(base, { published: [other], now: NOW }).ok, true);
});

test('a reshuffled restatement in the same language is blocked as copy-spin', () => {
  const spun = {
    ...base,
    id: 'prior-2',
    title: 'Small teams and the time lost to AI tooling',
    body: 'Small teams add an AI tool for each new problem, and Notion, Slack and Linear each grow a subscription.\n\nNobody retires the previous one, so 3 tools cover 1 job by March 2026.\n\nAt renewal, not at purchase, the cost shows up, and the invoice reads $99 per seat.',
    source_id: 'src-9',
    channel_id: 'blog',
    campaign: 'other',
    created_at: days(60)
  };
  const result = checkDuplication(base, { published: [spun], now: NOW });
  assert.equal(result.ok, false);
  assert.ok(result.blocks.some((b) => b.rule === 'COPY_SPIN'));
});

test('a draft that merely restates its source is blocked', () => {
  const source = { excerpt: base.body };
  const result = checkDuplication(base, { source, now: NOW });
  assert.equal(result.ok, false);
  assert.ok(result.blocks.some((b) => b.rule === 'SOURCE_ECHO'));
});

test('a different language alone is not differentiation', () => {
  const spanish = {
    ...base,
    id: 'prior-3',
    language: 'es',
    title: 'Donde los equipos pequenos pierden tiempo con AI',
    hook: 'Tres herramientas, un trabajo.',
    body: 'Small teams add an AI tool for each new problem, and Notion, Slack and Linear each grow a subscription.\n\nNobody retires the previous one, so 3 tools cover 1 job by March 2026.\n\nThe cost shows up at renewal, not at purchase, and the invoice reads $99 per seat.',
    source_id: 'src-9',
    channel_id: 'blog',
    campaign: 'other',
    created_at: days(60)
  };
  const result = checkDuplication(base, { published: [spanish], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'CROSS_LANGUAGE_DUPLICATE'), JSON.stringify(result));
});

test('an identical title is blocked even when the body differs', () => {
  const other = {
    ...base,
    id: 'prior-4',
    hook: 'A completely unrelated hook about invoices.',
    body: 'Nothing here resembles the other article in any way whatsoever, it discusses invoices and paper.',
    source_id: 'src-9',
    channel_id: 'blog',
    campaign: 'other',
    created_at: days(60)
  };
  const result = checkDuplication(base, { published: [other], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'REPEATED_TITLE'));
});

test('the same source cannot go to the same channel inside the cooldown', () => {
  const recent = {
    ...base,
    id: 'prior-5',
    title: 'An entirely separate headline about invoices',
    hook: 'Different hook.',
    body: 'Different body about invoices and paper trails entirely.',
    published_at: days(3)
  };
  const result = checkDuplication(base, { published: [recent], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'SAME_SOURCE_SAME_CHANNEL_COOLDOWN'));
});

test('the same source may go to the same channel once the cooldown has passed', () => {
  const old = {
    ...base,
    id: 'prior-6',
    title: 'An entirely separate headline about invoices',
    hook: 'Different hook.',
    body: 'Different body about invoices and paper trails entirely.',
    cta_id: 'other_cta',
    published_at: days(30)
  };
  const result = checkDuplication(base, { published: [old], now: NOW });
  assert.equal(result.blocks.some((b) => b.rule === 'SAME_SOURCE_SAME_CHANNEL_COOLDOWN'), false);
});

test('two items competing for one audience, CTA and destination are cannibalization', () => {
  const rival = {
    ...base,
    id: 'prior-7',
    title: 'A separate headline about paper invoices',
    hook: 'Different hook.',
    body: 'Different body about invoices and paper trails entirely.',
    source_id: 'src-9',
    published_at: days(2)
  };
  const result = checkDuplication(base, { published: [rival], now: NOW });
  assert.ok(result.blocks.some((b) => b.rule === 'SAME_AUDIENCE_CTA_COOLDOWN'));
});

test('a missing publish date is treated as inside the cooldown, not outside it', () => {
  const undated = {
    ...base,
    id: 'prior-8',
    title: 'A separate headline about paper invoices',
    hook: 'Different hook.',
    body: 'Different body about invoices and paper trails entirely.',
    created_at: undefined
  };
  const result = checkDuplication(base, { published: [undated], now: NOW });
  assert.ok(result.blocks.some((b) => b.detail.includes('no date recorded')));
});

test('the same skeleton with substitutions is warned about, not silently passed', () => {
  const draft = { ...base, body: '## Problem\n\nOne.\n\n## Cost\n\nTwo.' };
  const other = {
    ...base,
    id: 'prior-9',
    title: 'Wholly unrelated headline concerning paper',
    hook: 'Unrelated hook.',
    body: '## Problem\n\nAlpha.\n\n## Cost\n\nBeta.',
    source_id: 'src-9',
    channel_id: 'blog',
    campaign: 'other',
    cta_id: 'other_cta',
    created_at: days(60)
  };
  const result = checkDuplication(draft, { published: [other], now: NOW });
  assert.ok(result.warnings.some((w) => w.rule === 'STRUCTURE_REUSE'), JSON.stringify(result));
});

test('thresholds are overridable per call', () => {
  const other = { ...base, id: 'prior-10', source_id: 'src-9', channel_id: 'blog', campaign: 'other', cta_id: 'x', created_at: days(60) };
  const strict = checkDuplication(base, { published: [other], now: NOW, thresholds: { title_similarity: 0.01 } });
  assert.ok(strict.blocks.some((b) => b.rule === 'REPEATED_TITLE'));
});

test('normalizeCopy collapses casing, spacing, punctuation and URLs', () => {
  assert.equal(normalizeCopy('  Hello,   WORLD! https://x.test/a  '), 'hello world');
});

test('laneKey is stable across spellings of the same lane', () => {
  assert.equal(
    laneKey({ channel: 'News Letter', assetId: 'Check-List', campaign: 'Tool Sprawl' }),
    laneKey({ channel: 'news letter', assetId: 'check list', campaign: 'tool_sprawl' })
  );
});

test('jaccard, shingles and textSimilarity behave at the edges', () => {
  assert.equal(jaccard(new Set(), new Set()), 0);
  assert.equal(textSimilarity('same words here now', 'same words here now'), 1);
  assert.equal(shingles('two words').size, 1);
});

test('anchor overlap sees numbers and proper nouns across languages', () => {
  const a = { body: 'Stripe raised the fee to 2.9% in 2026.' };
  const b = { body: 'Stripe subio la comision a 2.9% en 2026.' };
  assert.ok(crossLanguageAnchorOverlap(a, b) >= 0.5);
});

test('structureSimilarity compares headings and rhythm', () => {
  const a = { body: '## One\n\nx\n\n## Two\n\ny' };
  assert.equal(structureSimilarity(a, a), 1);
});
