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

import crypto from 'node:crypto';
import fs from 'node:fs/promises';

import { hasLiveCheckout, isRoutableDestination } from './inventory.mjs';
import { APPROVED_DESTINATION_DOMAINS } from './taxonomy.mjs';
import { hostOf, isPlainObject, parseUrl, repoPath } from './util.mjs';

/**
 * The caption proof is NOT a general property of manifests. It is a property of one
 * publishing path, and it must be re-established from that path's source on every run.
 *
 * A ledger only qualifies if the script that CREATES its records provably transmits
 * `publish.caption` as the post body. Both halves are required:
 *   - assignment:   the caption variable is read from publish.caption
 *   - transmission: that same variable is sent as the post text
 *
 * If a publisher is changed so either half no longer holds, classification degrades to
 * UNVERIFIED rather than silently continuing to claim attribution.
 */
export const LEDGER_PUBLISHER_PROOFS = Object.freeze({
  'trend-video-engine/publish-ledger.json': Object.freeze({
    publisher: 'distribution/buffer-video-publisher.mjs',
    payload_source: 'publish.caption',
    assignment: /const\s+caption\s*=\s*String\(\s*publish\.caption/,
    transmission: /createPost\(input:\{text:\$\{q\(caption\)\}/
  })
});

/**
 * Publishing paths the caption proof explicitly does NOT cover. Recorded so the
 * boundary is visible rather than merely absent.
 */
export const UNPROVEN_PUBLISHERS = Object.freeze({
  'distribution/buffer-publisher.mjs':
    'sends `${item.text}\\n\\n${item.url}` built from distribution/content-queue.json, not publish.caption from a manifest. '
    + 'It writes no ledger this module reads, and the caption proof does not transfer to it.',
  'distribution/buffer-video-status.mjs':
    'only updates ledger entries that already exist (it bails when ledger.items[manifest.id] is absent) and creates no records, '
    + 'so it introduces no post whose payload is unproven.'
});

/**
 * Re-establish the caption proof for a ledger by reading its publisher's source.
 * Returns { proven, publisher, reasons }. Never throws on a missing file.
 */
export async function establishCaptionProof(ledgerFile, { readFile = (f) => fs.readFile(repoPath(f), 'utf8') } = {}) {
  const spec = LEDGER_PUBLISHER_PROOFS[ledgerFile];
  if (!spec) {
    return {
      proven: false,
      publisher: null,
      reasons: [`no publishing path is registered as proving the payload of ${ledgerFile}; attribution cannot be claimed for it`]
    };
  }

  let source;
  try {
    source = await readFile(spec.publisher);
  } catch (error) {
    return { proven: false, publisher: spec.publisher, reasons: [`could not read ${spec.publisher}: ${error.message}`] };
  }

  const reasons = [];
  if (!spec.assignment.test(source)) {
    reasons.push(`${spec.publisher} no longer reads the post body from ${spec.payload_source}`);
  }
  if (!spec.transmission.test(source)) {
    reasons.push(`${spec.publisher} no longer transmits that caption as the post text`);
  }

  return {
    proven: reasons.length === 0,
    publisher: spec.publisher,
    payload_source: spec.payload_source,
    reasons: reasons.length ? reasons : [`${spec.publisher} reads the post body from ${spec.payload_source} and sends it verbatim as the post text`]
  };
}

/**
 * Evidence ladder, strongest first. The type recorded on a classification says WHICH
 * rung the proof came from, so an auditor can see why a record was believed.
 *
 *   PLATFORM_PAYLOAD      the immutable payload the platform itself returned (not yet available)
 *   PUBLISHER_PROVEN_FIELD a manifest field a publisher provably transmits unchanged
 *   MANIFEST_DECLARATION   the manifest states intent (awareness-only) rather than payload
 *   NONE                   no evidence rung was reached
 */
/**
 * Byte-level fingerprint of a historical publishing record. Captured before any derived
 * work and re-checked after, so immutability is asserted on content rather than trusted.
 */
export async function ledgerFingerprint(file = 'trend-video-engine/publish-ledger.json') {
  const bytes = await fs.readFile(repoPath(file));
  return { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

export const EVIDENCE_TYPES = Object.freeze([
  'PLATFORM_PAYLOAD',
  'PUBLISHER_PROVEN_FIELD',
  'MANIFEST_DECLARATION',
  'NONE'
]);

/** Whether the funnel has any measurement attached yet. Never conflated with zero. */
export const MEASUREMENT_STATES = Object.freeze(['MEASURED', 'NOT_MEASURED']);

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

/**
 * All inventory assets whose public_url resolves to the same origin+pathname.
 * Returned as a list so an ambiguous mapping can be rejected instead of silently
 * resolving to whichever asset happens to appear first.
 */
export function matchAssets(url, inventory) {
  if (!url) return [];
  const key = `${url.origin}${url.pathname}`;
  return (inventory?.assets || []).filter((asset) => {
    const assetUrl = parseUrl(asset.public_url);
    return assetUrl && `${assetUrl.origin}${assetUrl.pathname}` === key;
  });
}

/** Single unambiguous match, or null. Two or more candidates is not a match. */
export function matchAsset(url, inventory) {
  const matches = matchAssets(url, inventory);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Compare the attribution actually sent against the deterministic routing table.
 * A mismatch is recorded, never rewritten: the sent value is the historical truth.
 */
export function routingConflicts(utm, platform, sourceRouting) {
  const conflicts = [];
  const declared = sourceRouting?.sources?.[String(platform || '').toLowerCase()];
  if (!declared || !utm) return conflicts;
  if (utm.utm_source && declared.utm_source && utm.utm_source !== declared.utm_source) {
    conflicts.push(`utm_source "${utm.utm_source}" was sent but distribution/source-routing.json declares "${declared.utm_source}" for ${platform}`);
  }
  if (utm.utm_medium && declared.utm_medium && utm.utm_medium !== declared.utm_medium) {
    conflicts.push(`utm_medium "${utm.utm_medium}" was sent but distribution/source-routing.json declares "${declared.utm_medium}" for ${platform}`);
  }
  return conflicts;
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
 * @param {object} context        { platform, manifestId, inventory, sourceRouting, captionProof }
 *
 * `captionProof` must come from establishCaptionProof() for the ledger this entry belongs
 * to. Without a proven path the caption is just text we happen to have on disk, not
 * evidence of what was transmitted, so the result can never be ATTRIBUTED.
 */
export function classifyAttribution(manifest, ledgerEntry, context) {
  const { platform, manifestId, inventory, sourceRouting, captionProof, manifestRef = null } = context;
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
    campaign_id: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    attribution_state: 'UNVERIFIED',
    attribution_evidence: null,
    attribution_evidence_type: 'NONE',
    attribution_evidence_ref: null,
    attribution_verified_at: null,
    routing_conflicts: [],
    // Downstream measurement is a separate axis entirely. Attribution says a route can
    // be measured; this says whether anything has been.
    downstream_measurement_state: 'NOT_MEASURED',
    payload_proof: captionProof
      ? { proven: captionProof.proven, publisher: captionProof.publisher ?? null }
      : { proven: false, publisher: null },
    problems
  };

  // The publishing path must prove the caption was the payload. Without that, a caption
  // on disk says nothing about what the platform received.
  if (!captionProof || captionProof.proven !== true) {
    for (const reason of captionProof?.reasons || ['no caption proof was supplied for this ledger']) {
      problems.push(reason);
    }
    return {
      ...base,
      attribution_state: 'UNVERIFIED',
      attribution_evidence: 'the publishing path for this ledger does not prove that the manifest caption was the transmitted payload, '
        + 'so the caption cannot be used as attribution evidence'
    };
  }

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
      attribution_evidence_type: 'MANIFEST_DECLARATION',
      attribution_evidence_ref: manifestRef,
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
      attribution_evidence_type: 'PUBLISHER_PROVEN_FIELD',
      attribution_evidence_ref: manifestRef,
      attribution_verified_at: new Date().toISOString()
    };
  }

  const candidates = matchAssets(url, inventory);
  if (candidates.length > 1) {
    problems.push(`destination ${url.origin}${url.pathname} matches ${candidates.length} inventory assets (${candidates.map((a) => a.asset_id).join(', ')}); an ambiguous mapping is never resolved by picking one`);
    return {
      ...base,
      destination_url: url.toString(),
      attribution_state: 'UNVERIFIED',
      attribution_evidence: 'the sent destination maps to more than one inventory asset, so which asset received the traffic cannot be proven',
      attribution_evidence_type: 'PUBLISHER_PROVEN_FIELD',
      attribution_evidence_ref: manifestRef,
      attribution_verified_at: new Date().toISOString()
    };
  }
  const asset = candidates[0] || null;
  if (!asset) {
    problems.push(`destination ${url.origin}${url.pathname} does not match any asset in the acquisition inventory`);
    return {
      ...base,
      destination_url: url.toString(),
      attribution_state: 'UNATTRIBUTED',
      attribution_evidence: 'a tracked destination was sent but it maps to no known inventory asset, so downstream events cannot be associated',
      attribution_evidence_type: 'PUBLISHER_PROVEN_FIELD',
      attribution_evidence_ref: manifestRef,
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
      attribution_evidence_type: 'PUBLISHER_PROVEN_FIELD',
      attribution_evidence_ref: manifestRef,
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

  const conflicts = routingConflicts(utm, platform, sourceRouting);
  for (const conflict of conflicts) problems.push(conflict);

  return {
    ...base,
    destination_url: url.toString(),
    destination_asset_id: asset.asset_id,
    destination_has_live_checkout: hasLiveCheckout(asset),
    // campaign_id is the manifest's declared token when present, otherwise the campaign
    // actually transmitted. Never invented.
    campaign_id: publish.campaign_id ?? utm.utm_campaign ?? null,
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    routing_conflicts: conflicts,
    attribution_evidence_type: 'PUBLISHER_PROVEN_FIELD',
    attribution_evidence_ref: manifestRef,
    // ATTRIBUTED describes the payload, independent of whether the post is live yet.
    // publication_state stays the separate fact about whether it actually went out.
    attribution_state: 'ATTRIBUTED',
    attribution_evidence: `manifest ${captionProof.payload_source || 'publish.caption'} contains ${url.origin}${url.pathname}; `
      + `${captionProof.publisher} sends that caption verbatim as the post text (proof re-established from its source at classification time)`,
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
