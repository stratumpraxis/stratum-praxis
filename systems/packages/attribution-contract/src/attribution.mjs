// Deterministic campaign attribution.
//
// Two properties matter, and everything here exists to preserve them:
//
//   1. Identical inputs always produce identical parameters, so one campaign never
//      appears in analytics under two spellings.
//   2. A link is only considered attributed when every required parameter is actually
//      present on it. "It has a utm_source" is not attribution.
//
// Nothing is invented at call time: utm_source and utm_medium come from the routing
// table, and an undeclared channel is refused rather than guessed.

import { knownChannels } from './routing.mjs';

export const UTM_KEYS = Object.freeze(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']);

/** Deterministic lowercase snake slug. The same input always produces the same token. */
export function slug(value, maxLength = 60) {
  return String(value == null ? '' : value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength)
    .replace(/_+$/g, '');
}

export function parseUrl(value) {
  try {
    return new URL(String(value));
  } catch {
    return null;
  }
}

export function hostOf(value) {
  const parsed = value instanceof URL ? value : parseUrl(value);
  return parsed ? parsed.hostname.toLowerCase().replace(/^www\./, '') : '';
}

/**
 * Build the attribution parameter set for one distribution unit.
 *
 * @param {object} options { channel, assetId, campaign, contentAngle, variant, routing }
 */
export function buildUtm({ channel, assetId, campaign, contentAngle, variant, routing }) {
  const declared = routing?.channels?.[channel];
  if (!declared) {
    const known = [...knownChannels(routing)].sort().join(', ') || 'none';
    throw new Error(`unknown channel "${channel}"; declare it in the routing table first (known: ${known})`);
  }
  if (!declared.utm_source || !declared.utm_medium) {
    throw new Error(`channel "${channel}" has no utm_source/utm_medium in the routing table`);
  }
  if (!assetId) throw new Error('assetId is required to build attribution');
  if (!campaign) throw new Error('campaign is required to build attribution');

  const contentParts = [slug(contentAngle || assetId, 40)];
  if (variant) contentParts.push(slug(variant, 16));

  return {
    utm_source: declared.utm_source,
    utm_medium: declared.utm_medium,
    utm_campaign: slug(campaign, 60),
    utm_content: contentParts.filter(Boolean).join('_').slice(0, 80),
    asset_id: assetId
  };
}

/**
 * Attach attribution to a destination URL.
 *
 * Existing parameters are preserved by default: a link a human already tagged by hand
 * is not silently rewritten. Pass `overwrite` when you genuinely mean to replace them.
 */
export function applyUtm(destinationUrl, params, { overwrite = false } = {}) {
  const url = parseUrl(destinationUrl);
  if (!url) throw new Error(`destination "${destinationUrl}" is not a valid URL`);
  if (url.protocol !== 'https:') throw new Error('attribution may only be attached to https destinations');
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (!overwrite && url.searchParams.has(key)) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function buildTrackedUrl(options) {
  const params = buildUtm(options);
  return { url: applyUtm(options.destinationUrl, params, { overwrite: options.overwrite }), params };
}

/**
 * Structural check on a finished link. This is what you run in CI over every CTA in
 * your site or queue: it answers "will this click be attributable when it lands?"
 */
export function verifyAttribution(rawUrl, { routing, requireAssetId = true } = {}) {
  const problems = [];
  const url = parseUrl(rawUrl);
  if (!url) return { ok: false, problems: ['destination is not a valid URL'] };
  if (url.protocol !== 'https:') problems.push('destination must use https');

  const host = hostOf(url);
  const owned = (routing?.owned_domains || []).some((d) => host === d || host.endsWith(`.${d}`));
  const checkout = (routing?.checkout_hosts || []).some((d) => host === d || host.endsWith(`.${d}`));
  if (!owned && !checkout) problems.push(`destination host ${host} is not an approved destination`);

  for (const key of UTM_KEYS) {
    if (!url.searchParams.get(key)) problems.push(`destination is missing ${key}`);
  }
  if (requireAssetId && !url.searchParams.get('asset_id')) problems.push('destination is missing asset_id');

  return {
    ok: problems.length === 0,
    problems,
    host,
    owned_destination: owned,
    checkout_destination: checkout,
    checkout_provider: checkout ? host : null
  };
}

/**
 * Stable identity for a distribution lane. Two items with the same key compete for the
 * same audience with the same destination.
 */
export function campaignKey({ channel, assetId, campaign }) {
  return [slug(channel, 24), slug(assetId, 60), slug(campaign, 60)].join('|');
}

/**
 * Funnel stages, in order. A later stage never implies an earlier one was measured:
 * that is the difference between a funnel and a guess.
 */
export const FUNNEL_STAGES = Object.freeze([
  'impression', 'landing', 'primary_cta_click', 'checkout_click', 'purchase', 'delivery'
]);

/**
 * NOT_MEASURED must never collapse into 0.
 * `null`/`undefined` mean "no measurement exists"; `0` means "measured, and it was zero".
 */
export function isMeasured(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function measuredOr(value, fallback = 'NOT_MEASURED') {
  return isMeasured(value) ? value : fallback;
}

/** A rate refuses to exist without a measured, non-zero denominator. */
export function rate(numerator, denominator) {
  if (!isMeasured(numerator) || !isMeasured(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
}

/**
 * Summarise one lane's funnel without inventing continuity.
 *
 * Every stage is reported as measured, or as NOT_MEASURED. A stage with a value while
 * an earlier stage has none is flagged: that is a broken measurement chain, and reading
 * a conversion rate off it would be fiction.
 */
export function summariseFunnel(counts) {
  const stages = {};
  const gaps = [];
  let previousMeasured = null;

  for (const stage of FUNNEL_STAGES) {
    const value = counts?.[stage];
    stages[stage] = measuredOr(value);
    if (isMeasured(value)) {
      if (previousMeasured === false) gaps.push(`${stage} is measured but an earlier stage is not`);
      previousMeasured = true;
    } else {
      previousMeasured = false;
    }
  }

  return {
    stages,
    gaps,
    complete_chain: gaps.length === 0 && FUNNEL_STAGES.every((s) => isMeasured(counts?.[s])),
    cta_rate: rate(counts?.primary_cta_click, counts?.landing),
    checkout_rate: rate(counts?.checkout_click, counts?.primary_cta_click),
    purchase_rate: rate(counts?.purchase, counts?.checkout_click)
  };
}

/**
 * Revenue may only be attributed to a lane when payment-provider evidence exists.
 * An analytics event is a signal that a button was clicked, not proof that money moved.
 */
export function verifyRevenueClaim(record) {
  const problems = [];
  if (!isMeasured(record?.purchase_count) || record.purchase_count <= 0) {
    problems.push('no measured purchase count');
  }
  if (!record?.payment_provider_evidence) {
    problems.push('revenue attribution requires payment-provider evidence, not an analytics event');
  }
  if (record?.verified_revenue != null && !isMeasured(record.verified_revenue)) {
    problems.push('verified_revenue must be a number when present');
  }
  return { ok: problems.length === 0, problems };
}
