import fs from 'node:fs/promises';

const sampleRate = 44100;
const seconds = 48;
const channels = 2;
const frames = sampleRate * seconds;
const data = Buffer.alloc(frames * channels * 2);

let seed = 0x51f15e;
const rand = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0xffffffff;
};

const clamp = (x) => Math.max(-1, Math.min(1, x));
const smoothstep = (x) => x * x * (3 - 2 * x);

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const fadeIn = smoothstep(Math.min(1, t / 2.2));
  const fadeOut = smoothstep(Math.min(1, (seconds - t) / 3.4));
  const env = fadeIn * fadeOut;

  const pulse = Math.max(0, Math.sin(2 * Math.PI * 0.25 * t));
  const slow = Math.sin(2 * Math.PI * 0.055 * t);
  const drone =
    0.18 * Math.sin(2 * Math.PI * 55 * t + 0.18 * Math.sin(2 * Math.PI * 0.08 * t)) +
    0.10 * Math.sin(2 * Math.PI * 82.5 * t) +
    0.06 * Math.sin(2 * Math.PI * 110 * t + 0.5);
  const glass =
    0.045 * Math.sin(2 * Math.PI * 440 * t + 2.0 * slow) +
    0.025 * Math.sin(2 * Math.PI * 660 * t + 0.7);
  const noise = (rand() * 2 - 1) * 0.012 * (0.35 + 0.65 * pulse);
  const transient = Math.exp(-((t % 8.0) / 0.45)) * 0.08 * Math.sin(2 * Math.PI * 180 * t);

  const base = clamp((drone + glass + noise + transient) * env * 0.58);
  const width = 0.018 * Math.sin(2 * Math.PI * 0.09 * t);
  const left = clamp(base + width);
  const right = clamp(base - width);

  const off = i * 4;
  data.writeInt16LE(Math.round(left * 32767), off);
  data.writeInt16LE(Math.round(right * 32767), off + 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * channels * 2, 28);
header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/bgm.wav', Buffer.concat([header, data]));
console.log(JSON.stringify({ seconds, sampleRate, channels, style: 'dark investigative ambient pulse' }));
