#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

BLOCKED_CATEGORIES = {
    'tragedy', 'accident', 'violent-crime', 'minors', 'sexual',
    'political-persuasion', 'medical-advice', 'legal-advice',
    'financial-advice', 'celebrity-likeness', 'real-person-likeness',
    'copyright-dependent-entertainment', 'rumor', 'impersonation'
}


def fail(message):
    print(f'QA FAIL: {message}')
    raise SystemExit(1)


def ffprobe(path):
    cmd = [
        'ffprobe', '-v', 'error', '-show_streams', '-show_format',
        '-of', 'json', str(path)
    ]
    return json.loads(subprocess.check_output(cmd, text=True))


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: qa.py manifest.json')
    manifest_path = Path(sys.argv[1])
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    safety = manifest.get('safety') or {}
    if safety.get('approved') is not True:
        fail('safety.approved must be true')
    if safety.get('factsVerified') is not True:
        fail('factsVerified must be true')
    if safety.get('originalityVerified') is not True:
        fail('originalityVerified must be true')
    if safety.get('realPersonLikeness') is True:
        fail('real-person likeness is not allowed in autonomous lane')
    if safety.get('copyrightedMedia') is True:
        fail('copyrighted media is not allowed in autonomous lane')

    categories = {str(x).strip().lower() for x in safety.get('categories', [])}
    hit = sorted(categories & BLOCKED_CATEGORIES)
    if hit:
        fail(f'blocked safety categories: {hit}')

    sources = manifest.get('sources') or []
    if not sources:
        fail('at least one factual source is required')
    for source in sources:
        url = str(source.get('url', ''))
        if not url.startswith('https://'):
            fail(f'non-HTTPS source: {url}')
        if source.get('factSource') is True and source.get('verified') is not True:
            fail(f'unverified factual source: {url}')

    for asset in manifest.get('thirdPartyAssets') or []:
        if asset.get('commercialUseVerified') is not True:
            fail('third-party asset lacks commercial-use verification')
        if not str(asset.get('sourceUrl', '')).startswith('https://'):
            fail('third-party asset source URL missing')
        if not str(asset.get('licenseUrl', '')).startswith('https://'):
            fail('third-party asset license URL missing')

    scenes = manifest.get('scenes') or []
    if not 3 <= len(scenes) <= 12:
        fail('scene count must be 3..12')
    total_manifest_duration = sum(float(s.get('duration', 0)) for s in scenes)
    if not 15 <= total_manifest_duration <= 60:
        fail(f'manifest duration must be 15..60s, got {total_manifest_duration}')

    publish = manifest.get('publish') or {}
    if publish.get('aiGeneratedLabel') is not True:
        fail('AI-generated labeling must be enabled')
    services = [str(x).lower() for x in publish.get('services', [])]
    allowed_services = {'instagram', 'tiktok', 'youtube'}
    if not services or any(s not in allowed_services for s in services):
        fail(f'publish services must be subset of {sorted(allowed_services)}')

    output = Path(manifest.get('outputFile', ''))
    if not output.exists() or output.stat().st_size < 100_000:
        fail('rendered MP4 missing or unexpectedly small')

    meta = ffprobe(output)
    streams = meta.get('streams') or []
    video = next((s for s in streams if s.get('codec_type') == 'video'), None)
    audio = next((s for s in streams if s.get('codec_type') == 'audio'), None)
    if not video:
        fail('no video stream')
    if not audio:
        fail('no audio stream')
    if video.get('codec_name') != 'h264':
        fail(f"video codec must be h264, got {video.get('codec_name')}")
    if audio.get('codec_name') != 'aac':
        fail(f"audio codec must be aac, got {audio.get('codec_name')}")
    if int(video.get('width', 0)) != 720 or int(video.get('height', 0)) != 1280:
        fail(f"unexpected dimensions {video.get('width')}x{video.get('height')}")

    duration = float((meta.get('format') or {}).get('duration', 0))
    if not 14.5 <= duration <= 61:
        fail(f'output duration outside safe short range: {duration}')

    report = {
        'approved': True,
        'outputFile': str(output),
        'bytes': output.stat().st_size,
        'durationSeconds': round(duration, 3),
        'videoCodec': video.get('codec_name'),
        'audioCodec': audio.get('codec_name'),
        'dimensions': [video.get('width'), video.get('height')],
        'services': services,
        'rightsMode': 'original-procedural' if not manifest.get('thirdPartyAssets') else 'licensed-third-party',
    }
    report_path = Path('trend-video-engine/last-qa.json')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('QA PASS')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
