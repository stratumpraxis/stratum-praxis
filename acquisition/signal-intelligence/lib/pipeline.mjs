// Issue #53 - the end-to-end pipeline, shared by every CLI in this directory.
//
//   evidence records
//     -> normalize + fingerprint + dedupe   (lib/normalize.mjs)
//     -> group by thesis                    (lib/corroborate.mjs)
//     -> independent corroboration          (lib/corroborate.mjs)
//     -> Revenue Signal Score               (lib/revenue-score.mjs)
//     -> VERIFIED existing-asset fit        (lib/asset-fit.mjs, over acquisition/lib/router.mjs)
//     -> SOURCE_CANDIDATE                   (lib/source-candidate.mjs)
//     -> ranked with an exploration guard   (lib/feedback.mjs)
//
// Nothing here publishes, creates a product, or writes to any file outside
// acquisition/signal-intelligence/.

import { loadInventory } from '../../lib/inventory.mjs';
import { knownChannels, loadSourceRouting } from '../../lib/utm.mjs';
import { readJson } from '../../lib/util.mjs';
import { groupByThesis } from './corroborate.mjs';
import { ingest, loadPolicy, loadProviders } from './normalize.mjs';
import { buildSourceCandidate } from './source-candidate.mjs';
import { classifyOutcomes, rankCandidates } from './feedback.mjs';

export async function loadContext(options = {}) {
  const policy = options.policy || (await loadPolicy());
  const providers = options.providers || (await loadProviders());
  const sourceRouting = options.sourceRouting || (await loadSourceRouting());
  const providerPolicy = options.providerPolicy || (await readJson('distribution/provider-policy.json'));
  const inventory = options.inventory
    || (await loadInventory('acquisition/asset-inventory.json', { knownChannels: knownChannels(sourceRouting) }));
  return { policy, providers, sourceRouting, providerPolicy, inventory };
}

/**
 * Run the pipeline over one signals document.
 *
 * @param {object} doc      { theses: [], signals: [] }
 * @param {object} context  from loadContext()
 * @param {object} options  { now, outcomes, capacity }
 */
export function runPipeline(doc, context, options = {}) {
  const { policy, providers, sourceRouting, providerPolicy, inventory } = context;
  const now = options.now ?? Date.now();

  const ingested = ingest(doc.signals || [], { policy, providers, now });
  const grouped = groupByThesis(ingested.accepted);

  const candidates = [];
  for (const thesis of doc.theses || []) {
    const signals = grouped.get(thesis.thesis_id) || [];
    candidates.push(buildSourceCandidate(thesis, signals, inventory, {
      policy,
      sourceRouting,
      providerPolicy,
      now
    }));
  }

  const outcomes = options.outcomes instanceof Map
    ? options.outcomes
    : classifyOutcomes(options.outcomes || []);

  const promoted = candidates.filter((c) => c.promoted);
  const ranking = rankCandidates(promoted, { policy, outcomes, now, capacity: options.capacity });

  return {
    generated_for: new Date(now).toISOString(),
    ingest: {
      accepted: ingested.accepted.length,
      rejected: ingested.rejected,
      duplicates: ingested.duplicates,
      signal_ids: ingested.accepted.map((s) => s.signal_id)
    },
    signals: ingested.accepted,
    candidates,
    promoted_candidate_ids: promoted.map((c) => c.source_candidate_id),
    ranking
  };
}

/** Load the shipped signals document and run the pipeline over it. */
export async function runDefaultPipeline(options = {}) {
  const context = await loadContext(options);
  const doc = options.doc || (await readJson('acquisition/signal-intelligence/signals.json'));
  return { context, doc, result: runPipeline(doc, context, options) };
}
