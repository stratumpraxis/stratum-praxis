import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function safeCount(value, label) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a non-negative number`);
  return n;
}

export function classifyUsageEvidence(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('snapshot must be an object');
  if (!snapshot.asset_id) throw new Error('asset_id is required');

  const instrumentation = snapshot.instrumentation || 'unknown';
  const meaningful = Array.isArray(snapshot.meaningful_events) ? snapshot.meaningful_events : [];
  const exposure = Array.isArray(snapshot.exposure_events) ? snapshot.exposure_events : [];
  const evidence = [];

  for (const event of exposure) {
    const total = safeCount(event.total, `${event.name || 'exposure event'}.total`);
    evidence.push(`Exposure only — ${event.name}: ${total}`);
  }

  if (['missing', 'not_in_provider', 'unavailable'].includes(instrumentation)) {
    return {
      asset_id: snapshot.asset_id,
      status: 'unknown',
      usage_passed: false,
      measurement_gap: true,
      automated_only: false,
      evidence: [...evidence, `Meaningful usage instrumentation is ${instrumentation}.`],
      next_action: 'Add or connect one privacy-safe meaningful usage signal before interpreting zero activity as user behavior.'
    };
  }

  let humanMeaningful = 0;
  let totalMeaningful = 0;
  for (const event of meaningful) {
    const total = safeCount(event.total, `${event.name || 'meaningful event'}.total`);
    const human = safeCount(event.human, `${event.name || 'meaningful event'}.human`);
    if (human > total) throw new Error(`${event.name || 'meaningful event'}.human cannot exceed total`);
    totalMeaningful += total;
    humanMeaningful += human;
    evidence.push(`Meaningful — ${event.name}: total=${total}, human=${human}`);
  }

  if (humanMeaningful > 0) {
    return {
      asset_id: snapshot.asset_id,
      status: 'pass',
      usage_passed: true,
      measurement_gap: false,
      automated_only: false,
      human_meaningful_events: humanMeaningful,
      evidence,
      next_action: null
    };
  }

  if (totalMeaningful > 0) {
    return {
      asset_id: snapshot.asset_id,
      status: 'unknown',
      usage_passed: false,
      measurement_gap: false,
      automated_only: true,
      human_meaningful_events: 0,
      evidence: [...evidence, 'Only bot/internal/automated meaningful-event evidence is currently proven.'],
      next_action: 'Wait for or acquire genuine user interaction evidence; do not promote automated probes to Usage.'
    };
  }

  return {
    asset_id: snapshot.asset_id,
    status: 'unknown',
    usage_passed: false,
    measurement_gap: instrumentation !== 'present',
    automated_only: false,
    human_meaningful_events: 0,
    evidence: [...evidence, 'No proven human meaningful-usage event exists in the observation window.'],
    next_action: 'Keep Usage unproven until a real user completes a meaningful interaction; page loads alone do not qualify.'
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
    if (!file) throw new Error('Usage: node completion-os/adapters/analytics-usage-evidence.mjs <snapshot.json>');
    const results = readInput(file).map(classifyUsageEvidence);
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } catch (error) {
    console.error(`Usage evidence adapter error: ${error.message}`);
    process.exit(1);
  }
}
