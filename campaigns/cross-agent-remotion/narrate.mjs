import fs from 'node:fs/promises';
const key = process.env.SPEECHIFY_API_KEY;
if (!key) throw new Error('Missing SPEECHIFY_API_KEY');
const text = `When agents drift, operations break. More tools do not fix unclear ownership, permissions, handoffs, budgets, or stop rules. The failure is often the operating layer around the models. Cross-Agent Operating Kit gives a multi-AI stack one shared control system: a master policy, agent adapters, conflict checks, a Human Gate Matrix, budget and quota guards, and a migration score. Personal is sixty-nine dollars. Fix the operating layer before adding another agent.`;
const vr = await fetch('https://api.speechify.ai/v1/voices?locale=en&model=simba-3.2', {headers: {Authorization: `Bearer ${key}`}});
if (!vr.ok) throw new Error(`voices ${vr.status}`);
const payload = await vr.json();
const voices = Array.isArray(payload) ? payload : payload.voices;
const voice = voices.find((x) => x.id === 'geffen_32') || voices[0];
const r = await fetch('https://api.speechify.ai/v1/audio/speech', {
  method: 'POST',
  headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({input: text, voice_id: voice.id, audio_format: 'mp3', model: 'simba-3.2'}),
});
if (!r.ok) throw new Error(`tts ${r.status} ${await r.text()}`);
const j = await r.json();
await fs.mkdir('public', {recursive: true});
await fs.writeFile('public/narration.mp3', Buffer.from(j.audio_data, 'base64'));
await fs.writeFile('output-script.json', JSON.stringify({text, voice: voice.id, disclosure: 'AI-generated narration'}, null, 2));
console.log(JSON.stringify({voice: voice.id, chars: text.length, words: text.split(/\s+/).length}));
