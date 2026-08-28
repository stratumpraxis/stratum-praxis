// Video-lane attribution contract.
//
// The problem this solves: trend-video-engine/publish-ledger.json records WHERE a post
// went (postId, externalLink) but not WHAT WAS SENT. The tracked destination lives in the
// manifest's publish.caption, which distribution/buffer-video-publisher.mjs sends verbatim
// as the post text (see its `const caption = String(publish.caption || ...)`).
//
// So the manifest caption IS the published payload, and reading a tracked URL out of it is
// evidence, not inference. Topic similarity is never evidence.
//
// Everything here is DERIVED and additive. The video ledger is never written.

import { hasLiveCheckout, isRoutableDestination } from './inventory.mjs';
import { APPROVED_DESTINATION_DOMAINS } from './taxonomy.mjs';
import { hostOf, isPlainObject, parseUrl } from './util.mjs';

export const ATTRIBUTION_STATES = Object.freeze([
  'ATTRIBUTED',      // the sent payload provably carried a tracked destination
  'UNATTRIBUTED',    // the sent payload provably carried no usable destination
  'NOT_APPLICABLE',  // the post is deliberately awareness-only; no destination was intended
  'UNVERIFIED'       // no manifest survives for this post; we cannot prove either way
]);

/** Publication states. Only a platform-confirmed send counts as published. */
export const PUBLICATION_STATES = Object.freeze(['PUBLISHED', 'IN_FLIGHT', 'ERROR', 'UNKNOWN']);

/** Extract every http(s) URL from a caption, in order. */
export function extractUrls(caption) {
  if (typeof caption !== 'string' || !caption) return [];
  return (caption.match(/https?:\/\/[^\s<>"')\]]+/g) || []).map((u) => u.replace(/[.,;:]+$/, ''));
}

function ownedHost(host) {
  return APPROVED_DESTINATION_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Find the first caption URL that is a usable owned destination.
 * Off-domain and non-https links are rejected with a stated reason, never silently used.
 */
export function findTrackedDestination(caption) {
  const rejected = [];
  for (const raw of extractUrls(caption)) {
    const url = parseUrl(raw);
    if (!url) {
      rejected.push({ url: raw, reason: 'malformed URL' });
      continue;
    }
    if (url.protocol !== 'https:') {
      rejected.push({ url: raw, reason: 'destination must use https' });
      continue;
    }
    const host = hostOf(url);
    if (!ownedHost(host)) {
      rejected.push({ url: raw, reason: `host ${host} is not an approved destination domain` });
      continue;
    }
    return { url, rejected };
  }
  return { url: null, rejected };
}

/** Match a destination URL to an inventory asset by exact origin+pathname. */
export function matchAsset(url, inventory) {
  if (!url) return null;
  const key = `${url.origin}${url.pathname}`;
  const assets = inventory?.assets || [];
  return assets.find((asset) => {
    const assetUrl = parseUrl(asset.public_url);
    return assetUrl && `${assetUrl.origin}${assetUrl.pathname}` === key;
  }) || null;
}

/** Read attribution parameters verbatim. Existing conventions are never normalised away. */
export function readUtm(url) {
  if (!url) return null;
  const out = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'asset_id']) {
    const value = url.searchParams.get(key);
    if (value !== null) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

/** Buffer status -> publication state. A queued or sending post is never PUBLISHED. */
export function publicationState(rawStatus) {
  const status = String(rawStatus || '').toLowerCase();
  if (status === 'sent') return 'PUBLISHED';
  if (['error', 'rejected', 'failed'].includes(status)) return 'ERROR';
  if (['attempted', 'accepted', 'buffer', 'scheduled', 'sending', 'unknown'].includes(status)) return 'IN_FLIGHT';
  return 'UNKNOWN';
}

/**
 * Classify one (manifest, ledger entry) pair into the attribution contract.
 *
 * @param {object|null} manifest  the trend-video manifest that produced the post, or null
 * @param {object} ledgerEntry    the per-service entry from publish-ledger.json
 * @param {object} context        { platform, manifestId, inventory, sourceRouting }
 */
export function classifyAttribution(manifest, ledgerEntry, context) {
  const { platform, manifestId, inventory } = context;
  const publication = publicationState(ledgerEntry?.status);
  const problems = [];

  const base = {
    ledger_id: `tve:${manifestId}:${platform}`,
    platform,
    manifest_id: manifestId,
    post_id: ledgerEntry?.postId ?? null,
    external_post_url: ledgerEntry?.externalLink ?? null,
    // Only a platform-confirmed send carries a publication time.
    published_at: publication === 'PUBLISHED' ? (ledgerEntry?.sentAt ?? null) : null,
    publication_state: publication,
    destination_url: null,
    destination_asset_id: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    attribution_state: 'UNVERIFIED',
    attribution_evidence: null,
    attribution_verified_at: null,
    problems
  };

  // No manifest survives -> we genuinely cannot prove what was sent.
  if (!isPlainObject(manifest)) {
    return {
      ...base,
      attribution_state: 'UNVERIFIED',
      attribution_evidence: 'no manifest found for this post in variants/, current.json or git history; the sent caption cannot be reconstructed'
    };
  }

  const publish = isPlainObject(manifest.publish) ? manifest.publish : {};
  const caption = String(publish.caption || manifest.summary || manifest.title || '');

  // Explicit awareness-only posts are a deliberate choice, not a measurement failure.
  if (publish.awareness_only === true) {
    return {
      ...base,
      attribution_state: 'NOT_APPLICABLE',
      attribution_evidence: 'manifest declares publish.awareness_only = true; no destination was intended',
      attribution_verified_at: new Date().toISOString()
    };
  }

  const { url, rejected } = findTrackedDestination(caption);
  for (const item of rejected) problems.push(`rejected caption link ${item.url}: ${item.reason}`);

  if (!url) {
    return {
      ...base,
      attribution_state: 'UNATTRIBUTED',
      attribution_evidence: rejected.length
        ? 'the sent caption contained only links that failed the destination rules'
        : 'the sent caption contained no destination URL',
      attribution_verified_at: new Date().toISOString()
    };
  }

  const asset = matchAsset(url, inventory);
  if (!asset) {
    problems.push(`destination ${url.origin}${url.pathname} does not match any asset in the acquisition inventory`);
    return {
      ...base,
      destination_url: url.toString(),
      attribution_state: 'UNATTRIBUTED',
      attribution_evidence: 'a tracked destination was sent but it maps to no known inventory asset, so downstream events cannot be associated',
      attribution_verified_at: new Date().toISOString()
    };
  }

  // A declared asset id that disagrees with the actual URL is a mismatch, never reconciled silently.
  if (publish.destination_asset_id && publish.destination_asset_id !== asset.asset_id) {
    problems.push(`manifest declares destination_asset_id ${publish.destination_asset_id} but the caption URL resolves to ${asset.asset_id}`);
    return {
      ...base,
      destination_url: url.toString(),
      destination_asset_id: null,
      attribution_state: 'UNATTRIBUTED',
      attribution_evidence: 'declared destination_asset_id disagrees with the destination actually sent in the caption',
      attribution_verified_at: new Date().toISOString()
    };
  }

  if (!isRoutableDestination(asset)) {
    problems.push(`destination asset ${asset.asset_id} is not a verified live destination (status ${asset.status}, verification ${asset.verification_state})`);
  }

  const utm = readUtm(url) || {};
  if (!utm.utm_source || !utm.utm_medium || !utm.utm_campaign) {
    problems.push('destination carries an incomplete attribution parameter set');
  }

  return {
    ...base,
    destination_url: url.toString(),
    destination_asset_id: asset.asset_id,
    destination_has_live_checkout: hasLiveCheckout(asset),
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    // ATTRIBUTED describes the payload, independent of whether the post is live yet.
    // publication_state stays the separate fact about whether it actually went out.
    attribution_state: 'ATTRIBUTED',
    attribution_evidence: `manifest publish.caption contains ${url.origin}${url.pathname}; buffer-video-publisher.mjs sends publish.caption verbatim as the post text`,
    attribution_verified_at: new Date().toISOString()
  };
}

/**
 * Only a post that is BOTH published and attributed can contribute distribution evidence
 * to the winner engine. Everything else is a measurement gap, not a result.
 */
export function contributesEvidence(record) {
  return record?.publication_state === 'PUBLISHED' && record?.attribution_state === 'ATTRIBUTED';
}

export function summarizeAttribution(records) {
  const published = records.filter((r) => r.publication_state === 'PUBLISHED');
  const counts = Object.fromEntries(ATTRIBUTION_STATES.map((s) => [s, 0]));
  for (const record of published) counts[record.attribution_state] += 1;

  return {
    total_records: records.length,
    published: published.length,
    in_flight: records.filter((r) => r.publication_state === 'IN_FLIGHT').length,
    published_by_attribution_state: counts,
    published_with_attribution: counts.ATTRIBUTED,
    published_without_attribution: counts.UNATTRIBUTED + counts.UNVERIFIED,
    evidence_capable_routes: records.filter(contributesEvidence).map((r) => r.ledger_id),
    note: 'published_with_attribution counts only posts whose sent caption provably carried a tracked owned destination. '
      + 'UNVERIFIED means no manifest survives to prove either way and is never counted as attributed.'
  };
}

/**
 * PHASE 4 - the forward manifest contract.
 *
 * A trend-video manifest may now carry these OPTIONAL fields under `publish`:
 *
 *   destination_url       the tracked URL, which must also appear in the caption
 *   destination_asset_id  the acquisition inventory asset it points at
 *   campaign_id           the campaign token used in utm_campaign
 *   awareness_only        true for a deliberate no-destination post
 *
 * All four are optional and additive. A manifest without them still renders and
 * publishes exactly as before; it simply classifies as UNATTRIBUTED or UNVERIFIED.
 */
export const MANIFEST_ATTRIBUTION_FIELDS = Object.freeze([
  'destination_url',
  'destination_asset_id',
  'campaign_id',
  'awareness_only'
]);

/**
 * Validate a manifest's declared attribution before it is published.
 * Returns an array of problems; empty means the manifest is internally consistent.
 */
export function validateManifestAttribution(manifest, { inventory } = {}) {
  const problems = [];
  if (!isPlainObject(manifest)) return ['manifest must be an object'];
  const publish = isPlainObject(manifest.publish) ? manifest.publish : {};
  const label = manifest.id || 'unnamed-manifest';

  const declared = MANIFEST_ATTRIBUTION_FIELDS.some((f) => publish[f] !== undefined);
  if (publish.awareness_only === true) {
    if (publish.destination_url || publish.destination_asset_id) {
      problems.push(`${label}: awareness_only cannot be combined with a declared destination`);
    }
    return problems;
  }
  if (!declared) return problems; // legacy manifest; nothing declared, nothing to check

  if (!publish.destination_url) {
    problems.push(`${label}: destination_asset_id/campaign_id declared without destination_url`);
    return problems;
  }

  const url = parseUrl(publish.destination_url);
  if (!url) {
    problems.push(`${label}: destination_url is not a valid URL`);
    return problems;
  }
  if (url.protocol !== 'https:') problems.push(`${label}: destination_url must use https`);
  if (!ownedHost(hostOf(url))) problems.push(`${label}: destination_url host ${hostOf(url)} is not an approved destination domain`);

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    if (!url.searchParams.get(key)) problems.push(`${label}: destination_url is missing ${key}`);
  }

  // The caption is the payload. A destination that is not in the caption is never sent.
  const caption = String(publish.caption || '');
  if (!caption.includes(publish.destination_url)) {
    problems.push(`${label}: destination_url does not appear in publish.caption, so it would never reach the platform`);
  }

  if (inventory) {
    const asset = matchAsset(url, inventory);
    if (!asset) {
      problems.push(`${label}: destination_url maps to no asset in the acquisition inventory`);
    } else {
      if (publish.destination_asset_id && publish.destination_asset_id !== asset.asset_id) {
        problems.push(`${label}: destination_asset_id ${publish.destination_asset_id} disagrees with the URL, which resolves to ${asset.asset_id}`);
      }
      if (!isRoutableDestination(asset)) {
        problems.push(`${label}: destination asset ${asset.asset_id} is not a verified live destination`);
      }
      const services = Array.isArray(publish.services) ? publish.services : [];
      for (const service of services) {
        if (Array.isArray(asset.distribution_candidates) && asset.distribution_candidates.length
          && !asset.distribution_candidates.includes(String(service).toLowerCase())) {
          problems.push(`${label}: ${service} is not an approved distribution candidate for ${asset.asset_id}`);
        }
      }
    }
  }

  return problems;
}
