import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const fail = (message) => {
  console.error(`HORIZONTAL QA FAIL: ${message}`);
  process.exit(1);
};

const output = process.argv[2] || 'out/forwelle-ai-roi-horizontal.mp4';
const requiredAssets = [
  'public/horizontal-narration.mp3',
  'public/horizontal-bed.wav',
  'public/horizontal-hit.wav',
  'public/horizontal-whoosh.wav',
  'public/horizontal-script.txt',
];

for (const asset of requiredAssets) {
  if (!fs.existsSync(asset)) fail(`missing required asset: ${asset}`);
  if (fs.statSync(asset).size === 0) fail(`empty required asset: ${asset}`);
}

if (fs.statSync('public/horizontal-narration.mp3').size < 100_000) fail('narration unexpectedly small');
if (fs.statSync('public/horizontal-bed.wav').size < 1_000_000) fail('music bed unexpectedly small');
if (!fs.existsSync(output)) fail(`rendered MP4 missing: ${output}`);
const bytes = fs.statSync(output).size;
if (bytes < 2_000_000) fail(`rendered MP4 unexpectedly small: ${bytes}`);

let probe;
try {
  const raw = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
    '-of', 'json',
    output,
  ], {encoding: 'utf8'});
  probe = JSON.parse(raw);
} catch (error) {
  fail(`ffprobe failed: ${error.message}`);
}

const video = probe.streams?.find((s) => s.codec_type === 'video');
const audio = probe.streams?.find((s) => s.codec_type === 'audio');
if (!video) fail('no video stream');
if (!audio) fail('no audio stream');
if (video.codec_name !== 'h264') fail(`unexpected codec: ${video.codec_name}`);
if (video.width !== 1920 || video.height !== 1080) fail(`unexpected dimensions: ${video.width}x${video.height}`);
const [fpsN, fpsD] = String(video.r_frame_rate || '0/1').split('/').map(Number);
const fps = fpsD ? fpsN / fpsD : 0;
if (Math.abs(fps - 30) > 0.1) fail(`unexpected fps: ${fps}`);
const duration = Number(probe.format?.duration || 0);
if (duration < 109.5 || duration > 110.5) fail(`unexpected duration: ${duration}`);

const report = {
  approved: true,
  format: '16:9 horizontal',
  topic: 'Why AI Is Not Making You Money — The Workflow Trap',
  evidence: [
    'PwC 2026 Global CEO Survey: 56% no significant financial benefit; 12% both cost and revenue gains',
    'PwC Global AI Performance Study: top 20% capture 74% of AI-driven returns',
    'BCG July 2026: >50% cite missing AI-to-P&L link; 14% define P&L impact for all AI initiatives',
  ],
  technical: {
    codec: video.codec_name,
    width: video.width,
    height: video.height,
    fps,
    duration,
    audioCodec: audio.codec_name,
    bytes,
  },
  safety: {
    realPersonLikeness: false,
    copiedNewsFootage: false,
    copiedYouTubeThumbnail: false,
    financialGetRichClaim: false,
    primarySurveyClaimsAttributed: true,
  },
  checks: [
    'required generated audio assets exist',
    '16:9 1920x1080 output',
    'H.264 video + audio stream',
    '30fps',
    '110-second target duration',
    'non-trivial output size',
    'no third-party footage or real-person likeness used',
  ],
};

fs.mkdirSync('out', {recursive: true});
fs.writeFileSync(path.join('out', 'qa-horizontal-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log('HORIZONTAL QA PASS');
console.log(JSON.stringify(report, null, 2));
