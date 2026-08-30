import assert from 'node:assert/strict';
import worker from '../worker/ai-consultant-worker.js';

const invalid = await worker.fetch(new Request('https://worker.example/agent-control-auditor/login',{method:'POST',headers:{Origin:'https://stratumpraxis.com','Content-Type':'application/json'},body:JSON.stringify({session_id:'invalid',email:'qa@example.com'})}),{STRIPE_SECRET_KEY:'test'});
assert.equal(invalid.status,400);
const unpaid = await worker.fetch(new Request('https://worker.example/agent-control-auditor/status'),{STRIPE_SECRET_KEY:'test'});
assert.equal(unpaid.status,401);

const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>new Response(JSON.stringify({id:'cs_paid_test',payment_status:'paid',mode:'payment',amount_total:2900,currency:'usd',payment_link:'plink_1U9xUXJMK7zFs9972gxwlWuN',customer_details:{email:'buyer@example.com'},line_items:{data:[{quantity:1,price:{id:'price_1U9xU8JMK7zFs997YNmhqYRe',product:'prod_VAI4WrfYir3Fxg'}}]}}),{status:200,headers:{'Content-Type':'application/json'}});
const paid = await worker.fetch(new Request('https://worker.example/agent-control-auditor/login',{method:'POST',headers:{Origin:'https://stratumpraxis.com','Content-Type':'application/json'},body:JSON.stringify({session_id:'cs_paid_test',email:'buyer@example.com'})}),{STRIPE_SECRET_KEY:'test'});
assert.equal(paid.status,200);const body=await paid.json();assert.equal(body.authorized,true);assert.match(body.access_url,/pro_token=/);
globalThis.fetch=originalFetch;
console.log('Agent Control Auditor Worker: unpaid and paid entitlement guards passed');
