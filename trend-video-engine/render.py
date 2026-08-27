#!/usr/bin/env python3
import json
import math
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

    # v3: layered motion. Still fully procedural, no third-party media.
    # Motion deliberately avoids strobe/flicker and keeps readable dwell time.
    filters = [
        'noise=alls=2:allf=t+u',
        'drawgrid=w=72:h=72:t=1:c=white@0.035',
        'vignette=angle=PI/5',
        f"drawbox=x='-180+mod(t*42+{idx*57},900)':y=180:w=240:h=780:color={accent}@0.055:t=fill",
        f"drawbox=x='780-mod(t*28+{idx*91},980)':y=320:w=180:h=540:color=white@0.028:t=fill",
        f"drawbox=x='-260+min(t/0.55,1)*310':y=56:w=650:h=112:color=white@0.035:t=fill",
        f"drawbox=x=0:y=0:w={W}:h=12:color={accent}:t=fill",
        f"drawbox=x=48:y=174:w='180+70*sin(t*1.35)':h=3:color={accent}@0.75:t=fill",
        f"drawbox=x=48:y=1062:w='max(8,min(610,610*t/{duration}))':h=4:color={accent}@0.88:t=fill",
        f"drawbox=x='360+250*cos(t*0.52+{idx})':y='620+420*sin(t*0.38+{idx}*0.6)':w=7:h=7:color={accent}@0.65:t=fill",
        f"drawbox=x='360+170*cos(t*0.77+{idx}*0.4)':y='620+310*sin(t*0.61+{idx})':w=4:h=4:color=white@0.45:t=fill",
        f"drawtext=fontfile='{font_e}':textfile='{ef}':expansion=none:fontsize=27:fontcolor={accent}:x='52+18*(1-exp(-6*t))':y='88+3*sin(t*1.2)'",
        f"drawtext=fontfile='{font_e}':textfile='{tf}':expansion=none:fontsize=18:fontcolor=white@0.42:x='w-text_w-54-18*(1-exp(-5*t))':y='90+4*cos(t*1.1)'",
        f"drawtext=fontfile='{font_e}':textfile='{hf}':expansion=none:fontsize=67:fontcolor=white:line_spacing=16:x='(w-text_w)/2 + 70*exp(-5*t) + 9*sin(t*0.72)':y='248 + 38*exp(-4*t) + 8*sin(t*0.56)':box=1:boxcolor=black@0.10:boxborderw=20",
    ]
    if body_file.read_text(encoding='utf-8').strip():
        filters.append(
            f"drawtext=fontfile='{font_e}':textfile='{bf}':expansion=none:fontsize=37:fontcolor=white@0.90:line_spacing=12:x='(w-text_w)/2-38*exp(-4.5*t)-8*sin(t*0.66)':y='710+18*exp(-4*t)+7*cos(t*0.60)'"
        )

    filters.extend([
        f"drawtext=fontfile='{font_e}':text='/// SIGNAL {idx+1:02d}':expansion=none:fontsize=17:fontcolor={accent}@0.58:x='54+mod(t*24,90)':y=1090",
        f"drawtext=fontfile='{font_e}':text='00\\:{idx+1:02d}':expansion=none:fontsize=16:fontcolor=white@0.33:x=w-text_w-58:y=1090",
    ])
    if source_file.read_text(encoding='utf-8').strip():
        filters.append(
            f"drawtext=fontfile='{font_e}':textfile='{sf}':expansion=none:fontsize=20:fontcolor=white@0.55:line_spacing=8:x='55+4*sin(t*0.5)':y=h-text_h-72"
        )

    filters.extend([
        "scale=760:1352:flags=lanczos",
        f"crop={W}:{H}:x='20+8*sin(t*0.44+{idx})':y='36+10*cos(t*0.37+{idx}*0.7)'",
        'fade=t=in:st=0:d=0.14',
        f'fade=t=out:st={max(0.0, duration-0.14):.3f}:d=0.14',
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

        # Procedural electronic soundtrack: no samples, no licensed music, no third-party stems.
        # Quote the expression so commas inside if()/mod() stay part of the expression instead of
        # being parsed as lavfi filter separators.
        audio_expr = (
            '0.014*sin(2*PI*74*t)'
            '+0.007*sin(2*PI*148*t)'
            '+0.004*sin(2*PI*296*t)'
            '+0.010*if(lt(mod(t,0.50),0.045),sin(2*PI*660*t)*exp(-45*mod(t,0.50)),0)'
            '+0.007*if(lt(mod(t+0.25,0.50),0.035),sin(2*PI*330*t)*exp(-55*mod(t+0.25,0.50)),0)'
        )
        audio_source = f"aevalsrc=exprs='{audio_expr}':s=48000:d={total:.3f}"
        run([
            'ffmpeg', '-y', '-hide_banner', '-loglevel', 'warning',
            '-i', str(video_only),
            '-f', 'lavfi', '-i', audio_source,
            '-filter:a', f'volume=0.78,highpass=f=45,lowpass=f=9000,afade=t=in:st=0:d=0.30,afade=t=out:st={max(0.0,total-0.50):.3f}:d=0.50',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
            '-shortest', '-movflags', '+faststart', str(output)
        ])

    print(json.dumps({
        'rendered': str(output),
        'durationSeconds': round(total, 3),
        'visualMode': 'kinetic-near-future-v3',
        'motionFeatures': ['parallax', 'camera-drift', 'kinetic-type', 'hud-rails', 'orbit-markers', 'rhythmic-procedural-audio']
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
