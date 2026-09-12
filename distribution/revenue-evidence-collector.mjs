import { readFile, writeFile } from 'node:fs/promises';

const QUEUE_FILE = new URL('./revenue-strike-queue.json', import.meta.url);
const POLICY_FILE = new URL('./revenue-evidence-policy.json', import.meta.url);
const OUT_FILE = new URL(process.env.REVENUE_PERFORMANCE_OUT || './revenue-performance.runtime.json', import.meta.url);

const windowDays = Math.max(1, Math.min(90, Number.parseInt(process.env.REVENUE_WINDOW_DAYS || '30', 10) || 30));
const posthogHost = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/$/, '');
const posthogProjectId = process.env.POSTHOG_PROJECT_ID || '';
const posthogApiKey = process.env.POSTHOG_PERSONAL_API_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

async function readJson(url, fallback) {
  try { return JSON.parse(await readFile(url, 'utf8')); }
  catch { return fallback; }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; }
    catch { body = { raw: text.slice(0, 1000) }; }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(body).slice(0, 800)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function parseUtmContent(item) {
  try { return new URL(item.url).searchParams.get('utm_content') || ''; }
  catch { return ''; }
}

function normalizeString(value) {
  return String(value ?? '').trim();
}

function isExcludedClientReference(value, prefixes) {
  const ref = normalizeString(value).toLowerCase();
  return prefixes.some(prefix => ref.startsWith(String(prefix).toLowerCase()));
}

function containsToken(session, token) {
  if (!token) return false;
  const haystack = JSON.stringify({
    client_reference_id: session.client_reference_id,
    metadata: session.metadata,
    success_url: session.success_url,
    cancel_url: session.cancel_url
  }).toLowerCase();
  return haystack.includes(String(token).toLowerCase());
}

async function collectPostHog(policy) {
  if (!posthogApiKey || !posthogProjectId) {
    return { status: 'blocked', reason: 'missing_posthog_credentials', rows: [] };
  }

  const excludedSources = (policy.market_evidence?.excluded_utm_sources || [])
    .map(value => `'${String(value).replaceAll("'", "''")}'`)
    .join(', ');
  const sourcePredicate = excludedSources
    ? `AND coalesce(properties.utm_source, '') NOT IN (${excludedSources})`
    : '';

  const query = `
SELECT
  event,
  coalesce(properties.utm_content, '') AS utm_content,
  coalesce(properties.utm_source, 'direct') AS utm_source,
  coalesce(properties.route_id, '') AS route_id,
  coalesce(properties.$pathname, properties.path, '') AS pathname,
  count() AS count
FROM events
WHERE timestamp >= now() - INTERVAL ${windowDays} DAY
  AND event IN ('traffic_session_start', 'primary_cta_click')
  AND properties.$virt_traffic_type = 'Regular'
  ${sourcePredicate}
GROUP BY event, utm_content, utm_source, route_id, pathname
ORDER BY count DESC
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
    return { status: 'live', rows };
  } catch (error) {
    return { status: 'blocked', reason: `posthog_query_failed:${error.message}`, rows: [] };
  }
}

async function collectStripe(policy) {
  if (!stripeSecretKey) {
    return { status: 'blocked', reason: 'missing_stripe_secret_key', sessions: [] };
  }

  const createdGte = Math.floor(Date.now() / 1000) - windowDays * 86400;
  const sessions = [];
  let startingAfter = '';

  try {
    for (let page = 0; page < 5; page += 1) {
      const params = new URLSearchParams({ limit: '100' });
      params.append('created[gte]', String(createdGte));
      if (startingAfter) params.set('starting_after', startingAfter);
      const body = await fetchJson(`https://api.stripe.com/v1/checkout/sessions?${params}`, {
        headers: { Authorization: `Bearer ${stripeSecretKey}` }
      });
      const batch = Array.isArray(body?.data) ? body.data : [];
      sessions.push(...batch);
      if (!body?.has_more || batch.length === 0) break;
      startingAfter = batch.at(-1)?.id || '';
      if (!startingAfter) break;
    }

    const excludedPrefixes = policy.market_evidence?.excluded_client_reference_prefixes || [];
    const trusted = sessions.filter(session => !isExcludedClientReference(session.client_reference_id, excludedPrefixes));
    return {
      status: 'live',
      sessions: trusted,
      truncated: sessions.length >= 500
    };
  } catch (error) {
    return { status: 'blocked', reason: `stripe_query_failed:${error.message}`, sessions: [] };
  }
}

const queue = await readJson(QUEUE_FILE, []);
const policy = await readJson(POLICY_FILE, null);
if (!Array.isArray(queue) || !policy?.market_evidence) {
  throw new Error('Queue or evidence policy is invalid; fail closed.');
}

const [posthog, stripe] = await Promise.all([
  collectPostHog(policy),
  collectStripe(policy)
]);

const variants = {};
for (const item of queue) {
  const utmContent = parseUtmContent(item);
  const matchedRows = posthog.rows.filter(row => normalizeString(row?.[1]) === utmContent);
  const pageviews = matchedRows
    .filter(row => row?.[0] === 'traffic_session_start')
    .reduce((sum, row) => sum + Number(row?.[5] || 0), 0);
  const ctas = matchedRows
    .filter(row => row?.[0] === 'primary_cta_click')
    .reduce((sum, row) => sum + Number(row?.[5] || 0), 0);
  const matchedSessions = stripe.sessions.filter(session => containsToken(session, utmContent) || containsToken(session, item.id));
  const paidSessions = matchedSessions.filter(session => session.status === 'complete' && session.payment_status === 'paid');

  variants[item.id] = {
    ...(posthog.status === 'live' ? {
      regular_pageviews: pageviews,
      regular_primary_cta_clicks: ctas
    } : {}),
    ...(stripe.status === 'live' ? {
      regular_checkout_starts: matchedSessions.length,
      verified_paid_purchases: paidSessions.length,
      gross_revenue_usd: Number((paidSessions.reduce((sum, session) => sum + Number(session.amount_total || 0), 0) / 100).toFixed(2))
    } : {}),
    reliability: posthog.status === 'live' && stripe.status === 'live' ? 1 : 0,
    asset_reuse: item.existing_asset === false ? 0 : 1,
    human_effort_minutes: Number(item.human_effort_minutes || 0),
    attribution_key: utmContent || null
  };
}

const totalRegularTraffic = posthog.rows
  .filter(row => row?.[0] === 'traffic_session_start')
  .reduce((sum, row) => sum + Number(row?.[5] || 0), 0);
const totalRegularCtas = posthog.rows
  .filter(row => row?.[0] === 'primary_cta_click')
  .reduce((sum, row) => sum + Number(row?.[5] || 0), 0);
const totalTrustedCheckoutStarts = stripe.sessions.length;
const paidSessions = stripe.sessions.filter(session => session.status === 'complete' && session.payment_status === 'paid');
const totalVerifiedPurchases = paidSessions.length;
const grossRevenueUsd = paidSessions.reduce((sum, session) => sum + Number(session.amount_total || 0), 0) / 100;

const sourceStatus = {
  posthog: { status: posthog.status, reason: posthog.reason || null },
  stripe: { status: stripe.status, reason: stripe.reason || null, truncated: stripe.truncated || false }
};
const blockers = Object.entries(sourceStatus)
  .filter(([, source]) => source.status !== 'live')
  .map(([name, source]) => `${name}:${source.reason || 'not_live'}`);

const output = {
  status: blockers.length === 0 ? 'live' : 'blocked',
  updated_at: new Date().toISOString(),
  window_days: windowDays,
  evidence_policy_version: policy.version,
  source_status: sourceStatus,
  blockers,
  overall: {
    regular_traffic_sessions: posthog.status === 'live' ? totalRegularTraffic : null,
    regular_primary_cta_clicks: posthog.status === 'live' ? totalRegularCtas : null,
    trusted_checkout_starts: stripe.status === 'live' ? totalTrustedCheckoutStarts : null,
    verified_paid_purchases: stripe.status === 'live' ? totalVerifiedPurchases : null,
    gross_revenue_usd: stripe.status === 'live' ? Number(grossRevenueUsd.toFixed(2)) : null
  },
  variants
};

await writeFile(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  status: output.status,
  blockers,
  overall: output.overall,
  variants: Object.keys(variants).length,
  output: OUT_FILE.pathname
}, null, 2));
