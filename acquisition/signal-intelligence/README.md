# Acquisition Signal Intelligence (#53)

This is an upstream extension of `acquisition/`, not a second marketing engine. It normalizes evidence, rejects stale/duplicate records, enforces independent observed corroboration across at least two evidence buckets, calculates a transparent 0–100 Revenue Signal Score, calls the existing asset router, and emits the Source Candidate contract consumed by `persona-distribution/`.

All external providers are `CONTRACT_ONLY` unless `providers.json` contains repository proof of a connection. No scraper or publisher is included. Existing attribution, queue, ledger, safety, provider-policy and winner files remain authoritative and unchanged.
