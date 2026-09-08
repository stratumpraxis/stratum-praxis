# RustChain #2819 — Genesis dry-run state-root endian regression

**Claimant / payout identity:** `stratumpraxis` (hosted RustChain wallet)  
**Reviewed upstream:** `Scottcjn/Rustchain@59339bcdeaa766af08c364ac9e0974d761c9fb2f`  
**Bounty:** `Scottcjn/rustchain-bounties#2819`  
**Severity requested:** Low / 25 RTC, subject to maintainer verification

## Summary

The current genesis migration preview says it computes the same Merkle root as `UtxoDB.compute_state_root()`, and the existing regression test explicitly requires a dry-run preview root to equal the corresponding real migration root. On current main, the two implementations encode the leaf-count field with opposite byte order:

- `node/utxo_genesis_migration.py::_state_root_from_boxes()` uses `len(rows).to_bytes(8, "little")`.
- `node/utxo_db.py::UtxoDB.compute_state_root()` uses `len(rows).to_bytes(8, 'big')`.

For any ordinary nonzero UTXO count, those bytes differ, so every leaf hash differs and the final root differs. A `--dry-run` can therefore report a state root that the corresponding real migration cannot produce.

This appears to be a regression in the earlier #2819 dry-run fix: `node/tests/test_utxo_genesis_dry_run_side_effects.py::test_genesis_dry_run_reports_the_prospective_state_root` still states the intended invariant directly:

`assert preview["state_root"] == real["state_root"]`

## Concrete path

1. Create an account DB with two positive balances.
2. `migrate(db, dry_run=True)` builds two in-memory preview boxes and calls `_state_root_from_boxes(preview_boxes)`.
3. That helper prefixes every leaf with `2.to_bytes(8, "little")` = `02 00 00 00 00 00 00 00`.
4. A corresponding real migration persists the same logical boxes and then calls `UtxoDB.compute_state_root()`.
5. Production state-root code prefixes every leaf with `2.to_bytes(8, "big")` = `00 00 00 00 00 00 00 02`.
6. SHA-256 inputs differ before any Merkle pairing, so preview root != real root.

## Isolated reproduction

Using the current algorithms on the same two synthetic box records:

```text
little-endian preview root:
22b7a953e54b28b2306da16459ab0e8b9684c75adb9f2536f90f62b0bcd46915

big-endian production root:
49921a46c51d5f33bfd423c2ed83d69c3214ffb0d457ceab818b20caec4962ae

equal: False
```

This reproduction does not probe the live network or move funds; it compares the two current source algorithms only.

## Impact

Low severity: the real UTXO state transition is not altered, but the migration safety preview is unreliable. An operator using `--dry-run` to pre-approve a genesis root gets a value that will change when the same migration is executed for real. That defeats the exact regression invariant added to make dry-run a trustworthy preflight check and can create false cross-node/migration validation alarms.

## Duplicate boundary

This is not the earlier report that `--dry-run` mutated the target DB and hashed existing disk state. That report led to the read-only preview helper and the preview-vs-real regression test. The current finding is in that newer helper itself: the prospective preview now hashes the right box set, but with a leaf-count byte order inconsistent with the production root algorithm.

I also checked the #2819 discussion for `_state_root_from_boxes`; no prior comment naming this helper was returned. The older endian report concerned `compute_state_root()` itself, which current main now uses big-endian; this finding is the remaining mismatch in the genesis preview helper.

## Suggested fix

Change the preview helper to the production encoding:

```python
count_bytes = len(rows).to_bytes(8, "big")
```

Then run the existing regression:

```text
node/tests/test_utxo_genesis_dry_run_side_effects.py::test_genesis_dry_run_reports_the_prospective_state_root
```

No production endpoint testing is required for this finding.
