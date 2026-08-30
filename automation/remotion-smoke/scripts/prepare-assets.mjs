import fs from 'node:fs';
import path from 'node:path';
import {SpeechifyClient} from '@speechify/api';

const speechifyKey = process.env.SPEECHIFY_API_KEY;
const stabilityKey = process.env.STABILITY_API_KEY;

if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');
if (!stabilityKey) throw new Error('Missing STABILITY_API_KEY');

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, {recursive: true});

console.log('Checking Speechify API...');
const client = new SpeechifyClient({apiKey: speechifyKey});
const voices = await client.tts.voices.list();
if (!voices?.length) throw new Error('Speechify returned no voices');
const preferred = voices.find((v) => String(v.locale || v.language || '').toLowerCase().startsWith('en')) || voices[0];
console.log(`Speechify OK: using voice ${preferred.id}`);

const speech = await client.tts.audio.speech({
  voiceId: preferred.id,
  input: 'Stratum Praxis automation pipeline is online. Remotion rendering is connected.',
});
if (!speech?.audioData) throw new Error('Speechify returned no audioData');
fs.writeFileSync(path.join(publicDir, 'narration.mp3'), Buffer.from(speech.audioData, 'base64'));
console.log('Speechify narration generated.');

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
