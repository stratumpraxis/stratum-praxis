# Final narration script — ~55–60 seconds

**Hook:** You can’t just type “vintage” into a miner and expect RustChain to pay the vintage tier.

RustChain’s current node tries to separate what the miner *claims* from what the server is willing to vouch for.

The attestation path collects device and fingerprint evidence, then `derive_verified_device()` classifies the machine. For reward-bearing tiers, `_vouch_claimed_device()` checks whether a higher-paying claim has supporting evidence.

If a console, ARM, or other premium claim reaches that boundary without the evidence the server expects, the code falls back to an `UNVOUCHED_DEVICE`: modern x86-64 at the neutral rate.

The enrollment path also prefers the device stored from attestation instead of blindly trusting the later request body.

So the design principle is simple: **claiming old hardware is cheap; earning the bonus requires evidence.**
