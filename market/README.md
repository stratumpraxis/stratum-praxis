# MARKET — external-event origin

The work does not start when somebody opens a chat. It starts when something happens
outside.

```
EXTERNAL REALITY -> SIGNAL -> NORMALIZE -> QUALIFY -> EXISTING ASSET FIT
  -> ACTION -> HUMAN REACTION -> CHECKOUT -> PAYMENT EVIDENCE -> WIN/FAIL -> LEARN
```

## What lives where

| Layer | Location | Note |
| --- | --- | --- |
| Durable rules, schemas, tests | this repository | versioned and reviewable |
| Runtime operational state | Make Data Store | see `MAKE-HANDOFF.md` |
| Evidence | `market/evidence/*.json` | one trace per run, append-only |

Repository files are not the runtime state store, and no agent's conversation is
operational truth. Both would mean state only changes when somebody runs a model.

## Files

```
lib/signal.mjs      the signal contract: deterministic ids, TTL, duplicate guard
lib/state.mjs       the state machine, and the payment-evidence gate
lib/decision.mjs    structured AI judgment + a deterministic fallback classifier
lib/evidence.mjs    evidence kinds, ranked; only one may support a money claim
lib/retry.mjs       retry budget, failure classes, circuit breaker
lib/store.mjs       Make Data Store adapter; local file store for tests only
lib/asset-fit.mjs   bridge to the existing acquisition router - not a second opinion
lib/http.mjs        proxy-aware fetch
adapters/           github-events, posthog-events, stripe-events
cli/ingest.mjs      one pass of the loop
```

## The three rules that shape everything else

**A signal id is deterministic.** Built from the external fact, never from our
processing time. A Make retry, a webhook redelivery and a manual replay all land on
one row. Proven by test, and by a live run: the second pass found 31 already known
and did nothing.

**A signal expires.** Market information is perishable, so every signal carries a
TTL. Signals that arrive already past it are persisted as `EXPIRED` rather than
skipped — an unpersisted signal is invisible to the duplicate guard and would be
re-ingested for ever.

**Only a payment provider can say money moved.** `checkout_click` is a CHECKOUT
signal. An open Stripe session is PAYMENT_PROVIDER evidence of a *non*-payment.
`PAID` is reachable only from `CHECKOUT` with `payment_status: paid`, and `WON` only
from `PAID`. Two independent functions enforce this so neither can be bypassed by
calling the other.

## Running it

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
| Duplicate guard / idempotency | verified live: 31 new, then 0 new on re-run |
| Qualify → existing-asset fit | verified live: a real issue matched a real paid asset |
| PostHog adapter | implemented and tested; not run live (egress blocked here) |
| Stripe adapter | implemented and tested; not run live (egress blocked here) |
| Make Data Store | contract defined; the scenario itself needs the Make account |
| Verified revenue | none. No payment has been observed by this system. |

## What this deliberately does not do

It does not execute actions. An `ACTIONABLE` route is recorded with its destination
and checkout; dispatching it is a separate, gated step. Publishing something because
a classifier scored it highly is exactly the failure mode the evidence ranking
exists to prevent.
