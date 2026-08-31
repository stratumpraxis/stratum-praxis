import fs from 'node:fs/promises';

const API='https://api.buffer.com';
const key=process.env.BUFFER_API_KEY;
const outFile=process.env.BUFFER_CHANNEL_AUDIT_OUTPUT || 'distribution/buffer-channel-audit-result.json';
if(!key) throw new Error('Missing BUFFER_API_KEY');
async function gql(query){
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query})});
  const j=await r.json(); if(!r.ok||j.errors) throw new Error(JSON.stringify(j.errors||j)); return j.data;
}
const a=await gql('query { account { organizations { id name } } }');
const result={checkedAt:new Date().toISOString(),organizations:[]};
for(const org of a.account?.organizations||[]){
  const d=await gql(`query { channels(input:{organizationId:${JSON.stringify(org.id)}}){id name displayName service isLocked isDisconnected isQueuePaused} }`);
  const channels=(d.channels||[]).map(c=>({id:c.id,name:c.name,displayName:c.displayName,service:c.service,isLocked:c.isLocked,isDisconnected:c.isDisconnected,isQueuePaused:c.isQueuePaused}));
  result.organizations.push({id:org.id,name:org.name,channels});
  for(const c of channels) console.log(JSON.stringify(c));
}
await fs.writeFile(outFile,JSON.stringify(result,null,2)+'\n','utf8');
