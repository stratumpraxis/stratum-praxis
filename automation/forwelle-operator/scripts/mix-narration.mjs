import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve('automation/forwelle-operator');
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'current.json'), 'utf8'));
const output = path.resolve(manifest.outputFile);
const narration = path.resolve(ROOT, 'narration.mp3');
const temp = `${output}.narrated.mp4`;

const args = [
  '-y','-hide_banner','-loglevel','warning',
  '-i', output, '-i', narration,
  '-filter_complex', '[0:a]volume=0.14[bg];[1:a]volume=1.00,highpass=f=70,lowpass=f=12000[vo];[bg][vo]amix=inputs=2:duration=first:dropout_transition=1.5[a]',
  '-map','0:v:0','-map','[a]',
  '-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',temp
];
const r = spawnSync('ffmpeg', args, {stdio: 'inherit'});
if (r.status !== 0) throw new Error(`ffmpeg narration mix failed with code ${r.status}`);
await fs.rename(temp, output);
console.log(`Narration mixed into ${manifest.outputFile}`);
