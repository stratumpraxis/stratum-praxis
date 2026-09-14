# Sources — Shorts Kit 04

All factual claims in this kit are grounded in the public `Scottcjn/Rustchain` repository.

## Claim → source map

### “1 CPU = 1 Vote” / deterministic round-robin block production
Source:
`node/rip_200_round_robin_1cpu1vote.py`

The module header describes RIP-200 as round-robin consensus, with deterministic rotation and 1 CPU = 1 Vote.

### Antiquity changes reward weight
Source:
`node/rip_200_round_robin_1cpu1vote.py`

The implementation defines `ANTIQUITY_MULTIPLIERS` and states that rewards are weighted by a time-decaying antiquity multiplier.

### Vintage advantage decays over blockchain lifetime
Source:
`node/rip_200_round_robin_1cpu1vote.py`

The module header explicitly describes `Time-aging: Vintage hardware advantage decays over blockchain lifetime`.

## Source URL
https://github.com/Scottcjn/Rustchain/blob/main/node/rip_200_round_robin_1cpu1vote.py

## Accuracy note
This package deliberately avoids quoting live reward balances, unsupported benchmark figures, or marketing estimates. It only explains mechanics directly stated in the public implementation.
