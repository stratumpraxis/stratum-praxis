import React from 'react';
import {
  AbsoluteFill,
  Composition,
  interpolate,
  OffthreadVideo,
  registerRoot,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {Audio} from '@remotion/media';
import {MetaBar, TelopHeadline, safeFrameStyle} from './telop.jsx';
import {TELOP_COPY} from './telop-spec.mjs';

const BG = '#05070b';
const PANEL = '#0b1119e8';
const CYAN = '#77ece5';
const SILVER = '#dce6eb';
const GOLD = '#ffd166';
const RED = '#ff625f';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const fade = (frame, a, b) => interpolate(frame, [a, b], [0, 1], clamp);

const Grid = ({opacity = 0.12}) => <AbsoluteFill style={{
  opacity,
  backgroundImage: 'linear-gradient(rgba(119,236,229,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(119,236,229,.16) 1px, transparent 1px)',
  backgroundSize: '66px 66px',
  maskImage: 'linear-gradient(to bottom, transparent 2%, black 20%, black 80%, transparent 98%)',
}}/>;

const Glow = ({x, y, size = 520, color = CYAN, opacity = 0.14}) => <div style={{
  position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%',
  background: color, opacity, filter: 'blur(125px)',
}}/>;

const CaptionLayer = ({spec, accent = CYAN}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'relative', zIndex: 10, opacity: fade(frame, 3, 15)}}>
    <MetaBar spec={spec} color={SILVER}/>
    <TelopHeadline spec={spec} color="#fff" accent={accent} marginTop={42} maxWidth={950}/>
  </div>;
};

const Metric = ({label, value, accent = CYAN, delay = 8}) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 15);
  return <div style={{opacity: p, padding: '22px 25px', borderRadius: 22, background: PANEL, border: `1px solid ${accent}66`, boxShadow: '0 18px 70px #0008'}}>
    <div style={{fontSize: 18, letterSpacing: 2.6, color: SILVER}}>{label}</div>
    <div style={{fontSize: 49, fontWeight: 950, color: accent, marginTop: 8}}>{value}</div>
  </div>;
};

const SearchCard = ({y, text, delay}) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 13);
  const x = interpolate(frame, [delay, delay + 22], [80, 0], clamp);
  return <div style={{position: 'absolute', left: 105, right: 105, top: y, transform: `translateX(${x}px)`, opacity: p, height: 92, borderRadius: 26, background: '#0b1520e8', border: '1px solid #ffffff24', display: 'flex', alignItems: 'center', gap: 20, padding: '0 26px', boxShadow: '0 20px 60px #0008'}}>
    <div style={{width: 31, height: 31, borderRadius: '50%', border: `3px solid ${CYAN}`, position: 'relative'}}><div style={{position: 'absolute', width: 17, height: 4, background: CYAN, transform: 'rotate(45deg)', right: -12, bottom: -5, borderRadius: 5}}/></div>
    <div style={{fontSize: 29, fontWeight: 800, color: '#f8fbfc'}}>{text}</div>
  </div>;
};

const ClipMoney = () => {
  const frame = useCurrentFrame();
  const aiOverview = interpolate(frame, [18, 175], [0, 2.5], clamp);
  const aiMode = interpolate(frame, [40, 190], [0, 1], clamp);
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 68% 22%, #153340 0%, #071018 42%, #030509 100%)', overflow: 'hidden'}}>
    <Grid/><Glow x={620} y={-120}/><Glow x={-220} y={1050} color={GOLD} opacity={0.08}/>
    <SearchCard y={270} text="best AI for work" delay={5}/>
    <SearchCard y={385} text="compare AI assistants" delay={23}/>
    <SearchCard y={500} text="AI search for research" delay={42}/>
    <div style={{position: 'absolute', left: 88, right: 88, bottom: 245, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
      <div style={{padding: 30, borderRadius: 28, background: '#07131ce8', border: `1px solid ${CYAN}66`}}><div style={{fontSize: 20, color: SILVER, letterSpacing: 2}}>AI OVERVIEWS</div><div style={{fontSize: 72, color: CYAN, fontWeight: 950, marginTop: 12}}>{aiOverview.toFixed(1)}B</div><div style={{fontSize: 18, color: SILVER}}>monthly users</div></div>
      <div style={{padding: 30, borderRadius: 28, background: '#171205e8', border: `1px solid ${GOLD}66`}}><div style={{fontSize: 20, color: SILVER, letterSpacing: 2}}>AI MODE</div><div style={{fontSize: 72, color: GOLD, fontWeight: 950, marginTop: 12}}>{aiMode.toFixed(1)}B+</div><div style={{fontSize: 18, color: SILVER}}>monthly users</div></div>
    </div>
  </AbsoluteFill>;
};

const ClipIntent = () => {
  const frame = useCurrentFrame();
  const nodes = Array.from({length: 16}, (_, i) => ({x: 125 + (i % 4) * 250, y: 390 + Math.floor(i / 4) * 235}));
  const sweep = interpolate(frame, [0, 210], [-130, 2050], clamp);
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 45% 50%, #1e1823 0%, #0c0a10 45%, #040407 100%)', overflow: 'hidden'}}>
    <Grid opacity={0.08}/><Glow x={-100} y={300} color={RED} opacity={0.13}/><Glow x={650} y={930} color={CYAN} opacity={0.08}/>
    {nodes.map((n, i) => {
      const p = fade(frame, 5 + i * 4, 18 + i * 4);
      const hot = i === 6 || i === 9 || i === 14;
      return <div key={i} style={{position: 'absolute', left: n.x, top: n.y, width: 72, height: 72, borderRadius: 16, background: hot ? '#291014' : '#0c1720', border: `2px solid ${hot ? RED : CYAN}77`, opacity: p, boxShadow: `0 0 ${hot ? 34 : 20}px ${hot ? RED : CYAN}33`, display: 'grid', placeItems: 'center'}}><div style={{width: 17, height: 17, borderRadius: '50%', background: hot ? RED : CYAN}}/></div>;
    })}
    <div style={{position: 'absolute', left: 0, right: 0, top: sweep, height: 3, background: `linear-gradient(90deg, transparent, ${RED}, transparent)`, boxShadow: `0 0 34px ${RED}`}}/>
    <div style={{position: 'absolute', left: 92, right: 92, bottom: 250, padding: '28px 30px', borderRadius: 26, background: '#140c11e8', border: `1px solid ${RED}88`}}>
      <div style={{fontSize: 18, color: SILVER, letterSpacing: 2.5}}>SAFETY EVALUATION</div>
      <div style={{fontSize: 47, color: '#fff', fontWeight: 950, marginTop: 10}}>UNAUTHORIZED ACCESS</div>
      <div style={{fontSize: 22, color: RED, marginTop: 8, fontWeight: 800}}>REAL COMPUTER SYSTEMS</div>
    </div>
  </AbsoluteFill>;
};

const ClipScale = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [20, 185], [0, 1], clamp);
  return <AbsoluteFill style={{background: 'linear-gradient(150deg, #061019 0%, #0a111b 48%, #120b0d 100%)', overflow: 'hidden'}}>
    <Grid opacity={0.09}/><Glow x={-180} y={280}/><Glow x={720} y={790} color={RED} opacity={0.11}/>
    <div style={{position: 'absolute', left: 95, right: 95, top: 330, padding: '30px', borderRadius: 26, background: '#08111ae8', border: '1px solid #ffffff22'}}>
      <div style={{fontSize: 20, color: SILVER, letterSpacing: 3}}>MODEL ACCESS / CURSOR</div>
      <div style={{marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 16, alignItems: 'center'}}>
        <div style={{height: 180, borderRadius: 24, background: '#0d1b25', border: `1px solid ${CYAN}66`, display: 'grid', placeItems: 'center'}}><div style={{textAlign: 'center'}}><div style={{fontSize: 24, color: CYAN, letterSpacing: 3}}>OPENAI</div><div style={{fontSize: 58, color: '#fff', fontWeight: 950, marginTop: 12}}>MODELS</div></div></div>
        <div style={{height: 6, borderRadius: 6, background: '#ffffff17', overflow: 'hidden'}}><div style={{height: '100%', width: `${(1-progress) * 100}%`, background: CYAN}}/></div>
        <div style={{height: 180, borderRadius: 24, background: '#171014', border: `1px solid ${RED}66`, display: 'grid', placeItems: 'center'}}><div style={{textAlign: 'center'}}><div style={{fontSize: 24, color: RED, letterSpacing: 3}}>CURSOR</div><div style={{fontSize: 32, color: '#fff', fontWeight: 900, marginTop: 12}}>POST-ACQUISITION</div></div></div>
      </div>
    </div>
    <div style={{position: 'absolute', left: 115, right: 115, bottom: 320, height: 145, borderRadius: 25, background: '#1c1209e8', border: `1px solid ${GOLD}77`, display: 'grid', placeItems: 'center'}}>
      <div style={{textAlign: 'center'}}><div style={{fontSize: 18, color: SILVER, letterSpacing: 3}}>PROPOSED SHUTOFF</div><div style={{fontSize: 52, color: GOLD, fontWeight: 950, marginTop: 10}}>NOV 12, 2026</div></div>
    </div>
  </AbsoluteFill>;
};

const GeneratedBackdrop = ({src, zoom = 1.05, dark = 0.18}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 210], [1, zoom], clamp);
  return <AbsoluteFill style={{overflow: 'hidden', background: BG}}>
    <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`}}/>
    <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(3,5,9,${dark + .14}) 0%, rgba(3,5,9,.03) 48%, rgba(3,5,9,${dark + .4}) 100%)`}}/>
  </AbsoluteFill>;
};

const HookScene = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedBackdrop src="generated/clip-money.mp4" zoom={1.08} dark={0.30}/>
  <CaptionLayer spec={TELOP_COPY.hook} accent={GOLD}/>
  <div style={{position: 'absolute', left: 74, right: 74, bottom: 205, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11}}>
    {['SEARCH', 'AGENTS', 'PLATFORMS'].map((x, i) => <div key={x} style={{padding: '18px 6px', textAlign: 'center', borderRadius: 16, background: PANEL, border: `1px solid ${[CYAN, RED, GOLD][i]}55`, fontSize: 18, letterSpacing: 1.2, fontWeight: 900, color: [CYAN, RED, GOLD][i]}}>{x}</div>)}
  </div>
</AbsoluteFill>;

const SearchScene = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedBackdrop src="generated/clip-money.mp4" zoom={1.04}/>
  <CaptionLayer spec={TELOP_COPY.search}/>
  <div style={{position: 'absolute', left: 75, right: 75, bottom: 205, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
    <Metric label="AI OVERVIEWS" value="2.5B+"/>
    <Metric label="AI MODE" value="1B+" accent={GOLD} delay={24}/>
  </div>
</AbsoluteFill>;

const SystemsScene = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedBackdrop src="generated/clip-intent.mp4" zoom={1.05} dark={0.28}/>
  <CaptionLayer spec={TELOP_COPY.systems} accent={RED}/>
  <div style={{position: 'absolute', left: 76, right: 76, bottom: 205, padding: '24px 28px', borderRadius: 22, background: '#130b10e8', border: `1px solid ${RED}66`, fontSize: 23, lineHeight: 1.45, color: SILVER}}>
    Anthropic says the incidents happened during <b style={{color: '#fff'}}>cybersecurity evaluations</b>; safeguards were intentionally removed and internet access was misconfigured.
  </div>
</AbsoluteFill>;

const CursorScene = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedBackdrop src="generated/clip-scale.mp4" zoom={1.04}/>
  <CaptionLayer spec={TELOP_COPY.cursor} accent={GOLD}/>
  <div style={{position: 'absolute', left: 76, right: 76, bottom: 205, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
    <Metric label="CHANGE OF CONTROL" value="SPACEX" accent={RED}/>
    <Metric label="PROPOSED DATE" value="NOV 12" accent={GOLD} delay={25}/>
  </div>
</AbsoluteFill>;

const EndScene = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 24, 60);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
    <GeneratedBackdrop src="generated/clip-intent.mp4" zoom={1.09} dark={0.38}/>
    <CaptionLayer spec={TELOP_COPY.end} accent={CYAN}/>
    <div style={{position: 'absolute', left: 115, right: 115, top: 855, opacity: p}}>
      {['SEARCH', 'SOFTWARE', 'REAL-WORLD ACTION'].map((x, i) => <div key={x} style={{marginTop: i ? 18 : 0, padding: '22px 26px', borderRadius: 20, background: '#08131de8', border: `1px solid ${[CYAN, GOLD, RED][i]}55`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><span style={{fontSize: 26, fontWeight: 900, color: '#fff'}}>{x}</span><span style={{fontSize: 27, color: [CYAN, GOLD, RED][i]}}>→</span></div>)}
    </div>
    <div style={{position: 'absolute', left: 76, right: 76, bottom: 195, textAlign: 'center', fontSize: 22, letterSpacing: 2.2, color: SILVER}}>FOLLOW FOR THE SIGNAL — NOT THE NOISE.</div>
  </AbsoluteFill>;
};

const ForwelleShort = () => <AbsoluteFill style={{background: BG}}>
  <Sequence from={0} durationInFrames={210}><HookScene/></Sequence>
  <Sequence from={210} durationInFrames={210}><SearchScene/></Sequence>
  <Sequence from={420} durationInFrames={210}><SystemsScene/></Sequence>
  <Sequence from={630} durationInFrames={210}><CursorScene/></Sequence>
  <Sequence from={840} durationInFrames={210}><EndScene/></Sequence>
  <Audio src={staticFile('ambient-bed.wav')} volume={0.40}/>
  <Audio src={staticFile('narration.mp3')} volume={1.0}/>
  {[0, 210, 420, 630, 840].map((f) => <Sequence key={f} from={f} durationInFrames={20}><Audio src={staticFile('impact.wav')} volume={0.48}/></Sequence>)}
  {[190, 400, 610, 820].map((f) => <Sequence key={f} from={f} durationInFrames={22}><Audio src={staticFile('whoosh.wav')} volume={0.32}/></Sequence>)}
</AbsoluteFill>;

const Root = () => <>
  <Composition id="ClipMoney" component={ClipMoney} durationInFrames={210} fps={30} width={1080} height={1920}/>
  <Composition id="ClipIntent" component={ClipIntent} durationInFrames={210} fps={30} width={1080} height={1920}/>
  <Composition id="ClipScale" component={ClipScale} durationInFrames={210} fps={30} width={1080} height={1920}/>
  <Composition id="ForwelleShort" component={ForwelleShort} durationInFrames={1050} fps={30} width={1080} height={1920}/>
</>;

registerRoot(Root);
