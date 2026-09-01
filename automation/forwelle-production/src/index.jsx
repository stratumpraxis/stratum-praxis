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

const BG = '#050a10';
const PANEL = '#0b141ddd';
const CYAN = '#7ce8e1';
const SILVER = '#d8e2e8';
const GOLD = '#ffc857';
const RED = '#ff655f';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const fade = (frame, a, b) => interpolate(frame, [a, b], [0, 1], clamp);
const pct = (frame, a, b) => interpolate(frame, [a, b], [0, 1], clamp);

const Grid = ({opacity = 0.14}) => <AbsoluteFill style={{
  opacity,
  backgroundImage: 'linear-gradient(rgba(124,232,225,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(124,232,225,.18) 1px, transparent 1px)',
  backgroundSize: '72px 72px',
  maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 75%, transparent 100%)',
}}/>;

const Glow = ({x, y, size = 480, color = CYAN, opacity = 0.16}) => <div style={{
  position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%',
  background: color, opacity, filter: 'blur(120px)',
}}/>;

const ChatBubble = ({x, y, width, delay, direction = 1, accent = CYAN}) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 18);
  const dx = interpolate(frame, [delay, delay + 38], [direction * 90, 0], clamp);
  return <div style={{
    position: 'absolute', left: x, top: y, width, height: 116, padding: '20px 24px', borderRadius: 28,
    background: '#0d1823ee', border: `1px solid ${accent}55`, boxShadow: `0 22px 70px #0009`,
    opacity: p, transform: `translateX(${dx}px)`,
  }}>
    <div style={{height: 9, width: '42%', borderRadius: 8, background: `${accent}bb`, marginBottom: 15}}/>
    <div style={{height: 8, width: '84%', borderRadius: 8, background: '#dce7ec55', marginBottom: 11}}/>
    <div style={{height: 8, width: '64%', borderRadius: 8, background: '#dce7ec3f'}}/>
  </div>;
};

const ClipMoney = () => {
  const frame = useCurrentFrame();
  const amount = interpolate(frame, [14, 182], [0, 1], clamp);
  const ring = interpolate(frame, [0, 210], [0, 360], clamp);
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 62% 25%, #123246 0%, #07111b 38%, #03070c 100%)', overflow: 'hidden'}}>
    <Grid/>
    <Glow x={560} y={-80} color={CYAN}/><Glow x={-180} y={900} color={GOLD} opacity={0.10}/>
    <ChatBubble x={90} y={250} width={640} delay={5}/>
    <ChatBubble x={330} y={410} width={650} delay={30} direction={-1} accent={GOLD}/>
    <ChatBubble x={120} y={570} width={720} delay={57}/>
    <div style={{position: 'absolute', left: 105, right: 105, bottom: 300, padding: '34px 38px', borderRadius: 32, background: '#07111be8', border: '1px solid #ffffff24', boxShadow: '0 26px 90px #000b'}}>
      <div style={{fontSize: 22, letterSpacing: 4, color: SILVER}}>ANNUALIZED AD RUN RATE</div>
      <div style={{fontSize: 112, lineHeight: 1, fontWeight: 950, color: '#fff', marginTop: 16}}>${amount.toFixed(2)}B</div>
      <div style={{marginTop: 25, height: 8, borderRadius: 8, background: '#ffffff18', overflow: 'hidden'}}><div style={{height: '100%', width: `${amount * 100}%`, background: `linear-gradient(90deg, ${CYAN}, ${GOLD})`}}/></div>
    </div>
    <div style={{position: 'absolute', right: 88, top: 112, width: 170, height: 170, borderRadius: '50%', border: `2px solid ${CYAN}55`, transform: `rotate(${ring}deg)`}}><div style={{position: 'absolute', left: 76, top: -8, width: 15, height: 15, borderRadius: '50%', background: CYAN, boxShadow: `0 0 28px ${CYAN}`}}/></div>
  </AbsoluteFill>;
};

const ClipIntent = () => {
  const frame = useCurrentFrame();
  const steps = ['ASK', 'COMPARE', 'CHOOSE', 'BUY'];
  const progress = interpolate(frame, [18, 185], [0, 1], clamp);
  return <AbsoluteFill style={{background: 'linear-gradient(155deg, #040910 0%, #0a1d28 48%, #071018 100%)', overflow: 'hidden'}}>
    <Grid opacity={0.11}/><Glow x={-120} y={220}/><Glow x={700} y={980} color={GOLD} opacity={0.08}/>
    <div style={{position: 'absolute', left: 120, top: 300, bottom: 330, width: 5, background: '#ffffff17', borderRadius: 5}}>
      <div style={{height: `${progress * 100}%`, width: '100%', background: CYAN, boxShadow: `0 0 22px ${CYAN}`}}/>
    </div>
    {steps.map((label, i) => {
      const y = 280 + i * 260;
      const local = fade(frame, 18 + i * 35, 34 + i * 35);
      const active = Math.max(0, Math.min(1, progress * 4 - i));
      return <div key={label} style={{position: 'absolute', left: 82, right: 90, top: y, display: 'grid', gridTemplateColumns: '86px 1fr', gap: 26, alignItems: 'center', opacity: local}}>
        <div style={{width: 82, height: 82, borderRadius: '50%', display: 'grid', placeItems: 'center', background: active > .35 ? CYAN : '#0b1720', color: active > .35 ? '#061016' : SILVER, border: `2px solid ${CYAN}88`, fontWeight: 950, fontSize: 24}}>{i + 1}</div>
        <div style={{padding: '27px 31px', borderRadius: 25, background: '#08131ddd', border: '1px solid #ffffff28', fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: 3}}>{label}</div>
      </div>;
    })}
    <div style={{position: 'absolute', right: 85, bottom: 155, padding: '19px 26px', borderRadius: 18, background: '#241b08e8', border: `1px solid ${GOLD}aa`, color: GOLD, fontSize: 25, fontWeight: 900, letterSpacing: 2}}>SPONSORED / CLEARLY LABELED</div>
  </AbsoluteFill>;
};

const ClipScale = () => {
  const frame = useCurrentFrame();
  const orbit = interpolate(frame, [0, 210], [0, 330], clamp);
  const nodes = Array.from({length: 22}, (_, i) => ({
    a: (i / 22) * Math.PI * 2,
    r: 220 + (i % 4) * 42,
    s: 11 + (i % 3) * 5,
  }));
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 48%, #153243 0%, #08121a 40%, #03070b 78%)', overflow: 'hidden'}}>
    <Grid opacity={0.08}/><Glow x={320} y={520} size={600} opacity={0.12}/>
    <div style={{position: 'absolute', left: 140, top: 410, width: 800, height: 800, borderRadius: '50%', border: '2px solid #ffffff16', transform: `rotate(${orbit * 0.12}deg)`}}/>
    <div style={{position: 'absolute', left: 225, top: 495, width: 630, height: 630, borderRadius: '50%', border: `2px solid ${CYAN}55`, boxShadow: `inset 0 0 80px ${CYAN}12`}}/>
    {nodes.map((n, i) => {
      const a = n.a + orbit * Math.PI / 180 * (i % 2 ? 0.0025 : -0.002);
      const cx = 540 + Math.cos(a) * n.r;
      const cy = 810 + Math.sin(a) * n.r * 0.72;
      const p = fade(frame, 10 + i * 4, 24 + i * 4);
      return <div key={i} style={{position: 'absolute', left: cx - n.s / 2, top: cy - n.s / 2, width: n.s, height: n.s, borderRadius: '50%', background: i % 5 === 0 ? GOLD : CYAN, opacity: p, boxShadow: `0 0 26px ${i % 5 === 0 ? GOLD : CYAN}`}}/>;
    })}
    <div style={{position: 'absolute', left: 110, right: 110, top: 680, textAlign: 'center'}}>
      <div style={{fontSize: 108, fontWeight: 950, color: '#fff'}}>1B+</div>
      <div style={{fontSize: 28, fontWeight: 800, letterSpacing: 5, color: SILVER}}>WEEKLY ACTIVE USERS</div>
    </div>
  </AbsoluteFill>;
};

const CaptionLayer = ({spec, accent = CYAN}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'relative', zIndex: 8, opacity: fade(frame, 4, 17)}}>
    <MetaBar spec={spec} color={SILVER}/>
    <TelopHeadline spec={spec} color="#fff" accent={accent} marginTop={42} maxWidth={950}/>
  </div>;
};

const GeneratedVideoBackdrop = ({src, zoom = 1.04, x = 0, dark = 0.18}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 210], [1, zoom], clamp);
  const shift = interpolate(frame, [0, 210], [0, x], clamp);
  return <AbsoluteFill style={{overflow: 'hidden', background: BG}}>
    <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${shift}px)`}}/>
    <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(3,7,12,${dark + 0.12}) 0%, rgba(3,7,12,0.02) 45%, rgba(3,7,12,${dark + 0.38}) 100%)`}}/>
  </AbsoluteFill>;
};

const FactCard = ({label, value, accent = CYAN, delay = 16}) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 16);
  return <div style={{opacity: p, padding: '23px 27px', borderRadius: 22, background: PANEL, border: `1px solid ${accent}66`, backdropFilter: 'blur(12px)'}}>
    <div style={{fontSize: 18, letterSpacing: 3, color: SILVER}}>{label}</div>
    <div style={{fontSize: 46, fontWeight: 950, color: accent, marginTop: 7}}>{value}</div>
  </div>;
};

const Hook = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedVideoBackdrop src="generated/clip-money.mp4" zoom={1.08}/>
  <CaptionLayer spec={TELOP_COPY.hook} accent={GOLD}/>
  <div style={{position: 'absolute', left: 76, right: 76, bottom: 215, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
    <FactCard label="REACHED IN" value="< 200 DAYS" accent={CYAN}/>
    <FactCard label="RUN RATE" value="$1B / YEAR" accent={GOLD} delay={28}/>
  </div>
</AbsoluteFill>;

const ScaleScene = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedVideoBackdrop src="generated/clip-scale.mp4" zoom={1.05} x={-8}/>
  <CaptionLayer spec={TELOP_COPY.scale}/>
  <div style={{position: 'absolute', left: 76, right: 76, bottom: 215, padding: '24px 28px', borderRadius: 23, background: PANEL, border: '1px solid #ffffff2d', fontSize: 24, color: '#dbe8ed', lineHeight: 1.45}}>
    OpenAI: more than <b style={{color: CYAN}}>1 billion weekly active users</b> and <b style={{color: GOLD}}>tens of thousands of advertisers</b>.
  </div>
</AbsoluteFill>;

const IntentScene = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedVideoBackdrop src="generated/clip-intent.mp4" zoom={1.03}/>
  <CaptionLayer spec={TELOP_COPY.intent} accent={GOLD}/>
  <div style={{position: 'absolute', left: 77, right: 77, bottom: 210, display: 'flex', gap: 13}}>
    {['EXPLORE', 'COMPARE', 'DECIDE'].map((x, i) => <div key={x} style={{flex: 1, padding: '18px 10px', textAlign: 'center', borderRadius: 16, background: '#08131de8', border: `1px solid ${i === 2 ? GOLD : CYAN}55`, color: i === 2 ? GOLD : SILVER, fontWeight: 900, letterSpacing: 1.5, fontSize: 19}}>{x}</div>)}
  </div>
</AbsoluteFill>;

const TrustScene = () => {
  const frame = useCurrentFrame();
  const split = pct(frame, 22, 72);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
    <GeneratedVideoBackdrop src="generated/clip-intent.mp4" zoom={1.07} x={10} dark={0.27}/>
    <CaptionLayer spec={TELOP_COPY.trust} accent={CYAN}/>
    <div style={{position: 'absolute', left: 78, right: 78, bottom: 225, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
      <div style={{padding: '28px', borderRadius: 24, background: '#07151ce8', border: `1px solid ${CYAN}77`, transform: `translateY(${(1-split)*24}px)`, opacity: split}}><div style={{color: CYAN, fontSize: 22, letterSpacing: 3}}>ANSWER</div><div style={{fontSize: 29, color: '#fff', marginTop: 10, fontWeight: 850}}>Independent response</div></div>
      <div style={{padding: '28px', borderRadius: 24, background: '#201907e8', border: `1px solid ${GOLD}77`, transform: `translateY(${(1-split)*24}px)`, opacity: split}}><div style={{color: GOLD, fontSize: 22, letterSpacing: 3}}>SPONSORED</div><div style={{fontSize: 29, color: '#fff', marginTop: 10, fontWeight: 850}}>Separate ad unit</div></div>
    </div>
  </AbsoluteFill>;
};

const End = () => <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: BG})}>
  <GeneratedVideoBackdrop src="generated/clip-money.mp4" zoom={1.03} x={-10} dark={0.36}/>
  <CaptionLayer spec={TELOP_COPY.end} accent={GOLD}/>
  <div style={{position: 'absolute', left: 76, right: 76, bottom: 255, padding: '24px 28px', borderRadius: 22, background: '#061019ed', border: '1px solid #ffffff38', fontSize: 21, lineHeight: 1.5, color: '#d9e6eb'}}>
    <div style={{fontWeight: 950, color: CYAN, letterSpacing: 2, marginBottom: 7}}>SOURCES / AUG 31, 2026</div>
    OpenAI — A milestone in expanding access to AI<br/>OpenAI — Ads in ChatGPT / Ad Policies
  </div>
  <div style={{position: 'absolute', left: 76, right: 76, bottom: 190, fontSize: 18, letterSpacing: 2.1, color: SILVER}}>FREE + GO MAY SEE ADS · PAID PLANS LISTED BY OPENAI DO NOT</div>
</AbsoluteFill>;

const Short = () => <AbsoluteFill>
  <Sequence from={0} durationInFrames={180}><Hook/></Sequence>
  <Sequence from={180} durationInFrames={210}><ScaleScene/></Sequence>
  <Sequence from={390} durationInFrames={210}><IntentScene/></Sequence>
  <Sequence from={600} durationInFrames={210}><TrustScene/></Sequence>
  <Sequence from={810} durationInFrames={240}><End/></Sequence>
  <Audio src={staticFile('ambient-bed.wav')} volume={0.13}/>
  <Audio src={staticFile('narration.mp3')} volume={1}/>
  {[0, 180, 390, 600, 810].map((f) => <Sequence key={f} from={f} durationInFrames={20}><Audio src={staticFile(f === 0 ? 'impact.wav' : 'whoosh.wav')} volume={f === 0 ? 0.34 : 0.22}/></Sequence>)}
</AbsoluteFill>;

const Root = () => <>
  <Composition id="ClipMoney" component={ClipMoney} durationInFrames={210} fps={30} width={1080} height={1920}/>
  <Composition id="ClipIntent" component={ClipIntent} durationInFrames={210} fps={30} width={1080} height={1920}/>
  <Composition id="ClipScale" component={ClipScale} durationInFrames={210} fps={30} width={1080} height={1920}/>
  <Composition id="ForwelleShort" component={Short} durationInFrames={1050} fps={30} width={1080} height={1920}/>
</>;

registerRoot(Root);
