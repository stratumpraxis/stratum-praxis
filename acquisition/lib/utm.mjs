// PHASE 5 - deterministic attribution.
//
// Source and medium are NOT invented here: they are read from
// distribution/source-routing.json so the existing analytics taxonomy is preserved.

import { parseUrl, readJson, slug } from './util.mjs';
import { APPROVED_DESTINATION_DOMAINS, CHECKOUT_HOSTS } from './taxonomy.mjs';

export const UTM_KEYS = Object.freeze(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']);

export async function loadSourceRouting(file = 'distribution/source-routing.json') {
  const routing = await readJson(file);
  if (!routing || typeof routing.sources !== 'object' || routing.sources === null) {
    throw new Error('distribution/source-routing.json is missing a sources map');
  }
  return routing;
}

export function knownChannels(sourceRouting) {
  return new Set(Object.keys(sourceRouting.sources || {}));
}

/**
 * Build the attribution parameter set for one distribution unit.
 * Deterministic: identical inputs always produce identical parameters, so the same
 * campaign is never double-counted under two spellings.
 */
export function buildUtm({ channel, assetId, campaign, contentAngle, variant, sourceRouting }) {
  const source = sourceRouting?.sources?.[channel];
  if (!source) {
    throw new Error(`unknown distribution channel "${channel}"; add it to distribution/source-routing.json first`);
  }
  if (!source.utm_source || !source.utm_medium) {
    throw new Error(`channel "${channel}" has no utm_source/utm_medium in distribution/source-routing.json`);
  }
  if (!assetId) throw new Error('assetId is required to build attribution');
  if (!campaign) throw new Error('campaign is required to build attribution');

  const contentParts = [slug(contentAngle || assetId, 40)];
  if (variant) contentParts.push(slug(variant, 16));

  return {
    utm_source: source.utm_source,
    utm_medium: source.utm_medium,
    utm_campaign: slug(campaign, 60),
    utm_content: contentParts.filter(Boolean).join('_').slice(0, 80),
    asset_id: assetId
  };
}

/**
 * Attach attribution to a destination URL.
 * Existing parameters are preserved by default - an already-tagged link that a human
 * built by hand is not silently rewritten.
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

/** Structural attribution check used by the queue and safety gates. */
export function verifyAttribution(rawUrl, { requireAssetId = true } = {}) {
  const problems = [];
  const url = parseUrl(rawUrl);
  if (!url) return { ok: false, problems: ['destination_url is not a valid URL'] };
  if (url.protocol !== 'https:') problems.push('destination_url must use https');

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const ownedHost = APPROVED_DESTINATION_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  const checkoutHost = CHECKOUT_HOSTS.includes(host);
  if (!ownedHost && !checkoutHost) problems.push(`destination host ${host} is not an approved destination`);

  for (const key of UTM_KEYS) {
    if (!url.searchParams.get(key)) problems.push(`destination_url is missing ${key}`);
  }
  if (requireAssetId && !url.searchParams.get('asset_id')) problems.push('destination_url is missing asset_id');

  return { ok: problems.length === 0, problems, host, ownedHost, checkoutHost };
}

/** Stable identity for a campaign lane. Two items with the same key are duplicates. */
export function campaignKey({ platform, assetId, campaign }) {
  return [slug(platform, 24), slug(assetId, 60), slug(campaign, 60)].join('|');
}
