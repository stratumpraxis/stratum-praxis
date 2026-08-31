#!/usr/bin/env python3
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent
REPORT_PATH = ENGINE_DIR / 'last-pipeline.json'


def fail(message, report=None):
    if report is not None:
        report['status'] = 'failed'
        report['error'] = message
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'PIPELINE FAIL: {message}')
    raise SystemExit(1)


def run_stage(name, command, report):
    print(f'== {name} ==')
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as exc:
        report['stages'][name] = {'status': 'failed', 'exitCode': exc.returncode}
        fail(f'{name} failed with exit code {exc.returncode}', report)
    report['stages'][name] = {'status': 'passed'}
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def preflight(manifest):
    errors = []
    scenes = manifest.get('scenes') or []
    language = str(manifest.get('language') or 'en').lower()
    is_ja = language.startswith('ja')
    max_headline_line = 18 if is_ja else 32
    max_body_chars = 90 if is_ja else 180

    if not 3 <= len(scenes) <= 12:
        errors.append('scene count must be 3..12')

    seen_primary = set()
    for index, scene in enumerate(scenes):
        headline = str(scene.get('headline') or '').strip()
        if not headline:
            errors.append(f'scene {index + 1}: headline is required')
            continue

        lines = [line.strip() for line in headline.splitlines() if line.strip()]
        if len(lines) > 3:
            errors.append(f'scene {index + 1}: headline exceeds 3 lines')
        for line in lines:
            if len(line) > max_headline_line:
                errors.append(
                    f'scene {index + 1}: headline line exceeds {max_headline_line} characters: {line}'
                )

        body = str(scene.get('body') or '').strip()
        if len(body) > max_body_chars:
            errors.append(f'scene {index + 1}: body copy is too dense ({len(body)} chars)')

        eyebrow = str(scene.get('eyebrow') or '').strip()
        if len(eyebrow) > 32:
            errors.append(f'scene {index + 1}: eyebrow exceeds 32 characters')

        motion_tag = str(scene.get('motionTag') or '').strip()
        if len(motion_tag) > 32:
            errors.append(f'scene {index + 1}: motionTag exceeds 32 characters')

        fingerprint = ' '.join(lines).lower()
        if fingerprint in seen_primary:
            errors.append(f'scene {index + 1}: duplicate primary screen message')
        seen_primary.add(fingerprint)

    return errors


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: pipeline.py manifest.json')

    manifest_path = Path(sys.argv[1])
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    report = {
        'status': 'running',
        'manifest': str(manifest_path),
        'videoId': manifest.get('id'),
        'startedAt': datetime.now(timezone.utc).isoformat(),
        'stages': {},
        'policy': {
            'mode': 'fail-closed',
            'sequence': ['preflight', 'render', 'qa', 'publish-ready'],
            'telopRules': [
                'one primary headline per scene',
                'maximum three headline lines',
                'headline density limit by language',
                'body-copy density limit',
                'duplicate primary-message rejection',
            ],
        },
    }

    errors = preflight(manifest)
    if errors:
        report['stages']['preflight'] = {'status': 'failed', 'errors': errors}
        fail('; '.join(errors), report)

    report['stages']['preflight'] = {'status': 'passed'}
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    run_stage('render', [sys.executable, str(ENGINE_DIR / 'render.py'), str(manifest_path)], report)
    run_stage('qa', [sys.executable, str(ENGINE_DIR / 'qa.py'), str(manifest_path)], report)

    report['stages']['publish-ready'] = {
        'status': 'passed',
        'note': 'External distribution safety audit still runs before publication.',
    }
    report['status'] = 'publish-ready'
    report['finishedAt'] = datetime.now(timezone.utc).isoformat()
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('PIPELINE PASS: publish-ready')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
