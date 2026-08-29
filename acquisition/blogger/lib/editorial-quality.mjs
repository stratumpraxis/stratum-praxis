// Revenue Publisher v2 - the editorial quality model.
//
// v1 scored an article by starting at 100 and subtracting penalties for a short list of
// banned phrases. Polished, generic, provenance-free AI prose scored 100 because it
// tripped none of them. That is the defect this module exists to fix.
//
// The model here is additive and evidence-shaped, in the same style as
// acquisition/lib/signal-score.mjs and signal-intelligence/lib/revenue-score.mjs: named
// dimensions, integer 0-10 scores, fixed weights, a full breakdown, and a separate class
// of CRITICAL failures that override the aggregate entirely.
//
// Three rules do the work:
//
//   1. A specific number must be traceable to the recorded source material AND carry a
//      visible provenance marker in the text. An untraceable number is a CRITICAL
//      failure, not a deduction.
//   2. Invented human texture - remembered emails, habitual routines, client situations,
//      outcomes written as if they happened - is a CRITICAL failure. A hypothetical is
//      allowed only when it is labelled as an example or scenario.
//   3. A high score requires at least one non-obvious decision rule, tradeoff or
//      boundary condition. Without one the total is capped below the READY threshold,
//      however clean the prose is.
//
// Nothing here publishes. It returns a verdict; acquisition/blogger/free-runner.mjs
// decides what to do with it.

import { splitSentences } from '../../media-engine/lib/truth-gate.mjs';

export const QUALITY_VERSION = 2;

/** Bands. 100 is meant to be very hard to reach, not the default for clean grammar. */
export const BANDS = Object.freeze({
  strong: 90,   // genuinely strong publish-ready editorial asset
  ready: 82,    // READY only if every critical gate also passes
  revise: 0
});

export const DIMENSIONS = Object.freeze({
  source_fidelity: 4,
  source_traceability: 3,
  factual_support: 4,
  insight_depth: 4,
  originality_of_framing: 3,
  specificity: 2,
  practical_usefulness: 3,
  naturalness_rhythm: 3,
  anti_template: 4,
  unsupported_specificity_control: 4,
  fake_experience_control: 5,
  cta_fit: 3,
  audience_fit: 2,
  duplication_control: 3,
  editing_burden_control: 2
});

export const TOTAL_WEIGHT = Object.values(DIMENSIONS).reduce((a, b) => a + b, 0);
const MAX_DIMENSION = 10;

/** Reported alongside the score so a reader knows which failures are absolute. */
export const CRITICAL_CODES = Object.freeze([
  'UNSUPPORTED_STATISTIC',
  'FABRICATED_EXPERIENCE',
  'UNLABELLED_HYPOTHETICAL_OUTCOME',
  'RESTRICTED_SOURCE_CLAIM',
  'BLOCKED_SAFETY_CLAIM',
  'TRUTH_GATE_VIOLATION',
  'CTA_ROUTE_NOT_VERIFIED',
  'CTA_GENERIC',
  'DUPLICATE_OR_CANNIBALIZING',
  'MISSING_BODY'
]);

// --- lexicons ---------------------------------------------------------------------

/** Phrases that mark the next statement as an illustration rather than a report. */
export const SCENARIO_LABELS = /\b(?:for example|for instance|as an example|worked example|example[:—-]|scenario[:—-]|a hypothetical|hypothetical(?:ly)?|suppose|imagine|say (?:a|an|you|your)|illustrative|to illustrate|consider a|consider an|take a)\b/i;

/** Phrases that attach a claim to something a reader could go and check. */
export const PROVENANCE_MARKERS = /\b(?:publicly reported|public(?:ly)? available|according to|as reported by|reported figures|reported by|the source records|recorded in|recorded by|as recorded|cited|citation|survey|surveys|study|studies|research from|data from|figures from|public claim|public posts?|posts? recorded|observed on|documented in|\[\d+\])|https?:\/\//i;

/** Coined proper-noun abstractions. One or two are fine; a page of them is a tell. */
export const COINAGE_PATTERN = /\bThe\s+[A-Z][a-z]+(?:[- ][A-Z][a-z]+)?\s+(?:Gap|Tax|Trap|Framework|Matrix|Paradox|Effect|Principle|Law|Curve|Loop|Ladder|Spectrum|Threshold|Problem|Rule|Test|Model|Stack|Cycle|Fallacy|Dividend|Penalty|Equation|Lens|Filter|Ceiling|Floor)\b/g;

export const AI_TRANSITIONS = Object.freeze([
  'moreover', 'furthermore', 'in essence', 'at its core', 'it is worth noting',
  "it's worth noting", 'in summary', 'to sum up', 'in conclusion', 'ultimately,',
  'let us dive', "let's dive", 'delve into', 'the digital landscape', 'in the realm of',
  'navigate the complexities', 'a tapestry of', 'the bottom line is', 'that being said',
  'when it comes to', 'in the world of', 'the key takeaway', 'first and foremost'
]);

export const ABSTRACTION_WORDS = Object.freeze([
  'leverage', 'synergy', 'holistic', 'paradigm', 'ecosystem', 'transformative',
  'robust', 'seamless', 'cutting-edge', 'best-in-class', 'unlock', 'empower',
  'streamline', 'optimize your', 'game-changing', 'revolutionize'
]);

export const EMPTY_ENDING = /\b(?:the journey|your journey|the future is|embrace the|start today|the choice is yours|remember,|at the end of the day|one thing is clear|the time to act is now)\b/i;

export const GENERIC_CTA_LABELS = Object.freeze([
  'continue', 'learn more', 'read more', 'click here', 'find out more', 'check it out',
  'open the relevant tool', 'see more', 'get started', 'go here', 'more info',
  'read the guide', 'try it', 'explore'
]);

/** Invented human texture. These are fabrications even though no "I" appears. */
export const FAKE_TEXTURE_PATTERNS = Object.freeze([
  { id: 'remembered_routine_message', pattern: /\b(?:the|that|a|an)\s+(?:\w+\s+){0,2}(?:email|invoice|notice|reminder|message|renewal notice)\s+(?:usually|typically|always|generally|often)\s+(?:arrives|lands|shows up|comes)\b/i },
  { id: 'invented_interval_habit', pattern: /\b(?:usually|typically|always)\s+(?:arrives|happens|lands|comes)\s+(?:about\s+|roughly\s+)?(?:\w+|\d+)\s+(?:days?|weeks?|months?)\s+(?:before|after)\b/i },
  { id: 'invented_daily_habit', pattern: /\bevery\s+(?:morning|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i },
  { id: 'invented_memory', pattern: /\bI\s+(?:remember|recall|still\s+think\s+about|once)\b/i },
  { id: 'invented_acquaintance', pattern: /\bone\s+(?:founder|freelancer|operator|team|company|owner|developer|designer)\s+I\b/i },
  { id: 'invented_client_situation', pattern: /\ba\s+(?:client|customer|reader|user)\s+of\s+(?:mine|ours)\b/i },
  { id: 'invented_shared_action', pattern: /\bwe\s+(?:cut|saved|reduced|cancelled|canceled|consolidated|downgraded)\s+(?:\$|\d|our\s+\w+\s+(?:bill|spend|stack))/i },
  { id: 'invented_audit_event', pattern: /\bwhen\s+we\s+(?:ran|did|audited|reviewed|went\s+through)\s+(?:this|the|our)\b/i },
  { id: 'invented_recent_event', pattern: /\b(?:last|this)\s+(?:week|month|quarter|year),\s+(?:I|we)\b/i },
  { id: 'invented_log_evidence', pattern: /\bour\s+(?:usage\s+)?logs?\s+(?:show|showed|say)\b/i },
  { id: 'invented_conversation', pattern: /\b(?:told|asked|emailed|messaged)\s+me\s+(?:that|about|last)\b/i },
  { id: 'invented_testing', pattern: /\bin\s+(?:my|our)\s+(?:testing|experience|case|setup)\b/i }
]);

/** An outcome written as if it happened to somebody. */
export const CLAIMED_OUTCOME_PATTERNS = Object.freeze([
  { id: 'named_saving', pattern: /\b(?:saved|reduced|cut|slashed|lowered)\b[^.!?]{0,60}?\bby\s+(?:\$\s?[\d,]+|\d+(?:\.\d+)?\s?%)/i },
  { id: 'named_gain', pattern: /\b\d+(?:\.\d+)?\s?%\s+(?:increase|improvement|reduction|uplift|growth)\b/i },
  { id: 'monthly_outcome', pattern: /\bby\s+\$\s?[\d,]+\s+(?:per|a)\s+(?:month|year|quarter|week)\b/i }
]);

const DECISION_VERBS = 'keep|renew|downgrade|consolidate|cancel|cut|drop|retain|pay\\s+for|migrate|switch';

export const INSIGHT_MARKERS = Object.freeze([
  // A conditional decision rule reads in either order: "cancel it when X" and
  // "if X, cancel" are the same rule, and only catching the first was a false negative.
  { id: 'conditional_decision_rule', pattern: new RegExp(`\\b(?:${DECISION_VERBS})\\s+(?:it|them|the\\s+\\w+|this)?\\s*(?:only\\s+)?(?:when|if|unless)\\b`, 'i') },
  { id: 'conditional_decision_rule', pattern: new RegExp(`\\b(?:if|when|unless)\\b[^.!?]{3,120}?,\\s*(?:then\\s+)?(?:${DECISION_VERBS})\\b`, 'i') },
  { id: 'explicit_rule', pattern: /\b(?:the\s+test\s+is|rule\s+of\s+thumb|decision\s+rule|the\s+threshold\s+is|decide\s+by\s+asking|the\s+question\s+to\s+ask\s+is)\b/i },
  { id: 'counterargument', pattern: /\b(?:counter-?argument|the\s+case\s+against|the\s+obvious\s+(?:answer|move|recommendation|choice)[^.!?]{0,40}?\s+is\s+wrong|do\s+not\s+(?:follow|apply)\s+this\s+when|this\s+(?:advice|rule|approach)\s+fails\s+when|(?:that|this)\s+rule\s+fails\b|the\s+opposite\s+is\s+true\s+when|a\s+similar\s+error\s+occurs)\b/i },
  { id: 'tradeoff', pattern: /\b(?:trade-?offs?|at\s+the\s+cost\s+of|in\s+exchange\s+for|you\s+(?:give|lose)\s+up\b|the\s+price\s+of\s+this\s+is|must\s+weigh\s+this\s+against|weighed?\s+against)\b/i },
  { id: 'boundary_condition', pattern: /\b(?:only\s+(?:holds|applies|works|makes\s+sense)\s+(?:when|if)|breaks\s+down\s+when|does\s+not\s+apply\s+(?:to|when)|stops\s+being\s+true\s+(?:when|once)|the\s+risk\s+is\s+the\s+hidden)\b/i },
  { id: 'ordering_rule', pattern: /\b(?:before\s+you\s+(?:cancel|cut|consolidate|downgrade)|do\s+this\s+first|the\s+order\s+matters)\b/i }
]);

// --- helpers ----------------------------------------------------------------------

function clamp(value, min = 0, max = MAX_DIMENSION) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Number(Number(value).toFixed(2));
}

/** Digits-only form of a numeric token, so "$2,000" and "2000" compare equal. */
export function numericKey(token) {
  return String(token).replace(/[^\d.]/g, '').replace(/\.0+$/, '');
}

export function headingsOf(body) {
  return [...String(body || '').matchAll(/^\s{0,3}(#{1,6})\s+(.+)$/gm)].map((m) => ({
    level: m[1].length,
    text: m[2].trim()
  }));
}

/** Body split into blocks, each tagged with the heading that introduces it. */
export function blocksOf(body) {
  const blocks = [];
  let heading = '';
  for (const raw of String(body || '').split(/\n{2,}/)) {
    const text = raw.trim();
    if (!text) continue;
    const headingMatch = text.match(/^\s{0,3}#{1,6}\s+(.+)$/);
    if (headingMatch) {
      heading = headingMatch[1].trim();
      continue;
    }
    blocks.push({
      text,
      heading,
      is_list: /^\s*(?:[-*+]|\d+[.)])\s+/m.test(text),
      is_table: /^\s*\|/.test(text),
      words: text.split(/\s+/).filter(Boolean).length
    });
  }
  return blocks;
}

/** A block is a labelled illustration if it, or the heading above it, says so. */
export function isLabelledScenario(block) {
  return SCENARIO_LABELS.test(block.text) || SCENARIO_LABELS.test(block.heading || '');
}

const NUMERIC_TOKEN = /\$\s?\d[\d,]*(?:\.\d+)?\s?[kKmMbB]?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?[x×]\b|\b\d{3,}\b/g;

/** Numbers that carry no factual weight and are never treated as statistics. */
function isIgnorableNumber(token) {
  const key = numericKey(token);
  if (!key) return true;
  if (/^(?:19|20)\d{2}$/.test(key)) return true; // a year
  return false;
}

/**
 * Every specific number in the body, with where it sits and what supports it.
 * `traceable` means the number appears in the recorded source material.
 * `marked` means the sentence around it tells the reader where it came from.
 */
export function extractNumericClaims(body, sourceCorpus) {
  const corpusKeys = new Set(
    [...String(sourceCorpus || '').matchAll(NUMERIC_TOKEN)].map((m) => numericKey(m[0])).filter(Boolean)
  );
  const claims = [];
  for (const block of blocksOf(body)) {
    const labelled = isLabelledScenario(block);
    for (const sentence of splitSentences(block.text)) {
      for (const match of sentence.matchAll(NUMERIC_TOKEN)) {
        const token = match[0].trim();
        if (isIgnorableNumber(token)) continue;
        claims.push({
          token,
          key: numericKey(token),
          sentence,
          heading: block.heading,
          labelled_scenario: labelled,
          traceable: corpusKeys.has(numericKey(token)),
          marked: PROVENANCE_MARKERS.test(sentence) || PROVENANCE_MARKERS.test(block.heading || '')
        });
      }
    }
  }
  return claims;
}

/** Fabricated human texture, ignoring anything inside a labelled illustration. */
export function detectFakeTexture(body) {
  const hits = [];
  for (const block of blocksOf(body)) {
    const labelled = isLabelledScenario(block);
    for (const sentence of splitSentences(block.text)) {
      for (const rule of FAKE_TEXTURE_PATTERNS) {
        if (!rule.pattern.test(sentence)) continue;
        hits.push({ id: rule.id, sentence, labelled_scenario: labelled });
      }
    }
  }
  return hits;
}

/** Outcomes stated as fact. Allowed only when labelled AND non-numeric-in-source. */
export function detectClaimedOutcomes(body, sourceCorpus) {
  const corpusKeys = new Set(
    [...String(sourceCorpus || '').matchAll(NUMERIC_TOKEN)].map((m) => numericKey(m[0])).filter(Boolean)
  );
  const hits = [];
  for (const block of blocksOf(body)) {
    const labelled = isLabelledScenario(block);
    for (const sentence of splitSentences(block.text)) {
      for (const rule of CLAIMED_OUTCOME_PATTERNS) {
        if (!rule.pattern.test(sentence)) continue;
        const numbers = [...sentence.matchAll(NUMERIC_TOKEN)].map((m) => numericKey(m[0])).filter(Boolean);
        const sourced = numbers.length > 0 && numbers.every((n) => corpusKeys.has(n));
        hits.push({ id: rule.id, sentence, labelled_scenario: labelled, sourced });
      }
    }
  }
  return hits;
}

/** Structural tells of one-pass AI writing. */
export function templateProfile(body) {
  const text = String(body || '');
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const headings = headingsOf(text);
  const blocks = blocksOf(text);
  const prose = blocks.filter((b) => !b.is_list && !b.is_table);

  const coinages = [...new Set([...text.matchAll(COINAGE_PATTERN)].map((m) => m[0]))];
  const transitions = AI_TRANSITIONS.filter((p) => lower.includes(p));
  const abstractions = ABSTRACTION_WORDS.filter((p) => lower.includes(p));
  const notJustBut = (text.match(/\bnot\s+just\s+[^.!?,]{2,40},?\s+but\b/gi) || []).length;
  const restatements = (text.match(/^\s*(?:in short|the takeaway|to recap|to summari[sz]e|put simply)\b/gim) || []).length;

  const lengths = prose.map((b) => b.words).filter(Boolean);
  const mean = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const variance = lengths.length
    ? lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length
    : 0;
  const cadenceCv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  const lastBlock = blocks.length ? blocks[blocks.length - 1] : null;
  const emptyEnding = Boolean(lastBlock)
    && EMPTY_ENDING.test(lastBlock.text)
    && !/\d/.test(lastBlock.text);

  return {
    words,
    heading_count: headings.length,
    headings_per_1000_words: round2((headings.length / words) * 1000),
    coinages,
    coinage_count: coinages.length,
    ai_transitions: transitions,
    abstraction_words: abstractions,
    not_just_but_count: notJustBut,
    restatement_count: restatements,
    paragraph_cadence_cv: round2(cadenceCv),
    empty_motivational_ending: emptyEnding
  };
}

/** Sentence-rhythm profile. Uniform cadence reads as machine-written. */
export function rhythmProfile(body) {
  const lengths = splitSentences(String(body || ''))
    .map((s) => s.split(/\s+/).filter(Boolean).length)
    .filter((n) => n > 0);
  if (!lengths.length) return { sentences: 0, mean: 0, spread: 0, cv: 0, short_share: 0 };
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
  return {
    sentences: lengths.length,
    mean: round2(mean),
    spread: Math.max(...lengths) - Math.min(...lengths),
    cv: round2(mean > 0 ? Math.sqrt(variance) / mean : 0),
    short_share: round2(lengths.filter((n) => n <= 9).length / lengths.length)
  };
}

/** Distinct insight kinds present. Two patterns for one kind still count once. */
export function detectInsight(body) {
  const found = new Map();
  for (const marker of INSIGHT_MARKERS) {
    if (found.has(marker.id)) continue;
    const match = String(body || '').match(marker.pattern);
    if (match) found.set(marker.id, { id: marker.id, evidence: match[0] });
  }
  return [...found.values()];
}

// --- the model --------------------------------------------------------------------

/**
 * Score one generated article.
 *
 * @param {object} article  { title, dek, body, cta_recommendation, evidence_notes }
 * @param {object} context
 *   source          the media-engine source record (allowed/restricted claims, routes)
 *   vertical        optional revenue-vertical contract (audiences, decision terms)
 *   truthViolations violations returned by media-engine truth-gate (already run)
 *   ctaVerdict      verdict returned by cta-gate.mjs
 *   duplication     verdict returned by media-engine duplication.mjs
 *   safetyPatterns  BLOCKED_CLAIM_PATTERNS from acquisition/lib/safety.mjs
 *   minWords        default 750
 */
export function assessEditorialQuality(article, context = {}) {
  const {
    source = {},
    vertical = null,
    truthViolations = [],
    ctaVerdict = null,
    duplication = null,
    safetyPatterns = [],
    minWords = 750
  } = context;

  const body = String(article?.body ?? article?.body_markdown ?? '');
  const title = String(article?.title ?? article?.selected_title ?? '');
  const lower = body.toLowerCase();
  const words = body.split(/\s+/).filter(Boolean).length;

  const critical = [];
  const caps = [];

  if (!title.trim() || !body.trim()) {
    critical.push({ code: 'MISSING_BODY', detail: 'the generated record has no title or no body' });
  }

  const sourceCorpus = [
    source.title,
    source.excerpt,
    ...(source.allowed_claims || []),
    ...(source.evidence_refs || []),
    ...(article?.evidence_notes || [])
  ].filter(Boolean).join('\n');

  // --- 1. numbers -----------------------------------------------------------------
  const numericClaims = extractNumericClaims(body, sourceCorpus);
  const untraceable = numericClaims.filter((c) => !c.traceable && !c.labelled_scenario);
  const unmarked = numericClaims.filter((c) => c.traceable && !c.marked && !c.labelled_scenario);
  const unlabelledScenarioNumbers = numericClaims.filter((c) => !c.traceable && c.labelled_scenario);

  for (const claim of untraceable) {
    critical.push({
      code: 'UNSUPPORTED_STATISTIC',
      detail: `"${claim.token}" does not appear in the recorded source material and is not inside a labelled example`,
      sentence: claim.sentence
    });
  }

  // --- 2. invented human texture ---------------------------------------------------
  const fakeTexture = detectFakeTexture(body);
  for (const hit of fakeTexture.filter((h) => !h.labelled_scenario)) {
    critical.push({
      code: 'FABRICATED_EXPERIENCE',
      detail: `invented human texture (${hit.id}); this identity has no recorded experience to draw on`,
      sentence: hit.sentence
    });
  }

  const outcomes = detectClaimedOutcomes(body, sourceCorpus);
  for (const hit of outcomes.filter((h) => !h.labelled_scenario && !h.sourced)) {
    critical.push({
      code: 'UNLABELLED_HYPOTHETICAL_OUTCOME',
      detail: `an outcome is stated as if it happened (${hit.id}); label it as an example or remove it`,
      sentence: hit.sentence
    });
  }

  for (const violation of truthViolations) {
    critical.push({
      code: 'TRUTH_GATE_VIOLATION',
      detail: `${violation.gate}: ${violation.label}`,
      sentence: violation.sentence
    });
  }

  // --- 3. source contract ----------------------------------------------------------
  const restrictedHits = (source.restricted_claims || [])
    .map((x) => (typeof x === 'string' ? x : x.phrase))
    .filter((p) => p && lower.includes(String(p).toLowerCase()));
  for (const phrase of restrictedHits) {
    critical.push({ code: 'RESTRICTED_SOURCE_CLAIM', detail: `restricted claim present: "${phrase}"` });
  }

  const safetyHits = safetyPatterns.filter((pattern) => pattern.test(body) || pattern.test(title));
  for (const pattern of safetyHits) {
    critical.push({ code: 'BLOCKED_SAFETY_CLAIM', detail: `matched ${pattern}` });
  }

  // --- 4. CTA and duplication ------------------------------------------------------
  if (ctaVerdict && !ctaVerdict.ok) {
    for (const failure of ctaVerdict.failures || []) {
      critical.push({ code: failure.code, detail: failure.detail });
    }
  }
  if (duplication && Array.isArray(duplication.blocks) && duplication.blocks.length) {
    for (const block of duplication.blocks) {
      critical.push({ code: 'DUPLICATE_OR_CANNIBALIZING', detail: `${block.rule}: ${block.detail}` });
    }
  }

  // --- dimensions -------------------------------------------------------------------
  const template = templateProfile(body);
  const rhythm = rhythmProfile(body);
  const insight = detectInsight(body);
  const audiences = (vertical?.target_audiences || source.audience_keys || []);
  const audienceLexicon = vertical?.audience_lexicon || [];
  const decisionTerms = vertical?.required_decision_terms || [];

  const audienceHits = audienceLexicon.filter((term) => lower.includes(String(term).toLowerCase()));
  const decisionHits = decisionTerms.filter((term) => lower.includes(String(term).toLowerCase()));

  const scores = {};
  const notes = {};

  // source_fidelity: does the article stay inside what the source approves?
  const allowedClaimEcho = (source.allowed_claims || []).filter((claim) => {
    const anchors = [...String(claim).matchAll(NUMERIC_TOKEN)].map((m) => numericKey(m[0])).filter(Boolean);
    if (anchors.length) return anchors.some((a) => numericClaims.some((c) => c.key === a));
    return false;
  }).length;
  scores.source_fidelity = clamp(
    10 - restrictedHits.length * 5 - untraceable.length * 3 + (allowedClaimEcho > 0 ? 0 : -2)
  );
  notes.source_fidelity = `${allowedClaimEcho} allowed claim(s) carried with their own figures; ${restrictedHits.length} restricted claim(s); ${untraceable.length} untraceable figure(s)`;

  // source_traceability: is the provenance visible to the reader?
  const markedShare = numericClaims.length
    ? numericClaims.filter((c) => c.marked || c.labelled_scenario).length / numericClaims.length
    : 1;
  const disclosureRefs = (article?.evidence_notes || []).length;
  scores.source_traceability = clamp(Math.round(markedShare * 8 + Math.min(2, disclosureRefs)));
  notes.source_traceability = `${(markedShare * 100).toFixed(0)}% of specific figures carry a provenance marker; ${disclosureRefs} evidence note(s)`;

  // factual_support
  scores.factual_support = clamp(10 - untraceable.length * 4 - unmarked.length * 2 - unlabelledScenarioNumbers.length);
  notes.factual_support = `${untraceable.length} untraceable, ${unmarked.length} traceable-but-unmarked, ${unlabelledScenarioNumbers.length} illustrative figure(s)`;

  // insight_depth
  scores.insight_depth = clamp(insight.length * 2 + (insight.length >= 4 ? 2 : 0));
  notes.insight_depth = insight.length
    ? `distinct insight markers: ${insight.map((i) => i.id).join(', ')}`
    : 'no decision rule, tradeoff, counterargument or boundary condition found';

  // originality_of_framing
  scores.originality_of_framing = clamp(
    10 - Math.max(0, template.coinage_count - 2) * 3 - template.not_just_but_count * 2 - template.restatement_count * 2
  );
  notes.originality_of_framing = `${template.coinage_count} coined term(s) (${template.coinages.slice(0, 6).join(', ') || 'none'}); ${template.restatement_count} restatement paragraph(s)`;

  // specificity
  const concreteMarkers = (body.match(/\b(?:when|if|unless|only if|within|after|before)\b/gi) || []).length;
  scores.specificity = clamp(
    Math.round(Math.min(8, concreteMarkers / 3)) + (decisionHits.length ? 2 : 0) - template.abstraction_words.length
  );
  notes.specificity = `${concreteMarkers} conditional marker(s); ${template.abstraction_words.length} abstraction word(s)`;

  // practical_usefulness
  scores.practical_usefulness = clamp(
    (decisionTerms.length ? Math.round((decisionHits.length / decisionTerms.length) * 6) : 4)
    + Math.min(4, insight.length)
  );
  notes.practical_usefulness = decisionTerms.length
    ? `${decisionHits.length}/${decisionTerms.length} required decision term(s) present`
    : 'no decision vocabulary declared by the vertical';

  // naturalness_rhythm
  const rhythmScore = (rhythm.cv >= 0.45 ? 4 : rhythm.cv >= 0.32 ? 3 : rhythm.cv >= 0.22 ? 1 : 0)
    + (rhythm.spread >= 22 ? 3 : rhythm.spread >= 14 ? 2 : 0)
    + (rhythm.short_share >= 0.12 ? 2 : rhythm.short_share >= 0.06 ? 1 : 0)
    + (template.paragraph_cadence_cv >= 0.35 ? 1 : 0);
  scores.naturalness_rhythm = clamp(rhythmScore);
  notes.naturalness_rhythm = `sentence cv ${rhythm.cv}, spread ${rhythm.spread}, short-sentence share ${rhythm.short_share}, paragraph cadence cv ${template.paragraph_cadence_cv}`;

  // anti_template
  scores.anti_template = clamp(
    10
    - template.ai_transitions.length * 2
    - Math.max(0, template.coinage_count - 2) * 2
    - (template.headings_per_1000_words > 12 ? 3 : template.headings_per_1000_words > 8 ? 1 : 0)
    - (template.empty_motivational_ending ? 3 : 0)
    - template.restatement_count
  );
  notes.anti_template = `${template.heading_count} heading(s) (${template.headings_per_1000_words}/1000 words); AI transitions: ${template.ai_transitions.join(', ') || 'none'}${template.empty_motivational_ending ? '; empty motivational ending' : ''}`;

  // unsupported_specificity_control
  scores.unsupported_specificity_control = clamp(10 - untraceable.length * 5 - unmarked.length * 2);
  notes.unsupported_specificity_control = `${untraceable.length} specific figure(s) with no source, ${unmarked.length} with no visible provenance`;

  // fake_experience_control
  const unlabelledFake = fakeTexture.filter((h) => !h.labelled_scenario).length;
  const unlabelledOutcomes = outcomes.filter((h) => !h.labelled_scenario && !h.sourced).length;
  scores.fake_experience_control = clamp(
    10 - unlabelledFake * 5 - unlabelledOutcomes * 4 - truthViolations.length * 5
  );
  notes.fake_experience_control = `${unlabelledFake} invented-texture sentence(s), ${unlabelledOutcomes} unlabelled outcome(s), ${truthViolations.length} truth-gate violation(s)`;

  // cta_fit
  scores.cta_fit = clamp(ctaVerdict ? ctaVerdict.score ?? 0 : 0);
  notes.cta_fit = ctaVerdict?.reason || 'no CTA verdict supplied';

  // audience_fit
  scores.audience_fit = clamp(
    audienceLexicon.length ? Math.round((audienceHits.length / audienceLexicon.length) * 10) : 5
  );
  notes.audience_fit = audienceLexicon.length
    ? `${audienceHits.length}/${audienceLexicon.length} audience term(s) present; declared audiences ${audiences.join(', ') || 'none'}`
    : 'no audience lexicon declared';

  // duplication_control
  const dupWarnings = duplication?.warnings?.length ?? 0;
  const dupBlocks = duplication?.blocks?.length ?? 0;
  scores.duplication_control = clamp(duplication ? 10 - dupBlocks * 10 - dupWarnings * 3 : 6);
  notes.duplication_control = duplication
    ? `${dupBlocks} block(s), ${dupWarnings} warning(s) from the duplication gate`
    : 'duplication gate not run';

  // editing_burden_control
  const editingFlags = unmarked.length + template.ai_transitions.length + template.abstraction_words.length
    + Math.max(0, template.coinage_count - 2) + template.restatement_count
    + (words < minWords ? 3 : 0) + (words > 2400 ? 2 : 0);
  scores.editing_burden_control = clamp(10 - editingFlags);
  notes.editing_burden_control = `${editingFlags} item(s) a human editor would have to fix before publication`;

  // --- aggregate --------------------------------------------------------------------
  const breakdown = {};
  let weighted = 0;
  for (const [name, weight] of Object.entries(DIMENSIONS)) {
    const value = scores[name] ?? 0;
    weighted += value * weight;
    breakdown[name] = { score: value, weight, contribution: value * weight, note: notes[name] || '' };
  }
  let score = round2((weighted / (TOTAL_WEIGHT * MAX_DIMENSION)) * 100);
  const rawScore = score;

  // Caps. These are not deductions: they are ceilings a clean-but-thin article cannot
  // argue its way past.
  if (words < minWords) caps.push({ code: 'BELOW_MIN_WORDS', ceiling: 70, detail: `${words} words, minimum ${minWords}` });
  if (!insight.length) caps.push({ code: 'NO_NON_OBVIOUS_INSIGHT', ceiling: 79, detail: 'no decision rule, tradeoff or boundary condition' });
  if (unmarked.length) caps.push({ code: 'UNMARKED_PROVENANCE', ceiling: 88, detail: `${unmarked.length} figure(s) traceable to the source but not attributed in the text` });
  if (scores.anti_template < 5) caps.push({ code: 'TEMPLATE_STRUCTURE', ceiling: 85, detail: notes.anti_template });
  if (scores.naturalness_rhythm < 5) caps.push({ code: 'UNIFORM_CADENCE', ceiling: 87, detail: notes.naturalness_rhythm });
  if (unlabelledScenarioNumbers.length) {
    caps.push({ code: 'ILLUSTRATIVE_FIGURES', ceiling: 92, detail: `${unlabelledScenarioNumbers.length} invented figure(s) inside labelled examples` });
  }
  for (const cap of caps) score = Math.min(score, cap.ceiling);

  // A critical failure is absolute: the aggregate may not be read as a pass.
  const failed = critical.length > 0;
  if (failed) score = Math.min(score, 49);

  const band = failed ? 'CRITICAL_FAIL'
    : score >= BANDS.strong ? 'STRONG'
      : score >= BANDS.ready ? 'READY_IF_GATES_PASS'
        : 'REVISE';

  return {
    version: QUALITY_VERSION,
    score: round2(score),
    raw_dimension_score: rawScore,
    band,
    thresholds: { ...BANDS },
    threshold: BANDS.ready,
    publishable: !failed && score >= BANDS.ready,
    critical_failures: critical,
    caps,
    words,
    dimensions: breakdown,
    signals: {
      numeric_claims: numericClaims.length,
      untraceable_numeric_claims: untraceable.map((c) => c.token),
      unmarked_numeric_claims: unmarked.map((c) => c.token),
      illustrative_numeric_claims: unlabelledScenarioNumbers.map((c) => c.token),
      fake_texture: fakeTexture.map((h) => ({ id: h.id, labelled_scenario: h.labelled_scenario })),
      claimed_outcomes: outcomes.map((h) => ({ id: h.id, labelled_scenario: h.labelled_scenario, sourced: h.sourced })),
      insight_markers: insight.map((i) => i.id),
      template: template,
      rhythm: rhythm
    }
  };
}
