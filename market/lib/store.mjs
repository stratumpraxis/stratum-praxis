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

export const STORE_KINDS = Object.freeze(['SUPABASE_LEDGER', 'MAKE_DATA_STORE', 'LOCAL_FILE']);

/**
 * Supabase event ledger. THE DURABLE STATE.
 *
 * The role split this system runs on: Make is the nervous system, Supabase is the
 * memory, this repository is the rulebook. Signals live here because a ledger has to
 * survive a Make scenario being edited, a workflow being rewritten and an agent
 * session ending - none of which it would if state lived inside any of them.
 *
 * Written through PostgREST rather than a Postgres driver so there is no connection
 * pool to manage from a workflow that runs for ninety seconds and exits, and no new
 * dependency in a repository that has none.
 *
 * Upsert is on `signal_id`, which is deterministic. That is what makes a redelivery
 * an update rather than a second row, and it is why the ledger can be written to by
 * a webhook, a scheduled run and a manual replay without any of them coordinating.
 */
export class SupabaseLedgerStore {
  constructor({ url = process.env.SUPABASE_URL,
                key = process.env.SUPABASE_SERVICE_ROLE_KEY,
                table = process.env.MARKET_LEDGER_TABLE ?? 'market_event_ledger',
                schema = process.env.MARKET_LEDGER_SCHEMA ?? 'public',
                fetchImpl = null } = {}) {
    this.kind = 'SUPABASE_LEDGER';
    this.url = url ? String(url).replace(/\/+$/, '') : null;
    this.key = key;
    this.table = table;
    this.schema = schema;
    this.fetchImpl = fetchImpl;
  }

  get configured() {
    return Boolean(this.url && this.key && this.table);
  }

  get endpoint() {
    return `${this.url}/rest/v1/${this.table}`;
  }

  #headers(extra = {}) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Accept-Profile': this.schema,
      'Content-Profile': this.schema,
      ...extra
    };
  }

  async #fetch(url, init) {
    if (!this.configured) {
      const err = new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
      err.failure_class = 'AUTH';
      throw err;
    }
    // Resolved lazily so a caller can inject a fetch, and so the proxy-aware client
    // is only imported when a request is actually about to be made.
    const impl = this.fetchImpl ?? (await import('./http.mjs')).proxyFetch;
    const res = await impl(url, init);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`supabase ledger ${init?.method ?? 'GET'} ${res.status}: ${body.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    return res;
  }

  async all({ limit = 1000 } = {}) {
    // Ordered by detected_at so a caller reading a page gets the most recent
    // reality rather than an arbitrary slice of the table.
    const url = `${this.endpoint}?select=*&order=detected_at.desc&limit=${limit}`;
    const res = await this.#fetch(url, { method: 'GET', headers: this.#headers() });
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(fromRow) : [];
  }

  async get(signalId) {
    const url = `${this.endpoint}?select=*&signal_id=eq.${encodeURIComponent(signalId)}&limit=1`;
    const res = await this.#fetch(url, { method: 'GET', headers: this.#headers() });
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? fromRow(rows[0]) : null;
  }

  async put(signal) {
    await this.putMany([signal]);
    return signal;
  }

  async putMany(signals) {
    if (!signals.length) return [];
    const res = await this.#fetch(`${this.endpoint}?on_conflict=signal_id`, {
      method: 'POST',
      headers: this.#headers({
        // merge-duplicates is what turns a retry into an upsert. Without it a
        // redelivered event is a unique-violation, and the honest-looking fix for
        // that - catching the error and moving on - loses the state update.
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(signals.map(toRow))
    });
    await res.text().catch(() => '');
    return signals;
  }
}

// The ledger stores the contract fields as columns so they can be queried, and the
// rest as one jsonb payload. Splitting it this way means a query like "every signal
// on this correlation_id" is an index lookup rather than a jsonb scan, without the
// schema having to track every field the contract may grow.
const LEDGER_COLUMNS = Object.freeze([
  'signal_id', 'event_id', 'source_event_id', 'correlation_id', 'causation_id',
  'action_id', 'route_id', 'signal_type', 'source', 'status', 'detected_at',
  'ingested_at', 'expires_at', 'updated_at', 'existing_asset_match'
]);

function toRow(signal) {
  const row = { payload: signal };
  for (const column of LEDGER_COLUMNS) {
    if (signal[column] !== undefined) row[column] = signal[column];
  }
  return row;
}

function fromRow(row) {
  // The payload is the signal; the columns are a projection of it. Reading the
  // payload back rather than reassembling from columns means a field the schema does
  // not know about survives a round trip instead of being silently dropped.
  if (row?.payload && typeof row.payload === 'object') return row.payload;
  return row;
}

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

  // Supabase first when it is configured: it is the durable ledger, and the Make
  // Data Store is a bus-side cache of the same facts. Preferring the cache when the
  // ledger exists would put the authoritative copy behind the convenient one.
  const ledger = new SupabaseLedgerStore({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY,
    table: env.MARKET_LEDGER_TABLE ?? 'market_event_ledger',
    schema: env.MARKET_LEDGER_SCHEMA ?? 'public'
  });
  if (ledger.configured) return ledger;

  const make = new MakeDataStore({
    endpoint: env.MARKET_STATE_ENDPOINT,
    secret: env.MARKET_STATE_SECRET
  });
  if (make.configured) return make;
  return { kind: 'UNCONFIGURED', configured: false };
}
