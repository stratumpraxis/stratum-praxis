import fs from 'node:fs/promises';

const key = process.env.SPEECHIFY_API_KEY;
if (!key) throw new Error('Missing SPEECHIFY_API_KEY');

const text = `最強のAIを追いかけている間に、価値の中心は別の場所へ動き始めています。生成できるAIは増えた。だが、確認できる人間は増えていない。量産の先で、本当のボトルネックになるのは何か。そして、モデル性能だけを見ていると、見えない競争軸がある。すでにその兆候は、開発、デザイン、動画制作の現場で同時に現れています。これは単なる便利機能の追加ではありません。AIエージェントの次に来るもの。その裏構造を、noteで掘り下げました。`;

const authHeaders = { Authorization: `Bearer ${key}` };

async function getVoices(url) {
  const res = await fetch(url, { headers: authHeaders });
  if (!res.ok) throw new Error(`voices ${res.status} ${await res.text()}`);
  const payload = await res.json();
  return Array.isArray(payload) ? payload : (payload.voices || []);
}

// simba-3.2 is English-only. Japanese narration uses the multilingual model.
// First request a compatible Japanese voice; fall back to the locale-only list
// in case the account's voice endpoint does not accept the model filter.
let voices = await getVoices('https://api.speechify.ai/v1/voices?locale=ja&model=simba-multilingual');
if (!Array.isArray(voices) || voices.length === 0) {
  voices = await getVoices('https://api.speechify.ai/v1/voices?locale=ja');
}
if (!Array.isArray(voices) || voices.length === 0) {
  voices = await getVoices('https://api.speechify.ai/v1/voices?locale=ja-JP');
}
if (!Array.isArray(voices) || voices.length === 0) throw new Error('No Japanese Speechify voices returned');

const scoreVoice = (v) => {
  const hay = `${v.name || ''} ${v.display_name || ''} ${v.gender || ''} ${v.locale || ''} ${v.tags || ''}`.toLowerCase();
  let score = 0;
  if (hay.includes('male')) score += 5;
  if (hay.includes('ja')) score += 4;
  if (hay.includes('japan')) score += 4;
  if (hay.includes('narr') || hay.includes('documentary') || hay.includes('broadcaster')) score += 3;
  if (hay.includes('deep') || hay.includes('calm') || hay.includes('serious')) score += 2;
  return score;
};
const voice = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];

const speechRes = await fetch('https://api.speechify.ai/v1/audio/speech', {
  method: 'POST',
  headers: {
    ...authHeaders,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    input: text,
    voice_id: voice.id,
    audio_format: 'mp3',
    model: 'simba-multilingual',
  }),
});
if (!speechRes.ok) throw new Error(`tts ${speechRes.status} ${await speechRes.text()}`);
const speech = await speechRes.json();
if (!speech.audio_data) throw new Error('Speechify response missing audio_data');

await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/narration.mp3', Buffer.from(speech.audio_data, 'base64'));
await fs.writeFile('output-script.txt', text, 'utf8');
console.log(JSON.stringify({
  voice: voice.id,
  voiceName: voice.name || voice.display_name || 'unknown',
  locale: voice.locale || 'unknown',
  model: 'simba-multilingual',
  chars: text.length,
}));
