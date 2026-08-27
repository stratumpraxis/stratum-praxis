#!/usr/bin/env python3
import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('base_renderer', HERE / 'render.py')
base = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(base)


def run(cmd):
    print('+', ' '.join(str(x) for x in cmd))
    subprocess.run(cmd, check=True)


def main():
    if len(sys.argv) < 2:
        raise SystemExit('Usage: render-campaign.py manifest.json')
    manifest_path = Path(sys.argv[1])
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    scenes = manifest.get('scenes') or []
    if not scenes:
        raise SystemExit('Manifest has no scenes')

    output = Path(manifest.get('outputFile', 'media/trend-videos/output.mp4'))
    output.parent.mkdir(parents=True, exist_ok=True)
    font = base.pick_font()
    palette = ['#050811', '#071421', '#10102A', '#07151A', '#130A1D']

    with tempfile.TemporaryDirectory(prefix='trend-campaign-') as tmpdir:
        parts = []
        total = 0.0
        for idx, scene in enumerate(scenes):
            part, dur = base.render_scene(scene, idx, tmpdir, font, palette)
            parts.append(part)
            total += dur

        concat_file = Path(tmpdir) / 'concat.txt'
        concat_file.write_text('\n'.join(f"file '{p.as_posix()}'" for p in parts), encoding='utf-8')
        video_only = Path(tmpdir) / 'video-only.mp4'
        run(['ffmpeg','-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',str(concat_file),'-c','copy',str(video_only)])

        # Compatibility-first procedural bed. No copyrighted samples or external music.
        # Two simple oscillators are generated independently and mixed by amix.
        low = f'sine=frequency=74:sample_rate=48000:duration={total:.3f}'
        high = f'sine=frequency=148:sample_rate=48000:duration={total:.3f}'
        run([
            'ffmpeg','-y','-hide_banner','-loglevel','warning',
            '-i',str(video_only),
            '-f','lavfi','-i',low,
            '-f','lavfi','-i',high,
            '-filter_complex',f'[1:a]volume=0.020[a1];[2:a]volume=0.008[a2];[a1][a2]amix=inputs=2:duration=longest,afade=t=in:st=0:d=0.25,afade=t=out:st={max(0,total-0.45):.3f}:d=0.45[a]',
            '-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',str(output)
        ])

    print(json.dumps({'rendered':str(output),'durationSeconds':round(total,3),'visualMode':'kinetic-near-future-v3','audioMode':'procedural-two-tone-compatible'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
