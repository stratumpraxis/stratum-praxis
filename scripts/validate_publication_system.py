#!/usr/bin/env python3
import json
import sys
from pathlib import Path

REGISTRY_PATH = Path("distribution/publication-hub/account-registry.json")
POLICY_PATH = Path("distribution/publication-hub/publishing-policy.json")


def fail(msg: str) -> None:
    print(f"FAIL_CLOSED: {msg}", file=sys.stderr)
    sys.exit(1)


def load(path: Path) -> dict:
    if not path.exists():
        fail(f"missing governance file: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid json {path}: {exc}")


def main() -> None:
    registry = load(REGISTRY_PATH)
    policy = load(POLICY_PATH)

    if registry.get("project") != "Stratum" or policy.get("project") != "Stratum":
        fail("BRAND_CHECK failed: governance project mismatch")
    if registry.get("public_brand") != "Stratum Praxis" or policy.get("public_brand") != "Stratum Praxis":
        fail("BRAND_CHECK failed: public brand mismatch")
    if registry.get("ownership_rule") != "STRATUM_DEDICATED_ONLY":
        fail("BRAND_CHECK failed: dedicated ownership rule missing")
    print("BRAND_CHECK=PASS")

    isolation = policy.get("identity_isolation", {})
    required_isolation = {
        "other_project_gmail_forbidden",
        "other_project_social_account_forbidden",
        "other_project_oauth_forbidden",
        "github_owner_is_not_public_brand",
    }
    if any(isolation.get(k) is not True for k in required_isolation):
        fail("ACCOUNT_CHECK failed: identity isolation is incomplete")

    platforms = registry.get("platforms", {})
    if not platforms:
        fail("ACCOUNT_CHECK failed: no registered platforms")
    for key, account in platforms.items():
        if account.get("account_owner") != "Stratum Praxis":
            fail(f"ACCOUNT_CHECK failed: {key} is not Stratum-owned")
        primary = str(account.get("primary_publisher") or "")
        if "buffer" in primary.lower():
            fail(f"ACCOUNT_CHECK failed: legacy Buffer route cannot be primary for {key}")
    print("ACCOUNT_CHECK=PASS")

    required_checks = {
        "BRAND_CHECK", "ACCOUNT_CHECK", "CHANNEL_CHECK",
        "DESTINATION_CHECK", "CTA_CHECK", "EVIDENCE_CHECK"
    }
    if set(policy.get("preflight_checks", [])) != required_checks:
        fail("CHANNEL_CHECK failed: six-check preflight contract is incomplete")
    if policy.get("fail_closed") is not True:
        fail("CHANNEL_CHECK failed: fail_closed must be true")
    if policy.get("scheduled_is_published") is not False:
        fail("CHANNEL_CHECK failed: SCHEDULED must not equal PUBLISHED")

    for key in ("ghost", "devto"):
        account = platforms.get(key) or {}
        if account.get("automation_allowed") is not True:
            fail(f"CHANNEL_CHECK failed: verified publication lane disabled: {key}")
        if account.get("credential_state") not in {"PRESENT_IN_ACTIONS_SECRETS", "VERIFIED"}:
            fail(f"CHANNEL_CHECK failed: verified publication credential state lost: {key}")

    x = platforms.get("x") or {}
    if x.get("automation_allowed") is not False or x.get("primary_publisher") != "MANUAL_ONLY":
        fail("CHANNEL_CHECK failed: X must remain MANUAL_ONLY")
    print("CHANNEL_CHECK=PASS")

    hosts = {str(x).lower() for x in registry.get("allowed_destination_hosts", [])}
    if "stratumpraxis.com" not in hosts:
        fail("DESTINATION_CHECK failed: canonical Stratum host missing")
    print("DESTINATION_CHECK=PASS")

    contract = policy.get("evidence_contract", {})
    required_evidence = {"platform_accepted", "post_or_article_id", "public_url", "account_verified"}
    if set(contract.get("published_requires", [])) != required_evidence:
        fail("EVIDENCE_CHECK failed: published evidence contract incomplete")
    print("CTA_CHECK=PASS")
    print("EVIDENCE_CHECK=PASS")

    gmail = registry.get("dedicated_identity", {}).get("gmail", {})
    gmail_state = gmail.get("state", "UNKNOWN")
    gmail_address = gmail.get("address")
    if gmail_state == "VERIFIED":
        if not gmail_address or not str(gmail_address).lower().endswith("@gmail.com"):
            fail("ACCOUNT_CHECK failed: VERIFIED dedicated Gmail requires a Gmail address")
        print("DEDICATED_GMAIL=VERIFIED")
    else:
        print(f"DEDICATED_GMAIL={gmail_state}")
        print("HUMAN_GATE: dedicated Stratum Gmail remains explicitly unverified; no identity inference is allowed")

    print("PUBLICATION_GOVERNANCE=PASS")


if __name__ == "__main__":
    main()
