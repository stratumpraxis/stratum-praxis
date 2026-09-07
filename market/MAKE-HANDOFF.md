# Make handoff contract

Make is the event bus. This repository does not reimplement one, and nothing here
polls Make on a schedule pretending to be event-driven.

The split is deliberate:

| Concern | Owner | Why |
| --- | --- | --- |
| Receiving external events | Make | It is already connected to the sources and runs without us |
| Normalising into the signal contract | Either side | `market/lib/signal.mjs` is the reference implementation |
| Runtime operational state | Make Data Store | Reachable by Make, Actions and a human, none of them running at the same time |
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

`signal_id` is required and must already exist in the Data Store. The repository
never invents a signal; it acts on one Make has already persisted.

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
| `route_id` | text | joins to attribution |
| `existing_asset_match` | text | asset id from the current inventory |
| `evidence` | json | the evidence contract |
| `retry_count` | number | per-route retry budget |
| `last_failure` | json | class + message + when |
| `next_allowed_action` | text | RETRY / PAUSE / STOP / HUMAN_REQUIRED / WAITING_FOR_FREE_CAPACITY |

## Secrets

`MARKET_STATE_ENDPOINT` and `MARKET_STATE_SECRET` are environment variables. They
are set as GitHub Actions secrets and in Make; they are never committed, never
written to a file by this code, and never placed client-side.

## What Make must not do

- Never write `PAID` or `WON` from a checkout event. Only a payment-provider event
  with `payment_status: paid` may do that, and `market/lib/state.mjs` enforces it on
  this side regardless of what arrives.
- Never retry forever. Honour `next_allowed_action`.
- Never call a paid AI tier because a free one was exhausted. The correct outcome is
  `WAITING_FOR_FREE_CAPACITY`.

## Current state

The contract is implemented and tested on this side. The Make scenario itself is
not built - that needs the account, which is a human step. Until
`MARKET_STATE_ENDPOINT` is set, `market/cli/ingest.mjs` reports `BLOCKED` rather
than silently writing somewhere else; `--local` runs against a file store that
marks every record `LOCAL_FILE` so it can never be mistaken for production state.
