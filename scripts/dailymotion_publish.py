#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

import requests

TOKEN_URL = "https://oauth2.dailymotion.com/v2/token"
API_BASE = "https://api.dailymotion.com/v2"


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def get_token(client_id: str, client_secret: str) -> str:
    response = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "video.manage",
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    token = payload.get("access_token")
    if not token:
        raise RuntimeError(f"No access_token in response: {payload}")
    return token


def create_upload_session(token: str) -> dict:
    response = requests.post(
        f"{API_BASE}/files/upload_sessions",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def upload_file(upload_url: str, video_path: Path) -> dict:
    with video_path.open("rb") as handle:
        response = requests.post(
            upload_url,
            files={"file": (video_path.name, handle, "video/mp4")},
            timeout=1800,
        )
    response.raise_for_status()
    return response.json()


def create_video(
    token: str,
    profile_id: str,
    file_url: str,
    title: str,
    description: str,
    category: str,
    visibility: str,
    tags: list[str],
    is_ai_altered: bool,
) -> dict:
    body = {
        "title": title,
        "description": description,
        "category": category,
        "visibility": visibility,
        "is_for_kids": False,
        "is_ai_altered": is_ai_altered,
        "tags": tags,
        "source": {"file_url": file_url},
    }
    response = requests.post(
        f"{API_BASE}/profiles/{profile_id}/videos",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish an MP4 to Dailymotion API v2")
    parser.add_argument("--file", required=True, help="Local MP4 path")
    parser.add_argument("--title", required=True)
    parser.add_argument("--description", default="")
    parser.add_argument("--category", default="tech")
    parser.add_argument("--visibility", choices=["public", "private", "password"], default="public")
    parser.add_argument("--tags", default="AI,automation,workflow,business,operations")
    parser.add_argument("--is-ai-altered", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    video_path = Path(args.file)
    if not video_path.is_file() or video_path.stat().st_size == 0:
        raise SystemExit(f"Video file not found or empty: {video_path}")
    if video_path.suffix.lower() != ".mp4":
        raise SystemExit("This publisher currently expects an .mp4 file")

    metadata = {
        "file": str(video_path),
        "bytes": video_path.stat().st_size,
        "title": args.title,
        "description": args.description,
        "category": args.category,
        "visibility": args.visibility,
        "is_for_kids": False,
        "is_ai_altered": args.is_ai_altered,
        "tags": [tag.strip() for tag in args.tags.split(",") if tag.strip()],
    }
    if args.dry_run:
        print(json.dumps(metadata, indent=2))
        return

    client_id = require_env("DAILYMOTION_CLIENT_ID")
    client_secret = require_env("DAILYMOTION_CLIENT_SECRET")
    profile_id = require_env("DAILYMOTION_PROFILE_ID")

    token = get_token(client_id, client_secret)
    session = create_upload_session(token)
    upload_url = session.get("upload_url")
    if not upload_url:
        raise RuntimeError(f"No upload_url in upload session: {session}")

    uploaded = upload_file(upload_url, video_path)
    file_url = uploaded.get("url")
    if not file_url:
        raise RuntimeError(f"No uploaded file URL in response: {uploaded}")

    created = create_video(
        token=token,
        profile_id=profile_id,
        file_url=file_url,
        title=args.title,
        description=args.description,
        category=args.category,
        visibility=args.visibility,
        tags=metadata["tags"],
        is_ai_altered=args.is_ai_altered,
    )
    print(json.dumps(created, indent=2))


if __name__ == "__main__":
    try:
        main()
    except requests.HTTPError as exc:
        response = exc.response
        detail = response.text[:4000] if response is not None else str(exc)
        print(f"Dailymotion API request failed: {detail}", file=sys.stderr)
        raise
