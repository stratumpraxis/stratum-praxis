// PHASE 1 - asset inventory loading and validation.

import {
  ANALYTICS_EVENTS,
  ASSET_STATUSES,
  ASSET_TYPES,
  APPROVED_DESTINATION_DOMAINS,
  CHECKOUT_HOSTS,
  COMMERCIAL_INTENT,
  REVENUE_DESTINATION_TYPES,
  ROUTABLE_VERIFICATION_STATES,
  VERIFICATION_STATES
} from './taxonomy.mjs';
import { hostOf, isPlainObject, parseUrl, readJson } from './util.mjs';

const REQUIRED_FIELDS = [
  'asset_id',
  'brand',
  'asset_name',
  'asset_type',
  'language',
  'status',
  'public_url',
  'revenue_destination',
  'primary_user_problem',
  'target_audience',
  'distribution_candidates',
  'cta',
  'analytics_events',
  'verification_state'
];

/** Values that explicitly mean "we do not know" and must never be treated as a real URL. */
const UNKNOWN_TOKENS = new Set(['UNKNOWN', 'VERIFY', '']);

export function isUnknown(value) {
  return value == null || UNKNOWN_TOKENS.has(String(value).trim().toUpperCase());
}

function hostAllowed(host, allowed = APPROVED_DESTINATION_DOMAINS) {
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/**
 * Validate one asset record. Returns an array of human-readable errors.
 * A record with zero errors is safe to load; it is NOT automatically safe to route to.
 */
export function validateAsset(asset, { knownChannels = null } = {}) {
  const errors = [];
  const label = isPlainObject(asset) && asset.asset_id ? asset.asset_id : 'unnamed-asset';

  if (!isPlainObject(asset)) return [`${label}: asset must be an object`];

  for (const field of REQUIRED_FIELDS) {
    if (asset[field] === undefined) errors.push(`${label}: missing required field ${field}`);
  }

  if (typeof asset.asset_id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(asset.asset_id || '')) {
    errors.push(`${label}: asset_id must be a lowercase kebab-case string`);
  }
  if (!ASSET_TYPES.includes(asset.asset_type)) errors.push(`${label}: unknown asset_type ${asset.asset_type}`);
  if (!ASSET_STATUSES.includes(asset.status)) errors.push(`${label}: unknown status ${asset.status}`);
  if (!VERIFICATION_STATES.includes(asset.verification_state)) {
    errors.push(`${label}: unknown verification_state ${asset.verification_state}`);
  }
  if (asset.commercial_intent !== undefined && !COMMERCIAL_INTENT.includes(asset.commercial_intent)) {
    errors.push(`${label}: unknown commercial_intent ${asset.commercial_intent}`);
  }

  // public_url: either an explicit UNKNOWN token or a real https URL on an approved domain.
  if (!isUnknown(asset.public_url)) {
    const url = parseUrl(asset.public_url);
    if (!url) errors.push(`${label}: public_url is not a valid URL`);
    else {
      if (url.protocol !== 'https:') errors.push(`${label}: public_url must use https`);
      if (!hostAllowed(hostOf(url))) errors.push(`${label}: public_url host ${hostOf(url)} is not an approved domain`);
    }
  } else if (asset.status === 'LIVE') {
    errors.push(`${label}: status LIVE requires a known public_url`);
  }

  // revenue_destination
  const dest = asset.revenue_destination;
  if (!isPlainObject(dest)) {
    errors.push(`${label}: revenue_destination must be an object`);
  } else {
    if (!REVENUE_DESTINATION_TYPES.includes(dest.type)) {
      errors.push(`${label}: unknown revenue_destination.type ${dest.type}`);
    }
    if (!isUnknown(dest.url)) {
      const destUrl = parseUrl(dest.url);
      if (!destUrl) errors.push(`${label}: revenue_destination.url is not a valid URL`);
      else if (destUrl.protocol !== 'https:') errors.push(`${label}: revenue_destination.url must use https`);
      else {
        const host = hostOf(destUrl);
        const isCheckout = CHECKOUT_HOSTS.includes(host);
        if (!isCheckout && !hostAllowed(host)) {
          errors.push(`${label}: revenue_destination host ${host} is neither an approved domain nor a known checkout host`);
        }
        if (isCheckout && !['STRIPE', 'PAYHIP', 'GUMROAD'].includes(dest.type)) {
          errors.push(`${label}: checkout host ${host} declared as ${dest.type}`);
        }
      }
    } else if (['STRIPE', 'PAYHIP', 'GUMROAD'].includes(dest.type)) {
      errors.push(`${label}: revenue_destination.type ${dest.type} requires a known url`);
    }
  }

  if (!Array.isArray(asset.target_audience)) errors.push(`${label}: target_audience must be an array`);
  if (!Array.isArray(asset.distribution_candidates)) {
    errors.push(`${label}: distribution_candidates must be an array`);
  } else if (knownChannels) {
    for (const channel of asset.distribution_candidates) {
      if (!knownChannels.has(channel)) {
        errors.push(`${label}: distribution candidate ${channel} is not defined in distribution/source-routing.json`);
      }
    }
  }

  if (!Array.isArray(asset.analytics_events)) {
    errors.push(`${label}: analytics_events must be an array`);
  } else {
    for (const event of asset.analytics_events) {
      if (!ANALYTICS_EVENTS.includes(event)) {
        errors.push(`${label}: analytics event ${event} is not part of the deployed analytics taxonomy`);
      }
    }
  }

  if (!isPlainObject(asset.cta)) errors.push(`${label}: cta must be an object`);

  if (asset.problem_keys !== undefined && !Array.isArray(asset.problem_keys)) {
    errors.push(`${label}: problem_keys must be an array when present`);
  }

  return errors;
}

export function validateInventory(inventory, options = {}) {
  const errors = [];
  if (!isPlainObject(inventory) || !Array.isArray(inventory.assets)) {
    return ['inventory must be an object with an assets array'];
  }
  const seen = new Set();
  for (const asset of inventory.assets) {
    const id = isPlainObject(asset) ? asset.asset_id : undefined;
    if (id !== undefined) {
      if (seen.has(id)) errors.push(`${id}: duplicate asset_id`);
      seen.add(id);
    }
    errors.push(...validateAsset(asset, options));
  }
  return errors;
}

/**
 * A destination is routable only when the page is live, verified from a real source,
 * and reachable over https on an approved domain. PAUSED_CHECKOUT pages stay
 * routable as content but are excluded from commercial routing (see hasLiveCheckout).
 */
export function isRoutableDestination(asset) {
  if (!isPlainObject(asset)) return false;
  if (!['LIVE', 'PAUSED_CHECKOUT'].includes(asset.status)) return false;
  if (!ROUTABLE_VERIFICATION_STATES.includes(asset.verification_state)) return false;
  if (isUnknown(asset.public_url)) return false;
  const url = parseUrl(asset.public_url);
  return Boolean(url && url.protocol === 'https:' && hostAllowed(hostOf(url)));
}

/** True only when money can actually change hands at the end of this route. */
export function hasLiveCheckout(asset) {
  if (!isPlainObject(asset)) return false;
  if (asset.status !== 'LIVE') return false;
  const dest = asset.revenue_destination;
  if (!isPlainObject(dest)) return false;
  if (!['STRIPE', 'PAYHIP', 'GUMROAD'].includes(dest.type)) return false;
  return !isUnknown(dest.url);
}

export async function loadInventory(file = 'acquisition/asset-inventory.json', options = {}) {
  const inventory = await readJson(file);
  const errors = validateInventory(inventory, options);
  if (errors.length) {
    const error = new Error(`asset inventory is invalid (${errors.length} problem(s))`);
    error.errors = errors;
    throw error;
  }
  return {
    ...inventory,
    byId: new Map(inventory.assets.map((asset) => [asset.asset_id, asset]))
  };
}
