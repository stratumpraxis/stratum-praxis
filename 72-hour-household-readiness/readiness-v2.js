(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
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

  // Remove the broken custom amount path rather than offering a dead control.
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

  // Turn dead "coming soon" cards into immediate value.
  const gear=$('#gear');
  if(gear){gear.textContent='不足だけコピー';gear.onclick=async()=>{
    const gaps=$$('#gap-items .gap-pill').map(x=>x.textContent.trim()).filter(Boolean);
    const text='不足している備え：\n'+(gaps.length?gaps.map((x,i)=>`${i+1}. ${x}`).join('\n'):'基本10項目は確認済み');
    try{await navigator.clipboard.writeText(text);window.toast?.('不足項目をコピーしました')}catch(e){alert(text)}
  }}
  const plan=$('#plan');
  if(plan){plan.textContent='1枚プランを見る';plan.onclick=openPlan;}
  const gearCard=gear?.closest('.value-card');
  if(gearCard){const s=gearCard.querySelector('small');if(s)s.textContent='不足3項目だけ持ち出す';const t=gearCard.querySelector('strong');if(t)t.textContent='買う前に不足だけ確認';}
  const planCard=plan?.closest('.value-card');
  if(planCard){const s=planCard.querySelector('small');if(s)s.textContent='今日・今週・今月を1枚に';}

  const support=$('#support');
  if(support){
    const refresh=()=>{const sel=$('.amount.sel');support.textContent=sel?.dataset.url?`${sel.textContent.trim()}で応援する →`:'金額を選ぶ';support.disabled=!sel?.dataset.url;};
    $$('.amount').forEach(b=>b.addEventListener('click',()=>setTimeout(refresh,0)));
    refresh();
  }
  ensurePlanDrawer();
  updatePlanButton();
  $$('#grid input').forEach(i=>i.addEventListener('change',updatePlanButton));
  if(window.gtag){gtag('event','readiness_v2_loaded',{page_path:location.pathname});}
}
function getScore(){return Number($('#score')?.textContent||0)}
function getNext(){return $$('#next-list .next').map(n=>({task:n.children[1]?.textContent?.trim()||'',when:n.querySelector('.when')?.textContent?.trim()||''})).filter(x=>x.task)}
function updatePlanButton(){const p=$('#plan');if(!p)return;const s=getScore();p.dataset.score=String(s);}
function ensurePlanDrawer(){
  if($('.plan-drawer'))return;
  const d=document.createElement('div');d.className='plan-drawer';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','家庭用備えプラン');
  d.innerHTML='<section class="plan-sheet"><div class="plan-sheet-head"><div><small>HOME READINESS PLAN</small><h2>家庭用 備えプラン</h2></div><button class="plan-close" aria-label="閉じる">×</button></div><div class="plan-kpi"><div><small>準備スコア</small><div class="plan-score">0</div></div><div><strong>次の3手だけ進める</strong><p>全部を一度に買わず、家庭の不足順に確認します。</p></div></div><div class="plan-list"></div><div class="plan-actions"><button class="primary" data-plan-print>印刷 / PDF保存</button><button data-plan-copy>プランをコピー</button></div></section>';
  d.addEventListener('click',e=>{if(e.target===d)d.classList.remove('open')});
  d.querySelector('.plan-close').onclick=()=>d.classList.remove('open');
  d.querySelector('[data-plan-print]').onclick=()=>window.print();
  d.querySelector('[data-plan-copy]').onclick=async()=>{const next=getNext();const text=`暮らし防衛チェック ${getScore()}/100\n`+next.map((x,i)=>`${i+1}. ${x.when}：${x.task}`).join('\n');try{await navigator.clipboard.writeText(text);window.toast?.('プランをコピーしました')}catch(e){}};
  document.body.appendChild(d);
}
function openPlan(){
  ensurePlanDrawer();
  const d=$('.plan-drawer'),score=getScore(),next=getNext();
  d.querySelector('.plan-score').textContent=String(score);
  d.querySelector('.plan-list').innerHTML=(next.length?next:[{when:'今日',task:'水・食料・電源など基本項目を確認'}]).map((x,i)=>`<div><small>${String(i+1).padStart(2,'0')} / ${x.when||'次'}</small><br>${x.task}</div>`).join('');
  d.classList.add('open');
  if(window.gtag)gtag('event','readiness_plan_open',{score});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();