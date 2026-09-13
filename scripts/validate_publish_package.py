#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

REGISTRY_PATH = Path("distribution/publication-hub/account-registry.json")
POLICY_PATH = Path("distribution/publication-hub/publishing-policy.json")
REQUIRED = ["brand", "content_id", "platform", "hook", "cta", "destination", "status"]
ALLOWED_STATUSES = {
    "DRAFT", "VALIDATED", "QUEUED", "SCHEDULED", "SUBMITTED",
    "PUBLISHED", "FAILED", "MANUAL_GATE"
}
ACTIVE_AUTO_STATUSES = {"VALIDATED", "QUEUED", "SCHEDULED", "SUBMITTED", "PUBLISHED"}
PLATFORM_ALIASES = {
    "dev.to": "devto",
    "dev": "devto",
    "twitter": "x",
    "youtube": "youtube",
    "instagram": "instagram",
    "facebook": "facebook",
    "linkedin": "linkedin",
    "pinterest": "pinterest",
    "tiktok": "tiktok",
    "bluesky": "bluesky",
    "ghost": "ghost",
    "tips": "tips",
    "medium": "medium",
    "x": "x",
}


def fail(msg: str) -> None:
    print(f"FAIL_CLOSED: {msg}", file=sys.stderr)
    sys.exit(1)


def load_json(path: Path) -> dict:
    if not path.exists():
        fail(f"required governance file missing: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid governance json {path}: {exc}")


def clean_platform(value: object) -> str:
    raw = str(value or "").strip().lower()
    return PLATFORM_ALIASES.get(raw, raw)


def destination_check(destination: str, allowed_hosts: set[str]) -> None:
    try:
        parsed = urlparse(destination)
    except Exception as exc:
        fail(f"DESTINATION_CHECK failed: invalid URL ({exc})")
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"https", "http"} or not host:
        fail("DESTINATION_CHECK failed: absolute http(s) URL required")
    if host not in allowed_hosts:
        fail(f"DESTINATION_CHECK failed: host not approved for Stratum: {host}")
    print("DESTINATION_CHECK=PASS")


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: validate_publish_package.py <package.json>")

    path = Path(sys.argv[1])
    if not path.exists():
        fail(f"package not found: {path}")

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"invalid json: {exc}")

    registry = load_json(REGISTRY_PATH)
    policy = load_json(POLICY_PATH)

    missing = [k for k in REQUIRED if data.get(k) in (None, "")]
    if missing:
        fail("missing required fields: " + ", ".join(missing))

    if data["brand"] != registry.get("project") or data["brand"] != policy.get("project"):
        fail("BRAND_CHECK failed: package is not Stratum-owned")
    print("BRAND_CHECK=PASS")

    status = str(data["status"]).strip().upper()
    if status not in ALLOWED_STATUSES:
        fail(f"invalid status: {status}")

    platform = clean_platform(data["platform"])
    platforms = registry.get("platforms", {})
    account = platforms.get(platform)
    if not account:
        fail(f"ACCOUNT_CHECK failed: platform is absent from Stratum Account Registry: {platform}")
    if account.get("account_owner") != registry.get("public_brand"):
        fail("ACCOUNT_CHECK failed: account owner does not match Stratum Praxis")

    registered_handle = str(account.get("handle") or "").strip().lower()
    package_handle = str(data.get("account_handle") or "").strip().lower()
    if registered_handle:
        if not package_handle:
            fail(f"ACCOUNT_CHECK failed: account_handle required for {platform}")
        if package_handle != registered_handle:
            fail(f"ACCOUNT_CHECK failed: {package_handle} != registered {registered_handle}")
    print("ACCOUNT_CHECK=PASS")

    # X is always content-package-only. No automated queue, schedule or publish action.
    if platform == "x" and status not in {"DRAFT", "MANUAL_GATE"}:
        fail("CHANNEL_CHECK failed: X is MANUAL_ONLY")

    publish_mode = str(data.get("publish_mode") or "AUTO").strip().upper()
    if status in ACTIVE_AUTO_STATUSES and publish_mode != "MANUAL":
        if account.get("automation_allowed") is not True:
            state = account.get("credential_state", "UNKNOWN")
            fail(f"CHANNEL_CHECK failed: {platform} automation not approved ({state})")
    print("CHANNEL_CHECK=PASS")

    allowed_hosts = {str(x).lower() for x in registry.get("allowed_destination_hosts", [])}
    destination_check(str(data["destination"]).strip(), allowed_hosts)

    cta = str(data.get("cta") or "").strip()
    if not cta or cta.upper() in {"TBD", "TODO", "PLACEHOLDER"}:
        fail("CTA_CHECK failed: real CTA or explicit NONE is required")
    print("CTA_CHECK=PASS")

    evidence = data.get("evidence", {}) or {}
    if status == "PUBLISHED":
        public_id = data.get("post_id") or data.get("article_id")
        if not public_id:
            fail("EVIDENCE_CHECK failed: PUBLISHED requires post_id or article_id")
        if not data.get("public_url"):
            fail("EVIDENCE_CHECK failed: PUBLISHED requires public_url")
        if evidence.get("platform_accepted") is not True:
            fail("EVIDENCE_CHECK failed: PUBLISHED requires platform_accepted=true")
        if evidence.get("account_verified") is not True:
            fail("EVIDENCE_CHECK failed: PUBLISHED requires account_verified=true")

    if status == "SCHEDULED":
        if not data.get("scheduled_at"):
            fail("EVIDENCE_CHECK failed: SCHEDULED requires scheduled_at")
        if data.get("public_url") or data.get("post_id") or data.get("article_id"):
            print("NOTE: scheduled evidence exists, but SCHEDULED is still not PUBLISHED")

    if status == "FAILED":
        failure = data.get("failure", {}) or {}
        if not failure.get("classification"):
            fail("EVIDENCE_CHECK failed: FAILED requires failure.classification")
        if not failure.get("next_route"):
            fail("EVIDENCE_CHECK failed: FAILED requires failure.next_route")
        if failure.get("retry_same_route") is True:
            fail("EVIDENCE_CHECK failed: infinite same-route retry is forbidden")

    print("EVIDENCE_CHECK=PASS")
    print(f"PASS: Stratum publish package validated ({platform} / {status})")


if __name__ == "__main__":
    main()
