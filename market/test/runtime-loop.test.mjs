// The runtime loop: can one revenue attempt be followed all the way through?
//
// The contract tests next door prove each piece in isolation. These prove the thing
// that actually matters and that no isolated test can see: that a click on a page
// and a payment at Stripe - two events, two systems, no shared key, hours apart -
// land on the same correlation_id and settle each other.
//
// The other half of this file is the set of refusals. Every one of them is a way
// this system could report revenue it does not have, which is the single failure
// mode that would make every other number here worthless.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkoutReference, correlationId, eventId, actionId, resolveCorrelation, sanitizeReference
} from '../lib/correlation.mjs';
import { normalizeSignal, validateSignal, dedupe } from '../lib/signal.mjs';
import { admitObservation, admitPayment, transition, BEHAVIOUR_SOURCES, PAYMENT_PROVIDER_SOURCES } from '../lib/state.mjs';
import { makeEvidence, verifiedRevenue, makeTrace } from '../lib/evidence.mjs';
import {
  carriesVerifiedPayment, explorationPosture, findWinners, prioritise,
  promoteToWinner, similarityToWinners
} from '../lib/winner.mjs';
import { toSignals as posthogSignals } from '../adapters/posthog-events.mjs';
import { toSignals as stripeSignals } from '../adapters/stripe-events.mjs';
import { toSignals as dispatchSignals, eventsFrom } from '../adapters/dispatch-events.mjs';
import { SupabaseLedgerStore, selectStore } from '../lib/store.mjs';
import { priorityOf } from '../lib/signal.mjs';

// ---------------------------------------------------------------- the join

test('a checkout click and the payment it produced share one correlation id', () => {
  // This is the whole point of the file. The page composes client_reference_id from
  // funnel + utm and writes it onto the Stripe link; Stripe hands it back on the
  // session. Neither system was told about the other, and neither knows this join
  // exists - it works because both sides derive the same string from the same facts.
  const props = {
    funnel: 'prompt-store',
    utm_source: 'owned_media',
    utm_campaign: 'international_personal_media',
    utm_content: 'repeat-visit-sites-win-owner-package:structural_reflection',
    cta_id: 'prompt_store_offer_checkout',
    path: '/prompt-store/'
  };
  const reference = checkoutReference(props);

  const [click] = posthogSignals([{
    uuid: 'ph-1', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z', properties: props
  }]).signals;

  const [payment] = stripeSignals([{
    id: 'cs_test_join', object: 'checkout.session', payment_status: 'paid',
    amount_total: 1700, currency: 'usd', created: 1757239200,
    client_reference_id: reference
  }]).signals;

  assert.equal(click.correlation_id, payment.correlation_id,
    'the click and the payment must resolve to one chain or nothing downstream can join them');
  assert.equal(click.correlation_basis, 'BOUNDARY_REFERENCE');
  assert.equal(payment.correlation_basis, 'BOUNDARY_REFERENCE');
  assert.equal(click.correlation_id, correlationId(reference));
});

test('an event that joins to nothing starts its own chain rather than sharing a bucket', () => {
  // The failure mode being pinned: if unattributable events all fell back to the
  // same empty-string key, they would look like one enormous revenue attempt.
  const a = posthogSignals([{ uuid: 'x', event: 'primary_cta_click', timestamp: '2026-09-07T10:00:00.000Z', properties: {} }]).signals[0];
  const b = posthogSignals([{ uuid: 'y', event: 'primary_cta_click', timestamp: '2026-09-07T10:00:01.000Z', properties: {} }]).signals[0];

  assert.equal(a.correlation_basis, 'SELF');
  assert.equal(b.correlation_basis, 'SELF');
  assert.notEqual(a.correlation_id, b.correlation_id,
    'two unattributable events must not be merged into one chain');
});

test('the reference is rebuilt exactly the way the page builds it', () => {
  // scos-analytics.js: clean(raw,200) -> non [A-Za-z0-9_-] to '_' -> collapse '_'
  // runs -> strip edges. If this drifts, the join stops working and nothing fails.
  assert.equal(sanitizeReference('a b/c!!d'), 'a_b_c_d');
  assert.equal(sanitizeReference('__lead__'), 'lead');
  assert.equal(sanitizeReference('keep-me_1'), 'keep-me_1');
  // An explicit route_id wins over the composed form, as on the page.
  assert.equal(checkoutReference({ route_id: 'explicit route', funnel: 'ignored' }), 'explicit_route');
  assert.equal(checkoutReference({}), null, 'nothing stable to build from must be null, not an empty key');
});

test('an event id is stable across redeliveries and unique across sources', () => {
  assert.equal(eventId({ source: 'stripe', source_event_id: 'cs_1' }),
               eventId({ source: 'stripe', source_event_id: 'cs_1' }));
  assert.notEqual(eventId({ source: 'stripe', source_event_id: 'cs_1' }),
                  eventId({ source: 'posthog', source_event_id: 'cs_1' }));
  assert.throws(() => eventId({ source: 'stripe' }), /source_event_id/,
    'without the upstream id every retry would look like new demand');
});

test('an event may not be its own cause', () => {
  const signal = posthogSignals([{
    uuid: 'ph-self', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z', properties: {}
  }]).signals[0];
  const errors = validateSignal({ ...signal, causation_id: signal.event_id });
  assert.ok(errors.some((e) => /own cause/.test(e)));
});

test('the chain ids are required, not optional decoration', () => {
  const signal = stripeSignals([{ id: 'cs_req', payment_status: 'paid', created: 1 }]).signals[0];
  for (const field of ['event_id', 'source_event_id', 'correlation_id']) {
    const errors = validateSignal({ ...signal, [field]: null });
    assert.ok(errors.some((e) => e.includes(field)), `${field} must be required`);
  }
});

// ---------------------------------------------------------------- settlement

const paidSession = (over = {}) => stripeSignals([{
  id: 'cs_settle', object: 'checkout.session', payment_status: 'paid',
  amount_total: 6900, currency: 'usd', created: 1757239200,
  client_reference_id: 'prompt_store_owned_media', ...over
}]).signals[0];

test('a payment read from the provider is admitted at PAID without inventing a click', () => {
  const admitted = admitPayment(paidSession());
  assert.equal(admitted.ok, true);
  assert.equal(admitted.signal.status, 'PAID');
});

test('admission is the payment provider only - the bus cannot use it', () => {
  const payment = paidSession();
  // The exact attack: relay a Stripe-shaped payload through Make and claim the same
  // authority as a direct read.
  const relayed = { ...payment, source: 'dispatch:stripe' };
  const refused = admitPayment(relayed);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /not a payment provider/);
  assert.deepEqual(PAYMENT_PROVIDER_SOURCES, ['stripe']);
});

test('admission never opens a general NEW -> PAID door', () => {
  const click = posthogSignals([{
    uuid: 'ph-2', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z',
    properties: { funnel: 'prompt-store' }
  }]).signals[0];

  assert.equal(admitPayment(click).ok, false, 'a CHECKOUT signal is not a payment record');
  // And the state machine itself is unchanged: the click still cannot walk there.
  assert.equal(transition({ ...click, status: 'NEW' }, 'PAID', { evidence: click.evidence }).ok, false);
});

test('an unpaid session is refused admission however it is dressed up', () => {
  const unpaid = stripeSignals([{ id: 'cs_open', payment_status: 'unpaid', created: 1 }]).signals[0];
  assert.equal(admitPayment(unpaid).ok, false);
  assert.equal(carriesVerifiedPayment(unpaid), false);

  // Forging the status on the signal does not help: the gate reads the evidence.
  assert.equal(admitPayment({ ...unpaid, signal_type: 'PAYMENT' }).ok, false);
});

test('a verified payment settles the correlated checkout, and only that one', () => {
  const payment = admitPayment(paidSession()).signal;

  const mine = {
    signal_id: 'sig_' + 'a'.repeat(32), status: 'CHECKOUT',
    correlation_id: payment.correlation_id, route_id: 'prompt_store_offer_checkout',
    existing_asset_match: 'ai-workflow-operator-bundle',
    evidence: { kind: 'ANALYTICS_EVENT', ref: 'posthog:1' }
  };
  const unrelated = { ...mine, signal_id: 'sig_' + 'b'.repeat(32), correlation_id: correlationId('somewhere-else') };

  const settled = transition(mine, 'PAID', { evidence: payment.evidence });
  assert.equal(settled.ok, true, 'the correlated checkout settles on the payment evidence');
  assert.notEqual(unrelated.correlation_id, payment.correlation_id,
    'an unrelated chain must not be settled by this payment');

  const won = transition(settled.signal, 'WON', { evidence: payment.evidence });
  assert.equal(won.ok, true);
  assert.equal(won.signal.status, 'WON');
});

test('the promoted route carries the payment that caused it', () => {
  const payment = admitPayment(paidSession()).signal;
  const route = {
    status: 'PAID', route_id: 'prompt_store_offer_checkout',
    existing_asset_match: 'ai-workflow-operator-bundle', evidence: payment.evidence
  };
  const promotion = promoteToWinner(route);
  assert.equal(promotion.ok, true);
  assert.equal(promotion.asset_id, 'ai-workflow-operator-bundle');

  const id = actionId({ correlation_id: payment.correlation_id, asset_id: promotion.asset_id, action: 'PROMOTE_WINNER' });
  assert.match(id, /^act_[0-9a-f]{32}$/);
  assert.equal(id, actionId({ correlation_id: payment.correlation_id, asset_id: promotion.asset_id, action: 'PROMOTE_WINNER' }),
    'deciding the same route twice must be one action, not two attempts at the buyer');
});

test('a payment that cannot name its route promotes nothing', () => {
  const payment = admitPayment(paidSession({ client_reference_id: null })).signal;
  const orphan = { status: 'PAID', route_id: null, existing_asset_match: null, evidence: payment.evidence };
  const promotion = promoteToWinner(orphan);
  assert.equal(promotion.ok, false);
  assert.match(promotion.reason, /cannot name/,
    'money with no identifiable route is a measurement gap, not a licence to promote a guess');
});

// ---------------------------------------------------------------- winners

const winningSignal = (over = {}) => ({
  status: 'WON', route_id: 'prompt_store_offer_checkout',
  existing_asset_match: 'ai-workflow-operator-bundle',
  correlation_id: correlationId('prompt_store_owned_media'),
  evidence: makeEvidence('PAYMENT_PROVIDER', {
    ref: 'cs_win', provider: 'stripe', payment_status: 'paid', amount_minor: 1700, currency: 'usd'
  }),
  ...over
});

test('nothing is a winner until a payment provider says money moved', () => {
  const nearly = [
    { status: 'WON', route_id: 'r', evidence: { kind: 'ANALYTICS_EVENT', ref: 'a lot of clicks' } },
    { status: 'CHECKOUT', route_id: 'r', evidence: winningSignal().evidence },
    { status: 'WON', route_id: 'r', evidence: { kind: 'MODEL_ASSERTION', ref: 'I am confident' } },
    { status: 'WON', route_id: 'r', evidence: { kind: 'PAYMENT_PROVIDER', provider: 'stripe', ref: 'cs_x', payment_status: 'unpaid' } }
  ];
  assert.deepEqual(findWinners(nearly), [],
    'a click, an open checkout and a confident model are all still zero winners');
  assert.equal(explorationPosture(findWinners(nearly)).explore, true);
});

test('a real win closes exploration, and says so out loud', () => {
  const winners = findWinners([winningSignal()]);
  assert.equal(winners.length, 1);
  assert.equal(winners[0].asset_id, 'ai-workflow-operator-bundle');
  assert.deepEqual(winners[0].payment_refs, ['cs_win']);

  const posture = explorationPosture(winners);
  assert.equal(posture.explore, false);
  assert.match(posture.reason, /verified payments/);
  // Recorded rather than silent: a behaviour change nobody can point at is not a
  // decision, it is a drift.
  assert.deepEqual(posture.winning_routes, ['prompt_store_offer_checkout']);
});

test('resemblance to a winner breaks ties but never outranks a payment', () => {
  const winners = findWinners([winningSignal()]);

  const lookalike = { signal_type: 'MARKET', existing_asset_match: 'ai-workflow-operator-bundle' };
  const stranger = { signal_type: 'MARKET', existing_asset_match: 'something-else' };
  const payment = { signal_type: 'PAYMENT', existing_asset_match: 'something-else' };

  assert.equal(similarityToWinners(lookalike, winners).score, 40);
  assert.equal(similarityToWinners(stranger, winners).score, 0);

  const order = prioritise([stranger, lookalike, payment], winners, { priorityOf }).map((r) => r.signal);
  assert.equal(order[0], payment, 'a live payment is read before anything that merely resembles a past win');
  assert.equal(order[1], lookalike, 'among equals, the one that looks like a winner goes first');
});

// ---------------------------------------------------------------- the bus

test('the event bus may not assert a payment', () => {
  const { signals, refused } = dispatchSignals({
    events: [{
      signal_type: 'PAYMENT', source: 'stripe', source_event_id: 'evt_forged',
      subject: 'we definitely got paid', demand_type: 'EXPLICIT_PURCHASE',
      revenue_distance: 'PAID', confidence: 1
    }]
  });
  assert.deepEqual(signals, []);
  assert.equal(refused[0].reason, 'BUS_MAY_NOT_ASSERT_PAYMENT');
});

test('the event bus may not supply payment-provider evidence', () => {
  const { signals, refused } = dispatchSignals({
    events: [{
      signal_type: 'HUMAN_SIGNAL', source: 'make', source_event_id: 'b1', subject: 'a click',
      evidence: { kind: 'PAYMENT_PROVIDER', provider: 'stripe', ref: 'cs_forged', payment_status: 'paid' }
    }]
  });
  assert.deepEqual(signals, []);
  assert.equal(refused[0].reason, 'BUS_MAY_NOT_SUPPLY_PAYMENT_EVIDENCE');
});

test('the event bus may not deliver a signal that has already skipped ahead', () => {
  const { refused } = dispatchSignals({
    events: [{ signal_type: 'HUMAN_SIGNAL', source: 'make', source_event_id: 'b2', subject: 'x', status: 'ACTIONABLE' }]
  });
  assert.equal(refused[0].reason, 'BUS_MAY_NOT_SET_STATE');
});

test('a dispatch with no upstream id is refused rather than given a minted one', () => {
  const { refused } = dispatchSignals({
    events: [{ signal_type: 'MARKET', source: 'make', subject: 'something happened' }]
  });
  assert.equal(refused[0].reason, 'NO_UPSTREAM_EVENT_ID');
});

test('a legitimate relayed event is accepted, namespaced, and keeps its chain', () => {
  const upstream = correlationId('owned_media_campaign');
  const { signals, refused } = dispatchSignals({
    events: [{
      signal_type: 'BUYER_DEMAND', source: 'reddit', source_event_id: 'make-exec-99',
      subject: 'someone is asking for exactly this', demand_type: 'EXPLICIT_INTENT',
      revenue_distance: 'MID', confidence: 0.6, correlation_id: upstream,
      causation_id: eventId({ source: 'make', source_event_id: 'parent-1' })
    }]
  }, { dispatchId: 'disp-1' });

  assert.deepEqual(refused, []);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].source, 'dispatch:reddit',
    'a relayed event must be distinguishable from one this system read itself');
  assert.equal(signals[0].correlation_id, upstream, 'a chain Make already started is not severed');
  assert.equal(signals[0].correlation_basis, 'UPSTREAM');
  assert.equal(signals[0].evidence.kind, 'PLATFORM_PAYLOAD');
  assert.equal(signals[0].status, 'NEW');
  assert.deepEqual(validateSignal(signals[0]), []);
});

test('a pointer-only dispatch is not turned into a hollow signal', () => {
  // The shape documented in MAKE-HANDOFF.md: a reference to state Make already
  // holds. It is not an event and must not become one.
  assert.deepEqual(eventsFrom({ signal_id: 'sig_' + '0'.repeat(32), requested_engine: 'deploy' }), []);
});

test('the same relayed event twice is one signal', () => {
  const event = {
    signal_type: 'MARKET', source: 'reddit', source_event_id: 'make-exec-100',
    subject: 'the same thing said twice', confidence: 0.2
  };
  const first = dispatchSignals({ events: [event] }).signals[0];
  const second = dispatchSignals({ events: [event] }, { now: Date.now() + 60000 }).signals[0];

  assert.equal(first.signal_id, second.signal_id);
  assert.equal(first.event_id, second.event_id);
  const { fresh, suppressed } = dedupe([second], [first]);
  assert.deepEqual(fresh, []);
  assert.equal(suppressed[0].reason, 'ALREADY_KNOWN');
});

// ---------------------------------------------------------------- revenue

test('with no payment evidence the answer is a hard zero', () => {
  const clicks = posthogSignals([
    { uuid: '1', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z', properties: { funnel: 'a' } },
    { uuid: '2', event: 'checkout_click', timestamp: '2026-09-07T10:00:01.000Z', properties: { funnel: 'b' } }
  ]).signals;

  const revenue = verifiedRevenue(clicks);
  assert.equal(revenue.payments, 0);
  assert.equal(revenue.payment_evidence_present, false);
  assert.deepEqual(revenue.amount_minor_by_currency, {});
});

test('an open checkout session contributes nothing, and carries no amount at all', () => {
  const [open] = stripeSignals([{
    id: 'cs_abandoned', payment_status: 'unpaid', amount_total: 6900, currency: 'usd', created: 1
  }]).signals;
  assert.equal(open.evidence.amount_minor, undefined,
    'an amount on an unpaid record is a number that looks like revenue');
  assert.equal(verifiedRevenue([open]).payments, 0);
});

test('a real payment is counted, in the provider units, with its reference', () => {
  const [paid] = stripeSignals([{
    id: 'cs_real', payment_status: 'paid', amount_total: 6900, currency: 'usd', created: 1
  }]).signals;
  const revenue = verifiedRevenue([paid]);
  assert.equal(revenue.payments, 1);
  assert.deepEqual(revenue.amount_minor_by_currency, { usd: 6900 });
  assert.deepEqual(revenue.payment_refs, ['cs_real']);
});

test('a payment whose amount we do not know is not silently counted as zero', () => {
  const evidence = makeEvidence('PAYMENT_PROVIDER', { ref: 'pi_1', provider: 'stripe', payment_status: 'paid' });
  const revenue = verifiedRevenue([{ evidence }]);
  assert.equal(revenue.payments, 1);
  assert.equal(revenue.unpriced_payments, 1,
    '"money we cannot size" is a different claim from "no money"');
  assert.deepEqual(revenue.amount_minor_by_currency, {});
});

test('amounts are never added across currencies', () => {
  const rows = [
    { evidence: makeEvidence('PAYMENT_PROVIDER', { ref: 'a', provider: 'stripe', payment_status: 'paid', amount_minor: 1700, currency: 'usd' }) },
    { evidence: makeEvidence('PAYMENT_PROVIDER', { ref: 'b', provider: 'stripe', payment_status: 'paid', amount_minor: 2500, currency: 'jpy' }) }
  ];
  assert.deepEqual(verifiedRevenue(rows).amount_minor_by_currency, { usd: 1700, jpy: 2500 });
});

test('a run trace reports revenue only from the payment signals it was given', () => {
  const clean = makeTrace({ run_id: 'run_1', trigger: 't', started_at: new Date().toISOString() });
  assert.equal(clean.verified_revenue, 0);
  assert.equal(clean.payment_evidence_present, false);

  const [paid] = stripeSignals([{ id: 'cs_t', payment_status: 'paid', amount_total: 1700, currency: 'usd', created: 1 }]).signals;
  const withMoney = makeTrace({
    run_id: 'run_2', trigger: 't', started_at: new Date().toISOString(), payment_signals: [paid]
  });
  assert.equal(withMoney.verified_revenue, 1);
  assert.deepEqual(withMoney.payment_refs, ['cs_t']);
});

// ---------------------------------------------------------------- the ledger

test('the durable ledger is preferred over the bus cache when both are configured', () => {
  const store = selectStore({
    env: {
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      MARKET_STATE_ENDPOINT: 'https://hook.make.com/x',
      MARKET_STATE_SECRET: 'shh'
    }
  });
  assert.equal(store.kind, 'SUPABASE_LEDGER',
    'the authoritative copy must not sit behind the convenient one');
});

test('the bus cache is still used when there is no ledger', () => {
  const store = selectStore({ env: { MARKET_STATE_ENDPOINT: 'https://hook.make.com/x', MARKET_STATE_SECRET: 'shh' } });
  assert.equal(store.kind, 'MAKE_DATA_STORE');
});

test('nothing configured is BLOCKED, never a silent local write', () => {
  assert.equal(selectStore({ env: {} }).configured, false);
  assert.equal(selectStore({ env: {} }).kind, 'UNCONFIGURED');
});

test('the ledger upserts on the deterministic id so a retry is not a second row', async () => {
  const calls = [];
  const store = new SupabaseLedgerStore({
    url: 'https://project.supabase.co/', key: 'k', table: 'market_event_ledger',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 201, json: async () => [], text: async () => '' };
    }
  });

  const [paid] = stripeSignals([{ id: 'cs_led', payment_status: 'paid', amount_total: 1700, currency: 'usd', created: 1 }]).signals;
  await store.put(paid);

  assert.match(calls[0].url, /on_conflict=signal_id/);
  assert.match(calls[0].init.headers.Prefer, /resolution=merge-duplicates/);

  const [row] = JSON.parse(calls[0].init.body);
  // Queryable columns for the chain, with the whole signal kept intact alongside so
  // a field the schema does not know about survives the round trip.
  for (const column of ['signal_id', 'event_id', 'correlation_id', 'route_id', 'status']) {
    assert.ok(column in row, `${column} must be a queryable column`);
  }
  assert.deepEqual(row.payload, paid);
});

test('a ledger read returns the payload, not the projection', async () => {
  const [paid] = stripeSignals([{ id: 'cs_read', payment_status: 'paid', amount_total: 1700, currency: 'usd', created: 1 }]).signals;
  const store = new SupabaseLedgerStore({
    url: 'https://project.supabase.co', key: 'k',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => [{ signal_id: paid.signal_id, payload: paid }], text: async () => '' })
  });
  assert.deepEqual(await store.all(), [paid]);
});

test('an unconfigured ledger fails as AUTH rather than writing somewhere else', async () => {
  const store = new SupabaseLedgerStore({ url: null, key: null });
  assert.equal(store.configured, false);
  await assert.rejects(() => store.all(), (err) => err.failure_class === 'AUTH');
});

// ---------------------------------------------------------------- ordering

test('resolveCorrelation refuses an upstream id that is not really one', () => {
  assert.throws(() => resolveCorrelation({ correlation_id: 'whatever-make-felt-like' }), /cor_/,
    'a free-form string would join nothing while looking as if it did');
});

test('normalisation keeps an id the upstream already assigned', () => {
  const upstream = correlationId('a-chain-make-started');
  const signal = normalizeSignal({
    signal_type: 'MARKET', source: 'test', external_id: 'e1', subject: 's',
    correlation_id: upstream, correlation_ref: 'something-else-entirely'
  });
  assert.equal(signal.correlation_id, upstream,
    'a live chain is never re-rooted by a reference that arrived later');
});

// ---------------------------------------------------------------- the walk

test('a signal the classifier calls ACTION can actually become ACTIONABLE', async () => {
  // The defect this pins: the deterministic classifier returns ACTION on a signal
  // that is still NEW, and NEW -> ACTIONABLE is not a legal hop. The transition
  // failed, the signal stayed NEW, and a qualified buyer sat in the store where
  // nothing downstream counted it as a revenue route.
  const { advance } = await import('../lib/state.mjs');
  const signal = { status: 'NEW', evidence: { kind: 'PLATFORM_PAYLOAD', ref: 'x' } };

  assert.equal(transition(signal, 'ACTIONABLE').ok, false, 'the direct hop is still illegal');

  const walked = advance(signal, 'ACTIONABLE', { reason: 'explicit intent with a live checkout' });
  assert.equal(walked.ok, true);
  assert.equal(walked.signal.status, 'ACTIONABLE');
  assert.deepEqual(walked.path, ['QUALIFIED', 'ACTIONABLE'],
    'qualification must be recorded as a step, not deleted to make the hop legal');
});

test('the walk can never reach a money state', async () => {
  const { advance } = await import('../lib/state.mjs');
  const paidEvidence = makeEvidence('PAYMENT_PROVIDER', { ref: 'cs_1', provider: 'stripe', payment_status: 'paid' });

  for (const target of ['PAID', 'WON']) {
    const attempt = advance({ status: 'NEW', evidence: paidEvidence }, target);
    assert.equal(attempt.ok, false, `${target} must not be reachable by walking`);
    assert.match(attempt.reason, /one explicit guarded step/);
  }
});

test('the walk refuses what is genuinely illegal instead of finding a way round', async () => {
  const { advance } = await import('../lib/state.mjs');
  assert.equal(advance({ status: 'WON' }, 'ACTIONABLE').ok, false, 'terminal is terminal');
  assert.equal(advance({ status: 'KILLED' }, 'QUALIFIED').ok, false);
});

// ---------------------------------------------------------------- settlement, end to end

test('a payment settles the click that earned it, through the shipped code path', async () => {
  // This imports the CLI's own settlePayment rather than reproducing it, so what is
  // proven here is the behaviour that actually runs in a workflow.
  const { settlePayment } = await import('../cli/ingest.mjs');

  const props = {
    funnel: 'prompt-store', utm_source: 'owned_media',
    utm_campaign: 'international_personal_media', utm_content: 'hero',
    cta_id: 'prompt_store_offer_checkout', product: 'ai-workflow-operator-bundle'
  };

  // 1. A human clicks the checkout link. PostHog sees it; Stripe does not, yet.
  const click = posthogSignals([{
    uuid: 'ph-e2e', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z', properties: props
  }]).signals[0];
  // The click enters at CHECKOUT because that is where it was observed - not walked
  // there through ACTIONED, which would claim this system took an action it did not.
  const atCheckout = admitObservation(click);
  assert.equal(atCheckout.ok, true);
  assert.equal(atCheckout.signal.status, 'CHECKOUT');
  const known = [{ ...atCheckout.signal, existing_asset_match: 'ai-workflow-operator-bundle' }];

  // 2. Later, and entirely independently, Stripe reports the session as paid.
  const payment = stripeSignals([{
    id: 'cs_e2e', object: 'checkout.session', payment_status: 'paid',
    amount_total: 1700, currency: 'usd', created: 1757239200,
    client_reference_id: checkoutReference(props)
  }]).signals[0];

  const written = [];
  const store = { put: async (s) => { written.push(s); return s; } };
  const settled = await settlePayment(payment, { store, known });

  assert.equal(settled.status, 'PAID');
  assert.equal(settled.promotions.length, 1);
  assert.equal(settled.promotions[0].promoted, true);
  assert.equal(settled.promotions[0].asset_id, 'ai-workflow-operator-bundle');
  assert.equal(settled.promotions[0].payment_ref, 'cs_e2e');

  const won = written.find((s) => s.status === 'WON');
  assert.ok(won, 'the click that earned the payment must end at WON');
  assert.equal(won.causation_id, payment.event_id,
    'the win must point back at the exact provider record that justified it');
  assert.match(won.action_id, /^act_[0-9a-f]{32}$/);

  // And the win is now visible as a winner, which closes exploration.
  const winners = findWinners([won]);
  assert.equal(winners.length, 1);
  assert.equal(explorationPosture(winners).explore, false);
});

test('a payment does not settle a checkout on a different chain', async () => {
  const { settlePayment } = await import('../cli/ingest.mjs');

  const payment = stripeSignals([{
    id: 'cs_other', payment_status: 'paid', amount_total: 1700, currency: 'usd',
    created: 1, client_reference_id: 'chain_a'
  }]).signals[0];

  const known = [{
    signal_id: 'sig_' + 'c'.repeat(32), status: 'CHECKOUT',
    correlation_id: correlationId('chain_b'), route_id: 'somebody_elses_route',
    existing_asset_match: 'some-other-asset',
    evidence: { kind: 'ANALYTICS_EVENT', ref: 'posthog:z' }
  }];

  const written = [];
  const settled = await settlePayment(payment, { store: { put: async (s) => written.push(s) }, known });

  assert.deepEqual(settled.promotions, [], 'a payment must not promote a route it did not earn');
  assert.match(settled.reason, /no correlated checkout/);
  assert.equal(written.filter((s) => s.status === 'WON').length, 0);
  // The money is still recorded. Unattributed is not the same as unreal.
  assert.equal(settled.status, 'PAID');
});

test('an unpaid session settles nothing even when it is on the right chain', async () => {
  const { settlePayment } = await import('../cli/ingest.mjs');

  const open = stripeSignals([{
    id: 'cs_open_chain', payment_status: 'unpaid', amount_total: 1700, currency: 'usd',
    created: 1, client_reference_id: 'chain_a'
  }]).signals[0];

  const known = [{
    signal_id: 'sig_' + 'd'.repeat(32), status: 'CHECKOUT',
    correlation_id: correlationId('chain_a'), route_id: 'r',
    existing_asset_match: 'a', evidence: { kind: 'ANALYTICS_EVENT', ref: 'posthog:y' }
  }];

  const written = [];
  const settled = await settlePayment(open, { store: { put: async (s) => written.push(s) }, known });
  assert.deepEqual(settled.promotions, []);
  assert.match(settled.reason, /not admitted/);
  assert.deepEqual(written, [], 'an open checkout must not write anything as settled');
});

// ---------------------------------------------------------------- observation guards

test('an observed act enters at the state it was observed in, not one we invented', () => {
  const [click] = posthogSignals([{
    uuid: 'ph-obs', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z',
    properties: { funnel: 'prompt-store' }
  }]).signals;
  const [cta] = posthogSignals([{
    uuid: 'ph-cta', event: 'primary_cta_click', timestamp: '2026-09-07T10:00:00.000Z',
    properties: { funnel: 'prompt-store' }
  }]).signals;

  assert.equal(admitObservation(click).signal.status, 'CHECKOUT');
  assert.equal(admitObservation(cta).signal.status, 'HUMAN_SIGNAL');
});

test('only a source of observed behaviour may admit an observation', () => {
  const [click] = posthogSignals([{
    uuid: 'ph-src', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z', properties: {}
  }]).signals;

  // The same event relayed through the bus is a claim about an observation, not one.
  const relayed = admitObservation({ ...click, source: 'dispatch:posthog' });
  assert.equal(relayed.ok, false);
  assert.match(relayed.reason, /not a source of observed behaviour/);
  assert.deepEqual(BEHAVIOUR_SOURCES, ['posthog']);
});

test('observation admission is not a route to a money state', () => {
  const [click] = posthogSignals([{
    uuid: 'ph-money', event: 'checkout_click', timestamp: '2026-09-07T10:00:00.000Z', properties: {}
  }]).signals;

  // Even carrying forged payment evidence, an analytics event admits as CHECKOUT at
  // most - and here it is refused outright, because the evidence is not analytics.
  const forged = admitObservation({
    ...click,
    evidence: makeEvidence('PAYMENT_PROVIDER', { ref: 'cs_f', provider: 'stripe', payment_status: 'paid' })
  });
  assert.equal(forged.ok, false);
  assert.match(forged.reason, /analytics evidence/);

  // And a PAYMENT-typed signal can never come through this door at all.
  assert.equal(admitObservation({ ...click, signal_type: 'PAYMENT' }).ok, false);
});
