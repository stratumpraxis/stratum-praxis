import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  registerRoot,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const C = {
  bg: '#07101c',
  panel: '#0e1b2b',
  panel2: '#12243a',
  text: '#f4f7fb',
  muted: '#9fb0c5',
  cyan: '#4de3ff',
  green: '#66f0a7',
  yellow: '#ffd765',
  red: '#ff6b7a',
  line: 'rgba(255,255,255,0.12)',
};

const Fade = ({children, start = 0, end = 24, style = {}}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [start, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(frame, [start, end], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{opacity, transform: `translateY(${y}px)`, ...style}}>{children}</div>;
};

const Grid = () => (
  <AbsoluteFill style={{
    backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
    backgroundSize: '64px 64px',
    opacity: 0.16,
  }} />
);

const Glow = ({x, y, size, color}) => (
  <div style={{position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: color, filter: 'blur(110px)', opacity: 0.18}} />
);

const Header = ({kicker, title, accent}) => (
  <div style={{position: 'absolute', left: 110, top: 80, right: 110}}>
    <div style={{fontFamily: 'Arial, sans-serif', color: C.cyan, fontWeight: 800, fontSize: 26, letterSpacing: 4, textTransform: 'uppercase'}}>{kicker}</div>
    <div style={{fontFamily: 'Arial, sans-serif', color: C.text, fontWeight: 900, fontSize: 74, lineHeight: 1.02, letterSpacing: -3, marginTop: 16}}>
      {title} <span style={{color: accent || C.yellow}}>{accent ? '' : ''}</span>
    </div>
  </div>
);

const StatCard = ({value, label, sub, color = C.cyan, delay = 0}) => {
  const frame = useCurrentFrame();
  const p = spring({frame: Math.max(0, frame - delay), fps: 30, config: {damping: 16, stiffness: 110}});
  return (
    <div style={{width: 500, minHeight: 270, border: `1px solid ${C.line}`, borderRadius: 28, background: 'rgba(14,27,43,0.88)', padding: '42px 44px', transform: `scale(${0.92 + p * 0.08})`, opacity: p}}>
      <div style={{fontFamily: 'Arial, sans-serif', fontSize: 98, fontWeight: 900, color, letterSpacing: -5}}>{value}</div>
      <div style={{fontFamily: 'Arial, sans-serif', fontSize: 34, lineHeight: 1.15, color: C.text, fontWeight: 800, marginTop: 8}}>{label}</div>
      {sub ? <div style={{fontFamily: 'Arial, sans-serif', fontSize: 23, lineHeight: 1.35, color: C.muted, marginTop: 18}}>{sub}</div> : null}
    </div>
  );
};

const Arrow = ({left, top, width = 150, color = C.muted}) => (
  <div style={{position: 'absolute', left, top, width, height: 4, background: color, borderRadius: 4}}>
    <div style={{position: 'absolute', right: -1, top: -8, width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: `16px solid ${color}`}} />
  </div>
);

const Pill = ({x, y, w = 300, text, color = C.cyan, delay = 0}) => {
  const frame = useCurrentFrame();
  const p = spring({frame: Math.max(0, frame - delay), fps: 30, config: {damping: 18, stiffness: 120}});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: 100, borderRadius: 22, border: `1px solid ${color}`, background: 'rgba(7,16,28,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', transform: `translateY(${(1-p)*22}px)`, opacity: p}}>
      <div style={{fontFamily: 'Arial, sans-serif', color: C.text, fontSize: 30, fontWeight: 800, textAlign: 'center'}}>{text}</div>
    </div>
  );
};

const HookScene = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 6) * 0.015;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Grid /><Glow x={120} y={120} size={540} color={C.cyan} /><Glow x={1250} y={470} size={520} color={C.red} />
      <Fade start={0} end={16} style={{position: 'absolute', left: 110, top: 120}}>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.cyan, fontWeight: 900, fontSize: 30, letterSpacing: 5}}>THE AI ROI GAP</div>
      </Fade>
      <div style={{position: 'absolute', left: 110, right: 110, top: 250}}>
        <div style={{fontFamily: 'Arial, sans-serif', fontSize: 132, lineHeight: 0.95, fontWeight: 900, color: C.text, letterSpacing: -7}}>AI MAKES YOU</div>
        <div style={{fontFamily: 'Arial, sans-serif', fontSize: 160, lineHeight: 0.95, fontWeight: 900, color: C.green, letterSpacing: -9, transform: `scale(${pulse})`, transformOrigin: 'left center'}}>FASTER.</div>
        <div style={{fontFamily: 'Arial, sans-serif', fontSize: 132, lineHeight: 0.95, fontWeight: 900, color: C.text, letterSpacing: -7, marginTop: 12}}>WHY NOT RICHER?</div>
      </div>
      <Fade start={28} end={48} style={{position: 'absolute', left: 116, bottom: 110}}>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.muted, fontSize: 30}}>The problem is not access to AI. It is what AI is attached to.</div>
      </Fade>
    </AbsoluteFill>
  );
};

const DataScene = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Grid /><Glow x={1300} y={20} size={520} color={C.yellow} />
    <Header kicker="2026 market signal" title="Activity is up. Financial impact is not." />
    <div style={{position: 'absolute', left: 110, right: 110, top: 360, display: 'flex', gap: 38}}>
      <StatCard value="56%" color={C.red} label="No significant financial benefit" sub="PwC 2026 Global CEO Survey" delay={5} />
      <StatCard value="12%" color={C.green} label="Both cost + revenue gains" sub="PwC: only one in eight CEOs" delay={14} />
      <StatCard value="74%" color={C.yellow} label="AI value captured by the top 20%" sub="PwC Global AI Performance Study" delay={23} />
    </div>
    <div style={{position: 'absolute', left: 112, bottom: 80, fontFamily: 'Arial, sans-serif', color: C.muted, fontSize: 22}}>Sources: PwC Global CEO Survey 2026 · PwC Global AI Performance Study 2026</div>
  </AbsoluteFill>
);

const PnlScene = () => {
  const frame = useCurrentFrame();
  const bar = interpolate(frame, [10, 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Grid /><Glow x={250} y={480} size={520} color={C.red} />
      <Header kicker="The execution gap" title="AI projects are not wired to P&L." />
      <div style={{position: 'absolute', left: 110, top: 390, width: 1080, height: 360, borderRadius: 30, background: 'rgba(14,27,43,0.9)', border: `1px solid ${C.line}`, padding: 46}}>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.text, fontSize: 34, fontWeight: 800}}>Initiatives with clearly defined P&L impact</div>
        <div style={{height: 70, borderRadius: 35, background: 'rgba(255,255,255,0.07)', marginTop: 38, overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${14 * bar}%`, minWidth: bar > 0 ? 8 : 0, background: C.green, borderRadius: 35}} />
        </div>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.green, fontSize: 92, fontWeight: 900, marginTop: 18}}>14%</div>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.muted, fontSize: 24}}>BCG, July 2026 CEO research</div>
      </div>
      <Fade start={30} end={55} style={{position: 'absolute', right: 110, top: 450, width: 520}}>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.yellow, fontSize: 31, lineHeight: 1.35, fontWeight: 800}}>More than half of CEOs say there is a missing link between AI and profit-and-loss.</div>
      </Fade>
    </AbsoluteFill>
  );
};

const TrapScene = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Grid /><Glow x={100} y={40} size={520} color={C.cyan} /><Glow x={1370} y={510} size={500} color={C.green} />
    <Header kicker="The workflow trap" title="More output is not the same as more money." />
    <div style={{position: 'absolute', left: 110, top: 370, width: 1700, height: 240, borderRadius: 30, background: 'rgba(255,107,122,0.05)', border: '1px solid rgba(255,107,122,0.28)'}}>
      <Pill x={35} y={60} text="AI TOOL" color={C.red} delay={0} />
      <Arrow left={360} top={110} color={C.red} />
      <Pill x={530} y={60} text="FASTER TASK" color={C.red} delay={8} />
      <Arrow left={855} top={110} color={C.red} />
      <Pill x={1025} y={60} text="MORE OUTPUT" color={C.red} delay={16} />
      <Arrow left={1350} top={110} color={C.red} />
      <Pill x={1515} y={60} w={150} text="$ ?" color={C.red} delay={24} />
    </div>
    <div style={{position: 'absolute', left: 110, top: 660, width: 1700, height: 255, borderRadius: 30, background: 'rgba(102,240,167,0.05)', border: '1px solid rgba(102,240,167,0.32)'}}>
      <Pill x={35} y={72} text="EXPENSIVE PAIN" color={C.green} delay={32} />
      <Arrow left={360} top={122} color={C.green} />
      <Pill x={530} y={72} text="ONE WORKFLOW" color={C.green} delay={40} />
      <Arrow left={855} top={122} color={C.green} />
      <Pill x={1025} y={72} text="ONE METRIC" color={C.green} delay={48} />
      <Arrow left={1350} top={122} color={C.green} />
      <Pill x={1515} y={72} w={150} text="$ ✓" color={C.green} delay={56} />
    </div>
  </AbsoluteFill>
);

const LeakScene = () => {
  const frame = useCurrentFrame();
  const lost = interpolate(frame, [0, 80], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Grid /><Glow x={1300} y={350} size={520} color={C.green} />
      <Header kicker="Start with leakage" title="Find a bottleneck with a dollar value." />
      <div style={{position: 'absolute', left: 110, top: 390, width: 780, height: 450, borderRadius: 30, background: C.panel, border: `1px solid ${C.line}`, padding: 46}}>
        <div style={{fontFamily: 'Arial, sans-serif', fontSize: 30, fontWeight: 800, color: C.red}}>WITHOUT A REVENUE LOOP</div>
        {['New inquiry', 'No reply', 'Lead goes cold', 'Revenue lost'].map((t, i) => <div key={t} style={{fontFamily: 'Arial, sans-serif', fontSize: 34, color: i === 3 ? C.red : C.text, marginTop: 32, fontWeight: 800, opacity: Math.min(1, lost * 1.4 - i * 0.18)}}>{i+1}. {t}</div>)}
      </div>
      <div style={{position: 'absolute', right: 110, top: 390, width: 780, height: 450, borderRadius: 30, background: C.panel, border: `1px solid ${C.line}`, padding: 46}}>
        <div style={{fontFamily: 'Arial, sans-serif', fontSize: 30, fontWeight: 800, color: C.green}}>WITH A MEASURABLE WORKFLOW</div>
        {['Fast first response', 'Capture contact', 'Simple follow-up', 'Track conversion'].map((t, i) => <div key={t} style={{fontFamily: 'Arial, sans-serif', fontSize: 34, color: i === 3 ? C.green : C.text, marginTop: 32, fontWeight: 800, opacity: Math.min(1, lost * 1.4 - i * 0.18)}}>{i+1}. {t}</div>)}
      </div>
    </AbsoluteFill>
  );
};

const FilterScene = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Grid /><Glow x={500} y={220} size={620} color={C.yellow} />
    <Header kicker="Revenue-first filter" title="One workflow. One metric. One customer action." />
    <div style={{position: 'absolute', left: 110, top: 410, right: 110, display: 'flex', gap: 34}}>
      <StatCard value="1" label="Painful workflow" sub="Missed lead, slow quote, no-show, repetitive paid deliverable" color={C.cyan} delay={0} />
      <StatCard value="1" label="Economic metric" sub="Revenue gained, cost removed, or time-to-outcome" color={C.yellow} delay={10} />
      <StatCard value="1" label="Customer action" sub="Reply, book, buy, renew, approve, or refer" color={C.green} delay={20} />
    </div>
    <Fade start={35} end={60} style={{position: 'absolute', left: 110, bottom: 82}}>
      <div style={{fontFamily: 'Arial, sans-serif', fontSize: 31, color: C.text, fontWeight: 800}}>If the number does not move → <span style={{color: C.red}}>kill it.</span> If it moves → <span style={{color: C.green}}>scale it.</span></div>
    </Fade>
  </AbsoluteFill>
);

const OutroScene = () => {
  const frame = useCurrentFrame();
  const p = spring({frame, fps: 30, config: {damping: 18, stiffness: 95}});
  return (
    <AbsoluteFill style={{background: C.bg, justifyContent: 'center', alignItems: 'center'}}>
      <Grid /><Glow x={650} y={220} size={700} color={C.green} />
      <div style={{width: 1500, textAlign: 'center', transform: `scale(${0.94 + p*0.06})`, opacity: p}}>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.cyan, fontWeight: 900, fontSize: 30, letterSpacing: 5}}>THE QUESTION TO ASK IN 2026</div>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.text, fontWeight: 900, fontSize: 108, lineHeight: 1.0, letterSpacing: -5, marginTop: 32}}>WHERE IS MONEY</div>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.green, fontWeight: 900, fontSize: 132, lineHeight: 1.0, letterSpacing: -6}}>LEAKING RIGHT NOW?</div>
        <div style={{fontFamily: 'Arial, sans-serif', color: C.muted, fontSize: 30, marginTop: 42}}>AI does not create a business model. It amplifies one.</div>
      </div>
    </AbsoluteFill>
  );
};

const HorizontalVideo = () => (
  <AbsoluteFill style={{background: C.bg}}>
    <Audio src={staticFile('horizontal-bed.wav')} volume={0.34} />
    <Audio src={staticFile('horizontal-narration.mp3')} volume={1} />
    <Sequence from={0} durationInFrames={360}><HookScene /></Sequence>
    <Sequence from={360} durationInFrames={570}><DataScene /></Sequence>
    <Sequence from={930} durationInFrames={510}><PnlScene /></Sequence>
    <Sequence from={1440} durationInFrames={540}><TrapScene /></Sequence>
    <Sequence from={1980} durationInFrames={450}><LeakScene /></Sequence>
    <Sequence from={2430} durationInFrames={510}><FilterScene /></Sequence>
    <Sequence from={2940} durationInFrames={360}><OutroScene /></Sequence>
    {[360, 930, 1440, 1980, 2430, 2940].map((f) => <Sequence key={f} from={f} durationInFrames={24}><Audio src={staticFile('horizontal-whoosh.wav')} volume={0.6} /></Sequence>)}
    {[0, 930, 2940].map((f) => <Sequence key={`h${f}`} from={f} durationInFrames={18}><Audio src={staticFile('horizontal-hit.wav')} volume={0.7} /></Sequence>)}
  </AbsoluteFill>
);

const Root = () => (
  <Composition
    id="ForwelleHorizontalROI"
    component={HorizontalVideo}
    durationInFrames={3300}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(Root);
