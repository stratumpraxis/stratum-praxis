# RustChain: How Do You Prove a Computer Is Real?

## 3–4 minute narration script

Most blockchain systems do not care what physical machine you are using. RustChain does, because its Proof-of-Antiquity model gives older physical hardware a larger reward weight.

That creates an obvious problem: if an old computer earns more, why not just tell the network that a virtual machine is a PowerPC G4?

RustChain’s answer is not to trust a label like “PowerPC” or “vintage.” The public code uses a set of hardware measurements and anti-emulation checks. In the current RIP-309 measurement-rotation code, the six check families are clock drift, cache timing, SIMD identity, thermal drift, instruction jitter, and anti-emulation. The reward path rotates which measurements matter for a given epoch instead of relying on one static signal.

That matters because a machine description is easy to copy. Physical behavior is harder to reproduce consistently. Cache timing reflects how a real memory hierarchy behaves. Clock and instruction jitter expose timing characteristics. Thermal drift gives another physical signal. SIMD behavior helps distinguish what the processor actually executes. Anti-emulation logic adds a direct virtualization check.

RustChain then connects that hardware evidence to RIP-200. RIP-200 uses the principle “1 CPU = 1 Vote” for participation and applies time-aged antiquity multipliers to rewards. In other words, the network is not simply asking, “How much hash power can you buy?” It is trying to identify a physical CPU and then reward the age of that hardware.

There is another subtle design choice: the measurement set is rotated. If every epoch depended on the same single test, an attacker could optimize only for that test. By deriving an active subset from chain state, the verifier makes the target less static. The code also fails closed to all checks when the previous-block hash is unavailable, rather than falling back to an easy predictable subset.

None of this means hardware fingerprinting is magically impossible to spoof. It means RustChain’s security model is explicit about the problem: identity is tied to multiple measured hardware properties, and the system keeps those measurements separate from the miner’s self-reported marketing label.

Why build a blockchain this way? Because Proof-of-Antiquity is trying to make physical hardware age an economic input. A 20-year-old machine has already survived manufacturing, use, resale, and time. RustChain’s model rewards that persistence instead of automatically treating old hardware as e-waste.

So the short version is:

One: identify a physical CPU with multiple measurements.

Two: rotate the checks so the verifier is not static.

Three: use RIP-200 to give each CPU participation weight and apply antiquity to rewards.

That is the core idea behind RustChain’s physical-hardware identity model.

To inspect the implementation yourself, start with the RustChain repository and the RIP-200 / RIP-309 files. To try the miner, the project documents the command:

`pip install clawrtc`

The interesting question is not just whether an old computer can run modern software. It is whether a network can make the continued existence of that computer economically meaningful.
