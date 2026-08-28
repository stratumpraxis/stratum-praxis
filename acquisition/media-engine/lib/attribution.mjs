// Issue #52 - attribution.
//
// This is NOT a second measurement system. The UTM values come from
// distribution/source-routing.json through acquisition/lib/utm.mjs, exactly as the
// acquisition queue builds them. What this file adds is the media dimensions -
// identity, desk, lens, channel, account, CTA - encoded into utm_content so the whole
// chain survives into the existing ledger without new parameters or a new schema.
//
//   signal/source -> identity -> desk -> lens -> channel -> post -> CTA -> landing
//   -> checkout -> verified purchase
//
// Nothing here claims revenue. A purchase still requires payment-provider evidence in
// acquisition/lib/ledger.mjs, which refuses to record one without it.

import { buildUtm, applyUtm, verifyAttribution } from '../../lib/utm.mjs';
import { slug } from '../../lib/util.mjs';

export const PROVENANCE_FIELDS = Object.freeze([
  'source_id',
  'source_candidate_id',
  'identity_id',
  'desk_id',
  'lens_id',
  'channel_id',
  'account_alias',
  'campaign',
  'target_asset',
  'cta_id'
]);

/**
 * Media dimensions are packed into utm_content rather than into new query parameters,
 * because scos-analytics.js and the existing ledger already read utm_content and would
 * silently drop anything else.
 */
export function buildContentToken({ deskId, lensId, ctaId, variant }) {
  return [slug(deskId, 12), slug(lensId, 24), slug(ctaId, 20), variant ? slug(variant, 8) : null]
    .filter(Boolean)
    .join('_')
    .slice(0, 80);
}

export function parseContentToken(token) {
  const parts = String(token || '').split('_');
  return { raw: token, parts };
}

/**
 * Build the tracked destination for one derivation.
 * Throws when the channel is not in distribution/source-routing.json - an undefined
 * channel is refused rather than invented.
 */
export function buildMediaAttribution(derivation, { sourceRouting, channel, identity }) {
  const campaign = derivation.campaign || `${slug(derivation.source_id, 32)}_${slug(derivation.lens_id, 20)}`;
  const contentAngle = buildContentToken({
    deskId: derivation.desk_id,
    lensId: derivation.lens_id,
    ctaId: derivation.cta_id,
    variant: derivation.variant
  });

  const params = buildUtm({
    channel: channel.source_routing_key,
    assetId: derivation.target_asset,
    campaign,
    contentAngle,
    sourceRouting
  });

  const url = applyUtm(derivation.destination_url, params);

  return {
    utm_parameters: params,
    tracked_destination_url: url,
    campaign,
    provenance: {
      source_id: derivation.source_id,
      source_candidate_id: derivation.source_candidate_id ?? null,
      identity_id: identity.identity_id,
      desk_id: derivation.desk_id,
      lens_id: derivation.lens_id,
      channel_id: derivation.channel_id,
      account_alias: channel.account_alias ?? 'UNKNOWN',
      campaign,
      target_asset: derivation.target_asset,
      cta_id: derivation.cta_id
    }
  };
}

/**
 * Verify the whole chain survived. Reuses the structural check the acquisition safety
 * gate already runs, then adds the media provenance requirement.
 */
export function verifyMediaAttribution(derivation) {
  const structural = verifyAttribution(derivation.tracked_destination_url);
  const problems = [...structural.problems];

  const provenance = derivation.provenance || {};
  for (const field of PROVENANCE_FIELDS) {
    if (field === 'source_candidate_id') continue; // legitimately null for owner sources
    if (!provenance[field]) problems.push(`provenance is missing ${field}`);
  }

  // The chain must be internally consistent: the tracked URL has to agree with the
  // provenance record, or the two would attribute to different things.
  if (structural.ok) {
    const url = new URL(derivation.tracked_destination_url);
    if (url.searchParams.get('asset_id') !== provenance.target_asset) {
      problems.push(`tracked asset_id ${url.searchParams.get('asset_id')} disagrees with provenance.target_asset ${provenance.target_asset}`);
    }
    if (url.searchParams.get('utm_campaign') !== slug(provenance.campaign, 60)) {
      problems.push('tracked utm_campaign disagrees with provenance.campaign');
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    chain: problems.length === 0
      ? [
        provenance.source_candidate_id ? `candidate:${provenance.source_candidate_id}` : `source:${provenance.source_id}`,
        `identity:${provenance.identity_id}`,
        `desk:${provenance.desk_id}`,
        `lens:${provenance.lens_id}`,
        `channel:${provenance.channel_id}`,
        `campaign:${provenance.campaign}`,
        `cta:${provenance.cta_id}`,
        `asset:${provenance.target_asset}`
      ]
      : []
  };
}

/**
 * Revenue may never be attached without payment-provider evidence.
 * This mirrors the guard in acquisition/lib/ledger.mjs at the media layer so a
 * derivation record cannot carry a purchase claim the ledger would refuse.
 */
export function attachMeasurement(derivation, measurement) {
  if (measurement.purchase !== undefined && measurement.purchase !== null && measurement.purchase > 0
    && !measurement.purchase_evidence) {
    throw new Error(`refusing to attach ${measurement.purchase} purchase(s) to ${derivation.derivation_id} without purchase_evidence from a payment provider`);
  }
  if (measurement.revenue !== undefined && measurement.revenue !== null && !measurement.purchase_evidence) {
    throw new Error(`refusing to attach revenue to ${derivation.derivation_id} without purchase_evidence from a payment provider`);
  }
  return {
    ...derivation,
    measurement: {
      qualified_views: measurement.qualified_views ?? null,
      cta_clicks: measurement.cta_clicks ?? null,
      checkout: measurement.checkout ?? null,
      purchase: measurement.purchase ?? null,
      revenue: measurement.revenue ?? null,
      purchase_evidence: measurement.purchase_evidence ?? null,
      measurement_source: measurement.measurement_source ?? null,
      measured_at: measurement.measured_at ?? null
    }
  };
}
