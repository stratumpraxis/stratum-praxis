#!/usr/bin/env node
import fs from 'node:fs';

const token = (process.env.PINTEREST_ACCESS_TOKEN || '').trim();
const expected = (process.env.PINTEREST_EXPECTED_USERNAME || 'stratumpraxis').trim().toLowerCase();
const fail = (m) => { console.error(`FAIL_CLOSED: ${m}`); process.exit(1); };
if (!token) fail('PINTEREST_ACCESS_TOKEN missing');

const headers = {Authorization:`Bearer ${token}`, 'Content-Type':'application/json'};
const accountResp = await fetch('https://api.pinterest.com/v5/user_account', {headers});
if (!accountResp.ok) fail(`user_account failed ${accountResp.status}: ${(await accountResp.text()).slice(0,400)}`);
const account = await accountResp.json();
const username = String(account.username || '').trim();
if (!username) fail('ACCOUNT_CHECK: username missing from Pinterest response');
if (username.toLowerCase() !== expected) fail(`ACCOUNT_CHECK: authenticated Pinterest user ${username} != ${expected}`);

const boardsResp = await fetch('https://api.pinterest.com/v5/boards?page_size=100', {headers});
if (!boardsResp.ok) fail(`boards list failed ${boardsResp.status}: ${(await boardsResp.text()).slice(0,400)}`);
const boards = await boardsResp.json();

const evidence = {
  brand:'Stratum',
  platform:'pinterest',
  account_handle:username,
  account_verified:true,
  account_id:account.id || null,
  account_type:account.account_type || null,
  website_url:account.website_url || null,
  board_count:Array.isArray(boards.items) ? boards.items.length : 0,
  boards:(boards.items || []).map(b => ({id:b.id,name:b.name,privacy:b.privacy,owner:b.owner?.username || null})),
  checked_at:new Date().toISOString()
};
fs.mkdirSync('publishing/evidence',{recursive:true});
fs.writeFileSync('publishing/evidence/stratum-pinterest-account.json', JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
