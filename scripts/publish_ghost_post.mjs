import fs from 'node:fs';
import crypto from 'node:crypto';
import { marked } from 'marked';

const apiUrl = process.env.GHOST_ADMIN_API_URL?.replace(/\/$/, '');
const adminKey = process.env.GHOST_ADMIN_API_KEY;
const sourcePath = process.env.GHOST_SOURCE_PATH || 'content/ghost/ai-is-not-your-bottleneck.md';
const slug = process.env.GHOST_POST_SLUG || 'ai-is-not-your-bottleneck';

if (!apiUrl || !adminKey) {
  throw new Error('Missing GHOST_ADMIN_API_URL or GHOST_ADMIN_API_KEY');
}

const [keyId, keySecret] = adminKey.split(':');
if (!keyId || !keySecret) throw new Error('Invalid Ghost Admin API key format');

const b64url = (value) => Buffer.from(value).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = { alg: 'HS256', typ: 'JWT', kid: keyId };
const payload = { iat: now, exp: now + 300, aud: '/admin/' };
const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
const signature = crypto.createHmac('sha256', Buffer.from(keySecret, 'hex')).update(unsigned).digest('base64url');
const token = `${unsigned}.${signature}`;

const markdown = fs.readFileSync(sourcePath, 'utf8').trim();
const lines = markdown.split('\n');
const title = lines[0].replace(/^#\s+/, '').trim();
const bodyMarkdown = lines.slice(1).join('\n').trim();

const revenueCta = slug === 'ai-is-not-your-bottleneck'
  ? `
    <hr>
    <h2>When the bottleneck is the handoff between AI agents</h2>
    <p>If Codex, Claude, Cursor, or other agents keep losing state between sessions, the problem is no longer raw model capability. It is the operating layer between them: role boundaries, durable handoffs, approval state, verification, and the next action.</p>
    <p><strong>Cross-Agent Operating Kit — $69 one-time</strong></p>
    <p><a href="https://stratumpraxis.com/cross-agent-operating-kit.html?utm_source=ghost&utm_medium=field_note&utm_campaign=cross_agent_continuity_20260908&utm_content=org_throughput_handoff">See the Cross-Agent Operating Kit →</a></p>
  `
  : '';

const html = `${marked.parse(bodyMarkdown)}${revenueCta}`;
const excerpt = 'AI can now produce more work than many organizations can absorb. The next competitive advantage is not generation. It is organizational throughput.';

const headers = {
  Authorization: `Ghost ${token}`,
  'Accept-Version': 'v5.0',
  'Content-Type': 'application/json'
};

const listUrl = new URL(`${apiUrl}/ghost/api/admin/posts/`);
listUrl.searchParams.set('filter', `slug:${slug}`);
listUrl.searchParams.set('limit', '1');

const existingResponse = await fetch(listUrl, { headers });
if (!existingResponse.ok) {
  throw new Error(`Ghost lookup failed: ${existingResponse.status} ${await existingResponse.text()}`);
}
const existingData = await existingResponse.json();
const existing = existingData.posts?.[0];

const post = {
  title,
  slug,
  html,
  custom_excerpt: excerpt,
  status: 'published',
  visibility: 'public'
};

let response;
if (existing) {
  post.updated_at = existing.updated_at;
  response = await fetch(`${apiUrl}/ghost/api/admin/posts/${existing.id}/?source=html`, {
    method: 'PUT', headers, body: JSON.stringify({ posts: [post] })
  });
} else {
  response = await fetch(`${apiUrl}/ghost/api/admin/posts/?source=html`, {
    method: 'POST', headers, body: JSON.stringify({ posts: [post] })
  });
}

if (!response.ok) {
  throw new Error(`Ghost publish failed: ${response.status} ${await response.text()}`);
}

const data = await response.json();
const published = data.posts?.[0];
console.log(`GHOST_PUBLIC_URL=${published?.url || `${apiUrl}/${slug}/`}`);
console.log(`GHOST_POST_ID=${published?.id || ''}`);
console.log(`GHOST_STATUS=${published?.status || 'published'}`);
