# Common Revenue Core Contract v0 — PHASE 0 Scope / Contract Lock

Status: `PHASE_0_LOCKED`  
Owners: Stratum Praxis + Vector Praxis  
Canonical document owner: Stratum Praxis `revenue-os/`  
Implementation status: contract only; PHASE 1 implementation is intentionally out of scope.

## 1. Purpose

Stratum Praxis and Vector Praxis keep market execution separate while sharing one minimal contract for revenue facts and revenue decisions.

```text
STRATUM EXECUTION ─┐
                   ├─> STANDARD EVENT CONTRACT
VECTOR EXECUTION ──┘
                         |
                         v
                 COMMON REVENUE CORE
                         |
                         v
                   Revenue Truth
                         |
                         v
                     Economics
                         |
                         v
                     Decision
                         |
                         v
              Next Best Action Contract
                   |             |
                   v             v
                Stratum        Vector
                   |             |
                   v             v
                re-execute    re-execute
```

Business-unit ownership is fixed as:

- `stratum` — English-market Revenue Execution.
- `vector` — Japanese-market Revenue Execution.
- Common Revenue Core — normalized revenue truth, attribution, identity links, economics, evidence, reconciliation, portfolio decision and next-best-action contracts.

The Common Revenue Core does not become a third market-execution team.

## 2. Responsibility Boundary

### 2.1 Stratum owns

Stratum keeps responsibility for English-market execution:

`Demand -> Existing Asset -> Revenue Route -> Distribution -> CTA -> Checkout -> Purchase -> Delivery`

This includes Stratum-specific market research, offer copy, English distribution policy, B2B selling activity, marketplace execution, product-specific pricing strategy and provider-specific execution adapters.

### 2.2 Vector owns

Vector keeps responsibility for Japanese-market execution:

`Demand -> Existing Asset -> Article / Tool / Product -> Distribution -> CTA -> Checkout -> Purchase`

This includes Vector-specific market research, Japanese copy, Japanese distribution policy, note/Zenn and other marketplace execution, Japan-specific judgment and product-specific pricing strategy.

### 2.3 Common Revenue Core owns

The Common Revenue Core owns only:

- Standard Revenue Event Contract.
- Revenue Truth normalization.
- Canonical Revenue Ledger contract.
- Attribution contract.
- Customer / Transaction identity contract.
- Economics contract.
- Evidence contract.
- Reconciliation contract.
- Portfolio Decision contract.
- Next Best Action contract.
- Common status and error semantics.

### 2.4 Common Revenue Core does not own

The Common Revenue Core must not own:

- Stratum-specific or Vector-specific market research.
- Content generation.
- SNS operating policy.
- Brand-specific copy.
- Product planning.
- Brand-specific pricing strategy.
- Marketplace-specific operation.
- B2B sales execution.
- Japan-market-specific judgment.
- English-market-specific judgment.
- Provider-native buyer delivery when that provider already owns delivery correctly.

Rule: **market execution stays separated; revenue facts and decision contracts are shared.**

## 3. Existing Implementation Reuse / Collision Lock

PHASE 0 does not replace existing mechanisms.

### Stratum mechanisms that remain authoritative in their current scope

- `acquisition/asset-inventory.json` remains the Stratum existing-asset registry. Common Core references `asset_id`; it does not duplicate the registry.
- `acquisition/distribution-ledger.json` remains Stratum acquisition/distribution evidence. It is **not** renamed into the company Canonical Revenue Ledger.
- `trend-video-engine/publish-ledger.json` remains the video lane's source record and stays read-only to the acquisition adapter.
- Existing attribution states remain valid: `ATTRIBUTED`, `UNATTRIBUTED`, `NOT_APPLICABLE`, `UNVERIFIED`.
- Existing publication/evidence state must preserve `NOT_MEASURED` distinct from measured zero.
- Existing guard remains binding: a positive purchase cannot be recorded without payment-provider purchase evidence.
- Existing UTM, `asset_id`, route and provider facts are preserved verbatim; historical facts are not rewritten to fit a new taxonomy.
- `AGENTS.md` revenue evidence and Human Gate rules remain repository-specific execution guards.

### Vector mechanisms that remain authoritative in their current scope

- Existing `asset_id`, `product_id` and `route_id` values in Vector production tracking are preserved.
- Existing PostHog source events such as `traffic_session_start`, `funnel_view` and `primary_cta_click` remain source event names.
- Existing provider-native note commerce remains provider-native; Common Core observes/reconciles it and does not force migration to Stripe.
- Existing social/distribution logs remain Vector execution evidence; Common Core does not become Vector's publisher.

### Open-PR collision rule

Open or draft PRs are not canonical Common Core implementation merely because they contain revenue logic. Stratum-side revenue collectors/allocators and Vector-side handoff changes remain business-unit implementations until they explicitly conform to this contract in a later phase.

PHASE 1 must adapt existing implementations; it must not create a second asset registry, a second attribution vocabulary, or a parallel brand-specific Common Core schema.

## 4. Standard Revenue Event Contract v0

### 4.1 Canonical event types

The minimum canonical event vocabulary is locked to:

- `traffic`
- `product_view`
- `cta_click`
- `checkout_started`
- `purchase`
- `payment_captured`
- `payment_settled`
- `refund`
- `chargeback`
- `delivery`
- `usage`
- `repeat_purchase`
- `action_executed`

No source system is required to rename its native event. Adapters preserve the original value in `source_event_name` and map it to `event_type`.

### 4.2 Required envelope

Every accepted canonical event carries:

| Field | Rule |
|---|---|
| `event_id` | Required. Stable and idempotent. Auto-generated deterministically when the producer has no suitable ID. |
| `event_type` | Required. One canonical event type above. |
| `business_unit` | Required: `stratum` or `vector`. |
| `timestamp` | Required. Source occurrence time when known; ingestion time must not silently replace it. |
| `source` | Required. Originating system/lane/provider, e.g. `posthog`, `stripe`, `note`, `payhip`, `gumroad`, `stratum_distribution_ledger`, `vector_web`. |
| `source_event_name` | Required. Native event/type name preserved without destructive normalization. |
| `evidence_ref` | Required for trusted facts; stable reference to source evidence. Events lacking adequate evidence are not promoted to trusted Revenue Truth. |
| `sync_status` | Required: one of the common sync states in section 11. |

### 4.3 Context / identity fields

These are common fields and are nullable when genuinely unknown:

- `transaction_id`
- `customer_id`
- `asset_id`
- `product_id`
- `channel`
- `channel_id`
- `route_id`
- `experiment_id`
- `action_id`
- `cta_id`

Missing values stay `null` / unknown. They are never fabricated to make a record complete.

Where existing facts allow deterministic attachment, adapters should auto-populate these fields so Stratum/Vector operators are not asked to type them manually.

### 4.4 Provenance fields

Adapters should preserve, when available:

- `source_event_id`
- `provider`
- `provider_transaction_id`
- `provider_customer_id`
- `source_url`
- UTM fields
- source/public post ID
- source/public URL
- provider event timestamp
- ingestion timestamp

Provider-specific payloads do not need to be copied into every event; `evidence_ref` may point to durable provider/repository evidence.

### 4.5 Event mapping rules for existing events

Minimum compatibility rules:

- `traffic_session_start` -> `traffic`.
- A qualifying revenue/product `funnel_view` -> `product_view`; generic page views must not be falsely upgraded to product views.
- `primary_cta_click` -> `cta_click`.
- `commerce_entry_click` -> `cta_click`, preserving `source_event_name=commerce_entry_click`.
- `checkout_click` alone is **not** `checkout_started`. It is behavioral intent. `checkout_started` requires evidence that a provider checkout/session/order was actually created or entered according to that provider's semantics.
- `purchase` requires verified provider evidence. Analytics clicks, page views, queued posts and QA actions cannot create a canonical purchase.
- `payment_captured` and `payment_settled` remain distinct from `purchase`; adapters must not double-count the same funds merely because several lifecycle events exist.
- `repeat_purchase` requires a new verified transaction associated with an already-known customer identity; revisits or repeat usage are not repeat purchases.

## 5. Input Contract — Stratum and Vector

Both business units use the same Common Core input contract. Brand differences are represented by `business_unit`, source fields and existing IDs, not by separate schemas.

The logical input is:

```text
Asset
Channel
CTA
Product
Purchase
Revenue
Cost
Profit
Action
Result
Evidence
```

The event envelope carries the machine form of those facts.

### 5.1 Producer obligations

A producer must:

1. Preserve its own execution log before Common Core synchronization.
2. Provide the strongest evidence it already has.
3. Preserve existing IDs and provider IDs.
4. Use null/unknown when a value is not measured.
5. Never turn a publication, click, checkout click, QA action or synthetic test into revenue.
6. Mark QA / automation provenance where known so it can be excluded from market-learning decisions.
7. Keep provider-native payment and delivery routes intact unless a separate approved change explicitly modifies them.

### 5.2 Auto-enrichment

Common adapters should derive, where evidence permits:

- `asset_id` from existing asset registries / tracked destination.
- `product_id` from existing product metadata / tracked CTA.
- `channel_id` from verified publisher/platform records.
- `route_id` from existing URL/event properties.
- `action_id` from execution/handoff logs.
- `transaction_id` from provider identity-link rules.
- `experiment_id` from tracked experiment metadata.
- `evidence_ref` from provider event, public URL, repository evidence or durable execution log.

Auto-enrichment is evidence-based only. Ambiguous matches go to reconciliation instead of choosing arbitrarily.

## 6. Revenue Truth / Canonical Revenue Ledger Contract

### 6.1 Logical role

The **Canonical Revenue Ledger** is the normalized company Revenue Truth across Stratum and Vector.

It is a new logical contract for Phase 1; it is **not** an alias for Stratum's existing `acquisition/distribution-ledger.json`.

### 6.2 Write rules

- Append-first / immutable-history semantics.
- Idempotent ingestion by stable event/provider identity.
- Corrections are additive reconciliation/correction records; decision systems do not rewrite history.
- Unknown and `NOT_MEASURED` remain distinct from zero.
- A positive purchase/revenue fact requires adequate provider evidence.
- Refunds and chargebacks are separate facts linked to the original transaction.
- Provider/native transaction history remains independently recoverable.

### 6.3 Money recognition

The ledger must distinguish:

- gross paid amount
- refunds
- chargebacks
- provider/payment fees when known
- variable/direct cost when known
- net revenue
- contribution profit

A monetary amount requires `currency`.

Unknown cost must remain unknown; it must not silently become zero. Profit must not be declared merely because revenue is known.

Cross-currency aggregation is not allowed without an explicit conversion amount/rate/source/time.

## 7. Customer / Transaction Identity Contract

### 7.1 Transaction identity

`transaction_id` is the Common Core's stable transaction identity.

Provider objects such as Checkout Session, PaymentIntent, Charge, Payhip sale or Gumroad sale remain provider identities and map to the canonical transaction through identity links. Multiple provider objects may belong to one transaction.

No adapter may count each provider object as a separate sale merely because each has a different provider ID.

### 7.2 Customer identity

`customer_id` is an internal canonical/pseudonymous identity, not a requirement to copy raw PII into the event stream.

Provider customer IDs, purchaser email or marketplace buyer IDs are identity-link evidence, subject to privacy and provider constraints.

When identity cannot be safely/provably resolved, keep it unknown. Do not merge customers by weak similarity.

## 8. Attribution Contract

Canonical attribution states are locked to the existing Stratum vocabulary:

- `ATTRIBUTED`
- `UNATTRIBUTED`
- `NOT_APPLICABLE`
- `UNVERIFIED`

Rules:

1. Attribution is evidence, not topic similarity.
2. Preserve the route/UTM/asset facts actually sent.
3. A purchase attribution requires a supportable link between provider transaction and route/customer/session evidence.
4. Historical sent values are never rewritten to match a later routing table.
5. Ambiguous asset/route matches become `UNVERIFIED` or `RECONCILIATION_REQUIRED`.
6. Awareness-only events may be `NOT_APPLICABLE`.
7. Missing downstream measurement is not evidence of zero conversion.

## 9. Evidence Contract

Every material revenue fact must be traceable through `evidence_ref`.

`evidence_type` describes the mechanism; `evidence_strength` is the cross-core assessment.

`evidence_strength` is locked to:

- `STRONG` — provider/platform proof of the claimed real-world state.
- `MODERATE` — direct analytics observation or verified execution evidence that proves behavior but not payment truth.
- `WEAK` — repository declaration/intent or indirect evidence that is useful but insufficient for strong commercial claims.
- `UNVERIFIED` — insufficient proof.

Payment-provider evidence is required for purchase/revenue truth. PostHog/analytics is behavioral observation and cannot by itself establish company revenue.

QA, bot and automation activity must be tagged/excluded from buyer-demand and revenue-learning decisions when identified. Existing `codex`, `codex_qa`, QA client references or equivalent business-unit markers must not be learned as market demand.

## 10. Source of Truth Rule

The hierarchy is locked as:

```text
External Provider
= primitive/raw evidence

Canonical Revenue Ledger
= normalized company Revenue Truth

Analytics
= behavioral observation

Portfolio / Decision Engine
= reader of Ledger + evidence; never writer of historical Revenue Truth
```

Absolute rules:

- Recording and deciding are separate systems.
- Portfolio / Decision Engine cannot rewrite past Revenue Truth.
- Stripe, Payhip, Gumroad, note, PostHog or any single provider is not the sole company-wide Source of Truth.
- A provider remains authoritative for its own primitive payment/platform fact.
- Provider-native checkout/delivery is not considered defective merely because it is outside the Common Core.
- Repository operational logs remain durable evidence even while Core synchronization is unavailable.

## 11. Error / Sync State Contract and SPOF Rule

### 11.1 Sync states

The common synchronization state is locked to:

- `PENDING_SYNC` — source/business-unit evidence is durable, but not yet accepted into the Canonical Revenue Ledger.
- `SYNCED` — event was accepted idempotently into the Canonical Revenue Ledger.
- `RECONCILIATION_REQUIRED` — conflicting identities, amounts, currencies, attribution, duplicates or provider facts require deterministic reconciliation before trusted aggregation.
- `INVALID` — event violates contract/evidence requirements and is not trusted Revenue Truth.

### 11.2 Common error semantics

Errors must be explicit and machine-readable. Minimum classes:

- `CONTRACT_INVALID`
- `EVIDENCE_MISSING`
- `PURCHASE_EVIDENCE_MISSING`
- `IDENTITY_CONFLICT`
- `DUPLICATE_CONFLICT`
- `ATTRIBUTION_CONFLICT`
- `ECONOMICS_INCOMPLETE`
- `PROVIDER_UNAVAILABLE`
- `CORE_UNAVAILABLE`

Errors do not justify inventing zeros, purchases or IDs.

### 11.3 SPOF prevention

Common Core synchronization is asynchronous and idempotent.

If Common Core is unavailable:

1. Stratum/Vector execution evidence remains in the business-unit log.
2. Provider-side payment/platform truth remains at the provider.
3. Evidence references are retained.
4. The unsynchronized record becomes/remains `PENDING_SYNC`.
5. Retry is bounded and idempotent.
6. Brand execution is not destroyed solely because synchronization failed.

Only an action that truly depends on a fresh Common Core decision must wait for that decision. Existing provider payment/delivery flows continue independently.

## 12. Economics Contract

Minimum economic fields at transaction/decision roll-up are:

- `gross_revenue_amount`
- `currency`
- `refund_amount`
- `chargeback_amount`
- `provider_fee_amount`
- `variable_cost_amount`
- `net_revenue_amount`
- `contribution_profit_amount`

Fields are nullable when genuinely unknown. Unknown must not be treated as zero.

Common Core may calculate derived economics only from recorded facts and documented formulas. Brand-specific pricing strategy remains outside Common Core.

## 13. Portfolio Decision Contract

The shared decision vocabulary is locked to exactly six primary states:

- `SCALE`
- `KEEP`
- `TEST`
- `FIX`
- `HOLD`
- `STOP`

The Portfolio / Decision Engine is read-only against historical Revenue Truth.

Compatibility rule for current/proposed Stratum classification clients:

- `SCALE` -> `SCALE`
- `ITERATE` -> `FIX`
- `STOP` -> `STOP`
- `INSUFFICIENT_DATA` -> `HOLD` by default
- `INSUFFICIENT_DATA` may become `TEST` only when a bounded, reversible, measurable test is explicitly eligible.

No business unit should introduce another primary decision enum for the shared contract.

## 14. Output / Next Best Action Contract

A Common Core decision response must be able to return:

- what sold
- what produced contribution profit
- strongest `asset_id`
- strongest `route_id`
- strongest channel
- `evidence_strength`
- maximum bottleneck
- `decision`
- `next_best_action`
- `reason`
- `evidence_ref`
- `confidence`
- `human_gate_required`

Minimum machine contract:

```text
decision_id
generated_at
business_unit
decision
next_best_action
reason
evidence_ref[]
evidence_strength
confidence
human_gate_required
human_gate_reason?
max_bottleneck
strongest_asset_id?
strongest_route_id?
strongest_channel?
sold_product_ids[]
gross_revenue?
contribution_profit?
currency?
```

`confidence` expresses support for the decision, not certainty of future revenue.

A decision is guidance/authorization context, not proof that execution occurred. The business unit must create a later `action_executed` event and evidence for the real action/result.

## 15. Bottleneck Contract

The maximum bottleneck must be evidence-derived from the deepest measured stage, with unknown preserved.

Minimum funnel semantics:

```text
traffic
-> product_view
-> cta_click
-> checkout_started
-> purchase
-> payment_captured / payment_settled
-> delivery
-> usage / repeat_purchase
```

Examples of safe interpretation:

- no measured traffic -> acquisition may be the bottleneck, but only if traffic instrumentation is known to be working.
- traffic with no CTA -> conversion/message/route test candidate.
- CTA with no provider checkout -> checkout handoff candidate.
- provider checkout with no purchase -> offer/trust/payment-friction candidate.
- purchase without delivery -> delivery is the priority.
- missing measurement -> `HOLD` / measurement repair, not an invented zero.

## 16. Human Gate / Permission Boundary

### 16.1 AUTO-eligible

Common Core may autonomously perform, within existing permissions:

- read-only analytics.
- event normalization.
- evidence-based attribution calculation.
- reporting.
- decision suggestion.
- evidence generation.
- idempotent synchronization/reconciliation that does not alter provider truth.

### 16.2 Human Gate required

Human approval remains required for:

- new paid contracts.
- new payment providers.
- payment configuration changes.
- refunds.
- major price changes.
- high-value spend.
- legal / contract acceptance.
- destructive production migrations.
- public identity changes.
- customer data deletion.
- major changes/merges to `main`.

A Human Gate response must include:

- `human_gate_required=true`
- exact blocker/action
- reason
- evidence reference
- exact point where automated execution can resume

The Decision Engine cannot use a high-confidence recommendation to bypass a Human Gate.

## 17. Fail-Closed Rules

The Common Revenue Core fails closed when:

- a purchase has no provider evidence.
- event identity is ambiguous enough to risk double counting.
- attribution is inferred only from similarity.
- currency/economic aggregation would require an unstated conversion.
- analytics and provider payment facts conflict materially.
- a required contract field is invalid.
- provider evidence is unavailable and the requested claim depends on it.

Fail closed means preserve source evidence, mark `RECONCILIATION_REQUIRED` or `INVALID`, and do not promote the disputed fact into trusted Revenue Truth.

## 18. Phase 0 PASS Evidence / Contract Checks

The PHASE 0 document is considered valid only if all of these are present:

- Stratum / Vector responsibility boundary.
- Common Core responsibility boundary.
- all 13 Standard Event Contract event types.
- common IDs and required event envelope.
- Input Contract.
- Output / Decision Contract.
- six decision states.
- Source of Truth rule.
- Canonical Revenue Ledger contract.
- identity, attribution, economics, evidence and reconciliation contracts.
- four sync states.
- SPOF prevention rule.
- Human Gate boundary.
- explicit existing-code reuse/collision rules.
- Phase 1 implementation handoff.
- explicit prohibition on PHASE 1 implementation inside this phase.

## 19. PHASE 1 Implementation Handoff

PHASE 1 receives this document as its contract input and must not ask the business units to redefine the schema.

Implementation order:

1. **Contract types/schema only** — encode the event envelope, event enum, sync states and decision output without changing brand execution.
2. **Canonical ledger write path** — append/idempotent normalized Revenue Truth with immutable-history semantics; do not reuse/rename `acquisition/distribution-ledger.json` as the company ledger.
3. **Stratum adapters** — adapt existing asset/distribution/attribution evidence and existing PostHog/provider evidence; preserve source names and IDs.
4. **Vector adapters** — adapt existing Vector PostHog events, `route_id`, `asset_id`, `product_id`, note/provider evidence and execution logs; no new manual fields for the operator when derivable.
5. **Identity + dedup** — link provider events/transactions without double-counting Checkout Session / PaymentIntent / Charge / marketplace sale representations.
6. **Reconciliation** — implement the four sync states and explicit conflict/error classes.
7. **Economics roll-up** — calculate only from known values; keep unknown cost distinct from zero.
8. **Decision adapter** — expose only `SCALE | KEEP | TEST | FIX | HOLD | STOP` plus the Next Best Action contract.
9. **SPOF test** — prove business-unit evidence remains durable and becomes `PENDING_SYNC` when Core is unavailable, then syncs idempotently.
10. **Evidence tests** — prove analytics-only events cannot create purchase/revenue and QA/automation traffic cannot be learned as buyer revenue.
11. **Compatibility tests** — prove existing Stratum and Vector event/ID names survive round-trip normalization without destructive renaming.
12. **No production merge without Human Gate**.

### PHASE 1 acceptance fixtures

Use isolated test fixtures only; never write fixture purchases/revenue/evidence into production ledgers. Minimum cases:

- Vector `traffic_session_start` round-trip.
- Vector `primary_cta_click` with existing `route_id`, `asset_id`, `product_id`.
- Stratum `NOT_MEASURED` remains distinct from zero.
- `checkout_click` without provider checkout proof does not become `checkout_started`.
- positive purchase without provider evidence is rejected.
- duplicate provider objects do not double-count one transaction.
- refund/chargeback link to prior transaction.
- Core outage leaves producer evidence intact and event `PENDING_SYNC`.
- ambiguous attribution becomes reconciliation/unverified, never guessed.
- open/draft business-unit decision clients map into the six-state output enum.

## 20. PHASE 0 Stop Boundary

This document closes PHASE 0.

Do not implement the Canonical Revenue Ledger, event ingestion service, reconciliation engine, provider bridges or decision engine in PHASE 0. Those are PHASE 1+ work.

Main merge remains a Human Gate.
