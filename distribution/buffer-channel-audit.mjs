const API='https://api.buffer.com';
const key=process.env.BUFFER_API_KEY;
if(!key) throw new Error('Missing BUFFER_API_KEY');
async function gql(query){
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query})});
  const j=await r.json(); if(!r.ok||j.errors) throw new Error(JSON.stringify(j.errors||j)); return j.data;
}
const a=await gql('query { account { organizations { id } } }');
for(const org of a.account?.organizations||[]){
  const d=await gql(`query { channels(input:{organizationId:${JSON.stringify(org.id)}}){id name displayName service isLocked isDisconnected isQueuePaused} }`);
  for(const c of d.channels||[]) console.log(JSON.stringify(c));
}
