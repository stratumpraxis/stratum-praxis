# RustChain Shorts Kit — Why a VM Is Not “Just Another Miner”

## Hook
A thousand cloned VMs should not count like a thousand physical CPUs.

## ≤60s script
Most crypto systems ask how much compute or capital you can bring. RustChain asks a different question: **is this a real physical machine?**

Its Proof-of-Antiquity design starts from **1 CPU = 1 vote**, then weights rewards by hardware antiquity. That only works if cheap virtual-machine cloning cannot impersonate physical diversity.

RustChain’s fingerprint path uses multiple hardware measurements rather than one magic flag: clock drift, cache timing, SIMD identity, thermal drift, instruction jitter, and anti-emulation checks. The active measurement set can rotate, so a miner cannot simply optimize for one predictable test forever.

That changes the incentive: keeping real old hardware alive can matter economically, while mass-copying virtual instances is intentionally discounted or rejected.

Want to inspect the mechanism yourself? Start with the public code, or install the miner with:

`pip install clawrtc`

RustChain: hardware identity before hardware scale.
