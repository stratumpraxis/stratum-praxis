// Issue #52 - the localization gate.
//
// The Spanish desk is not a translation lane. This module answers one question
// mechanically: is this Spanish output a localized piece, or is it the English piece
// with Spanish words in it?
//
// Four independent checks, all of which must pass:
//   1. LANGUAGE       the text is actually written in the target language
//   2. STRUCTURE      it is not sentence-for-sentence aligned with the English original
//   3. LOCALIZATION   framing, examples, terminology and CTA were actually adapted
//   4. DESTINATION    the CTA does not imply delivery the destination cannot provide

import { normalizeCopy } from '../../lib/util.mjs';
import { shingles, jaccard } from '../../signal-intelligence/lib/fingerprint.mjs';

/** Function words are the cheapest reliable language tell and need no dependency. */
const LANGUAGE_MARKERS = Object.freeze({
  en: ['the', 'and', 'of', 'to', 'for', 'with', 'that', 'this', 'is', 'are', 'you', 'your', 'from', 'what', 'when'],
  es: ['el', 'la', 'los', 'las', 'de', 'que', 'para', 'con', 'una', 'un', 'por', 'como', 'del', 'es', 'lo', 'se', 'su', 'tu', 'pero', 'cuando']
});

/** Elements the Spanish desk must adapt rather than translate. */
export const LOCALIZATION_ELEMENTS = Object.freeze([
  'framing',
  'hook',
  'terminology',
  'examples',
  'assumptions',
  'currency_context',
  'cta_wording',
  'cultural_context'
]);

export const MIN_LOCALIZED_ELEMENTS = 5;
export const MAX_TRANSLATION_SIMILARITY = 0.45;
export const MIN_LANGUAGE_CONFIDENCE = 0.55;

function words(text) {
  return normalizeCopy(text).split(' ').filter(Boolean);
}

/** Share of function words belonging to each language. */
export function languageProfile(text) {
  const tokens = words(text);
  if (!tokens.length) return { en: 0, es: 0, tokens: 0 };
  const counts = { en: 0, es: 0 };
  for (const token of tokens) {
    if (LANGUAGE_MARKERS.en.includes(token)) counts.en += 1;
    if (LANGUAGE_MARKERS.es.includes(token)) counts.es += 1;
  }
  const total = counts.en + counts.es;
  return {
    en: total ? counts.en / total : 0,
    es: total ? counts.es / total : 0,
    tokens: tokens.length,
    marker_hits: total
  };
}

export function detectLanguage(text) {
  const profile = languageProfile(text);
  if (profile.marker_hits < 3) return { language: 'UNKNOWN', confidence: 0, profile };
  const language = profile.es > profile.en ? 'es' : 'en';
  return { language, confidence: Math.max(profile.es, profile.en), profile };
}

/**
 * Structural alignment between a translation and its original.
 *
 * A literal translation keeps the sentence count, the sentence order and the numbers
 * and proper nouns in the same positions. A localized piece does not.
 */
export function structuralAlignment(originalText, targetText) {
  const original = splitSentences(originalText);
  const target = splitSentences(targetText);
  if (!original.length || !target.length) {
    return { aligned: false, ratio: 0, sentence_delta: Math.abs(original.length - target.length), positional_token_overlap: 0 };
  }

  const sentenceDelta = Math.abs(original.length - target.length);
  const pairs = Math.min(original.length, target.length);
  let positional = 0;
  let compared = 0;
  for (let i = 0; i < pairs; i += 1) {
    const a = tokenAnchors(original[i]);
    const b = tokenAnchors(target[i]);
    // A pair with no anchors on either side says nothing either way, so it is skipped
    // rather than scored as a difference.
    if (!a.size && !b.size) continue;
    positional += jaccard(a, b);
    compared += 1;
  }
  const positionalOverlap = compared ? positional / compared : 0;
  const sameShape = sentenceDelta === 0;

  return {
    aligned: sameShape && positionalOverlap >= 0.5,
    ratio: Number(positionalOverlap.toFixed(4)),
    sentence_delta: sentenceDelta,
    positional_token_overlap: Number(positionalOverlap.toFixed(4)),
    original_sentences: original.length,
    target_sentences: target.length
  };
}

/**
 * Numbers and proper nouns survive translation, so they anchor an alignment test.
 * The first word of a sentence is dropped: it is capitalised by position rather than by
 * being a name, and counting it would make every sentence pair look partly aligned.
 */
function tokenAnchors(sentence) {
  const out = new Set();
  const body = String(sentence).replace(/^\S+\s*/, '');
  for (const match of body.matchAll(/\b\d[\d.,%]*\b|\b[A-Z][\p{L}]{2,}\b/gu)) {
    out.add(match[0].toLowerCase());
  }
  return out;
}

function splitSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Run the localization gate on one derivation.
 *
 * @param {object} derivation the ES (or any non-source-language) output
 * @param {object} options    { desk, sibling, destinationLanguage }
 *   `sibling` is the same source's output on the other desk, when one exists.
 */
export function checkLocalization(derivation, { desk, sibling = null, destinationLanguage = 'en' } = {}) {
  const failures = [];
  const warnings = [];
  const targetLanguage = desk.language;
  const body = [derivation.title, derivation.hook, derivation.body, derivation.cta_text].filter(Boolean).join('\n');

  // 1. LANGUAGE
  const detected = detectLanguage(body);
  if (detected.language !== targetLanguage || detected.confidence < MIN_LANGUAGE_CONFIDENCE) {
    failures.push({
      check: 'LANGUAGE',
      detail: `text reads as ${detected.language} at ${(detected.confidence * 100).toFixed(0)}% confidence; the ${desk.desk_id} requires ${targetLanguage}`
    });
  }

  // 2. STRUCTURE - only meaningful when a sibling output exists to compare against.
  if (sibling) {
    const siblingBody = [sibling.title, sibling.hook, sibling.body, sibling.cta_text].filter(Boolean).join('\n');
    const alignment = structuralAlignment(siblingBody, body);
    if (alignment.aligned) {
      failures.push({
        check: 'STRUCTURE',
        detail: `output is sentence-for-sentence aligned with ${sibling.derivation_id} (${alignment.original_sentences} vs ${alignment.target_sentences} sentences, ${(alignment.positional_token_overlap * 100).toFixed(0)}% positional anchor overlap); this is a translation, not a localization`,
        alignment
      });
    } else if (alignment.positional_token_overlap > MAX_TRANSLATION_SIMILARITY && alignment.sentence_delta <= 1) {
      warnings.push({
        check: 'STRUCTURE',
        detail: `output is close to the structure of ${sibling.derivation_id}; review before publishing`,
        alignment
      });
    }
  }

  // 3. LOCALIZATION EVIDENCE
  const declared = derivation.localization || {};
  const localized = LOCALIZATION_ELEMENTS.filter((element) => {
    const value = declared[element];
    return typeof value === 'string' ? value.trim().length > 0 : value === true;
  });
  if (desk.requires_localization_review && localized.length < MIN_LOCALIZED_ELEMENTS) {
    failures.push({
      check: 'LOCALIZATION',
      detail: `only ${localized.length} of ${LOCALIZATION_ELEMENTS.length} localization elements were adapted (${localized.join(', ') || 'none'}); at least ${MIN_LOCALIZED_ELEMENTS} are required so this is not a translation lane`,
      missing: LOCALIZATION_ELEMENTS.filter((e) => !localized.includes(e))
    });
  }

  // 4. DESTINATION REALITY
  if (desk.requires_localization_review && destinationLanguage !== targetLanguage) {
    const disclosed = String(derivation.cta_text || '') + ' ' + String(derivation.destination_language_note || '');
    const statesLanguage = /\b(?:en\s+ingl[ée]s|in\s+english|english[- ]only|solo\s+en\s+ingl[ée]s)\b/i.test(disclosed);
    if (!statesLanguage) {
      failures.push({
        check: 'DESTINATION_LANGUAGE',
        detail: `the destination is in ${destinationLanguage} but the ${targetLanguage} CTA does not say so; implying ${targetLanguage}-language delivery that does not exist is a blocking failure`
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    detected_language: detected.language,
    language_confidence: Number(detected.confidence.toFixed(4)),
    localized_elements: localized,
    quality_score: Number((localized.length / LOCALIZATION_ELEMENTS.length).toFixed(4))
  };
}

export { jaccard, shingles };
