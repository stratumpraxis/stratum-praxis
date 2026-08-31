import fs from 'node:fs/promises';

const text = `最強のAIを追いかけている間に、価値の中心は別の場所へ動き始めています。生成できるAIは増えた。だが、確認できる人間は増えていない。量産の先で、本当のボトルネックになるのは何か。そして、モデル性能だけを見ていると、見えない競争軸がある。すでにその兆候は、開発、デザイン、動画制作の現場で同時に現れています。これは単なる便利機能の追加ではありません。AIエージェントの次に来るもの。その裏構造を、noteで掘り下げました。`;

// Japanese narration generated with HeyGen's public Japanese Satoshi voice.
// The finalized audio is used as an immutable render input so the video does not
// depend on repeated paid TTS calls or a provider/model mismatch on every render.
const narrationUrl = 'https://resource2.heygen.ai/text_to_speech/a97602ecc435417ab1b776674e7db173/662e1397965c484e8f65fa58c77effde/id=b9e5f861-28d7-4738-9a3e-3e7eeb2510d1.wav';

const res = await fetch(narrationUrl);
if (!res.ok) throw new Error(`HeyGen narration download ${res.status} ${await res.text()}`);
const audio = Buffer.from(await res.arrayBuffer());
if (audio.length < 10000) throw new Error(`Narration asset unexpectedly small: ${audio.length} bytes`);

await fs.mkdir('public', {recursive: true});
await fs.writeFile('public/narration.wav', audio);
await fs.writeFile('output-script.txt', text, 'utf8');
console.log(JSON.stringify({
  provider: 'HeyGen',
  voice: 'Satoshi',
  voiceId: '662e1397965c484e8f65fa58c77effde',
  format: 'wav',
  chars: text.length,
  bytes: audio.length,
}));
