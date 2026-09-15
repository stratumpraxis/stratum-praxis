/* FrameTone immersive player enhancement — progressive, no external media required. */
(() => {
  'use strict';
  const stage = document.querySelector('.stage');
  const play = document.getElementById('play');
  const progress = document.getElementById('progressBar');
  if (!stage || !play || !progress) return;

  stage.classList.add('ft-cinema');
  const style = document.createElement('style');
  style.textContent = `
  .ft-cinema{background:#030407!important;min-height:min(76svh,820px)!important}
  .ft-cinema:before{opacity:.34!important;background-image:radial-gradient(circle at 50% 44%,rgba(154,133,255,.18),transparent 17%),radial-gradient(circle at 48% 46%,rgba(214,255,100,.06),transparent 31%),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px)!important;background-size:auto,auto,58px 58px,58px 58px!important;mask-image:none!important}
  .ft-cinema .orb{width:clamp(190px,23vw,340px);height:clamp(190px,23vw,340px);filter:saturate(1.12);transition:filter .5s,transform .7s cubic-bezier(.2,.8,.2,1)}
  .ft-cinema.is-playing .orb{filter:saturate(1.35) brightness(1.08);animation-duration:4.8s}
  .ft-cinema .wave{bottom:12%;opacity:.62;transition:opacity .35s}
  .ft-cinema.is-playing .wave{opacity:1}
  .ft-controls{position:absolute;left:30px;right:30px;bottom:22px;z-index:4;display:flex;align-items:center;gap:13px;pointer-events:none}
  .ft-time{font:600 10px/1 Inter,Arial,sans-serif;color:#d9dee7;letter-spacing:.06em;min-width:72px;text-shadow:0 1px 10px #000}
  .ft-scrub{height:20px;flex:1;display:flex;align-items:center;pointer-events:auto;cursor:pointer}
  .ft-scrub:before{content:'';display:block;width:100%;height:3px;border-radius:999px;background:rgba(255,255,255,.2)}
  .ft-scrub i{position:absolute;height:3px;border-radius:999px;background:#fff;pointer-events:none;width:0}
  .ft-tools{display:flex;gap:8px;pointer-events:auto}
  .ft-tool{height:34px;min-width:34px;padding:0 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(5,7,11,.48);backdrop-filter:blur(16px);color:#fff;font:700 10px/1 Inter,Arial,sans-serif;cursor:pointer}
  .ft-tool[aria-pressed=true]{background:#fff;color:#080a0e}
  .ft-cinema>.progress{display:none}
  .ft-cinema>.play{right:50%;bottom:50%;transform:translate(50%,50%);width:82px;height:82px;background:rgba(4,6,10,.38);box-shadow:0 18px 60px rgba(0,0,0,.3)}
  .ft-cinema>.play:hover{transform:translate(50%,50%) scale(1.06)}
  .ft-cinema.is-playing>.play{opacity:0}
  .ft-cinema.is-playing:hover>.play,.ft-cinema>.play:focus-visible{opacity:1}
  .ft-preview-badge{position:absolute;left:30px;top:30px;z-index:4;padding:8px 11px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(4,6,10,.42);backdrop-filter:blur(14px);font:700 9px/1 Inter,Arial,sans-serif;letter-spacing:.14em;color:#eef1f6;text-transform:uppercase}
  @media(max-width:640px){.ft-cinema{min-height:68svh!important;border-radius:22px!important}.ft-cinema>.play{width:68px;height:68px}.ft-controls{left:18px;right:18px;bottom:16px}.ft-time{min-width:58px;font-size:9px}.ft-tool{height:32px;min-width:32px;padding:0 9px}.ft-preview-badge{left:18px;top:18px}.ft-cinema .visual-title{bottom:76px;max-width:72%}.ft-cinema .wave{bottom:16%}}
  @media(prefers-reduced-motion:reduce){.ft-cinema .orb{animation:none!important}}
  `;
  document.head.appendChild(style);

  const badge = document.createElement('div');
  badge.className = 'ft-preview-badge';
  badge.textContent = 'Visual preview';
  stage.appendChild(badge);

  const controls = document.createElement('div');
  controls.className = 'ft-controls';
  controls.innerHTML = '<span class="ft-time" aria-live="off">00:00 / 00:30</span><div class="ft-scrub" role="slider" tabindex="0" aria-label="プレビュー位置" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0"><i></i></div><div class="ft-tools"><button class="ft-tool ft-sound" type="button" aria-pressed="false" aria-label="サウンド状態">SOUND</button><button class="ft-tool ft-cc" type="button" aria-pressed="false" aria-label="字幕表示">CC</button></div>';
  stage.appendChild(controls);

  const time = controls.querySelector('.ft-time');
  const scrub = controls.querySelector('.ft-scrub');
  const fill = scrub.querySelector('i');
  const sound = controls.querySelector('.ft-sound');
  const cc = controls.querySelector('.ft-cc');
  const duration = 30;
  let elapsed = 0, playing = false, raf = 0, last = 0;
  const fmt = s => `00:${String(Math.floor(s)).padStart(2,'0')}`;
  const render = () => {
    const pct = Math.min(100, elapsed / duration * 100);
    fill.style.width = `${pct}%`;
    progress.style.width = `${pct}%`;
    scrub.setAttribute('aria-valuenow', String(Math.floor(elapsed)));
    time.textContent = `${fmt(elapsed)} / 00:30`;
  };
  const frame = ts => {
    if (!playing) return;
    if (!last) last = ts;
    elapsed += (ts - last) / 1000;
    last = ts;
    if (elapsed >= duration) { elapsed = 0; playing = false; stage.classList.remove('is-playing'); play.textContent = '▶'; render(); return; }
    render(); raf = requestAnimationFrame(frame);
  };
  const toggle = () => {
    playing = !playing; last = 0;
    stage.classList.toggle('is-playing', playing);
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', playing ? 'プレビューを一時停止' : 'プレビューを再生');
    if (playing) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
  };
  play.addEventListener('click', e => { e.stopImmediatePropagation(); toggle(); }, true);
  const seek = ratio => { elapsed = Math.max(0, Math.min(duration, ratio * duration)); render(); };
  scrub.addEventListener('pointerdown', e => { const r = scrub.getBoundingClientRect(); seek((e.clientX-r.left)/r.width); });
  scrub.addEventListener('keydown', e => { if(e.key==='ArrowRight'){elapsed=Math.min(duration,elapsed+2);render()} if(e.key==='ArrowLeft'){elapsed=Math.max(0,elapsed-2);render()} });
  sound.addEventListener('click', () => { const on = sound.getAttribute('aria-pressed') !== 'true'; sound.setAttribute('aria-pressed', String(on)); sound.textContent = on ? 'SOUND ON' : 'SOUND'; });
  cc.addEventListener('click', () => { const on = cc.getAttribute('aria-pressed') !== 'true'; cc.setAttribute('aria-pressed', String(on)); const title = stage.querySelector('.visual-title'); if(title) title.style.opacity = on ? '1' : '.45'; });

  const waves = stage.querySelector('.wave');
  if (waves && !waves.children.length) {
    const heights=[18,35,58,30,72,44,24,66,84,52,34,76,46,28,62,90,54,38,70,48,26,58,78,42,22,64,88,50,32,72,40,20];
    heights.forEach((h,i)=>{const s=document.createElement('span');s.style.setProperty('--h',`${h}%`);s.style.setProperty('--d',`${-(i%7)*.13}s`);waves.appendChild(s)});
  }
  render();
})();