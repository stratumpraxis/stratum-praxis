import fs from 'node:fs';
import path from 'node:path';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});

const script = `AI agents are leaving the screen. On August 27, Anthropic previewed the Model Hardware Standard: a shared way for AI agents to safely operate physical devices, from microscopes and liquid handlers to robotic arms. Anthropic says integrations that can take weeks or months could drop to hours or minutes. Agents can coordinate experiments and update parameters in real time. The next AI interface may not be a chat box. It may be the physical world.`;

const generatedVisuals = [
  ['scene-1.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/1efa83fb-71da-433d-982a-00d93808c082/Vertical_9_16_cinematic_technology_documentary_key_visual__f.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOTU2MTVjYmZkNGYxZWFiNSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODI4ODMxOX0.f4ccdRK6iI8qAA8paolyBYWiSbR8LUF1xZQpxqqxa7g'],
  ['scene-2.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/096abf57-7d5f-4d25-b139-114eea2dc1a5/Vertical_9_16_cinematic_macro_shot_of_a_futuristic_programma.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMzEzODgxOGJjYzY3MzA4NiIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODI4Mjc2M30.dDxS_eq52ltP3Y0IMZ3fq2L6LlkbNoF_r0Dk-XtgnW4'],
  ['scene-3.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/a3c9fe2b-1b33-4cc5-be30-9d29b5811258/Vertical_9_16_cinematic_close_up_of_a_sophisticated_automate.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMThlNmYyYzk4ZmE5ODk2ZCIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODM1MTgxN30.-oY_nxnrDhJXIWuWSiwVGsZWrhd0HVnns4CrZGbKhgw'],
  ['scene-4.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/61062c97-7669-4ba0-a24a-cf969a6f8caf/Vertical_9_16_cinematic_hero_shot_of_a_precision_robotic_arm.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMjRmOTY4YzU5YjBlMjYwOSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODM2NjY2MX0.e-uHRuoA-RUxULrxET1jljLlq3CKXCb8LbqJ5LCaoys'],
];

for (const [filename, url] of generatedVisuals) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Generated visual download failed (${filename}): ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`Generated visual is not an image (${filename}): ${contentType}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100_000) throw new Error(`Generated visual unexpectedly small (${filename}): ${bytes.length}`);
  fs.writeFileSync(path.join(publicDir, filename), bytes);
  console.log(`Visual ready: ${filename} (${bytes.length} bytes)`);
}

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

const sampleRate = 44100;
const durationSeconds = 33;
const samples = sampleRate * durationSeconds;
const pcm = Buffer.alloc(samples * 2);
for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.125 * t);
  const pad = Math.sin(2 * Math.PI * 55 * t) * 0.34 + Math.sin(2 * Math.PI * 82.5 * t) * 0.18 + Math.sin(2 * Math.PI * 110 * t) * 0.08;
  const shimmer = Math.sin(2 * Math.PI * 440 * t + Math.sin(t * 0.7)) * 0.018 * pulse;
  const fadeIn = Math.min(1, t / 1.6);
  const fadeOut = Math.min(1, (durationSeconds - t) / 2.2);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const sample = Math.max(-1, Math.min(1, (pad * 0.16 + shimmer) * envelope));
  pcm.writeInt16LE(Math.round(sample * 32767), i * 2);
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
fs.writeFileSync(path.join(publicDir, 'ambient-bed.wav'), Buffer.concat([header, pcm]));
console.log('Original ambient bed generated.');
