import fs from 'node:fs/promises';

const key = process.env.SPEECHIFY_API_KEY;
if (!key) throw new Error('Missing SPEECHIFY_API_KEY');

const text = `最強のAIを追いかけている間に、価値の中心は別の場所へ動き始めています。生成できるAIは増えた。だが、確認できる人間は増えていない。量産の先で、本当のボトルネックになるのは何か。そして、モデル性能だけを見ていると、見えない競争軸がある。すでにその兆候は、開発、デザイン、動画制作の現場で同時に現れています。これは単なる便利機能の追加ではありません。AIエージェントの次に来るもの。その裏構造を、noteで掘り下げました。`;

const voiceRes = await fetch('https://api.speechify.ai/v1/voices?locale=ja-JP&model=simba-3.2', {
  headers: { Authorization: `Bearer ${key}` },
});
if (!voiceRes.ok) throw new Error(`voices ${voiceRes.status} ${await voiceRes.text()}`);
const payload = await voiceRes.json();
const voices = Array.isArray(payload) ? payload : payload.voices;
if (!Array.isArray(voices) || voices.length === 0) throw new Error('No Japanese Speechify voices returned');

const scoreVoice = (v) => {
  const hay = `${v.name || ''} ${v.display_name || ''} ${v.gender || ''} ${v.locale || ''}`.toLowerCase();
  let score = 0;
  if (hay.includes('male')) score += 4;
  if (hay.includes('ja')) score += 3;
  if (hay.includes('japan')) score += 3;
  if (hay.includes('narr')) score += 2;
  if (hay.includes('deep') || hay.includes('calm') || hay.includes('serious')) score += 1;
  return score;
};
const voice = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];

const speechRes = await fetch('https://api.speechify.ai/v1/audio/speech', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input: text,
    voice_id: voice.id,
    audio_format: 'mp3',
    model: 'simba-3.2',
  }),
});
if (!speechRes.ok) throw new Error(`tts ${speechRes.status} ${await speechRes.text()}`);
const speech = await speechRes.json();
await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/narration.mp3', Buffer.from(speech.audio_data, 'base64'));
await fs.writeFile('output-script.txt', text, 'utf8');
console.log(JSON.stringify({ voice: voice.id, voiceName: voice.name || voice.display_name || 'unknown', chars: text.length }));
