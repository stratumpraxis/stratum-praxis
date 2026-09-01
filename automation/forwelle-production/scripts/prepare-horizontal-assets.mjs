import fs from 'node:fs';
import path from 'node:path';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});
fs.mkdirSync(path.resolve('out'), {recursive: true});

const script = `AI is making millions of people faster. So why is it not making them richer? In PwC's 2026 Global CEO Survey, fifty-six percent of CEOs said AI had produced no significant financial benefit. And only twelve percent reported both cost and revenue gains. BCG found the same execution gap from another angle: more than half of CEOs see a missing link between AI and profit and loss, while only fourteen percent clearly define P and L impact for every AI initiative. The problem is not access to AI. It is what AI is attached to. Most people attach AI to tasks: write faster, summarize faster, generate more posts, build more dashboards. That creates output. It does not automatically create money. Revenue appears when AI is attached to a bottleneck with a dollar value: a missed lead, a slow quote, an abandoned cart, a no-show, or a repetitive deliverable somebody already pays for. Here is the filter. Pick one painful workflow. Pick one metric. Pick one customer action. Then measure revenue gained, cost removed, or time to outcome. If the number does not move, kill the automation. If it moves, scale it. That is also why boring workflows keep winning in real small-business discussions. Fast lead response, contact capture, and simple follow-up often matter more than a giant do-everything agent. PwC's latest performance research shows just how concentrated the upside is: the top twenty percent of companies capture seventy-four percent of AI-driven returns. The edge is not having more AI. The edge is connecting AI to an economic outcome. Stop asking, what can AI do? Ask, where is money leaking right now?`;

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
fs.writeFileSync(path.join(publicDir, 'horizontal-narration.mp3'), Buffer.from(speech.audio_data, 'base64'));
fs.writeFileSync(path.join(publicDir, 'horizontal-script.txt'), script);
console.log(`Horizontal narration generated with ${preferred.id}.`);

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

writeWav('horizontal-bed.wav', 110, (t, duration) => {
  const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.055 * t);
  const bass = Math.sin(2 * Math.PI * 48 * t) * 0.10 + Math.sin(2 * Math.PI * 72 * t) * 0.05;
  const pulse = Math.sin(2 * Math.PI * 2.0 * t) > 0.88 ? Math.sin(2 * Math.PI * 420 * t) * 0.018 : 0;
  const air = Math.sin(2 * Math.PI * 132 * t) * 0.012 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.09 * t));
  const fadeIn = Math.min(1, t / 2.0);
  const fadeOut = Math.min(1, (duration - t) / 3.0);
  return (bass * swell + pulse + air) * 0.34 * Math.max(0, Math.min(fadeIn, fadeOut));
});

writeWav('horizontal-hit.wav', 0.5, (t, duration) => {
  const env = Math.exp(-7 * t / duration);
  return (Math.sin(2 * Math.PI * 82 * t) * 0.45 + Math.sin(2 * Math.PI * 164 * t) * 0.16) * env;
});

writeWav('horizontal-whoosh.wav', 0.75, (t, duration) => {
  const x = t / duration;
  const env = Math.sin(Math.PI * x);
  const freq = 180 + 1200 * x;
  return Math.sin(2 * Math.PI * freq * t) * 0.07 * env;
});

console.log('Original horizontal bed and SFX generated.');
