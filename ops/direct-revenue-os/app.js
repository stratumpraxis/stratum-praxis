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
function classFor(status){
  const s=String(status||'')
  if(/CONFIRMED|DONE|ACTIVE/i.test(s)) return 'ok'
  if(/PENDING|WAIT|READY/i.test(s)) return 'wait'
  if(/BLOCK|FAIL/i.test(s)) return 'bad'
  return 'info'
}
function item(x){
  const name=x.revenue_name||x.title||'Direct Revenue'
  const route=x.route&&x.route.label?x.route.label:'route unknown'
  return '<div class="row">'+
    '<span class="status '+classFor(x.status)+'">'+esc(x.status)+'</span> '+
    '<b>'+esc(x.amount||'UNKNOWN')+'</b><br>'+
    esc(name)+
    '<div class="tiny">'+esc(x.source||'')+' → '+esc(route)+' · '+esc(x.action||'')+'</div>'+
    '</div>'
}
async function api(path,opt){
  const options=opt||{}
  const key=$('key').value.trim()||storedKey()
  if(!key) throw new Error('Monitor keyを入力してください')
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
    setMessage('Current Direct Revenueを読込中…')
    const d=await api('/api/snapshot')
    const s=d.selected
    $('selected').textContent=s?((s.amount||'UNKNOWN')+' · '+s.status):'候補なし'
    $('selectedMeta').textContent=s?((s.revenue_name||s.title||'')+' → '+((s.route&&s.route.label)||'')):'Verified candidate待ち'
    $('state').textContent=(d.canonical_state&&d.canonical_state.state)||'ACTIVE'
    $('next').textContent=(d.canonical_state&&d.canonical_state.next_action)||''
    $('sources').innerHTML=(d.source_registry||[]).map(function(x){
      return '<span class="pill">'+esc(x.label||x.source||x.key)+' '+esc(x.observed_count==null?(x.count==null?0:x.count):x.observed_count)+'</span>'
    }).join('')||'<div class="tiny">Source registry待ち</div>'
    $('items').innerHTML=(d.closest_to_cash||[]).map(item).join('')||'<div class="tiny">現在の直接回収候補なし</div>'
    $('market').innerHTML=(d.market_candidates||[]).map(item).join('')||'<div class="tiny">現在のverified direct reward候補なし</div>'
    $('repeat').innerHTML=(d.repeat_winning_routes||[]).map(function(x){
      const route=(x.route&&x.route.label)||(x.route&&x.route.unit_id)||'route'
      return '<div class="row"><b>'+esc(x.source)+' → '+esc(route)+'</b>'+
        '<div class="tiny">confirmed count: '+esc(x.count)+' · last: '+esc(x.last_at||'—')+'</div></div>'
    }).join('')||'<div class="tiny">Repeat Winner集計待ち</div>'
    $('dispatch').innerHTML=(d.latest_dispatches||[]).map(function(x){
      return '<div class="row"><span class="status '+classFor(x.status)+'">'+esc(x.status)+'</span> → <b>'+esc(x.to_unit)+'</b><br>'+
        esc(x.title)+'<div class="tiny">'+esc(x.created_at||'')+'</div></div>'
    }).join('')||'<div class="tiny">まだhandoffなし</div>'
    setMessage('更新 '+new Date(d.generated_at).toLocaleString('ja-JP'))
  }catch(e){
    setMessage('読込エラー: '+(e&&e.message?e.message:String(e)))
  }
}
function connect(){
  const key=$('key').value.trim()
  if(!key){setMessage('Monitor keyを入力してください');return}
  localStorage.setItem('monitor_key',key)
  localStorage.setItem('direct_revenue_os_key',key)
  load()
}
async function runNow(){
  try{
    setMessage('Closest-to-cashを選定・Route Handoff中…')
    const x=await api('/api/run',{method:'POST',body:'{}'})
    setMessage(x.outcome+' · '+((x.route&&x.route.label)||''))
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
