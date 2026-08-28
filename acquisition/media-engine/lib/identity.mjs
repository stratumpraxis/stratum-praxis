// Issue #52 - the identity contract loader.
//
// There is exactly one identity. This module refuses to load anything else, which is
// the mechanical form of "do not build a persona farm": there is no code path in this
// repository that creates a second identity, an account, or a fictional author.

import { isPlainObject, readJson } from '../../lib/util.mjs';

export const IDENTITY_ID = 'jp_independent_freelancer';

export async function loadIdentity(file = 'acquisition/media-engine/identity.json') {
  const identity = await readJson(file);
  const errors = validateIdentity(identity);
  if (errors.length) {
    const error = new Error(`identity contract is invalid (${errors.length} problem(s))`);
    error.errors = errors;
    throw error;
  }
  return identity;
}

export function validateIdentity(identity) {
  const errors = [];
  if (!isPlainObject(identity)) return ['identity contract must be an object'];

  for (const field of [
    'identity_id', 'public_descriptor', 'approved_first_person_claims',
    'prohibited_first_person_claims', 'privacy_redactions', 'allowed_topics',
    'restricted_topics', 'languages', 'default_disclosure_policy', 'updated_at'
  ]) {
    if (identity[field] === undefined) errors.push(`identity contract is missing ${field}`);
  }

  if (identity.identity_id !== IDENTITY_ID) {
    errors.push(`identity_id must be ${IDENTITY_ID}; this engine supports exactly one identity`);
  }
  if (identity.is_fictional !== false) {
    errors.push('is_fictional must be false; this engine does not operate fictional identities');
  }
  if (Array.isArray(identity.identities) || Array.isArray(identity.personas)) {
    errors.push('an identity list is not permitted; there is one identity, not a roster');
  }

  for (const claim of identity.approved_first_person_claims || []) {
    if (!claim.claim_id) errors.push('an approved claim is missing claim_id');
    // An approved first-person claim without a source of truth is exactly the failure
    // mode this contract exists to prevent.
    if (!claim.evidence_ref) errors.push(`approved claim ${claim.claim_id} has no evidence_ref`);
    if (!claim.scope) errors.push(`approved claim ${claim.claim_id} has no scope`);
  }
  for (const claim of identity.prohibited_first_person_claims || []) {
    if (!claim.claim_id) errors.push('a prohibited claim is missing claim_id');
    if (!claim.safe_rewrite) errors.push(`prohibited claim ${claim.claim_id} has no safe_rewrite`);
  }
  return errors;
}

/** Is this claim family explicitly approved for first-person use? */
export function isApprovedClaim(identity, claimId) {
  return (identity.approved_first_person_claims || []).some((c) => c.claim_id === claimId);
}

export function prohibitedClaim(identity, claimId) {
  return (identity.prohibited_first_person_claims || []).find((c) => c.claim_id === claimId) || null;
}

export function safeRewriteFor(identity, claimId) {
  return prohibitedClaim(identity, claimId)?.safe_rewrite
    || 'Rewrite as observation, analysis or recommendation instead of autobiography.';
}
