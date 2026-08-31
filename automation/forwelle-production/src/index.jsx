import React from 'react';
import {AbsoluteFill, Composition, Img, interpolate, registerRoot, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {MetaBar, TelopHeadline, safeFrameStyle} from './telop.jsx';
import {TELOP_COPY} from './telop-spec.mjs';

const navy = '#06121d';
const cyan = '#7ce8e1';
const ice = '#dff8f5';
const paper = '#f4f0e8';
const ink = '#102433';
const gold = '#ffc857';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const fade = (frame, a, b) => interpolate(frame, [a, b], [0, 1], clamp);

const GeneratedBackdrop = ({src, direction = 1, dark = 0.35, zoom = 1.12}) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{overflow: 'hidden', backgroundColor: navy}}>
    <Img
      src={staticFile(src)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        scale: interpolate(frame, [0, 210], [1.03, zoom], clamp),
        translate: `${interpolate(frame, [0, 210], [direction * -18, direction * 20], clamp)}px ${interpolate(frame, [0, 210], [12, -20], clamp)}px`,
      }}
    />
    <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(5,14,23,${dark + 0.10}) 0%, rgba(5,14,23,0.08) 40%, rgba(5,14,23,${dark + 0.28}) 100%)`}}/>
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, transparent 0%, rgba(2,8,14,0.12) 48%, rgba(2,8,14,0.72) 100%)'}}/>
  </AbsoluteFill>;
};

const LightSweep = ({color = cyan, delay = 0}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [delay, delay + 38], [-350, 1350], clamp);
  return <div style={{position: 'absolute', top: -200, left: x, width: 180, height: 2400, rotate: '14deg', background: `linear-gradient(90deg, transparent, ${color}22, transparent)`, filter: 'blur(10px)'}}/>;
};

const DataTicks = ({delay = 0}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'absolute', right: 66, top: 480, width: 92, display: 'flex', flexDirection: 'column', gap: 13}}>
    {Array.from({length: 10}).map((_, i) => <div key={i} style={{height: 4, borderRadius: 5, background: i % 3 === 0 ? cyan : '#dff8f555', width: `${interpolate(frame, [delay + i * 2, delay + i * 2 + 12], [20, 88 - i * 4], clamp)}px`, opacity: fade(frame, delay + i * 2, delay + i * 2 + 8)}}/>)}
  </div>;
};

const CaptionLayer = ({spec, accent = cyan, align = 'left', dark = true}) => {
  const frame = useCurrentFrame();
  const p = fade(frame, 6, 20);
  return <div style={{position: 'relative', zIndex: 5, opacity: p}}>
    <MetaBar spec={spec} color={dark ? ice : ink}/>
    <TelopHeadline spec={spec} color={dark ? '#fff' : ink} accent={accent} align={align} marginTop={42} maxWidth={950}/>
  </div>;
};

const Hook = () => {
  const frame = useCurrentFrame();
  const pulse = 0.35 + 0.65 * Math.abs(Math.sin(frame / 12));
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-1.png" direction={1} dark={0.38} zoom={1.16}/>
    <LightSweep delay={18}/>
    <CaptionLayer spec={TELOP_COPY.hook}/>
    <div style={{position: 'absolute', left: 70, right: 70, bottom: 230, display: 'flex', alignItems: 'center', gap: 18, fontSize: 26, letterSpacing: 3, color: ice}}>
      <span style={{width: 13, height: 13, borderRadius: '50%', background: cyan, boxShadow: `0 0 ${18 + pulse * 18}px ${cyan}`}}/>
      DIGITAL → PHYSICAL
    </div>
    <DataTicks delay={52}/>
  </AbsoluteFill>;
};

const Devices = () => {
  const frame = useCurrentFrame();
  const focus = interpolate(frame, [42, 62, 122, 142], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-2.png" direction={-1} dark={0.36} zoom={1.18}/>
    <LightSweep color={gold} delay={76}/>
    <CaptionLayer spec={TELOP_COPY.devices} accent={gold}/>
    <div style={{position: 'absolute', left: 80, right: 80, bottom: 245, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, opacity: focus}}>
      {['MICROSCOPE', 'LIQUID', 'ROBOTICS'].map((label, i) => <div key={label} style={{padding: '15px 8px', textAlign: 'center', borderRadius: 18, border: '1px solid #ffffff55', background: '#06121db8', backdropFilter: 'blur(12px)', fontSize: 20, letterSpacing: 1.5, color: i === 0 ? gold : '#fff'}}>{label}</div>)}
    </div>
  </AbsoluteFill>;
};

const Speed = () => {
  const frame = useCurrentFrame();
  const weeks = interpolate(frame, [28, 55], [0, 1], clamp);
  const hours = interpolate(frame, [78, 108], [0, 1], clamp);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-3.png" direction={1} dark={0.42} zoom={1.15}/>
    <CaptionLayer spec={TELOP_COPY.speed}/>
    <div style={{position: 'absolute', left: 76, right: 76, bottom: 220, display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'center', gap: 16}}>
      <div style={{opacity: weeks, padding: '28px 24px', borderRadius: 24, background: '#071521d6', border: '1px solid #ffffff38'}}><div style={{fontSize: 22, color: '#b7c9d4'}}>BEFORE</div><div style={{fontSize: 48, fontWeight: 900, marginTop: 5}}>WEEKS</div></div>
      <div style={{fontSize: 46, textAlign: 'center', color: cyan}}>→</div>
      <div style={{opacity: hours, padding: '28px 24px', borderRadius: 24, background: '#0b2d31e8', border: `2px solid ${cyan}`}}><div style={{fontSize: 22, color: ice}}>TARGET</div><div style={{fontSize: 48, fontWeight: 900, marginTop: 5, color: cyan}}>HOURS</div></div>
    </div>
    <LightSweep delay={124}/>
  </AbsoluteFill>;
};

const Realtime = () => {
  const frame = useCurrentFrame();
  const trace = interpolate(frame, [20, 160], [0, 620], clamp);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-4.png" direction={-1} dark={0.43} zoom={1.17}/>
    <CaptionLayer spec={TELOP_COPY.realtime}/>
    <div style={{position: 'absolute', left: 86, bottom: 260, width: 650, height: 126, padding: 20, borderRadius: 22, background: '#06121dd6', border: '1px solid #ffffff38'}}>
      <div style={{fontSize: 19, letterSpacing: 3, color: ice}}>PARAMETER LOOP</div>
      <div style={{position: 'relative', marginTop: 28, height: 7, background: '#34505f', borderRadius: 8, overflow: 'hidden'}}><div style={{width: trace, height: '100%', background: cyan, boxShadow: `0 0 20px ${cyan}`}}/></div>
      <div style={{marginTop: 15, fontSize: 22, color: '#d9e7ec'}}>OBSERVE → ADJUST → RUN AGAIN</div>
    </div>
    <DataTicks delay={100}/>
  </AbsoluteFill>;
};

const End = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  const returnGlow = interpolate(frame, [85, 220], [0.2, 0.9], clamp);
  return <AbsoluteFill style={safeFrameStyle({color: '#fff', backgroundColor: navy})}>
    <GeneratedBackdrop src="scene-1.png" direction={-1} dark={0.52} zoom={1.10}/>
    <AbsoluteFill style={{background: `linear-gradient(0deg, rgba(6,18,29,0.94) 0%, rgba(6,18,29,0.28) 55%, rgba(6,18,29,${0.38 + returnGlow * 0.2}) 100%)`}}/>
    <div style={{position: 'relative', zIndex: 5, opacity: p}}>
      <MetaBar spec={TELOP_COPY.end} color={ice}/>
      <TelopHeadline spec={TELOP_COPY.end} color="#fff" accent={cyan} marginTop={40} maxWidth={960}/>
    </div>
    <div style={{position: 'absolute', left: 70, right: 70, bottom: 260, padding: '24px 28px', borderRadius: 22, background: '#06121dd9', border: '1px solid #ffffff40', fontSize: 23, lineHeight: 1.45, color: '#d8e6eb'}}>
      <div style={{fontWeight: 900, color: cyan, letterSpacing: 2}}>SOURCE</div>
      Anthropic — Model Hardware Standard research preview<br/>Aug 27, 2026
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: interpolate(frame, [80, 160], [300, 1520], clamp), height: 4, background: cyan, opacity: 0.35, boxShadow: `0 0 28px ${cyan}`}}/>
  </AbsoluteFill>;
};

const Short = () => <AbsoluteFill>
  <Sequence from={0} durationInFrames={150}><Hook/></Sequence>
  <Sequence from={150} durationInFrames={195}><Devices/></Sequence>
  <Sequence from={345} durationInFrames={195}><Speed/></Sequence>
  <Sequence from={540} durationInFrames={195}><Realtime/></Sequence>
  <Sequence from={735} durationInFrames={255}><End/></Sequence>
  <Audio src={staticFile('ambient-bed.wav')} volume={0.16}/>
  <Audio src={staticFile('narration.mp3')} volume={1}/>
</AbsoluteFill>;

const Root = () => <Composition id="ForwelleShort" component={Short} durationInFrames={990} fps={30} width={1080} height={1920}/>;
registerRoot(Root);
