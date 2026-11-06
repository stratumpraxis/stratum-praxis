import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const publisher = await readFile(new URL('./buffer-publisher.mjs', import.meta.url), 'utf8');
const item = { id:'approved-1', active:true, services:['tiktok'], text:'Reviewed example.', url:'https://stratumpraxis.com/', imageUrl:'https://stratumpraxis.com/media/stratum-roi-social.png' };

async function run(queue, responses = [], overrides = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'stratum-buffer-'));
  try {
    await writeFile(path.join(dir, 'publisher.mjs'), publisher);
    await writeFile(path.join(dir, 'queue.json'), JSON.stringify(queue));
    await writeFile(path.join(dir, 'responses.json'), JSON.stringify(responses));
    await writeFile(path.join(dir, 'mock.mjs'), `
      import fs from 'node:fs';
      const responses = JSON.parse(fs.readFileSync(new URL('./responses.json', import.meta.url)));
      globalThis.fetch = async (_url, options) => {
        fs.appendFileSync(new URL('./requests.jsonl', import.meta.url), options.body + '\\n');
        const next = responses.shift();
        if (!next) throw new Error('Unexpected API request');
        return new Response(JSON.stringify(next.body), {status:next.status || 200});
      };
    `);
    const env = { ...process.env, BUFFER_API_KEY:'test-only', BUFFER_QUEUE_FILE:'queue.json', BUFFER_TARGET_SERVICES:'tiktok', BUFFER_POST_MODE:'addToQueue', REQUIRE_ELIGIBLE_CHANNELS:'1', REQUIRE_CHANNEL_NAME_CONTAINS:'stratum', DRY_RUN:'0', GITHUB_OUTPUT:path.join(dir, 'output'), ...overrides };
    const result = spawnSync(process.execPath, ['--import', path.join(dir, 'mock.mjs'), path.join(dir, 'publisher.mjs')], {env, encoding:'utf8', timeout:15000});
    const requests = await readFile(path.join(dir, 'requests.jsonl'), 'utf8').catch(()=> '');
    const output = await readFile(path.join(dir, 'output'), 'utf8').catch(()=> '');
    return { ...result, requests:requests.trim().split('\n').filter(Boolean).map(JSON.parse), output };
  } finally { await rm(dir, {recursive:true, force:true}); }
}
const account = {body:{data:{account:{organizations:[{id:'owned'}]}}}};
const channels = {body:{data:{channels:[{id:'channel',name:'stratumpraxis',service:'tiktok',isQueuePaused:false}]}}};

test('empty queue waits without reading credentials or calling provider', async()=>{
  const r = await run([], [], {BUFFER_API_KEY:''});
  assert.equal(r.status,0); assert.equal(r.requests.length,0); assert.match(r.output,/delivery_status=WAIT_CONTENT/);
});
test('wrong platform and missing TikTok media stop before provider calls', async()=>{
  for (const q of [[{...item,services:['bluesky']}],[{...item,imageUrl:undefined}]]) {
    const r=await run(q); assert.equal(r.status,1); assert.equal(r.requests.length,0); assert.match(r.stderr,/WAIT_PLATFORM_FIT/);
  }
});
test('GraphQL authentication error fails after one request', async()=>{
  const r=await run([item],[{body:{errors:[{message:'Access token is not valid',extensions:{code:'UNAUTHENTICATED'}}]}}]);
  assert.equal(r.status,1); assert.equal(r.requests.length,1); assert.doesNotMatch(r.stderr,/BUFFER_READ_RETRY/);
});
test('transient reads retry at most three times', async()=>{
  const r=await run([item],Array(3).fill({status:503,body:{error:'unavailable'}}));
  assert.equal(r.status,1); assert.equal(r.requests.length,3);
});
test('mutation failure is never retried', async()=>{
  const r=await run([item],[account,channels,{status:503,body:{error:'unavailable'}}]);
  assert.equal(r.status,1); assert.equal(r.requests.length,3); assert.equal(r.requests.filter(x=>x.query.startsWith('mutation')).length,1);
});
test('accepted queue item reports QUEUED, never verified publication', async()=>{
  const r=await run([item],[account,channels,{body:{data:{createPost:{post:{id:'post-1',status:'scheduled'}}}}}]);
  assert.equal(r.status,0); assert.match(r.output,/delivery_status=QUEUED/); assert.match(r.output,/post_ids=post-1/); assert.match(r.stdout,/"published_verified":false/);
});
test('dry run cannot create a post', async()=>{
  const r=await run([item],[account,channels],{DRY_RUN:'1'});
  assert.equal(r.status,0); assert.equal(r.requests.length,2); assert.match(r.output,/delivery_status=DRY_RUN/);
});
test('unrelated brand channel cannot receive a post', async()=>{
  const r=await run([item],[account,{body:{data:{channels:[{id:'other',name:'forwelle',service:'tiktok',isQueuePaused:false}]}}}]);
  assert.equal(r.status,1); assert.equal(r.requests.length,2); assert.match(r.stderr,/No eligible verified Stratum channels/);
});
