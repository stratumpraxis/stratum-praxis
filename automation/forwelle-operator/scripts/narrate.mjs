import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = path.resolve('automation/forwelle-operator');
const manifestPath = path.join(ROOT, 'current.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const speechifyKey = process.env.SPEECHIFY_API_KEY;
if (!speechifyKey) throw new Error('Missing SPEECHIFY_API_KEY');
const text = String(manifest.voiceover || '').trim();
if (!text) throw new Error('Manifest has no voiceover');

const voicesResponse = await fetch('https://api.speechify.ai/v1/voices?locale=en&model=simba-3.2', {
  headers: {Authorization: `Bearer ${speechifyKey}`},
});
if (!voicesResponse.ok) throw new Error(`Speechify voices check failed: ${voicesResponse.status}`);
const voicesPayload = await voicesResponse.json();
const voices = Array.isArray(voicesPayload) ? voicesPayload : voicesPayload.voices;
if (!Array.isArray(voices) || voices.length === 0) throw new Error('No compatible English voices');
const preferred = voices.find(v => v.id === 'geffen_32') || voices[0];

const speechResponse = await fetch('https://api.speechify.ai/v1/audio/speech', {
  method: 'POST',
  headers: {Authorization: `Bearer ${speechifyKey}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({input: text, voice_id: preferred.id, audio_format: 'mp3', model: 'simba-3.2'}),
});
if (!speechResponse.ok) throw new Error(`Speechify TTS failed: ${speechResponse.status} ${await speechResponse.text()}`);
const speech = await speechResponse.json();
if (!speech?.audio_data) throw new Error('Speechify returned no audio_data');
const narrationPath = path.join(ROOT, 'narration.mp3');
await fs.writeFile(narrationPath, Buffer.from(speech.audio_data, 'base64'));

const probe = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', narrationPath], {encoding:'utf8'});
if (probe.status !== 0) throw new Error(`ffprobe failed: ${probe.stderr}`);
const narrationSeconds = Number(String(probe.stdout).trim());
if (!Number.isFinite(narrationSeconds) || narrationSeconds <= 0) throw new Error('Could not determine narration duration');
if (narrationSeconds > 57) throw new Error(`Narration too long for safe Short: ${narrationSeconds.toFixed(2)}s`);

const target = Math.max(30, Math.min(58, narrationSeconds + 1.6));
const scenes = manifest.scenes || [];
const each = target / Math.max(1, scenes.length);
manifest.scenes = scenes.map(s => ({...s, duration: Number(Math.max(2.5, Math.min(11.5, each)).toFixed(3))}));
manifest.narration = {file: 'automation/forwelle-operator/narration.mp3', voiceId: preferred.id, durationSeconds: Number(narrationSeconds.toFixed(3))};
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({voice: preferred.id, narrationSeconds, videoTargetSeconds: manifest.scenes.reduce((n,s)=>n+s.duration,0)}, null, 2));
