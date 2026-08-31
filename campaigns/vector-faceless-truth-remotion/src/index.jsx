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
const DURATION = 94 * FPS;
const C = {
  bg: '#030507',
  bg2: '#0a0f16',
  white: '#f7f8fa',
  silver: '#cbd3dd',
  mid: '#9aa7b7',
  muted: '#697789',
  cyan: '#66e2ff',
  cyan2: '#0da2c7',
  red: '#ff6767',
  green: '#78e3ad',
  gold: '#dbc894',
  card: 'rgba(13,18,25,.90)',
  line: 'rgba(183,202,226,.18)',
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const font = '"Noto Sans JP","Noto Sans CJK JP","Hiragino Sans","Yu Gothic",sans-serif';
const scenes = [315, 390, 510, 270, 450, 360, 390, 135];

const Fade = ({children, from = 0, dur = 16, y = 24, style = {}}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + dur], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * y}px)`, ...style}}>{children}</div>;
};

const Background = ({accent = C.cyan}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const sweep = interpolate(frame, [0, durationInFrames], [-420, 1280], clamp);
  const dots = Array.from({length: 28}, (_, i) => ({x: (i * 149) % 1040, y: (i * 257) % 1880, p: i * .61}));
  return <AbsoluteFill style={{background: `radial-gradient(circle at 82% 24%, ${accent}18, transparent 32%), radial-gradient(circle at 15% 78%, rgba(255,255,255,.045), transparent 27%), linear-gradient(180deg, ${C.bg2}, ${C.bg})`}}>
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(203,211,221,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(203,211,221,.045) 1px,transparent 1px)', backgroundSize: '64px 64px'}} />
    <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 4px)'}} />
    {dots.map((d, i) => <div key={i} style={{position: 'absolute', left: d.x, top: d.y, width: 3, height: 3, borderRadius: '50%', background: C.silver, opacity: .12 + .12 * (1 + Math.sin(frame / 18 + d.p)) / 2}} />)}
    <div style={{position: 'absolute', top: -200, left: sweep, width: 160, height: 2400, transform: 'rotate(11deg)', background: `linear-gradient(90deg,transparent,${accent}10,transparent)`, filter: 'blur(8px)'}} />
  </AbsoluteFill>;
};

const Shell = ({children, duration, accent = C.cyan}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 10, duration - 10, duration], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{fontFamily: font, color: C.white, overflow: 'hidden', opacity: op}}>
    <Background accent={accent} />
    <div style={{position: 'absolute', top: 72, left: 70, fontSize: 22, fontWeight: 700, letterSpacing: 8, color: C.silver}}>VECTOR PRAXIS</div>
    <div style={{position: 'absolute', top: 124, left: 70, width: 190, height: 2, background: C.line}}><div style={{width: 52, height: 2, background: accent, boxShadow: `0 0 18px ${accent}99`}} /></div>
    {children}
    <div style={{position: 'absolute', bottom: 68, left: 70, fontSize: 18, color: C.muted}}>AI音声・オリジナルモーショングラフィックを使用</div>
  </AbsoluteFill>;
};

const Pill = ({text, color = C.cyan, x, y, delay = 0, w = 260}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 14], [0, 1], {...clamp, easing: Easing.bezier(.16,1,.3,1)});
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: 78, borderRadius: 22, border: `1px solid ${color}55`, background: 'rgba(7,12,18,.84)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14, opacity: p, transform: `translateY(${(1-p)*18}px)`, boxShadow: '0 18px 48px rgba(0,0,0,.22)'}}>
    <div style={{width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 15px ${color}`}} />
    <div style={{fontSize: 24, fontWeight: 700}}>{text}</div>
  </div>;
};

const SceneHook = () => {
  const frame = useCurrentFrame();
  const slash = interpolate(frame, [30, 85], [0, 1], {...clamp, easing: Easing.bezier(.16,1,.3,1)});
  return <Shell duration={scenes[0]} accent={C.red}>
    <Fade from={4}><div style={{position: 'absolute', left: 70, top: 220, width: 930, fontSize: 86, lineHeight: 1.05, fontWeight: 900, letterSpacing: -4}}>顔出しなし。<br/>AIで動画。<br/>自動投稿。</div></Fade>
    <Fade from={28}><div style={{position: 'absolute', left: 70, top: 545, width: 890, fontSize: 42, lineHeight: 1.35, color: C.silver}}>そして「ほぼ作業なしで収益化」。</div></Fade>
    <div style={{position: 'absolute', left: 70, top: 710, width: 900, height: 250, borderRadius: 34, border: `1px solid ${C.red}55`, background: 'rgba(20,10,12,.58)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(120deg,rgba(255,103,103,.08),transparent 65%)'}} />
      <Fade from={55} y={10} style={{position:'absolute',left:36,top:38}}><div style={{fontSize: 27, color: C.red, letterSpacing: 4, fontWeight: 800}}>CLAIM</div></Fade>
      <Fade from={67} y={10} style={{position:'absolute',left:36,top:92}}><div style={{fontSize: 45, fontWeight: 900}}>どこまで本当？</div></Fade>
      <div style={{position:'absolute',left:35,top:185,width:830,height:3,background:C.line}}><div style={{height:3,width:`${slash*830}px`,background:C.red,boxShadow:`0 0 22px ${C.red}88`}}/></div>
    </div>
    <Fade from={110}><div style={{position:'absolute',left:70,top:1080,fontSize:26,color:C.mid,lineHeight:1.6,width:880}}>ツールの宣伝ではなく、2026年の仕組みと条件から確認します。</div></Fade>
    <div style={{position:'absolute',right:70,bottom:118,fontSize:18,color:C.red,letterSpacing:3}}>01 / TRUTH CHECK</div>
  </Shell>;
};

const SceneAutomation = () => <Shell duration={scenes[1]}>
  <Fade from={4}><div style={{position:'absolute',left:70,top:210,fontSize:31,color:C.cyan,fontWeight:800,letterSpacing:3}}>2026年、ここまでは現実</div></Fade>
  <Fade from={18}><div style={{position:'absolute',left:70,top:275,width:920,fontSize:67,lineHeight:1.08,fontWeight:900}}>制作と投稿は、<br/>かなり自動化できる。</div></Fade>
  <Pill text="台本" x={70} y={530} delay={38} />
  <Pill text="画像 / 映像" x={385} y={530} delay={48} w={310} />
  <Pill text="日本語音声" x={70} y={640} delay={58} w={310} />
  <Pill text="字幕" x={425} y={640} delay={68} />
  <Pill text="BGM" x={70} y={750} delay={78} />
  <Pill text="予約・自動投稿" x={385} y={750} delay={88} w={340} />
  <Fade from={116}><div style={{position:'absolute',left:70,top:930,width:920,height:320,borderRadius:34,border:`1px solid ${C.line}`,background:C.card,padding:'38px 40px'}}>
    <div style={{fontSize:22,color:C.mid,letterSpacing:4,marginBottom:18}}>AUTOMATION PIPELINE</div>
    <div style={{fontSize:35,lineHeight:1.55,fontWeight:700}}>Idea → Script → Voice → Visual → Edit → Publish</div>
    <div style={{marginTop:28,fontSize:25,lineHeight:1.55,color:C.mid}}>「顔を出さない」「撮影しない」は、すでに技術的に可能です。</div>
  </div></Fade>
  <div style={{position:'absolute',right:70,bottom:118,fontSize:18,color:C.cyan,letterSpacing:3}}>02 / AUTOMATION</div>
</Shell>;

const FactRow = ({num, title, sub, y, delay, color = C.green}) => <Fade from={delay} y={18} style={{position:'absolute',left:70,top:y}}>
  <div style={{width:940,height:150,borderRadius:28,border:`1px solid ${color}44`,background:'rgba(9,14,20,.9)',display:'flex',alignItems:'center',padding:'0 34px',gap:28}}>
    <div style={{width:72,height:72,borderRadius:20,border:`1px solid ${color}66`,display:'grid',placeItems:'center',fontSize:26,fontWeight:900,color}}>{num}</div>
    <div><div style={{fontSize:32,fontWeight:850,marginBottom:10}}>{title}</div><div style={{fontSize:22,color:C.mid}}>{sub}</div></div>
  </div>
</Fade>;

const SceneRules = () => <Shell duration={scenes[2]} accent={C.green}>
  <Fade from={4}><div style={{position:'absolute',left:70,top:205,fontSize:29,color:C.green,fontWeight:800,letterSpacing:3}}>でも、自動投稿 ≠ 自動収益</div></Fade>
  <Fade from={18}><div style={{position:'absolute',left:70,top:270,width:930,fontSize:64,lineHeight:1.12,fontWeight:900}}>TikTok側にも<br/>「通過条件」がある。</div></Fade>
  <FactRow num="01" title="高品質" sub="雑な量産ではなく、視聴価値のある内容" y={520} delay={42} />
  <FactRow num="02" title="オリジナル" sub="Creator Rewardsの対象動画で重視" y={700} delay={58} />
  <FactRow num="03" title="1分以上" sub="Creator Rewards対象動画の基本条件" y={880} delay={74} />
  <FactRow num="04" title="AIの透明性" sub="AI生成・大幅編集は適切な開示が重要" y={1060} delay={90} color={C.gold} />
  <Fade from={120}><div style={{position:'absolute',left:70,top:1280,width:940,borderLeft:`3px solid ${C.green}`,paddingLeft:28,fontSize:23,lineHeight:1.65,color:C.mid}}>出典ベース：TikTok Help Center / Creator Rewards / AI-generated content guidance。<br/>条件や提供地域は変更される可能性があります。</div></Fade>
  <div style={{position:'absolute',right:70,bottom:118,fontSize:18,color:C.green,letterSpacing:3}}>03 / PLATFORM REALITY</div>
</Shell>;

const SceneBoundary = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame,[15,90],[0,1],{...clamp,easing:Easing.bezier(.16,1,.3,1)});
  return <Shell duration={scenes[3]} accent={C.gold}>
    <Fade from={4}><div style={{position:'absolute',left:70,top:240,fontSize:65,lineHeight:1.12,fontWeight:900}}>AIが短縮するのは、<br/><span style={{color:C.gold}}>制作と配布の時間。</span></div></Fade>
    <div style={{position:'absolute',left:70,top:560,width:940,height:320,borderRadius:36,border:`1px solid ${C.line}`,background:C.card,overflow:'hidden'}}>
      <div style={{position:'absolute',left:0,top:0,width:`${x*50}%`,height:'100%',background:'linear-gradient(90deg,rgba(219,200,148,.16),rgba(219,200,148,.04))'}} />
      <div style={{position:'absolute',left:'50%',top:0,width:2,height:'100%',background:C.line}} />
      <div style={{position:'absolute',left:40,top:42,fontSize:23,color:C.gold,letterSpacing:3}}>AUTOMATABLE</div>
      <div style={{position:'absolute',left:40,top:105,fontSize:34,fontWeight:850,lineHeight:1.55}}>台本<br/>音声<br/>映像<br/>投稿</div>
      <div style={{position:'absolute',left:545,top:42,fontSize:23,color:C.red,letterSpacing:3}}>NOT AUTOMATIC</div>
      <div style={{position:'absolute',left:545,top:105,fontSize:34,fontWeight:850,lineHeight:1.55}}>需要<br/>視聴維持<br/>購入<br/>改善</div>
    </div>
    <Fade from={100}><div style={{position:'absolute',left:70,top:1020,width:910,fontSize:31,lineHeight:1.6,color:C.silver}}>ここを混同すると、動画だけ増えて「なぜ売れないのか」が見えなくなります。</div></Fade>
    <div style={{position:'absolute',right:70,bottom:118,fontSize:18,color:C.gold,letterSpacing:3}}>04 / THE BOUNDARY</div>
  </Shell>;
};

const FunnelNode = ({label, x, y, delay, color=C.cyan}) => <Fade from={delay} y={14} style={{position:'absolute',left:x,top:y}}>
  <div style={{width:270,height:96,borderRadius:24,border:`1px solid ${color}55`,background:'rgba(9,14,20,.92)',display:'grid',placeItems:'center',fontSize:28,fontWeight:850,boxShadow:'0 14px 35px rgba(0,0,0,.22)'}}>{label}</div>
</Fade>;

const SceneFunnel = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame,[55,155],[0,1],clamp);
  return <Shell duration={scenes[4]}>
    <Fade from={3}><div style={{position:'absolute',left:70,top:205,fontSize:29,color:C.cyan,fontWeight:800,letterSpacing:3}}>本当に見るべき数字</div></Fade>
    <Fade from={18}><div style={{position:'absolute',left:70,top:270,width:930,fontSize:65,lineHeight:1.1,fontWeight:900}}>動画の本数ではなく、<br/>収益ループ。</div></Fade>
    <svg width="1080" height="1920" style={{position:'absolute',inset:0}}>
      <path d="M 205 655 C 420 650, 420 815, 610 815 C 810 815, 810 980, 610 980 C 420 980, 420 1145, 205 1145" fill="none" stroke="rgba(102,226,255,.75)" strokeWidth="3" strokeDasharray="1200" strokeDashoffset={(1-draw)*1200}/>
      <path d="M 340 1380 C 535 1300, 745 1300, 860 1380" fill="none" stroke="rgba(120,227,173,.55)" strokeWidth="2.5" strokeDasharray="600" strokeDashoffset={(1-draw)*600}/>
    </svg>
    <FunnelNode label="需要" x={70} y={610} delay={40}/>
    <FunnelNode label="視聴維持" x={570} y={765} delay={58}/>
    <FunnelNode label="サイト流入" x={570} y={930} delay={76}/>
    <FunnelNode label="商品 / 行動" x={70} y={1095} delay={94}/>
    <Fade from={122}><div style={{position:'absolute',left:70,top:1320,width:940,height:190,borderRadius:30,border:`1px solid ${C.green}44`,background:'rgba(8,22,17,.55)',padding:'32px 36px'}}>
      <div style={{fontSize:23,color:C.green,letterSpacing:3,marginBottom:15}}>FEEDBACK LOOP</div>
      <div style={{fontSize:31,fontWeight:850}}>計測 → 改善 → 次の動画</div>
      <div style={{fontSize:22,color:C.mid,marginTop:13}}>伸びた構造だけを残す。</div>
    </div></Fade>
    <div style={{position:'absolute',right:70,bottom:118,fontSize:18,color:C.cyan,letterSpacing:3}}>05 / REVENUE LOOP</div>
  </Shell>;
};

const SceneVolume = () => <Shell duration={scenes[5]} accent={C.red}>
  <Fade from={3}><div style={{position:'absolute',left:70,top:230,fontSize:70,lineHeight:1.1,fontWeight:900}}>AI動画を100本作る。<br/><span style={{color:C.red}}>それだけでは足りない。</span></div></Fade>
  <Fade from={35}><div style={{position:'absolute',left:70,top:520,width:940,height:490,borderRadius:36,border:`1px solid ${C.line}`,background:C.card,padding:'44px 42px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',height:260}}>
      {[34,82,55,95,42,72,60,88,47,68].map((h,i)=><div key={i} style={{width:58,height:h*2.25,background:i===3?`linear-gradient(${C.cyan},${C.cyan2})`:'linear-gradient(rgba(203,211,221,.32),rgba(203,211,221,.07))',borderRadius:'12px 12px 4px 4px',boxShadow:i===3?`0 0 25px ${C.cyan}55`:'none'}}/>)}
    </div>
    <div style={{marginTop:38,fontSize:25,color:C.mid,lineHeight:1.5}}>大量生成より「何が刺さったか」を学習する方が重要。</div>
  </Fade>
  <Fade from={90}><div style={{position:'absolute',left:70,top:1140,fontSize:31,lineHeight:1.65,width:900,color:C.silver}}>自動化の目的は、雑に増やすことではなく、<br/>検証回数を増やして勝ち筋を見つけること。</div></Fade>
  <div style={{position:'absolute',right:70,bottom:118,fontSize:18,color:C.red,letterSpacing:3}}>06 / QUALITY > VOLUME</div>
</Shell>;

const SceneVector = () => <Shell duration={scenes[6]} accent={C.cyan}>
  <Fade from={4}><div style={{position:'absolute',left:70,top:210,fontSize:27,color:C.cyan,fontWeight:800,letterSpacing:4}}>VECTOR PRAXIS</div></Fade>
  <Fade from={18}><div style={{position:'absolute',left:70,top:275,width:930,fontSize:69,lineHeight:1.1,fontWeight:900}}>ツール紹介の奥にある、<br/>「構造」を見る。</div></Fade>
  <Fade from={46}><div style={{position:'absolute',left:70,top:540,width:940,fontSize:31,lineHeight:1.7,color:C.silver}}>AI副業を、魔法のツールではなく<br/>制作 → 流入 → 販売 → 改善<br/>という運用システムとして整理しています。</div></Fade>
  <Fade from={80}><div style={{position:'absolute',left:70,top:850,width:940,height:390,borderRadius:38,border:`1px solid ${C.cyan}44`,background:'linear-gradient(145deg,rgba(8,30,38,.9),rgba(8,12,18,.94))',padding:'42px'}}>
    <div style={{fontSize:20,color:C.mid,letterSpacing:3,marginBottom:20}}>EXISTING VECTOR PRAXIS GUIDE</div>
    <div style={{fontSize:38,fontWeight:900,lineHeight:1.35}}>AI副業完全実装マニュアル<br/>スマホで作るAI収益システム</div>
    <div style={{fontSize:22,color:C.mid,lineHeight:1.55,marginTop:28}}>特定の収益を保証する内容ではありません。<br/>ツール・規約・市場環境は変化します。</div>
  </Fade>
  <Fade from={125}><div style={{position:'absolute',left:70,top:1370,fontSize:24,color:C.cyan,letterSpacing:1}}>note.com/deft_eel6718</div></Fade>
  <div style={{position:'absolute',right:70,bottom:118,fontSize:18,color:C.cyan,letterSpacing:3}}>07 / GO DEEPER</div>
</Shell>;

const SceneCTA = () => <Shell duration={scenes[7]} accent={C.cyan}>
  <Fade from={2}><div style={{position:'absolute',left:70,top:505,width:940,textAlign:'center',fontSize:28,color:C.mid,letterSpacing:5}}>DON'T CHASE THE TOOL</div></Fade>
  <Fade from={10}><div style={{position:'absolute',left:70,top:585,width:940,textAlign:'center',fontSize:72,fontWeight:900,lineHeight:1.15}}>答えを急がず、<br/><span style={{color:C.cyan}}>仕組みから見る。</span></div></Fade>
  <Fade from={28}><div style={{position:'absolute',left:70,top:840,width:940,textAlign:'center',fontSize:34,fontWeight:800}}>Vector Praxis</div></Fade>
  <Fade from={38}><div style={{position:'absolute',left:70,top:910,width:940,textAlign:'center',fontSize:23,color:C.mid}}>AI副業・自動化・収益構造を日本語で検証</div></Fade>
</Shell>;

const VectorFacelessTruth = () => {
  let start = 0;
  const comps = [SceneHook, SceneAutomation, SceneRules, SceneBoundary, SceneFunnel, SceneVolume, SceneVector, SceneCTA];
  const items = comps.map((Comp, i) => {
    const from = start;
    start += scenes[i];
    return <Sequence key={i} from={from} durationInFrames={scenes[i]}><Comp /></Sequence>;
  });
  return <AbsoluteFill style={{background:C.bg}}>
    {items}
    <Audio src={staticFile('narration.wav')} volume={1.0} />
    <Audio src={staticFile('bgm.wav')} volume={0.105} />
  </AbsoluteFill>;
};

const Root = () => <Composition id="VectorFacelessTruth" component={VectorFacelessTruth} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />;
registerRoot(Root);
