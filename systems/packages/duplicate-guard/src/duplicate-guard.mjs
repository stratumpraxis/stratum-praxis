// The duplicate and cannibalization guard.
//
// "Different language" is not differentiation. Neither is a noun swap, a reshuffled
// paragraph or the same skeleton with substitutions. This module compares one draft
// against its own source, its siblings from the same source, and everything already
// published on the same channel and lane.
//
// Every threshold is a constructor argument. The defaults below are the values the
// original pipeline runs in production.

import { jaccard, laneKey, normalizeCopy, shingles, textSimilarity } from './text.mjs';

export const DEFAULT_THRESHOLDS = Object.freeze({
  copy_spin: 0.55,            // same sentences, reshuffled words, one language
  source_echo: 0.45,          // the draft is mostly the source restated
  title_similarity: 0.6,
  structure_similarity: 0.85, // same skeleton with substitutions
  cross_language_anchor: 0.8, // numbers and proper nouns aligned across languages
  same_source_channel_cooldown_days: 14,
  same_audience_cta_cooldown_days: 7
});

const MS_PER_DAY = 86400000;

function textOf(item) {
  return [item.title, item.hook, item.body, item.cta_text].filter(Boolean).join('\n');
}

/** The shape of an article: its section headings and its sentence-length rhythm. */
export function structureSignature(item) {
  const body = String(item.body || '');
  const headings = [...body.matchAll(/^#{1,6}\s*(.+)$/gm)].map((m) => normalizeCopy(m[1]));
  const lengths = body
    .split(/\n{2,}/)
    .map((p) => Math.min(9, Math.round(normalizeCopy(p).split(' ').filter(Boolean).length / 25)));
  return { headings, rhythm: lengths.join('-'), section_count: headings.length };
}

export function structureSimilarity(a, b) {
  const sa = structureSignature(a);
  const sb = structureSignature(b);
  if (!sa.section_count && !sb.section_count) {
    return sa.rhythm && sa.rhythm === sb.rhythm ? 1 : 0;
  }
  const headingOverlap = jaccard(new Set(sa.headings), new Set(sb.headings));
  const rhythmMatch = sa.rhythm === sb.rhythm ? 1 : 0;
  return Number(((headingOverlap * 0.7) + (rhythmMatch * 0.3)).toFixed(4));
}

/**
 * Numbers and capitalised terms survive translation. Identical anchors across two
 * languages, in the same structure, is the signature of a literal duplicate.
 */
export function crossLanguageAnchorOverlap(a, b) {
  return Number(jaccard(anchorSet(a), anchorSet(b)).toFixed(4));
}

/**
 * Anchors are the tokens that survive translation: numbers, and proper nouns.
 *
 * A capitalised word at the start of a sentence is usually just a capitalised common
 * word ("Small", "Los"), and counting those dilutes the overlap with language-specific
 * noise until a literal translation stops looking like one. Sentence-initial words are
 * therefore only counted when the same word also appears capitalised mid-sentence.
 */
export function anchorSet(item) {
  const text = textOf(item);
  const midSentence = new Set();
  const initial = new Set();
  const numbers = new Set();

  for (const match of text.matchAll(/\b\d[\d.,%]*\b/g)) numbers.add(match[0].toLowerCase());

  for (const match of text.matchAll(/[A-Z][\p{L}]{2,}/gu)) {
    const before = text.slice(0, match.index).replace(/[\s"'“”‘’(\[]+$/u, '');
    const sentenceStart = before === '' || /[.!?¿¡:;]$/u.test(before);
    (sentenceStart ? initial : midSentence).add(match[0].toLowerCase());
  }

  const out = new Set([...numbers, ...midSentence]);
  for (const word of initial) if (midSentence.has(word)) out.add(word);
  return out;
}

/**
 * Check one draft against everything it could duplicate or cannibalize.
 *
 * @param {object} draft   { id, title, hook, body, cta_text, language, channel_id,
 *                           source_id, target_asset, campaign, cta_id, audience[] }
 * @param {object} context { source, siblings, published, now, thresholds }
 * @returns {{ ok: boolean, blocks: Array, warnings: Array }}
 */
export function checkDuplication(draft, {
  source = null,
  siblings = [],
  published = [],
  now = Date.now(),
  thresholds = {}
} = {}) {
  const limits = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const blocks = [];
  const warnings = [];
  const text = textOf(draft);
  const grams = shingles(text);

  // 1. Is the draft just the source restated?
  if (source?.excerpt) {
    const echo = textSimilarity(source.excerpt, text);
    if (echo >= limits.source_echo) {
      blocks.push({
        rule: 'SOURCE_ECHO',
        detail: `output is ${(echo * 100).toFixed(0)}% similar to the source excerpt; a derivative must transform the source, not restate it`,
        similarity: Number(echo.toFixed(4))
      });
    }
  }

  const others = [...siblings, ...published].filter((o) => o && o.id !== draft.id);

  for (const other of others) {
    const otherText = textOf(other);
    const similarity = jaccard(grams, shingles(otherText));
    const sameLanguage = other.language === draft.language;

    // 2. Sentence-level copy-spin within one language.
    if (sameLanguage && similarity >= limits.copy_spin) {
      blocks.push({
        rule: 'COPY_SPIN',
        against: other.id,
        detail: `${(similarity * 100).toFixed(0)}% shingle overlap with ${other.id} in the same language`,
        similarity: Number(similarity.toFixed(4))
      });
    }

    // 3. Literal cross-language duplicate. A different language alone is not differentiation.
    if (!sameLanguage) {
      const anchors = crossLanguageAnchorOverlap(draft, other);
      const structure = structureSimilarity(draft, other);
      if (anchors >= limits.cross_language_anchor && structure >= limits.structure_similarity) {
        blocks.push({
          rule: 'CROSS_LANGUAGE_DUPLICATE',
          against: other.id,
          detail: `${(anchors * 100).toFixed(0)}% anchor overlap and ${(structure * 100).toFixed(0)}% structural match with ${other.id}`,
          anchors,
          structure
        });
      }
    }

    // 4. Repeated title or hook.
    for (const key of ['title', 'hook']) {
      if (!draft[key] || !other[key]) continue;
      const fieldSimilarity = jaccard(shingles(draft[key], 3), shingles(other[key], 3));
      const identical = normalizeCopy(draft[key]) === normalizeCopy(other[key]);
      if (identical || fieldSimilarity >= limits.title_similarity) {
        blocks.push({
          rule: `REPEATED_${key.toUpperCase()}`,
          against: other.id,
          detail: identical
            ? `${key} is identical to ${other.id}`
            : `${key} is ${(fieldSimilarity * 100).toFixed(0)}% similar to ${other.id}`,
          similarity: Number(fieldSimilarity.toFixed(4))
        });
      }
    }

    // 5. Same skeleton with words swapped, within one language.
    if (sameLanguage) {
      const structure = structureSimilarity(draft, other);
      if (structure >= limits.structure_similarity && similarity < limits.copy_spin) {
        warnings.push({
          rule: 'STRUCTURE_REUSE',
          against: other.id,
          detail: `${(structure * 100).toFixed(0)}% structural match with ${other.id}; check this is not the same article with substitutions`,
          structure
        });
      }
    }

    // 6. Same source routed to the same channel inside the cooldown.
    if (other.source_id && draft.source_id && other.source_id === draft.source_id
      && other.channel_id === draft.channel_id) {
      const age = daysBetween(other.published_at || other.created_at, now);
      if (age === null || age < limits.same_source_channel_cooldown_days) {
        blocks.push({
          rule: 'SAME_SOURCE_SAME_CHANNEL_COOLDOWN',
          against: other.id,
          detail: `source ${draft.source_id} already went to ${draft.channel_id} ${age === null ? '(no date recorded)' : `${age.toFixed(1)} days ago`}; the cooldown is ${limits.same_source_channel_cooldown_days} days`
        });
      }
    }

    // 7. Same audience + CTA + destination inside the cooldown. This is cannibalization:
    //    two live items competing for one audience with one destination.
    const sameLane = laneKey({
      channel: draft.channel_id,
      assetId: draft.target_asset,
      campaign: draft.campaign
    }) === laneKey({
      channel: other.channel_id,
      assetId: other.target_asset,
      campaign: other.campaign
    });
    if (sameLane && other.cta_id === draft.cta_id && sameAudience(draft, other)) {
      const age = daysBetween(other.published_at || other.created_at, now);
      if (age === null || age < limits.same_audience_cta_cooldown_days) {
        blocks.push({
          rule: 'SAME_AUDIENCE_CTA_COOLDOWN',
          against: other.id,
          detail: `same audience, CTA ${draft.cta_id} and destination as ${other.id} within ${limits.same_audience_cta_cooldown_days} days`
        });
      }
    }
  }

  return { ok: blocks.length === 0, blocks, warnings };
}

function sameAudience(a, b) {
  const setA = new Set(a.audience || []);
  const setB = new Set(b.audience || []);
  if (!setA.size || !setB.size) return false;
  return [...setA].some((x) => setB.has(x));
}

function daysBetween(value, now) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return (now - time) / MS_PER_DAY;
}
