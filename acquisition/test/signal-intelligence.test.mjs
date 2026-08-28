import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { corroborate, feedbackPriority, fingerprintEvidence, ingestEvidence, promoteCandidate, revenueSignalScore, routeBlockedByCooldown } from '../signal-intelligence/lib/index.mjs';
import { readJson } from '../lib/util.mjs';

const now = new Date('2026-08-29T00:00:00Z');
const signal = (id, family, bucket, origin = id, cls = 'OBSERVED', observed = '2026-08-28T00:00:00Z') => ({
  signal_id: id, source_family: family, evidence_bucket: bucket, provider: 'fixture', observed_at: observed,
  expires_at: '2026-09-28T00:00:00Z', url_or_reference: `fixture:${id}`, topic: 'AI workflow waste', audience: ['founder'],
  geography: 'global', language: 'en', observation_summary: `Observed ${id}`, evidence_class: cls,
  commercial_intent_indicators: [], freshness: 'CURRENT', confidence: 0.8, rights_policy_notes: 'fixture', shared_origin_key: origin
});
const high = Object.fromEntries(['purchase_intent','pain_severity','urgency','demand_growth','evidence_independence','evidence_quality','existing_product_fit','audience_fit','content_lens_fit','commercial_margin_fit','differentiation_opportunity','freshness','automation_feasibility','measurement_quality'].map((k) => [k, 9]));
high.operational_burden = 1; high.safety_risk = 0;
const inventory = { assets: [{ asset_id: 'kit', asset_name: 'Workflow Kit', asset_type: 'PAID_PRODUCT', language: 'en', status: 'LIVE', public_url: 'https://stratumpraxis.com/kit.html', revenue_destination: { type: 'STRIPE', url: 'https://buy.stripe.com/x', price: 'USD 39' }, primary_user_problem: 'AI workflow waste', problem_keys: ['workflow_waste'], target_audience: ['founder'], commercial_intent: 'HIGH', distribution_candidates: ['youtube'], cta: { label: 'Get kit', analytics_id: 'kit_cta' }, analytics_events: ['funnel_view','primary_cta_click','checkout_click'], verification_state: 'HTTP_VERIFIED' }] };
const sourceRouting = { sources: { youtube: { utm_source: 'youtube', utm_medium: 'video' } } };
const providerPolicy = { providers: { buffer: { publishingEnabled: true, allowedServices: ['youtube'] } } };
const demand = { signal_id: 'demand', language: 'en', problem_keys: ['workflow_waste'], target_audience: ['founder'] };

test('one weak signal alone cannot promote', () => assert.equal(corroborate([signal('a','trend_demand','DEMAND_SIGNAL')], { now }).passes, false));
test('mirrored evidence cannot count twice', () => {
  const out = corroborate([signal('a','search_demand','DEMAND_SIGNAL','same'), signal('b','reddit_pain','PAIN_SIGNAL','same')], { now });
  assert.equal(out.independent_count, 1); assert.equal(out.passes, false);
});
test('ASSUMPTION cannot satisfy the two-signal rule', () => assert.equal(corroborate([signal('a','search_demand','DEMAND_SIGNAL'), signal('b','reddit_pain','PAIN_SIGNAL','b','ASSUMPTION')], { now }).passes, false));
test('DEMAND + PAIN promotes only when score and verified asset fit pass', () => {
  const candidate = promoteCandidate({ candidate_id: 'c1', thesis: 't', signals: [signal('a','search_demand','DEMAND_SIGNAL'), signal('b','reddit_pain','PAIN_SIGNAL')], score_dimensions: high, demand, inventory, sourceRouting, providerPolicy, eligible_audiences: ['founder'], eligible_lenses: ['practical_operator'], now });
  assert.equal(candidate.promoted, true); assert.equal(candidate.best_existing_asset.asset_id, 'kit'); assert.ok(candidate.revenue_signal_score >= 70);
});
test('MONEY evidence boosts bucket confidence without fabricating external consensus', () => {
  const out = corroborate([signal('a','owned_behavior','MONEY_SIGNAL'), signal('b','search_demand','DEMAND_SIGNAL')], { now });
  assert.deepEqual(out.corroboration_families.sort(), ['owned_behavior','search_demand']); assert.equal(out.independent_count, 2);
});
test('stale signals expire', () => assert.equal(corroborate([{ ...signal('a','search_demand','DEMAND_SIGNAL'), expires_at: '2026-08-01T00:00:00Z' }, signal('b','reddit_pain','PAIN_SIGNAL')], { now }).passes, false));
test('duplicate fingerprint is idempotently rejected', () => {
  const a = signal('a','search_demand','DEMAND_SIGNAL'); a.fingerprint = fingerprintEvidence(a);
  const first = ingestEvidence({ signals: [] }, a, { now }); const second = ingestEvidence(first.store, { ...a, signal_id: 'other' }, { now });
  assert.equal(first.accepted, true); assert.equal(second.idempotent, true);
});
test('verified existing asset is preferred and exposes required fit fields', () => {
  const c = promoteCandidate({ candidate_id: 'c', thesis: 't', signals: [signal('a','search_demand','DEMAND_SIGNAL'), signal('b','reddit_pain','PAIN_SIGNAL')], score_dimensions: high, demand, inventory, sourceRouting, providerPolicy, now });
  for (const key of ['best_existing_asset','asset_id','product_or_offer','primary_user_problem','target_audience','primary_cta','destination_url','secondary_route','asset_fit_score','verification_state','measurement_quality']) assert.ok(key in c.best_existing_asset);
});
test('no-fit candidate never auto-creates a product', () => {
  const c = promoteCandidate({ candidate_id: 'c', thesis: 't', signals: [signal('a','search_demand','DEMAND_SIGNAL'), signal('b','reddit_pain','PAIN_SIGNAL')], score_dimensions: high, demand: { ...demand, problem_keys: ['none'], target_audience: ['none'] }, inventory: { assets: [] }, sourceRouting, providerPolicy, now });
  assert.equal(c.promoted, false); assert.equal(c.no_product_created, true); assert.ok(['WATCH_NO_ASSET_FIT','NEW_PRODUCT_RECOMMENDATION'].includes(c.status));
});
test('score thresholds are fixed at 50/70/85 semantics', () => {
  assert.equal(revenueSignalScore({}).band, 'LOW_VALUE');
  const result = revenueSignalScore(high); assert.equal(result.band, 'HIGH_PRIORITY_SOURCE_CANDIDATE');
});
test('feedback preserves exploration and STOP cooldown', () => {
  const priority = feedbackPriority({ revenue_signal_score: 80 }, { route_id: 'r', destination_views: 120, cta_clicks: 0, checkout: 0, purchase: 0 });
  assert.equal(priority.verdict, 'STOP'); assert.equal(priority.priority, 0.2);
  assert.equal(routeBlockedByCooldown([{ topic: 'x', desk_id: 'en_desk', lens_id: 'practical_operator', verdict: 'STOP', decided_at: '2026-08-28T00:00:00Z' }], { topic: 'x', desk_id: 'en_desk', lens_id: 'practical_operator', now }), true);
});
test('historical acquisition and video ledgers are not modified by intelligence operations', async () => {
  const paths = ['acquisition/distribution-ledger.json','trend-video-engine/publish-ledger.json'];
  const before = await Promise.all(paths.map((p) => fs.readFile(p, 'utf8')));
  corroborate([signal('a','search_demand','DEMAND_SIGNAL'), signal('b','reddit_pain','PAIN_SIGNAL')], { now });
  const after = await Promise.all(paths.map((p) => fs.readFile(p, 'utf8')));
  assert.deepEqual(after, before);
});
test('production provider registry makes no unsupported external connection claims', async () => {
  const p = await readJson('acquisition/signal-intelligence/providers.json');
  for (const [name, value] of Object.entries(p.providers)) if (name !== 'completed_owner_source') assert.equal(value.state, 'CONTRACT_ONLY');
});
