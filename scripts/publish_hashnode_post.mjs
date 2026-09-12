import fs from 'node:fs';
import path from 'node:path';

const token = process.env.HASHNODE_PAT;
const publicationId = process.env.HASHNODE_PUBLICATION_ID;
const sourcePath = process.env.PUBLISH_SOURCE_PATH;
if (!token) throw new Error('Missing HASHNODE_PAT');
if (!publicationId) throw new Error('Missing HASHNODE_PUBLICATION_ID');
if (!sourcePath) throw new Error('Missing PUBLISH_SOURCE_PATH');

const raw = fs.readFileSync(sourcePath, 'utf8').trim();
const lines = raw.split('\n');
const titleLine = lines.findIndex(l => /^#\s+/.test(l));
if (titleLine < 0) throw new Error(`No H1 title found in ${sourcePath}`);
const title = lines[titleLine].replace(/^#\s+/, '').trim();
const contentMarkdown = lines.slice(titleLine + 1).join('\n').trim();
const slug = path.basename(sourcePath, '.md');
const canonicalBase = process.env.CANONICAL_BASE_URL?.replace(/\/$/, '');
const originalArticleURL = canonicalBase ? `${canonicalBase}/${slug}/` : undefined;

const mutation = `
mutation PublishPost($input: PublishPostInput!) {
  publishPost(input: $input) {
    post { id slug url }
  }
}`;

const input = {
  publicationId,
  title,
  slug,
  contentMarkdown,
  ...(originalArticleURL ? { originalArticleURL } : {})
};

const r = await fetch('https://gql.hashnode.com/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token
  },
  body: JSON.stringify({ query: mutation, variables: { input } })
});
const data = await r.json();
if (!r.ok || data.errors) throw new Error(`Hashnode publish failed: ${r.status} ${JSON.stringify(data.errors || data)}`);
const post = data.data?.publishPost?.post;
if (!post?.url) throw new Error(`Hashnode publish returned no URL: ${JSON.stringify(data)}`);
console.log(`HASHNODE_PUBLIC_URL=${post.url}`);
console.log(`HASHNODE_POST_ID=${post.id || ''}`);
console.log(`HASHNODE_STATUS=published`);
