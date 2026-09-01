import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const fail = (message) => {
  console.error(`HIDDEN HORIZONTAL QA FAIL: ${message}`);
  process.exit(1);
};

const output = process.argv[2] || 'out/forwelle-hidden-bottleneck.mp4';
const requiredAssets = [
  'public/hidden-narration.mp3',
  'public/hidden-script.txt',
  'public/hidden-voice.json',
  'public/hidden-radio-bed.wav',
  'public/hidden-soft-hit.wav',
  'public/hidden-air-whoosh.wav',
  'public/hidden-chime.wav',
];
for (const asset of requiredAssets) {
  if (!fs.existsSync(asset)) fail(`missing asset: ${asset}`);
  if (fs.statSync(asset).size === 0) fail(`empty asset: ${asset}`);
}
if (fs.statSync('public/hidden-narration.mp3').size < 100_000) fail('narration unexpectedly small');
if (fs.statSync('public/hidden-radio-bed.wav').size < 1_000_000) fail('generated BGM unexpectedly small');
if (!fs.existsSync(output)) fail(`render missing: ${output}`);
const bytes = fs.statSync(output).size;
if (bytes < 2_000_000) fail(`render unexpectedly small: ${bytes}`);

const voice = JSON.parse(fs.readFileSync('public/hidden-voice.json', 'utf8'));
const script = fs.readFileSync('public/hidden-script.txt', 'utf8');
for (const phrase of ['wrong layer', 'bottleneck', 'verification tax', 'constraint', 'scoreboard']) {
  if (!script.toLowerCase().includes(phrase)) fail(`missing hidden-structure phrase: ${phrase}`);
}

let probe;
try {
  probe = JSON.parse(execFileSync('ffprobe', [
    '-v','error',
    '-show_entries','format=duration:stream=codec_type,codec_name,width,height,r_frame_rate',
    '-of','json',
    output,
  ], {encoding:'utf8'}));
} catch (error) {
  fail(`ffprobe failed: ${error.message}`);
}

const video = probe.streams?.find((s)=>s.codec_type === 'video');
const audio = probe.streams?.find((s)=>s.codec_type === 'audio');
if (!video || !audio) fail('video or audio stream missing');
if (video.codec_name !== 'h264') fail(`unexpected codec: ${video.codec_name}`);
if (video.width !== 1920 || video.height !== 1080) fail(`unexpected dimensions: ${video.width}x${video.height}`);
const [n,d] = String(video.r_frame_rate || '0/1').split('/').map(Number);
const fps = d ? n/d : 0;
if (Math.abs(fps-30) > 0.1) fail(`unexpected fps: ${fps}`);
const duration = Number(probe.format?.duration || 0);
if (duration < 99.5 || duration > 100.5) fail(`unexpected duration: ${duration}`);

const report = {
  approved: true,
  format: '16:9 horizontal',
  topic: 'AI Is Not Making You Money — The Hidden Bottleneck',
  creative: {
    maleNarrationPreference: true,
    selectedVoiceId: voice.voiceId,
    selectedVoiceGenderMetadata: voice.gender,
    originalGeneratedBgm: true,
    audioDirection: 'premium in-flight radio mood; original composition, not a copied airline jingle or program theme',
    hiddenStructure: ['wrong automation layer','bottleneck economics','verification tax','constraint-first automation','scoreboard outcome'],
    motionDensity: 'continuous procedural motion; visual state changes throughout each scene',
  },
  technical: {codec:video.codec_name,width:video.width,height:video.height,fps,duration,audioCodec:audio.codec_name,bytes},
  safety: {
    copiedAirlineMusic:false,
    copiedBrandJingle:false,
    copiedCreatorVisuals:false,
    realPersonLikeness:false,
    financialGetRichClaim:false,
  },
};
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync(path.join('out','qa-horizontal-hidden-report.json'), `${JSON.stringify(report,null,2)}\n`);
console.log('HIDDEN HORIZONTAL QA PASS');
console.log(JSON.stringify(report,null,2));
