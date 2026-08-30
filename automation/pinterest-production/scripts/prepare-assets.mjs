import fs from 'node:fs';
import path from 'node:path';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});

const script = `Before you automate an AI agent, check three things. Scope: what can it touch? Approval: which actions need a human? Stop: exactly what makes it halt? If you cannot answer all three, do not add more autonomy yet. Save this checklist. Build the operating layer before the agent moves fast.`;

const voicesResponse = await fetch('https://api.speechify.ai/v1/voices?locale=en&model=simba-3.2', {
  headers: {Authorization: `Bearer ${speechifyKey}`},
});
if (!voicesResponse.ok) throw new Error(`Speechify voices check failed: ${voicesResponse.status}`);
const voicesPayload = await voicesResponse.json();
const voices = Array.isArray(voicesPayload) ? voicesPayload : voicesPayload.voices;
if (!Array.isArray(voices) || voices.length === 0) throw new Error('No compatible English voices');
const preferred = voices.find((v) => v.id === 'geffen_32') || voices[0];

const speechResponse = await fetch('https://api.speechify.ai/v1/audio/speech', {
  method: 'POST',
  headers: {Authorization: `Bearer ${speechifyKey}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({input: script, voice_id: preferred.id, audio_format: 'mp3', model: 'simba-3.2'}),
});
if (!speechResponse.ok) {
  const body = await speechResponse.text();
  throw new Error(`Speechify TTS failed: ${speechResponse.status} ${body}`);
}
const speech = await speechResponse.json();
if (!speech?.audio_data) throw new Error('Speechify returned no audio_data');
fs.writeFileSync(path.join(publicDir, 'narration.mp3'), Buffer.from(speech.audio_data, 'base64'));
fs.writeFileSync(path.join(publicDir, 'script.txt'), script);

// Original, copyright-safe ambient bed: soft sine layers with slow envelopes.
const sampleRate = 44100;
const seconds = 22;
const channels = 2;
const samples = sampleRate * seconds;
const bytesPerSample = 2;
const dataSize = samples * channels * bytesPerSample;
const wav = Buffer.alloc(44 + dataSize);
let o = 0;
const ws = (s) => { wav.write(s, o, 'ascii'); o += s.length; };
ws('RIFF'); wav.writeUInt32LE(36 + dataSize, o); o += 4; ws('WAVE'); ws('fmt ');
wav.writeUInt32LE(16, o); o += 4; wav.writeUInt16LE(1, o); o += 2; wav.writeUInt16LE(channels, o); o += 2;
wav.writeUInt32LE(sampleRate, o); o += 4; wav.writeUInt32LE(sampleRate * channels * bytesPerSample, o); o += 4;
wav.writeUInt16LE(channels * bytesPerSample, o); o += 2; wav.writeUInt16LE(16, o); o += 2; ws('data'); wav.writeUInt32LE(dataSize, o); o += 4;
for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const fadeIn = Math.min(1, t / 1.5);
  const fadeOut = Math.min(1, (seconds - t) / 2.2);
  const env = fadeIn * fadeOut * (0.64 + 0.18 * Math.sin(t * Math.PI * 0.17));
  const base = Math.sin(2 * Math.PI * 110 * t) * 0.25;
  const fifth = Math.sin(2 * Math.PI * 165 * t + 0.7) * 0.13;
  const air = Math.sin(2 * Math.PI * 330 * t + Math.sin(t * 0.31)) * 0.035;
  const pulse = Math.sin(2 * Math.PI * 0.5 * t) > 0.93 ? 0.025 * Math.sin(2 * Math.PI * 660 * t) : 0;
  const s = Math.max(-1, Math.min(1, (base + fifth + air + pulse) * env));
  const v = Math.round(s * 32767 * 0.22);
  wav.writeInt16LE(v, 44 + (i * channels) * 2);
  wav.writeInt16LE(v, 44 + (i * channels + 1) * 2);
}
fs.writeFileSync(path.join(publicDir, 'ambient.wav'), wav);
console.log(`Pinterest narration generated with ${preferred.id}; original ambient bed created.`);
