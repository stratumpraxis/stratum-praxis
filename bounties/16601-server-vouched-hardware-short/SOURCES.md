# SOURCES — claim map

Reviewed upstream snapshot: `Scottcjn/Rustchain@59339bcdeaa766af08c364ac9e0974d761c9fb2f`

## Claim 1 — the node distinguishes client claims from server-vouched device identity

Source:
https://github.com/Scottcjn/Rustchain/blob/59339bcdeaa766af08c364ac9e0974d761c9fb2f/node/rustchain_v2_integrated_v2.2.1_rip200.py

Relevant symbols:
- `derive_verified_device()`
- `_vouch_claimed_device()`

Why it supports the script: the server classifies hardware and then decides whether it is willing to honor claimed reward tiers instead of simply returning every client-provided family/arch unchanged.

## Claim 2 — unsupported higher-paying claims fall back to a neutral modern device

Same source file.

Relevant symbols/constants:
- `UNVOUCHED_DEVICE = {"device_family": "x86_64", "device_arch": "modern"}`
- `_NEUTRAL_DEVICE_WEIGHT = 0.8`
- `_claim_pays_above_neutral()`
- `_vouch_claimed_device()`

Why it supports the script: the current code explicitly uses a neutral modern fallback when a higher-paying claim is not vouched by the server-side detection/evidence path.

## Claim 3 — console / ARM claims have evidence-sensitive handling

Same source file.

Relevant logic:
- `_console_bridge_evidence()`
- console branch in `_vouch_claimed_device()`
- ARM branch in `_vouch_claimed_device()`

Why it supports the script: a console claim requires the expected bridge/evidence shape to preserve that claimed tier; an ARM claim reaching the fallback tail without ARM evidence is downgraded to the unvouched modern device.

## Claim 4 — enrollment weight should prefer attested hardware state over the later request body

Same source file.

Relevant function:
- `resolve_enroll_weight_device()`

The source comment states the security invariant directly: reward weight must be bound to hardware that was actually attested/fingerprinted, not merely to the enrollment request body. The function first reads `device_family` / `device_arch` from `miner_attest_recent`, and only falls back to request-body data for legacy / pre-migration compatibility.

## Claim 5 — the short does not claim anti-spoofing is perfect

This is an editorial limitation, not a protocol claim. It is included because the public source itself documents compatibility fallbacks and phased/observe-only controls elsewhere in the attestation path. The package therefore avoids absolute security language.

## Acceptance-quality note

No benchmark, token price, profit figure, or hardware-performance number is invented in this package. Every technical assertion in the narration maps to named public source symbols above.
