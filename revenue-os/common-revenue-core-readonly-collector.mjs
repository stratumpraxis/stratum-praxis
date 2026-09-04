import { writeFile } from 'node:fs/promises';
import {
  ingestPostHogEvent,
  ingestStripeCheckoutSession,
  ingestStripePaymentIntent
} from './common-revenue-core-ingestion-v0.mjs';

const windowDays = Math.max(1, Math.min(90, Number.parseInt(process.env.CRC_WINDOW_DAYS || '30', 10) || 30));
const outputFile = process.env.CRC_INGESTION_OUT || 'revenue-os/common-revenue-core-ingestion.runtime.json';
const posthogHost = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/$/, '');
const posthogProjectId = process.env.POSTHOG_PROJECT_ID || '';
const posthogApiKey = process.env.POSTHOG_PERSONAL_API_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const maxPosthogRows = 5000;
const maxStripePages = 5;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; }
    catch { body = { raw: text.slice(0, 1000) }; }
    if (!response.ok) throw new Error(`HTTP_${response.status}:${JSON.stringify(body).slice(0, 600)}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function pushResult(bucket, result) {
  if (!result) return;
  if (result.status === 'ACCEPTED') {
    if (Array.isArray(result.events)) bucket.accepted.push(...result.events);
    else if (result.event) bucket.accepted.push(result.event);
    return;
  }
  if (result.status === 'IGNORED') {
    bucket.ignored.push({
      reason: result.reason || 'IGNORED',
      source_event_name: result.source_event_name || null,
      source_event_id: result.source_event_id || null
    });
    return;
  }
  bucket.invalid.push({
    reason: result.reason || 'INVALID',
    errors: result.errors || []
  });
}

async function collectPostHog() {
  if (!posthogApiKey || !posthogProjectId) {
    return {
      status: 'BLOCKED',
      error_code: 'PROVIDER_UNAVAILABLE',
      reason: 'missing_posthog_credentials',
      accepted: [], ignored: [], invalid: [], truncated: false
    };
  }

  const query = `
SELECT
  uuid,
  event,
  timestamp,
  properties.$virt_traffic_type,
  properties.asset_id,
  properties.destination_asset_id,
  properties.product_id,
  properties.product,
  properties.channel,
  properties.channel_id,
  properties.route_id,
  properties.experiment_id,
  properties.action_id,
  properties.cta_id,
  properties.utm_source,
  properties.utm_medium,
  properties.utm_campaign,
  properties.utm_content,
  properties.$current_url
FROM events
WHERE timestamp >= now() - INTERVAL ${windowDays} DAY
  AND event IN ('traffic_session_start','funnel_view','primary_cta_click','commerce_entry_click','checkout_click')
ORDER BY timestamp DESC
LIMIT ${maxPosthogRows}
`;

  try {
    const body = await fetchJson(`${posthogHost}/api/projects/${encodeURIComponent(posthogProjectId)}/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${posthogApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } })
    });
    const rows = Array.isArray(body?.results) ? body.results : [];
    const bucket = { accepted: [], ignored: [], invalid: [] };

    for (const row of rows) {
      const raw = {
        uuid: row?.[0] == null ? '' : String(row[0]),
        event: row?.[1] == null ? '' : String(row[1]),
        timestamp: row?.[2] == null ? '' : String(row[2]),
        properties: {
          $virt_traffic_type: row?.[3] ?? null,
          asset_id: row?.[4] ?? null,
          destination_asset_id: row?.[5] ?? null,
          product_id: row?.[6] ?? null,
          product: row?.[7] ?? null,
          channel: row?.[8] ?? null,
          channel_id: row?.[9] ?? null,
          route_id: row?.[10] ?? null,
          experiment_id: row?.[11] ?? null,
          action_id: row?.[12] ?? null,
          cta_id: row?.[13] ?? null,
          utm_source: row?.[14] ?? null,
          utm_medium: row?.[15] ?? null,
          utm_campaign: row?.[16] ?? null,
          utm_content: row?.[17] ?? null,
          $current_url: row?.[18] ?? null
        }
      };
      pushResult(bucket, ingestPostHogEvent(raw, { project_id: posthogProjectId }));
    }

    return {
      status: 'LIVE',
      ...bucket,
      source_rows: rows.length,
      truncated: rows.length >= maxPosthogRows
    };
  } catch (error) {
    return {
      status: 'BLOCKED',
      error_code: 'PROVIDER_UNAVAILABLE',
      reason: `posthog_query_failed:${error.message}`,
      accepted: [], ignored: [], invalid: [], truncated: false
    };
  }
}

async function listStripe(path) {
  const createdGte = Math.floor(Date.now() / 1000) - windowDays * 86400;
  const records = [];
  let startingAfter = '';

  for (let page = 0; page < maxStripePages; page += 1) {
    const params = new URLSearchParams({ limit: '100' });
    params.append('created[gte]', String(createdGte));
    if (startingAfter) params.set('starting_after', startingAfter);
    const body = await fetchJson(`https://api.stripe.com/v1/${path}?${params}`, {
      headers: { Authorization: `Bearer ${stripeSecretKey}` }
    });
    const batch = Array.isArray(body?.data) ? body.data : [];
    records.push(...batch);
    if (!body?.has_more || batch.length === 0) break;
    startingAfter = batch.at(-1)?.id || '';
    if (!startingAfter) break;
  }

  return { records, truncated: records.length >= maxStripePages * 100 };
}

async function collectStripe() {
  if (!stripeSecretKey) {
    return {
      status: 'BLOCKED',
      error_code: 'PROVIDER_UNAVAILABLE',
      reason: 'missing_stripe_secret_key',
      accepted: [], ignored: [], invalid: [], truncated: false
    };
  }

  try {
    const [sessionPage, intentPage] = await Promise.all([
      listStripe('checkout/sessions'),
      listStripe('payment_intents')
    ]);
    const bucket = { accepted: [], ignored: [], invalid: [] };

    for (const session of sessionPage.records) {
      pushResult(bucket, ingestStripeCheckoutSession(session));
    }
    for (const intent of intentPage.records) {
      pushResult(bucket, ingestStripePaymentIntent(intent));
    }

    return {
      status: 'LIVE',
      ...bucket,
      source_rows: sessionPage.records.length + intentPage.records.length,
      checkout_sessions: sessionPage.records.length,
      payment_intents: intentPage.records.length,
      truncated: sessionPage.truncated || intentPage.truncated
    };
  } catch (error) {
    return {
      status: 'BLOCKED',
      error_code: 'PROVIDER_UNAVAILABLE',
      reason: `stripe_query_failed:${error.message}`,
      accepted: [], ignored: [], invalid: [], truncated: false
    };
  }
}

const [posthog, stripe] = await Promise.all([collectPostHog(), collectStripe()]);
const sources = { posthog, stripe };
const accepted = [...posthog.accepted, ...stripe.accepted];
const ignored = [...posthog.ignored, ...stripe.ignored];
const invalid = [...posthog.invalid, ...stripe.invalid];
const liveSources = Object.values(sources).filter((source) => source.status === 'LIVE').length;
const status = liveSources === Object.keys(sources).length ? 'LIVE' : liveSources > 0 ? 'PARTIAL' : 'BLOCKED';

const output = {
  contract: 'common-revenue-core-contract-v0',
  phase: 'PHASE_2_READ_ONLY_INGESTION',
  generated_at: new Date().toISOString(),
  window_days: windowDays,
  status,
  persistence: 'NONE',
  source_status: Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, {
    status: source.status,
    error_code: source.error_code || null,
    reason: source.reason || null,
    source_rows: source.source_rows ?? null,
    truncated: source.truncated || false
  }])),
  counts: {
    accepted: accepted.length,
    ignored: ignored.length,
    invalid: invalid.length
  },
  events: accepted,
  ignored,
  invalid
};

await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status, counts: output.counts, source_status: output.source_status, output: outputFile }, null, 2));

if (status === 'BLOCKED') process.exitCode = 2;
if (invalid.length > 0) process.exitCode = Math.max(process.exitCode || 0, 3);
