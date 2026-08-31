import fs from 'node:fs/promises';

// BGM revision history:
// v1: brighter 94 BPM tech pulse — rejected as too promotional.
// v2: darker 86 BPM pad — improved, but transitions competed with narration.
// v3: selected. 82 BPM restrained documentary pulse, softer transients, more headroom.
const SR = 48000;
const DURATION = 94;
const CHANNELS = 2;
const N = SR * DURATION;
const bpm = 82;
const beat = 60 / bpm;
const transitions = [10.5, 23.5, 40.5, 49.5, 64.5, 76.5, 89.5];
const progression = [
  [73.42, 110.00, 146.83, 174.61],
  [65.41, 98.00, 130.81, 164.81],
  [82.41, 123.47, 164.81, 196.00],
  [61.74, 92.50, 123.47, 146.83],
];

let seed = 0x5e71a9;
const rand = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296 * 2 - 1;
};

const left = new Float64Array(N);
const right = new Float64Array(N);
let noiseL = 0;
let noiseR = 0;
let max = 0;

for (let i = 0; i < N; i++) {
  const t = i / SR;
  const segLen = DURATION / 8;
  const seg = Math.min(7, Math.floor(t / segLen));
  const chord = progression[seg % progression.length];
  const local = t - seg * segLen;
  const edge = Math.min(1, local / 1.25, (segLen - local) / 1.0);
  const env = Math.max(0, Math.min(1, edge));
  let l = 0;
  let r = 0;

  chord.forEach((f, j) => {
    const w = [0.16, 0.105, 0.07, 0.045][j];
    l += Math.sin(2 * Math.PI * f * t + j * 0.57) * w;
    l += Math.sin(2 * Math.PI * f * 2.002 * t + j * 0.31) * w * 0.08;
    r += Math.sin(2 * Math.PI * f * 1.0015 * t + j * 0.57 + 0.14) * w;
    r += Math.sin(2 * Math.PI * f * 1.998 * t + j * 0.35) * w * 0.08;
  });
  l *= 0.19 * env;
  r *= 0.19 * env;

  const phase = (t % beat) / beat;
  const pulse = Math.exp(-phase * 9.2);
  const root = chord[0];
  l += Math.sin(2 * Math.PI * root * 0.5 * t) * 0.038 * pulse;
  r += Math.sin(2 * Math.PI * root * 0.5 * t + 0.03) * 0.038 * pulse;

  // Sparse low impact kick every 4 beats.
  const four = beat * 4;
  const kt = t % four;
  if (kt < 0.22) {
    const kEnv = Math.exp(-kt * 19);
    const k = Math.sin(2 * Math.PI * (52 - 14 * Math.min(1, kt / 0.22)) * kt) * 0.048 * kEnv;
    l += k;
    r += k;
  }

  // Soft moving air texture.
  noiseL = noiseL * 0.997 + rand() * 0.003;
  noiseR = noiseR * 0.997 + rand() * 0.003;
  l += noiseL * 0.032;
  r += noiseR * 0.032;

  // Small tonal transition markers, intentionally quiet under narration.
  for (const hit of transitions) {
    const dt = t - hit;
    if (dt >= 0 && dt < 1.1) {
      const hEnv = Math.exp(-dt * 4.2);
      l += Math.sin(2 * Math.PI * 523.25 * dt) * 0.012 * hEnv;
      r += Math.sin(2 * Math.PI * 659.25 * dt + 0.12) * 0.011 * hEnv;
    }
  }

  const fadeIn = Math.min(1, t / 2.0);
  const fadeOut = Math.min(1, (DURATION - t) / 2.4);
  const master = Math.max(0, Math.min(fadeIn, fadeOut));
  l *= master;
  r *= master;
  left[i] = l;
  right[i] = r;
  max = Math.max(max, Math.abs(l), Math.abs(r));
}

const gain = max > 0 ? 0.62 / max : 1;
const dataSize = N * CHANNELS * 2;
const buf = Buffer.alloc(44 + dataSize);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataSize, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(CHANNELS, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * CHANNELS * 2, 28);
buf.writeUInt16LE(CHANNELS * 2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataSize, 40);
let o = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(left[i] * gain * 32767))), o); o += 2;
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(right[i] * gain * 32767))), o); o += 2;
}
await fs.mkdir('public', {recursive: true});
await fs.writeFile('public/bgm.wav', buf);
console.log(JSON.stringify({status: 'BGM_V3_SELECTED', duration: DURATION, sampleRate: SR, channels: CHANNELS, bpm, peakBeforeNormalize: max.toFixed(4), revisions: 3}));
