import test from 'node:test';
import assert from 'node:assert/strict';

import { PROVENANCE_FIELDS, attachMeasurement, buildMediaAttribution, verifyMediaAttribution } from '../lib/attribution.mjs';
import { classifyDeskLens, planDerivations, scoreEligibility, stopCooldownFor, verifyDerivation } from '../lib/derive.mjs';
import { loadDerivations, loadMediaContext } from '../lib/context.mjs';
import { loadCandidateStore } from '../lib/source.mjs';
import { loadPolicy } from '../../signal-intelligence/lib/normalize.mjs';

const context = await loadMediaContext();
const doc = await loadDerivations();
const en = doc.derivations.find((d) => d.desk_id === 'en_desk');
const es = doc.derivations.find((d) => d.desk_id === 'es_desk');
const NOW = Date.parse('2026-08-28T00:00:00Z');

const signalPolicy = await loadPolicy();
const familyTiers = Object.fromEntries(
  Object.entries(signalPolicy.evidence_families).map(([name, cfg]) => [name, cfg.tier]));

test('provenance survives Issue #53 -> identity -> desk -> lens -> channel', () => {
  const verified = verifyMediaAttribution(en);
  assert.deepEqual(verified.problems, []);
  assert.deepEqual(verified.chain, [
    'candidate:sc-shadow_ai_spend_accountability_2026_08',
    'identity:jp_independent_freelancer',
    'desk:en_desk',
    'lens:practical_operator',
    'channel:devto',
    'campaign:shadow_ai_spend_review_en',
    'cta:ai_saas_waste_calculator_primary',
    'asset:ai-saas-waste-calculator'
  ]);
});

test('every provenance dimension the issue names is preserved', () => {
  for (const derivation of doc.derivations) {
    for (const field of PROVENANCE_FIELDS) {
      assert.ok(field in derivation.provenance, `${derivation.derivation_id} is missing ${field}`);
    }
  }
});

test('the candidate the chain names is really the promoted Issue #53 record', async () => {
  const store = await loadCandidateStore();
  const candidate = store.candidates.find((c) => c.source_candidate_id === en.source_candidate_id);
  assert.ok(candidate, 'the cited candidate must exist');
  assert.equal(candidate.promoted, true);
  assert.equal(candidate.asset_id, en.target_asset);
  assert.equal(candidate.destination_url, en.destination_url);
  assert.ok(candidate.eligible_lenses.includes(en.lens_id));
});

test('attribution values come from the existing routing map, never invented here', () => {
  const routing = context.sourceRouting.sources.devto;
  assert.equal(en.utm_parameters.utm_source, routing.utm_source);
  assert.equal(en.utm_parameters.utm_medium, routing.utm_medium);

  // Rebuilding from the same inputs reproduces the shipped URL exactly.
  const rebuilt = buildMediaAttribution(en, {
    sourceRouting: context.sourceRouting,
    channel: context.channels.devto,
    identity: context.identity
  });
  assert.equal(rebuilt.tracked_destination_url, en.tracked_destination_url);
  assert.deepEqual(rebuilt.utm_parameters, en.utm_parameters);
});

test('an unknown channel cannot be attributed at all', () => {
  assert.throws(
    () => buildMediaAttribution(
      { ...en, channel_id: 'mastodon' },
      { sourceRouting: context.sourceRouting, channel: { source_routing_key: 'mastodon' }, identity: context.identity }
    ),
    /unknown distribution channel/
  );
});

test('a tracked URL that disagrees with its provenance is caught', () => {
  const tampered = {
    ...en,
    provenance: { ...en.provenance, target_asset: 'ai-value-realization-kit' }
  };
  const result = verifyMediaAttribution(tampered);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes('disagrees with provenance.target_asset')));
});

test('payment attribution is impossible without payment evidence', () => {
  assert.throws(
    () => attachMeasurement(en, { purchase: 1, measurement_source: 'posthog' }),
    /without purchase_evidence from a payment provider/
  );
  assert.throws(
    () => attachMeasurement(en, { revenue: 39, measurement_source: 'posthog' }),
    /without purchase_evidence from a payment provider/
  );

  // Measured-and-zero is allowed, and stays distinct from not-measured.
  const zero = attachMeasurement(en, { purchase: 0, cta_clicks: 4, measurement_source: 'posthog' });
  assert.equal(zero.measurement.purchase, 0);
  assert.equal(zero.measurement.checkout, null);

  const evidenced = attachMeasurement(en, { purchase: 1, purchase_evidence: 'stripe:pi_probe', measurement_source: 'stripe' });
  assert.equal(evidenced.measurement.purchase, 1);
});

test('no shipped derivation carries a purchase, revenue or publish claim', () => {
  for (const derivation of doc.derivations) {
    assert.equal(derivation.measurement.purchase, null);
    assert.equal(derivation.measurement.revenue, null);
    assert.equal(derivation.measurement.purchase_evidence, null);
    assert.equal(derivation.proof_state, 'DRAFT');
  }
});

test('views alone never make a desk x lens combination a winner', () => {
  const result = classifyDeskLens([{
    route_id: 'views-only',
    desk_id: 'en_desk',
    lens_id: 'practical_operator',
    attribution_state: 'ATTRIBUTED',
    destination_views: 9000,
    cta_clicks: null,
    checkout: null,
    purchase: null
  }]);
  assert.equal(result.classified[0].verdict, 'INSUFFICIENT_DATA');
  assert.deepEqual(result.by_verdict.SCALE, []);
});

test('a winning lens never becomes a new persona', () => {
  const result = classifyDeskLens([{
    route_id: 'winner',
    desk_id: 'en_desk',
    lens_id: 'practical_operator',
    attribution_state: 'ATTRIBUTED',
    destination_views: 500,
    cta_clicks: 50,
    checkout: 10,
    purchase: 2,
    purchase_evidence: 'stripe:pi_probe'
  }]);
  assert.equal(result.classified[0].verdict, 'SCALE');
  const combination = result.by_desk_lens['en_desk|practical_operator'];
  assert.equal(combination.new_persona_created, false);
  assert.deepEqual(combination.promotion_options, [
    'HIGHER_ROUTING_PRIORITY', 'DEDICATED_SITE_SECTION', 'DEDICATED_PUBLICATION_NAME', 'DEDICATED_AUTHORIZED_CHANNEL'
  ]);
  assert.match(result.rule, /never becomes a new fictional persona/);
});

test('a STOPped desk x lens route is not regenerated during its cooldown', () => {
  const source = context.sources.get(en.source_id);
  const stoppedCombinations = new Map([
    ['en_desk|practical_operator', { decided_at: new Date(NOW - 2 * 86400000).toISOString(), cooldown_days: 14 }]
  ]);

  const cooldown = stopCooldownFor(context.desks.en_desk, context.lenses.practical_operator, { stoppedCombinations, now: NOW });
  assert.ok(cooldown, 'the combination must be recognised as in cooldown');

  const scored = scoreEligibility(source, context.desks.en_desk, context.lenses.practical_operator, {
    candidate: null, channels: Object.values(context.channels), familyTiers, stoppedCombinations, now: NOW
  });
  assert.equal(scored.eligible, false);
  assert.ok(scored.reasons.some((r) => r.includes('STOP cooldown')));

  const plan = planDerivations(source, {
    desks: context.desks, lenses: context.lenses, derivationRule: context.derivationRule,
    channels: Object.values(context.channels), familyTiers, stoppedCombinations, now: NOW
  });
  assert.equal(plan.selected.some((s) => s.desk_id === 'en_desk' && s.lens_id === 'practical_operator'), false);

  // Once the window passes, the combination is available again.
  const after = NOW + 20 * 86400000;
  const released = stopCooldownFor(context.desks.en_desk, context.lenses.practical_operator, { stoppedCombinations, now: after });
  assert.equal(released, null);
});

test('an undated STOP stays in cooldown rather than defaulting to open', () => {
  const cooldown = stopCooldownFor(context.desks.en_desk, context.lenses.practical_operator, {
    stoppedCombinations: { 'en_desk|practical_operator': { decided_at: null } },
    now: NOW
  });
  assert.ok(cooldown);
  assert.equal(cooldown.until, null);
  assert.match(cooldown.reason, /carries no decision date/);
});

test('a derivation claiming a second identity is refused', () => {
  const impostor = { ...en, identity_id: 'es_desk_persona' };
  const verdict = verifyDerivation(impostor, { ...context, siblings: [es] });
  assert.equal(verdict.ok, false);
  assert.ok(verdict.problems.some((p) => p.includes('is not the single identity')));
  assert.equal(verdict.publish_state, 'BLOCKED');
});

test('a derivation from an unregistered source is refused', () => {
  const orphan = { ...en, source_id: 'a-source-nobody-registered' };
  const verdict = verifyDerivation(orphan, { ...context, siblings: [] });
  assert.equal(verdict.ok, false);
  assert.ok(verdict.problems.some((p) => p.includes('unknown or unaccepted source')));
});
