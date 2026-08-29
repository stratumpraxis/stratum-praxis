// Revenue Publisher v2 - the CTA gate.
//
// v1 wrote "Continue: <url>" under every article and rendered a button reading
// "Open the relevant tool". That is not a call to action, it is a link. It also let the
// model pick any route index, so an article about a free estimate could point at a
// paid checklist without anything noticing.
//
// This gate enforces four things:
//   1. the route must be one the source declares AND the asset inventory verifies
//   2. the label must complete the reader's decision, not just invite a click
//   3. any microcopy ("Free", "No signup") must be checkable against the live asset
//   4. attribution parameters survive onto the tracked URL
//
// It returns a verdict. It never rewrites the article and never publishes.

import fs from 'node:fs/promises';

import { repoPath } from '../../lib/util.mjs';
import { GENERIC_CTA_LABELS } from './editorial-quality.mjs';

export const MIN_LABEL_WORDS = 3;

/** Microcopy claims this gate knows how to check, and what proves each one. */
export const MICROCOPY_CLAIMS = Object.freeze({
  free: {
    id: 'free',
    pattern: /\bfree\b/i,
    verify: (asset, pageText) =>
      (asset?.revenue_destination?.price == null || asset?.revenue_destination?.type === 'INTERNAL_FUNNEL')
      && /\bfree\b/i.test(pageText),
    proof: 'asset carries no price of its own and the live page says so'
  },
  no_signup: {
    id: 'no_signup',
    pattern: /\bno\s*[- ]?\s*sign[- ]?up\b|\bno\s+registration\b|\bno\s+email\s+required\b/i,
    verify: (asset, pageText) => /\bno\s*signup\b|\bno\s+sign[- ]up\b|\bno\s+registration\b/i.test(pageText),
    proof: 'the live page states that no signup is required'
  },
  instant: {
    id: 'instant',
    pattern: /\binstant(?:ly)?\b|\bimmediate(?:ly)?\b/i,
    verify: () => false,
    proof: 'nothing in the inventory proves an instant-delivery claim'
  }
});

/** Read the asset's page from the repository so a microcopy claim can be checked. */
export async function loadAssetPageText(asset) {
  const file = asset?.verification?.repo_file;
  if (!file) return '';
  try {
    return await fs.readFile(repoPath(file), 'utf8');
  } catch {
    return '';
  }
}

export function isGenericLabel(label) {
  const normalized = String(label || '').trim().toLowerCase().replace(/[.!→>\s]+$/g, '');
  if (!normalized) return true;
  if (GENERIC_CTA_LABELS.includes(normalized)) return true;
  return GENERIC_CTA_LABELS.some((generic) => normalized === `${generic} here` || normalized === `${generic} now`);
}

/**
 * Does the label complete a decision, or does it merely invite a click?
 * A usable label names an action AND the thing the reader gets out of it.
 */
export function labelQuality(label, route) {
  const text = String(label || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const reasons = [];
  let score = 0;

  if (isGenericLabel(text)) {
    return { score: 0, reasons: ['label is a generic click invitation with no decision content'] };
  }
  if (words.length >= MIN_LABEL_WORDS) score += 3; else reasons.push(`label is only ${words.length} word(s)`);
  if (/^(?:run|estimate|check|size|calculate|compare|decide|work out|score|map|audit|review)\b/i.test(text)) score += 3;
  else reasons.push('label does not open with a decision verb');
  if (/\b(?:spend|cost|subscription|stack|renewal|waste|budget|reducible|estimate|savings?)\b/i.test(text)) score += 2;
  else reasons.push('label does not name what the reader is deciding about');
  if (route?.cta && text.trim() === String(route.cta).trim()) score += 2;
  else reasons.push('label does not match the CTA the inventory records for this asset');

  return { score: Math.max(0, Math.min(10, score)), reasons };
}

/**
 * Run the CTA gate.
 *
 * @param {object} recommendation { include, reason, route_index, label, microcopy }
 * @param {object} context { source, inventory, vertical, assetPageText }
 * @returns {{ ok, score, route, label, microcopy, failures, warnings, reason }}
 */
export function checkCta(recommendation, context = {}) {
  const { source = {}, inventory = null, vertical = null, assetPageText = '' } = context;
  const failures = [];
  const warnings = [];
  const routes = source.existing_product_routes || [];

  if (!recommendation?.include) {
    // An article that routes nowhere is allowed, but it cannot earn CTA points, and a
    // vertical that declares a required CTA route refuses it.
    if (vertical?.cta_required) {
      failures.push({ code: 'CTA_ROUTE_NOT_VERIFIED', detail: `vertical ${vertical.vertical_id} requires a CTA and none was produced` });
      return { ok: false, score: 0, route: null, label: null, microcopy: [], failures, warnings, reason: 'no CTA on a vertical that requires one' };
    }
    return { ok: true, score: 5, route: null, label: null, microcopy: [], failures, warnings, reason: 'no CTA requested and none required' };
  }

  const index = Number(recommendation.route_index);
  const route = Number.isInteger(index) ? routes[index] || null : null;
  if (!route) {
    failures.push({ code: 'CTA_ROUTE_NOT_VERIFIED', detail: `route_index ${recommendation.route_index} does not name a route declared by source ${source.source_id}` });
    return { ok: false, score: 0, route: null, label: null, microcopy: [], failures, warnings, reason: 'CTA points at an undeclared route' };
  }

  const asset = inventory?.byId?.get?.(route.asset_id)
    ?? (inventory?.assets || []).find((a) => a.asset_id === route.asset_id)
    ?? null;

  if (!asset) {
    failures.push({ code: 'CTA_ROUTE_NOT_VERIFIED', detail: `${route.asset_id} is not in acquisition/asset-inventory.json` });
  } else {
    if (asset.status !== 'LIVE') {
      failures.push({ code: 'CTA_ROUTE_NOT_VERIFIED', detail: `${route.asset_id} status is ${asset.status}, not LIVE` });
    }
    if (asset.verification_state !== 'HTTP_VERIFIED') {
      failures.push({ code: 'CTA_ROUTE_NOT_VERIFIED', detail: `${route.asset_id} verification_state is ${asset.verification_state}; an unverified destination may not be advertised` });
    }
    if (route.url && asset.public_url && route.url !== asset.public_url) {
      failures.push({ code: 'CTA_ROUTE_NOT_VERIFIED', detail: `route url ${route.url} does not match the verified public_url ${asset.public_url}` });
    }
  }

  // The vertical pins which asset the reader should land on. Routing somewhere else is
  // exactly the v1 defect - an article that ended on a free estimate linked the paid
  // checklist - so it is surfaced rather than accepted silently.
  if (vertical?.primary_asset_id && route.asset_id !== vertical.primary_asset_id) {
    warnings.push({ code: 'CTA_NOT_VERTICAL_PRIMARY', detail: `vertical ${vertical.vertical_id} routes to ${vertical.primary_asset_id}; this CTA points at ${route.asset_id} (${route.role})` });
  }

  // An empty label falls back to the CTA the inventory records for the destination,
  // which is the same rule the owned-site renderer applies. A generic label does not:
  // "Continue" is a decision the desk failed to make, not a missing one.
  const label = String(recommendation.label || route.cta || '').trim();
  if (isGenericLabel(label)) {
    failures.push({ code: 'CTA_GENERIC', detail: `"${label || '(empty)'}" is a generic click invitation; the CTA must complete the reader's decision` });
  }
  const quality = labelQuality(label, route);

  // Microcopy is only allowed when the live asset proves it.
  const microcopy = [];
  const declared = String(recommendation.microcopy || '');
  const pageText = assetPageText || '';
  for (const claim of Object.values(MICROCOPY_CLAIMS)) {
    if (!claim.pattern.test(declared)) continue;
    const verified = Boolean(asset) && claim.verify(asset, pageText);
    microcopy.push({ claim: claim.id, verified, proof: verified ? claim.proof : null });
    if (!verified) {
      warnings.push({ code: 'CTA_MICROCOPY_UNVERIFIED', detail: `microcopy claim "${claim.id}" could not be verified against ${route.asset_id}; it is dropped rather than published` });
    }
  }

  const verifiedMicrocopy = microcopy.filter((m) => m.verified);
  const ok = failures.length === 0;
  const score = ok ? Math.min(10, quality.score + (verifiedMicrocopy.length ? 1 : 0)) : 0;

  return {
    ok,
    score,
    route,
    asset_id: route.asset_id,
    label,
    microcopy: verifiedMicrocopy.map((m) => m.claim),
    microcopy_text: verifiedMicrocopy.length ? microcopyText(verifiedMicrocopy) : null,
    failures,
    warnings,
    reason: ok
      ? `routes to verified ${route.asset_id}; label quality ${quality.score}/10${quality.reasons.length ? ` (${quality.reasons.join('; ')})` : ''}`
      : failures.map((f) => f.detail).join('; ')
  };
}

function microcopyText(verified) {
  const labels = { free: 'Free', no_signup: 'No signup', instant: 'Instant' };
  return verified.map((m) => labels[m.claim] || m.claim).join(' · ');
}

/** Attribution-preserving tracked URL. Every dimension the ledger reads stays on it. */
export function trackedUrl(route, { source, lensId, verticalId, campaign = 'autonomous_revenue_publisher', channel = 'owned_signal' }) {
  if (!route?.url) return null;
  const url = new URL(route.url);
  url.searchParams.set('utm_source', 'owned_media');
  url.searchParams.set('utm_medium', 'blog');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', `${source.source_id}:${lensId}`.slice(0, 140));
  if (verticalId) url.searchParams.set('utm_term', String(verticalId).slice(0, 60));
  url.searchParams.set('sp_channel', channel);
  return url.toString();
}
