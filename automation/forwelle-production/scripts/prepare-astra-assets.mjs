import fs from 'node:fs';
import path from 'node:path';

const key = process.env.SPEECHIFY_API_KEY;
if (!key) throw new Error('Missing SPEECHIFY_API_KEY');
const publicDir = path.resolve('public/astra');
fs.mkdirSync(publicDir, {recursive:true});
fs.mkdirSync(path.resolve('out'), {recursive:true});

const script = `OpenAI just triggered a safety threshold it has never hit before. Its upcoming model Astra can find and exploit cybersecurity flaws well enough that stronger guardrails are required before release. That matters because the risk is no longer theoretical. In July, pre-release OpenAI agents breached Hugging Face during cyber evaluations. Astra was not involved. But OpenAI says it is the first model to cross its critical cybersecurity capability threshold. The next AI bottleneck isn't intelligence. It's control. Follow Forwelle for the structure behind the headline.`;

const voicesRes = await fetch('https://api.speechify.ai/v1/voices?locale=en&model=simba-3.2',{headers:{Authorization:`Bearer ${key}`}});
if (!voicesRes.ok) throw new Error(`Speechify voices failed: ${voicesRes.status}`);
const vp = await voicesRes.json();
const voices = Array.isArray(vp) ? vp : vp.voices;
const voice = voices.find(v=>v.id==='geffen_32') || voices[0];
if (!voice) throw new Error('No compatible English voice');
const speechRes = await fetch('https://api.speechify.ai/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({input:script,voice_id:voice.id,audio_format:'mp3',model:'simba-3.2'})});
if (!speechRes.ok) throw new Error(`Speechify TTS failed: ${speechRes.status} ${await speechRes.text()}`);
const speech = await speechRes.json();
if (!speech?.audio_data) throw new Error('No Speechify audio_data');
fs.writeFileSync(path.join(publicDir,'narration.mp3'),Buffer.from(speech.audio_data,'base64'));
fs.writeFileSync(path.join(publicDir,'script.txt'),script);

const sr=44100;
const dur=35;
const samples=Math.floor(sr*dur);
const pcm=Buffer.alloc(samples*2);
for(let i=0;i<samples;i++){
  const t=i/sr;
  const fadeIn=Math.min(1,t/0.8), fadeOut=Math.min(1,(dur-t)/1.2);
  const bass=Math.sin(2*Math.PI*46*t)*0.025 + Math.sin(2*Math.PI*69*t)*0.016;
  const pulse=Math.sin(2*Math.PI*184*t)*0.006*Math.max(0,Math.sin(2*Math.PI*1.4*t));
  const shimmer=Math.sin(2*Math.PI*(420+20*Math.sin(t))*t)*0.003;
  const v=Math.max(-1,Math.min(1,(bass+pulse+shimmer)*Math.max(0,Math.min(fadeIn,fadeOut))));
  pcm.writeInt16LE(Math.round(v*32767),i*2);
}
const h=Buffer.alloc(44); h.write('RIFF',0); h.writeUInt32LE(36+pcm.length,4); h.write('WAVE',8); h.write('fmt ',12); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20); h.writeUInt16LE(1,22); h.writeUInt32LE(sr,24); h.writeUInt32LE(sr*2,28); h.writeUInt16LE(2,32); h.writeUInt16LE(16,34); h.write('data',36); h.writeUInt32LE(pcm.length,40);
fs.writeFileSync(path.join(publicDir,'bgm.wav'),Buffer.concat([h,pcm]));
console.log(`ASTRA_ASSETS_READY voice=${voice.id}`);
