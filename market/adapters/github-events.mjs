// GitHub Events adapter.
//
// Chosen as the first real source because it is genuinely external, genuinely
// live, and reachable without any credential this repo does not already have. It is
// deliberately NOT treated as a revenue signal: a star or an issue is a MARKET
// signal at best, and the priority table keeps it below anything a buyer does.
//
// The adapter only extracts and classifies. It does not decide, does not route and
// does not write state - those belong to the layers above it.

import { normalizeSignal } from '../lib/signal.mjs';
import { makeEvidence } from '../lib/evidence.mjs';
import { proxyFetch } from '../lib/http.mjs';

const API = 'https://api.github.com';

// Which GitHub event types carry anything worth reading as demand. Everything else
// is ignored rather than ingested at low confidence: noise that enters the store
// still costs a dedupe check and a human's attention later.
const INTERESTING = Object.freeze({
  WatchEvent:       { demand_type: 'RESEARCH',          confidence: 0.15, distance: 'FAR' },
  ForkEvent:        { demand_type: 'IMPLICIT_INTENT',   confidence: 0.30, distance: 'FAR' },
  IssuesEvent:      { demand_type: 'PROBLEM_STATEMENT', confidence: 0.45, distance: 'MID' },
  IssueCommentEvent:{ demand_type: 'PROBLEM_STATEMENT', confidence: 0.35, distance: 'MID' },
  PullRequestEvent: { demand_type: 'IMPLICIT_INTENT',   confidence: 0.35, distance: 'MID' }
});

/**
 * Fetch recent public events for a repository.
 * Unauthenticated is fine and is what runs here; a token only raises the rate limit.
 */
export async function fetchRepoEvents({ owner, repo, token = process.env.GITHUB_TOKEN,
                                        fetchImpl = proxyFetch, perPage = 100, pages = 3 } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'stratum-praxis-market/1.0'
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // A single page is not enough on an active repository. This one produces long
  // runs of automated PushEvents, so page 1 can be entirely machine traffic while
  // the human activity - the part that carries demand - sits on page 2 or 3.
  // Reading one page and concluding "no demand" would be a measurement artefact.
  const events = [];
  const urls = [];
  for (let page = 1; page <= pages; page += 1) {
    const url = `${API}/repos/${owner}/${repo}/events?per_page=${perPage}&page=${page}`;
    const res = await fetchImpl(url, { headers });
    if (!res.ok) {
      const err = new Error(`github events ${res.status} for ${owner}/${repo}`);
      err.status = res.status;
      throw err;
    }
    const batch = await res.json();
    urls.push(url);
    events.push(...batch);
    if (!Array.isArray(batch) || batch.length < perPage) break;
  }
  return { url: urls[0], urls, events };
}

function subjectOf(event) {
  const p = event.payload ?? {};
  if (p.issue?.title) return p.issue.title;
  if (p.pull_request?.title) return p.pull_request.title;
  if (p.comment?.body) return String(p.comment.body).slice(0, 160);
  return `${event.type} on ${event.repo?.name ?? 'unknown repo'}`;
}

function urlOf(event) {
  const p = event.payload ?? {};
  return p.issue?.html_url ?? p.pull_request?.html_url ?? p.comment?.html_url
    ?? (event.repo?.name ? `https://github.com/${event.repo.name}` : null);
}

/**
 * Turn raw GitHub events into normalised signals.
 *
 * event.id is GitHub's own stable identifier, which is what makes the resulting
 * signal_id deterministic across re-fetches: the same event always lands on the
 * same row.
 */
export function toSignals(events, { now = Date.now(), ttlSeconds = null } = {}) {
  const signals = [];
  const ignored = [];

  for (const event of events) {
    const rule = INTERESTING[event.type];
    if (!rule) { ignored.push({ id: event.id, type: event.type, reason: 'NOT_DEMAND_BEARING' }); continue; }

    signals.push(normalizeSignal({
      signal_type: 'MARKET',
      source: 'github_events',
      source_url: urlOf(event),
      external_id: String(event.id),
      detected_at: event.created_at ?? new Date(now).toISOString(),
      subject: subjectOf(event),
      buyer_or_human: event.actor?.login ?? null,
      demand_type: rule.demand_type,
      revenue_distance: rule.distance,
      confidence: rule.confidence,
      evidence: makeEvidence('PLATFORM_PAYLOAD', {
        ref: `github:event:${event.id}`,
        detail: `${event.type} in ${event.repo?.name ?? 'unknown'}`,
        observed_at: new Date(now).toISOString()
      }),
      raw_ref: `github:event:${event.id}`
    }, { now, ttlSeconds }));
  }

  return { signals, ignored };
}

export async function ingest({ owner, repo, now = Date.now(), ttlSeconds = null, ...opts } = {}) {
  const { url, events } = await fetchRepoEvents({ owner, repo, ...opts });
  const { signals, ignored } = toSignals(events, { now, ttlSeconds });
  return { source_url: url, fetched: events.length, signals, ignored };
}
