import baseWorker from './ai-fit-router-worker.js';

const te = new TextEncoder();
const td = new TextDecoder();

function json(x, status = 200, headers = {}) {
  return new Response(JSON.stringify(x), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
function b64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function unb64(s) {
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
async function stripe(env, path) {
  const r = await fetch('https://api.stripe.com/v1/' + path, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  const x = await r.json();
  if (!r.ok) throw new Error('Stripe verification failed');
  return x;
}
async function getPurchase(env, sid) {
  const s = await stripe(env, `checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price.product`);
  const li = s.line_items?.data || [];
  if (s.payment_status !== 'paid' || s.mode !== 'payment' || !s.payment_link || li.length !== 1 || Number(li[0]?.quantity || 0) !== 1) return null;
  const price = li[0]?.price;
  if (!price || price.type !== 'one_time' || price.active !== true || Number(price.unit_amount || 0) <= 0) return null;
  const product = typeof price.product === 'object' ? price.product : await stripe(env, `products/${price.product}`);
  const slug = String(price.metadata?.slug || '');
  if (price.metadata?.content_type !== 'paid_article' || product.metadata?.content_type !== 'paid_article' || !slug || product.metadata?.slug !== slug) return null;
  if (String(s.currency || '').toLowerCase() !== String(price.currency || '').toLowerCase()) return null;
  if (Number(s.amount_total) !== Number(price.unit_amount)) return null;
  return { session: s, product, price, slug, productId: product.id, title: product.name || 'Paid Insight' };
}
async function sign(secret, purchase, email) {
  const payload = b64(te.encode(JSON.stringify({ sid: purchase.session.id, email, product: purchase.productId, slug: purchase.slug, exp: Date.now() + 3650 * 864e5 })));
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, te.encode('paid-insights-v2|' + payload));
  return payload + '.' + b64(new Uint8Array(sig));
}
async function verify(secret, token) {
  try {
    const [p, s] = String(token || '').split('.');
    if (!p || !s) return null;
    const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, unb64(s), te.encode('paid-insights-v2|' + p))) return null;
    const x = JSON.parse(td.decode(unb64(p)));
    return x.sid && x.email && x.product && x.slug && x.exp > Date.now() ? x : null;
  } catch { return null; }
}
async function articleText(env, product) {
  const n = Number(product.metadata?.content_chunks || 0);
  if (!n || product.metadata?.content_encoding !== 'gzip-base64') throw new Error('Article content is not configured');
  let encoded = '';
  for (let i = 0; i < n; i++) {
    const key = `content_${String(i).padStart(2, '0')}`;
    const part = product.metadata?.[key];
    if (!part) throw new Error(`Missing article content chunk ${key}`);
    encoded += part;
  }
  const compressed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  return td.decode(await new Response(stream).arrayBuffer());
}
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
}
function markdown(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  let out = '', list = null;
  const close = () => { if (list) { out += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const s = raw.trimEnd();
    if (!s.trim()) { close(); continue; }
    let m;
    if ((m = s.match(/^(#{1,4})\s+(.+)/))) { close(); const n = m[1].length; out += `<h${n}>${inline(m[2])}</h${n}>`; continue; }
    if (/^---+$/.test(s.trim())) { close(); out += '<hr>'; continue; }
    if ((m = s.match(/^\s*[-*]\s+(.+)/))) { if (list !== 'ul') { close(); list = 'ul'; out += '<ul>'; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = s.match(/^\s*\d+\.\s+(.+)/))) { if (list !== 'ol') { close(); list = 'ol'; out += '<ol>'; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = s.match(/^>\s?(.+)/))) { close(); out += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
    close(); out += `<p>${inline(s)}</p>`;
  }
  close(); return out;
}
function page(title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${esc(title)} | Paid Edition</title><style>:root{color-scheme:dark;--bg:#090b0e;--panel:#11151a;--line:#2b323a;--text:#edf1f5;--muted:#a9b2bc;--accent:#d7dde5}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:18px/1.76 Georgia,"Times New Roman",serif}.w{max-width:850px;margin:auto;padding:34px 22px 90px}.ey{font:700 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}h1,h2,h3,h4{font-family:Inter,system-ui,sans-serif;line-height:1.15}h1{font-size:clamp(2.35rem,7vw,4.7rem);margin:.35em 0 .5em}h2{font-size:1.8rem;margin-top:2.3em}h3{font-size:1.35rem;margin-top:1.8em}p,li{color:#d9dee4}strong{color:#fff}hr{border:0;border-top:1px solid var(--line);margin:45px 0}blockquote{border-left:3px solid var(--accent);margin:24px 0;padding:4px 0 4px 20px;color:#c9d0d7}code{background:#161b21;border:1px solid var(--line);border-radius:5px;padding:.08em .3em;font-size:.9em}.notice{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:17px 19px;margin-bottom:35px;font:14px/1.6 Inter,system-ui,sans-serif;color:var(--muted)}.notice b{color:var(--text)}.fine{font:12px/1.55 Inter,system-ui,sans-serif;color:#89929d;margin-top:60px}</style></head><body><main class="w"><div class="ey">STRATUM PRAXIS · VERIFIED PURCHASE · PAID INSIGHTS</div><div class="notice"><b>Purchase verified.</b> This private reading page is generated only after Stripe purchase verification. Keep your access link private.</div>${markdown(content)}<p class="fine">Stratum Praxis · Premium research for practical AI systems. Buyer access may not be redistributed.</p></main></body></html>`;
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith('/paid-insights/')) return baseWorker.fetch(req, env, ctx);
    const origin = req.headers.get('Origin') || '';
    const allowed = new Set(['https://stratumpraxis.com', 'https://stratumpraxis.github.io']);
    const cors = allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' } });
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Server is not configured' }, 500, cors);
    try {
      if (req.method === 'POST' && u.pathname === '/paid-insights/login') {
        const body = await req.json();
        const sid = String(body.session_id || '');
        const email = String(body.email || '').trim().toLowerCase();
        if (!sid.startsWith('cs_') || !email) return json({ error: 'Checkout session and purchase email are required.' }, 400, cors);
        const purchase = await getPurchase(env, sid);
        if (!purchase) return json({ error: 'A paid Paid Insights purchase could not be verified.' }, 402, cors);
        const purchaseEmail = String(purchase.session.customer_details?.email || purchase.session.customer_email || '').trim().toLowerCase();
        if (!purchaseEmail || purchaseEmail !== email) return json({ error: 'The email does not match the purchase.' }, 403, cors);
        const token = await sign(env.STRIPE_SECRET_KEY, purchase, email);
        return json({ authorized: true, workspace_url: `${u.origin}/paid-insights/workspace?token=${encodeURIComponent(token)}` }, 200, cors);
      }
      if (req.method === 'GET' && u.pathname === '/paid-insights/workspace') {
        const payload = await verify(env.STRIPE_SECRET_KEY, u.searchParams.get('token'));
        if (!payload) return new Response('Access token is invalid or expired.', { status: 401 });
        const purchase = await getPurchase(env, payload.sid);
        if (!purchase || purchase.productId !== payload.product || purchase.slug !== payload.slug) return new Response('Purchase could not be verified.', { status: 402 });
        const purchaseEmail = String(purchase.session.customer_details?.email || purchase.session.customer_email || '').trim().toLowerCase();
        if (!purchaseEmail || purchaseEmail !== payload.email) return new Response('Purchase identity could not be verified.', { status: 403 });
        const content = await articleText(env, purchase.product);
        return new Response(page(purchase.title, content), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex,nofollow,noarchive', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" } });
      }
      return json({ error: 'Not found' }, 404, cors);
    } catch { return json({ error: 'Purchase verification or content delivery failed.' }, 500, cors); }
  }
};