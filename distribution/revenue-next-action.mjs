import { readFile, writeFile } from 'node:fs/promises';

const PERFORMANCE_FILE = new URL(process.env.REVENUE_PERFORMANCE_FILE || './revenue-performance.runtime.json', import.meta.url);
const OUT_FILE = new URL(process.env.REVENUE_NEXT_ACTION_OUT || './revenue-next-action.json', import.meta.url);

async function readJson(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch { return fallback; }
}

const performance = await readJson(PERFORMANCE_FILE, null);
if (!performance) throw new Error('Runtime revenue performance file is missing; fail closed.');

const overall = performance.overall || {};
let decision = 'BLOCKED_EVIDENCE';
let reason = 'Live evidence is incomplete. Do not optimize or publish from guessed zeros.';
let priority = 0;

if (performance.status === 'live') {
  const traffic = Number(overall.regular_traffic_sessions || 0);
  const ctas = Number(overall.regular_primary_cta_clicks || 0);
  const checkouts = Number(overall.trusted_checkout_starts || 0);
  const purchases = Number(overall.verified_paid_purchases || 0);

  if (purchases > 0) {
    decision = 'SCALE_PROVEN_ROUTE';
    reason = 'Verified paid purchases exist. Allocate more traffic only to attributable proven routes while preserving exploration.';
    priority = 100;
  } else if (checkouts > 0) {
    decision = 'FIX_OFFER_TRUST_PRICE_FRICTION';
    reason = 'Real Stripe Checkout Sessions exist but verified paid purchases do not. Improve offer clarity, trust, price framing or payment friction before adding traffic.';
    priority = 90;
  } else if (ctas > 0) {
    decision = 'FIX_CHECKOUT_ROUTE';
    reason = 'Trusted external CTA clicks exist but no real Stripe Checkout Session was created. Repair navigation, attribution or checkout handoff before acquisition.';
    priority = 80;
  } else if (traffic > 0) {
    decision = 'ITERATE_CONVERSION';
    reason = 'Trusted external traffic exists but no trusted CTA click exists. Improve page-message fit, CTA prominence and route relevance before increasing traffic.';
    priority = 70;
  } else {
    decision = 'ACQUIRE_TRUSTED_TRAFFIC';
    reason = 'No trusted external traffic is observed. Use existing assets and connected distribution routes to acquire measurable traffic.';
    priority = 60;
  }
}

const output = {
  generated_at: new Date().toISOString(),
  performance_status: performance.status,
  decision,
  priority,
  reason,
  blockers: performance.blockers || [],
  observed: overall,
  autonomous_rule: 'Execute only reversible, measurable actions within existing assets. External publication, production merges, billing changes and destructive changes remain gated.'
};

await writeFile(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
