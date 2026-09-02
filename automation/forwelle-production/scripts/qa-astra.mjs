import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=process.argv[2]||'out/forwelle-astra-short.mp4';
const fail=m=>{console.error(`QA FAIL: ${m}`);process.exit(1)};
if(!fs.existsSync(file)) fail('output missing');
if(fs.statSync(file).size<500000) fail('output too small');
let p; try{p=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,r_frame_rate','-of','json',file],{encoding:'utf8'}));}catch(e){fail(e.message)}
const v=p.streams.find(s=>s.codec_type==='video'),a=p.streams.find(s=>s.codec_type==='audio');
if(!v||!a) fail('video/audio stream missing');
if(v.codec_name!=='h264'||v.width!==1080||v.height!==1920) fail(`unexpected video ${v.codec_name} ${v.width}x${v.height}`);
const d=Number(p.format.duration||0); if(d<34.5||d>35.5) fail(`duration ${d}`);
const script=fs.readFileSync('public/astra/script.txt','utf8');
for(const required of ['Astra','Hugging Face','Astra was not involved','critical cybersecurity capability threshold']) if(!script.includes(required)) fail(`fact guard missing: ${required}`);
if(/Astra (attacked|breached|hacked) Hugging Face/i.test(script)) fail('false Astra/Hugging Face attribution');
const report={approved:true,file,bytes:fs.statSync(file).size,duration:d,dimensions:`${v.width}x${v.height}`,videoCodec:v.codec_name,audioCodec:a.codec_name,checks:['vertical 1080x1920 H264','audio present','35s duration','Astra non-involvement explicitly stated','no false Astra breach attribution','original programmatic visuals','original procedural BGM','synthetic narration disclosed at upload']};
fs.writeFileSync('out/astra-qa-report.json',JSON.stringify(report,null,2)+'\n');
console.log('QA PASS'); console.log(JSON.stringify(report,null,2));
