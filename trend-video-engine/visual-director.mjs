import fs from 'node:fs/promises';
import path from 'node:path';

const manifestPath = process.env.VIDEO_MANIFEST || 'trend-video-engine/current.json';
const libraryPath = process.env.VISUAL_TECHNIQUE_LIBRARY || 'trend-video-engine/visual-technique-library.json';
const outPath = process.env.VISUAL_PLAN || 'trend-video-engine/visual-plan.json';

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const library = JSON.parse(await fs.readFile(libraryPath, 'utf8'));
const corpus = [manifest.title, manifest.topic, manifest.summary, ...(manifest.scenes || []).flatMap(s => [s.headline, s.body, s.motionTag])]
  .filter(Boolean).join(' ').toLowerCase();

const tagSignals = new Set(['hook', 'retention']);
if (/agent|ai|software|workflow|automation|system|policy|permission|control|data|code/.test(corpus)) ['ai','software','workflow','operations','ui','data'].forEach(x => tagSignals.add(x));
if (/product|kit|price|buy|checkout|offer|personal|license/.test(corpus)) ['product','cta','clarity','proof'].forEach(x => tagSignals.add(x));
if (/risk|failure|break|problem|ambigu|conflict|stop/.test(corpus)) ['problem','risk','tension','contrast'].forEach(x => tagSignals.add(x));
if (/before|after|change|shift|from|to|solution/.test(corpus)) ['before-after','problem-solution','comparison','reveal'].forEach(x => tagSignals.add(x));

const scored = library.techniques.map((t, idx) => ({
  ...t,
  _score: t.tags.reduce((n, tag) => n + (tagSignals.has(tag) ? 2 : 0), 0) + (idx === 0 ? 0.25 : 0)
})).sort((a,b) => b._score - a._score || a.id.localeCompare(b.id));

const selected = [];
for (const t of scored) {
  if (selected.length >= 4) break;
  if (selected.some(s => s.id === t.id)) continue;
  if (selected.some(s => s.tags.includes('experimental')) && t.tags.includes('experimental')) continue;
  selected.push(t);
}

const primary = selected[0] || library.techniques[0];
const secondary = selected[1] || library.techniques[1];
const transition = selected.find(t => ['crash-cut','flash-cut','camera-roll'].includes(t.id)) || library.techniques.find(t => t.id === 'crash-cut');
const isVertical = /tiktok|short|reel|instagram/i.test(String(manifest.platformVariant || manifest.publish?.services || ''));
const aspect = isVertical ? '9:16' : '16:9';
const hookSeconds = 4;

const productLabel = manifest.title || 'the subject';
const seedancePrompt = [
  `${aspect} premium cinematic motion-design hook, ${hookSeconds} seconds, silent video, no captions and no readable text.`,
  `Visualize the core idea of ${productLabel} as an original abstract operational system rather than a literal app screenshot.`,
  `Camera language: ${primary.name} for the opening, ${secondary.name} for depth and reveal${transition ? `, then a restrained ${transition.name} transition` : ''}.`,
  `Start with multiple independent interface nodes drifting out of alignment, then converge into one clean central policy/control layer.`,
  `Near-black environment, silver-white structures, restrained cool-blue light, subtle depth, physically plausible camera movement, premium B2B technology advertising finish.`,
  `No people, no faces, no celebrity likeness, no logos, no third-party brand marks, no copyrighted characters, no watermarks, no generated typography, no flashing or strobing.`
].join(' ');

const plan = {
  version: 1,
  generatedAt: new Date().toISOString(),
  manifest: {id: manifest.id, title: manifest.title, brandLane: manifest.brandLane, language: manifest.language},
  visualDirector: {
    referenceLibrary: {name: library.source.name, url: library.source.url, rightsRule: library.source.usage},
    selectedTechniques: selected.map(({_score, ...t}) => t),
    usageRule: 'Borrow technique vocabulary and shot logic only. Never download/reuse EYECANDY example footage unless separate commercial rights are verified.',
    pacing: {
      hook: '0-4s: generated cinematic motion hook',
      explanation: '4s onward: Remotion/Canva-derived authored UI, typography and diagrams',
      transitions: 'Use one deliberate technique change per major idea; avoid random motion for its own sake.'
    }
  },
  seedance25: {
    provider: 'BytePlus ModelArk API',
    model: 'dreamina-seedance-2-5-260628',
    commercialModeOnly: true,
    playgroundDisallowedForPublishedAssets: true,
    paidGenerationRequiresExplicitOptIn: true,
    durationSeconds: hookSeconds,
    resolution: '720p',
    ratio: aspect,
    generateAudio: false,
    prompt: seedancePrompt,
    fallback: 'If paid generation is not explicitly enabled or API credentials are unavailable, keep the authored Remotion hook. Publication must not be blocked.'
  },
  remotionIntegration: {
    role: 'Use Seedance only as a short cinematic hook/background layer. Keep facts, claims, pricing, CTA and readable text in authored Remotion/Canva layers.',
    targetAsset: 'campaigns/cross-agent-remotion/public/seedance-hook.mp4'
  }
};

await fs.mkdir(path.dirname(outPath), {recursive:true});
await fs.writeFile(outPath, JSON.stringify(plan, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({status:'VISUAL_PLAN_READY', outPath, selected:selected.map(x=>x.name), seedanceModel:plan.seedance25.model, paidGeneration:false}, null, 2));
