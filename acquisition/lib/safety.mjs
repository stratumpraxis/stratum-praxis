// PHASE 11 - safety gate.
//
// This is NOT a parallel safety system. It composes the controls that already
// exist in this repository and adds only the checks that acquisition routing
// introduces (duplicate campaigns, posting cadence, unverified destinations):
//   - distribution/provider-policy.json  -> who is allowed to publish where
//   - distribution/safety-audit.mjs      -> risky-claim phrases, domain allowlist, UTM requirement
//   - claude-bridge/validate-candidate.mjs -> copy-length and blocked-claim patterns
//   - acquisition/lib/inventory.mjs      -> destination verification tiers

import { isRoutableDestination, isUnknown } from './inventory.mjs';
import { campaignKey, verifyAttribution } from './utm.mjs';
import { normalizeCopy, parseUrl } from './util.mjs';

/** Copy patterns that must never leave this system. Superset of the existing two lists. */
export const BLOCKED_CLAIM_PATTERNS = Object.freeze([
  /guaranteed\s+(income|profit|revenue|returns?)/i,
  /risk[- ]?free\s+(income|profit|returns?)/i,
  /get\s+rich(\s+quick)?/i,
  /instant\s+(income|profit|money)/i,
  /\bno\s+risk\b/i,
  /100%\s+guaranteed/i,
  /\$\d+[kKmM]?\s*(?:per|\/)\s*(?:day|week|month)/i,
  /passive\s+income\s+guaranteed/i
]);

export const COPY_MIN_LENGTH = 40;
export const COPY_MAX_LENGTH = 2200;

/** Cadence limits. Deliberately conservative: this system optimises revenue, not post count. */
export const DEFAULT_CADENCE = Object.freeze({
  maxActivePerPlatformPerDay: 2,
  minMinutesBetweenPostsPerPlatform: 180,
  maxAttemptsPerQueueItem: 2
});

function platformOf(item) {
  return String(item?.platform || '').toLowerCase();
}

/**
 * Which provider, if any, is allowed to publish this platform autonomously.
 * Anything without one is HUMAN_REQUIRED - never bypassed.
 */
export function publisherFor(platform, providerPolicy) {
  const entries = Object.entries(providerPolicy?.providers || {}).filter(([, cfg]) =>
    cfg?.status === 'active' &&
    cfg?.publishingEnabled === true &&
    Array.isArray(cfg.allowedServices) &&
    cfg.allowedServices.map((s) => String(s).toLowerCase()).includes(platform));
  if (entries.length === 0) return { publisher: null, count: 0 };
  return { publisher: entries[0][0], count: entries.length };
}

/**
 * Evaluate one queue item.
 * Returns { ok, blocks, warnings, human_required } - `ok` false means the item
 * may not advance past SAFETY_CHECK.
 */
export function evaluateItem(item, context = {}) {
  const {
    inventory,
    providerPolicy,
    sourceRouting,
    siblings = [],
    cadence = DEFAULT_CADENCE
  } = context;

  const blocks = [];
  const warnings = [];
  const humanRequired = [];
  const label = item?.queue_id || 'unnamed-item';
  const platform = platformOf(item);

  if (!item || typeof item !== 'object') return { ok: false, blocks: [`${label}: item must be an object`], warnings, human_required: humanRequired };

  // --- destination and asset verification -----------------------------------
  const asset = inventory?.byId?.get?.(item.asset_id) ??
    inventory?.assets?.find?.((a) => a.asset_id === item.asset_id);
  if (!asset) {
    blocks.push(`${label}: asset_id ${item.asset_id} is not in the verified inventory`);
  } else {
    if (!isRoutableDestination(asset)) {
      blocks.push(`${label}: asset ${asset.asset_id} is not a verified live destination (status ${asset.status}, verification ${asset.verification_state})`);
    }
    if (asset.status === 'PAUSED_CHECKOUT') {
      warnings.push(`${label}: asset ${asset.asset_id} has a paused checkout; this route cannot end in a purchase`);
    }
    const destination = parseUrl(item.destination_url);
    if (destination && !isUnknown(asset.public_url)) {
      const assetUrl = parseUrl(asset.public_url);
      if (assetUrl && destination.origin + destination.pathname !== assetUrl.origin + assetUrl.pathname) {
        blocks.push(`${label}: destination_url does not point at the declared asset ${asset.asset_id}`);
      }
    }
  }

  // --- attribution -----------------------------------------------------------
  const attribution = verifyAttribution(item.destination_url);
  for (const problem of attribution.problems) blocks.push(`${label}: ${problem}`);
  if (attribution.ok && item.utm_parameters) {
    const url = parseUrl(item.destination_url);
    for (const [key, value] of Object.entries(item.utm_parameters)) {
      if (url.searchParams.get(key) !== String(value)) {
        blocks.push(`${label}: utm_parameters.${key} disagrees with destination_url (${url.searchParams.get(key)} vs ${value})`);
      }
    }
  }

  // --- channel and publisher -------------------------------------------------
  if (!platform) {
    blocks.push(`${label}: platform is required`);
  } else {
    if (sourceRouting && !sourceRouting.sources?.[platform]) {
      blocks.push(`${label}: platform ${platform} is not defined in distribution/source-routing.json`);
    }
    if (asset && Array.isArray(asset.distribution_candidates) && asset.distribution_candidates.length &&
      !asset.distribution_candidates.includes(platform)) {
      blocks.push(`${label}: platform ${platform} is not an approved distribution candidate for ${asset.asset_id}`);
    }
    const { publisher, count } = publisherFor(platform, providerPolicy);
    if (count > 1) blocks.push(`${label}: ${count} active publishers claim ${platform}; single-publisher rule violated`);
    if (!publisher) {
      humanRequired.push({
        queue_id: item.queue_id,
        platform,
        reason: 'no active provider has publishingEnabled for this platform in distribution/provider-policy.json',
        manual_step: `publish this approved item to ${platform} by hand, then record external_post_id and set status PUBLISHED`
      });
    }
  }

  // --- copy safety -----------------------------------------------------------
  const copy = String(item.content_angle || '');
  if (copy.length && copy.length < COPY_MIN_LENGTH) {
    warnings.push(`${label}: content_angle is shorter than ${COPY_MIN_LENGTH} characters; likely not a publishable unit yet`);
  }
  if (copy.length > COPY_MAX_LENGTH) blocks.push(`${label}: content_angle exceeds ${COPY_MAX_LENGTH} characters`);
  for (const pattern of BLOCKED_CLAIM_PATTERNS) {
    if (pattern.test(copy) || pattern.test(String(item.cta || ''))) {
      blocks.push(`${label}: blocked claim pattern matched ${pattern}`);
    }
  }

  // --- duplication -----------------------------------------------------------
  const key = campaignKey({ platform, assetId: item.asset_id, campaign: item.utm_parameters?.utm_campaign || '' });
  const liveStates = new Set(['SAFETY_CHECK', 'READY', 'SCHEDULED', 'PUBLISHED', 'VERIFIED']);
  const normalized = normalizeCopy(copy);
  for (const other of siblings) {
    if (!other || other === item || other.queue_id === item.queue_id) continue;
    if (!liveStates.has(other.status)) continue;
    const otherKey = campaignKey({
      platform: platformOf(other),
      assetId: other.asset_id,
      campaign: other.utm_parameters?.utm_campaign || ''
    });
    if (otherKey === key) {
      blocks.push(`${label}: duplicate campaign lane; ${other.queue_id} already occupies ${key} in state ${other.status}`);
    }
    if (normalized && normalizeCopy(other.content_angle || '') === normalized) {
      blocks.push(`${label}: identical copy is already used by ${other.queue_id}; do not duplicate copy across platforms`);
    }
  }

  // --- cadence ---------------------------------------------------------------
  const sameDay = siblings.filter((other) =>
    other && other.queue_id !== item.queue_id &&
    platformOf(other) === platform &&
    liveStates.has(other.status) &&
    sameUtcDay(other.scheduled_at, item.scheduled_at));
  if (sameDay.length + 1 > cadence.maxActivePerPlatformPerDay) {
    blocks.push(`${label}: ${sameDay.length + 1} items on ${platform} for the same day exceeds the cadence limit of ${cadence.maxActivePerPlatformPerDay}`);
  }
  const tooClose = siblings.find((other) =>
    other && other.queue_id !== item.queue_id &&
    platformOf(other) === platform &&
    liveStates.has(other.status) &&
    minutesApart(other.scheduled_at, item.scheduled_at) !== null &&
    minutesApart(other.scheduled_at, item.scheduled_at) < cadence.minMinutesBetweenPostsPerPlatform);
  if (tooClose) {
    blocks.push(`${label}: scheduled within ${cadence.minMinutesBetweenPostsPerPlatform} minutes of ${tooClose.queue_id} on ${platform}`);
  }

  // --- retry protection ------------------------------------------------------
  const attempts = Number(item.attempts || 0);
  if (attempts > cadence.maxAttemptsPerQueueItem) {
    blocks.push(`${label}: ${attempts} attempts exceeds the retry ceiling of ${cadence.maxAttemptsPerQueueItem}; record the blocker instead of retrying`);
  }

  return {
    ok: blocks.length === 0,
    blocks,
    warnings,
    human_required: humanRequired,
    campaign_key: key
  };
}

function toTime(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function sameUtcDay(a, b) {
  const ta = toTime(a);
  const tb = toTime(b);
  if (ta === null || tb === null) return false;
  return new Date(ta).toISOString().slice(0, 10) === new Date(tb).toISOString().slice(0, 10);
}

export function minutesApart(a, b) {
  const ta = toTime(a);
  const tb = toTime(b);
  if (ta === null || tb === null) return null;
  return Math.abs(ta - tb) / 60000;
}

/** Evaluate a whole queue. Every item is checked against every other item. */
export function evaluateQueue(queue, context = {}) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  const results = items.map((item) => ({
    queue_id: item?.queue_id,
    ...evaluateItem(item, { ...context, siblings: items })
  }));
  return {
    ok: results.every((r) => r.ok),
    results,
    blocks: results.flatMap((r) => r.blocks),
    warnings: results.flatMap((r) => r.warnings),
    human_required: results.flatMap((r) => r.human_required)
  };
}

/**
 * Cross-lane collision guard.
 *
 * The repository already publishes through two other lanes:
 *   - distribution/launch-now.json + distribution/content-queue.json (Buffer image/text)
 *   - trend-video-engine/publish-ledger.json (Buffer video)
 *
 * revenue-os/backlog.md forbids queueing another payload for a campaign whose
 * previous run is still in flight. This check enforces that across lanes so the
 * acquisition queue cannot re-publish on top of work another lane already owns.
 *
 * @param {Array} items      acquisition queue items
 * @param {Array} inFlight   [{ lane, platform, destination_url, campaign, state }]
 */
export function checkExternalLaneCollisions(items, inFlight = []) {
  const collisions = [];
  const blocking = new Set(['IN_FLIGHT', 'SCHEDULED', 'PUBLISHED', 'sending', 'scheduled', 'accepted', 'attempted']);

  for (const item of items) {
    if (['STOPPED', 'VERIFIED'].includes(item.status)) continue;
    const platform = platformOf(item);
    const itemPath = pathOf(item.destination_url);
    const itemCampaign = String(item.utm_parameters?.utm_campaign || '');

    for (const other of inFlight) {
      if (String(other.platform || '').toLowerCase() !== platform) continue;
      if (!blocking.has(String(other.state))) continue;

      const samePath = itemPath && itemPath === pathOf(other.destination_url);
      const sameCampaign = itemCampaign && itemCampaign === String(other.campaign || '');
      if (!samePath && !sameCampaign) continue;

      collisions.push({
        queue_id: item.queue_id,
        lane: other.lane,
        platform,
        state: other.state,
        matched_on: samePath ? 'same destination path' : 'same utm_campaign',
        reason: `${other.lane} already has an item in state ${other.state} for ${platform} on ${samePath ? itemPath : itemCampaign}; do not queue another payload until that run is confirmed published or failed`
      });
    }
  }
  return collisions;
}

function pathOf(value) {
  const url = parseUrl(value);
  return url ? `${url.hostname.toLowerCase().replace(/^www\./, '')}${url.pathname}` : '';
}
