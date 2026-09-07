#!/usr/bin/env python3
"""Read-only RustChain bounty radar.

Fetches public open issues from Scottcjn/rustchain-bounties and prints issue
URLs plus a reward hint parsed from the title. This script does not claim,
comment, transfer funds, create wallets, or treat an open bounty as revenue.

Usage:
    python3 examples/rustchain_bounty_radar.py
    python3 examples/rustchain_bounty_radar.py --limit 15
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.error
import urllib.request

API = "https://api.github.com/repos/Scottcjn/rustchain-bounties/issues?state=open&per_page=100"
TITLE_REWARD_RE = re.compile(
    r"(?i)(\d+(?:\.\d+)?)\s*(?:[-–—]\s*(\d+(?:\.\d+)?)\s*)?RTC"
)


def fetch_open_issues() -> list[dict]:
    request = urllib.request.Request(
        API,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "stratum-praxis-rustchain-bounty-radar/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read())
    if not isinstance(payload, list):
        raise RuntimeError("GitHub returned an unexpected response shape")
    return [item for item in payload if isinstance(item, dict) and "pull_request" not in item]


def reward_hint(title: str) -> float | None:
    match = TITLE_REWARD_RE.search(title or "")
    if not match:
        return None
    low = float(match.group(1))
    high = float(match.group(2)) if match.group(2) else low
    return max(low, high)


def ranked_rows(issues: list[dict]) -> list[dict]:
    rows = []
    for issue in issues:
        title = issue.get("title") or ""
        if "bounty" not in title.lower() and "rtc" not in title.lower():
            continue
        rows.append(
            {
                "number": issue.get("number"),
                "title": title,
                "url": issue.get("html_url") or "",
                "reward_hint_rtc": reward_hint(title),
            }
        )
    rows.sort(
        key=lambda row: (
            row["reward_hint_rtc"] is not None,
            row["reward_hint_rtc"] or 0,
            row["number"] or 0,
        ),
        reverse=True,
    )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    if args.limit < 1 or args.limit > 100:
        parser.error("--limit must be between 1 and 100")

    try:
        issues = fetch_open_issues()
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as exc:
        print(f"radar_error: {type(exc).__name__}: {exc}")
        return 1

    rows = ranked_rows(issues)[: args.limit]
    print(f"open_issue_count={len(issues)}")
    print(f"candidate_count={len(rows)}")
    for row in rows:
        reward = row["reward_hint_rtc"]
        reward_text = f"{reward:g} RTC" if reward is not None else "reward not parsed"
        print(f"#{row['number']} | {reward_text} | {row['title']}")
        print(row["url"])

    print("\nNOTE: title reward is a discovery hint only. Verify the live issue rules, claim status, caps, required evidence, and actual settlement before treating anything as revenue.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
