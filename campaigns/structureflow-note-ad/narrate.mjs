import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

const text = `最強のAIを追いかけている間に、価値の中心は別の場所へ動き始めています。生成できるAIは増えた。だが、確認できる人間は増えていない。量産の先で、本当のボトルネックになるのは何か。そして、モデル性能だけを見ていると、見えない競争軸がある。すでにその兆候は、開発、デザイン、動画制作の現場で同時に現れています。これは単なる便利機能の追加ではありません。AIエージェントの次に来るもの。その裏構造を、noteで掘り下げました。`;

// Japanese narration generated with HeyGen's public Japanese Satoshi voice.
// Use the finalized audio as a stable render input instead of repeating TTS calls.
const narrationUrl = 'https://resource2.heygen.ai/text_to_speech/a97602ecc435417ab1b776674e7db173/662e1397965c484e8f65fa58c77effde/id=b9e5f861-28d7-4738-9a3e-3e7eeb2510d1.wav';

const res = await fetch(narrationUrl);
if (!res.ok) throw new Error(`HeyGen narration download ${res.status} ${await res.text()}`);
const audio = Buffer.from(await res.arrayBuffer());
if (audio.length < 10000) throw new Error(`Narration asset unexpectedly small: ${audio.length} bytes`);

await fs.mkdir('public', {recursive: true});
await fs.writeFile('public/narration-source.wav', audio);
await execFileAsync('ffmpeg', [
  '-y',
  '-i', 'public/narration-source.wav',
  '-codec:a', 'libmp3lame',
  '-b:a', '192k',
  'public/narration.mp3',
]);
await fs.writeFile('output-script.txt', text, 'utf8');

const stat = await fs.stat('public/narration.mp3');
if (stat.size < 10000) throw new Error(`Transcoded narration unexpectedly small: ${stat.size} bytes`);
console.log(JSON.stringify({
  provider: 'HeyGen',
  voice: 'Satoshi',
  voiceId: '662e1397965c484e8f65fa58c77effde',
  output: 'public/narration.mp3',
  chars: text.length,
  bytes: stat.size,
}));
