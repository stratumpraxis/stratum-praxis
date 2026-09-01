import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {SAFE_AREA, TELOP_COPY, TELOP_RULES} from '../src/telop-spec.mjs';

const fail = (message) => {
  console.error(`QA FAIL: ${message}`);
  process.exit(1);
};

const output = process.argv[2] || 'out/forwelle-chatgpt-ads-1b.mp4';
const specs = Object.values(TELOP_COPY);

if (SAFE_AREA.left < TELOP_RULES.minSideSafeArea || SAFE_AREA.right < TELOP_RULES.minSideSafeArea) fail('horizontal safe area is too small');
if (SAFE_AREA.top < TELOP_RULES.minTopSafeArea) fail('top safe area is too small');
if (SAFE_AREA.bottom < TELOP_RULES.minBottomSafeArea) fail('bottom safe area is too small');

const seen = new Set();
for (const spec of specs) {
  if (!spec.role) fail('every telop requires a semantic role');
  if (!spec.eyebrow || !spec.counter) fail(`${spec.role}: eyebrow/counter missing`);
  if (!Array.isArray(spec.lines)) fail(`${spec.role}: title lines missing`);
  if (spec.lines.length < TELOP_RULES.minTitleLines || spec.lines.length > TELOP_RULES.maxTitleLines) fail(`${spec.role}: title must use ${TELOP_RULES.minTitleLines}-${TELOP_RULES.maxTitleLines} lines`);
  for (const line of spec.lines) {
    if (!line.trim()) fail(`${spec.role}: empty title line`);
    if (line.length > TELOP_RULES.maxCharsPerTitleLine) fail(`${spec.role}: title line exceeds ${TELOP_RULES.maxCharsPerTitleLine} characters: ${line}`);
  }
  if (!Number.isInteger(spec.accentLine) || spec.accentLine < 0 || spec.accentLine >= spec.lines.length) fail(`${spec.role}: accentLine must point to one title line`);
  const fingerprint = spec.lines.join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (seen.has(fingerprint)) fail(`${spec.role}: duplicate screen message`);
  seen.add(fingerprint);
}

const preclips = [
  'public/generated/clip-money.mp4',
  'public/generated/clip-intent.mp4',
  'public/generated/clip-scale.mp4',
];
for (const clip of preclips) {
  if (!fs.existsSync(clip)) fail(`generated preclip missing: ${clip}`);
  if (fs.statSync(clip).size < 100_000) fail(`generated preclip unexpectedly small: ${clip}`);
}

if (!fs.existsSync(output)) fail(`rendered MP4 missing: ${output}`);
const bytes = fs.statSync(output).size;
if (bytes < 500_000) fail(`rendered MP4 unexpectedly small: ${bytes} bytes`);

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
  fail(`ffprobe technical QA failed: ${error.message}`);
}

const video = probe.streams?.find((s) => s.codec_type === 'video');
const audio = probe.streams?.find((s) => s.codec_type === 'audio');
if (!video) fail('no video stream');
if (!audio) fail('no audio stream');
if (video.codec_name !== 'h264') fail(`unexpected video codec: ${video.codec_name}`);
if (video.width !== 1080 || video.height !== 1920) fail(`unexpected dimensions: ${video.width}x${video.height}`);
const [fpsN, fpsD] = String(video.r_frame_rate || '0/1').split('/').map(Number);
const fps = fpsD ? fpsN / fpsD : 0;
if (Math.abs(fps - 30) > 0.1) fail(`unexpected fps: ${fps}`);
const duration = Number(probe.format?.duration || 0);
if (duration < 34.5 || duration > 35.5) fail(`unexpected duration: ${duration}`);

const report = {
  approved: true,
  preset: TELOP_RULES.preset,
  sceneCount: specs.length,
  generatedPreclips: preclips,
  safeArea: SAFE_AREA,
  titleRules: {
    maxLines: TELOP_RULES.maxTitleLines,
    maxCharsPerLine: TELOP_RULES.maxCharsPerTitleLine,
  },
  technical: {
    codec: video.codec_name,
    width: video.width,
    height: video.height,
    fps,
    duration,
    audioCodec: audio.codec_name,
  },
  outputFile: output,
  bytes,
  checks: [
    'three generated MP4 preclips exist before master edit',
    'platform-safe text margins',
    'one primary title message per scene',
    'title line-count and density limits',
    'explicit accent line per scene',
    'duplicate primary-message rejection',
    'ffprobe codec / dimensions / fps / duration / audio checks',
    'rendered output exists and is non-trivial',
  ],
};

const reportPath = 'out/qa-report.json';
fs.mkdirSync(path.dirname(reportPath), {recursive: true});
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log('QA PASS');
console.log(JSON.stringify(report, null, 2));
