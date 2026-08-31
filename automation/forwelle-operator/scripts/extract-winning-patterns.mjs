import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('automation/forwelle-operator');
const readJson = async (name, fallback) => {
  try { return JSON.parse(await fs.readFile(path.join(ROOT, name), 'utf8')); }
  catch { return fallback; }
};
const config = await readJson('config.json', {});
const sampleStore = await readJson('winning-video-samples.json', {version:1,targetCount:10,items:[]});
const history = await readJson('history.json', {version:1,items:[]});
const targetCount = Number(config.learning?.winningVideoTargetCount || sampleStore.targetCount || 10);

const clean = (v, max = 220) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
function inferHook(text) {
  const t = clean(text, 180).toLowerCase();
  if (!t) return 'unknown';
  if (t.includes('?')) return 'question';
  if (/^(how|how to)\b/.test(t)) return 'how-to';
  if (/^why\b/.test(t)) return 'why';
  if (/\b(stop|don\'t|not |instead|wrong)\b/.test(t)) return 'contrarian';
  if (/\b(new|just|launch|released|update|now)\b/.test(t)) return 'new-signal';
  if (/^\d+\b/.test(t) || /\b\d+\s+(ways|things|rules|steps|mistakes)\b/.test(t)) return 'numbered';
  return 'concrete-change';
}
function bucketDuration(v) {
  const s = num(v); if (!s) return 'unknown';
  if (s <= 20) return '<=20s'; if (s <= 35) return '21-35s'; if (s <= 50) return '36-50s'; return '51-60s';
}
function performanceScore(metrics = {}) {
  const views = num(metrics.views); const likes = num(metrics.likes); const comments = num(metrics.comments);
  const engagement = views > 0 ? (likes + comments * 2) / views : 0;
  return Math.log10(views + 1) * 100 + engagement * 1000;
}
function pickMeasured(item) {
  const m72 = item.metrics?.['72h']?.youtube;
  const m24 = item.metrics?.['24h']?.youtube;
  if (m72?.status === 'OK') return {window:'72h', ...m72};
  if (m24?.status === 'OK') return {window:'24h', ...m24};
  return null;
}

const manual = (sampleStore.items || []).filter(x => x && x.eligible !== false).map((x, i) => ({
  id: clean(x.id || `manual-${i+1}`, 100), sourceType: 'manualExternal', platform: clean(x.platform || 'unknown', 30),
  url: clean(x.url, 600), title: clean(x.title || x.hook || x.url, 180),
  hookType: clean(x.structure?.hookType || x.hookType || inferHook(x.hook || x.title), 60),
  pacing: clean(x.structure?.pacing || x.pacing || 'unknown', 80),
  ctaType: clean(x.structure?.ctaType || x.ctaType || 'unknown', 80),
  visualStyle: clean(x.structure?.visualStyle || x.visualStyle || 'unknown', 80),
  durationSeconds: num(x.durationSeconds), metrics: x.metrics || {}, notes: clean(x.notes, 400),
  score: performanceScore(x.metrics || {}) + num(x.priorityBoost)
}));

const own = (history.items || []).map(item => {
  const measured = pickMeasured(item); if (!measured) return null;
  const profile = item.structureProfile || {};
  return {
    id: clean(item.id, 120), sourceType: 'ownMeasured', platform: 'youtube',
    url: clean(item.platforms?.youtube?.externalLink, 600), title: clean(item.title, 180),
    hookType: clean(profile.hookType || inferHook(profile.hookText || item.title), 60),
    pacing: clean(profile.pacing || 'unknown', 80), ctaType: clean(profile.ctaType || 'unknown', 80),
    visualStyle: clean(profile.visualStyle || 'unknown', 80), durationSeconds: num(profile.durationSeconds),
    metrics: measured, notes: `${measured.window} measured Forwelle result`, score: performanceScore(measured)
  };
}).filter(Boolean);

const selected = [...manual, ...own].sort((a,b) => b.score - a.score).slice(0, targetCount);
function topValues(field, limit = 4) {
  const counts = new Map();
  for (const x of selected) {
    const v = clean(field(x), 100); if (!v || v === 'unknown') continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([value,count])=>({value,count}));
}
const topPatterns = {
  hookTypes: topValues(x=>x.hookType), pacing: topValues(x=>x.pacing), ctaTypes: topValues(x=>x.ctaType),
  visualStyles: topValues(x=>x.visualStyle), durationBuckets: topValues(x=>bucketDuration(x.durationSeconds))
};

let editorialBrief = selected.length
  ? `Evidence set has ${selected.length}/${targetCount} samples. Prefer only repeated patterns supported by the evidence; do not copy wording, footage, identity or branding from reference videos.`
  : 'No empirical winning-video pattern is active yet. Keep the current conservative editorial defaults until measured or curated samples are available.';
let aiAnalysisUsed = false;
if (selected.length >= Number(config.learning?.minSamplesForPatternAnalysis || 3) && process.env.OPENROUTER_API_KEY) {
  try {
    const model = config.learning?.model || config.editor?.model || 'openai/gpt-4.1-mini';
    const compact = selected.map(x => ({title:x.title,hookType:x.hookType,pacing:x.pacing,ctaType:x.ctaType,visualStyle:x.visualStyle,durationSeconds:x.durationSeconds,metrics:x.metrics,notes:x.notes}));
    const prompt = `Analyze these measured/curated short-video references for structural patterns only. Never copy wording, concepts, branding, footage or creator identity. Return one concise English editorial brief under 700 characters describing only patterns that repeat across multiple samples and can be tested by an original Forwelle video. If evidence is weak, say so.\n\n${JSON.stringify(compact)}`;
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {method:'POST',headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://github.com/stratumpraxis/stratum-praxis','X-Title':'Forwelle Winning Pattern Extractor'},body:JSON.stringify({model,temperature:0.2,messages:[{role:'user',content:prompt}]})});
    if (r.ok) {
      const j = await r.json(); let text = j.choices?.[0]?.message?.content;
      if (Array.isArray(text)) text = text.map(x=>x?.text||'').join('');
      if (clean(text, 700)) { editorialBrief = clean(text, 700); aiAnalysisUsed = true; }
    }
  } catch (e) { console.warn('Pattern AI analysis unavailable; using deterministic summary:', String(e)); }
}

const out = {
  version: 1, generatedAt: new Date().toISOString(), status: selected.length >= targetCount ? 'READY' : 'BUILDING_DATASET',
  sampleCount: selected.length, targetCount,
  sourceMix: {manualExternal:selected.filter(x=>x.sourceType==='manualExternal').length, ownMeasured:selected.filter(x=>x.sourceType==='ownMeasured').length},
  topPatterns, editorialBrief, aiAnalysisUsed,
  evidenceItems: selected.map(x => ({id:x.id,sourceType:x.sourceType,platform:x.platform,url:x.url,title:x.title,hookType:x.hookType,pacing:x.pacing,ctaType:x.ctaType,visualStyle:x.visualStyle,durationSeconds:x.durationSeconds,metrics:x.metrics,score:Number(x.score.toFixed(3))}))
};
await fs.writeFile(path.join(ROOT, 'winning-patterns.json'), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({status:out.status,sampleCount:out.sampleCount,targetCount,aiAnalysisUsed,topPatterns}, null, 2));
