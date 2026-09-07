import * as githubEvents from '../adapters/github-events.mjs';
import * as posthogEvents from '../adapters/posthog-events.mjs';
import * as stripeEvents from '../adapters/stripe-events.mjs';

export const SUPPORTED_SOURCES = Object.freeze(['github', 'posthog', 'stripe']);

export function sourceConfig(source) {
  switch (source) {
    case 'github':
      return { source, adapter: githubEvents, requiresRepository: true };
    case 'posthog':
      return { source, adapter: posthogEvents, requiresRepository: false };
    case 'stripe':
      return { source, adapter: stripeEvents, requiresRepository: false };
    default:
      throw new Error(`unknown --source ${source}; supported sources: ${SUPPORTED_SOURCES.join(', ')}`);
  }
}

export async function ingestExternalSource({
  source,
  owner = null,
  repo = null,
  now = Date.now(),
  ttlHours = null
} = {}) {
  const config = sourceConfig(source);

  if (config.requiresRepository && (!owner || !repo)) {
    throw new Error('--owner and --repo are required for the github source');
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

export function sourceTrigger(source, { owner = '', repo = '' } = {}) {
  return source === 'github' ? `github:${owner}/${repo}` : `${source}:external`;
}
