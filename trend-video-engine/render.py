#!/usr/bin/env python3
import json
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
    accent = safe_color(scene.get('accent'), '#7CFFDA')

    headline_file = Path(tmpdir) / f'headline-{idx}.txt'
    body_file = Path(tmpdir) / f'body-{idx}.txt'
    source_file = Path(tmpdir) / f'source-{idx}.txt'
    eyebrow_file = Path(tmpdir) / f'eyebrow-{idx}.txt'
    tag_file = Path(tmpdir) / f'tag-{idx}.txt'

    headline_file.write_text(wrap_text(scene.get('headline', ''), 15), encoding='utf-8')
    body_file.write_text(wrap_text(scene.get('body', ''), 25), encoding='utf-8')
    source_file.write_text(wrap_text(scene.get('sourceLabel', ''), 34), encoding='utf-8')
    eyebrow_file.write_text(wrap_text(scene.get('eyebrow', 'TREND SIGNAL'), 24), encoding='utf-8')
    tag_file.write_text(wrap_text(scene.get('motionTag', f'SIGNAL {idx+1:02d}'), 20), encoding='utf-8')

    font_e = esc_filter_path(font)
    hf = esc_filter_path(headline_file)
    bf = esc_filter_path(body_file)
    sf = esc_filter_path(source_file)
    ef = esc_filter_path(eyebrow_file)
    tf = esc_filter_path(tag_file)

    # Motion is intentionally continuous but low-amplitude: kinetic without strobe/flicker.
    filters = [
        'noise=alls=3:allf=t+u',
        'drawgrid=w=72:h=72:t=1:c=white@0.045',
        'vignette=angle=PI/5',
        f'drawbox=x=0:y=0:w={W}:h=14:color={accent}:t=fill',
        f'drawbox=x=38:y=54:w=644:h=1160:color=white@0.025:t=fill',
        f'drawbox=x=52:y=156:w=616:h=2:color={accent}@0.65:t=fill',
        f'drawbox=x=52:y=1040:w=140:h=4:color={accent}@0.85:t=fill',
        f"drawtext=fontfile='{font_e}':textfile='{ef}':expansion=none:fontsize=27:fontcolor={accent}:x='52+10*sin(t*1.8)':y='86+3*sin(t*1.2)'",
        f"drawtext=fontfile='{font_e}':textfile='{tf}':expansion=none:fontsize=18:fontcolor=white@0.42:x='w-text_w-54-12*sin(t*1.35)':y='88+4*cos(t*1.1)'",
        f"drawtext=fontfile='{font_e}':textfile='{hf}':expansion=none:fontsize=67:fontcolor=white:line_spacing=16:x='(w-text_w)/2+16*sin(t*0.92)':y='245+10*sin(t*0.72)':box=1:boxcolor=black@0.10:boxborderw=20",
    ]
    if body_file.read_text(encoding='utf-8').strip():
        filters.append(
            f"drawtext=fontfile='{font_e}':textfile='{bf}':expansion=none:fontsize=37:fontcolor=white@0.90:line_spacing=12:x='(w-text_w)/2-10*sin(t*0.84)':y='710+8*cos(t*0.73)'"
        )
    # Moving micro-copy gives a UI / HUD feel without copying any platform visual language.
    filters.append(
        f"drawtext=fontfile='{font_e}':text='/// LIVE CULTURE SIGNAL':expansion=none:fontsize=17:fontcolor={accent}@0.55:x='54+mod(t*34,120)':y=1070"
    )
    if source_file.read_text(encoding='utf-8').strip():
        filters.append(
            f"drawtext=fontfile='{font_e}':textfile='{sf}':expansion=none:fontsize=20:fontcolor=white@0.55:line_spacing=8:x='55+4*sin(t*0.5)':y=h-text_h-72"
        )
    filters.extend([
        'fade=t=in:st=0:d=0.18',
        f'fade=t=out:st={max(0.0, duration-0.18):.3f}:d=0.18',
    ])

    out = Path(tmpdir) / f'scene-{idx:02d}.mp4'
    run([
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning',
        '-f', 'lavfi', '-i', f'color=c={bg}:s={W}x{H}:r={FPS}:d={duration}',
        '-vf', ','.join(filters),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
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
    palette = ['#050811', '#071421', '#10102A', '#07151A', '#130A1D']

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

        # Original procedural electronic bed. No sample packs or third-party music.
        audio_expr = '0.018*sin(2*PI*82*t)+0.010*sin(2*PI*164*t)+0.006*sin(2*PI*328*t)'
        run([
            'ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning',
            '-i', str(video_only),
            '-f', 'lavfi', '-i', f'aevalsrc={audio_expr}:s=48000:d={total:.3f}',
            '-filter:a', f'volume=0.72,afade=t=in:st=0:d=0.45,afade=t=out:st={max(0.0,total-0.65):.3f}:d=0.65',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
            '-shortest', '-movflags', '+faststart', str(output)
        ])

    print(json.dumps({'rendered': str(output), 'durationSeconds': round(total, 3), 'visualMode': 'kinetic-near-future-v2'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
