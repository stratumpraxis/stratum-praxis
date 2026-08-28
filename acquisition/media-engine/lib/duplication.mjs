// Issue #52 - the duplication and cannibalization guard.
//
// "Different language" is not differentiation. Neither is a noun swap. This module
// compares a derivation against its own source, its siblings from the same source, and
// recent outputs on the same lens, desk and channel.
//
// It composes the existing acquisition primitives (normalizeCopy, campaignKey) rather
// than inventing a second duplicate-detection vocabulary.

import { campaignKey } from '../../lib/utm.mjs';
import { normalizeCopy } from '../../lib/util.mjs';
import { jaccard, shingles, textSimilarity } from '../../signal-intelligence/lib/fingerprint.mjs';

export const THRESHOLDS = Object.freeze({
  copy_spin: 0.55,            // same sentences, reshuffled words
  source_echo: 0.45,          // the derivative is mostly the source restated
  title_similarity: 0.6,
  structure_similarity: 0.85, // same skeleton with substitutions
  cross_language_anchor: 0.8, // numbers and proper nouns aligned across languages
  same_source_channel_cooldown_days: 14,
  same_audience_cta_cooldown_days: 7
});

const MS_PER_DAY = 86400000;

function textOf(derivation) {
  return [derivation.title, derivation.hook, derivation.body, derivation.cta_text].filter(Boolean).join('\n');
}

/** The shape of an article: its section headings and sentence-length rhythm. */
export function structureSignature(derivation) {
  const body = String(derivation.body || '');
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

/** Numbers and capitalised terms survive translation; identical anchors across languages
 *  in the same order is the signature of a literal EN<->ES duplicate. */
export function crossLanguageAnchorOverlap(a, b) {
  const anchors = (d) => {
    const out = new Set();
    for (const match of textOf(d).matchAll(/\b\d[\d.,%]*\b|\b[A-Z][\p{L}]{2,}\b/gu)) out.add(match[0].toLowerCase());
    return out;
  };
  return Number(jaccard(anchors(a), anchors(b)).toFixed(4));
}

/**
 * Check one derivation against everything it could cannibalize.
 *
 * @param {object} derivation
 * @param {object} context { source, siblings, published, now }
 */
export function checkDuplication(derivation, { source = null, siblings = [], published = [], now = Date.now() } = {}) {
  const blocks = [];
  const warnings = [];
  const text = textOf(derivation);
  const grams = shingles(text);

  // 1. Is the derivative just the source restated?
  if (source?.excerpt) {
    const echo = textSimilarity(source.excerpt, text);
    if (echo >= THRESHOLDS.source_echo) {
      blocks.push({
        rule: 'SOURCE_ECHO',
        detail: `output is ${(echo * 100).toFixed(0)}% similar to the source excerpt; a derivative must transform the source, not restate it`,
        similarity: Number(echo.toFixed(4))
      });
    }
  }

  const others = [...siblings, ...published].filter((o) => o && o.derivation_id !== derivation.derivation_id);

  for (const other of others) {
    const otherText = textOf(other);
    const similarity = jaccard(grams, shingles(otherText));
    const sameLanguage = other.language === derivation.language;

    // 2. Sentence-level copy-spin within one language.
    if (sameLanguage && similarity >= THRESHOLDS.copy_spin) {
      blocks.push({
        rule: 'COPY_SPIN',
        against: other.derivation_id,
        detail: `${(similarity * 100).toFixed(0)}% shingle overlap with ${other.derivation_id} in the same language`,
        similarity: Number(similarity.toFixed(4))
      });
    }

    // 3. Literal EN <-> ES duplicate. Different language is not differentiation.
    if (!sameLanguage) {
      const anchors = crossLanguageAnchorOverlap(derivation, other);
      const structure = structureSimilarity(derivation, other);
      if (anchors >= THRESHOLDS.cross_language_anchor && structure >= THRESHOLDS.structure_similarity) {
        blocks.push({
          rule: 'CROSS_LANGUAGE_DUPLICATE',
          against: other.derivation_id,
          detail: `${(anchors * 100).toFixed(0)}% anchor overlap and ${(structure * 100).toFixed(0)}% structural match with ${other.derivation_id}; a different language alone is not differentiation`,
          anchors,
          structure
        });
      }
    }

    // 4. Repeated title or hook.
    for (const [field, key] of [['title', 'title'], ['hook', 'hook']]) {
      if (!derivation[key] || !other[key]) continue;
      const fieldSimilarity = jaccard(shingles(derivation[key], 3), shingles(other[key], 3));
      const identical = normalizeCopy(derivation[key]) === normalizeCopy(other[key]);
      if (identical || fieldSimilarity >= THRESHOLDS.title_similarity) {
        blocks.push({
          rule: 'REPEATED_' + field.toUpperCase(),
          against: other.derivation_id,
          detail: identical
            ? `${field} is identical to ${other.derivation_id}`
            : `${field} is ${(fieldSimilarity * 100).toFixed(0)}% similar to ${other.derivation_id}`,
          similarity: Number(fieldSimilarity.toFixed(4))
        });
      }
    }

    // 5. Same skeleton with words swapped, within one language.
    if (sameLanguage) {
      const structure = structureSimilarity(derivation, other);
      if (structure >= THRESHOLDS.structure_similarity && similarity < THRESHOLDS.copy_spin) {
        warnings.push({
          rule: 'STRUCTURE_REUSE',
          against: other.derivation_id,
          detail: `${(structure * 100).toFixed(0)}% structural match with ${other.derivation_id}; check this is not the same article with substitutions`,
          structure
        });
      }
    }

    // 6. Same source routed to the same channel inside the cooldown.
    if (other.source_id && derivation.source_id && other.source_id === derivation.source_id
      && other.channel_id === derivation.channel_id) {
      const age = daysBetween(other.published_at || other.created_at, now);
      if (age === null || age < THRESHOLDS.same_source_channel_cooldown_days) {
        blocks.push({
          rule: 'SAME_SOURCE_SAME_CHANNEL_COOLDOWN',
          against: other.derivation_id,
          detail: `source ${derivation.source_id} already went to ${derivation.channel_id} ${age === null ? '(no date recorded)' : `${age.toFixed(1)} days ago`}; the cooldown is ${THRESHOLDS.same_source_channel_cooldown_days} days`
        });
      }
    }

    // 7. Same audience + CTA + destination inside the cooldown.
    const sameLane = campaignKey({
      platform: derivation.channel_id,
      assetId: derivation.target_asset,
      campaign: derivation.campaign
    }) === campaignKey({
      platform: other.channel_id,
      assetId: other.target_asset,
      campaign: other.campaign
    });
    if (sameLane && other.cta_id === derivation.cta_id && sameAudience(derivation, other)) {
      const age = daysBetween(other.published_at || other.created_at, now);
      if (age === null || age < THRESHOLDS.same_audience_cta_cooldown_days) {
        blocks.push({
          rule: 'SAME_AUDIENCE_CTA_COOLDOWN',
          against: other.derivation_id,
          detail: `same audience, CTA ${derivation.cta_id} and destination as ${other.derivation_id} within ${THRESHOLDS.same_audience_cta_cooldown_days} days`
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
