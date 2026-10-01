# Autonomous Control Loop v0

Status: `INTEGRATION_BASE_IMPLEMENTED / CLOSED_LOOP_NOT_YET_PROVEN`

## Fixed role boundary

This layer does **not** decide Revenue Allocation.

Upstream / Common Revenue Core owns:

`Current State -> Decision / Priority / Permission`

This layer owns:

`Decision -> Project Adapter -> Runtime -> Direct Evidence -> Unified Evidence -> New State -> next-decision event`

Project-specific market logic, WordPress operation, product logic, sales logic, pricing and publishing policy remain owned by each Project.

## Event-driven contract

Normal wake-up events are:

- `common-revenue-decision-ready`
- `project-runtime-evidence-return`
- `common-revenue-state-changed`

There is no scheduler in this Control Loop workflow. Existing Project heartbeats may remain as resilience/freshness mechanisms, but they are not the Control Loop decision engine.

## v0 routing surface

The registry intentionally exposes only Project-owned routes that are already identifiable and safe to correlate.

### Stratum

`collect_evidence -> project-heartbeat.yml`

The heartbeat accepts `control_loop_decision_id` and `control_loop_action_id`. A correlated run returns its current runtime-state readback through `project-runtime-evidence-return`.

### Vector

`collect_evidence -> vector-public-route-proof.yml`

The central router can resolve this route. Cross-project dispatch requires a repository-scoped credential exposed as `CONTROL_LOOP_GITHUB_TOKEN`. Vector evidence-return correlation is not yet installed, so Vector is **not** counted as a proven closed loop in v0.

## Evidence rules

A green workflow is not Direct Evidence by itself.

Unified Evidence requires all of:

- `decision_id`
- `action_id`
- `business_unit`
- `project_runtime`
- `runtime_status`
- valid `observed_at`
- `direct_evidence=true`
- at least one durable `evidence_ref`

Unknown remains unknown. Missing execution cost, state or evidence is not rewritten as zero/success.

## Fail-closed rules

The router does not invent a Project runtime.

If an upstream decision refers to an action not exposed by the owning Project adapter registry, routing returns `ACTION_ROUTE_MISSING`.

`HUMAN_GATE` and `BLOCKED` decisions are not dispatched.

Cross-project routing without the required credential returns `CROSS_PROJECT_DISPATCH_TOKEN_MISSING`; it is not mislabeled as buyer/revenue failure.

## Completion condition

This implementation is infrastructure, not completion proof.

The role is complete only after at least two Projects demonstrate, with correlation IDs and Direct Evidence:

```text
Current State
-> Decision
-> Dispatch
-> Project Adapter
-> Runtime
-> Reality Change
-> Direct Evidence
-> Unified Evidence
-> New State
-> Next Decision
```

A readback-only cycle is useful integration proof but does not by itself prove Revenue Reality Change.
