#!/usr/bin/env node
// One pass of the external-event loop.
//
//   EXTERNAL REALITY -> SIGNAL -> NORMALIZE -> QUALIFY -> EXISTING ASSET FIT
//   -> ACTION (or HOLD/KILL) -> EVIDENCE
//
// Everything this run believes is written to a trace, including what it refused to
// claim. The run is safe to invoke repeatedly: the same external facts produce the
// same signal ids, so a second pass finds them already known and does nothing.
//
// Usage:
//   node market/cli/ingest.mjs --source github --owner OWNER --repo REPO [--local] [--json]
//   node market/cli/ingest.mjs --source posthog [--local] [--json]
//   node market/cli/ingest.mjs --source stripe [--local] [--json]
//
//   --local   use the local file store instead of the Make Data Store. Marked as
//             LOCAL_FILE everywhere it is written; never treat it as production state.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { dedupe, isExpired, priorityOf, validateSignal } from '../lib/signal.mjs';
import { transition, sweepExpired } from '../lib/state.mjs';
import { classifyDeterministic, decisionToTransition } from '../lib/decision.mjs';
import { makeTrace } from '../lib/evidence.mjs';
import { classifyFailure, recordFailure } from '../lib/retry.mjs';
import { LocalFileStore, selectStore } from '../lib/store.mjs';
import { fitExistingAsset } from '../lib/asset-fit.mjs';
import { ingestExternalSource, sourceTrigger } from '../lib/source-adapter.mjs';
import { REPO_ROOT } from '../../acquisition/lib/util.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const JSON_OUT = has('json');
const LOCAL = has('local');
const SOURCE = flag('source', 'github');
// Replaying real historical events is a legitimate mode - it is how you test the
// qualification path against reality when the live window happens to be quiet. It
// is NOT the default, and every run that uses it says so in its trace, so a
// backfill can never be read as ordinary live throughput.
const TTL_HOURS = flag('ttl-hours', null);
const BACKFILL = TTL_HOURS !== null;

const log = (...a) => { if (!JSON_OUT) console.log(...a); };

async function main() {
  const now = Date.now();
  const runId = `run_${crypto.randomUUID()}`;
  const startedAt = new Date(now).toISOString();

  const store = LOCAL ? new LocalFileStore() : selectStore();
  if (!store.configured) {
    // No silent fallback to a different store. An unconfigured production store is
    // a real blocker and is reported as one.
    const out = {
      run_id: runId,
      status: 'BLOCKED',
      reason: 'no runtime state store configured',
      detail: 'set MARKET_STATE_ENDPOINT and MARKET_STATE_SECRET for the Make Data Store, or pass --local for offline verification',
      store_kind: 'UNCONFIGURED'
    };
    if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
    else console.error(`BLOCKED: ${out.reason}\n  ${out.detail}`);
    process.exitCode = 2;
    return;
  }

  log(`run ${runId}`);
  if (BACKFILL) log(`MODE BACKFILL  ttl=${TTL_HOURS}h  (replaying real historical events; not live throughput)`);
  log(`store ${store.kind}${store.kind === 'LOCAL_FILE' ? '  (local verification only, not production state)' : ''}`);

  // ---- 1. EXTERNAL REALITY -> SIGNAL -------------------------------------------
  let ingested;
  const failures = [];
  const owner = flag('owner');
  const repo = flag('repo');
  try {
    ingested = await ingestExternalSource({
      source: SOURCE,
      owner,
      repo,
      now,
      ttlHours: BACKFILL ? Number(TTL_HOURS) : null
    });
  } catch (err) {
    const cls = err.failure_class ?? classifyFailure(err);
    const retryState = recordFailure(null, { ...err, failure_class: cls, message: err.message }, { now });
    failures.push({ stage: 'ingest', failure_class: cls, message: err.message, retry: retryState });
    const trace = makeTrace({
      run_id: runId, trigger: `${SOURCE}:ingest`, store_kind: store.kind,
      started_at: startedAt, failures
    });
    await writeTrace(trace);
    if (JSON_OUT) console.log(JSON.stringify(trace, null, 2));
    else console.error(`INGEST FAILED (${cls}): ${err.message}\n  next: ${retryState.next_allowed_action}`);
    process.exitCode = 1;
    return;
  }

  log(`fetched ${ingested.fetched} raw events from ${ingested.source_url}`);
  log(`  ${ingested.signals.length} demand-bearing, ${ingested.ignored.length} ignored`);

  // Every signal must satisfy the contract before it is allowed near the store.
  const invalid = [];
  const candidates = ingested.signals.filter((s) => {
    const errs = validateSignal(s);
    if (errs.length) { invalid.push({ signal_id: s.signal_id, errors: errs }); return false; }
    return true;
  });
  if (invalid.length) log(`  ${invalid.length} rejected by the signal contract`);

  // ---- 2. DUPLICATE GUARD + TTL -------------------------------------------------
  const known = await store.all();
  const { fresh, suppressed } = dedupe(candidates, known, { now });
  log(`  ${fresh.length} new, ${suppressed.length} already known`);

  const stale = sweepExpired(known, now);
  if (stale.length) {
    const expired = stale
      .map((s) => transition(s, 'EXPIRED', { reason: 'ttl elapsed', now }))
      .filter((r) => r.ok).map((r) => r.signal);
    if (expired.length) { await store.putMany(expired); log(`  ${expired.length} expired by TTL`); }
  }

  // ---- 3. QUALIFY -> ASSET FIT -> DECISION -------------------------------------
  const decisions = [];
  const actions = [];
  const expiredOnArrival = [];
  const ordered = [...fresh].sort((a, b) => priorityOf(b) - priorityOf(a));

  for (const signal of ordered) {
    // A signal can arrive already past its TTL - a backfill of older events, or a
    // feed that was not read for a while. It must still be PERSISTED as EXPIRED, not
    // skipped: an unpersisted signal is invisible to the duplicate guard, so the same
    // dead events would be re-ingested on every single run, for ever. Dropping them
    // silently also loses the fact that they were seen at all.
    if (isExpired(signal, now)) {
      const moved = transition(signal, 'EXPIRED', { reason: 'already past TTL when ingested', now });
      await store.put(moved.ok ? moved.signal : { ...signal, status: 'EXPIRED' });
      expiredOnArrival.push({ signal_id: signal.signal_id, detected_at: signal.detected_at });
      continue;
    }

    const fit = await fitExistingAsset(signal);
    const enriched = { ...signal, existing_asset_match: fit.match };
    const decision = classifyDeterministic(enriched);
    const mapped = decisionToTransition(decision);

    if (!mapped.ok) {
      failures.push({ stage: 'decision', signal_id: signal.signal_id, errors: mapped.errors });
      continue;
    }

    const moved = transition(enriched, mapped.status, { reason: decision.reason, now });
    const finalSignal = moved.ok ? moved.signal : enriched;
    if (!moved.ok) failures.push({ stage: 'transition', signal_id: signal.signal_id, reason: moved.reason });

    await store.put({
      ...finalSignal,
      asset_fit: { match: fit.match, score: fit.score ?? null, reason: fit.reason ?? null,
                   has_live_checkout: fit.has_live_checkout ?? false }
    });

    decisions.push({
      signal_id: signal.signal_id,
      subject: signal.subject,
      decision: decision.decision,
      status: finalSignal.status,
      asset_match: fit.match,
      has_live_checkout: fit.has_live_checkout ?? false,
      confidence: decision.confidence,
      reason: decision.reason,
      classifier: decision.classifier
    });

    // An ACTIONABLE signal with a live checkout is the only thing that becomes a
    // revenue-bearing route. Everything else is recorded and left alone.
    if (finalSignal.status === 'ACTIONABLE' && fit.match && fit.has_live_checkout) {
      actions.push({
        signal_id: signal.signal_id,
        recommended_action: decision.recommended_action,
        asset_id: fit.match,
        destination: fit.destination,
        checkout_url: fit.checkout_url,
        price: fit.price,
        // Recorded, not executed. Publishing or messaging is a separate, gated step.
        executed: false,
        execution_gate: 'route recorded; dispatch is a separate approved step'
      });
    }
  }

  const trace = makeTrace({
    run_id: runId,
    trigger: sourceTrigger(SOURCE, { owner, repo }),
    store_kind: store.kind,
    started_at: startedAt,
    signals_seen: ingested.signals.length,
    signals_new: fresh.length,
    decisions,
    actions,
    failures
  });
  trace.suppressed = suppressed;
  trace.expired_on_arrival = expiredOnArrival;
  trace.mode = BACKFILL ? 'BACKFILL' : 'LIVE';
  if (BACKFILL) trace.backfill_ttl_hours = Number(TTL_HOURS);
  trace.invalid = invalid;
  trace.source_url = ingested.source_url;
  if (SOURCE === 'stripe') {
    trace.stripe_summary = {
      paid_sessions: ingested.paid_sessions ?? 0,
      unpaid_sessions: ingested.unpaid_sessions ?? 0
    };
  }

  await writeTrace(trace);

  if (JSON_OUT) { console.log(JSON.stringify(trace, null, 2)); return; }

  log('');
  log('decisions:');
  for (const d of decisions) {
    log(`  ${d.decision.padEnd(15)} ${d.status.padEnd(12)} asset=${d.asset_match ?? '-'} :: ${d.subject.slice(0, 60)}`);
  }
  log('');
  log(`expired on arrival: ${expiredOnArrival.length} (persisted as EXPIRED so they are not re-ingested)`);
  log(`actionable revenue routes: ${actions.length}`);
  if (SOURCE === 'stripe') {
    log(`stripe paid sessions: ${ingested.paid_sessions ?? 0}  unpaid sessions: ${ingested.unpaid_sessions ?? 0}`);
  }
  log(`verified_revenue: ${trace.verified_revenue}  payment_evidence: ${trace.payment_evidence_present}`);
  log(`trace: market/evidence/${trace.run_id}.json`);
}

async function writeTrace(trace) {
  const dir = path.join(REPO_ROOT, 'market/evidence');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${trace.run_id}.json`), `${JSON.stringify(trace, null, 2)}\n`);
}

main().catch((err) => {
  console.error(`MARKET_INGEST_STOP ${err.message}`);
  process.exitCode = 1;
});
