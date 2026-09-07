# RustChain Bounty #398 — Step 2 Reproduce a Known Fix: Mock Signature Mode

**Claimant / payout identity:** `stratumpraxis`  
**Reviewed RustChain main:** `be90c9a74d75a975afe2a8a3a1d19eebea3cd0cd`  
**Target bounty:** https://github.com/Scottcjn/rustchain-bounties/issues/398  
**Selected known fix:** Mock Signature Mode

## Summary

I reproduced the security invariant behind the Mock Signature Mode fix and compared the legacy configuration path with the current production guard.

The historical risk was not that Ed25519 itself was broken. The risk was operational: legacy node code allowed `RC_TESTNET_ALLOW_MOCK_SIG=1` to set `TESTNET_ALLOW_MOCK_SIG=True` directly from the environment. In the legacy header-verification path, a matching mock signature could be accepted before normal Ed25519 verification. If that test-only switch were enabled in a production process, cryptographic authorization could be bypassed for the affected path.

The current main branch removes that production footgun in two layers:

1. `node/rustchain_v2_integrated_v2.2.1_rip200.py` hardcodes `TESTNET_ALLOW_MOCK_SIG = False` and defines `enforce_mock_signature_runtime_guard()`.
2. `node/wsgi.py` calls `rustchain_main.enforce_mock_signature_runtime_guard()` immediately after loading the node and before `init_db()` / serving the app.

The guard only permits mock signatures when the runtime environment is explicitly one of `test`, `testing`, `dev`, `development`, `local`, or `testnet`; if mock mode is true in production, startup fails closed with `RuntimeError`.

## 1. Before the fix — why the old behavior was dangerous

The deprecated node still preserves the old configuration shape:

```python
TESTNET_ALLOW_INLINE_PUBKEY = os.environ.get("RC_TESTNET_ALLOW_INLINE_PUBKEY","0") == "1"
TESTNET_ALLOW_MOCK_SIG      = os.environ.get("RC_TESTNET_ALLOW_MOCK_SIG","0") == "1"
```

That means a deployment-level environment mistake could enable the test-only acceptance path. The legacy verification documentation in the same source describes the sequence as:

1. determine the signed message;
2. if `TESTNET_ALLOW_MOCK_SIG` and the signature matches the mock pattern, accept it for testnet;
3. otherwise perform Ed25519 verification.

The security problem is therefore an environment-to-authentication boundary: a test feature was reachable through a production process configuration toggle.

## 2. Current fix in the production node

Current main now contains:

```python
TESTNET_ALLOW_INLINE_PUBKEY = False  # PRODUCTION: Disabled
TESTNET_ALLOW_MOCK_SIG = False       # PRODUCTION: Disabled
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

The WSGI entrypoint applies the guard before database initialization:

```python
spec.loader.exec_module(rustchain_main)
rustchain_main.enforce_mock_signature_runtime_guard()
rustchain_main.enforce_hardware_binding_runtime_guard()

app = rustchain_main.app
init_db = rustchain_main.init_db
DB_PATH = rustchain_main.DB_PATH

init_db()
```

This ordering matters: production should fail before accepting traffic or continuing startup under a weakened signature policy.

## 3. Current regression test

The repository already includes `node/tests/test_mock_signature_guard.py`, which checks three important properties:

- mock signatures enabled + `RC_RUNTIME_ENV=production` => `RuntimeError`;
- mock signatures enabled + `RC_RUNTIME_ENV=test` => allowed;
- the WSGI startup path invokes the guard before `init_db()`.

The upstream verification command is:

```bash
python -m pytest node/tests/test_mock_signature_guard.py
```

## 4. Independent local reproduction

This execution environment could not clone GitHub directly because outbound DNS resolution for `github.com` is blocked, so I did **not** claim a full upstream checkout test run. Instead, I built and executed a minimal isolated reproduction using the exact legacy configuration expression and the exact current guard semantics retrieved from current main.

Reproduction logic:

```python
import os

_MOCK_SIG_ALLOWED_ENVS = {
    "test", "testing", "dev", "development", "local", "testnet"
}


def old_config():
    return os.environ.get("RC_TESTNET_ALLOW_MOCK_SIG", "0") == "1"


def enforce_mock_signature_runtime_guard(TESTNET_ALLOW_MOCK_SIG):
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

Executed local cases:

```text
PASS legacy_env_toggle_enables_mock_sig_in_production_context: True
PASS current_guard_rejects_mock_sig_in_production: TESTNET_ALLOW_MOCK_SIG must not be enabled outside test/dev runtimes
PASS current_guard_allows_test_runtime: allowed
```

Exit status: `0`.

This demonstrates the behavioral difference directly: the legacy configuration expression can turn mock mode on in a production context from one environment variable, while the current runtime guard rejects that state.

## 5. Why the fix is sufficient — and residual hardening

For the normal production WSGI path, the fix is strong:

- current main does not source `TESTNET_ALLOW_MOCK_SIG` from the old environment toggle;
- mock mode is false by default in production code;
- the WSGI entrypoint calls the fail-closed guard before initialization;
- a regression test protects both the environment policy and WSGI ordering.

One residual hardening opportunity remains: the direct-development path in `node/wsgi.py` ends in `app.run(...)`, while the guard is already called earlier during module load, so that entrypoint is protected. The integrated node file itself also has a direct-script execution mode elsewhere in the repository history; if a future refactor reintroduces environment-driven mock toggles or creates another production entrypoint, that new entrypoint must call the same guard before serving. The safest long-term invariant is to centralize the signature-mode configuration and make every executable entrypoint fail closed through one shared startup check.

## Conclusion

The Mock Signature Mode fix converts a dangerous deployment toggle into an explicit runtime policy:

**test-only mock authentication may exist in controlled test/dev environments, but production startup must refuse to run if that mode is enabled.**

That is the correct boundary because it prevents a configuration mistake from silently weakening the cryptographic trust model.

This is my Step 2 submission for the 15 RTC Security Analyst reward.
