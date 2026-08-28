// Issue #52 - desk/lens eligibility and the full derivation check.
//
// Two responsibilities:
//   eligibility  which desk x lens combinations a source may derive at all
//   verification running every gate over a derivation and returning one composite verdict
//
// The derivation rule is explicit: no Cartesian product. A source that is eligible for
// eight combinations still produces at most `max_outputs_per_source`, chosen by score.
// Fewer strong outputs beat more content.

import { classifyRoute, groupByVerdict } from '../../lib/winner.mjs';
import { isPlainObject } from '../../lib/util.mjs';
import { checkDerivation as runTruthGate } from './truth-gate.mjs';
import { checkDuplication } from './duplication.mjs';
import { checkLocalization } from './localize.mjs';
import { resolvePublishState, validateProofState } from './publisher-gate.mjs';
import { verifyMediaAttribution } from './attribution.mjs';

export const ELIGIBILITY_FACTORS = Object.freeze({
  audience_fit: 3,
  evidence_fit: 3,
  revenue_fit: 3,
  localization_feasibility: 2,
  truth_risk: 3,          // inverted: high risk scores low
  policy_risk: 2,         // inverted
  duplicate_risk: 2,      // inverted
  freshness: 1,
  operational_burden: 1   // inverted
});

export const ELIGIBILITY_FLOOR = 0.6;

function overlap(a = [], b = []) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  return a.filter((x) => setB.has(x)).length / Math.max(a.length, 1);
}

/**
 * Score one source x desk x lens combination.
 * Every factor is returned so the decision can be read rather than trusted.
 */
export function scoreEligibility(source, desk, lens, context = {}) {
  const { candidate = null, channels = [], now = Date.now() } = context;
  const reasons = [];
  const factors = {};

  // audience fit
  const audienceKeys = candidate?.eligible_audiences || source.audience_keys || [];
  factors.audience_fit = overlap(audienceKeys, desk.audience_keys || []) * 10;
  if (factors.audience_fit === 0) reasons.push(`no audience overlap between the source and ${desk.desk_id}`);

  // evidence fit: does this lens accept this source type and this evidence?
  const typeOk = (lens.eligible_source_types || []).includes(source.source_type);
  const families = candidate?.corroboration_families || source.evidence_families || [];
  const accepted = families.filter((f) => (lens.eligible_families || []).includes(f));
  const familyOk = !families.length || accepted.length > 0;
  const lensHinted = !candidate?.eligible_lenses?.length || candidate.eligible_lenses.includes(lens.lens_id);

  // Prefer the lens that can actually use the strongest evidence available. Tier 1 is
  // owned commercial behaviour, tier 4 is editorial and builder discussion, so a lens
  // that accepts the tier-1 family sits closer to real purchase behaviour than one that
  // can only use the weaker families.
  const tiers = context.familyTiers || {};
  const strongestTier = families.length ? Math.min(...families.map((f) => tiers[f] ?? 4)) : null;
  const usesStrongest = strongestTier !== null && accepted.some((f) => (tiers[f] ?? 4) === strongestTier);

  const coverage = families.length ? accepted.length / families.length : 1;
  factors.evidence_fit = Math.min(10,
    (typeOk ? 3 : 0) + coverage * 3 + (lensHinted ? 2 : 0) + (usesStrongest ? 2 : 0));

  if (!typeOk) reasons.push(`${lens.lens_id} does not accept source_type ${source.source_type}`);
  if (!familyOk) reasons.push(`${lens.lens_id} accepts none of the evidence families ${families.join(', ')}`);
  if (!lensHinted) reasons.push(`Issue #53 did not list ${lens.lens_id} among the eligible lenses for this candidate`);
  if (families.length && !usesStrongest) {
    reasons.push(`${lens.lens_id} cannot use the strongest available evidence family (tier ${strongestTier})`);
  }

  // revenue fit: is there a verified route this desk can actually use?
  const routes = candidate?.existing_product_routes || source.existing_product_routes || [];
  const hasRoute = routes.length > 0;
  factors.revenue_fit = hasRoute ? (lens.cta_required ? 10 : 7) : (lens.cta_required ? 0 : 5);
  if (!hasRoute && lens.cta_required) reasons.push(`${lens.lens_id} requires a CTA but no verified product route is attached`);

  // localization feasibility
  const sameLanguage = source.language === desk.language;
  factors.localization_feasibility = sameLanguage ? 10 : desk.requires_localization_review ? 6 : 8;

  // truth risk: unproven personal-experience claims in the source are the main hazard
  const unprovenClaims = (source.personal_experience_claims || []).filter((c) => !c.evidence_ref).length;
  factors.truth_risk = Math.max(0, 10 - unprovenClaims * 5);
  if (unprovenClaims) reasons.push(`${unprovenClaims} unproven personal-experience claim(s) on the source`);

  // policy risk: is there any channel that could carry this desk at all?
  const reachable = channels.filter((c) => (c.supported_desks || []).includes(desk.desk_id));
  factors.policy_risk = reachable.length ? 8 : 0;
  if (!reachable.length) reasons.push(`no bound channel carries ${desk.desk_id}`);

  // duplicate risk: has this source already produced an output on this lens?
  const priorOnLens = (context.existing || []).filter((d) => d.source_id === source.source_id && d.lens_id === lens.lens_id).length;
  factors.duplicate_risk = Math.max(0, 10 - priorOnLens * 5);
  if (priorOnLens) reasons.push(`${priorOnLens} existing output(s) from this source on ${lens.lens_id}`);

  // freshness
  const age = ageDays(candidate?.generated_at || source.completed_at || source.created_at, now);
  factors.freshness = age === null ? 5 : age <= 14 ? 10 : age <= 45 ? 7 : age <= 90 ? 4 : 1;

  // operational burden
  factors.operational_burden = sameLanguage ? 9 : 6;

  let total = 0;
  let max = 0;
  const breakdown = {};
  for (const [name, weight] of Object.entries(ELIGIBILITY_FACTORS)) {
    const value = Math.max(0, Math.min(10, factors[name] ?? 0));
    total += value * weight;
    max += 10 * weight;
    breakdown[name] = { value: Number(value.toFixed(2)), weight, contribution: Number((value * weight).toFixed(2)) };
  }
  const ratio = total / max;

  // A desk x lens combination the winner logic STOPped is not regenerated during its
  // cooldown, whatever it scores.
  const stopped = stopCooldownFor(desk, lens, context);
  if (stopped) reasons.push(stopped.reason);

  // These are disqualifying, not merely low-scoring. A lens that cannot accept the
  // source, cannot use the evidence, was excluded by Issue #53, has no channel that
  // could carry its desk, or is in a STOP cooldown, is not eligible at any score.
  const disqualified = Boolean(stopped) || !typeOk || !familyOk || !lensHinted
    || factors.policy_risk === 0 || factors.audience_fit === 0;

  return {
    desk_id: desk.desk_id,
    lens_id: lens.lens_id,
    source_id: source.source_id,
    score: Number(ratio.toFixed(4)),
    eligible: !disqualified && ratio >= ELIGIBILITY_FLOOR,
    disqualified,
    stop_cooldown: stopped ?? null,
    floor: ELIGIBILITY_FLOOR,
    reasons,
    breakdown
  };
}

/**
 * Choose which desk x lens combinations one source should actually derive.
 * Capped by lenses.json derivation_rule.max_outputs_per_source.
 */
export function planDerivations(source, { desks, lenses, derivationRule, ...context }) {
  const scored = [];
  for (const desk of Object.values(desks)) {
    for (const lens of Object.values(lenses)) {
      if (lens.state !== 'ACTIVE') continue;
      scored.push(scoreEligibility(source, desk, lens, context));
    }
  }
  scored.sort((a, b) => b.score - a.score || a.desk_id.localeCompare(b.desk_id) || a.lens_id.localeCompare(b.lens_id));

  const cap = derivationRule?.max_outputs_per_source ?? 2;
  const selected = scored.filter((s) => s.eligible).slice(0, cap);

  return {
    considered: scored.length,
    eligible: scored.filter((s) => s.eligible).length,
    cap,
    selected,
    rejected: scored.filter((s) => !s.eligible),
    note: 'A source does not generate every desk x lens combination. Only the strongest eligible combinations are derived.'
  };
}

/**
 * Run every gate over one derivation and return a single composite verdict.
 * This is the function the CLIs and the tests both call.
 */
export function verifyDerivation(derivation, context) {
  const { identity, desks, lenses, channels, sources, sourceRouting, providerPolicy, siblings = [], published = [], now = Date.now() } = context;

  const problems = [];
  const desk = desks[derivation.desk_id];
  const lens = lenses[derivation.lens_id];
  const channel = channels[derivation.channel_id];
  const source = sources?.get?.(derivation.source_id) ?? null;

  if (!desk) problems.push(`unknown desk ${derivation.desk_id}`);
  if (!lens) problems.push(`unknown lens ${derivation.lens_id}`);
  if (!source) problems.push(`unknown or unaccepted source ${derivation.source_id}`);
  if (identity.identity_id !== derivation.identity_id) {
    problems.push(`derivation identity ${derivation.identity_id} is not the single identity ${identity.identity_id}`);
  }
  if (problems.length) {
    return { ok: false, derivation_id: derivation.derivation_id, problems, gates: {}, publish_state: 'BLOCKED' };
  }

  // 1. truth, biography and privacy
  const truth = runTruthGate(derivation, { identity, source, lens });

  // 2. localization - only meaningful when the desk is not the source language
  const sibling = siblings.find((s) => s.source_id === derivation.source_id && s.desk_id !== derivation.desk_id) || null;
  const localization = desk.requires_localization_review || source.language !== desk.language
    ? checkLocalization(derivation, {
      desk,
      sibling,
      destinationLanguage: derivation.destination_language || desk.revenue_route_language || 'en'
    })
    : { ok: true, failures: [], warnings: [], localized_elements: [], quality_score: 1, detected_language: desk.language, language_confidence: 1 };

  // 3. duplication and cannibalization
  const duplication = checkDuplication(derivation, { source, siblings, published, now });

  // 4. attribution
  const attribution = derivation.tracked_destination_url
    ? verifyMediaAttribution(derivation)
    : { ok: false, problems: ['derivation has no tracked_destination_url'], chain: [] };

  // 5. proof ladder
  const proofErrors = validateProofState(derivation);

  // 6. provider policy - runs last because it consumes the other gates' verdicts
  const publish = resolvePublishState(derivation, {
    channel,
    desk,
    providerPolicy,
    sourceRouting,
    gates: {
      truth: truth.ok,
      duplication: duplication.ok,
      safety: attribution.ok && proofErrors.length === 0 && localization.ok
    }
  });

  const ok = truth.ok && localization.ok && duplication.ok && attribution.ok && proofErrors.length === 0;

  return {
    ok,
    derivation_id: derivation.derivation_id,
    problems: [],
    gates: {
      truth: { ok: truth.ok, violations: truth.violations },
      localization: { ok: localization.ok, failures: localization.failures, warnings: localization.warnings, quality_score: localization.quality_score, detected_language: localization.detected_language },
      duplication: { ok: duplication.ok, blocks: duplication.blocks, warnings: duplication.warnings },
      attribution: { ok: attribution.ok, problems: attribution.problems, chain: attribution.chain },
      publish_proof: { ok: proofErrors.length === 0, errors: proofErrors, state: derivation.proof_state }
    },
    publish_state: publish.state,
    publish_gate: publish,
    // The highest proof rung this derivation may legally occupy right now.
    max_proof_state: ok ? publish.max_proof_state : 'DRAFT'
  };
}

/**
 * Winner classification per desk x lens.
 * The verdicts come from acquisition/lib/winner.mjs unchanged: views alone never SCALE,
 * and a purchase without payment evidence is ignored.
 */
export function classifyDeskLens(routes) {
  const classified = routes.map((route) => ({
    desk_id: route.desk_id,
    lens_id: route.lens_id,
    route_id: route.route_id,
    ...classifyRoute(route)
  }));
  const byCombination = new Map();
  for (const entry of classified) {
    const key = `${entry.desk_id}|${entry.lens_id}`;
    if (!byCombination.has(key)) byCombination.set(key, []);
    byCombination.get(key).push(entry);
  }
  return {
    classified,
    by_verdict: groupByVerdict(classified.map((c) => ({ route_id: c.route_id, verdict: c.verdict }))),
    by_desk_lens: Object.fromEntries([...byCombination].map(([key, entries]) => [key, {
      routes: entries.length,
      verdicts: entries.map((e) => e.verdict),
      // A successful lens receives routing priority, a site section, a publication name
      // or an authorised channel. It never becomes a new person.
      promotion_options: ['HIGHER_ROUTING_PRIORITY', 'DEDICATED_SITE_SECTION', 'DEDICATED_PUBLICATION_NAME', 'DEDICATED_AUTHORIZED_CHANNEL'],
      new_persona_created: false
    }])),
    rule: 'Views or followers alone never trigger SCALE, and a winning lens never becomes a new fictional persona.'
  };
}

export const DEFAULT_STOP_COOLDOWN_DAYS = 14;

/**
 * A desk x lens route the winner logic classified STOP stays stopped for the cooldown.
 * An undated STOP stays in cooldown rather than defaulting to open, so a missing date
 * never becomes permission.
 */
export function stopCooldownFor(desk, lens, context = {}) {
  const stopped = context.stoppedCombinations;
  if (!stopped) return null;
  const key = `${desk.desk_id}|${lens.lens_id}`;
  const entry = stopped instanceof Map ? stopped.get(key) : stopped[key];
  if (!entry) return null;

  const days = entry.cooldown_days ?? context.stopCooldownDays ?? DEFAULT_STOP_COOLDOWN_DAYS;
  const decided = Date.parse(entry.decided_at);
  const now = context.now ?? Date.now();
  if (!Number.isFinite(decided)) {
    return { key, until: null, reason: `${key} was STOPped and carries no decision date; it stays in cooldown until one is recorded` };
  }
  const until = decided + days * 86400000;
  if (now >= until) return null;
  return { key, until: new Date(until).toISOString(), reason: `${key} is in a ${days}-day STOP cooldown until ${new Date(until).toISOString()}` };
}

function ageDays(value, now) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return (now - time) / 86400000;
}

export { isPlainObject };
