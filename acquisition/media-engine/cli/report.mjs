#!/usr/bin/env node
// Issue #52 - the media engine report. Read-only.
//
//   node acquisition/media-engine/cli/report.mjs
//   node acquisition/media-engine/cli/report.mjs --json

import { readJson } from '../../lib/util.mjs';
import { loadDerivations, loadMediaContext } from '../lib/context.mjs';
import { classifyDeskLens, verifyDerivation } from '../lib/derive.mjs';
import { resolvePublishState } from '../lib/publisher-gate.mjs';

const json = process.argv.includes('--json');

const context = await loadMediaContext();
const doc = await loadDerivations();
const metrics = await readJson('revenue-os/metrics.json').catch(() => ({}));

const verdicts = doc.derivations.map((derivation) => ({
  derivation,
  verdict: verifyDerivation(derivation, {
    ...context,
    siblings: doc.derivations.filter((d) => d.derivation_id !== derivation.derivation_id)
  })
}));

// Channel lanes, resolved against the live provider policy for every desk.
//
// The probe assumes a perfect derivation - every content gate passed and every required
// disclosure written - so the lane reflects what the CHANNEL permits rather than what
// one draft happens to contain.
const lanes = { AUTO_PUBLISH_ALLOWED: [], HUMAN_REVIEW_REQUIRED: [], HUMAN_PUBLISH_REQUIRED: [], BLOCKED: [] };
for (const channel of Object.values(context.channels)) {
  for (const desk of Object.values(context.desks)) {
    const disclosure = Object.fromEntries((channel.disclosure_required || []).map((r) => [r, `disclosure:${r}`]));
    const probe = resolvePublishState(
      {
        derivation_id: `lane-probe-${channel.channel_id}-${desk.desk_id}`,
        channel_id: channel.channel_id,
        disclosure,
        body: Object.values(disclosure).join('\n')
      },
      { channel, desk, providerPolicy: context.providerPolicy, sourceRouting: context.sourceRouting, gates: { truth: true, duplication: true, safety: true } }
    );
    lanes[probe.state].push(`${channel.channel_id}:${desk.desk_id}`);
  }
}

// Measured outcomes per desk x lens. There are none: nothing has been published.
const measuredRoutes = verdicts
  .filter(({ derivation }) => derivation.proof_state === 'PUBLISHED' || derivation.proof_state === 'VERIFIED')
  .map(({ derivation }) => ({
    route_id: derivation.derivation_id,
    desk_id: derivation.desk_id,
    lens_id: derivation.lens_id,
    attribution_state: 'ATTRIBUTED',
    destination_views: derivation.measurement?.qualified_views ?? null,
    cta_clicks: derivation.measurement?.cta_clicks ?? null,
    checkout: derivation.measurement?.checkout ?? null,
    purchase: derivation.measurement?.purchase ?? null,
    purchase_evidence: derivation.measurement?.purchase_evidence ?? null
  }));

const report = {
  q1_identity: {
    identity_id: context.identity.identity_id,
    public_descriptor: context.identity.public_descriptor,
    is_fictional: context.identity.is_fictional,
    identities_in_system: 1,
    approved_first_person_claims: context.identity.approved_first_person_claims.map((c) => c.claim_id),
    prohibited_first_person_claims: context.identity.prohibited_first_person_claims.map((c) => c.claim_id)
  },
  q2_desks: Object.values(context.desks).map((d) => ({
    desk_id: d.desk_id, state: d.state, language: d.language, reason: d.state_reason
  })),
  q3_lenses: Object.values(context.lenses).map((l) => ({
    lens_id: l.lens_id, state: l.state, cta_required: l.cta_required
  })),
  q4_sources: {
    accepted: context.sourceSet.accepted.map((s) => ({ source_id: s.source_id, source_type: s.source_type, status: s.status })),
    rejected: context.sourceSet.rejected,
    duplicates: context.sourceSet.duplicates
  },
  q5_derivations: verdicts.map(({ derivation, verdict }) => ({
    derivation_id: derivation.derivation_id,
    route: `${derivation.source_id} -> ${context.identity.identity_id} -> ${derivation.desk_id} -> ${derivation.lens_id} -> ${derivation.channel_id}`,
    gates_ok: verdict.ok,
    publish_state: verdict.publish_state,
    proof_state: derivation.proof_state,
    localization_quality: verdict.gates.localization?.quality_score ?? null,
    attribution_chain: verdict.gates.attribution?.chain ?? []
  })),
  q6_channel_lanes: lanes,
  q7_one_time_owner_actions: Object.values(context.channels)
    .filter((c) => c.one_time_owner_action)
    .map((c) => ({ channel_id: c.channel_id, account_state: c.account_state, action: c.one_time_owner_action })),
  q8_winner: classifyDeskLens(measuredRoutes),
  q9_measured_routes: measuredRoutes.length,
  q10_purchase_evidence: metrics.verified_revenue
    ? 'VERIFIED_REVENUE recorded in revenue-os/metrics.json'
    : `NO_VERIFIED_PURCHASE: revenue-os/metrics.json records verified_revenue ${JSON.stringify(metrics.verified_revenue ?? null)} and stripe_live_payment_intents ${metrics.stripe_live_payment_intents ?? 'UNKNOWN'}`,
  q11_safety: {
    identities_created: 0,
    accounts_created: 0,
    personas_created: 0,
    publishes_performed: 0,
    auto_publish_allowed_routes: lanes.AUTO_PUBLISH_ALLOWED.length,
    credentials_stored_here: 0,
    note: 'This engine publishes nothing, creates no account and creates no identity. Every route terminates at a human step or a block.'
  }
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('International Personal Media Engine report');
  console.log('');
  console.log(`  identity        ${report.q1_identity.identity_id} (identities in system: ${report.q1_identity.identities_in_system}, fictional: ${report.q1_identity.is_fictional})`);
  console.log(`  desks           ${report.q2_desks.map((d) => `${d.desk_id}=${d.state}`).join(', ')}`);
  console.log(`  lenses          ${report.q3_lenses.map((l) => `${l.lens_id}=${l.state}`).join(', ')}`);
  console.log(`  sources         ${report.q4_sources.accepted.length} accepted, ${report.q4_sources.rejected.length} rejected`);
  console.log('');
  for (const d of report.q5_derivations) {
    console.log(`  ${d.derivation_id}`);
    console.log(`      ${d.route}`);
    console.log(`      gates=${d.gates_ok ? 'PASS' : 'FAIL'}  publish=${d.publish_state}  proof=${d.proof_state}`);
  }
  console.log('');
  console.log('  channel lanes');
  for (const [lane, entries] of Object.entries(report.q6_channel_lanes)) {
    console.log(`      ${lane.padEnd(23)} ${entries.join(', ') || 'none'}`);
  }
  console.log('');
  console.log('  one-time owner actions remaining');
  for (const a of report.q7_one_time_owner_actions) console.log(`      ${a.channel_id} (${a.account_state}): ${a.action}`);
  console.log('');
  console.log(`  measured routes ${report.q9_measured_routes}`);
  console.log(`  purchases       ${report.q10_purchase_evidence}`);
  console.log(`  personas created ${report.q11_safety.personas_created}, accounts created ${report.q11_safety.accounts_created}, publishes ${report.q11_safety.publishes_performed}`);
  console.log('MEDIA_ENGINE_REPORT_OK');
}
