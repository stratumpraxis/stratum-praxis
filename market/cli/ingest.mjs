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
//
//   --local   use the local file store instead of the durable ledger. Marked as
//             LOCAL_FILE everywhere it is written; never treat it as production state.
//
// Sources:
//   github    repository activity - a MARKET signal at best, never revenue
//   posthog   deployed analytics - what humans actually did on the pages
//   stripe    the payment provider - the only source that may produce money evidence
//   dispatch  a repository_dispatch client_payload relayed by Make. The only
//             genuinely event-driven path in; every other source is a read.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dedupe, isExpired, priorityOf, validateSignal } from '../lib/signal.mjs';
import { actionId } from '../lib/correlation.mjs';
import { admitObservation, admitPayment, advance, transition, sweepExpired } from '../lib/state.mjs';
import { classifyDeterministic, decisionToTransition } from '../lib/decision.mjs';
import { makeTrace } from '../lib/evidence.mjs';
import { classifyFailure, recordFailure } from '../lib/retry.mjs';
import { LocalFileStore, selectStore } from '../lib/store.mjs';
import { fitExistingAsset } from '../lib/asset-fit.mjs';
import { carriesVerifiedPayment, explorationPosture, findWinners, prioritise, promoteToWinner } from '../lib/winner.mjs';
import * as githubEvents from '../adapters/github-events.mjs';
import * as posthogEvents from '../adapters/posthog-events.mjs';
import * as stripeEvents from '../adapters/stripe-events.mjs';
import * as dispatchEvents from '../adapters/dispatch-events.mjs';
import { REPO_ROOT } from '../../acquisition/lib/util.mjs';

// The source registry. Adding a feed is adding an entry here, not editing the run
// loop - which is what keeps the qualification, dedupe and state logic identical no
// matter where an event came from.
//
// `trigger` is what the trace records as the reason this run happened, and it is
// deliberately specific per source: "posthog" and "github:owner/repo" answer
// different questions when you are reading a trace six weeks later.
const SOURCES = Object.freeze({
  github: {
    describe: (f) => `github:${f('owner', '')}/${f('repo', '')}`,
    run: ({ now, flag, ttlSeconds }) => {
      const owner = flag('owner');
      const repo = flag('repo');
      if (!owner || !repo) throw new Error('--owner and --repo are required for the github source');
      return githubEvents.ingest({ owner, repo, now, ...(ttlSeconds ? { ttlSeconds } : {}) });
    }
  },
  posthog: {
    describe: () => 'posthog:human_events',
    run: ({ now }) => posthogEvents.ingest({ now })
  },
  stripe: {
    describe: () => 'stripe:checkout_sessions',
    run: ({ now }) => stripeEvents.ingest({ now })
  },
  dispatch: {
    describe: (f) => `dispatch:${f('dispatch-id', 'market_signal')}`,
    run: ({ now, flag }) => dispatchEvents.ingest({
      now,
      payloadFile: flag('payload-file'),
      payload: flag('payload') ? JSON.parse(flag('payload')) : null,
      dispatchId: flag('dispatch-id')
    })
  }
});

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
      detail: 'set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the durable event ledger, or MARKET_STATE_ENDPOINT and MARKET_STATE_SECRET for the Make Data Store, or pass --local for offline verification',
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
  try {
    const adapter = SOURCES[SOURCE];
    if (!adapter) {
      throw new Error(`unknown --source ${SOURCE}; wired sources are ${Object.keys(SOURCES).join(', ')}`);
    }
    ingested = await adapter.run({
      now, flag,
      ttlSeconds: BACKFILL ? Number(TTL_HOURS) * 3600 : null
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
  // A refusal is a rule firing, not noise. It is logged loudly because a run whose
  // refusals are climbing means something upstream is trying to assert what this
  // side will not accept - most importantly, a payment it is not entitled to claim.
  const refused = ingested.refused ?? [];
  if (refused.length) {
    log(`  ${refused.length} REFUSED by an integrity rule:`);
    for (const r of refused) log(`    ${r.reason}  ${r.id}`);
  }

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

  // ---- 3. WHAT HAS ALREADY WON --------------------------------------------------
  // Read before anything is decided, because it changes what this run pays attention
  // to. With nothing won, exploration is the only way to find a winner; with a
  // winner, effort goes to signals that resemble it. Both postures are recorded in
  // the trace rather than applied silently.
  const winners = findWinners(known);
  const posture = explorationPosture(winners);
  log(`winners: ${winners.length}  exploration: ${posture.explore ? 'OPEN' : 'SUPPRESSED'}`);
  if (!posture.explore) log(`  ${posture.reason}`);

  // ---- 4. QUALIFY -> ASSET FIT -> DECISION -------------------------------------
  const decisions = [];
  const actions = [];
  const expiredOnArrival = [];
  const promotions = [];
  const paymentSignals = [];
  // Signal priority still dominates - a payment outranks everything regardless of
  // what has won before - and winner-resemblance breaks ties beneath it.
  const ranked = prioritise(fresh, winners, { priorityOf });
  const ordered = ranked.map((r) => r.signal);
  const similarityById = new Map(ranked.map((r) => [r.signal.signal_id, r.similarity]));

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

    // ---- the payment lane -----------------------------------------------------
    // A payment does not get qualified, scored or routed. It is the outcome, read
    // from the provider, and its only job here is to settle the route that earned
    // it. Sending it through the demand classifier would ask "is this worth acting
    // on?" about money that has already arrived.
    if (signal.signal_type === 'PAYMENT' && carriesVerifiedPayment(signal)) {
      const settled = await settlePayment(signal, { store, known, now });
      promotions.push(...settled.promotions);
      decisions.push({
        signal_id: signal.signal_id,
        subject: signal.subject,
        decision: 'SETTLE_PAYMENT',
        status: settled.status,
        asset_match: settled.asset_id,
        has_live_checkout: true,
        confidence: 1,
        reason: settled.reason,
        classifier: 'payment_provider',
        // Carried onto the decision so the trace's revenue figure is computed from
        // provider evidence rather than from the fact that a decision was made.
        evidence: signal.evidence,
        correlation_id: signal.correlation_id
      });
      paymentSignals.push(settled.signal);
      continue;
    }

    const fit = await fitExistingAsset(signal);
    const enriched = { ...signal, existing_asset_match: fit.match };

    // ---- the observation lane ---------------------------------------------------
    // A human act observed directly enters at the state it was observed in. It is
    // not classified as demand-to-be-actioned, because it is not a request for us to
    // do something - it is a record of what somebody already did. Putting it in the
    // ledger at CHECKOUT is also what lets a payment find it later.
    const observed = admitObservation(enriched, { now });
    if (observed.ok) {
      await store.put({
        ...observed.signal,
        asset_fit: { match: fit.match, score: fit.score ?? null, reason: fit.reason ?? null,
                     has_live_checkout: fit.has_live_checkout ?? false }
      });
      decisions.push({
        signal_id: signal.signal_id,
        correlation_id: signal.correlation_id,
        event_id: signal.event_id,
        subject: signal.subject,
        decision: 'RECORD_OBSERVED_ACT',
        status: observed.signal.status,
        asset_match: fit.match,
        has_live_checkout: fit.has_live_checkout ?? false,
        confidence: signal.confidence,
        reason: observed.signal.transition_reason,
        classifier: 'observation',
        winner_similarity: similarityById.get(signal.signal_id)?.score ?? 0,
        transition_path: [observed.signal.status]
      });
      continue;
    }

    const decision = classifyDeterministic(enriched);
    const mapped = decisionToTransition(decision);

    if (!mapped.ok) {
      failures.push({ stage: 'decision', signal_id: signal.signal_id, errors: mapped.errors });
      continue;
    }

    // Walked, not jumped. The classifier decides ACTION on a signal that is still
    // NEW, and NEW -> ACTIONABLE is not a legal hop - so before this, every such
    // signal stayed at NEW and was never counted as an actionable revenue route.
    // advance() passes it through QUALIFIED and records both steps.
    const moved = advance(enriched, mapped.status, { reason: decision.reason, now });
    const finalSignal = moved.ok ? moved.signal : enriched;
    if (!moved.ok) failures.push({ stage: 'transition', signal_id: signal.signal_id, reason: moved.reason });

    await store.put({
      ...finalSignal,
      asset_fit: { match: fit.match, score: fit.score ?? null, reason: fit.reason ?? null,
                   has_live_checkout: fit.has_live_checkout ?? false }
    });

    decisions.push({
      signal_id: signal.signal_id,
      correlation_id: signal.correlation_id,
      event_id: signal.event_id,
      subject: signal.subject,
      decision: decision.decision,
      status: finalSignal.status,
      asset_match: fit.match,
      has_live_checkout: fit.has_live_checkout ?? false,
      confidence: decision.confidence,
      reason: decision.reason,
      classifier: decision.classifier,
      winner_similarity: similarityById.get(signal.signal_id)?.score ?? 0,
      transition_path: moved.path ?? []
    });

    // An ACTIONABLE signal with a live checkout is the only thing that becomes a
    // revenue-bearing route. Everything else is recorded and left alone.
    if (finalSignal.status === 'ACTIONABLE' && fit.match && fit.has_live_checkout) {
      actions.push({
        signal_id: signal.signal_id,
        // Deterministic, so the same route decided again on a later run is
        // recognisably one action rather than a second attempt at the same buyer.
        action_id: actionId({
          correlation_id: signal.correlation_id,
          asset_id: fit.match,
          action: decision.recommended_action ?? 'ROUTE_TO_OFFER'
        }),
        correlation_id: signal.correlation_id,
        // The event that caused this action. This is the link that lets an outcome
        // arriving hours later be traced back to the decision that produced it.
        causation_id: signal.event_id,
        recommended_action: decision.recommended_action,
        asset_id: fit.match,
        destination: fit.destination,
        checkout_url: fit.checkout_url,
        price: fit.price,
        winner_similarity: similarityById.get(signal.signal_id)?.score ?? 0,
        // Recorded, not executed. Publishing or messaging is a separate, gated step.
        executed: false,
        execution_gate: 'route recorded; dispatch is a separate approved step'
      });
    }
  }

  const trace = makeTrace({
    run_id: runId,
    trigger: SOURCES[SOURCE].describe(flag),
    store_kind: store.kind,
    started_at: startedAt,
    signals_seen: ingested.signals.length,
    signals_new: fresh.length,
    decisions,
    actions,
    failures,
    // The only input to the revenue figure. Payment signals, and nothing else.
    payment_signals: paymentSignals
  });
  trace.suppressed = suppressed;
  trace.expired_on_arrival = expiredOnArrival;
  trace.mode = BACKFILL ? 'BACKFILL' : 'LIVE';
  if (BACKFILL) trace.backfill_ttl_hours = Number(TTL_HOURS);
  trace.invalid = invalid;
  trace.source_url = ingested.source_url;
  trace.refused = refused;
  trace.winners = winners.map((w) => ({
    route_id: w.route_id, asset_id: w.asset_id, wins: w.wins, payment_refs: w.payment_refs
  }));
  trace.exploration = posture;
  trace.promotions = promotions;
  // How many events could actually be joined to something. A run where everything is
  // SELF is a run where attribution is not reaching the boundary, and that is worth
  // seeing on the trace rather than discovering later from a funnel that does not add
  // up.
  trace.correlation_basis = fresh.reduce((acc, s) => {
    acc[s.correlation_basis] = (acc[s.correlation_basis] ?? 0) + 1;
    return acc;
  }, {});

  await writeTrace(trace);

  if (JSON_OUT) { console.log(JSON.stringify(trace, null, 2)); return; }

  log('');
  log('decisions:');
  for (const d of decisions) {
    log(`  ${d.decision.padEnd(15)} ${d.status.padEnd(12)} asset=${d.asset_match ?? '-'} :: ${d.subject.slice(0, 60)}`);
  }
  log('');
  log(`expired on arrival: ${expiredOnArrival.length} (persisted as EXPIRED so they are not re-ingested)`);
  log(`refused by an integrity rule: ${refused.length}`);
  log(`actionable revenue routes: ${actions.length}`);
  log(`routes promoted to WINNER: ${promotions.filter((p) => p.promoted).length}`);
  log(`correlation basis: ${JSON.stringify(trace.correlation_basis)}`);
  log(`verified_revenue: ${trace.verified_revenue} payment(s) ${JSON.stringify(trace.verified_revenue_amount_minor)}  payment_evidence: ${trace.payment_evidence_present}`);
  log(`trace: market/evidence/${trace.run_id}.json`);
}

/**
 * Settle a verified payment against the route that produced it.
 *
 * This is the join the whole correlation vocabulary exists for. The payment carries
 * the `client_reference_id` the page wrote onto the checkout link; the click that
 * produced that link carries the same value, rebuilt from its analytics properties.
 * Both resolve to one correlation_id, so the payment can find its own click without
 * either system having been told about the other.
 *
 * When the join finds nothing the payment is still recorded - the money is real
 * whether or not we can see the click. What does NOT happen is attributing it to the
 * nearest plausible route: an unattributed payment is a measurement gap, and an
 * misattributed one is a wrong answer that looks like a right one.
 */
export async function settlePayment(payment, { store, known, now = Date.now() }) {
  const admitted = admitPayment(payment, { now });
  if (!admitted.ok) {
    return {
      signal: payment,
      status: payment.status,
      asset_id: null,
      reason: `payment not admitted: ${admitted.reason}`,
      promotions: []
    };
  }
  const paid = admitted.signal;
  await store.put(paid);

  // Everything already in the ledger on this chain that is sitting at a checkout.
  const chain = known.filter((s) =>
    s.correlation_id === paid.correlation_id
    && s.signal_id !== paid.signal_id
    && s.status === 'CHECKOUT');

  const promotions = [];
  for (const route of chain) {
    // The route moves on the payment's evidence, not its own. Its own evidence is an
    // analytics event, which by design can never carry anything to PAID.
    const toPaid = transition(route, 'PAID', { evidence: paid.evidence, reason: 'settled by verified payment', now });
    if (!toPaid.ok) continue;

    const promotion = promoteToWinner(toPaid.signal);
    if (!promotion.ok) {
      // Recorded as paid, not promoted. A payment we cannot attribute to a named
      // route must not promote one.
      await store.put({ ...toPaid.signal, causation_id: paid.event_id });
      promotions.push({ signal_id: route.signal_id, promoted: false, reason: promotion.reason });
      continue;
    }

    const toWon = transition(toPaid.signal, 'WON', { evidence: paid.evidence, reason: 'route produced a verified payment', now });
    if (!toWon.ok) {
      promotions.push({ signal_id: route.signal_id, promoted: false, reason: toWon.reason });
      continue;
    }
    const won = {
      ...toWon.signal,
      // Which event caused this promotion, so the win can be traced back to the
      // exact provider record that justified it.
      causation_id: paid.event_id,
      action_id: actionId({
        correlation_id: paid.correlation_id,
        asset_id: promotion.asset_id,
        action: 'PROMOTE_WINNER'
      })
    };
    await store.put(won);
    promotions.push({
      signal_id: route.signal_id,
      promoted: true,
      route_id: promotion.route_id,
      asset_id: promotion.asset_id,
      payment_ref: paid.evidence.ref,
      correlation_id: paid.correlation_id
    });
  }

  return {
    signal: paid,
    status: 'PAID',
    asset_id: promotions.find((p) => p.promoted)?.asset_id ?? null,
    reason: chain.length
      ? `verified payment settled ${promotions.filter((p) => p.promoted).length} of ${chain.length} correlated checkout(s)`
      : 'verified payment recorded; no correlated checkout is in the ledger, so no route is promoted',
    promotions
  };
}

async function writeTrace(trace) {
  const dir = path.join(REPO_ROOT, 'market/evidence');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${trace.run_id}.json`), `${JSON.stringify(trace, null, 2)}\n`);
}

// Only run when invoked as a command. Importing this module - which the settlement
// test does, so that it exercises the shipped function rather than a copy of it -
// must not start a run.
const INVOKED_DIRECTLY = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (INVOKED_DIRECTLY) {
  main().catch((err) => {
    console.error(`MARKET_INGEST_STOP ${err.message}`);
    process.exitCode = 1;
  });
}
