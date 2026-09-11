/* Stratum Praxis — homepage revenue category navigator controls */
(()=>{
  'use strict';
  const boot=()=>{
    const rail=document.querySelector('[data-revenue-rail]');
    const prev=document.querySelector('[data-revenue-prev]');
    const next=document.querySelector('[data-revenue-next]');
    const count=document.querySelector('[data-revenue-count]');
    if(!rail||!prev||!next)return;
    const slides=[...rail.querySelectorAll('.rh-route-slide')];
    if(!slides.length)return;
    const gap=()=>parseFloat(getComputedStyle(rail).columnGap||getComputedStyle(rail).gap||0)||0;
    const step=()=>slides[0].getBoundingClientRect().width+gap();
    const index=()=>Math.max(0,Math.min(slides.length-1,Math.round(rail.scrollLeft/Math.max(1,step()))));
    const update=()=>{
      const i=index();
      prev.disabled=i<=0;
      next.disabled=i>=slides.length-1||rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-4;
      if(count)count.textContent=`${i+1} / ${slides.length}`;
    };
    const move=dir=>{
      rail.scrollBy({left:dir*step(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      window.scosCapture?.('home_category_slide',{direction:dir>0?'next':'prev',from_index:index()+1});
    };
    prev.addEventListener('click',()=>move(-1));
    next.addEventListener('click',()=>move(1));
    rail.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'){e.preventDefault();move(1)}
      if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}
    });
    let ticking=false;
    rail.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{update();ticking=false})}},{passive:true});
    addEventListener('resize',update,{passive:true});
    update();
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
