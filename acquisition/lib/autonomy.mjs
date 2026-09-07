// Decide whether a READY acquisition item may advance without owner approval.
// This is deliberately narrower than the general safety gate: absence of a block
// is not enough. We require positive evidence for brand, account, publisher and
// a fresh external channel audit.

import { publisherFor } from './safety.mjs';

function daysOld(value, now = Date.now()) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return Infinity;
  return Math.max(0, (now - time) / 86400000);
}

function findObservedChannel(publisherEvidence, channelId) {
  for (const org of publisherEvidence?.organizations || []) {
    for (const channel of org?.channels || []) {
      if (channel?.id === channelId) return channel;
    }
  }
  return null;
}

export function evaluateSystemApproval(item, context = {}, verdict = {}) {
  const {
    inventory,
    providerPolicy,
    brandAccountPolicy,
    publisherEvidence,
    now = Date.now()
  } = context;

  const reasons = [];
  if (verdict.ok !== true) reasons.push('safety verdict is not PASS');
  if ((verdict.blocks || []).length) reasons.push('safety blocks exist');
  if ((verdict.warnings || []).length) reasons.push('safety warnings require judgment');
  if ((verdict.human_required || []).length) reasons.push('safety layer requires a human step');

  const asset = inventory?.byId?.get?.(item?.asset_id) ??
    inventory?.assets?.find?.((candidate) => candidate.asset_id === item?.asset_id);
  if (!asset) reasons.push('asset missing from verified inventory');
  if (asset?.brand !== 'Stratum Praxis') reasons.push(`brand ${asset?.brand || 'UNKNOWN'} is not eligible for this autonomy policy`);

  const platform = String(item?.platform || '').toLowerCase();
  const { publisher, count } = publisherFor(platform, providerPolicy);
  if (count !== 1 || !publisher) reasons.push('exactly one active publishing provider is required');

  const brandPolicy = brandAccountPolicy?.brands?.[asset?.brand];
  if (!brandPolicy) reasons.push('brand/account policy is missing');
  if (brandPolicy?.publisher !== publisher) reasons.push('brand/account publisher does not match provider policy');

  const allowedChannel = brandPolicy?.channels?.[platform];
  if (!allowedChannel?.channel_id) reasons.push(`no verified ${platform} account is pinned for this brand`);

  const checkedAt = publisherEvidence?.checkedAt;
  const maxAge = Number(brandAccountPolicy?.max_evidence_age_days ?? 14);
  if (daysOld(checkedAt, now) > maxAge) reasons.push('publisher account evidence is stale');

  const observed = allowedChannel?.channel_id
    ? findObservedChannel(publisherEvidence, allowedChannel.channel_id)
    : null;
  if (!observed) reasons.push('pinned channel was not present in the latest publisher audit');
  if (observed?.isLocked) reasons.push('publisher channel is locked');
  if (observed?.isDisconnected) reasons.push('publisher channel is disconnected');
  if (observed?.isQueuePaused) reasons.push('publisher queue is paused');
  if (observed && String(observed.service).toLowerCase() !== platform) reasons.push('publisher channel service mismatch');
  if (observed && allowedChannel?.account_name &&
      ![observed.name, observed.displayName].map(String).includes(allowedChannel.account_name)) {
    reasons.push('publisher account identity mismatch');
  }

  const expectedAutomation = publisher ? `AUTOMATED_VIA_${publisher.toUpperCase()}` : null;
  if (expectedAutomation && item?.automation !== expectedAutomation) {
    reasons.push(`queue automation ${item?.automation || 'UNKNOWN'} does not match ${expectedAutomation}`);
  }

  const eligible = reasons.length === 0;
  return {
    eligible,
    publisher: eligible ? publisher : null,
    channel_id: eligible ? allowedChannel.channel_id : null,
    account_name: eligible ? allowedChannel.account_name : null,
    evidence: eligible
      ? `provider-policy + acquisition/brand-account-policy.json + Buffer audit ${checkedAt}`
      : null,
    reasons
  };
}
