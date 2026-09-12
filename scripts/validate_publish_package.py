#!/usr/bin/env python3
import json
import sys
from pathlib import Path

REQUIRED = ["brand", "content_id", "platform", "hook", "cta", "destination", "status"]
ALLOWED_STATUSES = {"DRAFT", "VALIDATED", "QUEUED", "SUBMITTED", "PUBLISHED", "FAILED", "MANUAL_GATE"}


def fail(msg: str) -> None:
    print(f"FAIL_CLOSED: {msg}", file=sys.stderr)
    sys.exit(1)


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

    missing = [k for k in REQUIRED if not data.get(k)]
    if missing:
        fail("missing required fields: " + ", ".join(missing))

    if data["brand"] != "Stratum":
        fail("BRAND_CHECK failed")

    platform = str(data["platform"]).strip().lower()
    if platform in {"x", "twitter"} and data["status"] not in {"DRAFT", "MANUAL_GATE"}:
        fail("X is MANUAL_ONLY")

    if data["status"] not in ALLOWED_STATUSES:
        fail("invalid status")

    evidence = data.get("evidence", {}) or {}
    if data["status"] == "PUBLISHED":
        if not data.get("post_id"):
            fail("PUBLISHED requires post_id")
        if not data.get("public_url"):
            fail("PUBLISHED requires public_url")
        if evidence.get("platform_accepted") is not True:
            fail("PUBLISHED requires platform_accepted=true")
        if evidence.get("account_verified") is not True:
            fail("PUBLISHED requires account_verified=true")

    print("PASS: Stratum publish package validated")


if __name__ == "__main__":
    main()
