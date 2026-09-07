// Runtime operational state.
//
// Where this state lives is a deliberate decision, not an accident:
//
//   - Make Data Store is the PRODUCTION store. It is the one place that is reachable
//     from Make scenarios, from Actions, and from a human, without any of them
//     needing to be running at the same time.
//   - Repository files are NOT the runtime store. A git file cannot be read-modify-
//     written concurrently by a webhook and a scheduled job without losing writes,
//     and treating commits as state means the state only changes when somebody runs
//     an agent. That is precisely the chat-driven pattern this architecture removes.
//   - The local file adapter exists for TESTS and for offline verification. It marks
//     everything it writes so a local run can never be mistaken for production state.
//
// Both adapters implement the same tiny interface, so nothing above this file knows
// which one it is talking to.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const STORE_KINDS = Object.freeze(['MAKE_DATA_STORE', 'LOCAL_FILE']);

/**
 * Make Data Store adapter.
 *
 * Talks to a Make scenario webhook that fronts the Data Store, rather than to Make's
 * private API, so no Make API token has to exist in this repo. The webhook URL and
 * the shared signing secret are environment variables; neither is ever written to a
 * file here and neither belongs client-side.
 */
export class MakeDataStore {
  constructor({ endpoint = process.env.MARKET_STATE_ENDPOINT,
                secret = process.env.MARKET_STATE_SECRET,
                fetchImpl = globalThis.fetch } = {}) {
    this.kind = 'MAKE_DATA_STORE';
    this.endpoint = endpoint;
    this.secret = secret;
    this.fetchImpl = fetchImpl;
  }

  get configured() {
    return Boolean(this.endpoint && this.secret);
  }

  async #call(op, payload) {
    if (!this.configured) {
      const err = new Error('MARKET_STATE_ENDPOINT / MARKET_STATE_SECRET are not set');
      err.failure_class = 'AUTH';
      throw err;
    }
    const body = JSON.stringify({ op, ...payload });
    const res = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Signed so the Make scenario can refuse anything it did not expect.
        'X-Market-Signature': await sign(body, this.secret)
      },
      body
    });
    if (!res.ok) {
      const err = new Error(`make data store ${op} failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async all() {
    const out = await this.#call('list', {});
    return Array.isArray(out?.signals) ? out.signals : [];
  }

  async get(signalId) {
    const out = await this.#call('get', { signal_id: signalId });
    return out?.signal ?? null;
  }

  async put(signal) {
    await this.#call('put', { signal });
    return signal;
  }

  async putMany(signals) {
    if (!signals.length) return [];
    await this.#call('put_many', { signals });
    return signals;
  }
}

/**
 * Local file adapter. TEST AND OFFLINE ONLY.
 *
 * Every record it writes carries store_kind: 'LOCAL_FILE', so a signal that came
 * from a local run is distinguishable from production state at a glance and in a
 * test. It is not a fallback for production - if the real store is unreachable, the
 * honest outcome is a failure with a class, not a silent write somewhere else.
 */
export class LocalFileStore {
  constructor({ file = 'market/state/signals.local.json' } = {}) {
    this.kind = 'LOCAL_FILE';
    this.file = path.isAbsolute(file) ? file : path.join(REPO_ROOT, file);
  }

  get configured() { return true; }

  async #read() {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const doc = JSON.parse(raw);
      return Array.isArray(doc?.signals) ? doc.signals : [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async #write(signals) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const doc = {
      store_kind: 'LOCAL_FILE',
      warning: 'Local verification state. Not production runtime state. Production state lives in the Make Data Store.',
      updated_at: new Date().toISOString(),
      signals
    };
    await fs.writeFile(this.file, `${JSON.stringify(doc, null, 2)}\n`);
  }

  async all() { return this.#read(); }

  async get(signalId) {
    const all = await this.#read();
    return all.find((s) => s.signal_id === signalId) ?? null;
  }

  async put(signal) {
    const all = await this.#read();
    const marked = { ...signal, store_kind: 'LOCAL_FILE' };
    const idx = all.findIndex((s) => s.signal_id === signal.signal_id);
    if (idx >= 0) all[idx] = marked; else all.push(marked);
    await this.#write(all);
    return marked;
  }

  async putMany(signals) {
    const all = await this.#read();
    const byId = new Map(all.map((s) => [s.signal_id, s]));
    const marked = signals.map((s) => ({ ...s, store_kind: 'LOCAL_FILE' }));
    for (const s of marked) byId.set(s.signal_id, s);
    await this.#write([...byId.values()]);
    return marked;
  }
}

async function sign(body, secret) {
  const crypto = await import('node:crypto');
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Pick a store. Production prefers Make; local is selected explicitly, never as a
 * silent fallback, so a run can always say which store it used.
 */
export function selectStore({ preferLocal = false, env = process.env } = {}) {
  if (preferLocal) return new LocalFileStore();
  const make = new MakeDataStore({
    endpoint: env.MARKET_STATE_ENDPOINT,
    secret: env.MARKET_STATE_SECRET
  });
  if (make.configured) return make;
  return { kind: 'UNCONFIGURED', configured: false };
}
