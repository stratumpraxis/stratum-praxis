// Issue #52 - the source contract.
//
// Two, and only two, kinds of source may be derived from:
//   1. a COMPLETE owner-approved source package
//   2. a promoted, unexpired SOURCE_CANDIDATE from Issue #53
//
// Sources are immutable for provenance purposes: the stored content_hash is recomputed
// on every load, and a source whose content has changed underneath its hash is refused
// rather than silently re-derived.

import fs from 'node:fs/promises';

import { isPlainObject, readJson, repoPath } from '../../lib/util.mjs';
import { PROMOTED_STATUSES, isConsumable } from '../../signal-intelligence/lib/source-candidate.mjs';
import { sha256 } from '../../signal-intelligence/lib/fingerprint.mjs';

export const SOURCE_TYPES = Object.freeze(['OWNER_APPROVED_SOURCE', 'SOURCE_CANDIDATE']);
export const SOURCE_STATUSES = Object.freeze(['DRAFT', 'COMPLETE', 'ARCHIVED']);
export const DERIVABLE_STATUSES = Object.freeze(['COMPLETE']);

export const REQUIRED_FIELDS = Object.freeze([
  'source_id',
  'source_type',
  'title',
  'language',
  'content_hash',
  'created_at',
  'status',
  'allowed_claims',
  'restricted_claims',
  'personal_experience_claims',
  'evidence_refs',
  'existing_product_routes'
]);

export function contentHash(text) {
  return `sha256:${sha256(String(text || '').replace(/\r\n/g, '\n').trim())}`;
}

export function validateSource(source) {
  const errors = [];
  const label = isPlainObject(source) && source.source_id ? source.source_id : 'unnamed-source';
  if (!isPlainObject(source)) return [`${label}: source must be an object`];

  for (const field of REQUIRED_FIELDS) {
    if (source[field] === undefined) errors.push(`${label}: missing required field ${field}`);
  }
  if (typeof source.source_id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(source.source_id || '')) {
    errors.push(`${label}: source_id must be lowercase kebab-case`);
  }
  if (!SOURCE_TYPES.includes(source.source_type)) errors.push(`${label}: unknown source_type ${source.source_type}`);
  if (!SOURCE_STATUSES.includes(source.status)) errors.push(`${label}: unknown status ${source.status}`);

  if (source.status === 'COMPLETE') {
    if (!source.completed_at) errors.push(`${label}: COMPLETE requires completed_at`);
    if (!Array.isArray(source.evidence_refs) || !source.evidence_refs.length) {
      errors.push(`${label}: COMPLETE requires at least one evidence_ref`);
    }
  }
  if (typeof source.content_hash !== 'string' || !source.content_hash.startsWith('sha256:')) {
    errors.push(`${label}: content_hash must be a sha256: digest of the source text`);
  }
  for (const key of ['allowed_claims', 'restricted_claims', 'personal_experience_claims', 'evidence_refs', 'existing_product_routes']) {
    if (source[key] !== undefined && !Array.isArray(source[key])) errors.push(`${label}: ${key} must be an array`);
  }
  if (source.source_type === 'SOURCE_CANDIDATE' && !source.source_candidate_id) {
    errors.push(`${label}: a SOURCE_CANDIDATE source must name its source_candidate_id`);
  }
  if (source.source_type === 'OWNER_APPROVED_SOURCE' && !source.source_file && !source.source_url) {
    errors.push(`${label}: an owner-approved source must name a source_file or source_url`);
  }

  // A personal-experience claim must carry its own proof, or it is not usable.
  for (const claim of source.personal_experience_claims || []) {
    if (!claim.claim) errors.push(`${label}: a personal_experience_claim has no claim text`);
    if (!claim.evidence_ref) {
      errors.push(`${label}: personal experience claim "${claim.claim}" has no evidence_ref; an unproven personal claim may not be carried into a derivative`);
    }
  }
  return errors;
}

/**
 * Verify a source against what is actually on disk / in the candidate store.
 * This is the immutability check.
 */
export async function verifySourceIntegrity(source, { candidates = null, now = Date.now() } = {}) {
  const problems = [];

  if (source.source_file) {
    const path = repoPath(source.source_file);
    let raw = null;
    try {
      raw = await fs.readFile(path, 'utf8');
    } catch {
      problems.push(`source_file ${source.source_file} could not be read`);
    }
    if (raw !== null) {
      const actual = contentHash(raw);
      if (actual !== source.content_hash) {
        problems.push(`content_hash mismatch for ${source.source_file}: the source has changed since it was approved (stored ${source.content_hash}, actual ${actual}). Original sources are immutable for provenance; register a new source_id instead of editing this one.`);
      }
    }
  }

  if (source.source_type === 'SOURCE_CANDIDATE') {
    const store = candidates || await loadCandidateStore();
    const candidate = (store.candidates || []).find((c) => c.source_candidate_id === source.source_candidate_id);
    if (!candidate) {
      problems.push(`source_candidate_id ${source.source_candidate_id} is not in the Issue #53 candidate store`);
    } else {
      if (!PROMOTED_STATUSES.includes(candidate.status)) {
        problems.push(`source_candidate_id ${source.source_candidate_id} has status ${candidate.status}, which Issue #53 did not promote`);
      }
      const consumable = isConsumable(candidate, now);
      if (!consumable.ok) problems.push(`source_candidate_id ${source.source_candidate_id} is not consumable: ${consumable.reason}`);
    }
  }

  return { ok: problems.length === 0, problems };
}

export async function loadCandidateStore(file = 'acquisition/signal-intelligence/candidates.json') {
  try {
    return await readJson(file);
  } catch (error) {
    if (error.code === 'ENOENT') return { candidates: [] };
    throw error;
  }
}

/** May this source be derived from at all? */
export function isDerivable(source) {
  if (!DERIVABLE_STATUSES.includes(source.status)) {
    return { ok: false, reason: `source status ${source.status} is not derivable; only ${DERIVABLE_STATUSES.join(', ')} may derive` };
  }
  return { ok: true, reason: 'COMPLETE' };
}

/**
 * Load the source register.
 * A duplicate content_hash is reported rather than accepted: registering the same
 * material twice under two ids would let one source produce twice the output.
 */
export async function loadSources(file = 'acquisition/media-engine/sources.json', options = {}) {
  const doc = await readJson(file);
  if (!Array.isArray(doc?.sources)) throw new Error(`${file} must contain a sources array`);

  const accepted = [];
  const rejected = [];
  const duplicates = [];
  const byHash = new Map();
  const byId = new Set();
  const candidates = options.candidates ?? await loadCandidateStore();

  for (const source of doc.sources) {
    const errors = validateSource(source);
    if (byId.has(source?.source_id)) errors.push(`${source.source_id}: duplicate source_id`);
    if (errors.length) {
      rejected.push({ source_id: source?.source_id ?? 'unnamed-source', errors });
      continue;
    }
    byId.add(source.source_id);

    const integrity = await verifySourceIntegrity(source, { candidates, now: options.now });
    if (!integrity.ok) {
      rejected.push({ source_id: source.source_id, errors: integrity.problems });
      continue;
    }

    const prior = byHash.get(source.content_hash);
    if (prior) {
      duplicates.push({
        source_id: source.source_id,
        duplicate_of: prior,
        content_hash: source.content_hash,
        reason: 'identical content_hash; the same material may not be registered twice'
      });
      continue;
    }
    byHash.set(source.content_hash, source.source_id);
    accepted.push(source);
  }

  return { doc, accepted, rejected, duplicates, byId: new Map(accepted.map((s) => [s.source_id, s])) };
}
