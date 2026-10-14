import REVENUE_ROUTER_WORKSPACE_HTML from "./revenue-router-workspace.js";
import baseWorker from "./slide-factory-worker.js";
const te = new TextEncoder(),
  td = new TextDecoder();
const OFFERS = {
  bundle3: {
    product: "prod_V9C0rjjF6V6Cjf",
    price: "price_1U8tcVJMK7zFs997DDR8EyDh",
    link: "plink_1U8tdhJMK7zFs997Al4dAAOW",
    amount: 1700,
    currency: "usd",
    title: "AI Workflow Operator Bundle",
    path: "/prompt-store/workspace",
  },
  ops10: {
    product: "prod_V9CzTM2i3HzgCu",
    price: "price_1U8uZRJMK7zFs997VY06pUWF",
    link: "plink_1U8uZcJMK7zFs997WwI48ntR",
    amount: 3900,
    currency: "usd",
    title: "AI Operations Systems Pack",
    path: "/prompt-store/ops10/workspace",
  },
  cross_personal: {
    product: "prod_VA15eq5Gxy3Zzj",
    price: "price_1U9h41JMK7zFs997QSWUJZrI",
    link: "plink_1U9h4LJMK7zFs997nRbhDVq9",
    amount: 6900,
    currency: "usd",
    title: "Cross-Agent Operating Kit · Personal",
    path: "/cross-agent-kit/workspace",
  },
  cross_commercial: {
    product: "prod_VA15eq5Gxy3Zzj",
    price: "price_1U9h48JMK7zFs9971zEnU7Ue",
    link: "plink_1U9h4QJMK7zFs997EbnP5tS3",
    amount: 14900,
    currency: "usd",
    title: "Cross-Agent Operating Kit · Commercial",
    path: "/cross-agent-kit/workspace",
  },
  cross_agency: {
    product: "prod_VA15eq5Gxy3Zzj",
    price: "price_1U9h4FJMK7zFs997YUDnLz4N",
    link: "plink_1U9h4VJMK7zFs997YyCnb8Vr",
    amount: 29900,
    currency: "usd",
    title: "Cross-Agent Operating Kit · Agency",
    path: "/cross-agent-kit/workspace",
  },
  spend_kit: {
    product: null,
    price: null,
    link: "plink_1U784fJMK7zFs997T0pbVHyb",
    amount: 3900,
    currency: "usd",
    title: "AI & SaaS Spend Decision Kit",
    path: "/spend-decision-kit/workspace",
    verify: "payment_link_amount",
  },
  revenue_router: {
    product: null,
    price: null,
    link: null,
    amount: 2900,
    currency: "usd",
    title: "Revenue Router v1.0",
    path: "/revenue-router/workspace",
    route: "vp_stratum_revenue_router_v1",
    verify: "route_amount",
  },
};
const SPEND_KIT_WORKSPACE_HTML = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>AI & SaaS Spend Decision Kit | Workspace</title><link rel=\"stylesheet\" href=\"styles.css\"><style>textarea,input,select{width:100%;padding:10px;margin:5px 0 12px;background:#0e1420;color:#f4f4f5;border:1px solid #303744;border-radius:7px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border-bottom:1px solid #303744;padding:9px;text-align:left}.workspace{overflow-x:auto}.mini{font-size:13px;color:#a1a1aa}</style><!-- Google tag (gtag.js) -->\n<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-QXTYRB4TWY\"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-QXTYRB4TWY');\n</script>\n</head><body><main><section class=\"hero\"><div class=\"container\"><p class=\"eyebrow\">// Purchased workspace · v1.0</p><h1>AI & SaaS Spend Decision Kit</h1><p class=\"hero-text\">Build your decision register below. Data stays in this browser session unless you export it. Do not enter passwords, API keys, payment-card data, customer PII or regulated information.</p></div></section><section class=\"section\"><div class=\"container\"><h2>1. Add a tool</h2><div class=\"card-grid\"><div><label>Tool</label><input id=\"tool\"></div><div><label>Owner</label><input id=\"owner\" placeholder=\"Team or accountable owner\"></div><div><label>Monthly cost USD</label><input id=\"cost\" type=\"number\" min=\"0\"></div><div><label>Seats</label><input id=\"seats\" type=\"number\" min=\"0\" placeholder=\"Paid seats\"></div><div><label>Workflow supported</label><input id=\"workflow\" placeholder=\"What job does this tool support?\"></div><div><label>Renewal date</label><input id=\"renewalDate\" type=\"date\"></div><div><label>Usage (1–5)</label><input id=\"usage\" type=\"number\" min=\"1\" max=\"5\" value=\"3\"></div><div><label>Workflow importance (1–5)</label><input id=\"importance\" type=\"number\" min=\"1\" max=\"5\" value=\"3\"></div><div><label>Overlap risk (1–5)</label><input id=\"overlap\" type=\"number\" min=\"1\" max=\"5\" value=\"1\"></div><div><label>Renewal urgency (1–5)</label><input id=\"renewal\" type=\"number\" min=\"1\" max=\"5\" value=\"1\"></div></div><button class=\"button button-primary\" onclick=\"addTool()\">Add to decision register</button><div class=\"workspace\"><table><thead><tr><th>Tool</th><th>Owner</th><th>Seats</th><th>Workflow</th><th>Renewal</th><th>Monthly</th><th>Annual</th><th>Score</th><th>Action</th></tr></thead><tbody id=\"rows\"></tbody></table></div><p id=\"summary\" class=\"hero-text\">Annual stack: $0 · Review exposure: $0</p><button class=\"button button-secondary\" onclick=\"exportCSV()\">Export CSV</button></div></section><section class=\"section section-accent\"><div class=\"container\"><h2>2. Decision logic</h2><ul class=\"check-list\"><li><strong>KEEP:</strong> strong usage + important workflow + low overlap.</li><li><strong>REDUCE:</strong> useful tool, but current tier/seats appear larger than needed.</li><li><strong>CONSOLIDATE:</strong> useful capability with meaningful overlap elsewhere.</li><li><strong>REVIEW:</strong> evidence is weak, renewal is close, or the workflow case is unclear.</li><li><strong>CANCEL:</strong> weak usage and weak workflow importance; verify dependencies before acting.</li></ul><p class=\"fine\">The score is a prioritization aid, not an instruction to cancel software. Validate contracts, dependencies, security, data retention and operational consequences before changing subscriptions.</p></div></section><section class=\"section\"><div class=\"container\"><h2>3. 30-day action plan</h2><ol><li>Export the decision register and sort REVIEW / CONSOLIDATE / REDUCE candidates by annual cost.</li><li>Verify actual usage, owners, dependencies and renewal dates for the top five.</li><li>Take one reversible action first: remove unused seats, downgrade a tier, pause an add-on or consolidate a duplicate capability where safe.</li><li>Record the baseline cost before the change.</li><li>Re-measure after 30 days and only count savings that actually occurred.</li></ol><div class=\"button-row\"><a class=\"button button-secondary\" href=\"ai-saas-spend-waste-audit.html\">Need independent review? View the $499 Spend Audit</a><a class=\"button button-secondary\" href=\"ai-saas-spend-monitoring.html\">Need recurring control? View Monitoring</a></div></div></section></main><script>const data=[];function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)}function decision(u,i,o,r){const value=u+i;const risk=o+r;if(u<=2&&i<=2)return 'CANCEL';if(o>=4&&value>=5)return 'CONSOLIDATE';if(u<=3&&i>=3)return 'REDUCE';if(r>=4||risk>=6)return 'REVIEW';return 'KEEP'}function addTool(){const x={tool:document.getElementById('tool').value.trim()||'Unnamed tool',owner:document.getElementById('owner').value.trim(),seats:+document.getElementById('seats').value||0,workflow:document.getElementById('workflow').value.trim(),renewalDate:document.getElementById('renewalDate').value,cost:+document.getElementById('cost').value||0,u:+document.getElementById('usage').value||1,i:+document.getElementById('importance').value||1,o:+document.getElementById('overlap').value||1,r:+document.getElementById('renewal').value||1};x.score=(x.u+x.i)-(x.o+x.r);x.action=decision(x.u,x.i,x.o,x.r);data.push(x);render();document.getElementById('tool').value='';document.getElementById('cost').value=''}function render(){const rows=document.getElementById('rows');rows.innerHTML=data.map(x=>`<tr><td>${esc(x.tool)}</td><td>${esc(x.owner||'—')}</td><td>${x.seats||'—'}</td><td>${esc(x.workflow||'—')}</td><td>${esc(x.renewalDate||'—')}</td><td>${money(x.cost)}</td><td>${money(x.cost*12)}</td><td>${x.score}</td><td><strong>${x.action}</strong></td></tr>`).join('');const annual=data.reduce((a,x)=>a+x.cost*12,0);const review=data.filter(x=>x.action!=='KEEP').reduce((a,x)=>a+x.cost*12,0);document.getElementById('summary').textContent=`Annual stack: ${money(annual)} · Review exposure: ${money(review)}`}function esc(s){return s.replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]))}function exportCSV(){const h=['Tool','Owner','Seats','Workflow supported','Renewal date','Monthly cost','Annual cost','Usage','Importance','Overlap risk','Renewal urgency','Score','Action'];const lines=[h,...data.map(x=>[x.tool,x.owner,x.seats,x.workflow,x.renewalDate,x.cost,x.cost*12,x.u,x.i,x.o,x.r,x.score,x.action])].map(r=>r.map(v=>'\"'+String(v).replace(/\"/g,'\"\"')+'\"').join(','));const b=new Blob([lines.join('\\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='ai-saas-spend-decision-register.csv';a.click();URL.revokeObjectURL(a.href)}</script></body></html>";
function j(x, s = 200, h = {}) {
  return new Response(JSON.stringify(x), {
    status: s,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...h,
    },
  });
}
function b64(b) {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function sign(secret, sid, key) {
  const p = b64(
    te.encode(
      JSON.stringify({ sid, offer: key, exp: Date.now() + 30 * 864e5 }),
    ),
  );
  const k = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return (
    p +
    "." +
    b64(
      new Uint8Array(
        await crypto.subtle.sign("HMAC", k, te.encode("prompt-store-v3|" + p)),
      ),
    )
  );
}
async function verify(secret, t) {
  try {
    const [p, s] = String(t || "").split(".");
    if (!p || !s) return null;
    const k = await crypto.subtle.importKey(
      "raw",
      te.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        k,
        unb64(s),
        te.encode("prompt-store-v3|" + p),
      ))
    )
      return null;
    const x = JSON.parse(td.decode(unb64(p)));
    return x.sid && OFFERS[x.offer] && x.exp > Date.now() ? x : null;
  } catch {
    return null;
  }
}
async function stripe(env, path) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const x = await r.json();
  if (!r.ok) throw Error("Stripe verification failed");
  return x;
}
async function stripePost(env, path, fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "")
      body.set(key, String(value).slice(0, 500));
  }
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const x = await r.json();
  if (!r.ok) throw Error("Stripe record update failed");
  return x;
}
async function sessionBase(env, sid) {
  return stripe(env, `checkout/sessions/${encodeURIComponent(sid)}`);
}
async function session(env, sid) {
  return stripe(
    env,
    `checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price`,
  );
}
function paid(s, o) {
  if (o.verify === "route_amount") {
    return Boolean(
      s &&
      s.livemode === true &&
      s.payment_status === "paid" &&
      s.mode === "payment" &&
      Number(s.amount_total) === o.amount &&
      String(s.currency || "").toLowerCase() === o.currency &&
      routeId(s) === o.route
    );
  }
  const baseMatch =
    s.payment_status === "paid" &&
    s.mode === "payment" &&
    Number(s.amount_total) === o.amount &&
    String(s.currency || "").toLowerCase() === o.currency &&
    s.payment_link === o.link;
  if (!baseMatch) return false;
  if (o.verify === "payment_link_amount") return true;
  const li = s.line_items?.data || [];
  return (
    li.length === 1 &&
    li[0]?.price?.id === o.price &&
    Number(li[0]?.quantity || 0) === 1
  );
}
function offerFor(s) {
  return Object.entries(OFFERS).find(([, offer]) => paid(s, offer)) || null;
}
function routeId(s) {
  const value = String(s.client_reference_id || "");
  return /^[a-zA-Z0-9_-]{1,200}$/.test(value) ? value : "unattributed";
}

function isRevenueRouterPaid(s) {
  return paid(s, OFFERS.revenue_router);
}

function isWorkflowAuditPaid(s) {
  const ref = routeId(s);
  const routeMatches =
    ref.startsWith("workflow_audit_") ||
    ref.startsWith("outbound_b2b_intro_");
  return Boolean(
    s &&
    s.livemode === true &&
    s.payment_status === "paid" &&
    s.mode === "payment" &&
    s.payment_link &&
    Number(s.amount_total) === 49900 &&
    String(s.currency || "").toLowerCase() === "usd" &&
    routeMatches
  );
}
async function recordSession(env, s, fields) {
  const metadata = {
    "metadata[attribution_route_id]": routeId(s),
    "metadata[attribution_state]":
      routeId(s) === "unattributed" ? "UNATTRIBUTED" : "ATTRIBUTED",
    "metadata[payment_evidence]": `stripe:${s.payment_intent || s.id}`,
    ...Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [`metadata[${key}]`, value]),
    ),
  };
  return stripePost(
    env,
    `checkout/sessions/${encodeURIComponent(s.id)}`,
    metadata,
  );
}
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}
function hexToBytes(value) {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{2}/g), (part) => parseInt(part, 16));
}
async function verifyWebhook(raw, header, secret) {
  const fields = Object.fromEntries(
    String(header || "")
      .split(",")
      .map((part) => part.split("=", 2)),
  );
  const timestamp = Number(fields.t);
  const supplied = hexToBytes(fields.v1 || "");
  if (!timestamp || !supplied || Math.abs(Date.now() / 1000 - timestamp) > 300)
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, te.encode(`${timestamp}.${raw}`)),
  );
  return sameBytes(expected, supplied);
}
async function webhook(req, env) {
  if (!env.STRIPE_WEBHOOK_SECRET)
    return j({ error: "Webhook is not configured" }, 503);
  const raw = await req.text();
  if (
    !(await verifyWebhook(
      raw,
      req.headers.get("Stripe-Signature"),
      env.STRIPE_WEBHOOK_SECRET,
    ))
  )
    return j({ error: "Invalid Stripe signature" }, 400);
  const event = JSON.parse(raw);
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  )
    return j({ received: true, ignored: true });
  const incoming = event.data?.object;
  if (!incoming?.id?.startsWith("cs_"))
    return j({ error: "Checkout Session is missing" }, 400);

  // Workflow Audit is a fixed-scope service, not a downloadable product.
  // Verify it from the signed Stripe event + live Checkout Session without
  // requiring Product/Price API permissions on the restricted Stripe key.
  const baseSession = await sessionBase(env, incoming.id);
  if (isWorkflowAuditPaid(baseSession)) {
    await recordSession(env, baseSession, {
      webhook_event_id: event.id,
      revenue_recorded_at: new Date(event.created * 1000).toISOString(),
      revenue_product: "workflow_audit",
      revenue_amount: baseSession.amount_total,
      revenue_currency: baseSession.currency,
      delivery_state: "PAID_AWAITING_INTAKE",
    });
    return j({ received: true, workflow_audit: true });
  }

  const s = await session(env, incoming.id);
  const match = offerFor(s);
  if (!match) return j({ received: true, ignored: true });
  const [key] = match;
  await recordSession(env, s, {
    webhook_event_id: event.id,
    revenue_recorded_at: new Date(event.created * 1000).toISOString(),
    revenue_product: key,
    revenue_amount: s.amount_total,
    revenue_currency: s.currency,
    delivery_state: "READY_FOR_BUYER_VERIFICATION",
  });
  return j({ received: true });
}
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function content(env, o) {
  const p = await stripe(env, `products/${o.product}`);
  let body = "";
  for (let i = 1; i <= 99; i++) {
    const k = "content_" + String(i).padStart(2, "0");
    if (!(k in p.metadata)) break;
    body += p.metadata[k];
  }
  return body;
}
function split(body, key) {
  if (key === "bundle3") {
    const a = body.indexOf("## 1)"),
      b = body.indexOf("## 2)"),
      c = body.indexOf("## 3)");
    if (a >= 0 && b >= 0 && c >= 0)
      return [
        { n: "Task → Workflow Architect", b: body.slice(a, b) },
        { n: "AI Tool & Role Router", b: body.slice(b, c) },
        { n: "Company Brain Builder", b: body.slice(c) },
      ];
  }
  if (key === "ops10")
    return body
      .split(/(?=## \d{2} — )/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x, i) => ({
        n: (x.match(/^## \d{2} — ([^\n]+)/) || [])[1] || `System ${i + 1}`,
        b: x,
      }));
  return body
    .split(/(?=# FILE: )/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x, i) => ({
      n: (x.match(/^# FILE: ([^\n]+)/) || [])[1] || `Asset ${i + 1}`,
      b: x,
    }));
}
async function page(env, o, key) {
  if (key === "revenue_router") return REVENUE_ROUTER_WORKSPACE_HTML;
  if (key === "spend_kit") return SPEND_KIT_WORKSPACE_HTML;
  const body = await content(env, o),
    parts = split(body, key),
    data = JSON.stringify(parts.map((x) => x.b)).replace(/</g, "\\u003c");
  const cards = parts
    .map(
      (x, i) =>
        `<section class="card"><div class="num">${String(i + 1).padStart(2, "0")}</div><h2>${esc(x.n)}</h2><button class="copy" data-i="${i}">Copy</button><pre>${esc(x.b)}</pre></section>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${esc(o.title)} | Buyer Workspace</title><style>:root{--b:#080b12;--p:#111722;--l:#293449;--t:#f5f7fb;--m:#9ba8ba;--a:#73d9ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(900px 500px at 70% -100px,#15294d 0,transparent 65%),var(--b);color:var(--t);font:15px/1.65 system-ui,sans-serif}.w{width:min(1000px,calc(100% - 30px));margin:auto;padding:42px 0 80px}.ey{font-size:10px;letter-spacing:.16em;color:var(--a);font-weight:900}h1{font-size:clamp(38px,7vw,68px);line-height:1;margin:.2em 0}.m{color:var(--m)}.top{display:flex;gap:8px;margin:22px 0;flex-wrap:wrap}button{border:1px solid var(--l);background:#172033;color:#fff;border-radius:10px;padding:10px 13px;font-weight:800;cursor:pointer}.primary{background:#f5f7fb;color:#09101a}.card{background:linear-gradient(180deg,#131b28,#0d131d);border:1px solid var(--l);border-radius:18px;padding:20px;margin:12px 0}.num{font-size:10px;color:#71819a}.card h2{font-size:22px}.copy{margin-bottom:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#070a10;border:1px solid #273247;border-radius:12px;padding:15px;color:#d3dae5;font:12px/1.6 ui-monospace,monospace}.fine{font-size:11px;color:#7e8a9b;border-top:1px solid var(--l);padding-top:18px;margin-top:26px}</style></head><body><main class="w"><div class="ey">STRATUM PRAXIS · VERIFIED PURCHASE</div><h1>${esc(o.title)}</h1><p class="m">Purchase verified server-side. Your operating assets are available below.</p><div class="top"><button class="primary" id="copyAll">Copy all</button><button id="download">Download TXT</button></div>${cards}<p class="fine">License tier: ${esc(key.replace("cross_", ""))}. Do not redistribute this source kit as a standalone product. Review production permissions, provider terms and high-impact actions before deployment.</p></main><script>const parts=${data},all=parts.join('\n\n');async function cp(t,b){try{await navigator.clipboard.writeText(t);let x=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=x,800)}catch{b.textContent='Copy failed'}}document.querySelectorAll('.copy').forEach(b=>b.onclick=()=>cp(parts[+b.dataset.i],b));copyAll.onclick=()=>cp(all,copyAll);download.onclick=()=>{let a=document.createElement('a'),blob=new Blob([all],{type:'text/plain;charset=utf-8'});a.href=URL.createObjectURL(blob);a.download='${key.startsWith("cross_") ? "Cross-Agent-Operating-Kit-v1.txt" : key === "ops10" ? "AI-Operations-Systems-Pack-v1.txt" : "AI-Workflow-Operator-Bundle-v1.txt"}';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}</script></body></html>`;
}
async function login(req, env, u, cors) {
  const b = await req.json(),
    sid = String(b.session_id || ""),
    email = String(b.email || "")
      .trim()
      .toLowerCase(),
    requested = String(b.offer || "");
  if (!sid.startsWith("cs_") || !email)
    return j(
      { error: "Checkout Session ID and checkout email are required" },
      400,
      cors,
    );
  const s = await session(env, sid);
  let key =
    requested && OFFERS[requested]
      ? requested
      : Object.keys(OFFERS).find((k) => paid(s, OFFERS[k]));
  if (!key || !paid(s, OFFERS[key]))
    return j({ error: "Paid purchase could not be verified" }, 402, cors);
  const pe = String(s.customer_details?.email || s.customer_email || "")
    .trim()
    .toLowerCase();
  if (!pe || pe !== email)
    return j({ error: "Email does not match checkout email" }, 403, cors);
  const o = OFFERS[key];
  await recordSession(env, s, {
    revenue_verified_at: new Date().toISOString(),
    revenue_product: key,
    revenue_amount: s.amount_total,
    revenue_currency: s.currency,
    buyer_record_state: "VERIFIED",
    delivery_state: "AUTHORIZED",
  });
  return j(
    {
      authorized: true,
      workspace_url: `${u.origin}${o.path}?token=${encodeURIComponent(await sign(env.STRIPE_SECRET_KEY, s.id, key))}`,
    },
    200,
    cors,
  );
}
async function workspace(env, u) {
  const p = await verify(env.STRIPE_SECRET_KEY, u.searchParams.get("token"));
  if (!p)
    return new Response("Access token is invalid or expired.", { status: 401 });
  const o = OFFERS[p.offer],
    s = await session(env, p.sid);
  if (!paid(s, o))
    return new Response("Purchase could not be verified.", { status: 402 });
  if (!s.metadata?.delivery_activated_at)
    await recordSession(env, s, {
      delivery_activated_at: new Date().toISOString(),
      delivery_state: "ACTIVATED",
    });
  return new Response(await page(env, o, p.offer), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex,nofollow,noarchive",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}
export { verifyWebhook, isWorkflowAuditPaid, isRevenueRouterPaid };
export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url),
      ours =
        u.pathname.startsWith("/prompt-store/") ||
        u.pathname.startsWith("/cross-agent-kit/") ||
        u.pathname.startsWith("/spend-decision-kit/") ||
        u.pathname.startsWith("/revenue-router/") ||
        u.pathname === "/stripe/webhook";
    if (!ours) return baseWorker.fetch(req, env, ctx);
    const origin = req.headers.get("Origin") || "",
      cors =
        origin === "https://stratumpraxis.com"
          ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
          : {};
    if (req.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
        },
      });
    if (!env.STRIPE_SECRET_KEY)
      return j({ error: "Server is not configured" }, 500, cors);
    try {
      if (req.method === "POST" && u.pathname === "/stripe/webhook")
        return webhook(req, env);
      if (
        req.method === "POST" &&
        [
          "/prompt-store/login",
          "/prompt-store/ops10/login",
          "/cross-agent-kit/login",
          "/spend-decision-kit/login",
          "/revenue-router/login",
        ].includes(u.pathname)
      )
        return login(req, env, u, cors);
      if (
        req.method === "GET" &&
        [
          "/prompt-store/workspace",
          "/prompt-store/ops10/workspace",
          "/cross-agent-kit/workspace",
          "/spend-decision-kit/workspace",
          "/revenue-router/workspace",
        ].includes(u.pathname)
      )
        return workspace(env, u);
      return j({ error: "Not found" }, 404, cors);
    } catch (e) {
      return j({ error: "Purchase verification failed" }, 500, cors);
    }
  },
};
