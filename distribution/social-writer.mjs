import { readFile, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const MODEL = process.env.BLOGGER_FREE_MODEL || '@cf/google/gemma-4-26b-a4b-it';
const FREE_MODELS = new Set(['@cf/google/gemma-4-26b-a4b-it','@cf/zai-org/glm-4.7-flash','@cf/nvidia/nemotron-3-120b-a12b']);
const PRODUCT_FILE = new URL('../agent-control-auditor.html', import.meta.url);
const OUT_FILE = new URL('./agent-control-auditor-generated-queue.json', import.meta.url);
const STATE_FILE = new URL('./agent-control-auditor-social-state.json', import.meta.url);
const URL_BASE = 'https://stratumpraxis.com/agent-control-auditor.html';

function stripFence(s){ return String(s).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''); }
function hash(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
async function call(stage, prompt){
  if (!ACCOUNT_ID || !TOKEN) throw new Error('Workers AI credentials missing');
  if (!FREE_MODELS.has(MODEL)) throw new Error(`Model not allowlisted: ${MODEL}`);
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,{
    method:'POST',headers:{authorization:`Bearer ${TOKEN}`,'content-type':'application/json'},
    body:JSON.stringify({messages:[{role:'user',content:prompt}],max_tokens:2200,temperature:stage==='writer'?0.6:0.2})
  });
  const raw = await r.text();
  if(!r.ok) throw new Error(`Workers AI ${r.status}: ${raw.slice(0,300)}`);
  const j=JSON.parse(raw); const text=j?.result?.response||j?.result?.text||j?.result?.choices?.[0]?.message?.content;
  if(!text) throw new Error(`No text from ${stage}`); return text;
}
async function readState(){ try{return JSON.parse(await readFile(STATE_FILE,'utf8'));}catch{return {published_hashes:[],last_generated_at:null};} }

const html=(await readFile(PRODUCT_FILE,'utf8')).slice(0,22000);
const policy=`You work for Stratum Praxis. Never invent customers, usage, revenue, certifications, security guarantees, test results, market share, endorsements, or lived experience. Never promise outcomes. No fake scarcity, fear pressure, jailbreak/exploit guidance, defamation, financial/medical/legal advice, or named-style imitation. Use only facts supported by the supplied product page. Keep the final post useful even if the reader never clicks.`;

const researchRaw=await call('research',`${policy}\n\nROLE: Researcher. Extract only verifiable product facts from the HTML. Return STRICT JSON: {facts:[...],limits:[...],safe_angles:[...]}.\n\nHTML:\n${html}`);
const research=JSON.parse(stripFence(researchRaw));

const writerRaw=await call('writer',`${policy}\n\nROLE: Senior B2B social writer. Using only RESEARCH below, create 3 distinct English posts for Bluesky/Threads/LinkedIn. Each text MUST be 70-140 characters, no hashtags, no emoji, no quotation marks around invented speech, no price unless explicitly supported, no hype. Focus on practical agent governance: intent vs authority, human boundaries, evidence, retry control, trust boundaries. Return STRICT JSON: {candidates:[{text,angle}]}.\n\nRESEARCH:\n${JSON.stringify(research)}`);
const writer=JSON.parse(stripFence(writerRaw));
if(!Array.isArray(writer.candidates)||!writer.candidates.length) throw new Error('Writer returned no candidates');

const factRaw=await call('review1',`${policy}\n\nROLE: Reviewer 1 — factual integrity. Check each candidate strictly against the research. Reject unsupported claims or certainty. Return STRICT JSON {approved:[{text,angle}],rejected:[{text,reason}]}.\n\nRESEARCH:${JSON.stringify(research)}\nCANDIDATES:${JSON.stringify(writer.candidates)}`);
const fact=JSON.parse(stripFence(factRaw));
if(!Array.isArray(fact.approved)||!fact.approved.length) throw new Error('R1 rejected all candidates');

const safetyRaw=await call('review2',`${policy}\n\nROLE: Reviewer 2 — safety and reputation. Reject misleading promotion, fear pressure, security overclaiming, risky attack language, or statements that could imply certification/guarantee. Return STRICT JSON {approved:[{text,angle}],rejected:[{text,reason}]}.\n\nCANDIDATES:${JSON.stringify(fact.approved)}`);
const safety=JSON.parse(stripFence(safetyRaw));
if(!Array.isArray(safety.approved)||!safety.approved.length) throw new Error('R2 rejected all candidates');

const qualityRaw=await call('review3',`${policy}\n\nROLE: Reviewer 3 — editorial quality and platform fit. Select the single strongest post. It must be precise, non-generic, 70-140 characters, natural English, no hashtags, and make one useful point. Return STRICT JSON {text,angle,reason}.\n\nCANDIDATES:${JSON.stringify(safety.approved)}`);
const final=JSON.parse(stripFence(qualityRaw));
const text=String(final.text||'').trim();
if(text.length<70||text.length>140) throw new Error(`R3 length invalid: ${text.length}`);

const state=await readState();
const h=hash(text.toLowerCase().replace(/\s+/g,' '));
if((state.published_hashes||[]).includes(h)) throw new Error('Duplicate final post blocked');
const stamp=new Date().toISOString().slice(0,10).replaceAll('-','');
const tracked=`${URL_BASE}?utm_source=buffer&utm_medium=social&utm_campaign=agent_control_auditor&utm_content=auto_${stamp}`;
const full=`${text}\n\n${tracked}`;
if(full.length>300) throw new Error(`Final post exceeds Bluesky-safe length: ${full.length}`);

const record=[{id:`aca-auto-${stamp}`,active:true,services:['bluesky','threads','linkedin'],text,url:tracked}];
await writeFile(OUT_FILE,`${JSON.stringify(record,null,2)}\n`);
state.published_hashes=[...(state.published_hashes||[]).slice(-29),h];
state.last_generated_at=new Date().toISOString();
state.last_angle=final.angle||null;
state.last_reason=final.reason||null;
await writeFile(STATE_FILE,`${JSON.stringify(state,null,2)}\n`);
console.log(JSON.stringify({status:'READY',model:MODEL,text,angle:final.angle||null,review_chain:['research','writer','R1 factual','R2 safety','R3 quality']},null,2));
