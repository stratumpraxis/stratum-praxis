# Make handoff contract

Make is the event bus. This repository does not reimplement one, and nothing here
polls Make on a schedule pretending to be event-driven.

The split is deliberate:

| Concern | Owner | Why |
| --- | --- | --- |
| Receiving external events | Make | It is already connected to the sources and runs without us |
| Normalising into the signal contract | Either side | `market/lib/signal.mjs` is the reference implementation |
| Durable state / event ledger | Supabase (`public.market_event_ledger`) | Survives a scenario being edited, a workflow rewritten and a session ending |
| Runtime cache of that state | Make Data Store | Reachable by Make without a round trip; a cache, not the source of truth |
| Durable rules, schemas, tests | This repository | Versioned, reviewable, diffable |
| Evidence | This repository (`market/evidence/`) | Append-only, machine readable |

Repository files are **not** the runtime state store. A git file cannot be
read-modify-written concurrently by a webhook and a scheduled job without losing
writes, and state that only changes when an agent runs is the chat-driven pattern
this architecture exists to remove.

## Inbound: Make to this repository

Make calls a `repository_dispatch` when it has qualified work that needs code,
audit or deployment. Anything else it handles itself.

```
POST https://api.github.com/repos/stratumpraxis/stratum-praxis/dispatches
Authorization: Bearer <token with contents:write>
Content-Type: application/json

{
  "event_type": "market_signal",
  "client_payload": {
    "signal_id": "sig_<32 hex>",
    "signal_type": "HUMAN_SIGNAL",
    "route_id": "...",
    "requested_engine": "codex | claude | deploy | video",
    "reason": "why this needs the repository at all"
  }
}
```

That pointer shape - a `signal_id` Make has already persisted, plus a request - is
still supported and is read as a pointer, not an event.

A dispatch may also carry the events themselves, which is the path
`market/adapters/dispatch-events.mjs` handles:

```json
{
  "event_type": "market_signal",
  "client_payload": {
    "events": [
      {
        "signal_type": "BUYER_DEMAND",
        "source": "reddit",
        "source_event_id": "<Make execution or bundle id>",
        "subject": "what actually happened out there",
        "demand_type": "EXPLICIT_INTENT",
        "revenue_distance": "MID",
        "confidence": 0.6,
        "correlation_id": "cor_<32 hex>",
        "correlation_ref": "<client_reference_id, if this belongs to a checkout>"
      }
    ]
  }
}
```

### What a dispatch is refused for

These are enforced in code, not asked for politely. Each refusal appears in the run
trace and as a workflow warning, so a scenario sending the wrong thing finds out.

| Refusal | Trigger |
| --- | --- |
| `BUS_MAY_NOT_ASSERT_PAYMENT` | `signal_type: PAYMENT`. Payments are read from Stripe, never relayed |
| `BUS_MAY_NOT_SUPPLY_PAYMENT_EVIDENCE` | `evidence.kind: PAYMENT_PROVIDER` in the payload |
| `BUS_MAY_NOT_SET_STATE` | any `status` other than `NEW`; the state machine decides that here |
| `NO_UPSTREAM_EVENT_ID` | neither `source_event_id` nor `external_id`, so a redelivery could not be recognised |

Accepted events are namespaced `dispatch:<source>`, so a relayed event is never
mistaken in the ledger for one this repository read itself. `market/lib/state.mjs`
admits payments only from source `stripe` and observed acts only from source
`posthog`; `dispatch:stripe` and `dispatch:posthog` satisfy neither.

## Outbound: this repository to Make

State changes and evidence are pushed to one Make webhook that fronts the Data
Store. One endpoint, one signed envelope, so Make has a single place to validate.

```
POST $MARKET_STATE_ENDPOINT
Content-Type: application/json
X-Market-Signature: hex(hmac_sha256($MARKET_STATE_SECRET, raw_body))

{ "op": "put" | "put_many" | "get" | "list", "signal": {...} | "signals": [...] }
```

The Make scenario must:

1. Recompute the HMAC over the raw body and reject on mismatch. An unsigned or
   badly signed request is dropped, not processed.
2. Upsert on `signal_id`. The id is deterministic, so a retry is an upsert, never a
   second row.
3. Return `{ "ok": true }` with 2xx. Any non-2xx is treated here as a failure and
   classified by `market/lib/retry.mjs`.

## Chain identity

Five ids make one revenue attempt followable across systems that share no key.
`market/lib/correlation.mjs` is the reference implementation; Make must relay these
unchanged rather than regenerating them.

| Field | Meaning |
| --- | --- |
| `source_event_id` | the upstream system's own id, verbatim. Never invented |
| `event_id` | `evt_<32 hex>`, deterministic from source + `source_event_id`. A redelivery is one event |
| `correlation_id` | `cor_<32 hex>`, the revenue attempt. Derived from the checkout reference |
| `causation_id` | the `event_id` of the direct cause. Null at an external boundary |
| `action_id` | `act_<32 hex>`, deterministic per correlation + asset + action |

The join that makes this work is `client_reference_id`. `scos-analytics.js` composes
it from the funnel and UTM fields and writes it onto every outbound Stripe link;
Stripe returns it on the session. Both the PostHog adapter and the Stripe adapter
derive the same string from their own side, so a click and the payment it produced
land on one `correlation_id` without either system being told about the other. **A
Make scenario that rewrites, truncates or re-cases that value breaks the join
silently** - nothing errors, the funnel simply stops adding up.

## Data Store shape

One record per signal. Key: `signal_id`.

| Field | Type | Note |
| --- | --- | --- |
| `signal_id` | text (key) | deterministic, `sig_<32 hex>` |
| `signal_type` | text | PAYMENT / HUMAN_SIGNAL / CHECKOUT / BUYER_DEMAND / MARKET |
| `status` | text | the state machine in `market/lib/state.mjs` |
| `source` | text | which adapter produced it |
| `source_url` | text | where a human can go and look |
| `detected_at` | date | when the external fact happened |
| `updated_at` | date | when we last moved it |
| `expires_at` | date | TTL; a signal without one never goes stale |
| `route_id` | text | which CTA |
| `event_id` | text | `evt_<32 hex>`, one per upstream delivery |
| `source_event_id` | text | the upstream system's own id |
| `correlation_id` | text | `cor_<32 hex>`, the revenue attempt |
| `causation_id` | text | the `event_id` that caused this one |
| `action_id` | text | `act_<32 hex>` when an action was taken |
| `existing_asset_match` | text | asset id from the current inventory |
| `evidence` | json | the evidence contract |
| `retry_count` | number | per-route retry budget |
| `last_failure` | json | class + message + when |
| `next_allowed_action` | text | RETRY / PAUSE / STOP / HUMAN_REQUIRED / WAITING_FOR_FREE_CAPACITY |

## The Supabase ledger

The durable copy lives in `public.market_event_ledger`, written through PostgREST -
no Postgres driver, no connection pool in a workflow that runs for ninety seconds.

Upsert is on `signal_id` with `Prefer: resolution=merge-duplicates`. The chain and
lifecycle fields are stored as queryable columns; the whole signal is stored
alongside as `payload` jsonb and is what a read returns, so a contract field the
schema does not yet know about survives a round trip rather than being dropped.

Expected columns: the table above, plus `payload` (jsonb) and a unique constraint on
`signal_id` - without that constraint the upsert degrades into duplicate rows.

## Secrets

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MARKET_STATE_ENDPOINT`,
`MARKET_STATE_SECRET`, `POSTHOG_PERSONAL_API_KEY` and `STRIPE_SECRET_KEY` are
environment variables set as GitHub Actions secrets. They are never committed, never
written to a file by this code, and never placed client-side. The service-role key in
particular must never reach a page: it bypasses row-level security.

## What Make must not do

- Never write `PAID` or `WON` from a checkout event. Only a payment-provider event
  with `payment_status: paid` may do that, and `market/lib/state.mjs` enforces it on
  this side regardless of what arrives.
- Never retry forever. Honour `next_allowed_action`.
- Never call a paid AI tier because a free one was exhausted. The correct outcome is
  `WAITING_FOR_FREE_CAPACITY`.

## Current state

Wired and tested on this side; four sources dispatch from one registry
(`github`, `posthog`, `stripe`, `dispatch`), and the `repository_dispatch` leg has
been run end to end against a real payload.

Not yet live, and each for the same reason - a credential this environment does not
have:

- **PostHog** needs `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID`.
- **Stripe** needs `STRIPE_SECRET_KEY`. Until it is readable from a run, the open
  question - recorded checkout clicks against zero payment records - cannot be
  answered from either side.
- **Supabase** needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **The Make scenario** itself is not built; that needs the account.

Both `posthog` and `stripe` currently fail as `AUTH` with
`next_allowed_action: HUMAN_REQUIRED`, which is the correct outcome: a missing
credential is a human gate, not something to retry.

With no store configured, `market/cli/ingest.mjs` reports `BLOCKED` rather than
silently writing somewhere else. `--local` runs against a file store that marks every
record `LOCAL_FILE` so it can never be mistaken for production state.

**Verified revenue is 0.** No purchase has occurred, and nothing in this wiring
implies one.
