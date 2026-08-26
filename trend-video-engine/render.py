#!/usr/bin/env python3
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H, FPS = 720, 1280, 30


def run(cmd):
    print('+', ' '.join(str(x) for x in cmd))
    subprocess.run(cmd, check=True)


def pick_font():
    candidates = [
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for p in candidates:
        if Path(p).exists():
            return p
    raise SystemExit('No suitable font found. Install fonts-noto-cjk.')


def wrap_text(value, width):
    value = str(value or '').strip()
    if not value:
        return ''
    lines = []
    for para in value.splitlines():
        para = para.strip()
        if not para:
            lines.append('')
            continue
        if ' ' in para:
            words = para.split()
            cur = ''
            for word in words:
                test = word if not cur else f'{cur} {word}'
                if len(test) <= width:
                    cur = test
                else:
                    if cur:
                        lines.append(cur)
                    cur = word
            if cur:
                lines.append(cur)
        else:
            lines.extend(para[i:i+width] for i in range(0, len(para), width))
    return '\n'.join(lines)


def safe_color(value, fallback):
    value = str(value or '').strip()
    if len(value) == 7 and value.startswith('#') and all(c in '0123456789abcdefABCDEF' for c in value[1:]):
        return value
    return fallback


def esc_filter_path(path):
    return str(path).replace('\\', '\\\\').replace(':', '\\:').replace("'", "\\'")


def render_scene(scene, idx, tmpdir, font, palette):
    duration = float(scene.get('duration', 4.0))
    duration = max(2.0, min(duration, 12.0))
    bg = safe_color(scene.get('background'), palette[idx % len(palette)])
    accent = safe_color(scene.get('accent'), '#D7FF5B')

    headline_file = Path(tmpdir) / f'headline-{idx}.txt'
    body_file = Path(tmpdir) / f'body-{idx}.txt'
    source_file = Path(tmpdir) / f'source-{idx}.txt'
    eyebrow_file = Path(tmpdir) / f'eyebrow-{idx}.txt'

    headline_file.write_text(wrap_text(scene.get('headline', ''), 15), encoding='utf-8')
    body_file.write_text(wrap_text(scene.get('body', ''), 25), encoding='utf-8')
    source_file.write_text(wrap_text(scene.get('sourceLabel', ''), 34), encoding='utf-8')
    eyebrow_file.write_text(wrap_text(scene.get('eyebrow', 'TREND SIGNAL'), 24), encoding='utf-8')

    font_e = esc_filter_path(font)
    hf = esc_filter_path(headline_file)
    bf = esc_filter_path(body_file)
    sf = esc_filter_path(source_file)
    ef = esc_filter_path(eyebrow_file)

    filters = [
        f'drawbox=x=0:y=0:w={W}:h=18:color={accent}:t=fill',
        f'drawbox=x=55:y=118:w=610:h=2:color={accent}@0.7:t=fill',
        f"drawtext=fontfile='{font_e}':textfile='{ef}':expansion=none:fontsize=28:fontcolor={accent}:x=58:y=70",
        f"drawtext=fontfile='{font_e}':textfile='{hf}':expansion=none:fontsize=66:fontcolor=white:line_spacing=16:x=(w-text_w)/2:y=235:box=1:boxcolor=black@0.16:boxborderw=18",
    ]
    if body_file.read_text(encoding='utf-8').strip():
        filters.append(
            f"drawtext=fontfile='{font_e}':textfile='{bf}':expansion=none:fontsize=38:fontcolor=white@0.88:line_spacing=12:x=(w-text_w)/2:y=700"
        )
    if source_file.read_text(encoding='utf-8').strip():
        filters.append(
            f"drawtext=fontfile='{font_e}':textfile='{sf}':expansion=none:fontsize=21:fontcolor=white@0.58:line_spacing=8:x=55:y=h-text_h-75"
        )
    filters.extend([
        'fade=t=in:st=0:d=0.22',
        f'fade=t=out:st={max(0.0, duration-0.22):.3f}:d=0.22',
    ])

    out = Path(tmpdir) / f'scene-{idx:02d}.mp4'
    run([
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning',
        '-f', 'lavfi', '-i', f'color=c={bg}:s={W}x{H}:r={FPS}:d={duration}',
        '-vf', ','.join(filters),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
        '-pix_fmt', 'yuv420p', '-an', str(out)
    ])
    return out, duration


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: render.py manifest.json')
    manifest_path = Path(sys.argv[1])
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    scenes = manifest.get('scenes') or []
    if not scenes:
        raise SystemExit('Manifest has no scenes')

    output = Path(manifest.get('outputFile', 'media/trend-videos/output.mp4'))
    output.parent.mkdir(parents=True, exist_ok=True)
    font = pick_font()
    palette = ['#0A0D14', '#111827', '#151925', '#0B1320', '#17131F']

    with tempfile.TemporaryDirectory(prefix='trend-video-') as tmpdir:
        parts = []
        total = 0.0
        for idx, scene in enumerate(scenes):
            part, dur = render_scene(scene, idx, tmpdir, font, palette)
            parts.append(part)
            total += dur

        concat_file = Path(tmpdir) / 'concat.txt'
        concat_file.write_text('\n'.join(f"file '{p.as_posix()}'" for p in parts), encoding='utf-8')
        video_only = Path(tmpdir) / 'video-only.mp4'
        run([
            'ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning',
            '-f', 'concat', '-safe', '0', '-i', str(concat_file),
            '-c', 'copy', str(video_only)
        ])

        # Procedural, original, low-volume ambient bed. No third-party music asset.
        audio_expr = '0.020*sin(2*PI*110*t)+0.010*sin(2*PI*165*t)+0.008*sin(2*PI*220*t)'
        run([
            'ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning',
            '-i', str(video_only),
            '-f', 'lavfi', '-i', f'aevalsrc={audio_expr}:s=48000:d={total:.3f}',
            '-filter:a', f'afade=t=in:st=0:d=0.7,afade=t=out:st={max(0.0,total-0.9):.3f}:d=0.9',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
            '-shortest', '-movflags', '+faststart', str(output)
        ])

    print(json.dumps({'rendered': str(output), 'durationSeconds': round(total, 3)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
