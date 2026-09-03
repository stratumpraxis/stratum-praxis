import { readFile, writeFile } from 'node:fs/promises';

const QUEUE_FILE = new URL('./revenue-strike-queue.json', import.meta.url);
const PERFORMANCE_FILE = new URL('./revenue-performance.json', import.meta.url);
const POLICY_FILE = new URL('./revenue-evidence-policy.json', import.meta.url);
const OUT_FILE = new URL('./revenue-strike-selected.json', import.meta.url);

async function readJson(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch { return fallback; }
}

const queue = await readJson(QUEUE_FILE, []);
if (!Array.isArray(queue)) throw new Error('Revenue strike queue must be an array');

const performance = await readJson(PERFORMANCE_FILE, {
  status: 'explore',
  updated_at: null,
  variants: {}
});

const policy = await readJson(POLICY_FILE, null);
if (!policy?.scoring || !policy?.gates || !policy?.market_evidence) {
  throw new Error('Revenue evidence policy is missing or invalid; fail closed.');
}

const day = Math.floor(Date.now() / 86400000);
const weights = policy.scoring;
const gates = policy.gates;

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function normalizeMetrics(raw = {}, item = {}) {
  // Market-learning metrics are intentionally namespaced as regular_* / verified_*.
  // Legacy pageviews / checkout_clicks / paid_purchases may contain QA or automation
  // and therefore never contribute to winner selection.
  const trustedFields = [
    'regular_pageviews',
    'regular_primary_cta_clicks',
    'regular_checkout_starts',
    'verified_paid_purchases'
  ];
  const trustedEvidence = trustedFields.some(key => hasOwn(raw, key));

  const pageviews = finiteNumber(raw.regular_pageviews);
  const primaryCtas = finiteNumber(raw.regular_primary_cta_clicks);
  const checkoutStarts = finiteNumber(raw.regular_checkout_starts);
  const paid = finiteNumber(raw.verified_paid_purchases);
  const contributionProfitUsd = finiteNumber(raw.contribution_profit_usd);
  const reliability = clamp(finiteNumber(raw.reliability, 1), 0, 1);
  const assetReuse = clamp(finiteNumber(raw.asset_reuse, item.existing_asset === false ? 0 : 1), 0, 1);
  const humanEffortMinutes = Math.max(0, finiteNumber(raw.human_effort_minutes, item.human_effort_minutes || 0));

  const unverifiedPurchaseClaim = gates.reject_unverified_purchase_claims === true
    && finiteNumber(raw.paid_purchases) > paid;

  const signals = pageviews + primaryCtas + checkoutStarts + paid;
  const evidenceScore =
    pageviews * finiteNumber(weights.regular_pageview, 1)
    + primaryCtas * finiteNumber(weights.regular_primary_cta_click, 4)
    + checkoutStarts * finiteNumber(weights.regular_checkout_start, 12)
    + paid * finiteNumber(weights.verified_paid_purchase, 80);

  const economicsScore = contributionProfitUsd * finiteNumber(weights.contribution_profit_usd, 0);
  const qualityScore = signals > 0
    ? reliability * finiteNumber(weights.reliability, 0) + assetReuse * finiteNumber(weights.asset_reuse, 0)
    : 0;
  const effortPenalty = humanEffortMinutes * finiteNumber(weights.human_effort_minute_penalty, 0);
  const score = evidenceScore + economicsScore + qualityScore - effortPenalty;

  return {
    pageviews,
    primaryCtas,
    checkoutStarts,
    paid,
    contributionProfitUsd,
    reliability,
    assetReuse,
    humanEffortMinutes,
    signals,
    score,
    trustedEvidence,
    unverifiedPurchaseClaim
  };
}

function isHumanEffortEligible(item, raw = {}) {
  const minutes = Math.max(0, finiteNumber(raw.human_effort_minutes, item.human_effort_minutes || 0));
  return minutes <= finiteNumber(gates.max_human_effort_minutes_per_cycle, 15);
}

function chooseForService(service, offset) {
  const allCandidates = queue.filter(x => x?.active !== false && Array.isArray(x.services) && x.services.includes(service));
  const candidates = allCandidates.filter(item => isHumanEffortEligible(item, performance?.variants?.[item.id]));
  if (!candidates.length) return null;

  const ranked = candidates.map(item => ({
    item,
    metrics: normalizeMetrics(performance?.variants?.[item.id], item)
  })).sort((a, b) => b.metrics.score - a.metrics.score || a.item.id.localeCompare(b.item.id));

  const best = ranked[0];
  const enoughEvidence =
    best.metrics.trustedEvidence
    && !best.metrics.unverifiedPurchaseClaim
    && best.metrics.score >= finiteNumber(gates.minimum_score, 8)
    && best.metrics.signals >= finiteNumber(gates.minimum_trusted_signals, 3);

  // Exploration is the safe default. Only Regular-human and verified-purchase
  // evidence is allowed to move a route into exploitation.
  if (!enoughEvidence) {
    return {
      ...candidates[(day + offset) % candidates.length],
      selection_mode: 'explore',
      evidence_mode: 'trusted-market-evidence-required'
    };
  }

  // Preserve exploration after evidence exists: winner, alternate 1, winner,
  // alternate 2, winner. This gives the current winner 60% share without
  // locking the system permanently onto an early signal.
  const alternates = ranked.slice(1).map(x => x.item);
  const cycle = day % 5;
  let selected = best.item;
  if (cycle === 1 && alternates[0]) selected = alternates[0];
  if (cycle === 3 && alternates[1]) selected = alternates[1];

  return {
    ...selected,
    selection_mode: selected.id === best.item.id ? 'exploit' : 'explore',
    evidence_mode: 'regular-human-plus-verified-purchase',
    winner_id: best.item.id,
    winner_score: Number(best.metrics.score.toFixed(2)),
    winner_trusted_signals: best.metrics.signals,
    winner_verified_purchases: best.metrics.paid
  };
}

// Revenue lanes are derived from the queue rather than hard-coded. This prevents
// the selector itself from silently pinning Stratum to a stale social-channel set.
const services = [...new Set(
  queue
    .filter(x => x?.active !== false && Array.isArray(x.services))
    .flatMap(x => x.services.map(service => String(service).toLowerCase()))
)].sort();

const selected = services
  .map((service, i) => chooseForService(service, i))
  .filter(Boolean);

await writeFile(OUT_FILE, `${JSON.stringify(selected, null, 2)}\n`);
console.log(JSON.stringify({
  status: 'READY',
  performance_status: performance?.status || 'explore',
  policy_version: policy.version,
  trusted_market_traffic_types: policy.market_evidence.accepted_traffic_types,
  legacy_metrics: policy.market_evidence.legacy_metrics,
  services,
  selected: selected.map(x => ({
    id: x.id,
    services: x.services,
    mode: x.selection_mode,
    evidence_mode: x.evidence_mode,
    winner: x.winner_id || null,
    winner_score: x.winner_score ?? null,
    verified_purchases: x.winner_verified_purchases ?? 0
  }))
}, null, 2));
