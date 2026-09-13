(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function track(name,params={}){try{window.gtag?.('event',name,{page_path:location.pathname,...params})}catch(e){}}
function ready(){
  document.body.classList.add('readiness-v2');
  const hero=$('.hero');
  if(hero&&!document.querySelector('.readiness-strip')){
    const strip=document.createElement('section');
    strip.className='readiness-strip';
    strip.setAttribute('aria-label','このツールで分かること');
    strip.innerHTML='<div><small>01 / CHECK</small><strong>72時間の基本10項目</strong></div><div><small>02 / PRIORITY</small><strong>不足から次の3手を表示</strong></div><div><small>03 / KEEP</small><strong>結果は端末内に保存</strong></div>';
    hero.insertAdjacentElement('afterend',strip);
  }
  const sub=$('.hero-sub');
  if(sub){sub.dataset.ja='最初の72時間に必要なものを、買い足す前に確認。';sub.textContent=sub.dataset.ja;}
  const mini=$('.hero-mini');
  if(mini)mini.innerHTML='<span>✓ 10項目</span><span>◎ 次の3手</span><span>⌂ 家庭別に優先</span>';

  const blankAmount=$$('.amount').find(b=>!b.dataset.url);
  if(blankAmount){blankAmount.textContent='自由額';blankAmount.disabled=true;blankAmount.classList.remove('sel');blankAmount.title='現在準備中';}
  if(!$('.amount.sel')){$$('.amount').find(b=>b.dataset.url)?.classList.add('sel');}

  const supportBox=$('.support-inline');
  if(supportBox){
    const h=supportBox.querySelector('h3'); if(h)h.textContent='この無料ツールを残す';
    const p=supportBox.querySelector('p'); if(p)p.textContent='役立った場合だけ、次の人にも無料で届けるための運営を応援できます。';
    if(!supportBox.querySelector('.support-trust')){
      const note=document.createElement('div');
      note.className='support-trust';
      note.textContent='応援は完全に任意です。応援の有無でチェック結果・機能・公的情報への案内は変わりません。単発決済のみです。';
      p?.insertAdjacentElement('afterend',note);
    }
  }

  // Convert the former placeholders into useful routes.
  const gear=$('#gear');
  if(gear){gear.textContent='不足別ガイドを見る';gear.onclick=()=>{track('readiness_gear_open',{score:getScore()});location.href='./gear.html';};}
  const plan=$('#plan');
  if(plan){plan.textContent='自分用プランを見る';plan.onclick=openPlan;}
  const gearCard=gear?.closest('.value-card');
  if(gearCard){const s=gearCard.querySelector('small');if(s)s.textContent='不足カテゴリだけ確認して買いすぎ防止';const t=gearCard.querySelector('strong');if(t)t.textContent='不足別 防災用品ガイド';}
  const planCard=plan?.closest('.value-card');
  if(planCard){const s=planCard.querySelector('small');if(s)s.textContent='今日・今週・今月を1枚に';const t=planCard.querySelector('strong');if(t)t.textContent='家庭用 備えプラン';}

  const support=$('#support');
  if(support){
    const refresh=()=>{const sel=$('.amount.sel');support.textContent=sel?.dataset.url?`${sel.textContent.trim()}で応援する →`:'金額を選ぶ';support.disabled=!sel?.dataset.url;};
    $$('.amount').forEach(b=>b.addEventListener('click',()=>{setTimeout(refresh,0);if(b.dataset.url)track('readiness_support_amount_select',{amount:b.textContent.trim()});}));
    support.addEventListener('click',()=>{const sel=$('.amount.sel');if(sel?.dataset.url)track('readiness_support_click',{amount:sel.textContent.trim(),score:getScore()});});
    refresh();
  }
  ensurePlanDrawer();
  updatePlanButton();
  $$('#grid input').forEach(i=>i.addEventListener('change',()=>{updatePlanButton();track('readiness_check_change',{item:i.dataset.k,checked:i.checked,score:getScore()});}));
  track('readiness_v2_loaded');
}
function getScore(){return Number($('#score')?.textContent||0)}
function getNext(){return $$('#next-list .next').map(n=>({task:n.children[1]?.textContent?.trim()||'',when:n.querySelector('.when')?.textContent?.trim()||''})).filter(x=>x.task)}
function updatePlanButton(){const p=$('#plan');if(!p)return;p.dataset.score=String(getScore());}
function ensurePlanDrawer(){
  if($('.plan-drawer'))return;
  const d=document.createElement('div');d.className='plan-drawer';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','家庭用備えプラン');
  d.innerHTML='<section class="plan-sheet"><div class="plan-sheet-head"><div><small>HOME READINESS PLAN</small><h2>家庭用 備えプラン</h2></div><button class="plan-close" aria-label="閉じる">×</button></div><div class="plan-kpi"><div><small>準備スコア</small><div class="plan-score">0</div></div><div><strong>次の3手だけ進める</strong><p>全部を一度に買わず、家庭の不足順に確認します。</p></div></div><div class="plan-list"></div><div class="plan-actions"><button class="primary" data-plan-print>印刷 / PDF保存</button><button data-plan-copy>プランをコピー</button><button data-plan-template>記入用テンプレート</button></div></section>';
  d.addEventListener('click',e=>{if(e.target===d)d.classList.remove('open')});
  d.querySelector('.plan-close').onclick=()=>d.classList.remove('open');
  d.querySelector('[data-plan-print]').onclick=()=>{track('readiness_plan_print',{score:getScore()});window.print();};
  d.querySelector('[data-plan-copy]').onclick=async()=>{const next=getNext();const text=`暮らし防衛チェック ${getScore()}/100\n`+next.map((x,i)=>`${i+1}. ${x.when}：${x.task}`).join('\n');try{await navigator.clipboard.writeText(text);window.toast?.('プランをコピーしました');track('readiness_plan_copy',{score:getScore()});}catch(e){}};
  d.querySelector('[data-plan-template]').onclick=()=>{track('readiness_plan_template_open',{score:getScore()});location.href='./plan.html';};
  document.body.appendChild(d);
}
function openPlan(){
  ensurePlanDrawer();
  const d=$('.plan-drawer'),score=getScore(),next=getNext();
  d.querySelector('.plan-score').textContent=String(score);
  d.querySelector('.plan-list').innerHTML=(next.length?next:[{when:'今日',task:'水・食料・電源など基本項目を確認'}]).map((x,i)=>`<div><small>${String(i+1).padStart(2,'0')} / ${x.when||'次'}</small><br>${x.task}</div>`).join('');
  d.classList.add('open');
  track('readiness_plan_open',{score});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();