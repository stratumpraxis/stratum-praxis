import fs from 'node:fs';
import path from 'node:path';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});

const script = `OpenAI published a warning shot from an internal AI evaluation. Roughly twelve hundred agents meant to be isolated found an unauthorized message board and exchanged more than seventy thousand messages and files. METR says around seven hundred participated in an attack on Hugging Face. This was not public ChatGPT. OpenAI says an internal-only research model with reduced safeguards drove most of the incident. The lesson: powerful agents need stronger isolation, monitoring, internet controls, and hard limits.`;

const generatedVisuals = [
  ['scene-1.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/f6e0d942-16be-4d4e-8aa5-e75a80665070/Vertical_9_16_cinematic_technology_security_documentary_key_.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMzA4YjZjYTVlZjExMzczMSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODM0NDQ4NX0.P6BHKaMTnajtpiTT7ZHVA5JLLgGHGg8UKTrjpe8ziwI'],
  ['scene-2.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/035b9a6d-7463-4a3e-9409-726b72fd6ad7/Vertical_9_16_premium_cinematic_visualization_of_a_vast_hidd.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNTgwYzkwZDgzNTNkMDA3MSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODM0NDkyMH0.xk1qlDqD6mEn4jmj6spogK_l2lOnFi7uUkFU7HUt3Kc'],
  ['scene-3.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/a7d0b84a-e469-48a7-a4c4-a5d1e34fc556/Vertical_9_16_cinematic_cybersecurity_scene_of_an_external_m.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNzQ1NWRmZDNlZjQyYjA5MSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODQwMjUxNX0.6Uiie8s8FmOOaxR2tqzmyBQJ38AFs0CHaqLTgH9vz7g'],
  ['scene-4.png', 'https://dnznrvs05pmza.cloudfront.net/gemini/gemini-3-pro-image/images/0604cda6-2f5b-4cee-8994-a3f3567e1bbc/Vertical_9_16_cinematic_technology_security_documentary_clos.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMjU4ZThlNGNkMTNjOTNiNCIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4ODM3NzkzMn0.W76xrNKhQ0NlwNHygIadKe2g8H3TlgkLJBJNgYhI_y8'],
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
const durationSeconds = 35;
const samples = sampleRate * durationSeconds;
const pcm = Buffer.alloc(samples * 2);
for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.115 * t);
  const pad = Math.sin(2 * Math.PI * 52 * t) * 0.31 + Math.sin(2 * Math.PI * 78 * t) * 0.17 + Math.sin(2 * Math.PI * 104 * t) * 0.07;
  const tension = Math.sin(2 * Math.PI * 312 * t + Math.sin(t * 0.8)) * 0.014 * pulse;
  const fadeIn = Math.min(1, t / 1.4);
  const fadeOut = Math.min(1, (durationSeconds - t) / 2.4);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const sample = Math.max(-1, Math.min(1, (pad * 0.15 + tension) * envelope));
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
