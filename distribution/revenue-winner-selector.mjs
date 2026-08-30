import { readFile, writeFile } from 'node:fs/promises';

const QUEUE_FILE = new URL('./revenue-strike-queue.json', import.meta.url);
const PERFORMANCE_FILE = new URL('./revenue-performance.json', import.meta.url);
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

const services = ['linkedin', 'threads', 'bluesky'];
const day = Math.floor(Date.now() / 86400000);
const MIN_SCORE = 8;
const MIN_SIGNALS = 3;

function normalizeMetrics(raw = {}) {
  const pageviews = Number(raw.pageviews || 0);
  const primaryCtas = Number(raw.primary_cta_clicks || 0);
  const checkoutClicks = Number(raw.checkout_clicks || 0);
  const paid = Number(raw.paid_purchases || 0);
  const signals = pageviews + primaryCtas + checkoutClicks + paid;
  const score = pageviews + primaryCtas * 4 + checkoutClicks * 10 + paid * 50;
  return { pageviews, primaryCtas, checkoutClicks, paid, signals, score };
}

function chooseForService(service, offset) {
  const candidates = queue.filter(x => x?.active !== false && Array.isArray(x.services) && x.services.includes(service));
  if (!candidates.length) return null;

  const ranked = candidates.map(item => ({
    item,
    metrics: normalizeMetrics(performance?.variants?.[item.id])
  })).sort((a, b) => b.metrics.score - a.metrics.score || a.item.id.localeCompare(b.item.id));

  const best = ranked[0];
  const enoughEvidence = best.metrics.score >= MIN_SCORE && best.metrics.signals >= MIN_SIGNALS;

  // Exploration is the safe default. Once evidence exists, use a 5-day exploitation cycle:
  // winner, alternate 1, winner, alternate 2, winner. This gives the winner 60% share
  // while preserving exploration and avoids blindly locking onto an early weak signal.
  if (!enoughEvidence) {
    return { ...candidates[(day + offset) % candidates.length], selection_mode: 'explore' };
  }

  const alternates = ranked.slice(1).map(x => x.item);
  const cycle = day % 5;
  let selected = best.item;
  if (cycle === 1 && alternates[0]) selected = alternates[0];
  if (cycle === 3 && alternates[1]) selected = alternates[1];

  return {
    ...selected,
    selection_mode: selected.id === best.item.id ? 'exploit' : 'explore',
    winner_id: best.item.id,
    winner_score: best.metrics.score
  };
}

const selected = services
  .map((service, i) => chooseForService(service, i))
  .filter(Boolean);

await writeFile(OUT_FILE, `${JSON.stringify(selected, null, 2)}\n`);
console.log(JSON.stringify({
  status: 'READY',
  performance_status: performance?.status || 'explore',
  selected: selected.map(x => ({ id: x.id, service: x.services?.[0], mode: x.selection_mode, winner: x.winner_id || null }))
}, null, 2));
