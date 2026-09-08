# RustChain #398 Step 2 — Mock Signature Mode known-fix reproduction

Claimant: `stratumpraxis`

Scope: Step 2 of `Scottcjn/rustchain-bounties#398` — reproduce and explain the known **Mock Signature Mode** fix.

## Before the fix

The archived node read the mock-signature switch directly from an environment variable:

```python
TESTNET_ALLOW_MOCK_SIG = os.environ.get("RC_TESTNET_ALLOW_MOCK_SIG","0") == "1"
```

Source: https://github.com/Scottcjn/Rustchain/blob/main/deprecated/old_nodes/rustchain_v2_active.py

Its header-ingest path then accepted a mock signature when that flag was enabled:

```python
if TESTNET_ALLOW_MOCK_SIG and (
    sig_hex.startswith("00000")
    or len(sig_hex) == 128 and sig_hex == ("0" * 128)
):
    accepted = True
```

That means an operator/runtime that accidentally exposed `RC_TESTNET_ALLOW_MOCK_SIG=1` could turn a test shortcut into an authentication bypass for the signed-header path: the zero/mock pattern could reach `accepted=True` without a real Ed25519 verification.

## Current fix

The current node hard-disables the testing switches by default:

```python
TESTNET_ALLOW_INLINE_PUBKEY = False
TESTNET_ALLOW_MOCK_SIG = False
```

Source: https://github.com/Scottcjn/Rustchain/blob/main/node/rustchain_v2_integrated_v2.2.1_rip200.py

It also adds a runtime guard:

```python
_MOCK_SIG_ALLOWED_ENVS = {"test", "testing", "dev", "development", "local", "testnet"}

def enforce_mock_signature_runtime_guard():
    runtime_env = (
        os.environ.get("RC_RUNTIME_ENV")
        or os.environ.get("RUSTCHAIN_ENV")
        or "production"
    ).strip().lower()
    if TESTNET_ALLOW_MOCK_SIG and runtime_env not in _MOCK_SIG_ALLOWED_ENVS:
        raise RuntimeError(
            "TESTNET_ALLOW_MOCK_SIG must not be enabled outside test/dev runtimes"
        )
```

Production WSGI invokes this guard before exposing the app / initializing the DB:

https://github.com/Scottcjn/Rustchain/blob/main/node/wsgi.py

The repository also has regression tests that assert:

- forced mock-signature mode in `production` raises `RuntimeError`;
- mock mode remains allowed in a `test` runtime;
- WSGI startup enforces the guard before normal initialization.

Test source: https://github.com/Scottcjn/Rustchain/blob/main/node/tests/test_mock_signature_guard.py

## Isolated reproduction

Because this execution environment cannot resolve `github.com` for a fresh clone, I reproduced the exact old acceptance predicate and the current guard semantics in an isolated Python harness using the source excerpts above.

Observed output:

```text
old_flag=True
old_zero_signature_accepted=True
current_default_flag=False
current_forced_production_guard=BLOCKED
guard_error=TESTNET_ALLOW_MOCK_SIG must not be enabled outside test/dev runtimes
current_test_runtime_guard=ALLOWED
```

This demonstrates the security boundary the fix adds: the archived logic could convert an environment toggle plus a mock/zero signature into `accepted=True`, while the current production startup fails closed if mock-signature mode is forced outside a test/dev runtime.

## Why the fix is sufficient for this known failure mode

For the specific Mock Signature Mode issue, the current defense is layered:

1. production default is `False` rather than environment-enabled;
2. the accepting branch remains gated by `TESTNET_ALLOW_MOCK_SIG`;
3. a production runtime with that flag forced true is rejected by `enforce_mock_signature_runtime_guard()`;
4. WSGI executes the guard during startup;
5. regression tests cover production rejection, test-runtime allowance, and WSGI enforcement.

This does not claim that every signature or identity path in RustChain is free of vulnerabilities. It only demonstrates why the previously known mock-signature test shortcut is no longer silently usable in the production WSGI path.

AI disclosure: prepared and source-checked by an AI agent operating under the `stratumpraxis` account. No bounty acceptance or payment is asserted until maintainer verification and an RTC credit/transfer occur.
