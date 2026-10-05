const API='https://fzqgpaxqolrjjhmxdcrf.supabase.co/functions/v1/direct-revenue-os';

const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const storedKey=()=>localStorage.getItem('monitor_key')||localStorage.getItem('direct_revenue_os_key')||'';
const setMessage=s=>{$('msg').textContent=s};

function textOf(x){
  if(!x) return '';
  return ['status','action','state','next_action','title','revenue_name','source','to_unit','unit_id','note','reason']
    .map(k=>x[k]||'').join(' ');
}
function isCodeOps(x){
  const s=textOf(x).toLowerCase();
  return /codeops|github|rtc|bounty|reward|rustchain/.test(s);
}
function plainStatus(status){
  const s=String(status||'').toUpperCase();
  if(/PAID_CONFIRMED|PAYMENT_CONFIRMED|PAYOUT_CONFIRMED/.test(s)) return 'PAID';
  if(/PAYOUT_PENDING/.test(s)) return 'PAYOUT';
  if(/ACCEPTED/.test(s)) return 'ACCEPTED';
  if(/SUBMITTED/.test(s)) return 'SUBMITTED';
  if(/WORK_READY|READY/.test(s)) return 'WORK READY';
  if(/HUMAN_GATE|WAITING_HUMAN/.test(s)) return 'HUMAN GATE';
  if(/BLOCK|FAIL/.test(s)) return 'BLOCKED';
  if(/WAIT/.test(s)) return 'WAIT';
  return String(status||'CHECK').replaceAll('_',' ');
}
function cls(status){
  const s=String(status||'').toUpperCase();
  if(/PAID|CONFIRMED|DONE|ACTIVE/.test(s)) return 'ok';
  if(/PENDING|WAIT|READY|SUBMITTED|ACCEPTED/.test(s)) return 'wait';
  if(/BLOCK|FAIL|ERROR/.test(s)) return 'bad';
  return 'info';
}
function plainRoute(x){
  const id=String((x&&x.unit_id)||(x&&x.to_unit)||'');
  if(id==='codeops') return 'CodeOps';
  return (x&&x.label)||id||'CodeOps';
}
function plainName(name){
  return String(name||'GitHub収益案件')
    .replace(/CodeOps/ig,'CodeOps')
    .replace(/PAYOUT_PENDING/ig,'入金待ち')
    .replace(/PAYMENT_PENDING/ig,'支払い反映待ち')
    .replace(/adjudication wait/ig,'判定待ち');
}
function humanGateSummary(d){
  const all=[d&&d.selected,...(d&&d.closest_to_cash||[]),...(d&&d.market_candidates||[]),...(d&&d.latest_dispatches||[])].filter(Boolean).filter(isCodeOps);
  const s=all.map(textOf).join(' ');
  if(/WAITING_HUMAN_FORK|FORK_REQUIRED|CREATE[^\n]*FORK/i.test(s)) return {needed:true,title:'Forkが必要',meta:'対象Repoを1回ForkするとCodeOpsが続行できます。'};
  if(/PAYOUT_DESTINATION|PAYMENT_DESTINATION|WALLET[^\n]*(REQUIRED|NEEDED)/i.test(s)) return {needed:true,title:'送金先確認',meta:'支払い先の確認だけがHuman Gateです。'};
  if(/HUMAN_GATE|WAITING_HUMAN|APPROVAL_REQUIRED|KYC_REQUIRED|LOGIN_REQUIRED/i.test(s)) return {needed:true,title:'操作が必要',meta:'外部送信・認証など、権限が必要な操作があります。'};
  return {needed:false,title:'操作不要',meta:'今はCodeOps側または外部側が進行します。重複Claim・追送はしません。'};
}
function externalSummary(d){
  const list=[...(d&&d.closest_to_cash||[]),d&&d.selected].filter(Boolean).filter(isCodeOps);
  const x=list.find(v=>/PAYOUT_PENDING|PAYMENT_PENDING|EXTERNAL_WAIT|SUBMITTED|ACCEPTED|WAIT/i.test(textOf(v)));
  if(!x) return {title:'新規案件を探索中',meta:'24H RuntimeがGitHub案件を探索・資格判定します。'};
  return {
    title:(x.amount?x.amount+' / ':'')+plainStatus(x.status),
    meta:plainName(x.revenue_name||x.title||'')+' → '+plainRoute(x.route||x)
  };
}
function row(x){
  const name=plainName(x.revenue_name||x.title||'GitHub収益案件');
  const amount=x.amount||'金額未確認';
  return '<div class="row"><div class="rowtop"><div><span class="status '+cls(x.status)+'">'+esc(plainStatus(x.status))+'</span><div class="amount">'+esc(amount)+'</div></div><div class="tiny">'+esc(plainRoute(x.route||x))+'</div></div><b>'+esc(name)+'</b><div class="tiny">'+esc(x.source||'GitHub')+' ｜ '+esc(String(x.action||'').replaceAll('_',' '))+'</div><details class="tiny"><summary>Evidence</summary><pre>'+esc(JSON.stringify({status:x.status,source:x.source,action:x.action,route:x.route},null,2))+'</pre></details></div>';
}
function setPipeline(d){
  ['stDiscover','stQualify','stWork','stSubmit','stAccept','stPaid'].forEach(id=>$(id).classList.remove('active','warn'));
  $('stDiscover').classList.add('active');
  $('stQualify').classList.add('active');
  const s=[d&&d.selected,...(d&&d.closest_to_cash||[]),...(d&&d.market_candidates||[]),...(d&&d.latest_dispatches||[])].filter(Boolean).filter(isCodeOps).map(textOf).join(' ').toUpperCase();
  if(/WORK_READY|READY/.test(s)) $('stWork').classList.add('active');
  if(/SUBMITTED/.test(s)) $('stSubmit').classList.add('active');
  if(/ACCEPTED/.test(s)) $('stAccept').classList.add('active');
  if(/PAID_CONFIRMED|PAYMENT_CONFIRMED|PAYOUT_CONFIRMED/.test(s)) $('stPaid').classList.add('active');
  if(/PAYOUT_PENDING/.test(s)) $('stPaid').classList.add('warn');
}
function bestCodeOps(d){
  const list=[...(d&&d.closest_to_cash||[]),d&&d.selected].filter(Boolean).filter(isCodeOps);
  return list[0]||null;
}
async function api(path,opt={}){
  const key=$('key').value.trim()||storedKey();
  if(!key) throw new Error('接続キーを入力してください');
  const headers=Object.assign({Authorization:'Bearer '+key,'Content-Type':'application/json'},opt.headers||{});
  const r=await fetch(API+path,Object.assign({},opt,{headers}));
  const x=await r.json();
  if(!r.ok) throw new Error(x.error||('HTTP '+r.status));
  return x;
}
async function load(){
  try{
    setMessage('CodeOpsの最新Revenue Evidenceを確認しています…');
    const d=await api('/api/snapshot');
    const closest=(d.closest_to_cash||[]).filter(isCodeOps);
    const market=(d.market_candidates||[]).filter(isCodeOps);
    const dispatch=(d.latest_dispatches||[]).filter(isCodeOps);
    const repeat=(d.repeat_winning_routes||[]).filter(isCodeOps);
    const best=bestCodeOps(d);
    const gate=humanGateSummary(d);
    const ext=externalSummary(d);

    $('engine').textContent='LIVE';
    $('engine').className='kvalue ok';
    $('engineSub').textContent='CodeOps専用GitHub / 24H';
    $('liveBadge').innerHTML='<span class="dot"></span><span>CODEOPS LIVE</span>';
    $('closestCount').textContent=String(closest.length);
    $('marketCount').textContent=String(market.length);
    $('gateCount').textContent=gate.needed?'1':'0';
    $('gateCount').className='kvalue '+(gate.needed?'wait':'ok');
    $('gateSub').textContent=gate.needed?'Human Gateあり':'操作不要';
    $('moneyState').textContent=best?plainStatus(best.status):'SCAN';
    $('moneyState').className='kvalue '+(best?cls(best.status):'info');
    $('moneySub').textContent=best?(best.amount||'金額確認中'):'新規現金案件探索';

    $('humanCard').className='card action '+(gate.needed?'human':'');
    $('humanAction').textContent=gate.title;
    $('humanActionMeta').textContent=gate.meta;
    $('externalWait').textContent=ext.title;
    $('externalWaitMeta').textContent=ext.meta;

    $('selected').textContent=best?((best.amount||'金額未確認')+' / '+plainStatus(best.status)):'現在の最上位は探索・資格判定';
    $('selectedMeta').textContent=best?plainName(best.revenue_name||best.title||''):'クリーンな現金案件が出るまで基準を下げず探索します。';
    $('state').textContent=(d.canonical_state&&d.canonical_state.state)?String(d.canonical_state.state).replaceAll('_',' '):'CODEOPS';
    $('next').textContent=(d.canonical_state&&d.canonical_state.next_action)?String(d.canonical_state.next_action).replaceAll('_',' '):'DISCOVER → QUALIFY → WORK READY';

    $('items').innerHTML=closest.map(row).join('')||'<div class="empty">現在、CodeOpsで入金直前の案件はありません。</div>';
    $('market').innerHTML=market.map(row).join('')||'<div class="empty">現在、条件を満たす新規GitHub報酬候補はありません。</div>';

    const src=(d.source_registry||[]).filter(x=>/GITHUB|PAYOUT|REVENUE/i.test(String(x.key||x.label||'')));
    $('sources').innerHTML=src.map(x=>'<span class="pill">'+esc(x.label||x.key)+' '+esc(x.observed_count??x.count??0)+'件</span>').join('')||'<span class="pill">GitHub Direct Evidence</span>';

    $('dispatch').innerHTML=dispatch.map(x=>'<div class="row"><div class="rowtop"><span class="status '+cls(x.status)+'">'+esc(plainStatus(x.status))+'</span><b>CodeOps</b></div><div class="tiny">'+esc(plainName(x.title||''))+'</div></div>').join('')||'<div class="empty">最新のCodeOps Routing Evidenceはありません。</div>';
    $('repeat').innerHTML=repeat.map(x=>'<div class="row"><b>'+esc(x.source||'GitHub')+' → CodeOps</b><div class="tiny">PAID確認回数: '+esc(x.count||0)+'</div></div>').join('')||'<div class="empty">繰り返し可能と判定できるPAIDルートはまだありません。</div>';

    setPipeline(d);
    const generated=d.generated_at?new Date(d.generated_at):new Date();
    setMessage('最新状態 '+generated.toLocaleString('ja-JP'));
  }catch(e){
    $('engine').textContent='CHECK';
    $('engine').className='kvalue wait';
    $('liveBadge').innerHTML='<span class="dot"></span><span>CONNECTION CHECK</span>';
    setMessage('読込エラー: '+(e&&e.message?e.message:String(e)));
  }
}
function connect(){
  const key=$('key').value.trim();
  if(!key){setMessage('接続キーを入力してください');return}
  localStorage.setItem('monitor_key',key);
  localStorage.setItem('direct_revenue_os_key',key);
  load();
}
async function runNow(){
  try{
    setMessage('Revenue状態を再確認しています…');
    await api('/api/run',{method:'POST',body:'{}'});
    await load();
  }catch(e){setMessage('実行エラー: '+(e&&e.message?e.message:String(e)))}
}
document.addEventListener('DOMContentLoaded',()=>{
  $('key').value=storedKey();
  $('connectBtn').addEventListener('click',connect);
  $('runBtn').addEventListener('click',runNow);
  if($('key').value) load();
  else setMessage('接続キーを入力するとCodeOpsのRevenue Evidenceを表示します。');
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&$('key').value) load()});
});