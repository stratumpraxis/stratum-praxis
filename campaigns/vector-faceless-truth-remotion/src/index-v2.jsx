import React from 'react';
import {
  AbsoluteFill,
  Composition,
  Easing,
  Sequence,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Audio} from '@remotion/media';

const FPS = 30;
const SCENES = [315, 390, 510, 270, 450, 360, 390, 135];
const TOTAL = SCENES.reduce((a, b) => a + b, 0);
const C = {
  bg: '#030507', bg2: '#0a1018', white: '#f6f8fb', silver: '#cbd4df',
  mid: '#9aa8b8', muted: '#667587', cyan: '#65e4ff', cyan2: '#149bc1',
  red: '#ff6a6a', green: '#78e2ad', gold: '#dbc892',
  card: 'rgba(12,18,26,.91)', line: 'rgba(196,214,236,.18)',
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const font = '"Noto Sans JP","Noto Sans CJK JP","Hiragino Sans","Yu Gothic",sans-serif';

const Fade = ({children, from = 0, dur = 14, y = 20, style = {}}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + dur], [0, 1], {
    ...clamp,
    easing: Easing.bezier(.16, 1, .3, 1),
  });
  return (
    <div style={{opacity: p, translate: `0 ${(1 - p) * y}px`, ...style}}>
      {children}
    </div>
  );
};

const Background = ({accent = C.cyan}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const sweep = interpolate(frame, [0, durationInFrames], [-500, 1280], clamp);
  const dots = Array.from({length: 25}, (_, i) => ({
    x: 30 + ((i * 151) % 990),
    y: 150 + ((i * 269) % 1580),
    p: i * .63,
  }));
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 83% 24%, ${accent}18, transparent 31%), linear-gradient(180deg, ${C.bg2}, ${C.bg})`}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(203,212,223,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(203,212,223,.045) 1px,transparent 1px)', backgroundSize: '64px 64px'}} />
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.016) 0,rgba(255,255,255,.016) 1px,transparent 1px,transparent 4px)'}} />
      {dots.map((d, i) => (
        <div key={i} style={{position: 'absolute', left: d.x, top: d.y, width: 3, height: 3, borderRadius: 10, background: C.silver, opacity: .10 + .11 * (1 + Math.sin(frame / 18 + d.p)) / 2}} />
      ))}
      <div style={{position: 'absolute', left: sweep, top: -160, width: 160, height: 2260, rotate: '11deg', background: `linear-gradient(90deg,transparent,${accent}10,transparent)`, filter: 'blur(8px)'}} />
    </AbsoluteFill>
  );
};

const Brand = ({accent}) => (
  <>
    <div style={{position: 'absolute', top: 68, left: 64, fontSize: 21, fontWeight: 750, letterSpacing: 8, color: C.silver}}>VECTOR PRAXIS</div>
    <div style={{position: 'absolute', top: 120, left: 64, width: 186, height: 2, background: C.line}}>
      <div style={{width: 50, height: 2, background: accent, boxShadow: `0 0 18px ${accent}99`}} />
    </div>
  </>
);

const Subtitle = ({children, accent = C.cyan}) => (
  <div style={{position: 'absolute', left: 64, right: 150, bottom: 185, minHeight: 100, borderRadius: 24, background: 'rgba(2,5,9,.82)', border: `1px solid ${accent}30`, padding: '20px 26px', display: 'flex', alignItems: 'center', boxShadow: '0 18px 42px rgba(0,0,0,.28)'}}>
    <div style={{width: 4, alignSelf: 'stretch', borderRadius: 4, background: accent, marginRight: 18, boxShadow: `0 0 14px ${accent}77`}} />
    <div style={{fontSize: 26, lineHeight: 1.45, fontWeight: 700, color: C.white}}>{children}</div>
  </div>
);

const Shell = ({children, duration, accent = C.cyan}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, duration - 9, duration], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{fontFamily: font, color: C.white, overflow: 'hidden', opacity}}>
      <Background accent={accent} />
      <Brand accent={accent} />
      {children}
      <div style={{position: 'absolute', left: 64, bottom: 68, fontSize: 16, color: C.muted}}>AI音声・オリジナルモーショングラフィックを使用</div>
    </AbsoluteFill>
  );
};

const Pill = ({text, x, y, delay, width = 275, color = C.cyan}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 16], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <div style={{position: 'absolute', left: x, top: y, width, height: 82, borderRadius: 22, border: `1px solid ${color}45`, background: C.card, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 15, opacity: p, translate: `0 ${(1 - p) * 16}px`, boxShadow: '0 16px 40px rgba(0,0,0,.22)'}}>
      <div style={{width: 9, height: 9, borderRadius: 10, background: color, boxShadow: `0 0 15px ${color}`}} />
      <div style={{fontSize: 24, fontWeight: 800}}>{text}</div>
    </div>
  );
};

const Hook = () => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [42, 95], [0, 790], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <Shell duration={SCENES[0]} accent={C.red}>
      <Fade from={4}>
        <div style={{position: 'absolute', left: 64, top: 205, width: 880, fontSize: 84, lineHeight: 1.06, fontWeight: 950, letterSpacing: -4}}>顔出しなし。<br/>AIで動画。<br/>自動投稿。</div>
      </Fade>
      <Fade from={30}>
        <div style={{position: 'absolute', left: 64, top: 535, width: 870, fontSize: 40, lineHeight: 1.38, color: C.silver}}>そして「ほぼ作業なしで収益化」。</div>
      </Fade>
      <div style={{position: 'absolute', left: 64, top: 700, width: 880, height: 245, borderRadius: 34, border: `1px solid ${C.red}50`, background: 'rgba(26,9,12,.58)', overflow: 'hidden'}}>
        <Fade from={58} style={{position: 'absolute', left: 34, top: 35}}><div style={{fontSize: 24, color: C.red, fontWeight: 900, letterSpacing: 4}}>CLAIM CHECK</div></Fade>
        <Fade from={72} style={{position: 'absolute', left: 34, top: 92}}><div style={{fontSize: 46, fontWeight: 950}}>どこまで本当？</div></Fade>
        <div style={{position: 'absolute', left: 34, top: 185, width: 790, height: 3, background: C.line}}><div style={{height: 3, width: line, background: C.red, boxShadow: `0 0 18px ${C.red}88`}} /></div>
      </div>
      <Subtitle accent={C.red}>「自動投稿」と「自動収益」は同じなのか。</Subtitle>
    </Shell>
  );
};

const Automation = () => (
  <Shell duration={SCENES[1]}>
    <Fade from={4}><div style={{position: 'absolute', left: 64, top: 205, fontSize: 29, color: C.cyan, fontWeight: 850, letterSpacing: 3}}>2026年、ここまでは現実</div></Fade>
    <Fade from={18}><div style={{position: 'absolute', left: 64, top: 270, width: 890, fontSize: 66, lineHeight: 1.1, fontWeight: 950}}>制作と投稿は、<br/>かなり自動化できる。</div></Fade>
    <Pill text="台本" x={64} y={520} delay={38} />
    <Pill text="画像 / 映像" x={375} y={520} delay={48} width={315} />
    <Pill text="日本語音声" x={64} y={630} delay={58} width={315} />
    <Pill text="字幕" x={415} y={630} delay={68} />
    <Pill text="BGM" x={64} y={740} delay={78} />
    <Pill text="予約・自動投稿" x={375} y={740} delay={88} width={345} />
    <Fade from={116}>
      <div style={{position: 'absolute', left: 64, top: 910, width: 880, height: 285, borderRadius: 32, border: `1px solid ${C.line}`, background: C.card, padding: '34px 36px'}}>
        <div style={{fontSize: 20, color: C.mid, letterSpacing: 4, marginBottom: 18}}>AUTOMATION PIPELINE</div>
        <div style={{fontSize: 32, lineHeight: 1.55, fontWeight: 800}}>Idea → Script → Voice<br/>→ Visual → Edit → Publish</div>
      </div>
    </Fade>
    <Subtitle>AIは制作と配布の時間を大きく短縮できる。</Subtitle>
  </Shell>
);

const FactCard = ({num, title, sub, top, delay, color = C.green}) => (
  <Fade from={delay}>
    <div style={{position: 'absolute', left: 64, top, width: 880, height: 145, borderRadius: 27, border: `1px solid ${color}45`, background: C.card, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 26}}>
      <div style={{width: 70, height: 70, borderRadius: 20, border: `1px solid ${color}60`, display: 'grid', placeItems: 'center', fontSize: 25, fontWeight: 950, color}}>{num}</div>
      <div><div style={{fontSize: 31, fontWeight: 900, marginBottom: 8}}>{title}</div><div style={{fontSize: 21, color: C.mid}}>{sub}</div></div>
    </div>
  </Fade>
);

const Rules = () => (
  <Shell duration={SCENES[2]} accent={C.green}>
    <Fade from={4}><div style={{position: 'absolute', left: 64, top: 200, fontSize: 29, color: C.green, fontWeight: 850, letterSpacing: 3}}>でも、自動投稿 ≠ 自動収益</div></Fade>
    <Fade from={18}><div style={{position: 'absolute', left: 64, top: 265, width: 890, fontSize: 63, lineHeight: 1.12, fontWeight: 950}}>TikTok側にも<br/>「通過条件」がある。</div></Fade>
    <FactCard num="01" title="高品質" sub="視聴者にとって価値のある内容" top={500} delay={42} />
    <FactCard num="02" title="オリジナル" sub="Creator Rewardsで重視される要件" top={665} delay={58} />
    <FactCard num="03" title="1分以上" sub="Creator Rewards対象動画の基本条件" top={830} delay={74} />
    <FactCard num="04" title="AIの透明性" sub="AI生成・大幅編集は適切な開示が重要" top={995} delay={90} color={C.gold} />
    <Fade from={118}><div style={{position: 'absolute', left: 64, top: 1185, width: 880, borderLeft: `3px solid ${C.green}`, paddingLeft: 25, fontSize: 21, lineHeight: 1.6, color: C.mid}}>TikTok Help Center / Creator Rewards / AI-generated content guidance を確認。条件や提供地域は変更される可能性があります。</div></Fade>
    <Subtitle accent={C.green}>AIを使うだけで収益条件を満たすわけではない。</Subtitle>
  </Shell>
);

const Boundary = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [15, 90], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <Shell duration={SCENES[3]} accent={C.gold}>
      <Fade from={4}><div style={{position: 'absolute', left: 64, top: 215, width: 890, fontSize: 62, lineHeight: 1.13, fontWeight: 950}}>AIが短縮するのは、<br/><span style={{color: C.gold}}>制作と配布の時間。</span></div></Fade>
      <div style={{position: 'absolute', left: 64, top: 535, width: 880, height: 330, borderRadius: 34, border: `1px solid ${C.line}`, background: C.card, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: `${p * 50}%`, height: '100%', background: 'linear-gradient(90deg,rgba(219,200,146,.15),rgba(219,200,146,.03))'}} />
        <div style={{position: 'absolute', left: '50%', top: 0, width: 2, height: '100%', background: C.line}} />
        <div style={{position: 'absolute', left: 34, top: 35, fontSize: 21, letterSpacing: 3, color: C.gold}}>AUTOMATABLE</div>
        <div style={{position: 'absolute', left: 34, top: 92, fontSize: 31, lineHeight: 1.6, fontWeight: 850}}>台本<br/>音声<br/>映像<br/>投稿</div>
        <div style={{position: 'absolute', left: 500, top: 35, fontSize: 21, letterSpacing: 3, color: C.red}}>NOT AUTOMATIC</div>
        <div style={{position: 'absolute', left: 500, top: 92, fontSize: 31, lineHeight: 1.6, fontWeight: 850}}>需要<br/>視聴維持<br/>購入<br/>改善</div>
      </div>
      <Subtitle accent={C.gold}>収益を決めるのは、自動化の「その先」。</Subtitle>
    </Shell>
  );
};

const FunnelNode = ({label, left, top, delay, color = C.cyan}) => (
  <Fade from={delay}>
    <div style={{position: 'absolute', left, top, width: 265, height: 94, borderRadius: 24, border: `1px solid ${color}55`, background: C.card, display: 'grid', placeItems: 'center', fontSize: 27, fontWeight: 900}}>{label}</div>
  </Fade>
);

const Funnel = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [55, 155], [1200, 0], clamp);
  return (
    <Shell duration={SCENES[4]}>
      <Fade from={3}><div style={{position: 'absolute', left: 64, top: 200, fontSize: 29, color: C.cyan, fontWeight: 850, letterSpacing: 3}}>本当に見るべき数字</div></Fade>
      <Fade from={18}><div style={{position: 'absolute', left: 64, top: 265, width: 890, fontSize: 63, lineHeight: 1.1, fontWeight: 950}}>動画の本数ではなく、<br/>収益ループ。</div></Fade>
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
        <path d="M 195 635 C 410 635, 415 790, 610 790 C 800 790, 805 950, 610 950 C 415 950, 410 1110, 195 1110" fill="none" stroke="rgba(101,228,255,.75)" strokeWidth="3" strokeDasharray="1200" strokeDashoffset={draw} />
      </svg>
      <FunnelNode label="需要" left={64} top={590} delay={40} />
      <FunnelNode label="視聴維持" left={565} top={745} delay={58} />
      <FunnelNode label="サイト流入" left={565} top={905} delay={76} />
      <FunnelNode label="商品 / 行動" left={64} top={1065} delay={94} />
      <Fade from={122}>
        <div style={{position: 'absolute', left: 64, top: 1230, width: 880, height: 180, borderRadius: 30, border: `1px solid ${C.green}45`, background: 'rgba(8,24,18,.60)', padding: '30px 34px'}}>
          <div style={{fontSize: 21, color: C.green, letterSpacing: 3, marginBottom: 13}}>FEEDBACK LOOP</div>
          <div style={{fontSize: 30, fontWeight: 900}}>計測 → 改善 → 次の動画</div>
          <div style={{fontSize: 21, color: C.mid, marginTop: 10}}>伸びた構造だけを残す。</div>
        </div>
      </Fade>
      <Subtitle>制作 → 流入 → 販売 → 改善までつながって初めて「仕組み」になる。</Subtitle>
    </Shell>
  );
};

const Volume = () => (
  <Shell duration={SCENES[5]} accent={C.red}>
    <Fade from={3}><div style={{position: 'absolute', left: 64, top: 215, width: 900, fontSize: 66, lineHeight: 1.12, fontWeight: 950}}>AI動画を100本作る。<br/><span style={{color: C.red}}>それだけでは足りない。</span></div></Fade>
    <Fade from={35}>
      <div style={{position: 'absolute', left: 64, top: 505, width: 880, height: 465, borderRadius: 34, border: `1px solid ${C.line}`, background: C.card, padding: '40px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 250}}>
          {[34,82,55,95,42,72,60,88,47,68].map((h, i) => (
            <div key={i} style={{width: 54, height: h * 2.2, borderRadius: '11px 11px 4px 4px', background: i === 3 ? `linear-gradient(${C.cyan},${C.cyan2})` : 'linear-gradient(rgba(203,212,223,.32),rgba(203,212,223,.07))', boxShadow: i === 3 ? `0 0 24px ${C.cyan}55` : 'none'}} />
          ))}
        </div>
        <div style={{marginTop: 34, fontSize: 23, lineHeight: 1.5, color: C.mid}}>大量生成より「何が刺さったか」を学習する。</div>
      </div>
    </Fade>
    <Fade from={92}><div style={{position: 'absolute', left: 64, top: 1060, width: 850, fontSize: 30, lineHeight: 1.65, color: C.silver}}>自動化の目的は、雑に増やすことではなく、検証回数を増やすこと。</div></Fade>
    <Subtitle accent={C.red}>量産より、独自性とフィードバック。</Subtitle>
  </Shell>
);

const Vector = () => (
  <Shell duration={SCENES[6]}>
    <Fade from={4}><div style={{position: 'absolute', left: 64, top: 200, fontSize: 27, color: C.cyan, fontWeight: 850, letterSpacing: 4}}>VECTOR PRAXIS</div></Fade>
    <Fade from={18}><div style={{position: 'absolute', left: 64, top: 265, width: 890, fontSize: 65, lineHeight: 1.12, fontWeight: 950}}>ツール紹介の奥にある、<br/>「構造」を見る。</div></Fade>
    <Fade from={46}><div style={{position: 'absolute', left: 64, top: 520, width: 880, fontSize: 29, lineHeight: 1.72, color: C.silver}}>AI副業を「稼ぐ魔法」ではなく、<br/>制作 → 流入 → 販売 → 改善<br/>という運用システムとして整理。</div></Fade>
    <Fade from={80}>
      <div style={{position: 'absolute', left: 64, top: 820, width: 880, height: 360, borderRadius: 36, border: `1px solid ${C.cyan}45`, background: 'linear-gradient(145deg,rgba(7,31,40,.90),rgba(8,12,18,.95))', padding: '38px'}}>
        <div style={{fontSize: 18, color: C.mid, letterSpacing: 3, marginBottom: 18}}>EXISTING VECTOR PRAXIS GUIDE</div>
        <div style={{fontSize: 36, fontWeight: 950, lineHeight: 1.4}}>AI副業完全実装マニュアル<br/>スマホで作るAI収益システム</div>
        <div style={{fontSize: 20, color: C.mid, lineHeight: 1.55, marginTop: 24}}>特定の収益を保証する内容ではありません。<br/>規約・市場・ツールは変化します。</div>
      </div>
    </Fade>
    <Fade from={126}><div style={{position: 'absolute', left: 64, top: 1290, fontSize: 23, color: C.cyan}}>note.com/deft_eel6718</div></Fade>
    <Subtitle>AI副業の「道具」ではなく、売れるまでの構造を検証する。</Subtitle>
  </Shell>
);

const CTA = () => (
  <Shell duration={SCENES[7]}>
    <Fade from={2}><div style={{position: 'absolute', left: 64, top: 500, width: 880, textAlign: 'center', fontSize: 25, color: C.mid, letterSpacing: 5}}>DON'T CHASE THE TOOL</div></Fade>
    <Fade from={10}><div style={{position: 'absolute', left: 64, top: 580, width: 880, textAlign: 'center', fontSize: 68, lineHeight: 1.18, fontWeight: 950}}>答えを急がず、<br/><span style={{color: C.cyan}}>仕組みから見る。</span></div></Fade>
    <Fade from={28}><div style={{position: 'absolute', left: 64, top: 835, width: 880, textAlign: 'center', fontSize: 34, fontWeight: 900}}>Vector Praxis</div></Fade>
    <Fade from={38}><div style={{position: 'absolute', left: 64, top: 900, width: 880, textAlign: 'center', fontSize: 22, color: C.mid}}>AI副業・自動化・収益構造を日本語で検証</div></Fade>
  </Shell>
);

const VectorFacelessTruth = () => {
  const comps = [Hook, Automation, Rules, Boundary, Funnel, Volume, Vector, CTA];
  let cursor = 0;
  const layers = comps.map((Comp, i) => {
    const from = cursor;
    cursor += SCENES[i];
    return <Sequence key={i} from={from} durationInFrames={SCENES[i]}><Comp /></Sequence>;
  });
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {layers}
      <Audio src={staticFile('narration.wav')} volume={1} />
      <Audio src={staticFile('bgm.wav')} volume={0.095} />
    </AbsoluteFill>
  );
};

const Root = () => <Composition id="VectorFacelessTruth" component={VectorFacelessTruth} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />;
registerRoot(Root);
