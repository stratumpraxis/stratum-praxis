import fs from 'node:fs';
import path from 'node:path';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});
fs.mkdirSync(path.resolve('out'), {recursive: true});

const script = `AI is not failing because the model is weak. It is failing because most people automate the wrong layer.

They automate tasks. Write the email faster. Make the slide faster. Generate ten ideas instead of two. The task gets cheaper. The business does not automatically get richer.

Here is the hidden structure: profit is rarely created at the task itself. Profit is created when a constraint disappears.

If sales is the bottleneck, automating content gives you more content, not more customers. If approvals are the bottleneck, AI creates more work waiting for approval. If nobody wants the offer, AI produces unwanted output at machine speed.

Then a second cost appears: the verification tax. More output means more checking, more choosing, more coordination, and more mistakes hidden inside a larger pile of work.

So the company feels faster while the system stays stuck.

The profitable use of AI starts somewhere else. Find one expensive constraint. One place where money, time, or customers are actually leaking.

Then automate the path around that constraint: signal, decision, action, measurement.

Not: AI writes faster.

Instead: AI removes the thing blocking revenue.

That is the difference between AI productivity and AI profit.

The best workflow is not the one that creates the most output. It is the one that changes the number on the scoreboard.`;

const voicesResponse = await fetch('https://api.speechify.ai/v1/voices?locale=en&model=simba-3.2', {
  headers: {Authorization: `Bearer ${speechifyKey}`},
});
if (!voicesResponse.ok) throw new Error(`Speechify voices check failed: ${voicesResponse.status}`);
const voicesPayload = await voicesResponse.json();
const voices = Array.isArray(voicesPayload) ? voicesPayload : voicesPayload.voices;
if (!Array.isArray(voices) || voices.length === 0) throw new Error('No compatible English voices');

const male = voices.find((v) => String(v.gender || v.voice_gender || '').toLowerCase() === 'male');
const preferred = male || voices.find((v) => v.id === 'geffen_32') || voices[0];

const speechResponse = await fetch('https://api.speechify.ai/v1/audio/speech', {
  method: 'POST',
  headers: {Authorization: `Bearer ${speechifyKey}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({
    input: script,
    voice_id: preferred.id,
    audio_format: 'mp3',
    model: 'simba-3.2',
  }),
});
if (!speechResponse.ok) {
  const body = await speechResponse.text();
  throw new Error(`Speechify TTS failed: ${speechResponse.status} ${body}`);
}
const speech = await speechResponse.json();
if (!speech?.audio_data) throw new Error('Speechify returned no audio_data');
fs.writeFileSync(path.join(publicDir, 'hidden-narration.mp3'), Buffer.from(speech.audio_data, 'base64'));
fs.writeFileSync(path.join(publicDir, 'hidden-script.txt'), script);
fs.writeFileSync(path.join(publicDir, 'hidden-voice.json'), JSON.stringify({voiceId: preferred.id, gender: preferred.gender || preferred.voice_gender || 'unknown'}, null, 2));
console.log(`Hidden-structure narration generated with ${preferred.id}.`);

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

// Original, royalty-clean BGM: premium in-flight radio mood.
// Warm electric-piano-like harmonics, soft pads, restrained bass and sparse chimes.
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const chords = [
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [48, 52, 55, 59], // Cmaj7
  [55, 59, 62, 65], // G7-ish
];

writeWav('hidden-radio-bed.wav', 100, (t, duration) => {
  const chordIndex = Math.floor(t / 8) % chords.length;
  const chord = chords[chordIndex];
  const local = t % 8;
  const attack = Math.min(1, local / 0.9);
  const release = Math.min(1, (8 - local) / 1.6);
  const env = Math.max(0, Math.min(attack, release));
  let pad = 0;
  for (const note of chord) {
    const f = midi(note);
    pad += Math.sin(2 * Math.PI * f * t) * 0.020;
    pad += Math.sin(2 * Math.PI * f * 2 * t) * 0.006;
  }
  const root = midi(chord[0] - 12);
  const bassPulse = Math.sin(2 * Math.PI * root * t) * 0.035 * (0.55 + 0.45 * Math.max(0, Math.sin(Math.PI * (t % 2))));
  const shimmer = Math.sin(2 * Math.PI * 1320 * t) * 0.004 * Math.max(0, Math.sin(2 * Math.PI * 0.125 * t));
  const air = Math.sin(2 * Math.PI * 86 * t) * 0.006 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.037 * t));
  const fadeIn = Math.min(1, t / 3);
  const fadeOut = Math.min(1, (duration - t) / 4);
  return (pad * env + bassPulse + shimmer + air) * 0.72 * Math.max(0, Math.min(fadeIn, fadeOut));
});

writeWav('hidden-soft-hit.wav', 0.65, (t, duration) => {
  const env = Math.exp(-6.5 * t / duration);
  return (Math.sin(2 * Math.PI * 72 * t) * 0.30 + Math.sin(2 * Math.PI * 144 * t) * 0.08) * env;
});

writeWav('hidden-air-whoosh.wav', 0.9, (t, duration) => {
  const x = t / duration;
  const env = Math.sin(Math.PI * x);
  const f = 140 + 850 * x;
  return Math.sin(2 * Math.PI * f * t) * 0.045 * env;
});

writeWav('hidden-chime.wav', 1.2, (t) => {
  const env = Math.exp(-3.8 * t);
  return (Math.sin(2 * Math.PI * 880 * t) * 0.035 + Math.sin(2 * Math.PI * 1320 * t) * 0.018) * env;
});

console.log('Original premium in-flight-radio-style BGM and SFX generated.');
