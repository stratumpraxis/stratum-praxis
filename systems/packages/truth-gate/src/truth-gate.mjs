// The first-person truth gate, the fabricated-biography gate and the privacy gate.
//
// The rule this file enforces: if a sentence requires a personal fact that the
// identity contract has not explicitly approved, the sentence does not get written.
// It is not softened, hedged or attributed to a persona - it is rejected and a safe
// rewrite is named.
//
// English and Spanish patterns sit side by side on purpose. A fabrication that would
// be blocked in English must not survive by being written in Spanish.

import {
  approvedLocationValues,
  isApprovedClaim,
  ownedAssetPattern,
  safeRewriteFor
} from './identity.mjs';

/**
 * Each family maps to a claim_id in the identity contract. A match is a violation
 * unless that claim_id appears in approved_first_person_claims - and even then only
 * within its declared scope.
 */
export const FIRST_PERSON_CLAIMS = Object.freeze([
  {
    claim_id: 'personal_testing',
    label: 'first-hand testing',
    patterns: [
      /\bI(?:'ve| have)?\s+(?:just\s+)?(?:tested|tried|benchmarked|trialled|trialed|evaluated)\b/i,
      /\bI\s+(?:ran|put)\s+(?:it|this|them)\s+(?:through|against)\b/i,
      /\bin\s+my\s+(?:testing|tests|benchmarks)\b/i,
      /\b(?:prob[ée]|he\s+probado|test[ée]|he\s+testeado)(?![\p{L}\p{N}])/iu,
      /\ben\s+mis\s+pruebas\b/i
    ]
  },
  {
    claim_id: 'personal_purchase',
    label: 'first-hand purchase',
    patterns: [
      /\bI\s+(?:bought|purchased|paid\s+for|subscribed\s+to|upgraded\s+to)\b/i,
      /\bI(?:'ve| have)\s+been\s+paying\s+for\b/i,
      /\b(?:compr[ée]|pagu[ée]|me\s+suscrib[ií])(?![\p{L}\p{N}])/iu
    ]
  },
  {
    claim_id: 'daily_use',
    label: 'habitual use',
    patterns: [
      /\bI\s+use\s+[^.!?]*\b(?:every\s+day|daily|all\s+the\s+time|constantly)\b/i,
      /\bmy\s+(?:daily\s+)?(?:workflow|setup|stack|toolchain|routine)\b/i,
      /\buso\s+[^.!?]*\b(?:todos\s+los\s+d[ií]as|a\s+diario)\b/i,
      /\bmi\s+(?:flujo\s+de\s+trabajo|rutina\s+diaria)\b/i
    ]
  },
  {
    claim_id: 'client_work',
    label: 'client work',
    patterns: [
      /\b(?:my|a|one)\s+clients?(?:'s)?\b/i,
      /\bin\s+my\s+client\s+work\b/i,
      /\bclients?\s+(?:I|we)\s+(?:work|worked)\s+with\b/i,
      /\b(?:mis?|un)\s+cliente(?:s)?\s+(?:me|con\s+(?:los\s+)?que)\b/i,
      /\ben\s+mi\s+trabajo\s+con\s+clientes\b/i
    ]
  },
  {
    claim_id: 'customers_or_revenue',
    label: 'customers or revenue',
    patterns: [
      /\bmy\s+(?:customers|buyers|subscribers|revenue|sales|income|earnings|mrr)\b/i,
      /\bI\s+(?:earn|earned|make|made|grossed)\s+(?:\$|\d)/i,
      /\bmis\s+(?:clientes|ingresos|ventas|suscriptores)\b/i,
      /\bgan[ée]\s+(?:\$|\d)/i
    ]
  },
  {
    claim_id: 'residence_history',
    label: 'residence history',
    patterns: [
      /\bwhen\s+I\s+lived\s+in\b/i,
      /\bI\s+(?:grew\s+up|was\s+born|moved)\s+(?:in|to)\b/i,
      /\bcuando\s+viv[ií]a?\s+en\b/i,
      /\bcrec[ií]\s+en\b/i
    ]
  },
  {
    claim_id: 'employment_history',
    label: 'employment history',
    patterns: [
      /\bI\s+(?:work|worked|used\s+to\s+work)\s+(?:at|for)\b/i,
      /\bmy\s+(?:employer|boss|manager|colleagues|coworkers)\b/i,
      /\bwhen\s+I\s+was\s+at\s+[A-Z]/,
      /\btrabaj[ée]\s+(?:en|para)\b/i,
      /\bmi\s+(?:jefe|empresa|equipo\s+en)\b/i
    ]
  },
  {
    claim_id: 'credentials',
    label: 'credentials or seniority',
    patterns: [
      /\bI(?:'m| am)\s+(?:a\s+)?(?:certified|licensed|qualified|accredited)\b/i,
      /\bmy\s+(?:degree|certification|licen[cs]e|qualification|mba|phd)\b/i,
      /\bI\s+have\s+\d+\+?\s+years\s+of\s+experience\b/i,
      /\btengo\s+\d+\+?\s+a[ñn]os\s+de\s+experiencia\b/i,
      /\bsoy\s+(?:un\s+)?(?:experto|certificado|licenciado)\b/i
    ]
  },
  {
    claim_id: 'age_or_identity_details',
    label: 'age or legal identity',
    patterns: [
      /\bI(?:'m| am)\s+\d{1,2}\s+years\s+old\b/i,
      /\bmy\s+(?:full\s+)?(?:legal\s+)?name\s+is\b/i,
      /\btengo\s+\d{1,2}\s+a[ñn]os\b(?!\s+de\s+experiencia)/i,
      /\bmi\s+nombre\s+(?:legal\s+)?es\b/i
    ]
  },
  {
    claim_id: 'travel_or_visits',
    label: 'travel or visits',
    patterns: [
      /\bI\s+(?:visited|travelled|traveled|flew\s+to|went\s+to|stayed\s+at|walked\s+through)\b/i,
      /\blast\s+(?:week|month|year)\s+I\s+(?:was|went)\b/i,
      /\b(?:visit[ée]|viaj[ée]|estuve\s+en)(?![\p{L}\p{N}])/iu
    ]
  },
  {
    claim_id: 'testimonial_or_result',
    label: 'testimonial or attributed result',
    patterns: [
      /\b(?:one|a)\s+(?:reader|customer|user|client)\s+(?:told|wrote|emailed|messaged)\s+me\b/i,
      /\bpeople\s+keep\s+telling\s+me\b/i,
      /\b\d+%\s+(?:increase|improvement|reduction)\s+(?:for|in)\s+(?:my|our)\b/i,
      /\bun\s+(?:lector|cliente|usuario)\s+me\s+(?:dijo|escribi[óo])\b/i
    ]
  },
  {
    claim_id: 'expertise_authority',
    label: 'claimed authority',
    patterns: [
      /\bas\s+an\s+expert\b/i,
      /\bin\s+my\s+\d+\s+years\s+of\b/i,
      /\btrust\s+me[,.]/i,
      /\bI\s+(?:can\s+)?guarantee\b/i,
      /\bcomo\s+experto\b/i,
      /\bte\s+lo\s+garantizo\b/i
    ]
  },
  {
    claim_id: 'interviews_or_sources',
    label: 'private sources',
    patterns: [
      /\bI\s+(?:spoke|talked|chatted)\s+(?:to|with)\b/i,
      /\bI\s+interviewed\b/i,
      /\ba\s+source\s+told\s+me\b/i,
      /\bhabl[ée]\s+con\b/i
    ]
  },
  {
    claim_id: 'unapproved_first_person_experience',
    label: 'unverified first-person experience',
    patterns: [
      /\bI\s+(?:founded|sold|quit|taught|studied|attended|joined|managed|led)\b/i,
      /\bI\s+(?:built|launched|shipped|created)\b/i,
      /\b(?:fund[ée]|vend[ií]|renunci[ée]|estudi[ée])(?![\p{L}\p{N}])/iu,
      /\b(?:constru[ií]|lanc[ée]|cre[ée])(?![\p{L}\p{N}])/iu
    ],
    // These verbs are legitimate when the sentence is about an asset the operator
    // actually publishes. The identity contract decides what that looks like via
    // owned_asset_pattern; nothing is hard-coded to one brand.
    approved_by_owned_asset: true,
    approved_claim_id: 'operates_own_assets'
  }
]);

/** Residence claims. Country-level values are read from the identity contract. */
export const LOCATION_CLAIM = Object.freeze({
  claim_id: 'residence_history',
  pattern: /\bI\s+(?:live|am\s+based|am\s+living)\s+in\s+([A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+)?)/gu,
  spanish: /\b(?:vivo|estoy\s+basado)\s+en\s+([A-Z][\p{L}]+)/gu
});

/** Privacy leaks. These are blocked whether or not any claim family matched. */
export const PRIVACY_PATTERNS = Object.freeze([
  { id: 'credential', pattern: /\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/, reason: 'looks like a credential or API token' },
  { id: 'credential_assignment', pattern: /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|password)\s*[:=]\s*\S{8,}/i, reason: 'looks like an assigned secret' },
  { id: 'japanese_street_address', pattern: /\d+\s*[-−]\s*\d+\s*[-−]\s*\d+\s*(?:,)?\s*[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]*(?:区|市|町|丁目)/u, reason: 'looks like a street-level Japanese address' },
  { id: 'street_address', pattern: /\b\d{1,5}\s+[A-Z][a-z]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Lane|Ln\.?)\b/, reason: 'looks like a street address' },
  { id: 'phone_number', pattern: /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{4}\b/, reason: 'looks like a phone number' },
  { id: 'coordinates', pattern: /\b-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}\b/, reason: 'looks like precise coordinates' },
  { id: 'payment_card', pattern: /\b(?:\d{4}[\s-]){3}\d{4}\b/, reason: 'looks like a payment card number' },
  { id: 'bank_account', pattern: /\b(?:iban|account\s+number|routing\s+number)\s*[:#]?\s*[A-Z0-9]{8,}/i, reason: 'looks like financial account details' }
]);

const EMAIL_PATTERN = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Run the truth gate over one text.
 *
 * @param {string} text
 * @param {object} options { identity, source, lens, field }
 * @returns {{ ok: boolean, violations: Array, checked_sentences: number }}
 */
export function checkTruth(text, { identity, source = null, lens = null, field = 'body' } = {}) {
  if (!identity) throw new Error('checkTruth requires an identity contract');
  const violations = [];
  const sentences = splitSentences(text);
  const owned = ownedAssetPattern(identity);

  for (const sentence of sentences) {
    for (const family of FIRST_PERSON_CLAIMS) {
      const matched = family.patterns.find((pattern) => pattern.test(sentence));
      if (!matched) continue;

      // An approved claim may still only be used inside its declared scope.
      if (family.approved_by_owned_asset && owned && owned.test(sentence)
        && isApprovedClaim(identity, family.approved_claim_id)) {
        continue;
      }
      if (isApprovedClaim(identity, family.claim_id)) continue;

      violations.push({
        gate: 'FIRST_PERSON_TRUTH',
        claim_id: family.claim_id,
        label: family.label,
        field,
        sentence,
        matched: String(matched),
        safe_rewrite: safeRewriteFor(identity, family.claim_id)
      });
    }
  }

  violations.push(...checkLocationScope(text, identity, field));
  violations.push(...checkPrivacy(text, identity, field));
  if (lens) violations.push(...checkLensRules(text, lens, field));
  if (source) violations.push(...checkSourceClaims(text, source, field));

  return { ok: violations.length === 0, violations, checked_sentences: sentences.length };
}

/** Country-level location is approved. A city, ward or neighbourhood is not. */
export function checkLocationScope(text, identity, field = 'body') {
  const violations = [];
  const approved = approvedLocationValues(identity);
  for (const pattern of [LOCATION_CLAIM.pattern, LOCATION_CLAIM.spanish]) {
    const regex = new RegExp(pattern.source, pattern.flags);
    for (const match of String(text || '').matchAll(regex)) {
      const place = String(match[1] || '').toLowerCase();
      if (approved.includes(place)) continue;
      violations.push({
        gate: 'PRIVACY_LOCATION_SCOPE',
        claim_id: 'residence_history',
        label: 'location narrower than the approved scope',
        field,
        sentence: match[0],
        matched: place,
        safe_rewrite: identity.location_safe_rewrite
          || 'State only the location scope the identity contract approves.'
      });
    }
  }
  return violations;
}

export function checkPrivacy(text, identity, field = 'body') {
  const violations = [];
  const body = String(text || '');

  for (const rule of PRIVACY_PATTERNS) {
    const match = body.match(rule.pattern);
    if (match) {
      violations.push({
        gate: 'PRIVACY',
        claim_id: rule.id,
        label: rule.reason,
        field,
        sentence: match[0],
        matched: rule.id,
        safe_rewrite: 'Remove entirely. This gate never passes private or credential material.'
      });
    }
  }

  const allowed = new Set((identity.privacy_redactions?.public_contact_allowlist || [])
    .map((e) => String(e).toLowerCase()));
  for (const match of body.matchAll(EMAIL_PATTERN)) {
    if (allowed.has(match[0].toLowerCase())) continue;
    violations.push({
      gate: 'PRIVACY',
      claim_id: 'private_email',
      label: 'email address not on the public contact allowlist',
      field,
      sentence: match[0],
      matched: match[0],
      safe_rewrite: 'Remove the address, or use a contact already published publicly.'
    });
  }
  return violations;
}

/**
 * Lens-specific bans. A lens is an editorial transformation, not an author: it carries
 * banned phrasings and an optional generalisation rule.
 */
export function checkLensRules(text, lens, field = 'body') {
  const violations = [];
  const body = String(text || '');
  for (const phrase of lens.banned_patterns || []) {
    if (body.toLowerCase().includes(String(phrase).toLowerCase())) {
      violations.push({
        gate: 'LENS_CONTRACT',
        claim_id: `${lens.lens_id}_banned_phrase`,
        label: `phrase banned by the ${lens.lens_id} lens`,
        field,
        sentence: phrase,
        matched: phrase,
        safe_rewrite: lens.generalisation_rule || 'Rewrite without this framing.'
      });
    }
  }

  // A lens may declare a group it must never generalise about. A scoped or sourced
  // sentence passes; a bare collective claim does not.
  const subject = lens.generalisation_subject;
  if (subject) {
    const escaped = String(subject).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const generalisation = new RegExp(
      `\\b(?:${escaped}\\s+is|${escaped}\\s+(?:people|workers|companies)\\s+(?:are|all)|In\\s+${escaped},?\\s+everyone)\\b`,
      'i'
    );
    for (const sentence of splitSentences(body)) {
      if (!generalisation.test(sentence)) continue;
      const scoped = /\b(?:publicly\s+reported|according\s+to|survey|the\s+data|in\s+this\s+context|tends\s+to|reported\s+figures)\b/i.test(sentence);
      if (scoped) continue;
      violations.push({
        gate: 'LENS_CONTRACT',
        claim_id: 'unsupported_generalisation',
        label: 'collective generalisation without evidence or scope',
        field,
        sentence,
        matched: 'generalisation',
        safe_rewrite: lens.generalisation_rule
          || 'Attribute the claim to published evidence, or scope it to the specific case.'
      });
    }
  }
  return violations;
}

/** A claim the source itself marks as restricted may not appear in a derivative. */
export function checkSourceClaims(text, source, field = 'body') {
  const violations = [];
  const body = String(text || '').toLowerCase();
  for (const restricted of source.restricted_claims || []) {
    const phrase = String(restricted.phrase ?? restricted).toLowerCase();
    if (!phrase) continue;
    if (body.includes(phrase)) {
      violations.push({
        gate: 'SOURCE_CONTRACT',
        claim_id: 'restricted_source_claim',
        label: `claim restricted by source ${source.source_id}`,
        field,
        sentence: String(restricted.phrase ?? restricted),
        matched: phrase,
        safe_rewrite: restricted.safe_rewrite
          || 'This claim is not supported by the approved source material.'
      });
    }
  }
  return violations;
}

/** Run the gate across every text field of a draft. */
export function checkDraft(draft, context) {
  const fields = [
    ['title', draft.title],
    ['hook', draft.hook],
    ['body', draft.body],
    ['cta_text', draft.cta_text]
  ];
  const violations = [];
  let sentences = 0;
  for (const [field, value] of fields) {
    if (!value) continue;
    const result = checkTruth(value, { ...context, field });
    violations.push(...result.violations);
    sentences += result.checked_sentences;
  }
  return { ok: violations.length === 0, violations, checked_sentences: sentences };
}
