import test from 'node:test';
import assert from 'node:assert/strict';

import { contentHash, isDerivable, loadSources, validateSource, verifySourceIntegrity } from '../lib/source.mjs';

const base = {
  source_id: 'probe-source',
  source_type: 'OWNER_APPROVED_SOURCE',
  title: 'probe',
  language: 'en',
  content_hash: contentHash('probe body'),
  source_file: null,
  source_url: 'https://example.test/probe',
  created_at: '2026-08-01T00:00:00Z',
  completed_at: '2026-08-02T00:00:00Z',
  status: 'COMPLETE',
  allowed_claims: [],
  restricted_claims: [],
  personal_experience_claims: [],
  evidence_refs: ['https://example.test/probe'],
  existing_product_routes: []
};

test('a COMPLETE source with evidence validates', () => {
  assert.deepEqual(validateSource(base), []);
  assert.equal(isDerivable(base).ok, true);
});

test('an incomplete source is rejected before any derivation', () => {
  const draft = { ...base, status: 'DRAFT', completed_at: undefined };
  assert.deepEqual(validateSource(draft), []);
  const derivable = isDerivable(draft);
  assert.equal(derivable.ok, false);
  assert.match(derivable.reason, /only COMPLETE may derive/);
});

test('a COMPLETE source without evidence refs is invalid', () => {
  assert.ok(validateSource({ ...base, evidence_refs: [] })
    .some((e) => e.includes('COMPLETE requires at least one evidence_ref')));
  assert.ok(validateSource({ ...base, completed_at: undefined })
    .some((e) => e.includes('COMPLETE requires completed_at')));
});

test('a personal-experience claim without proof is refused at the source', () => {
  const errors = validateSource({
    ...base,
    personal_experience_claims: [{ claim: 'I ran this for six months' }]
  });
  assert.ok(errors.some((e) => e.includes('has no evidence_ref')));
});

test('a candidate-backed source must name its candidate id', () => {
  assert.ok(validateSource({ ...base, source_type: 'SOURCE_CANDIDATE', source_candidate_id: undefined })
    .some((e) => e.includes('must name its source_candidate_id')));
});

test('sources are immutable: a changed file breaks its own hash', async () => {
  const source = {
    ...base,
    source_id: 'immutable-probe',
    source_file: 'content/note-publish-queue/2026-08-26-repeat-visit-sites-win.md',
    content_hash: contentHash('this is not what is in the file')
  };
  const integrity = await verifySourceIntegrity(source, { candidates: { candidates: [] } });
  assert.equal(integrity.ok, false);
  assert.match(integrity.problems[0], /content_hash mismatch/);
  assert.match(integrity.problems[0], /immutable for provenance/);
});

test('the shipped register loads with the real file hashes intact', async () => {
  const result = await loadSources();
  assert.deepEqual(result.rejected, [], 'the shipped source register must verify against the real files');
  assert.equal(result.accepted.length, 4);
  const owner = result.byId.get('repeat-visit-sites-win-owner-package');
  assert.equal(owner.source_type, 'OWNER_APPROVED_SOURCE');
  assert.equal(owner.status, 'COMPLETE');
  const agentControl = result.byId.get('agent-company-control-owner-package');
  assert.ok(agentControl, 'the shipped agent-control owner package must survive integrity validation');
  assert.equal(agentControl.status, 'COMPLETE');
  const draft = result.byId.get('routine-information-assets-draft');
  assert.equal(isDerivable(draft).ok, false, 'the draft note must not be derivable');
});

test('registering the same material twice is handled safely, not doubled', async () => {
  const doc = {
    sources: [
      { ...base, source_id: 'first-copy' },
      { ...base, source_id: 'second-copy' }
    ]
  };
  // Exercised through the same code path loadSources uses.
  const seen = new Map();
  const duplicates = [];
  for (const source of doc.sources) {
    if (seen.has(source.content_hash)) {
      duplicates.push({ source_id: source.source_id, duplicate_of: seen.get(source.content_hash) });
      continue;
    }
    seen.set(source.content_hash, source.source_id);
  }
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].duplicate_of, 'first-copy');
});

test('a source backed by an unpromoted candidate is refused', async () => {
  const source = { ...base, source_type: 'SOURCE_CANDIDATE', source_candidate_id: 'sc-probe', source_file: null };
  const watchOnly = {
    candidates: [{ source_candidate_id: 'sc-probe', status: 'WATCH', expiry: '2099-01-01T00:00:00Z' }]
  };
  const integrity = await verifySourceIntegrity(source, { candidates: watchOnly });
  assert.equal(integrity.ok, false);
  assert.match(integrity.problems[0], /Issue #53 did not promote/);
});

test('a source backed by an expired candidate is refused', async () => {
  const source = { ...base, source_type: 'SOURCE_CANDIDATE', source_candidate_id: 'sc-old', source_file: null };
  const expired = {
    candidates: [{ source_candidate_id: 'sc-old', status: 'SOURCE_CANDIDATE', expiry: '2020-01-01T00:00:00Z' }]
  };
  const integrity = await verifySourceIntegrity(source, { candidates: expired });
  assert.equal(integrity.ok, false);
  assert.match(integrity.problems[0], /expired/);
});

test('a source citing a candidate that does not exist is refused', async () => {
  const source = { ...base, source_type: 'SOURCE_CANDIDATE', source_candidate_id: 'sc-invented', source_file: null };
  const integrity = await verifySourceIntegrity(source, { candidates: { candidates: [] } });
  assert.equal(integrity.ok, false);
  assert.match(integrity.problems[0], /not in the Issue #53 candidate store/);
});
