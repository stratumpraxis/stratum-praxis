import fs from 'node:fs/promises';

const SR = 48000;
const DURATION = 34;
const CHANNELS = 2;
const N = SR * DURATION;
const bpm = 92;
const beat = 60 / bpm;
const transitionTimes = [4, 9.5, 15, 21, 27];
const progression = [
  [110.00, 164.81, 220.00, 261.63],
  [87.31, 130.81, 174.61, 220.00],
  [130.81, 196.00, 246.94, 293.66],
  [98.00, 146.83, 196.00, 246.94],
];

let seed = 0x51f15e;
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
  const seg = Math.floor(t / segLen);
  const chord = progression[seg % progression.length];
  const local = t - seg * segLen;
  const edge = Math.min(1, local / .7, (segLen - local) / .65);
  const padEnv = .5 - .5 * Math.cos(Math.PI * Math.max(0, Math.min(1, edge)));

  let l = 0;
  let r = 0;
  chord.forEach((f, j) => {
    const w = [.19, .12, .10, .07][j];
    l += Math.sin(2 * Math.PI * f * t + j * .8) * w;
    l += Math.sin(2 * Math.PI * f * 2.002 * t + j) * w * .12;
    r += Math.sin(2 * Math.PI * f * 1.0018 * t + j * .8 + .18) * w;
    r += Math.sin(2 * Math.PI * f * 1.997 * t + j + .2) * w * .12;
  });
  l *= .24 * padEnv;
  r *= .24 * padEnv;

  const beatPhase = (t % beat) / beat;
  const pulseEnv = Math.exp(-beatPhase * 8.5);
  const root = chord[0];
  l += Math.sin(2 * Math.PI * root * .5 * t) * .055 * pulseEnv;
  r += Math.sin(2 * Math.PI * root * .5 * t + .04) * .055 * pulseEnv;

  const twoBeat = beat * 2;
  const kickT = t % twoBeat;
  if (kickT < .28) {
    const kEnv = Math.exp(-kickT * 17);
    const kFreq = 58 - 22 * Math.min(1, kickT / .28);
    const k = Math.sin(2 * Math.PI * kFreq * kickT) * .085 * kEnv;
    l += k;
    r += k;
  }

  noiseL = noiseL * .995 + rand() * .005;
  noiseR = noiseR * .995 + rand() * .005;
  l += noiseL * .055;
  r += noiseR * .055;

  for (const hit of transitionTimes) {
    const dt = t - hit;
    if (dt >= 0 && dt < 1.4) {
      const env = Math.exp(-dt * 2.8);
      l += (Math.sin(2 * Math.PI * 660 * dt) + .5 * Math.sin(2 * Math.PI * 990 * dt)) * .026 * env;
      r += (Math.sin(2 * Math.PI * 666 * dt + .2) + .5 * Math.sin(2 * Math.PI * 1002 * dt)) * .026 * env;
    }
  }

  const fadeIn = Math.min(1, t / 1.5);
  const fadeOut = Math.min(1, (DURATION - t) / 1.8);
  const master = Math.max(0, Math.min(fadeIn, fadeOut));
  l *= master;
  r *= master;
  left[i] = l;
  right[i] = r;
  max = Math.max(max, Math.abs(l), Math.abs(r));
}

const gain = max > 0 ? .72 / max : 1;
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
console.log(JSON.stringify({status: 'ORIGINAL_BGM_READY', duration: DURATION, sampleRate: SR, channels: CHANNELS, peakBeforeNormalize: max.toFixed(4)}));
