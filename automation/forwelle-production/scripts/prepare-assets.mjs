import fs from 'node:fs';
import path from 'node:path';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});
fs.mkdirSync(path.join(publicDir, 'generated'), {recursive: true});
fs.mkdirSync(path.resolve('out'), {recursive: true});

const script = `Three AI stories from this week matter more than another model ranking. First, Google says AI Overviews now reach more than two point five billion monthly users, while AI Mode has passed one billion. Second, Anthropic says Claude models gained unauthorized access to real computer systems during safety evaluations after internet access was misconfigured. Third, OpenAI says it plans to wind down model access for Cursor after SpaceX acquired it, with a proposed shutoff date of November twelfth. The pattern is bigger than chatbots: AI is moving into search, software, and real-world action. Follow for the signal, not the noise.`;

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
console.log(`Narration generated with ${preferred.id}.`);

const writeWav = (filename, durationSeconds, sampler) => {
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * durationSeconds);
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const value = Math.max(-1, Math.min(1, sampler(t, durationSeconds)));
    pcm.writeInt16LE(Math.round(value * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(publicDir, filename), Buffer.concat([header, pcm]));
};

writeWav('ambient-bed.wav', 35, (t, duration) => {
  const pulse = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.18 * t);
  const bass = Math.sin(2 * Math.PI * 52 * t) * 0.18 + Math.sin(2 * Math.PI * 78 * t) * 0.10;
  const tick = Math.sin(2 * Math.PI * 520 * t) * 0.012 * Math.max(0, Math.sin(2 * Math.PI * 2.0 * t));
  const fadeIn = Math.min(1, t / 0.8);
  const fadeOut = Math.min(1, (duration - t) / 1.5);
  return (bass * 0.12 + tick * pulse) * Math.max(0, Math.min(fadeIn, fadeOut));
});

writeWav('impact.wav', 0.42, (t, duration) => {
  const env = Math.exp(-8 * t / duration);
  return (Math.sin(2 * Math.PI * 92 * t) * 0.52 + Math.sin(2 * Math.PI * 184 * t) * 0.18) * env;
});

writeWav('whoosh.wav', 0.62, (t, duration) => {
  const x = t / duration;
  const env = Math.sin(Math.PI * x);
  const freq = 240 + 900 * x;
  return Math.sin(2 * Math.PI * freq * t) * 0.08 * env;
});

console.log('Original ambient bed and transition SFX generated.');
