import * as githubEvents from '../adapters/github-events.mjs';
import * as posthogEvents from '../adapters/posthog-events.mjs';
import * as stripeEvents from '../adapters/stripe-events.mjs';
import * as dispatchEvents from '../adapters/dispatch-events.mjs';

// `dispatch` is the odd one out and deliberately so. The other three are reads: this
// system decides when to look, which makes them polling however short the interval.
// A dispatch is the external world deciding when this repository runs, which is the
// only genuinely event-driven path in - and the least trustworthy input, since the
// payload is whatever the caller typed. The adapter enforces what a bus may not
// claim; see market/adapters/dispatch-events.mjs.
export const SUPPORTED_SOURCES = Object.freeze(['github', 'posthog', 'stripe', 'dispatch']);

export function sourceConfig(source) {
  switch (source) {
    case 'github':
      return { source, adapter: githubEvents, requiresRepository: true };
    case 'posthog':
      return { source, adapter: posthogEvents, requiresRepository: false };
    case 'stripe':
      return { source, adapter: stripeEvents, requiresRepository: false };
    case 'dispatch':
      return { source, adapter: dispatchEvents, requiresRepository: false, requiresPayload: true };
    default:
      throw new Error(`unknown --source ${source}; supported sources: ${SUPPORTED_SOURCES.join(', ')}`);
  }
}

export async function ingestExternalSource({
  source,
  owner = null,
  repo = null,
  now = Date.now(),
  ttlHours = null,
  payload = null,
  payloadFile = null,
  dispatchId = null
} = {}) {
  const config = sourceConfig(source);

  if (config.requiresRepository && (!owner || !repo)) {
    throw new Error('--owner and --repo are required for the github source');
  }

  if (config.requiresPayload) {
    // The payload is not narrowed by a TTL: a dispatch delivers what happened, and
    // the events carry their own detected_at, so the TTL is applied per signal by
    // the contract rather than as a query window here.
    return config.adapter.ingest({ now, payload, payloadFile, dispatchId });
  }

  if (source === 'github') {
    return config.adapter.ingest({
      owner,
      repo,
      now,
      ...(ttlHours !== null ? { ttlSeconds: Number(ttlHours) * 3600 } : {})
    });
  }

  if (source === 'posthog') {
    return config.adapter.ingest({
      now,
      ...(ttlHours !== null
        ? { after: new Date(now - Number(ttlHours) * 3600 * 1000).toISOString() }
        : {})
    });
  }

  return config.adapter.ingest({ now });
}

export function sourceTrigger(source, { owner = '', repo = '', dispatchId = null } = {}) {
  if (source === 'github') return `github:${owner}/${repo}`;
  // A dispatch names the delivery that caused it, so a trace can be tied back to the
  // exact workflow run - and through it to the Make execution that fired it.
  if (source === 'dispatch') return `dispatch:${dispatchId ?? 'market_signal'}`;
  return `${source}:external`;
}
