// Revenue Publisher v2 - the social-post evidence contract.
//
// Two distinctions this module refuses to let collapse:
//
//   1. A post existing is OBSERVED evidence that somebody said something.
//      A numerical, pricing, market-size or business-outcome claim written inside that
//      post is an UNVERIFIED_PUBLIC_CLAIM, and stays one until it is checked against a
//      primary source. "It was on X" is not verification.
//
//   2. Not every post is demand evidence. A vendor advertising its own product, an
//      affiliate post, a quote-post echo of something already counted, and a duplicated
//      account are all recorded - and none of them counts toward the 2-Signal Rule.
//
// Neither distinction is advisory: normalize.mjs refuses a record that does not declare
// them, and corroborate.mjs drops the non-independent ones before counting.

export const POST_TYPES = Object.freeze([
  'ORGANIC_USER_POST',
  'PROMOTIONAL',
  'AFFILIATE',
  'QUOTE_ECHO',
  'DUPLICATE_ACCOUNT',
  'PRESS_OR_VENDOR_ANNOUNCEMENT'
]);

/** Post types that are recorded but never count as independent demand evidence. */
export const NON_INDEPENDENT_POST_TYPES = Object.freeze([
  'PROMOTIONAL',
  'AFFILIATE',
  'QUOTE_ECHO',
  'DUPLICATE_ACCOUNT',
  'PRESS_OR_VENDOR_ANNOUNCEMENT'
]);

export const CLAIM_STATUSES = Object.freeze([
  'UNVERIFIED_PUBLIC_CLAIM',
  'VERIFIED_AGAINST_PRIMARY_SOURCE',
  'REFUTED'
]);

/** Families whose records must carry a social-evidence contract. */
export const SOCIAL_FAMILIES = Object.freeze(['social_public_post']);

export function isSocialFamily(family) {
  return SOCIAL_FAMILIES.includes(family);
}

export function reasonNotIndependent(postType) {
  switch (postType) {
    case 'PROMOTIONAL':
    case 'PRESS_OR_VENDOR_ANNOUNCEMENT':
      return 'a seller promoting its own product is supply-side marketing, not buyer demand';
    case 'AFFILIATE':
      return 'an affiliate post is paid distribution, not independent demand';
    case 'QUOTE_ECHO':
      return 'a quote post repeats an original that is already counted';
    case 'DUPLICATE_ACCOUNT':
      return 'a duplicated account is the same voice counted twice';
    default:
      return null;
  }
}

/**
 * Does this record count as independent demand evidence?
 * A record may only be independent if its post type allows it AND it says so.
 */
export function isIndependentDemandEvidence(signal) {
  if (!isSocialFamily(signal?.source_family)) return true;
  const integrity = signal.content_integrity || {};
  if (NON_INDEPENDENT_POST_TYPES.includes(integrity.post_type)) return false;
  return integrity.independent_demand_evidence === true;
}

/** Every claim inside the post that has not been verified against a primary source. */
export function unverifiedClaims(signal) {
  return (signal?.content_integrity?.claims_inside_post || [])
    .filter((c) => c.status !== 'VERIFIED_AGAINST_PRIMARY_SOURCE');
}

/**
 * Validate the social-evidence contract on one record.
 * Returns human-readable problems; an empty array means the record declares what it is,
 * which is a much weaker statement than "this record proves anything".
 */
export function validateSocialEvidence(record, label = 'record') {
  if (!isSocialFamily(record?.source_family)) return [];
  const errors = [];
  const integrity = record.content_integrity;

  if (!integrity || typeof integrity !== 'object' || Array.isArray(integrity)) {
    return [`${label}: a ${record.source_family} record requires a content_integrity object declaring post_type, independence and claim status`];
  }
  if (!POST_TYPES.includes(integrity.post_type)) {
    errors.push(`${label}: content_integrity.post_type must be one of ${POST_TYPES.join(', ')}`);
  }
  if (typeof integrity.independent_demand_evidence !== 'boolean') {
    errors.push(`${label}: content_integrity.independent_demand_evidence must be declared true or false`);
  }
  if (NON_INDEPENDENT_POST_TYPES.includes(integrity.post_type) && integrity.independent_demand_evidence === true) {
    errors.push(`${label}: post_type ${integrity.post_type} cannot be independent demand evidence (${reasonNotIndependent(integrity.post_type)})`);
  }
  if (integrity.independent_demand_evidence === false && !integrity.non_independence_reason) {
    errors.push(`${label}: a record excluded from demand evidence must record non_independence_reason`);
  }
  if (integrity.observed_claim_scope !== 'POST_EXISTENCE_ONLY') {
    errors.push(`${label}: content_integrity.observed_claim_scope must be POST_EXISTENCE_ONLY; observing a post never verifies what the post says`);
  }
  if (!Array.isArray(integrity.claims_inside_post)) {
    errors.push(`${label}: content_integrity.claims_inside_post must be an array (use [] when the post makes no factual claim)`);
  } else {
    for (const claim of integrity.claims_inside_post) {
      if (!claim || typeof claim !== 'object') {
        errors.push(`${label}: each claims_inside_post entry must be an object`);
        continue;
      }
      if (!claim.claim) errors.push(`${label}: a claims_inside_post entry has no claim text`);
      if (!CLAIM_STATUSES.includes(claim.status)) {
        errors.push(`${label}: claim "${claim.claim}" must carry a status of ${CLAIM_STATUSES.join(', ')}`);
      }
      if (claim.status === 'VERIFIED_AGAINST_PRIMARY_SOURCE' && !claim.primary_source_ref) {
        errors.push(`${label}: claim "${claim.claim}" is marked verified but names no primary_source_ref`);
      }
    }
  }
  if (typeof integrity.factual_verification_required_before_publication !== 'boolean') {
    errors.push(`${label}: content_integrity.factual_verification_required_before_publication must be declared`);
  }
  if (unverifiedClaims(record).length && integrity.factual_verification_required_before_publication !== true) {
    errors.push(`${label}: the record carries unverified in-post claims but does not require verification before publication`);
  }
  if (!integrity.observation_ref) {
    errors.push(`${label}: content_integrity.observation_ref must name the recorded observation this signal came from`);
  }
  return errors;
}

/** Prohibited-claim entries this evidence forces onto any candidate that uses it. */
export function prohibitedClaimsFromSocial(signals) {
  const social = (signals || []).filter((s) => isSocialFamily(s.source_family));
  if (!social.length) return [];
  const claims = [{
    claim_pattern: 'IN_POST_CLAIM_AS_VERIFIED_FACT',
    reason: 'social evidence observes that a post exists. Nothing written inside a post may be published as a verified fact without a primary source.'
  }];
  const unverified = social.flatMap((s) => unverifiedClaims(s).map((c) => c.claim));
  for (const claim of [...new Set(unverified)]) {
    claims.push({
      claim_pattern: `UNVERIFIED_IN_POST_CLAIM: ${claim}`,
      reason: 'recorded as an UNVERIFIED_PUBLIC_CLAIM in the observation file; not checked against a primary source'
    });
  }
  return claims;
}
