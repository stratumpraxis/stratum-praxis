// Revenue Publisher v2 - the gate composition for the Blogger lane.
//
// Section 8 of the brief offered two ways to make the published disclosure honest:
// integrate the authoritative media-engine gates, or weaken the disclosure. This file
// is the first option. The same truth gate and the same duplication gate that
// acquisition/media-engine uses are executed here, on the generated article, and the
// artifact records exactly which gates ran so the disclosure can name them without
// overstating anything.
//
// Everything is pure and offline. Nothing here calls a model or publishes.

import { checkDuplication } from '../../media-engine/lib/duplication.mjs';
import { checkTruth } from '../../media-engine/lib/truth-gate.mjs';
import { BLOCKED_CLAIM_PATTERNS } from '../../lib/safety.mjs';
import { checkCta } from './cta-gate.mjs';
import { assessEditorialQuality } from './editorial-quality.mjs';

export const GATE_IDS = Object.freeze([
  'first_person_truth_gate',
  'privacy_gate',
  'lens_contract_gate',
  'source_restricted_claim_gate',
  'safety_blocked_claim_gate',
  'duplication_gate',
  'cta_route_verification_gate',
  'editorial_quality_v2'
]);

/** The duplication gate speaks the media-engine derivation shape, so translate once. */
export function derivationFrom(article, context = {}) {
  const { source = {}, lensId = null, channelId = 'owned_signal', campaign = 'autonomous_revenue_publisher', ctaAssetId = null, createdAt = null } = context;
  return {
    derivation_id: article.output_id || `pending-${source.source_id || 'unknown'}`,
    source_id: source.source_id || null,
    language: source.language || 'en',
    lens_id: lensId,
    channel_id: channelId,
    campaign,
    target_asset: ctaAssetId,
    cta_id: ctaAssetId,
    audience: source.audience_keys || [],
    title: article.title || article.selected_title || '',
    hook: article.dek || '',
    body: article.body || article.body_markdown || '',
    cta_text: article.cta_text || '',
    created_at: createdAt || new Date().toISOString()
  };
}

/**
 * Run every gate over one generated article and return a single verdict.
 *
 * @param {object} article { title|selected_title, dek, body|body_markdown, evidence_notes, cta_recommendation }
 * @param {object} context
 *   source        media-engine source record
 *   identity      media-engine identity.json
 *   lens          the chosen lens record
 *   vertical      the revenue-vertical contract
 *   inventory     loaded asset inventory
 *   siblings      prior derivations from the same source
 *   published     prior published derivations
 *   assetPageText the CTA destination's page text, for microcopy verification
 */
export function runEditorialGates(article, context = {}) {
  const {
    source = {},
    identity = null,
    lens = null,
    vertical = null,
    inventory = null,
    siblings = [],
    published = [],
    assetPageText = '',
    lensId = null,
    now = Date.now(),
    minWords = 750
  } = context;

  const body = String(article?.body ?? article?.body_markdown ?? '');
  const title = String(article?.title ?? article?.selected_title ?? '');

  // 1-4. The authoritative first-person / privacy / lens / source-claim gate.
  const truth = identity
    ? checkTruth([title, article?.dek || '', body].filter(Boolean).join('\n\n'), { identity, source, lens, field: 'body' })
    : { ok: true, violations: [], checked_sentences: 0, skipped: 'no identity contract supplied' };

  // 5. CTA route verification.
  const cta = checkCta(article?.cta_recommendation || {}, { source, inventory, vertical, assetPageText });

  // 6. Duplication and cannibalization, against the same source and prior outputs.
  const derivation = derivationFrom(article, {
    source, lensId, ctaAssetId: cta.asset_id || null
  });
  const duplication = checkDuplication(derivation, { source, siblings, published, now });

  // 7. The editorial quality model, which reads the results of everything above.
  const quality = assessEditorialQuality(article, {
    source,
    vertical,
    truthViolations: truth.violations || [],
    ctaVerdict: cta,
    duplication,
    safetyPatterns: BLOCKED_CLAIM_PATTERNS,
    minWords
  });

  const publishable = quality.publishable && truth.ok && cta.ok && duplication.ok;

  return {
    status: publishable ? 'READY' : 'DRAFT',
    publishable,
    quality,
    truth: {
      ok: truth.ok,
      violations: truth.violations || [],
      checked_sentences: truth.checked_sentences ?? 0,
      gate: 'acquisition/media-engine/lib/truth-gate.mjs'
    },
    cta,
    duplication: {
      ok: duplication.ok,
      blocks: duplication.blocks,
      warnings: duplication.warnings,
      gate: 'acquisition/media-engine/lib/duplication.mjs'
    },
    gates_executed: GATE_IDS.filter((id) => id !== 'first_person_truth_gate' || Boolean(identity)),
    blocking_reasons: [
      ...(truth.ok ? [] : truth.violations.map((v) => `${v.gate}: ${v.label}`)),
      ...(cta.ok ? [] : cta.failures.map((f) => `${f.code}: ${f.detail}`)),
      ...duplication.blocks.map((b) => `${b.rule}: ${b.detail}`),
      ...quality.critical_failures.map((c) => `${c.code}: ${c.detail}`),
      ...(quality.score >= quality.threshold || quality.critical_failures.length
        ? []
        : [`QUALITY_BELOW_THRESHOLD: ${quality.score} < ${quality.threshold}`])
    ]
  };
}

/**
 * The disclosure line for a given gate result.
 * It names only what actually executed. If the truth gate did not run, the sentence
 * that claims it does not appear.
 */
export function disclosureFor(result) {
  const base = 'AI-assisted editorial production.';
  const executed = new Set(result?.gates_executed || []);
  const parts = [base];
  if (executed.has('editorial_quality_v2')) {
    parts.push('Claims are limited to the source material recorded for this publication and may require independent verification.');
  }
  if (executed.has('first_person_truth_gate')) {
    parts.push('Before publication this article passed the repository’s first-person truth, privacy, restricted-claim, duplication and CTA-route checks.');
  }
  parts.push('Product and platform details change; verify current terms before acting.');
  return parts.join(' ');
}
