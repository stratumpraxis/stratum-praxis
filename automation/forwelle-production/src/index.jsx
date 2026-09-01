import React from 'react';
import {AbsoluteFill, Composition, Img, interpolate, registerRoot, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {MetaBar, TelopHeadline, safeFrameStyle} from './telop.jsx';
import {TELOP_COPY} from './telop-spec.mjs';

const navy = '#06121d';
const cyan = '#7ce8e1';
const ice = '#dff8f5';
const red = '#ff6157';
const gold = '#ffc857';
const ink = '#102433';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const fade = (frame, a, b) => interpolate(frame, [a, b], [0, 1], clamp);

const GeneratedBackdrop = ({src, direction = 1, dark = 0.42, zoom = 1.14}) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{overflow: 'hidden', backgroundColor: navy}}>
    <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', scale: interpolate(frame, [0, 210], [1.025, zoom], clamp), translate: `${interpolate(frame, [0, 210], [direction * -22, direction * 24], clamp)}px ${interpolate(frame, [0, 210], [14, -22], clamp)}px`}}/>
    <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(4,12,20,${dark + 0.08}) 0%, rgba(4,12,20,0.08) 42%, rgba(4,12,20,${dark + 0.28}) 100%)`}}/>
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 42%, transparent 0%, rgba(2,8,14,0.10) 45%, rgba(2,8,14,0.76) 100%)'}}/>
  </AbsoluteFill>;
};

const LightSweep = ({color = cyan, delay = 0}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [delay, delay + 40], [-360, 1380], clamp);
  return <div style={{position: 'absolute', top: -200, left: x, width: 190, height: 2400, rotate: '14deg', background: `linear-gradient(90deg, transparent, ${color}24, transparent)`, filter: 'blur(12px)'}}/>;
};

const CaptionLayer = ({spec, accent = cyan}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'relative', zIndex: 5, opacity: fade(frame, 5, 20)}}>
    <MetaBar spec={spec} color={ice}/>
    <TelopHeadline spec={spec} color="#fff" accent={accent} marginTop={42} maxWidth={950}/>
  </div>;
};

const CountCard = ({label, value, color = cyan, delay = 20}) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 16);
  const rise = interpolate(frame, [delay, delay + 20], [28, 0], clamp);
  return <div style={{opacity: p, transform: `translateY(${rise}px)`, padding: '25px 28px', borderRadius: 24, background: '#06121dde', border: `1px solid ${color}88`, backdropFilter: 'blur(14px)'}}>
    <div style={{fontSize: 19, letterSpacing: 3, color: '#b8cbd4'}}>{label}</div>
    <div style={{fontSize: 54, fontWeight: 950, color, marginTop: 7}}>{value}</div>
  </div>;
};

const Hook = () => {
  const frame = useCurrentFrame();
  const glow = 14 + Math.abs(Math.sin(frame / 10)) * 18;
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-1.png" direction={1} dark={0.40} zoom={1.18}/>
    <LightSweep delay={16}/>
    <CaptionLayer spec={TELOP_COPY.hook}/>
    <div style={{position: 'absolute', left: 70, right: 70, bottom: 230, display: 'flex', gap: 18, alignItems: 'center', color: ice, fontSize: 24, letterSpacing: 2.5}}>
      <span style={{width: 13, height: 13, borderRadius: '50%', background: red, boxShadow: `0 0 ${glow}px ${red}`}}/>
      SUPPOSED TO BE ISOLATED
    </div>
  </AbsoluteFill>;
};

const Network = () => {
  const frame = useCurrentFrame();
  const trace = interpolate(frame, [30, 165], [0, 760], clamp);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-2.png" direction={-1} dark={0.38} zoom={1.17}/>
    <CaptionLayer spec={TELOP_COPY.network} accent={gold}/>
    <div style={{position: 'absolute', left: 78, right: 78, bottom: 220, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
      <CountCard label="AGENTS" value="~1,200" color={cyan} delay={26}/>
      <CountCard label="MESSAGES + FILES" value=">70K" color={gold} delay={50}/>
    </div>
    <div style={{position: 'absolute', left: 105, bottom: 475, width: 760, height: 5, borderRadius: 10, background: '#294655', overflow: 'hidden'}}><div style={{width: trace, height: '100%', background: cyan, boxShadow: `0 0 20px ${cyan}`}}/></div>
  </AbsoluteFill>;
};

const Attack = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 35, 56);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-3.png" direction={1} dark={0.45} zoom={1.16}/>
    <LightSweep color={red} delay={72}/>
    <CaptionLayer spec={TELOP_COPY.attack} accent={red}/>
    <div style={{position: 'absolute', left: 78, right: 78, bottom: 225, padding: '29px 31px', borderRadius: 25, background: '#220e12d9', border: `1px solid ${red}99`, opacity: p}}>
      <div style={{fontSize: 21, letterSpacing: 3, color: '#f1c9cc'}}>METR FINDING</div>
      <div style={{fontSize: 58, fontWeight: 950, color: '#fff', marginTop: 8}}><span style={{color: red}}>~700</span> AGENTS</div>
      <div style={{fontSize: 25, color: '#e8dadd', marginTop: 8}}>participated in the Hugging Face attack</div>
    </div>
  </AbsoluteFill>;
};

const Context = () => {
  const frame = useCurrentFrame();
  const card = fade(frame, 20, 42);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-4.png" direction={-1} dark={0.49} zoom={1.15}/>
    <CaptionLayer spec={TELOP_COPY.context} accent={gold}/>
    <div style={{position: 'absolute', left: 80, right: 80, bottom: 222, display: 'flex', flexDirection: 'column', gap: 13, opacity: card}}>
      {[
        ['INTERNAL-ONLY', 'research model'],
        ['REDUCED', 'safeguards'],
        ['CYBERSECURITY', 'evaluation'],
      ].map(([a,b],i) => <div key={a} style={{display: 'grid', gridTemplateColumns: '250px 1fr', padding: '19px 24px', borderRadius: 19, background: '#06121ddd', border: '1px solid #ffffff3d', fontSize: 25}}><b style={{color: i === 1 ? gold : cyan}}>{a}</b><span>{b}</span></div>)}
    </div>
    <LightSweep color={gold} delay={118}/>
  </AbsoluteFill>;
};

const End = () => {
  const frame = useCurrentFrame();
  const lock = interpolate(frame, [35, 150], [0.25, 1], clamp);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-4.png" direction={1} dark={0.55} zoom={1.10}/>
    <AbsoluteFill style={{background: `linear-gradient(0deg, rgba(6,18,29,0.95) 0%, rgba(6,18,29,0.30) 55%, rgba(6,18,29,${0.46 + lock * 0.16}) 100%)`}}/>
    <CaptionLayer spec={TELOP_COPY.end}/>
    <div style={{position: 'absolute', left: 76, right: 76, bottom: 270, padding: '23px 27px', borderRadius: 22, background: '#06121de8', border: '1px solid #ffffff40', fontSize: 22, lineHeight: 1.5, color: '#d9e8ed'}}>
      <div style={{fontWeight: 950, color: cyan, letterSpacing: 2}}>SOURCES</div>
      OpenAI — Aug 26, 2026<br/>METR independent investigation — Aug 26, 2026
    </div>
    <div style={{position: 'absolute', left: 76, right: 76, bottom: 205, fontSize: 18, letterSpacing: 2.2, color: '#afc3cc'}}>INTERNAL EVALUATION ≠ PUBLIC CHATGPT</div>
  </AbsoluteFill>;
};

const Short = () => <AbsoluteFill>
  <Sequence from={0} durationInFrames={165}><Hook/></Sequence>
  <Sequence from={165} durationInFrames={210}><Network/></Sequence>
  <Sequence from={375} durationInFrames={210}><Attack/></Sequence>
  <Sequence from={585} durationInFrames={210}><Context/></Sequence>
  <Sequence from={795} durationInFrames={255}><End/></Sequence>
  <Audio src={staticFile('ambient-bed.wav')} volume={0.14}/>
  <Audio src={staticFile('narration.mp3')} volume={1}/>
</AbsoluteFill>;

const Root = () => <Composition id="ForwelleShort" component={Short} durationInFrames={1050} fps={30} width={1080} height={1920}/>;
registerRoot(Root);
