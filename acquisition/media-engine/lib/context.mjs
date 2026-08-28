// Issue #52 - shared loading. Every CLI and test builds its world through this file so
// they cannot disagree about which policy, identity or channel set is in force.

import { readJson } from '../../lib/util.mjs';
import { loadSourceRouting } from '../../lib/utm.mjs';
import { loadIdentity } from './identity.mjs';
import { loadSources } from './source.mjs';

export async function loadMediaContext(options = {}) {
  const identity = options.identity || await loadIdentity();
  const desksDoc = options.desksDoc || await readJson('acquisition/media-engine/desks.json');
  const lensesDoc = options.lensesDoc || await readJson('acquisition/media-engine/lenses.json');
  const channelsDoc = options.channelsDoc || await readJson('acquisition/media-engine/channels.json');
  const sourceRouting = options.sourceRouting || await loadSourceRouting();
  const providerPolicy = options.providerPolicy || await readJson('distribution/provider-policy.json');
  const sourceSet = options.sourceSet || await loadSources('acquisition/media-engine/sources.json', { now: options.now });

  return {
    identity,
    desks: desksDoc.desks,
    lenses: lensesDoc.lenses,
    derivationRule: lensesDoc.derivation_rule,
    channels: channelsDoc.channels,
    channelsDoc,
    sourceRouting,
    providerPolicy,
    sourceSet,
    sources: sourceSet.byId,
    now: options.now ?? Date.now()
  };
}

export async function loadDerivations(file = 'acquisition/media-engine/derivations.json') {
  const doc = await readJson(file);
  if (!Array.isArray(doc?.derivations)) throw new Error(`${file} must contain a derivations array`);
  return doc;
}
