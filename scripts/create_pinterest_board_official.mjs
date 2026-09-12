#!/usr/bin/env node
import fs from 'node:fs';

const token=(process.env.PINTEREST_ACCESS_TOKEN||'').trim();
const expected=(process.env.PINTEREST_EXPECTED_USERNAME||'stratumpraxis').trim().toLowerCase();
const fail=(m)=>{console.error(`FAIL_CLOSED: ${m}`);process.exit(1)};
if(!token) fail('PINTEREST_ACCESS_TOKEN missing');
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};

const acctResp=await fetch('https://api.pinterest.com/v5/user_account',{headers});
if(!acctResp.ok) fail(`user_account failed ${acctResp.status}: ${(await acctResp.text()).slice(0,400)}`);
const acct=await acctResp.json();
if(String(acct.username||'').toLowerCase()!==expected) fail(`ACCOUNT_CHECK failed: ${acct.username||'unknown'}`);

const name='Stratum Praxis | AI ROI & Automation';
const listResp=await fetch('https://api.pinterest.com/v5/boards?page_size=100',{headers});
if(!listResp.ok) fail(`boards list failed ${listResp.status}: ${(await listResp.text()).slice(0,400)}`);
const existing=await listResp.json();
let board=(existing.items||[]).find(b=>b.name===name);
let created=false;
if(!board){
  const resp=await fetch('https://api.pinterest.com/v5/boards',{method:'POST',headers,body:JSON.stringify({name,description:'Practical AI automation, ROI, workflow economics, agent controls, and decision tools from Stratum Praxis.'})});
  if(!resp.ok) fail(`board create failed ${resp.status}: ${(await resp.text()).slice(0,500)}`);
  board=await resp.json();
  created=true;
}
const evidence={brand:'Stratum',platform:'pinterest',account_handle:acct.username,account_verified:true,board_id:board.id,board_name:board.name,board_privacy:board.privacy||null,created,checked_at:new Date().toISOString()};
fs.mkdirSync('publishing/evidence',{recursive:true});
fs.writeFileSync('publishing/evidence/stratum-pinterest-board.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
