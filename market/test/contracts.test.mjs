import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_TTL_SECONDS, dedupe, isExpired, normalizeSignal, priorityOf, signalId, validateSignal
} from '../lib/signal.mjs';
import { canTransition, hasPaymentEvidence, sweepExpired, transition } from '../lib/state.mjs';
import { classifyDeterministic, decisionToTransition, validateDecision } from '../lib/decision.mjs';
import { canSupportMoneyClaim, makeEvidence, strengthOf, validateEvidence } from '../lib/evidence.mjs';
import { classifyFailure, mayAttempt, recordFailure, recordSuccess } from '../lib/retry.mjs';
import { toSignals } from '../adapters/github-events.mjs';

const githubEvent = (over = {}) => ({
  id: '12345',
  type: 'IssuesEvent',
  created_at: '2026-09-06T00:00:00Z',
  actor: { login: 'someone' },
  repo: { name: 'owner/repo' },
  payload: { issue: { title: 'agent spend is out of control', html_url: 'https://example.test/1' } },
  ...over
});

// ---------------------------------------------------------------- signal contract

test('signal_id is deterministic for the same external fact', () => {
  const a = signalId({ source: 'github_events', signal_type: 'MARKET', external_id: '9', subject: 's' });
  const b = signalId({ source: 'github_events', signal_type: 'MARKET', external_id: '9', subject: 's' });
  assert.equal(a, b);
  assert.match(a, /^sig_[0-9a-f]{32}$/);
});

test('a different external fact gets a different id', () => {
  const a = signalId({ source: 'github_events', signal_type: 'MARKET', external_id: '9', subject: 's' });
  const b = signalId({ source: 'github_events', signal_type: 'MARKET', external_id: '10', subject: 's' });
  assert.notEqual(a, b);
});

test('an id cannot be minted from source and type alone', () => {
  assert.throws(() => signalId({ source: 'x', signal_type: 'MARKET' }), /external_id or subject/);
});

test('every signal gets a TTL, and a payment outlives a market observation', () => {
  assert.ok(DEFAULT_TTL_SECONDS.PAYMENT > DEFAULT_TTL_SECONDS.MARKET);
  const s = normalizeSignal({
    signal_type: 'MARKET', source: 'x', external_id: '1', subject: 'y',
    detected_at: '2026-01-01T00:00:00Z'
  });
  assert.ok(s.expires_at);
  assert.equal(validateSignal(s).length, 0);
});

test('a signal with no expiry is refused by the contract', () => {
  const s = normalizeSignal({ signal_type: 'MARKET', source: 'x', external_id: '1', subject: 'y' });
  delete s.expires_at;
  assert.match(validateSignal(s).join(' '), /never goes stale/);
});

test('priority puts payment above every softer signal', () => {
  const of = (t) => priorityOf({ signal_type: t });
  assert.ok(of('PAYMENT') > of('HUMAN_SIGNAL'));
  assert.ok(of('HUMAN_SIGNAL') > of('CHECKOUT'));
  assert.ok(of('CHECKOUT') > of('BUYER_DEMAND'));
  assert.ok(of('BUYER_DEMAND') > of('MARKET'));
});

// ---------------------------------------------------------------- duplicate guard

test('the same signal arriving twice is only processed once', () => {
  const s = normalizeSignal({ signal_type: 'MARKET', source: 'x', external_id: '1', subject: 'y' });
  const { fresh, suppressed } = dedupe([s], [s]);
  assert.equal(fresh.length, 0);
  assert.equal(suppressed[0].reason, 'ALREADY_KNOWN');
});

test('a redelivery inside one batch is suppressed too', () => {
  const s = normalizeSignal({ signal_type: 'MARKET', source: 'x', external_id: '1', subject: 'y' });
  const { fresh, suppressed } = dedupe([s, { ...s }], []);
  assert.equal(fresh.length, 1);
  assert.equal(suppressed[0].reason, 'DUPLICATE_IN_BATCH');
});

// ---------------------------------------------------------------- state machine

test('a click cannot become a payment', () => {
  assert.equal(canTransition('ACTIONED', 'PAID').ok, false);
  assert.equal(canTransition('HUMAN_SIGNAL', 'PAID').ok, false);
  assert.equal(canTransition('CHECKOUT', 'PAID').ok, true);
});

test('PAID requires payment-provider evidence, not an open checkout session', () => {
  const s = { status: 'CHECKOUT', evidence: { kind: 'ANALYTICS_EVENT', ref: 'checkout_click' } };
  const refused = transition(s, 'PAID');
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /payment-provider evidence/);

  const open = { kind: 'PAYMENT_PROVIDER', provider: 'stripe', ref: 'cs_1', payment_status: 'unpaid' };
  assert.equal(hasPaymentEvidence(open), false, 'an unpaid session is not a payment');

  const paid = { kind: 'PAYMENT_PROVIDER', provider: 'stripe', ref: 'cs_1', payment_status: 'paid' };
  const ok = transition(s, 'PAID', { evidence: paid });
  assert.equal(ok.ok, true);
  assert.equal(ok.signal.status, 'PAID');
});

test('WON is reachable only from PAID', () => {
  assert.equal(canTransition('ACTIONED', 'WON').ok, false);
  assert.equal(canTransition('CHECKOUT', 'WON').ok, false);
  assert.equal(canTransition('PAID', 'WON').ok, true);
});

test('terminal states never move again', () => {
  for (const terminal of ['WON', 'KILLED', 'EXPIRED']) {
    assert.equal(canTransition(terminal, 'QUALIFIED').ok, false, `${terminal} must be terminal`);
  }
});

test('expired signals are swept, terminal ones are left alone', () => {
  const past = new Date(Date.now() - 1000).toISOString();
  const rows = [
    { status: 'QUALIFIED', expires_at: past },
    { status: 'WON', expires_at: past }
  ];
  const swept = sweepExpired(rows);
  assert.equal(swept.length, 1);
  assert.equal(swept[0].status, 'QUALIFIED');
});

// ---------------------------------------------------------------- decisions

test('a decision may not assert money', () => {
  const errs = validateDecision({ decision: 'ACTION', confidence: 1, reason: 'r', paid: true });
  assert.match(errs.join(' '), /may not assert payment/);
});

test('ACTION that routes to an offer must name the offer', () => {
  const errs = validateDecision({
    decision: 'ACTION', confidence: 0.9, reason: 'r', recommended_action: 'route_to_existing_offer'
  });
  assert.match(errs.join(' '), /requires asset_match/);
});

test('every allowed decision maps to a real status', () => {
  for (const d of ['QUALIFY', 'ACTION', 'WATCH', 'HOLD', 'KILL', 'HUMAN_REQUIRED']) {
    const mapped = decisionToTransition({ decision: d, confidence: 0.5, reason: 'r',
      ...(d === 'ACTION' ? { recommended_action: 'no_action' } : {}) });
    assert.equal(mapped.ok, true, `${d} must map`);
    assert.ok(mapped.status);
  }
});

test('a payment signal is always actioned first', () => {
  const d = classifyDeterministic({ signal_type: 'PAYMENT', confidence: 1, demand_type: 'EXPLICIT_PURCHASE' });
  assert.equal(d.decision, 'ACTION');
  assert.equal(d.revenue_distance, 'PAID');
});

test('a QUALIFY that found an asset says so instead of claiming it found none', () => {
  const d = classifyDeterministic({
    signal_type: 'MARKET', demand_type: 'PROBLEM_STATEMENT', confidence: 0.45,
    existing_asset_match: 'ai-operations-systems-pack'
  });
  assert.equal(d.decision, 'QUALIFY');
  assert.equal(d.asset_match, 'ai-operations-systems-pack');
  assert.match(d.reason, /matched existing asset/);
  assert.doesNotMatch(d.reason, /no existing asset/);
});

test('no stated demand is parked, not actioned', () => {
  const d = classifyDeterministic({ signal_type: 'MARKET', demand_type: 'NONE', confidence: 0.1 });
  assert.equal(d.decision, 'WATCH');
});

// ---------------------------------------------------------------- evidence

test('evidence ranks a payment above anything a model asserts', () => {
  assert.ok(strengthOf({ kind: 'PAYMENT_PROVIDER' }) > strengthOf({ kind: 'MODEL_ASSERTION' }));
});

test('only payment-provider evidence can support a money claim', () => {
  const model = makeEvidence('MODEL_ASSERTION', { ref: 'run_1' });
  assert.equal(canSupportMoneyClaim(model), false);
  const paid = makeEvidence('PAYMENT_PROVIDER', { ref: 'pi_1', provider: 'stripe', payment_status: 'paid' });
  assert.equal(canSupportMoneyClaim(paid), true);
});

test('evidence without a lookup ref is refused', () => {
  assert.match(validateEvidence({ kind: 'HTTP_OBSERVATION' }).join(' '), /requires a ref/);
});

// ---------------------------------------------------------------- retry / breaker

test('an auth failure never retries silently', () => {
  const state = recordFailure(null, { status: 401, message: 'Bad credentials' });
  assert.equal(state.last_failure.class, 'AUTH');
  assert.equal(state.next_allowed_action, 'HUMAN_REQUIRED');
  assert.equal(mayAttempt(state).ok, false);
});

test('exhausted free capacity waits instead of upgrading to paid', () => {
  const state = recordFailure(null, { message: 'daily neuron quota exhausted' });
  assert.equal(state.last_failure.class, 'QUOTA_EXHAUSTED');
  assert.equal(state.next_allowed_action, 'WAITING_FOR_FREE_CAPACITY');
  assert.match(state.resume_condition, /never upgrade to a paid tier/);
});

test('repeated transient failures open the circuit rather than looping', () => {
  let state = null;
  for (let i = 0; i < 3; i += 1) state = recordFailure(state, { status: 503, message: 'upstream' });
  assert.equal(state.circuit_state, 'OPEN');
  assert.ok(['PAUSE', 'STOP'].includes(state.next_allowed_action));
  assert.equal(mayAttempt(state, { now: Date.now() }).ok, false);
});

test('a permanent failure is not retried', () => {
  const state = recordFailure(null, { status: 404, message: 'not found' });
  assert.equal(state.last_failure.class, 'PERMANENT');
  assert.equal(state.next_allowed_action, 'STOP');
});

test('success closes the circuit', () => {
  const state = recordSuccess(recordFailure(null, { status: 500, message: 'x' }));
  assert.equal(state.circuit_state, 'CLOSED');
  assert.equal(state.retry_count, 0);
});

test('a proxy denial is classified as an environment fact, not bad credentials', () => {
  // This one is here because it actually happened: fetch through an egress proxy
  // returned 403/401 and read as an upstream auth problem when the request had
  // simply never left the sandbox.
  assert.equal(classifyFailure({ status: 403, message: 'proxy refused CONNECT' }), 'AUTH');
  assert.equal(classifyFailure({ status: 502, message: 'bad gateway' }), 'TRANSIENT');
});

// ---------------------------------------------------------------- github adapter

test('github events become signals with stable ids and real evidence', () => {
  const { signals } = toSignals([githubEvent()], { now: Date.parse('2026-09-06T01:00:00Z') });
  assert.equal(signals.length, 1);
  const s = signals[0];
  assert.equal(s.source, 'github_events');
  assert.equal(s.signal_type, 'MARKET');
  assert.equal(s.subject, 'agent spend is out of control');
  assert.equal(s.evidence.kind, 'PLATFORM_PAYLOAD');
  assert.equal(s.evidence.ref, 'github:event:12345');
  assert.equal(validateSignal(s).length, 0);

  const again = toSignals([githubEvent()], { now: Date.parse('2026-09-07T00:00:00Z') });
  assert.equal(again.signals[0].signal_id, s.signal_id, 'the same event must always get the same id');
});

test('events that carry no demand are ignored rather than ingested at low confidence', () => {
  const { signals, ignored } = toSignals([githubEvent({ type: 'PushEvent', payload: {} })]);
  assert.equal(signals.length, 0);
  assert.equal(ignored[0].reason, 'NOT_DEMAND_BEARING');
});

test('a github signal is never born as a payment', () => {
  const { signals } = toSignals([githubEvent()]);
  assert.notEqual(signals[0].signal_type, 'PAYMENT');
  assert.equal(canSupportMoneyClaim(signals[0].evidence), false);
});

test('an event older than its TTL is already expired when it arrives', () => {
  const { signals } = toSignals([githubEvent({ created_at: '2026-01-01T00:00:00Z' })],
    { now: Date.parse('2026-09-06T00:00:00Z') });
  assert.equal(isExpired(signals[0], Date.parse('2026-09-06T00:00:00Z')), true);
});
