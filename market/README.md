# MARKET — external-event origin

The work does not start when somebody opens a chat. It starts when something happens
outside.

```
EXTERNAL REALITY -> SIGNAL -> NORMALIZE -> QUALIFY -> EXISTING ASSET FIT
  -> ACTION PROPOSAL -> HUMAN APPROVAL WHEN REQUIRED -> EXECUTION
  -> HUMAN REACTION -> CHECKOUT -> PAYMENT EVIDENCE -> WIN/FAIL -> LEARN
```

## What lives where

| Layer | Location | Note |
| --- | --- | --- |
| Durable rules, schemas, tests | this repository | versioned and reviewable |
| Runtime operational state | Supabase ledger + Make-side cache | see `MAKE-HANDOFF.md` |
| Evidence | `market/evidence/*.json` and workflow traces | append-only / machine readable |
| External execution | signed `MARKET_EXECUTION_ENDPOINT` | Make or another approved executor owns the actual app action |

Repository files are not the runtime state store, and no agent's conversation is
operational truth. Both would mean state only changes when somebody runs a model.

## Files

```
lib/signal.mjs      the signal contract: deterministic ids, TTL, duplicate guard
lib/state.mjs       the state machine, and the payment-evidence gate
lib/decision.mjs    structured AI judgment + a deterministic fallback classifier
lib/execution.mjs   action risk, approval gate, idempotent signed execution dispatch
lib/evidence.mjs    evidence kinds, ranked; only one may support a money claim
lib/retry.mjs       retry budget, failure classes, circuit breaker
lib/store.mjs       durable Supabase / Make adapters; local file store for tests only
lib/asset-fit.mjs   bridge to the existing acquisition router - not a second opinion
lib/http.mjs        proxy-aware fetch
adapters/           github-events, posthog-events, stripe-events
cli/ingest.mjs      one pass of the signal loop
cli/propose-action.mjs  persist the one action already selected by the revenue decision engine
cli/execute-action.mjs  record approval when needed, execute once, persist the result
```

## The four rules that shape everything else

**A signal id is deterministic.** Built from the external fact, never from our
processing time. A Make retry, a webhook redelivery and a manual replay all land on
one row. Proven by test, and by a live run: the second pass found already-known
signals and did nothing.

**A signal expires.** Market information is perishable, so every signal carries a
TTL. Signals that arrive already past it are persisted as `EXPIRED` rather than
skipped — an unpersisted signal is invisible to the duplicate guard and would be
re-ingested for ever.

**Execution is approval-gated by risk, not by enthusiasm.** Low-risk work may execute
without human approval. Medium-risk work requires approval by default and may be
auto-enabled only by an explicit runtime policy. High-risk work always requires a
human decision. Every action gets a deterministic `execution_id`, and the execution
endpoint receives it as an idempotency key so a retry cannot silently become a
second send.

**Only a payment provider can say money moved.** `checkout_click` is a CHECKOUT
signal. An open Stripe session is PAYMENT_PROVIDER evidence of a *non*-payment.
`PAID` is reachable only from `CHECKOUT` with `payment_status: paid`, and `WON` only
from `PAID`. Execution success, email delivery, a social post, or a published page
never count as revenue.

## Execution MVP

The revenue decision engine remains responsible for selecting the best action. This
layer begins after that selection.

An action proposal records:

- what is proposed and why
- expected value
- assets used
- target
- risk level
- approval state
- execution state and external reference
- failure details and next allowed action

The proposal is stored inside the existing signal payload, so the durable ledger
keeps the full attempt without a second state system or schema migration.

Example proposal file:

```json
{
  "action_type": "sales_email",
  "description": "Send the existing offer to one qualified buyer",
  "expected_value": 42,
  "assets": ["workflow-audit"],
  "target": { "kind": "buyer", "id": "buyer-123" },
  "rationale": "closest current action to a qualified human response",
  "payload": { "template_id": "workflow-audit-v1" }
}
```

Persist the selected action:

```bash
node market/cli/propose-action.mjs \
  --signal-id sig_... \
  --action-file /tmp/action.json
```

For a medium/high-risk proposal, request human approval and execute through the
manual GitHub workflow `MARKET execute one approved action`. A low-risk proposal may
be executed directly by an approved runtime lane:

```bash
node market/cli/execute-action.mjs --signal-id sig_...
```

The external executor must be configured with:

```
MARKET_EXECUTION_ENDPOINT
MARKET_EXECUTION_SECRET
```

The endpoint receives a signed JSON envelope plus `Idempotency-Key: act_...`. It must
return JSON such as `{ "ok": true, "external_ref": "...", "result": {...} }`.

## Running signal ingestion

```bash
# live, against the production state store
node market/cli/ingest.mjs --source github --owner OWNER --repo REPO

# offline verification; every record is marked LOCAL_FILE
node market/cli/ingest.mjs --source github --owner OWNER --repo REPO --local

# replay real historical events (trace records mode: BACKFILL)
node market/cli/ingest.mjs --source github --owner OWNER --repo REPO --local --ttl-hours 720
```

With no state store configured the CLI reports `BLOCKED` and exits 2. It does not
quietly write somewhere else.

## Current state

| | |
| --- | --- |
| GitHub Events adapter | live, verified against the real API |
| Duplicate guard / idempotency | verified live |
| Qualify → existing-asset fit | verified live |
| Hourly GitHub / PostHog / Stripe source pulse | implemented; each source isolated |
| Durable ledger | Supabase-backed runtime path exists |
| Action proposal contract | implemented |
| Low / medium / high risk gate | implemented; high-risk cannot auto-execute |
| Human approval workflow | implemented as one-action workflow dispatch |
| Signed external execution dispatch | implemented; requires an approved execution endpoint and secret |
| Verified revenue | none unless and until payment-provider evidence is observed |

## What this deliberately does not do

It does not let a classifier execute arbitrary work because it scored something
highly. The decision engine selects; the execution layer validates risk, records the
proposal, requires approval where policy says so, and sends one idempotent request to
an approved executor.

It also does not treat execution as success. `ACTIONED` means the selected work was
actually dispatched and completed according to the executor. The revenue loop must
still observe a qualified human reaction, checkout, and payment evidence before
anything is called revenue.
