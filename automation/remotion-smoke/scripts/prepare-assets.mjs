import fs from 'node:fs';
import path from 'node:path';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
const stabilityKey = process.env.STABILITY_API_KEY;

if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');
if (!stabilityKey) throw new Error('Missing STABILITY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});

console.log('Checking Speechify API...');
const voicesResponse = await fetch('https://api.speechify.ai/v1/voices?locale=en&model=simba-3.2', {
  headers: {Authorization: `Bearer ${speechifyKey}`},
});
if (!voicesResponse.ok) {
  const body = await voicesResponse.text();
  throw new Error(`Speechify voices check failed: ${voicesResponse.status} ${body}`);
}
const voicesPayload = await voicesResponse.json();
const voices = Array.isArray(voicesPayload) ? voicesPayload : voicesPayload.voices;
if (!Array.isArray(voices) || voices.length === 0) throw new Error('Speechify returned no compatible English voices');
const preferred = voices.find((v) => v.id === 'geffen_32') || voices[0];
console.log(`Speechify OK: using voice ${preferred.id}`);

const speechResponse = await fetch('https://api.speechify.ai/v1/audio/speech', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${speechifyKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input: 'Stratum Praxis automation pipeline is online. Remotion rendering is connected.',
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
fs.writeFileSync(path.join(publicDir, 'narration.mp3'), Buffer.from(speech.audio_data, 'base64'));
console.log(`Speechify narration generated (${speech.billable_characters_count ?? 'unknown'} billable characters).`);

console.log('Checking Stability API key without consuming generation credits...');
const stabilityResponse = await fetch('https://api.stability.ai/v1/engines/list', {
  headers: {Authorization: `Bearer ${stabilityKey}`},
});
if (!stabilityResponse.ok) {
  const body = await stabilityResponse.text();
  throw new Error(`Stability API check failed: ${stabilityResponse.status} ${body}`);
}
const engines = await stabilityResponse.json();
console.log(`Stability OK: ${Array.isArray(engines) ? engines.length : 'unknown'} engines visible.`);

fs.writeFileSync(path.join(publicDir, 'pipeline-status.json'), JSON.stringify({
  speechify: 'ok',
  stability: 'ok',
  checkedAt: new Date().toISOString(),
}, null, 2));
console.log('Asset preparation complete.');
