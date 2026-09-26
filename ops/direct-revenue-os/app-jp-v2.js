const API='https://fzqgpaxqolrjjhmxdcrf.supabase.co/functions/v1/direct-revenue-os';

function $(id){return document.getElementById(id)}
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(m){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  })
}
function storedKey(){
  return localStorage.getItem('monitor_key')||localStorage.getItem('direct_revenue_os_key')||''
}
function setMessage(s){$('msg').textContent=s}
function plainStatus(status){
  const s=String(status||'').toUpperCase()
  if(s==='PAYOUT_PENDING') return '入金待ち'
  if(s==='PAYMENT_PENDING') return '支払い反映待ち'
  if(s==='PAYOUT_READY'||s==='BALANCE_AVAILABLE'||s==='CLAIMABLE_REVENUE') return '受け取り可能'
  if(s==='ACCEPTED_NOT_PAID') return '採用済み・まだ未入金'
  if(s==='PAYMENT_CONFIRMED'||s==='PAYOUT_CONFIRMED') return '入金確認済み'
  if(s==='REWARD_CONFIRMED') return '報酬確定'
  if(s==='MARKET_DIRECT_REWARD') return '新しい報酬候補'
  if(s==='TASK_PAYOUT_ROUTE') return '受け取り状況を確認中'
  if(/DONE/.test(s)) return '確認完了'
  if(/BLOCK/.test(s)) return '止まっている'
  if(/READY/.test(s)) return '確認待ち'
  return String(status||'確認中').replaceAll('_',' ')
}
function plainAction(action){
  const s=String(action||'')
  if(s==='DIRECT_READBACK_ONLY') return '入金されたか確認だけする'
  if(s==='CLAIM_OR_PAYOUT_PREP') return '受け取り手続きを準備する'
  if(s==='QUALIFY_BEFORE_CLAIM') return '条件を確認してから参加する'
  if(s==='HOLD_CONFIRMED_EVIDENCE') return '入金済みとして記録'
  if(s==='DIRECT_READBACK_OR_ROUTE_MATCH') return '今の状態を確認する'
  return s.replaceAll('_',' ')
}
function plainSource(source){
  const s=String(source||'')
  if(s==='Gmail') return 'メール'
  if(s==='GitHub') return 'GitHub報酬'
  if(s==='Direct shared evidence'||s==='Revenue Evidence') return '既存の収益記録'
  if(s==='Stripe') return 'Stripe'
  if(s==='Marketplace') return '販売サイト'
  if(s==='Affiliate / Referral') return 'アフィリエイト・紹介報酬'
  if(s==='Creator / Platform') return '動画・投稿プラットフォーム'
  if(s==='Refund / Credit') return '返金・クレジット'
  return s
}
function plainRoute(route){
  const id=String((route&&route.unit_id)||'')
  if(id==='codeops') return 'GitHubぽちぽち担当'
  if(id==='autonomy-core') return '全体リーダー'
  return (route&&route.label)||id||'担当確認中'
}
function plainName(name){
  let s=String(name||'収益候補')
  s=s.replace(/(\d+(?:\.\d+)?)\s*RTC\s*batch\s*\|\s*(\d+(?:\.\d+)?)\s*RTC\s*now sent\s*\/\s*pending IDs?\s*([0-9-]+)/i,
    function(_,total,pending,ids){return total+' RTC分のうち、'+pending+' RTCは送金処理中（ID '+ids+'）'})
  s=s.replace(/#(\d+)\s*wallet-CLI keystore\s*\|\s*(\d+(?:\.\d+)?)\s*RTC\s*pending ID\s*(\d+)/i,
    function(_,issue,amount,id){return '#'+issue+' の '+amount+' RTC：送金処理中（ID '+id+'）'})
  s=s.replace(/payout pending/ig,'入金待ち')
  s=s.replace(/payment pending/ig,'支払い反映待ち')
  s=s.replace(/pending IDs?/ig,'処理中ID')
  s=s.replace(/now sent/ig,'送金処理中')
  s=s.replace(/batch/ig,'まとめ分')
  s=s.replace(/Direct Revenue/ig,'収益回収')
  s=s.replace(/CodeOps/ig,'GitHubぽちぽち担当')
  return s
}
function plainState(state){
  const s=String(state||'')
  if(/PAYOUT_PENDING.*CODEOPS|PAYOUT_PENDING__DIRECT_READBACK_VERIFIED__CODEOPS/i.test(s)) return 'GitHub報酬の入金待ち'
  if(/PAYMENT_PENDING/i.test(s)) return '支払いの反映待ち'
  if(/NO_VERIFIED_DIRECT_REVENUE_CANDIDATE/i.test(s)) return '今すぐ回収する候補なし'
  if(/DISPATCHED/i.test(s)) return '担当へ回して確認中'
  if(/ACTIVE/i.test(s)) return '自動確認中'
  return s.replaceAll('_',' ')
}
function plainNext(state,next){
  const s=String(state||'')+' '+String(next||'')
  if(/28 RTC|PAYOUT_PENDING|Payout Pending/i.test(s)){
    return '今は待つだけ。送金が実際に反映されたかを自動で確認します。追撃や再申請はしません。別の12 RTCは判定待ちとして分けて保持しています。'
  }
  if(/NO_VERIFIED_DIRECT_REVENUE_CANDIDATE/i.test(s)) return '新しい報酬や受け取れる残高が見つかるまで自動で探します。'
  return String(next||'自動で次の確認を続けます。')
    .replaceAll('Payout','入金')
    .replaceAll('Evidence','証拠')
    .replaceAll('Direct Readback','状態確認')
    .replaceAll('CodeOps','GitHubぽちぽち担当')
    .replaceAll('adjudication wait','判定待ち')
}
function classFor(status){
  const s=String(status||'')
  if(/CONFIRMED|DONE|ACTIVE/i.test(s)) return 'ok'
  if(/PENDING|WAIT|READY/i.test(s)) return 'wait'
  if(/BLOCK|FAIL/i.test(s)) return 'bad'
  return 'info'
}
function item(x){
  const name=x.revenue_name||x.title||'収益候補'
  const amount=x.amount||'金額未確認'
  return '<div class="row">'+
    '<span class="status '+classFor(x.status)+'">'+esc(plainStatus(x.status))+'</span> '+
    '<b>'+esc(amount)+'</b><br>'+
    '<b>'+esc(name)+'</b>'+
    '<div class="tiny">'+esc(plainSource(x.source))+' → '+esc(plainRoute(x.route))+' ｜ '+esc(plainAction(x.action))+'</div>'+
    '<details class="tiny"><summary>技術詳細</summary><pre>'+esc(JSON.stringify({status:x.status,source:x.source,route:x.route,action:x.action},null,2))+'</pre></details>'+
    '</div>'
}
async function api(path,opt){
  const options=opt||{}
  const key=$('key').value.trim()||storedKey()
  if(!key) throw new Error('接続キーを入力してください')
  const headers=Object.assign({
    Authorization:'Bearer '+key,
    'Content-Type':'application/json'
  },options.headers||{})
  const r=await fetch(API+path,Object.assign({},options,{headers:headers}))
  const x=await r.json()
  if(!r.ok) throw new Error(x.error||('HTTP '+r.status))
  return x
}
async function load(){
  try{
    setMessage('最新のお金の状態を確認しています…')
    const d=await api('/api/snapshot')
    const s=d.selected
    $('selected').textContent=s?((s.amount||'金額未確認')+'・'+plainStatus(s.status)):'今すぐ回収する候補なし'
    $('selectedMeta').textContent=s?(plainName(s.revenue_name||s.title||'')+' → '+plainRoute(s.route)):'新しい報酬候補を自動で探します'
    $('state').textContent=plainState(d.canonical_state&&d.canonical_state.state)
    $('next').textContent=plainNext(d.canonical_state&&d.canonical_state.state,d.canonical_state&&d.canonical_state.next_action)

    const sourceNames={
      GMAIL_REVENUE:'メールの報酬・入金情報',
      GITHUB_REWARD:'GitHub報酬',
      REVENUE_LEDGER:'収益記録',
      DIB_HISTORY:'過去の収益履歴',
      STRIPE_REVENUE:'Stripe入金',
      PAYHIP_MARKETPLACE:'販売サイトの入金',
      AFFILIATE_REFERRAL:'アフィリエイト・紹介報酬',
      CREATOR_PLATFORM:'動画・投稿プラットフォーム報酬',
      PENDING_PAYOUT:'入金待ち・受け取り可能残高',
      REFUND_CREDIT:'返金・クレジット',
      OTHER_VERIFIED:'その他の確認済み収益'
    }
    $('sources').innerHTML=(d.source_registry||[]).map(function(x){
      const label=sourceNames[x.key]||x.label||x.source||x.key
      const count=x.observed_count==null?(x.count==null?0:x.count):x.observed_count
      return '<span class="pill">'+esc(label)+' '+esc(count)+'件</span>'
    }).join('')||'<div class="tiny">まだ情報なし</div>'

    $('items').innerHTML=(d.closest_to_cash||[]).map(item).join('')||'<div class="tiny">今すぐ回収を追うお金はありません。</div>'
    $('market').innerHTML=(d.market_candidates||[]).map(item).join('')||'<div class="tiny">今のところ、新しく参加できる明確な報酬案件は見つかっていません。</div>'
    $('repeat').innerHTML=(d.repeat_winning_routes||[]).map(function(x){
      return '<div class="row"><b>'+esc(plainSource(x.source))+' → '+esc(plainRoute(x.route))+'</b>'+
        '<div class="tiny">入金確認できた回数: '+esc(x.count)+'回</div></div>'
    }).join('')||'<div class="tiny">まだ「繰り返せる稼ぎ方」と言えるだけの実績はありません。</div>'
    $('dispatch').innerHTML=(d.latest_dispatches||[]).map(function(x){
      return '<div class="row"><span class="status '+classFor(x.status)+'">'+esc(plainStatus(x.status))+'</span> → <b>'+esc(x.to_unit==='codeops'?'GitHubぽちぽち担当':x.to_unit)+'</b><br>'+
        esc(plainName(x.title).replaceAll('PAYOUT_PENDING','入金待ち'))+
        '<details class="tiny"><summary>技術詳細</summary><pre>'+esc(JSON.stringify(x,null,2))+'</pre></details></div>'
    }).join('')||'<div class="tiny">まだ担当への引き渡し履歴はありません。</div>'

    setMessage('最新状態 '+new Date(d.generated_at).toLocaleString('ja-JP'))
  }catch(e){
    setMessage('読込エラー: '+(e&&e.message?e.message:String(e)))
  }
}
function connect(){
  const key=$('key').value.trim()
  if(!key){setMessage('接続キーを入力してください');return}
  localStorage.setItem('monitor_key',key)
  localStorage.setItem('direct_revenue_os_key',key)
  load()
}
async function runNow(){
  try{
    setMessage('いま一番入金に近いものを確認しています…')
    const x=await api('/api/run',{method:'POST',body:'{}'})
    setMessage('確認完了。'+(x.route?plainRoute(x.route):'担当を確認しました'))
    await load()
  }catch(e){
    setMessage('実行エラー: '+(e&&e.message?e.message:String(e)))
  }
}
document.addEventListener('DOMContentLoaded',function(){
  $('key').value=storedKey()
  $('connectBtn').addEventListener('click',connect)
  $('runBtn').addEventListener('click',runNow)
  setMessage('画面準備完了')
  if($('key').value) load()
  setInterval(function(){if($('key').value)load()},15000)
})
