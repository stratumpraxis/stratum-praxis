// The identity contract loader.
//
// A publishing pipeline that can mint a second author can fabricate anything. This
// module refuses to load a contract that describes more than one identity, and it
// refuses to load an approved first-person claim that has no evidence reference and
// no scope. Those two refusals are the whole security model.
//
// No I/O is performed here beyond an optional JSON read, and there are no
// dependencies outside the Node standard library.

import fs from 'node:fs/promises';

/**
 * Load and validate an identity contract from a JSON file.
 * Throws with `error.errors` listing every problem found.
 */
export async function loadIdentity(file) {
  const raw = await fs.readFile(file, 'utf8');
  let identity;
  try {
    identity = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON in ${file}: ${error.message}`);
  }
  return assertValidIdentity(identity);
}

export function assertValidIdentity(identity) {
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
  if (typeof identity !== 'object' || identity === null || Array.isArray(identity)) {
    return ['identity contract must be an object'];
  }

  for (const field of [
    'identity_id', 'public_descriptor', 'approved_first_person_claims',
    'prohibited_first_person_claims', 'privacy_redactions', 'languages', 'updated_at'
  ]) {
    if (identity[field] === undefined) errors.push(`identity contract is missing ${field}`);
  }

  if (typeof identity.identity_id === 'string' && !identity.identity_id.trim()) {
    errors.push('identity_id must not be empty');
  }
  if (identity.is_fictional !== false) {
    errors.push('is_fictional must be false; this gate does not operate fictional identities');
  }
  // A roster is how persona farms start. There is one identity per contract, always.
  if (Array.isArray(identity.identities) || Array.isArray(identity.personas)) {
    errors.push('an identity list is not permitted; there is one identity, not a roster');
  }

  for (const claim of identity.approved_first_person_claims || []) {
    if (!claim.claim_id) errors.push('an approved claim is missing claim_id');
    // An approved first-person claim without a source of truth is exactly the
    // failure mode this contract exists to prevent.
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

/** Country-level values the contract approves for a residence claim, lowercased. */
export function approvedLocationValues(identity) {
  return (identity.approved_location_values || []).map((v) => String(v).toLowerCase());
}

/**
 * A regex identifying assets the identity genuinely operates. Sentences about those
 * assets may legitimately use verbs like "built" or "publish".
 */
export function ownedAssetPattern(identity) {
  const source = identity.owned_asset_pattern;
  if (!source) return null;
  try {
    return new RegExp(source, 'i');
  } catch {
    return null;
  }
}
