#!/usr/bin/env node
// Static generator for the Stratum Praxis Systems Library.
//
// systems/manifest.json is the single source of truth. Everything under /systems/ that
// is not a package file is generated from it: the landing page, the product pages, the
// licence page, the docs index, the changelog, and the sitemap entries printed at the
// end of a run.
//
// No dependencies and no build tooling: this is a static site and it stays one.
//
//   node systems/build.mjs           write the pages
//   node systems/build.mjs --check   fail if the committed pages are stale

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SYSTEMS = path.join(ROOT, 'systems');
const CHECK_ONLY = process.argv.includes('--check');

const manifest = JSON.parse(await fs.readFile(path.join(SYSTEMS, 'manifest.json'), 'utf8'));
const { library, products, license_tiers: tiers, prohibited_uses: prohibited, deferred } = manifest;
const ORIGIN = library.origin;
const OG_IMAGE = `${ORIGIN}/media/og/stratum-praxis-og-default.png`;

const packaged = products.filter((p) => p.package_path);
const external = products.filter((p) => !p.package_path);

// ---------------------------------------------------------------- helpers

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function priceLabel(product) {
  if (product.price === 0) return 'Free · MIT';
  return `$${product.price} ${product.currency}`;
}

const STYLE = `
:root{
  --bg:#090912;--panel:#11111b;--panel-2:#15161f;--line:#272936;--line-soft:#1e202b;
  --text:#f4f4f8;--muted:#a2a4b2;--soft:#d3d4dc;--accent:#9db4ff;--ok:#7fd6b0;
  --max:1080px;--mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);
  font:16px/1.65 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  overflow-x:hidden;text-rendering:optimizeLegibility}
a{color:inherit}
.wrap{width:min(var(--max),calc(100% - 40px));margin:0 auto}
.skip{position:absolute;left:-9999px;top:0;background:#fff;color:#000;padding:10px 14px;z-index:99}
.skip:focus{left:8px;top:8px}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}

.top{border-bottom:1px solid var(--line-soft);position:sticky;top:0;z-index:20;
  background:rgba(9,9,18,.9);backdrop-filter:blur(14px)}
.nav{min-height:60px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.brand{font-size:11px;font-weight:800;letter-spacing:.16em;text-decoration:none;color:var(--soft)}
.brand span{color:var(--muted);font-weight:600}
.navlinks{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.navlinks a{font-size:13px;color:var(--muted);text-decoration:none}
.navlinks a:hover,.navlinks a[aria-current="page"]{color:var(--text)}

.hero{padding:76px 0 44px;border-bottom:1px solid var(--line-soft)}
.eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:800}
h1{font-size:clamp(34px,5.4vw,60px);line-height:1.03;letter-spacing:-.035em;margin:.28em 0 .3em;max-width:18ch}
.lead{color:var(--muted);font-size:clamp(16px,1.6vw,19px);max-width:66ch;margin:0}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}
.tag{font-size:11px;font-family:var(--mono);color:var(--soft);border:1px solid var(--line);
  border-radius:6px;padding:5px 9px;background:var(--panel)}
.tag.ok{color:var(--ok);border-color:#2c4a3e}

section{padding:56px 0;border-bottom:1px solid var(--line-soft)}
section:last-of-type{border-bottom:0}
h2{font-size:clamp(22px,2.6vw,30px);line-height:1.15;letter-spacing:-.025em;margin:0 0 10px}
h3{font-size:17px;letter-spacing:-.01em;margin:0 0 8px}
p{margin:0 0 14px;color:var(--soft)}
p.muted,.muted{color:var(--muted)}
.sub{color:var(--muted);max-width:70ch;margin:0 0 28px}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px;margin:0;padding:0;list-style:none}
.card{border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:22px;display:flex;flex-direction:column}
.card h3{margin-bottom:6px}
.card h3 a{text-decoration:none}
.card h3 a:hover{text-decoration:underline}
.card p{font-size:14.5px;color:var(--muted);flex:1}
.cardfoot{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:16px;
  padding-top:14px;border-top:1px solid var(--line-soft)}
.price{font-family:var(--mono);font-size:12px;color:var(--soft)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;
  padding:0 20px;border-radius:9px;text-decoration:none;font-weight:700;font-size:14.5px;
  border:1px solid var(--line);background:var(--panel-2);color:var(--text)}
.btn:hover{border-color:#3b3e50}
.btn.primary{background:#f2f3f8;color:#0a0a12;border-color:#f2f3f8}
.btn.primary:hover{background:#fff}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0 0}

table{width:100%;border-collapse:collapse;font-size:14px}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:12px}
th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line-soft);vertical-align:top}
th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700;white-space:nowrap}
tr:last-child td{border-bottom:0}
td code,code{font-family:var(--mono);font-size:12.5px;background:var(--panel);border:1px solid var(--line-soft);
  border-radius:5px;padding:2px 6px}
pre{font-family:var(--mono);font-size:12.5px;line-height:1.6;background:var(--panel);border:1px solid var(--line);
  border-radius:10px;padding:16px;overflow-x:auto;color:var(--soft);margin:0 0 16px}
pre code{background:none;border:0;padding:0;font-size:inherit}

ul.plain{list-style:none;padding:0;margin:0 0 16px}
ul.plain li{padding:9px 0;border-bottom:1px solid var(--line-soft);color:var(--soft);font-size:14.5px}
ul.plain li:last-child{border-bottom:0}
ul.bullets{padding-left:20px;margin:0 0 16px;color:var(--soft)}
ul.bullets li{margin-bottom:7px}

.note{border:1px solid var(--line);border-left:2px solid var(--accent);border-radius:0 10px 10px 0;
  background:var(--panel);padding:18px 20px;margin:0 0 20px}
.note p:last-child{margin-bottom:0}
.note strong{color:var(--text)}

.filelist{font-family:var(--mono);font-size:12.5px;columns:2;column-gap:26px}
.filelist a{color:var(--muted);text-decoration:none;display:block;padding:3px 0}
.filelist a:hover{color:var(--text);text-decoration:underline}

footer{padding:34px 0 60px;color:var(--muted);font-size:12.5px}
footer a{color:var(--muted)}
footer p{color:var(--muted);font-size:12.5px}

@media(max-width:640px){
  .hero{padding:48px 0 34px}
  section{padding:42px 0}
  .filelist{columns:1}
  .navlinks{gap:14px}
  .navlinks a{font-size:12.5px}
}
@media(prefers-reduced-motion:no-preference){
  .btn,.card{transition:border-color .18s ease,background .18s ease}
}
`.trim();

function page({ title, description, canonical, funnel, product, jsonLd, body, navCurrent }) {
  const links = [
    ['/systems/', 'Library'],
    ['/systems/licenses/', 'Licences'],
    ['/systems/docs/', 'Docs'],
    ['/systems/changelog/', 'Changelog'],
    ['/', 'Stratum Praxis']
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#090912">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Stratum Praxis">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(OG_IMAGE)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(OG_IMAGE)}">
<script defer src="/scos-analytics.js"></script>
<style>${STYLE}</style>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body data-funnel="${esc(funnel)}"${product ? ` data-product="${esc(product)}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap nav">
  <a class="brand" href="/systems/">STRATUM PRAXIS <span>· SYSTEMS LIBRARY</span></a>
  <nav class="navlinks" aria-label="Systems Library">
    ${links.map(([href, label]) => `<a href="${href}"${navCurrent === href ? ' aria-current="page"' : ''}>${label}</a>`).join('\n    ')}
  </nav>
</div></header>
<main id="main">
${body}
</main>
<footer><div class="wrap">
  <p>© 2026 Stratum Praxis · <a href="/systems/licenses/">Licences</a> · <a href="/systems/docs/">Docs</a> · <a href="/systems/changelog/">Changelog</a> · <a href="/">Main site</a></p>
  <p>Every system here runs in a real pipeline before it is listed. Test counts on this page are produced by running the suites, not by counting files. Nothing on this page claims a sale, a customer or a result that has not happened.</p>
</div></footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------- landing page

function productCard(p) {
  const href = p.package_path ? `/systems/products/${p.slug}/` : p.external_page;
  return `<li class="card">
  <h3><a href="${href}"${p.checkout_url ? ' data-primary-cta' : ''} data-analytics-id="systems_card_${esc(p.id)}" data-product="${esc(p.attribution_product_id)}">${esc(p.title)}</a></h3>
  <p>${esc(p.summary)}</p>
  <div class="cardfoot">
    <span class="price">${esc(priceLabel(p))}</span>
    <span class="tag">${esc(p.category)}</span>
    <span class="tag">setup: ${esc(p.setup_difficulty)}</span>
    ${p.test_count ? `<span class="tag ok">${p.test_count} tests</span>` : ''}
  </div>
</li>`;
}

const landingBody = `
<section class="hero"><div class="wrap">
  <div class="eyebrow">Systems Library</div>
  <h1>Small, verified systems you drop into an AI pipeline.</h1>
  <p class="lead">Not a prompt marketplace. Each entry is a working module with a stated
  outcome, a test suite you can run in one command, an honest list of what it cannot do,
  and a licence you can read in a minute.</p>
  <div class="meta">
    <span class="tag">${packaged.length} packaged systems</span>
    <span class="tag ok">${packaged.reduce((n, p) => n + (p.test_count || 0), 0)} passing tests</span>
    <span class="tag">zero dependencies</span>
    <span class="tag">Node.js 18+</span>
  </div>
  <div class="actions">
    <a class="btn primary" href="#catalogue">Browse the catalogue</a>
    <a class="btn" href="/systems/licenses/">Read the licences</a>
  </div>
</div></section>

<section><div class="wrap">
  <h2>What these are</h2>
  <p class="sub">Three of these systems came out of one publishing pipeline that was already
  running them in production. The fourth is an existing product listed here because it
  belongs in the same catalogue, not because it was rebuilt for it.</p>
  <div class="scroll"><table>
    <thead><tr><th>Question</th><th>Answer</th></tr></thead>
    <tbody>
      <tr><td>What is it?</td><td>A directory of files you copy into your own project. No SaaS, no account, no runtime service.</td></tr>
      <tr><td>Who is it for?</td><td>Solo operators and small teams running automated or semi-automated content and acquisition pipelines, and engineers adding guardrails to an LLM step.</td></tr>
      <tr><td>What does it need?</td><td>Node.js 18 or newer. No package installs, no build step, no network access, no telemetry.</td></tr>
      <tr><td>How hard is it?</td><td>Low. The work is not installation, it is deciding what your contract, catalogue or channel list actually says.</td></tr>
      <tr><td>Is it documented?</td><td>Every package ships a README with setup, configuration, sample input and output, known limitations, failure handling, rollback and security notes.</td></tr>
      <tr><td>How do updates work?</td><td>Semver, a changelog per package, published as new versions. Nothing auto-updates and nothing phones home.</td></tr>
    </tbody>
  </table></div>
</div></section>

<section id="catalogue"><div class="wrap">
  <h2>Packaged systems</h2>
  <p class="sub">Free, MIT, and downloadable from this site. Each one is a directory of
  files with a README, examples and a test suite you run in one command.</p>
  <ul class="cards">
    ${packaged.map(productCard).join('\n    ')}
  </ul>
</div></section>

<section><div class="wrap">
  <h2>Paid</h2>
  <p class="sub">One entry, and it is not new. This is an existing Stratum Praxis product
  listed here because it belongs in the same catalogue.</p>
  <ul class="cards">
    ${external.map(productCard).join('\n    ')}
  </ul>
  <p class="muted" style="margin-top:16px;max-width:70ch">Its page, price, checkout and
  buyer delivery already existed and were not created, changed or duplicated for this
  library. Buying goes through the same checkout it has always used.</p>
</div></section>

<section><div class="wrap">
  <h2>Free, personal, commercial and agency use</h2>
  <p class="sub">The short version, because this is where most catalogues are vague on purpose.</p>
  <div class="note">
    <p><strong>The three packaged systems are MIT.</strong> Personal use, commercial use
    inside your business, and client work are all permitted, at no cost, with no separate
    tier to buy. Keep the copyright notice; do not resell the source as your own product.</p>
    <p>That is not a launch promotion. These modules were extracted from a public,
    MIT-licensed repository, so those files are already MIT to everyone. Selling a
    restrictive licence over them would not be honest or enforceable.
    <a href="/systems/licenses/">The licence page explains it in full.</a></p>
  </div>
  <div class="note">
    <p><strong>The paid entry keeps its own terms.</strong> The AI Workflow Operator Bundle
    is a single-user product with a buyer-only workspace behind payment verification. Its
    price and terms live on its own page and were not created or changed here.</p>
  </div>
</div></section>

<section><div class="wrap">
  <h2>Considered and not shipped</h2>
  <p class="sub">Five internal assets were audited and left out. Catalogue size is not the goal.</p>
  <div class="scroll"><table>
    <thead><tr><th>Asset</th><th>Why it is not here</th></tr></thead>
    <tbody>
      ${deferred.map((d) => `<tr><td><code>${esc(d.id)}</code></td><td>${esc(d.reason)}</td></tr>`).join('\n      ')}
    </tbody>
  </table></div>
</div></section>
`;

// ---------------------------------------------------------------- product page

function productPage(p) {
  const canonical = `${ORIGIN}/systems/products/${p.slug}/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: p.title,
    description: p.summary,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: p.supported_platforms.join(', '),
    softwareVersion: p.version,
    url: canonical,
    license: 'https://opensource.org/licenses/MIT',
    offers: { '@type': 'Offer', price: String(p.price), priceCurrency: p.currency, availability: 'https://schema.org/InStock' }
  };

  const body = `
<section class="hero"><div class="wrap">
  <div class="eyebrow"><a href="/systems/" style="color:inherit;text-decoration:none">Systems Library</a> · ${esc(p.category)}</div>
  <h1>${esc(p.title)}</h1>
  <p class="lead">${esc(p.summary)}</p>
  <div class="meta">
    <span class="tag">v${esc(p.version)}</span>
    <span class="tag">${esc(priceLabel(p))}</span>
    <span class="tag ok">${p.test_count} passing tests</span>
    <span class="tag">${esc(p.maturity)}</span>
    <span class="tag">zero dependencies</span>
  </div>
  <div class="actions">
    <a class="btn primary" data-primary-cta href="${esc(p.package_path)}README.md"
       data-analytics-id="${esc(p.cta_id)}" data-product="${esc(p.attribution_product_id)}">Read the full README →</a>
    <a class="btn" href="${esc(p.changelog_url)}" data-analytics-id="${esc(p.id)}_changelog">Changelog</a>
    <a class="btn" href="/systems/licenses/" data-analytics-id="${esc(p.id)}_licence">Licence</a>
  </div>
</div></section>

<section><div class="wrap">
  <h2>At a glance</h2>
  <div class="scroll"><table>
    <tbody>
      <tr><th>Outcome</th><td>${esc(p.summary)}</td></tr>
      <tr><th>Requirements</th><td>${p.requirements.map((r) => `<code>${esc(r)}</code>`).join(' ')}</td></tr>
      <tr><th>Platforms</th><td>${p.supported_platforms.map(esc).join(' · ')}</td></tr>
      <tr><th>Setup</th><td>${esc(p.setup_difficulty)} — ${esc(p.estimated_setup_time)}</td></tr>
      <tr><th>Validation</th><td><code>${esc(p.validation_command)}</code> — ${p.test_count} tests</td></tr>
      <tr><th>Delivery</th><td>Direct download from this site. No account, no email, no checkout.</td></tr>
      <tr><th>Licence</th><td>MIT — <a href="/systems/licenses/">read the terms</a></td></tr>
      <tr><th>Updates</th><td>Semver, published as new versions. Nothing auto-updates.</td></tr>
    </tbody>
  </table></div>
</div></section>

<section><div class="wrap">
  <h2>Get it</h2>
  <p class="sub">Every file is served directly from this site. Download the tree, or read
  it first — the README is the documentation and the tests are the specification.</p>
  <pre><code>mkdir -p ${esc(p.slug)} &amp;&amp; cd ${esc(p.slug)}
for f in ${esc(p.files.join(' '))}; do
  mkdir -p "$(dirname "$f")" &amp;&amp; curl -fsSL -o "$f" "${esc(ORIGIN)}${esc(p.package_path)}$f"
done
node --test test/*.test.mjs</code></pre>
  <h3>Files</h3>
  <div class="filelist">
    ${p.files.map((f) => `<a href="${esc(p.package_path)}${esc(f)}" data-analytics-id="${esc(p.id)}_file">${esc(f)}</a>`).join('\n    ')}
  </div>
</div></section>

<section><div class="wrap">
  <h2>Before you rely on it</h2>
  <p>Read the <strong>Known limitations</strong> section of the README before you wire this
  into anything that matters. Every one of these systems is a floor, not a proof: it
  catches the failures it was written to catch, and it will not catch a failure nobody has
  described to it yet.</p>
  <p class="muted">There are no testimonials, results or revenue claims on this page because
  there is no verified purchase or customer outcome to report for it.</p>
  <div class="actions">
    <a class="btn" href="/systems/">← Back to the library</a>
    <a class="btn" href="/systems/docs/">All documentation</a>
  </div>
</div></section>
`;

  return page({
    title: `${p.title} — Stratum Praxis Systems Library`,
    description: p.summary,
    canonical,
    funnel: 'systems_library_product',
    product: p.attribution_product_id,
    navCurrent: '/systems/',
    jsonLd,
    body
  });
}

// ---------------------------------------------------------------- licences page

const licensesBody = `
<section class="hero"><div class="wrap">
  <div class="eyebrow">Systems Library</div>
  <h1>Licences</h1>
  <p class="lead">Two tiers, both of which can actually be honoured. Nothing here is legal
  advice, and the clauses flagged below should be read by a lawyer before you rely on them
  commercially.</p>
</div></section>

<section><div class="wrap">
  <h2>The tiers</h2>
  <div class="scroll"><table>
    <thead><tr><th>Tier</th><th>Applies to</th><th>What it permits</th></tr></thead>
    <tbody>
      ${tiers.map((t) => `<tr><td><strong>${esc(t.name)}</strong></td><td>${t.applies_to.map((a) => `<code>${esc(a)}</code>`).join(' ')}</td><td>${esc(t.summary)}</td></tr>`).join('\n      ')}
    </tbody>
  </table></div>
</div></section>

<section><div class="wrap">
  <h2>Why there is no paid personal / commercial / agency ladder</h2>
  <p>A three-tier licence ladder is the normal way to sell a code package, and it is not
  offered here. The reason is factual.</p>
  <p>The three packaged systems were extracted from
  <a href="https://github.com/stratumpraxis/stratum-praxis">a public repository whose root
  licence is MIT</a>. Every published version of those files is already MIT-licensed to
  everyone who can read the repository. A restrictive licence cannot be applied backwards
  to a permissive grant that has already been made, so a PERSONAL / COMMERCIAL / AGENCY
  ladder over this source would be a tier structure the seller could not enforce and the
  buyer would not need.</p>
  <p>So the packages are MIT, and they are free. What you get for reading this page rather
  than the raw repository is the part that is actually work: a clean-room extraction with
  the brand-specific values pulled out into configuration, a README that states the
  limitations, a runnable test suite, examples, and a changelog that records what changed
  relative to the internal original.</p>
  <div class="note">
    <p><strong>Flagged for professional legal review.</strong> Whether the owner can offer
    a restrictively licensed edition of <em>future</em> versions of this code — a dual
    licence over new work, alongside the MIT history — is a question for a lawyer, not for
    this page. It is recorded as an open decision, not answered here.</p>
  </div>
</div></section>

<section><div class="wrap">
  <h2>What MIT permits, in plain terms</h2>
  <div class="scroll"><table>
    <thead><tr><th>Use</th><th>Permitted</th></tr></thead>
    <tbody>
      <tr><td>Personal projects</td><td>Yes, at no cost.</td></tr>
      <tr><td>Inside your own business, commercially</td><td>Yes, at no cost.</td></tr>
      <tr><td>In work you deliver to a client</td><td>Yes, at no cost.</td></tr>
      <tr><td>Modified, forked, embedded in a larger product</td><td>Yes.</td></tr>
      <tr><td>Keeping the copyright and licence notice</td><td>Required.</td></tr>
      <tr><td>Any warranty or liability from the author</td><td>None. The software is provided as-is.</td></tr>
    </tbody>
  </table></div>
</div></section>

<section><div class="wrap">
  <h2>Prohibited regardless of tier</h2>
  <ul class="plain">
    ${prohibited.map((u) => `<li>${esc(u)}</li>`).join('\n    ')}
  </ul>
  <p class="muted">MIT permits redistribution, including modified redistribution. The first
  two items above are therefore a statement of what this project considers acceptable
  conduct, not an additional legal restriction on the MIT-licensed files.</p>
</div></section>

<section><div class="wrap">
  <h2>The paid entry</h2>
  <p>The AI Workflow Operator Bundle is not MIT. It is a single-user product sold under the
  terms published on <a href="/prompt-store/">its own page</a>, delivered to a buyer-only
  workspace after payment verification. This page does not restate, extend or override
  those terms.</p>
  <div class="actions"><a class="btn" href="/systems/">← Back to the library</a></div>
</div></section>

<section><div class="wrap">
  <p class="muted">This page describes licensing in ordinary language so you can decide
  quickly. It is not legal advice and it is not a substitute for reading the
  <code>LICENSE</code> file shipped in each package, which is the operative text.</p>
</div></section>
`;

// ---------------------------------------------------------------- docs page

const docsBody = `
<section class="hero"><div class="wrap">
  <div class="eyebrow">Systems Library</div>
  <h1>Documentation</h1>
  <p class="lead">Every packaged system ships the same documentation set. There is no
  separate docs site to fall out of date: the README in the package is the documentation,
  and the tests are the specification.</p>
</div></section>

<section><div class="wrap">
  <h2>What every README contains</h2>
  <ul class="plain">
    <li><strong>Outcome</strong> — what changes in your pipeline once it is wired in</li>
    <li><strong>Intended user</strong>, and an explicit <strong>not for</strong> list</li>
    <li><strong>Requirements</strong> and <strong>supported platforms</strong></li>
    <li><strong>File structure</strong>, <strong>setup</strong> and a <strong>configuration example</strong></li>
    <li><strong>Validation command</strong> and a <strong>sample input and output</strong> you can reproduce</li>
    <li><strong>Known limitations</strong> — written to be believed, not to reassure</li>
    <li><strong>Failure handling</strong> and <strong>rollback</strong></li>
    <li><strong>Security notes</strong>, <strong>version and update policy</strong>, <strong>licence</strong>, <strong>support boundary</strong></li>
  </ul>
</div></section>

<section><div class="wrap">
  <h2>Per-system documentation</h2>
  <div class="scroll"><table>
    <thead><tr><th>System</th><th>README</th><th>Changelog</th><th>Validation</th></tr></thead>
    <tbody>
      ${packaged.map((p) => `<tr>
        <td><a href="/systems/products/${esc(p.slug)}/">${esc(p.title)}</a></td>
        <td><a href="${esc(p.docs_url)}" data-analytics-id="docs_${esc(p.id)}_readme">README.md</a></td>
        <td><a href="${esc(p.changelog_url)}" data-analytics-id="docs_${esc(p.id)}_changelog">CHANGELOG.md</a></td>
        <td><code>${esc(p.validation_command)}</code> · ${p.test_count} tests</td>
      </tr>`).join('\n      ')}
    </tbody>
  </table></div>
</div></section>

<section><div class="wrap">
  <h2>Running the tests</h2>
  <p>Every package uses the Node standard-library test runner. There is nothing to install.</p>
  <pre><code>cd &lt;package&gt;
node --test test/*.test.mjs</code></pre>
  <p>Each package also has a <code>check</code> script that runs its CLI over the shipped
  example files. Two of the three deliberately exit non-zero, because the examples are
  written to fail — that is how you confirm the gate is actually gating.</p>
</div></section>

<section><div class="wrap">
  <h2>Support boundary</h2>
  <p>These packages are provided as-is. The README and the tests are the support. There is
  no SLA, no installation service, no configuration consulting included, and no guarantee
  that a heuristic catches every case your pipeline can produce.</p>
  <div class="actions"><a class="btn" href="/systems/">← Back to the library</a></div>
</div></section>
`;

// ---------------------------------------------------------------- changelog page

const changelogBody = `
<section class="hero"><div class="wrap">
  <div class="eyebrow">Systems Library</div>
  <h1>Changelog</h1>
  <p class="lead">Library-level changes are recorded here. Per-package changes live in the
  <code>CHANGELOG.md</code> shipped inside each package.</p>
</div></section>

<section><div class="wrap">
  <h2>Library — ${esc(library.updated_at)}</h2>
  <h3>Added</h3>
  <ul class="bullets">
    <li>The Systems Library at <code>/systems/</code>, generated from <code>systems/manifest.json</code>.</li>
    ${packaged.map((p) => `<li><strong>${esc(p.title)} v${esc(p.version)}</strong> — clean-room package, ${p.test_count} passing tests, MIT.</li>`).join('\n    ')}
    <li>The existing <a href="/prompt-store/">AI Workflow Operator Bundle</a> listed as the paid entry. Its page, price, checkout and delivery are unchanged.</li>
    <li>Licence, documentation and changelog routes.</li>
    <li>An asset audit of ten internal assets at <code>/systems/inventory.json</code>, with a disposition and the evidence behind it for each.</li>
  </ul>
  <h3>Deliberately not added</h3>
  <ul class="bullets">
    ${deferred.map((d) => `<li><code>${esc(d.id)}</code> — ${esc(d.reason)}</li>`).join('\n    ')}
  </ul>
</div></section>

<section><div class="wrap">
  <h2>Per-package changelogs</h2>
  <ul class="plain">
    ${packaged.map((p) => `<li><a href="${esc(p.changelog_url)}">${esc(p.title)} — CHANGELOG.md</a> <span class="muted">· v${esc(p.version)}</span></li>`).join('\n    ')}
  </ul>
  <div class="actions"><a class="btn" href="/systems/">← Back to the library</a></div>
</div></section>
`;

// ---------------------------------------------------------------- write

const outputs = new Map();

outputs.set('index.html', page({
  title: 'Systems Library — Stratum Praxis',
  description: library.tagline + ' Verified modules with runnable tests, honest limitations and a licence you can read in a minute.',
  canonical: `${ORIGIN}/systems/`,
  funnel: 'systems_library',
  navCurrent: '/systems/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: library.name,
    description: library.tagline,
    url: `${ORIGIN}/systems/`,
    hasPart: products.map((p) => ({
      '@type': 'SoftwareApplication',
      name: p.title,
      description: p.summary,
      applicationCategory: 'DeveloperApplication',
      softwareVersion: p.version,
      url: p.package_path ? `${ORIGIN}/systems/products/${p.slug}/` : `${ORIGIN}${p.external_page}`,
      offers: { '@type': 'Offer', price: String(p.price), priceCurrency: p.currency }
    }))
  },
  body: landingBody
}));

outputs.set('licenses/index.html', page({
  title: 'Licences — Stratum Praxis Systems Library',
  description: 'Two licence tiers that can actually be honoured: MIT for the packaged systems, and the existing single-user terms for the paid product.',
  canonical: `${ORIGIN}/systems/licenses/`,
  funnel: 'systems_library_licenses',
  navCurrent: '/systems/licenses/',
  body: licensesBody
}));

outputs.set('docs/index.html', page({
  title: 'Documentation — Stratum Praxis Systems Library',
  description: 'Setup, configuration, validation commands, known limitations, failure handling and rollback for every packaged system.',
  canonical: `${ORIGIN}/systems/docs/`,
  funnel: 'systems_library_docs',
  navCurrent: '/systems/docs/',
  body: docsBody
}));

outputs.set('changelog/index.html', page({
  title: 'Changelog — Stratum Praxis Systems Library',
  description: 'Library-level and per-package changes for the Stratum Praxis Systems Library.',
  canonical: `${ORIGIN}/systems/changelog/`,
  funnel: 'systems_library_changelog',
  navCurrent: '/systems/changelog/',
  body: changelogBody
}));

for (const p of packaged) {
  outputs.set(`products/${p.slug}/index.html`, productPage(p));
}

let stale = 0;
for (const [rel, html] of outputs) {
  const file = path.join(SYSTEMS, rel);
  let current = null;
  try { current = await fs.readFile(file, 'utf8'); } catch {}
  if (current === html) continue;
  if (CHECK_ONLY) {
    stale += 1;
    console.error(`stale: systems/${rel}`);
    continue;
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html, 'utf8');
  console.log(`wrote systems/${rel}`);
}

if (CHECK_ONLY) {
  if (stale) {
    console.error(`\n${stale} generated page(s) are out of date. Run: node systems/build.mjs`);
    process.exit(1);
  }
  console.log('all generated pages are up to date');
}

// Sitemap entries, printed so they can be reconciled with sitemap.xml by hand.
console.log('\nsitemap entries:');
console.log(`  ${ORIGIN}/systems/`);
for (const p of packaged) console.log(`  ${ORIGIN}/systems/products/${p.slug}/`);
for (const rel of ['licenses', 'docs', 'changelog']) console.log(`  ${ORIGIN}/systems/${rel}/`);
