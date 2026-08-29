// The channel routing table.
//
// utm_source and utm_medium are never invented at call time. They are declared once,
// in one file, and every tracked link is built from that declaration. This is the whole
// reason two spellings of one campaign stop appearing in your analytics as two lanes.

import fs from 'node:fs/promises';

export function validateRouting(routing) {
  const errors = [];
  if (typeof routing !== 'object' || routing === null || Array.isArray(routing)) {
    return ['routing must be an object'];
  }
  if (typeof routing.channels !== 'object' || routing.channels === null) {
    return ['routing is missing a channels map'];
  }
  for (const [name, channel] of Object.entries(routing.channels)) {
    if (!channel || typeof channel !== 'object') {
      errors.push(`channel "${name}" must be an object`);
      continue;
    }
    if (!channel.utm_source) errors.push(`channel "${name}" has no utm_source`);
    if (!channel.utm_medium) errors.push(`channel "${name}" has no utm_medium`);
  }
  if (!Array.isArray(routing.owned_domains)) errors.push('routing is missing owned_domains[]');
  if (!Array.isArray(routing.checkout_hosts)) errors.push('routing is missing checkout_hosts[]');
  return errors;
}

export function assertValidRouting(routing) {
  const errors = validateRouting(routing);
  if (errors.length) {
    const error = new Error(`routing table is invalid (${errors.length} problem(s))`);
    error.errors = errors;
    throw error;
  }
  return routing;
}

export async function loadRouting(file) {
  const raw = await fs.readFile(file, 'utf8');
  let routing;
  try {
    routing = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON in ${file}: ${error.message}`);
  }
  return assertValidRouting(routing);
}

export function knownChannels(routing) {
  return new Set(Object.keys(routing?.channels || {}));
}
