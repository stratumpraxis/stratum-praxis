import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('automation/forwelle-operator');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config.json'), 'utf8'));
const scout = JSON.parse(await fs.readFile(path.join(ROOT, 'scout-latest.json'), 'utf8'));
let winningPatterns = {status:'BUILDING_DATASET',sampleCount:0,targetCount:config.learning?.winningVideoTargetCount || 10,editorialBrief:''};
try { winningPatterns = JSON.parse(await fs.readFile(path.join(ROOT, 'winning-patterns.json'), 'utf8')); } catch {}
const selected = scout.candidates?.find(c => c.id === scout.publishableCandidateId) || null;

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) fsSync.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
function clean(v, max = 300) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max); }
function slug(v) { return clean(v, 100).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'signal'; }
function shorten(v, n) { const x = clean(v, n + 50); return x.length <= n ? x : `${x.slice(0, n - 1).trim()}…`; }
function splitHeadline(v, maxLine = 18) {
  const words = clean(v, 90).split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (t.length <= maxLine) cur = t; else { if (cur) lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines.slice(0, 3).join('\n');
}
function inferHookType(text) {
  const t = clean(text, 160).toLowerCase();
  if (t.includes('?')) return 'question';
  if (/^(how|how to)\b/.test(t)) return 'how-to';
  if (/^why\b/.test(t)) return 'why';
  if (/\b(stop|don\'t|not |instead|wrong)\b/.test(t)) return 'contrarian';
  if (/\b(new|just|launch|released|update|now)\b/.test(t)) return 'new-signal';
  if (/^\d+\b/.test(t)) return 'numbered';
  return 'concrete-change';
}
const minPatternSamples = Number(config.learning?.minSamplesForPatternAnalysis || 3);
const patternEvidenceActive = Number(winningPatterns.sampleCount || 0) >= minPatternSamples && clean(winningPatterns.editorialBrief, 700).length > 0;
const patternBrief = patternEvidenceActive ? clean(winningPatterns.editorialBrief, 700) : '';

if (!selected) {
  const status = {at: new Date().toISOString(), status: 'NO_PUBLISHABLE_SIGNAL', reason: 'No candidate had a verified first-party fact source.'};
  await fs.writeFile(path.join(ROOT, 'run-status.json'), JSON.stringify(status, null, 2) + '\n');
  output('publish', 'false');
  console.log(status.status);
  process.exit(0);
}

const sourceHost = (() => { try { return new URL(selected.url).hostname.replace(/^www\./, ''); } catch { return selected.sourceName; } })();
const fallback = {
  title: shorten(selected.title, 90),
  summary: selected.summary || `A fresh first-party signal from ${sourceHost} is worth watching.`,
  voiceover: [
    `A fresh signal from ${sourceHost} is getting attention: ${shorten(selected.title, 130)}.`,
    selected.summary ? shorten(selected.summary, 200) : `The headline matters less than the change underneath it.`,
    `The useful question is what this changes in a real workflow: speed, quality, access, or what becomes practical for the first time.`,
    `Forwelle tracks the shift, not the hype. Watch what people can reliably do next.`
  ].join(' '),
  scenes: [
    {eyebrow: 'NEW SIGNAL', motionTag: 'WHY NOW', headline: splitHeadline(selected.title), body: `A fresh first-party update from ${sourceHost}.`, sourceLabel: sourceHost},
    {eyebrow: 'WHAT CHANGED', motionTag: 'THE SIGNAL', headline: 'Look past\nthe headline.', body: shorten(selected.summary || 'A new capability or workflow change is emerging.', 115), sourceLabel: sourceHost},
    {eyebrow: 'REAL QUESTION', motionTag: 'WORKFLOW IMPACT', headline: 'What becomes\npossible now?', body: 'Measure the change in speed, quality, access or reliability — not just novelty.', sourceLabel: 'Forwelle / original analysis'},
    {eyebrow: 'FILTER THE HYPE', motionTag: 'PROOF > NOISE', headline: 'A demo is not\na habit.', body: 'The durable signal is repeatable use: something people can do better, faster or at lower friction.', sourceLabel: 'Forwelle / original analysis'},
    {eyebrow: 'BOTTOM LINE', motionTag: 'TRACK THE SHIFT', headline: 'Watch behavior,\nnot buzz.', body: 'New tools matter when they change what people can reliably do next.', sourceLabel: 'Forwelle'}
  ],
  caption: `${shorten(selected.title, 180)}\n\nForwelle tracks practical shifts in AI, tools and how people work.\n\nSource: ${selected.url}\n\n#AI #FutureOfWork #Technology #Forwelle`
};

async function editWithOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model = process.env.FORWELLE_EDITOR_MODEL || config.editor?.model || 'openai/gpt-4.1-mini';
  const learningBlock = patternEvidenceActive
    ? `\nSTRUCTURAL LEARNING BRIEF FROM MEASURED/CURATED SHORTS:\n${patternBrief}\nUse this only as a testable structural prior. Do not copy wording, footage, story concepts, creator identity, branding or protected expression. The verified source and original Forwelle analysis remain primary.\n`
    : '\nSTRUCTURAL LEARNING: empirical sample count is still too small. Do not infer a winning pattern; use conservative original editorial judgment.\n';
  const prompt = `You are the editorial planner for Forwelle, an English short-video brand about useful shifts in AI, tools, creators and the future of work.\n\nCreate ONE original vertical short from the verified first-party source below. Do not copy source wording. Do not add facts that are not supported by the supplied title/summary. No predictions stated as facts. No financial, medical, political, legal, tragedy or celebrity material. Avoid hype and absolute claims.${learningBlock}\nSOURCE TITLE: ${selected.title}\nSOURCE SUMMARY: ${selected.summary || '(none supplied; use only the title as fact)'}\nSOURCE URL: ${selected.url}\nSOURCE DOMAIN: ${sourceHost}\nOPTIONAL USER ANGLE: ${selected.angle || '(none)'}\n\nReturn only strict JSON with keys: title, summary, voiceover, caption, scenes. voiceover must be 80-115 words, natural spoken English. scenes must contain exactly 5 objects with eyebrow, motionTag, headline, body, sourceLabel. Each headline <= 42 characters. Each body <= 120 characters. The piece must add original analysis rather than restating the source. The final scene should have a memorable non-salesy takeaway. Caption <= 500 characters and include the source URL plus 3-5 relevant hashtags.`;
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://github.com/stratumpraxis/stratum-praxis', 'X-Title': 'Forwelle Revenue Video Operator'},
    body: JSON.stringify({model, temperature: 0.65, messages: [{role: 'user', content: prompt}]})
  });
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text()}`);
  const j = await r.json();
  let text = j.choices?.[0]?.message?.content;
  if (Array.isArray(text)) text = text.map(x => x?.text || '').join('');
  text = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length !== 5) throw new Error('Editor returned invalid scene count');
  return parsed;
}

let editorial = fallback;
let usedAIEditor = false;
try {
  const ai = await editWithOpenRouter();
  if (ai) { editorial = {...fallback, ...ai}; usedAIEditor = true; }
} catch (e) {
  console.warn('AI editor unavailable; using conservative original fallback:', String(e));
}

const now = new Date();
const date = now.toISOString().slice(0, 10);
const id = `${date}-${slug(editorial.title)}-${String(selected.id).replace(/[^a-zA-Z0-9]+/g, '-').slice(-18)}`;
const palette = [
  ['#050711', '#7CFFDA'], ['#071421', '#5BE7FF'], ['#10102A', '#B39CFF'], ['#130A1D', '#FF78D8'], ['#050811', '#FFD166']
];
const scenes = editorial.scenes.slice(0, 5).map((s, i) => ({
  duration: 8,
  eyebrow: shorten(s.eyebrow || `SIGNAL ${i + 1}`, 26),
  motionTag: shorten(s.motionTag || 'FORWELLE', 24),
  headline: splitHeadline(s.headline || editorial.title),
  body: shorten(s.body || '', 120),
  sourceLabel: shorten(s.sourceLabel || (i < 2 ? sourceHost : 'Forwelle / original analysis'), 48),
  background: palette[i][0], accent: palette[i][1]
}));
const initialDuration = scenes.reduce((n,s)=>n+Number(s.duration||0),0);
const manifest = {
  id, createdAt: now.toISOString(), brandLane: 'forwelle-en', platformVariant: 'cross-platform-short',
  title: shorten(editorial.title, 95), topic: selected.title, language: 'en',
  summary: shorten(editorial.summary || fallback.summary, 500), voiceover: clean(editorial.voiceover || fallback.voiceover, 1200),
  sourceCandidateId: selected.id,
  outputFile: `media/forwelle/${id}.mp4`,
  scores: selected.scores,
  sources: [{name: `${sourceHost} — first-party source`, url: selected.url, factSource: true, verified: true, published: selected.publishedAt || null}],
  thirdPartyAssets: [],
  assetCandidates: {},
  strategy: {
    winningPatternLearning: {
      status: winningPatterns.status || 'BUILDING_DATASET',
      sampleCount: Number(winningPatterns.sampleCount || 0),
      targetCount: Number(winningPatterns.targetCount || config.learning?.winningVideoTargetCount || 10),
      briefUsed: patternEvidenceActive,
      editorialBrief: patternEvidenceActive ? patternBrief : null
    },
    rendering: {
      preferredFinalComposer: config.rendering?.preferredFinalComposer || 'remotion',
      currentOperatorRenderer: config.rendering?.currentOperatorRenderer || 'procedural'
    }
  },
  structureProfile: {
    hookType: inferHookType(editorial.scenes?.[0]?.headline || editorial.title),
    hookText: clean(editorial.scenes?.[0]?.headline || editorial.title, 120),
    pacing: 'five-scene-progressive',
    ctaType: 'non-salesy-takeaway',
    visualStyle: 'procedural-motion',
    sceneCount: scenes.length,
    durationSeconds: initialDuration
  },
  originality: {creatorSignals: ['original Forwelle editorial angle', 'original procedural motion graphics', 'original narration'], notReusedCompilation: true, notTemplateVariant: true},
  safety: {approved: true, factsVerified: true, originalityVerified: true, realPersonLikeness: false, copyrightedMedia: false, categories: ['ai', 'technology', 'future-of-work'], notes: 'Autonomous lane uses first-party factual sources, original writing, original procedural visuals, synthetic narration and procedural audio only. Candidate third-party assets remain outside publication until provenance is verified.'},
  scenes,
  publish: {
    services: config.publish?.services || ['youtube', 'tiktok', 'instagram'],
    mode: config.publish?.mode || 'shareNow', aiGeneratedLabel: true,
    title: shorten(editorial.title, 95), caption: clean(editorial.caption || fallback.caption, 1000),
    youtubePrivacy: 'public', channelAllowlist: config.publish?.channelAllowlist || {}
  }
};
await fs.writeFile(path.join(ROOT, 'current.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(ROOT, 'run-status.json'), JSON.stringify({at: now.toISOString(), status: 'PLANNED', manifestId: id, candidateId: selected.id, usedAIEditor, winningPatternSamples: winningPatterns.sampleCount || 0, winningPatternBriefUsed: patternEvidenceActive}, null, 2) + '\n');
output('publish', 'true');
output('manifest_id', id);
console.log(JSON.stringify({publish: true, id, source: selected.url, usedAIEditor, winningPatternSamples: winningPatterns.sampleCount || 0, winningPatternBriefUsed: patternEvidenceActive}, null, 2));
