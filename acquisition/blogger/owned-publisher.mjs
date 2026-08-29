import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUTBOX = path.join(ROOT, 'acquisition/blogger/outbox');
const STATE_FILE = path.join(ROOT, 'acquisition/blogger/state.json');
const SITE_DIR = path.join(ROOT, 'signal/auto');
const SITEMAP = path.join(ROOT, 'signal/sitemap.xml');
const BASE = 'https://stratumpraxis.com/signal/auto';
const INVENTORY_FILE = path.join(ROOT, 'acquisition/asset-inventory.json');

/** Labels that are a click invitation rather than a decision. Mirrors cta-gate.mjs. */
const GENERIC_CTA_LABELS = new Set([
  'continue', 'learn more', 'read more', 'click here', 'find out more', 'check it out',
  'open the relevant tool', 'see more', 'get started', 'go here', 'more info', 'explore'
]);

async function readJson(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
function esc(s='') { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function slug(s='') { return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,96) || crypto.randomUUID(); }
function safeUrl(value) { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.toString() : null; } catch { return null; } }

function inline(text) {
  let s = esc(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function markdownToSafeHtml(md='') {
  const lines = String(md).replace(/\r/g,'').split('\n');
  const out=[]; let list=false;
  const closeList=()=>{ if(list){ out.push('</ul>'); list=false; } };
  for (const raw of lines) {
    const line=raw.trim();
    if(!line){ closeList(); continue; }
    if(/^###\s+/.test(line)){ closeList(); out.push(`<h3>${inline(line.replace(/^###\s+/,''))}</h3>`); continue; }
    if(/^##\s+/.test(line)){ closeList(); out.push(`<h2>${inline(line.replace(/^##\s+/,''))}</h2>`); continue; }
    if(/^#\s+/.test(line)){ closeList(); out.push(`<h2>${inline(line.replace(/^#\s+/,''))}</h2>`); continue; }
    if(/^[-*]\s+/.test(line)){ if(!list){ out.push('<ul>'); list=true; } out.push(`<li>${inline(line.replace(/^[-*]\s+/,''))}</li>`); continue; }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

/**
 * The disclosure sentence, derived from what the generating run actually executed.
 * A record that carries no gate report gets the conservative wording; it never claims
 * a control the runtime did not run.
 */
function disclosureFor(record) {
  const executed = new Set(record?.gates?.executed || []);
  const parts = ['AI-assisted editorial production.'];
  parts.push('Claims are limited to the source material recorded for this publication and may require independent verification.');
  if (executed.has('first_person_truth_gate') && executed.has('duplication_gate') && executed.has('cta_route_verification_gate')) {
    parts.push('Before publication this article passed this repository\u2019s first-person truth, privacy, restricted-claim, duplication and CTA-route checks.');
  }
  return parts.join(' ');
}

/**
 * The button text. A generic or missing label is replaced by the CTA the asset
 * inventory records for the destination, so an older artifact cannot publish
 * "Continue" or "Open the relevant tool"; if neither exists, no button is rendered.
 */
function resolveCtaLabel(record, inventory) {
  const declared = String(record?.cta?.label || '').trim();
  if (declared && !GENERIC_CTA_LABELS.has(declared.toLowerCase())) return declared;
  const asset = (inventory?.assets || []).find((a) => a.asset_id === record?.cta?.asset_id);
  const fallback = String(asset?.cta?.label || '').trim();
  return fallback && !GENERIC_CTA_LABELS.has(fallback.toLowerCase()) ? fallback : '';
}

function page(record, canonical, inventory) {
  const title=esc(record.title || 'Stratum Praxis');
  const dek=esc(record.dek || 'Practical analysis from Stratum Praxis.');
  const body=markdownToSafeHtml(record.body || '');
  const ctaUrl=safeUrl(record.cta?.tracked_url);
  // The button text is the CTA the gate verified, never a generic "Continue" or
  // "Open the relevant tool". Microcopy is rendered only when cta-gate.mjs proved it
  // against the live destination page.
  const ctaLabel=esc(resolveCtaLabel(record, inventory));
  const microcopy=record.cta?.microcopy ? `<p class="micro">${esc(record.cta.microcopy)}</p>` : '';
  const cta=ctaUrl && ctaLabel
    ? `<aside class="cta"><a href="${esc(ctaUrl)}" rel="noopener" data-primary-cta data-analytics-id="auto_revenue_article_cta" data-asset-id="${esc(record.cta.asset_id || '')}" data-vertical-id="${esc(record.attribution?.vertical_id || '')}">${ctaLabel}</a>${microcopy}</aside>`
    : '';
  const disclosure=`<p class="fine">${esc(disclosureFor(record))} Product and platform details change; verify current terms before acting.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Stratum Praxis Signal</title><meta name="description" content="${dek}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:title" content="${title}"><meta property="og:description" content="${dek}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="article"><meta name="twitter:card" content="summary"><style>:root{--bg:#07090d;--panel:#101722;--text:#f8fafc;--muted:#a1a1aa;--line:#293446}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.78 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:850px;margin:auto;padding:30px 20px 96px}a{color:#dbeafe}.back{font-size:13px;color:var(--muted)}h1{font-size:clamp(38px,7vw,66px);line-height:1.04;letter-spacing:-.025em;margin:38px 0 18px}.dek{font-size:21px;color:#d4d4d8;margin-bottom:34px}article h2{font-size:28px;margin-top:46px}article h3{font-size:21px;margin-top:34px}article p,article li{max-width:72ch}code{background:#121925;padding:2px 6px;border-radius:5px}.cta{margin-top:48px;padding:22px;border:1px solid var(--line);background:var(--panel);border-radius:14px}.cta a{display:inline-block;background:white;color:#090c11;padding:12px 17px;border-radius:9px;text-decoration:none;font-weight:800;line-height:1.3}.cta .micro{margin:12px 0 0;font-size:13px;color:var(--muted)}.fine{font-size:13px;color:var(--muted);margin-top:34px;border-top:1px solid var(--line);padding-top:20px}</style><script defer src="../../scos-analytics.js"></script></head><body data-funnel="autonomous_revenue_publisher" data-source="${esc(record.source_id)}" data-vertical="${esc(record.attribution?.vertical_id || '')}"><main><a class="back" href="../">← Signal Praxis</a><h1>${title}</h1><p class="dek">${dek}</p><article>${body}</article>${cta}${disclosure}</main></body></html>`;
}

async function verifyPrevious(state) {
  state.owned_publications ||= {};
  for (const pub of Object.values(state.owned_publications)) {
    if (pub.state !== 'PUBLISH_REQUESTED' || !pub.canonical_url) continue;
    try {
      const r=await fetch(pub.canonical_url, { redirect:'follow', headers:{'user-agent':'StratumPraxisPublishVerifier/1.0'} });
      if(r.ok){ pub.state='VERIFIED'; pub.verified_at=new Date().toISOString(); }
    } catch { /* one bounded check per scheduled run; no retry storm */ }
  }
}

async function listReady() {
  const names=(await fs.readdir(OUTBOX).catch(()=>[])).filter(n=>n.endsWith('.json')).sort();
  const records=[];
  for(const name of names){ const r=await readJson(path.join(OUTBOX,name)); if(r.status==='READY') records.push({name,record:r}); }
  return records;
}

async function updateIndex(state) {
  const pubs=Object.values(state.owned_publications || {}).filter(p=>p.canonical_url).sort((a,b)=>String(b.requested_at).localeCompare(String(a.requested_at)));
  const items=pubs.map(p=>`<li><a href="${esc(p.canonical_url)}">${esc(p.title)}</a><span>${esc(p.state)}</span></li>`).join('\n');
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Independent Work & AI | Stratum Praxis</title><meta name="description" content="Evidence-grounded writing about AI, independent work, software costs and practical operating systems."><link rel="canonical" href="${BASE}/"><meta name="robots" content="index,follow"><style>body{margin:0;background:#07090d;color:#f8fafc;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:900px;margin:auto;padding:45px 20px 90px}a{color:#dbeafe}h1{font-size:clamp(36px,7vw,64px);line-height:1.05}ul{list-style:none;padding:0}li{padding:18px 0;border-bottom:1px solid #293446;display:flex;gap:12px;justify-content:space-between}span{font-size:12px;color:#a1a1aa}</style></head><body><main><p><a href="../">← Signal Praxis</a></p><h1>Independent Work & AI</h1><p>Evidence-grounded analysis routed to useful tools only when the fit is real.</p><ul>${items}</ul></main></body></html>`;
  await fs.mkdir(SITE_DIR,{recursive:true}); await fs.writeFile(path.join(SITE_DIR,'index.html'),html);
}

async function updateSitemap(state) {
  let xml=await fs.readFile(SITEMAP,'utf8');
  const close='</urlset>';
  const existing=new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]));
  const today=new Date().toISOString().slice(0,10);
  const urls=[`${BASE}/`,...Object.values(state.owned_publications||{}).map(p=>p.canonical_url)].filter(Boolean);
  const additions=urls.filter(u=>!existing.has(u)).map(u=>`  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>`).join('\n');
  if(additions) xml=xml.replace(close,`${additions}\n${close}`);
  await fs.writeFile(SITEMAP,xml);
}

async function main(){
  const state=await readJson(STATE_FILE).catch(()=>({version:3,processed:{},attempts:{}}));
  const inventory=await readJson(INVENTORY_FILE).catch(()=>({assets:[]}));
  await verifyPrevious(state);
  state.owned_publications ||= {};
  const ready=await listReady();
  let created=0; let refreshed=0;
  for(const {name,record} of ready){
    const existing=state.owned_publications[record.output_id];
    const file=existing?.canonical_url
      ? existing.canonical_url.slice(BASE.length+1)
      : `${slug(record.title || record.output_id)}-${String(record.output_id).slice(-8)}.html`;
    const canonical=`${BASE}/${file}`;
    await fs.mkdir(SITE_DIR,{recursive:true});
    // The page is re-rendered on every pass. That is what keeps the CTA and the AI
    // disclosure on an already-requested page in step with what the runtime actually
    // did, instead of freezing a claim made by an older version of the renderer.
    await fs.writeFile(path.join(SITE_DIR,file),page(record,canonical,inventory));
    if(existing){ refreshed++; continue; }
    record.publication_lane='OWNED_SITE'; record.publication_state='PUBLISH_REQUESTED'; record.canonical_url=canonical;
    record.attribution={...(record.attribution||{}),channel_id:'owned_signal',campaign:'autonomous_revenue_publisher'};
    await writeJson(path.join(OUTBOX,name),record);
    state.owned_publications[record.output_id]={output_id:record.output_id,title:record.title,canonical_url:canonical,state:'PUBLISH_REQUESTED',requested_at:new Date().toISOString(),vertical_id:record.attribution?.vertical_id ?? null};
    created++;
  }
  await updateIndex(state); await updateSitemap(state); state.last_publish_pass_at=new Date().toISOString(); await writeJson(STATE_FILE,state);
  console.log(`OWNED_PUBLISHER created=${created} refreshed=${refreshed} total=${Object.keys(state.owned_publications).length}`);
}

main().catch(e=>{console.error(`OWNED_PUBLISHER_STOP ${e.message}`);process.exitCode=0;});
