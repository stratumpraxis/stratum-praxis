# RustChain Bounty #398 — Step 1 Security Assessment

**Claimant / payout identity:** `stratumpraxis`  
**Reviewed RustChain main:** `be90c9a74d75a975afe2a8a3a1d19eebea3cd0cd`  
**Target bounty:** https://github.com/Scottcjn/rustchain-bounties/issues/398

I reviewed the current RustChain node implementation as a static, repository-only security assessment. I did not probe production infrastructure, send exploit traffic, access private data, or move funds. The focus was the `/attest/submit` trust boundary, hardware fingerprinting / VM-farm resistance, and the epoch-reward path that converts accepted hardware identity into RTC.

## 1. How `/attest/submit` works

RustChain’s Proof-of-Antiquity design does not treat a miner’s self-description as sufficient evidence. The current protocol specification describes the intended sequence clearly: a miner runs its applicable fingerprint checks, submits the attestation to `POST /attest/submit`, the server validates the raw fingerprint evidence with `validate_fingerprint_data()`, then derives a canonical device classification with `derive_verified_device()`. If the evidence is accepted, the miner is recorded in `miner_attest_recent`, and that verified state feeds current-epoch enrollment.

The current integrated node contains several layers around that route. Input structure is validated before deeper processing, which is important because this request contains nested device, signal, report, nonce, and fingerprint material. Signed attestations bind identity/freshness-sensitive fields with Ed25519 rather than trusting transport alone. A live nonce/challenge is then consumed so a captured report is not intended to remain reusable indefinitely. Rate limits, replay checks, hardware-binding checks, and fingerprint validation sit before the reward-bearing enrollment step.

This separation is good security architecture: “request was syntactically accepted,” “miner proved freshness,” “hardware evidence passed,” and “miner is economically eligible” are distinct states instead of one broad success flag.

## 2. Hardware fingerprinting and VM-farm resistance

The strongest part of the design is that reward-bearing device identity is increasingly server-derived. In the current integrated node, rotating fingerprint checks are selected per epoch from previous-chain state. `evaluate_rotating_fingerprint_checks()` scores only measured checks; a structurally unavailable check can be represented as unmeasured rather than falsely passed, while an empty measured denominator normally fails closed. Capability-limited vintage devices get a narrow exception only after they were already accepted using device-native evidence.

The code also explicitly avoids letting a raw client architecture decide which checks may be skipped. That matters for VM-farm resistance: otherwise a modern VM could simply claim a vintage architecture and exempt itself from measurements it does not want to provide.

The current reward-tier vouching logic goes further. Comments around `derive_verified_device()` explain the historical danger directly: a client-declared high-value family/architecture could previously map into a higher `HARDWARE_WEIGHTS` or antiquity multiplier. The current code introduces server-side vouching and a neutral modern fallback. Unvouched high-paying claims are capped rather than automatically receiving the requested vintage multiplier. For enrollment, `_derive_enroll_weight_device()` also requires stronger evidence for vintage x86 reward tiers. This is the right economic defense: uncertain hardware should lose the bonus, not gain it.

## 3. How epoch rewards are calculated and distributed

Reward settlement operates on enrolled state rather than paying every raw attestation directly. The current reward module defines `PER_EPOCH_URTC` as 1.5 RTC and maps slots into 144-block epochs. `settle_epoch_rip200()` first rejects future epochs, then acquires a SQLite `BEGIN IMMEDIATE` transaction and checks whether the epoch was already settled inside that transaction. That is important because two workers must not both pass an outside-of-lock check and double-credit the same epoch.

When anti-double-mining settlement is required in production, the current path fails closed if that subsystem is unavailable or throws instead of silently dropping into a weaker grouping model. The implementation also rolls back partial writes before any allowed fallback and reacquires the write lock before continuing. A current regression test documents another critical invariant: `PER_EPOCH_RTC` is already the whole epoch pot, while `finalize_epoch()` accepts a per-block reward and multiplies by the epoch slot count, so the automatic settlement path must pass the per-block value rather than accidentally multiplying the full epoch pot again.

At a high level, the security property is: accepted miners enter an epoch with a weight, the epoch has a bounded pot, settlement is serialized, and the reward share is derived from the enrolled/verified state rather than an arbitrary payout amount supplied in the request.

## 4. Potential attack surface: legacy reward-device fallback

The current code contains one compatibility surface I would test aggressively: `resolve_enroll_weight_device()` correctly says in its own security comment that reward weight must be bound to hardware actually attested and fingerprinted, not to the enrollment request body, because the body’s `device` field is not itself the reward authority. Its preferred path reads `device_family` and `device_arch` from `miner_attest_recent`.

However, when that verified row/column is unavailable, the function deliberately falls back to `data["device"]` for legacy or pre-migration compatibility. I am **not claiming a proven exploit**: a normal current attestation may make this fallback unreachable before reward-bearing enrollment. But this is exactly the kind of invariant worth proving with a regression test because the fallback crosses from “verified server state” back to “client request state” at a money-bearing decision.

A useful test would construct every legitimate legacy/migration state that can reach enrollment and assert one of two outcomes: either a verified stored device is always present before nonzero reward weight is assigned, or missing verified-device state fails closed to the neutral/default weight rather than honoring a higher-paying family/architecture from the body. If compatibility truly requires the fallback, the safe version would cap it at the neutral modern tier until a verified device record exists.

That would preserve legacy participation while making the invariant explicit: **missing attestation provenance must never increase payout weight**.

This is my Step 1 submission for the 10 RTC Security Explorer reward.
