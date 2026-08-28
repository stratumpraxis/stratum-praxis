import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildMediaAttribution, deriveRoute, duplicationGate, localizationGate, materialTransformationGate, publicationGate, sourceHash, transitionPublication, truthGate, validatePaymentAttribution, validateSource } from '../lib/index.mjs';
import { readJson } from '../../acquisition/lib/util.mjs';

const identity = await readJson('persona-distribution/identity.json');
const sourceRouting = await readJson('distribution/source-routing.json');
const providerPolicy = await readJson('distribution/provider-policy.json');
const makeSource = (overrides = {}) => {
  const base = { source_id: 's1', source_type: 'SOURCE_CANDIDATE', source_candidate_id: 'c1', candidate_status: 'SOURCE_CANDIDATE', title: 'Workflow waste', language: 'en', original_content: 'A carefully evidenced discussion of workflow waste and decision criteria.', created_at: '2026-08-28T00:00:00Z', completed_at: '2026-08-28T01:00:00Z', status: 'COMPLETE', allowed_claims: ['workflow waste exists'], restricted_claims: [], personal_experience_claims: [], evidence_refs: ['sig-a','sig-b'], existing_product_routes: ['kit'] };
  const source = { ...base, ...overrides }; source.content_hash = overrides.content_hash ?? sourceHash(source); return source;
};
const localized = { quality_score: 0.9, framing: 'problem-led', hook: 'specific', terminology: 'neutral', examples: 'solo operator', cta_wording: 'clear', cultural_context: 'international' };
const output = { output_id: 'o1', source_id: 's1', title: 'Where solo AI workflows quietly lose time', body: 'Independent operators can diagnose duplicated tools by mapping each workflow, its decision owner, and its measurable next step.', desk_id: 'en_desk', channel_id: 'youtube', audience: 'founder', cta_id: 'kit_cta', destination_url: 'https://stratumpraxis.com/kit.html', campaign: 'workflow-waste', localization: localized, target_asset_language: 'en', cta_present: true, platform_disclosure_required: false, disclosure_state: 'NOT_REQUIRED', created_at: '2026-08-29T00:00:00Z' };

test('incomplete source is rejected', () => assert.match(validateSource({}).join('\n'), /source_id is required/));
test('duplicate source is safely rejected', () => assert.match(validateSource(makeSource(), [makeSource()]).join('\n'), /duplicate/));
test('fabricated biography is rejected', () => assert.equal(truthGate('Analysis', identity, makeSource({ age: 33 })).ok, false));
test('unapproved first-person, testing, purchase and client claims are rejected', () => {
  for (const text of ['I tested this tool.','I bought this product.','In my client work, this happens.','My customers agree.']) assert.equal(truthGate(text, identity, makeSource()).ok, false, text);
});
test('approved personal experience may pass exactly when source contract proves it', () => assert.equal(truthGate('I tested this tool.', identity, makeSource({ personal_experience_claims: ['I tested this tool.'] })).ok, true));
test('English output is materially transformed', () => assert.equal(materialTransformationGate(output, makeSource()).ok, true));
test('Spanish output cannot be literal English translation lane', () => {
  const es = { ...output, desk_id: 'es_desk', localization: { ...localized, literal_translation: true }, source_desk_output: output, english_only_disclosure: true };
  assert.equal(localizationGate(es, output).ok, false);
});
test('poor localization fails', () => assert.equal(localizationGate({ ...output, localization: { quality_score: 0.2 } }).ok, false));
test('English-only product disclosure is mandatory in Spanish CTA', () => assert.equal(localizationGate({ ...output, desk_id: 'es_desk', english_only_disclosure: false }).ok, false));
test('duplicate and cannibalized output is blocked', () => assert.equal(duplicationGate(output, [{ ...output, output_id: 'prior', created_at: '2026-08-28T00:00:00Z' }], { now: new Date('2026-08-29') }).ok, false));
test('disabled or unmapped provider cannot auto-publish', () => assert.equal(publicationGate({ channel: 'devto', providerPolicy, account_authorized: true, automation_permitted: true, truth: {ok:true}, duplication:{ok:true}, localization:{ok:true}, safety_ok:true }).lane, 'BLOCKED'));
test('missing authorization cannot auto-publish', () => assert.equal(publicationGate({ channel: 'youtube', providerPolicy, account_authorized: false, automation_permitted: true, truth:{ok:true},duplication:{ok:true},localization:{ok:true},safety_ok:true }).lane, 'HUMAN_PUBLISH_REQUIRED'));
test('unmet disclosure blocks publication', () => assert.equal(publicationGate({ channel: 'youtube', providerPolicy, account_authorized: true, automation_permitted: true, disclosure_required:true, disclosure_state:'MISSING',truth:{ok:true},duplication:{ok:true},localization:{ok:true},safety_ok:true }).lane, 'BLOCKED'));
test('PUBLISH_REQUESTED is not PUBLISHED and PUBLISHED is not VERIFIED', () => {
  const requested = transitionPublication({ status: 'READY' }, 'PUBLISH_REQUESTED'); assert.equal(requested.status, 'PUBLISH_REQUESTED');
  assert.throws(() => transitionPublication(requested, 'PUBLISHED'), /requires external/);
  const published = transitionPublication(requested, 'PUBLISHED', { external_post_id:'p', canonical_url:'https://example.com/p', published_at:'2026-08-29T00:00:00Z', account_id:'a' });
  assert.equal(published.status, 'PUBLISHED'); assert.throws(() => transitionPublication(published, 'VERIFIED'), /independent verification/);
});
test('payment attribution requires payment evidence', () => assert.match(validatePaymentAttribution({ purchase: 1 }).join(''), /payment-provider/));
test('provenance and existing UTM dimensions survive #53 to channel', () => {
  const candidate = { source_candidate_id:'c1', best_existing_asset:{ asset_id:'kit', destination_url:'https://stratumpraxis.com/kit.html' } };
  const a = buildMediaAttribution({ source:makeSource(), candidate, identity, desk:'en_desk', lens:'practical_operator', channel:'youtube', account_alias:'stratumpraxis', target_asset:'kit', cta_id:'kit_cta', campaign:'workflow', destinationUrl:'https://stratumpraxis.com/kit.html', sourceRouting });
  for (const key of ['source_id','source_candidate_id','identity_id','desk_id','lens_id','channel_id','account_alias','campaign','target_asset','cta_id']) assert.ok(a[key]);
  assert.equal(new URL(a.destination_url).searchParams.get('utm_source'), 'youtube');
});
test('STOP routes remain stopped and no fictional account/persona is created', () => {
  const candidate = { source_candidate_id:'c1', best_existing_asset:{asset_id:'kit',destination_url:'https://stratumpraxis.com/kit.html'} };
  const r = deriveRoute({ source:makeSource(), candidate, identity, desk:{desk_id:'en_desk'}, lens:{lens_id:'practical_operator'}, output, providerPolicy, sourceRouting, channel:'youtube', account_alias:'stratumpraxis', history:[{topic:'Workflow waste',desk_id:'en_desk',lens_id:'practical_operator',verdict:'STOP',decided_at:'2026-08-28T00:00:00Z'}], now:new Date('2026-08-29T00:00:00Z') });
  assert.equal(r.eligible, false); assert.deepEqual(Object.keys(identity).filter((k) => k.includes('persona')), []);
});
test('historical ledgers remain byte-for-byte unchanged', async () => {
  const paths=['acquisition/distribution-ledger.json','trend-video-engine/publish-ledger.json']; const before=await Promise.all(paths.map((p)=>fs.readFile(p,'utf8')));
  truthGate(output.body, identity, makeSource()); const after=await Promise.all(paths.map((p)=>fs.readFile(p,'utf8'))); assert.deepEqual(after,before);
});
