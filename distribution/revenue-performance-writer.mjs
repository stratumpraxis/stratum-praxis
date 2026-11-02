import { readFile, writeFile } from 'node:fs/promises';

// Revenue Performance Writer (v1, sensor/Stripe edition)
//
// Purpose: close the Revenue Strike learning loop by aggregating measured
// evidence into distribution/revenue-performance.json, which
// distribution/revenue-winner-selector.mjs reads.
//
// v1 data sources (PostHog intentionally NOT used in v1):
// - paid_purchases: Stripe Checkout Sessions with payment_status=paid in the
//   trailing window, attributed to a queue variant through the session
//   metadata "offer" value mapped from the variant destination product.
//   Cross-checked against the first-party Supabase status endpoint
//   (verified_payment_events_total) and the cross-check result is recorded.
// - pageviews / primary_cta_clicks / checkout_clicks: NOT measurable from a
//   repo-side read surface in v1. They are written as 0 AND listed in the
//   variant's "unknown" array so measured zeros are never confused with
//   unmeasured values. The selector treats them as 0, which keeps the system
//   in explore mode until real measured signals exist. No winner is ever
//   fabricated from unknown data.
//
// Modes (env REVENUE_PERF_MODE):
// - "dry" (default): compute and print the JSON to stdout, write nothing.
// - "live": write distribution/revenue-performance.json.
//
// This script never touches prices, checkout, webhooks, payout settings,
// schedules, or any file other than distribution/revenue-performance.json
// (and only in live mode).

const QUEUE_FILE = new URL('./revenue-strike-queue.json', import.meta.url);
const PERFORMANCE_FILE = new URL('./revenue-performance.json', import.meta.url);
const STATUS_URL = 'https://fzqgpaxqolrjjhmxdcrf.supabase.co/functions/v1/stratum-24h-status';
const WINDOW_DAYS = 30;
const MODE = (process.env.REVENUE_PERF_MODE || 'dry').toLowerCase();

// Destination product path -> Stripe Checkout Session metadata.offer values
// observed in the live account. Attribution is only counted when the mapping
// is unambiguous (a single active variant per product among measured items is
// NOT required for paid counting per product, but per-variant paid is only
// assigned when exactly one active queue item points at that product).
const PRODUCT_OFFERS = {
  'cross-agent-operating-kit.html': ['cross_agent_operating_kit'],
  'ai-saas-spend-waste-audit.html': ['ai_saas_spend_waste_audit', 'workflow-opportunity-audit', 'ai-saas-spend-audit'],
  'workflow-audit.html': ['workflow_audit', 'workflow-opportunity-audit'],
  'ai-saas-spend-decision-kit.html': ['ai_saas_spend_decision_kit'],
  'ai-value-realization-kit.html': ['ai_saas_spend_decision_kit'],
  'agent-control-auditor.html': ['agent_control_auditor'],
};

async function readJson(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch { return fallback; }
}

function productOf(destination) {
  try {
    const u = new URL(destination);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch { return ''; }
}

async function fetchStripePaidByOffer() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { ok: false, reason: 'STRIPE_SECRET_KEY not available', byOffer: {} };
  const since = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86400;
  const byOffer = {};
  let startingAfter = null;
  try {
    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({ limit: '100' });
      if (startingAfter) params.set('starting_after', startingAfter);
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions?${params}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return { ok: false, reason: `Stripe API HTTP ${res.status}`, byOffer: {} };
      const body = await res.json();
      for (const s of body.data || []) {
        if (s.created < since) continue;
        if (s.payment_status !== 'paid') continue;
        const offer = (s.metadata && s.metadata.offer) || 'unknown';
        byOffer[offer] = (byOffer[offer] || 0) + 1;
      }
      if (!body.has_more || !(body.data || []).length) break;
      startingAfter = body.data[body.data.length - 1].id;
    }
    return { ok: true, reason: 'Stripe Checkout Sessions read directly', byOffer };
  } catch (err) {
    return { ok: false, reason: `Stripe read failed: ${err.message}`, byOffer: {} };
  }
}

async function fetchStatusCrossCheck() {
  try {
    const res = await fetch(STATUS_URL);
    if (!res.ok) return { ok: false, reason: `status HTTP ${res.status}` };
    const body = await res.json();
    return {
      ok: true,
      observed_at: body.observed_at || null,
      verified_payment_events_total: body?.revenue?.verified_payment_events_total ?? null,
    };
  } catch (err) {
    return { ok: false, reason: `status fetch failed: ${err.message}` };
  }
}

const queue = await readJson(QUEUE_FILE, []);
if (!Array.isArray(queue)) throw new Error('Revenue strike queue must be an array');
const previous = await readJson(PERFORMANCE_FILE, {});

const stripe = await fetchStripePaidByOffer();
const crossCheck = await fetchStatusCrossCheck();

// Count active queue items per product to decide unambiguous attribution.
const activeByProduct = {};
for (const item of queue) {
  if (item?.active === false) continue;
  const product = productOf(item.url || item.destination || '');
  if (!product) continue;
  activeByProduct[product] = (activeByProduct[product] || 0) + 1;
}

const variants = {};
let anyLearning = false;
for (const item of queue) {
  if (item?.active === false) continue;
  const product = productOf(item.url || item.destination || '');
  const offers = PRODUCT_OFFERS[product] || [];
  const unknown = ['pageviews', 'primary_cta_clicks', 'checkout_clicks'];
  let paid = 0;
  if (stripe.ok && offers.length && activeByProduct[product] === 1) {
    paid = offers.reduce((sum, offer) => sum + (stripe.byOffer[offer] || 0), 0);
  } else {
    unknown.push('paid_purchases');
  }
  const measured = ['paid_purchases'].filter((k) => !unknown.includes(k));
  // Selector thresholds: score >= 8 and signals >= 3 using measured values
  // only (unknown counts as 0 here, exactly as the selector computes).
  const score = paid * 50;
  const signals = paid;
  if (score >= 8 && signals >= 3) anyLearning = true;
  variants[item.id] = {
    pageviews: 0,
    primary_cta_clicks: 0,
    checkout_clicks: 0,
    paid_purchases: paid,
    measured,
    unknown,
  };
}

const stripePaidTotal = Object.values(stripe.byOffer).reduce((a, b) => a + b, 0);
const output = {
  status: anyLearning ? 'learning' : 'explore',
  updated_at: new Date().toISOString(),
  reason: anyLearning
    ? 'Measured paid signals reached the selector thresholds for at least one variant.'
    : 'No variant has enough measured evidence yet (unknowns are not counted); staying in explore. No winner is fabricated.',
  window_days: WINDOW_DAYS,
  weights: previous.weights || { pageview: 1, primary_cta_click: 4, checkout_click: 10, paid_purchase: 50 },
  variants,
  sources: {
    paid_purchases: stripe.ok
      ? `Stripe Checkout Sessions (payment_status=paid, trailing ${WINDOW_DAYS}d), attributed by metadata.offer; paid total in window: ${stripePaidTotal}`
      : `UNKNOWN: ${stripe.reason}`,
    pageviews: 'UNKNOWN in v1 (no repo-side read surface; PostHog excluded by decision)',
    primary_cta_clicks: 'UNKNOWN in v1 (no repo-side read surface; PostHog excluded by decision)',
    checkout_clicks: 'UNKNOWN in v1 (first-party sensor stores events; no aggregate read surface exposed to the repo yet)',
    cross_check_status_api: crossCheck.ok
      ? `stratum-24h-status observed_at=${crossCheck.observed_at} verified_payment_events_total=${crossCheck.verified_payment_events_total}`
      : `cross-check unavailable: ${crossCheck.reason}`,
    writer: 'distribution/revenue-performance-writer.mjs v1',
    mode: MODE,
  },
};

const json = `${JSON.stringify(output, null, 2)}\n`;
if (MODE === 'live') {
  await writeFile(PERFORMANCE_FILE, json);
  console.log(JSON.stringify({ status: 'WRITTEN', mode: MODE, variants: Object.keys(variants).length, performance_status: output.status }));
} else {
  console.log(JSON.stringify({ status: 'DRY_RUN', mode: MODE, note: 'No file written. Computed revenue-performance.json follows.' }));
  console.log(json);
}
