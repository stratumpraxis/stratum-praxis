import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const ACTION_LEVELS = ['none', 'engagement', 'support_intent', 'checkout'];

function levelIndex(level) {
  const i = ACTION_LEVELS.indexOf(level);
  if (i < 0) throw new Error(`unknown action level: ${level}`);
  return i;
}

function safeCount(value, label) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a non-negative number`);
  return n;
}

export function classifyActionEvidence(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot must be an object');
  if (!snapshot.asset_id) throw new Error('asset_id is required');
  const requiredLevel = snapshot.required_level || 'support_intent';
  const requiredIndex = levelIndex(requiredLevel);
  const route = snapshot.route || 'unknown';
  if (!['present', 'missing', 'unknown'].includes(route)) throw new Error(`invalid route state: ${route}`);
  const instrumentation = snapshot.instrumentation || 'unknown';
  const events = Array.isArray(snapshot.events) ? snapshot.events : [];
  const evidence = [];

  if (route === 'missing') {
    return {
      asset_id: snapshot.asset_id,
      status: 'fail',
      action_passed: false,
      required_level: requiredLevel,
      best_observed_level: 'none',
      route_gap: true,
      measurement_gap: false,
      evidence: ['Required downstream action route is missing from the inspected user journey.'],
      next_action: `Add one clear ${requiredLevel} route without gating the free utility, then verify the route before measuring conversion.`
    };
  }

  let bestLevel = 'none';
  let bestHumanLevel = 'none';
  let automatedAtOrAboveRequired = 0;

  for (const event of events) {
    const level = event.level || 'engagement';
    const idx = levelIndex(level);
    const total = safeCount(event.total, `${event.name || 'event'}.total`);
    const human = safeCount(event.human, `${event.name || 'event'}.human`);
    if (human > total) throw new Error(`${event.name || 'event'}.human cannot exceed total`);
    if (idx > levelIndex(bestLevel) && total > 0) bestLevel = level;
    if (idx > levelIndex(bestHumanLevel) && human > 0) bestHumanLevel = level;
    if (idx >= requiredIndex) automatedAtOrAboveRequired += Math.max(0, total - human);
    evidence.push(`${level} — ${event.name}: total=${total}, human=${human}`);
  }

  if (levelIndex(bestHumanLevel) >= requiredIndex) {
    return {
      asset_id: snapshot.asset_id,
      status: 'pass',
      action_passed: true,
      required_level: requiredLevel,
      best_observed_level: bestHumanLevel,
      route_gap: false,
      measurement_gap: false,
      evidence,
      next_action: null
    };
  }

  if (route === 'unknown') {
    return {
      asset_id: snapshot.asset_id,
      status: 'unknown',
      action_passed: false,
      required_level: requiredLevel,
      best_observed_level: bestHumanLevel,
      route_gap: false,
      measurement_gap: false,
      evidence: [...evidence, 'The required downstream route is not yet verified.'],
      next_action: `Verify whether a ${requiredLevel} route exists before interpreting action counts.`
    };
  }

  if (['missing', 'not_in_provider', 'unavailable'].includes(instrumentation)) {
    return {
      asset_id: snapshot.asset_id,
      status: 'unknown',
      action_passed: false,
      required_level: requiredLevel,
      best_observed_level: bestHumanLevel,
      route_gap: false,
      measurement_gap: true,
      evidence: [...evidence, `Action instrumentation is ${instrumentation}.`],
      next_action: `Connect one privacy-safe ${requiredLevel} signal to an authoritative analytics/provider source before interpreting zero actions.`
    };
  }

  if (automatedAtOrAboveRequired > 0) {
    return {
      asset_id: snapshot.asset_id,
      status: 'unknown',
      action_passed: false,
      required_level: requiredLevel,
      best_observed_level: bestHumanLevel,
      route_gap: false,
      measurement_gap: false,
      automated_only: true,
      evidence: [...evidence, 'Only automated/internal evidence exists at or above the required action level.'],
      next_action: `Keep Action unproven until a genuine human reaches ${requiredLevel}; do not promote automated probes.`
    };
  }

  const lowerHuman = levelIndex(bestHumanLevel) > 0;
  return {
    asset_id: snapshot.asset_id,
    status: 'unknown',
    action_passed: false,
    required_level: requiredLevel,
    best_observed_level: bestHumanLevel,
    route_gap: false,
    measurement_gap: instrumentation !== 'present',
    evidence: lowerHuman
      ? [...evidence, `Human activity exists only below the required ${requiredLevel} level.`]
      : [...evidence, `No proven human ${requiredLevel} action exists in the observation window.`],
    next_action: lowerHuman
      ? `Preserve the working lower-level engagement, but optimize and measure the transition to ${requiredLevel}.`
      : `Keep Action unproven until a genuine human reaches ${requiredLevel}.`
  };
}

function readInput(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : [parsed];
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('Usage: node completion-os/adapters/action-evidence.mjs <snapshot.json>');
    const results = readInput(file).map(classifyActionEvidence);
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } catch (error) {
    console.error(`Action evidence adapter error: ${error.message}`);
    process.exit(1);
  }
}
