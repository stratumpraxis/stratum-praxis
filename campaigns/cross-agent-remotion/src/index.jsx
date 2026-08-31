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

const C = {
  bg: '#03070c',
  bg2: '#07111f',
  white: '#f4f7fb',
  silver: '#d6deea',
  mid: '#a7b5c7',
  muted: '#6f8198',
  blue: '#68aaff',
  blue2: '#1f6fda',
  card: 'rgba(10,18,30,.88)',
  border: 'rgba(111,158,216,.32)',
  red: '#ff746f',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const font = {fontFamily: 'Arial, Helvetica, sans-serif'};
const sceneFrames = [120, 165, 165, 180, 180, 210];
const totalFrames = sceneFrames.reduce((a, b) => a + b, 0);

const Fade = ({children, from = 0, duration = 14, dy = 24, style = {}}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        opacity: interpolate(frame, [from, from + duration], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)}),
        translate: interpolate(frame, [from, from + duration], [`0 ${dy}px`, '0 0px'], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Background = ({intensity = 1}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const sweep = interpolate(frame, [0, durationInFrames], [-700, 1100], clamp);
  const dots = Array.from({length: 22}, (_, i) => ({
    x: (i * 137) % 1030,
    y: (i * 223) % 1780,
    r: 1 + (i % 3) * .55,
    phase: i * .73,
  }));
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 92% 42%, rgba(31,111,218,${.20 * intensity}), transparent 34%), linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 42%, #020509 100%)`}}>
      <AbsoluteFill
        style={{
          opacity: .42,
          backgroundImage: 'linear-gradient(rgba(143,181,230,.055) 1px, transparent 1px),linear-gradient(90deg,rgba(143,181,230,.055) 1px,transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <AbsoluteFill
        style={{
          opacity: .16,
          backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0px,rgba(255,255,255,.025) 1px,transparent 1px,transparent 4px)',
        }}
      />
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: d.r * 2,
            height: d.r * 2,
            borderRadius: '50%',
            background: '#9ec9ff',
            opacity: .16 + .14 * (1 + Math.sin(frame / 17 + d.phase)) / 2,
            boxShadow: '0 0 12px rgba(104,170,255,.45)',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          top: -120,
          left: sweep,
          width: 220,
          height: 2180,
          rotate: '11deg',
          background: 'linear-gradient(90deg,transparent,rgba(117,181,255,.075),transparent)',
          filter: 'blur(12px)',
        }}
      />
    </AbsoluteFill>
  );
};

const Brand = () => (
  <>
    <div style={{position: 'absolute', top: 78, left: 72, fontSize: 25, fontWeight: 600, letterSpacing: 9, color: C.silver}}>STRATUM PRAXIS</div>
    <div style={{position: 'absolute', top: 145, left: 72, width: 210, height: 3, background: 'rgba(92,116,145,.22)'}}>
      <div style={{width: 55, height: 3, background: C.blue, boxShadow: '0 0 14px rgba(104,170,255,.65)'}} />
    </div>
  </>
);

const Footer = ({step, right}) => (
  <>
    <div style={{position: 'absolute', left: 72, bottom: 122, fontSize: 20, color: C.mid, letterSpacing: 1}}>{String(step).padStart(2, '0')} / 05</div>
    <div style={{position: 'absolute', left: 72, bottom: 94, display: 'flex', gap: 6}}>
      {Array.from({length: 5}, (_, i) => <div key={i} style={{width: 32, height: 4, background: i < step ? C.blue : 'rgba(128,154,186,.22)', boxShadow: i === step - 1 ? '0 0 12px rgba(104,170,255,.6)' : 'none'}} />)}
    </div>
    <div style={{position: 'absolute', right: 72, bottom: 112, fontSize: 20, color: C.mid}}>{right}</div>
  </>
);

const SceneShell = ({children, duration, intensity = 1}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, duration - 12, duration], [0, 1, 1, 0], clamp);
  const scale = interpolate(frame, [0, duration], [1.025, 1], clamp);
  const y = interpolate(frame, [0, duration], [7, -7], clamp);
  return (
    <AbsoluteFill style={{...font, color: C.white, overflow: 'hidden', opacity}}>
      <Background intensity={intensity} />
      <div style={{position: 'absolute', inset: 0, scale, translate: `0 ${y}px`}}>
        <Brand />
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Alert = ({left, top, delay = 0}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 16], [0, 1], clamp);
  const pulse = 1 + Math.max(0, Math.sin((frame - delay) / 5)) * .08;
  return (
    <div style={{position: 'absolute', left, top, width: 52, height: 52, borderRadius: '50%', border: `2px solid ${C.red}`, color: C.red, display: 'grid', placeItems: 'center', fontSize: 29, fontWeight: 800, opacity: p, scale: pulse, boxShadow: '0 0 26px rgba(255,116,111,.25)'}}>!</div>
  );
};

const AgentNode = ({label, left, top, delay, strong = false}) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [delay, delay + 18], [0, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
  const drift = Math.sin((frame + left) / 20) * (strong ? 2 : 5);
  return (
    <div style={{position: 'absolute', left, top, width: 220, height: 92, borderRadius: 22, border: `1.5px solid ${strong ? 'rgba(104,170,255,.72)' : C.border}`, background: strong ? 'rgba(15,35,62,.94)' : C.card, display: 'flex', alignItems: 'center', paddingLeft: 28, gap: 16, opacity: inP, translate: `${drift}px 0`, boxShadow: strong ? '0 0 32px rgba(104,170,255,.18)' : '0 18px 50px rgba(0,0,0,.22)'}}>
      <div style={{width: 9, height: 9, borderRadius: '50%', background: C.blue, boxShadow: '0 0 14px rgba(104,170,255,.9)'}} />
      <div style={{fontSize: 27, color: C.white}}>{label}</div>
    </div>
  );
};

const Hook = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [12, 78], [720, 0], clamp);
  const core = interpolate(frame, [44, 78], [.86, 1], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)});
  return (
    <SceneShell duration={sceneFrames[0]} intensity={1.25}>
      <div style={{position: 'absolute', left: 72, top: 205, fontSize: 24, color: C.blue, letterSpacing: 3, fontWeight: 700}}>MULTI-AGENT CONTROL</div>
      <Fade from={3}><div style={{position: 'absolute', left: 72, top: 272, width: 930, fontSize: 82, fontWeight: 900, lineHeight: .98, letterSpacing: -3}}>WHEN AGENTS DRIFT,<br/>OPERATIONS BREAK.</div></Fade>
      <Fade from={12}><div style={{position: 'absolute', left: 72, top: 485, width: 860, fontSize: 30, lineHeight: 1.38, color: C.mid}}>Roles, permissions, handoffs, budgets, and stop rules need one control layer.</div></Fade>
      <svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
        {[
          'M 285 855 C 450 850, 520 960, 660 1040',
          'M 250 1005 C 420 1000, 470 1070, 660 1090',
          'M 300 1160 C 470 1140, 500 1135, 660 1135',
          'M 395 1310 C 520 1310, 555 1190, 660 1180',
          'M 290 1450 C 500 1450, 560 1285, 670 1225',
        ].map((d, i) => <path key={d} d={d} fill="none" stroke="rgba(120,190,255,.78)" strokeWidth="2.2" strokeDasharray="720" strokeDashoffset={Math.max(0, draw + i * 42)} />)}
      </svg>
      <AgentNode label="Agent A" left={72} top={805} delay={14} />
      <AgentNode label="Agent B" left={42} top={955} delay={20} />
      <AgentNode label="Agent C" left={95} top={1110} delay={26} />
      <AgentNode label="Agent D" left={225} top={1265} delay={32} />
      <AgentNode label="Agent E" left={105} top={1410} delay={38} />
      <Alert left={355} top={915} delay={28} />
      <Alert left={255} top={1080} delay={38} />
      <Alert left={300} top={1365} delay={48} />
      <div style={{position: 'absolute', left: 660, top: 960, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(104,170,255,.18)', boxShadow: '0 0 0 34px rgba(104,170,255,.035),0 0 0 68px rgba(104,170,255,.025)'}} />
      <div style={{position: 'absolute', left: 690, top: 990, width: 220, height: 220, borderRadius: 36, border: '2px solid rgba(118,188,255,.8)', background: 'linear-gradient(145deg,rgba(23,70,126,.95),rgba(7,20,36,.96))', display: 'grid', placeItems: 'center', scale: core, boxShadow: '0 0 55px rgba(50,139,255,.28), inset 0 0 30px rgba(104,170,255,.12)'}}>
        <div style={{textAlign: 'center'}}><div style={{fontSize: 46, marginBottom: 12}}>◇</div><div style={{fontSize: 24, letterSpacing: 2}}>POLICY CORE</div></div>
      </div>
      <div style={{position: 'absolute', left: 72, bottom: 112, fontSize: 20, color: C.mid}}>00 / 05</div>
      <div style={{position: 'absolute', right: 72, bottom: 112, fontSize: 20, color: C.mid}}>Fix the operating layer first.</div>
    </SceneShell>
  );
};

const Scene1 = () => (
  <SceneShell duration={sceneFrames[1]}>
    <div style={{position: 'absolute', left: 72, top: 210, fontSize: 24, color: C.blue, letterSpacing: 3, fontWeight: 700}}>CROSS-AGENT OPERATIONS</div>
    <Fade from={2}><div style={{position: 'absolute', left: 72, top: 285, fontSize: 92, fontWeight: 900, lineHeight: .98, letterSpacing: -4}}>MORE AGENTS<br/><span style={{color: C.blue}}>≠</span> MORE CONTROL.</div></Fade>
    <Fade from={11}><div style={{position: 'absolute', left: 72, top: 520, width: 860, fontSize: 31, lineHeight: 1.42, color: C.mid}}>When roles, permissions, handoffs, and stop conditions drift, coordination becomes the bottleneck.</div></Fade>
    <AgentNode label="Claude" left={92} top={880} delay={16} />
    <AgentNode label="Codex" left={675} top={1010} delay={22} />
    <AgentNode label="Cursor" left={150} top={1290} delay={30} />
    <AgentNode label="Agent N" left={680} top={1410} delay={38} />
    <Alert left={500} top={1075} delay={30} />
    <Alert left={560} top={1280} delay={44} />
    <svg width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: .62}}>
      <path d="M 312 925 L 675 1055" stroke="#71b4ff" strokeWidth="2" />
      <path d="M 205 972 L 260 1290" stroke="#71b4ff" strokeWidth="2" />
      <path d="M 370 1330 L 680 1450" stroke="#71b4ff" strokeWidth="2" />
      <path d="M 790 1100 L 790 1410" stroke="#71b4ff" strokeWidth="2" />
    </svg>
    <Footer step={1} right="Operational clarity before agent sprawl." />
  </SceneShell>
);

const InfoCard = ({label, text, index}) => (
  <Fade from={8 + index * 4} dy={18}>
    <div style={{height: 205, borderRadius: 24, border: `1.5px solid ${C.border}`, background: 'linear-gradient(145deg,rgba(14,25,40,.93),rgba(7,12,20,.94))', padding: '26px 28px', boxShadow: '0 18px 40px rgba(0,0,0,.18)'}}>
      <div style={{fontSize: 19, color: C.blue, letterSpacing: 2, fontWeight: 700}}>{label}</div>
      <div style={{fontSize: 31, lineHeight: 1.12, fontWeight: 800, marginTop: 16}}>{text}</div>
    </div>
  </Fade>
);

const Scene2 = () => (
  <SceneShell duration={sceneFrames[2]}>
    <div style={{position: 'absolute', left: 72, top: 205, fontSize: 23, color: C.blue, letterSpacing: 2.6, fontWeight: 700}}>WHERE MULTI-AGENT STACKS BREAK</div>
    <Fade><div style={{position: 'absolute', left: 72, top: 282, fontSize: 74, fontWeight: 900, lineHeight: 1.01, letterSpacing: -3}}>THE FAILURE ISN'T<br/>THE MODEL.</div></Fade>
    <div style={{position: 'absolute', left: 72, top: 486, fontSize: 31, color: C.mid}}>It's the operating layer around the models.</div>
    <div style={{position: 'absolute', left: 72, top: 605, width: 936, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
      {[
        ['ROLES', 'Who owns the task?'],
        ['PERMISSIONS', 'What can each agent change?'],
        ['HUMAN GATES', 'Where must a person approve?'],
        ['STOP RULES', 'When does automation halt?'],
        ['BUDGET', 'Who controls token & quota spend?'],
        ['CONFLICTS', 'Which policy wins?'],
      ].map(([label, text], i) => <InfoCard key={label} label={label} text={text} index={i} />)}
    </div>
    <Footer step={2} right="Control surface > tool count." />
  </SceneShell>
);

const Scene3 = () => {
  const frame = useCurrentFrame();
  const masterGlow = .22 + .18 * (1 + Math.sin(frame / 12)) / 2;
  const rows = [
    ['Claude adapter', 'agent-specific rules'],
    ['Codex adapter', 'execution boundaries'],
    ['AGENTS.md MASTER POLICY', 'source of operational truth'],
    ['Cursor adapter', 'coding context'],
    ['Human Gate Matrix', 'approval map'],
  ];
  return (
    <SceneShell duration={sceneFrames[3]} intensity={1.1}>
      <div style={{position: 'absolute', left: 72, top: 205, fontSize: 24, color: C.blue, letterSpacing: 3, fontWeight: 700}}>THE OPERATING LAYER</div>
      <Fade><div style={{position: 'absolute', left: 72, top: 282, fontSize: 82, fontWeight: 900, lineHeight: 1.0, letterSpacing: -3}}>ONE POLICY.<br/>MULTIPLE AGENTS.</div></Fade>
      <div style={{position: 'absolute', left: 72, top: 490, width: 850, fontSize: 30, lineHeight: 1.4, color: C.mid}}>A shared control system that keeps agent-specific behavior aligned with one operating contract.</div>
      <div style={{position: 'absolute', left: 72, top: 705, width: 936, display: 'flex', flexDirection: 'column', gap: 17}}>
        {rows.map(([left, right], i) => (
          <Fade key={left} from={10 + i * 6} dy={20}>
            <div style={{height: 116, borderRadius: 23, border: `${i === 2 ? 2.5 : 1.5}px solid ${i === 2 ? C.blue : C.border}`, background: i === 2 ? 'linear-gradient(90deg,rgba(18,52,88,.94),rgba(7,16,28,.96))' : C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', boxShadow: i === 2 ? `0 0 42px rgba(104,170,255,${masterGlow})` : '0 15px 35px rgba(0,0,0,.18)'}}>
              <strong style={{fontSize: 29, color: i === 2 ? '#89beff' : C.white}}>{left}</strong>
              <span style={{fontSize: 18, color: C.muted}}>{right}</span>
            </div>
          </Fade>
        ))}
      </div>
      <Footer step={3} right="Keep the brain. Change the agent." />
    </SceneShell>
  );
};

const Scene4 = () => (
  <SceneShell duration={sceneFrames[4]}>
    <div style={{position: 'absolute', left: 72, top: 205, fontSize: 24, color: C.blue, letterSpacing: 3, fontWeight: 700}}>INSIDE THE KIT</div>
    <Fade><div style={{position: 'absolute', left: 72, top: 280, fontSize: 82, fontWeight: 900, lineHeight: 1.0, letterSpacing: -3}}>BUILT FOR<br/>REAL OPERATIONS.</div></Fade>
    <div style={{position: 'absolute', left: 72, top: 490, width: 860, fontSize: 30, lineHeight: 1.42, color: C.mid}}>A compact control layer for teams of AI tools — not another prompt bundle.</div>
    <div style={{position: 'absolute', left: 72, top: 650, width: 936, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
      {[
        ['01', 'Master policy'], ['02', 'Agent adapters'], ['03', 'Conflict checks'], ['04', 'Human gates'], ['05', 'Budget + quota guard'], ['06', 'Migration score'],
      ].map(([n, label], i) => (
        <Fade key={n} from={8 + i * 4} dy={18}>
          <div style={{height: 210, borderRadius: 24, border: `1.5px solid ${C.border}`, background: C.card, padding: 27}}>
            <div style={{fontSize: 18, color: C.blue, fontWeight: 700}}>{n}</div>
            <div style={{fontSize: 31, fontWeight: 800, marginTop: 25}}>{label}</div>
          </div>
        </Fade>
      ))}
    </div>
    <Footer step={4} right="v1.0 · Personal license" />
  </SceneShell>
);

const Scene5 = () => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [25, 80], [.1, .45], clamp);
  const buttonScale = 1 + Math.max(0, Math.sin((frame - 50) / 18)) * .008;
  return (
    <SceneShell duration={sceneFrames[5]} intensity={1.35}>
      <div style={{position: 'absolute', left: 72, top: 205, fontSize: 24, color: C.blue, letterSpacing: 3, fontWeight: 700}}>CROSS-AGENT OPERATING KIT</div>
      <Fade><div style={{position: 'absolute', left: 72, top: 280, width: 920, fontSize: 69, fontWeight: 900, lineHeight: 1.02, letterSpacing: -3}}>FIX THE OPERATING<br/>LAYER BEFORE ADDING<br/>ANOTHER AGENT.</div></Fade>
      <Fade from={10}><div style={{position: 'absolute', left: 72, top: 655, fontSize: 158, fontWeight: 900, letterSpacing: -6}}>$69</div></Fade>
      <div style={{position: 'absolute', left: 76, top: 825, color: C.blue, fontSize: 26, fontWeight: 800, letterSpacing: 3}}>PERSONAL</div>
      <div style={{position: 'absolute', left: 72, top: 900, width: 850, fontSize: 29, lineHeight: 1.45, color: C.mid}}>One purchaser · own projects · full v1.0 kit · verified buyer workspace.</div>
      <div style={{position: 'absolute', left: 72, top: 1115, width: 600, height: 132, borderRadius: 24, background: 'linear-gradient(180deg,#f4f7fb,#d5e2f1)', color: '#04101e', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 900, letterSpacing: .5, scale: buttonScale, boxShadow: `0 0 60px rgba(104,170,255,${glow})`}}>GET PERSONAL →</div>
      <div style={{position: 'absolute', left: 72, top: 1300, fontSize: 24, color: '#8bbcff'}}>stratumpraxis.com/cross-agent-operating-kit.html</div>
      <div style={{position: 'absolute', left: 72, top: 1370, fontSize: 24, color: C.mid}}>One operating contract for a multi-agent stack.</div>
      <Footer step={5} right="STRATUM PRAXIS" />
    </SceneShell>
  );
};

const TransitionSweep = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 12], [-420, 1260], clamp);
  const opacity = interpolate(frame, [0, 3, 9, 12], [0, .95, .9, 0], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <div style={{position: 'absolute', top: -120, left: x, width: 270, height: 2160, rotate: '9deg', background: 'linear-gradient(90deg,transparent,rgba(105,176,255,.52),rgba(230,245,255,.18),transparent)', filter: 'blur(10px)'}} />
    </AbsoluteFill>
  );
};

const CrossAgentAd = () => {
  const scenes = [Hook, Scene1, Scene2, Scene3, Scene4, Scene5];
  let start = 0;
  const boundaries = [];
  const layers = scenes.map((Scene, i) => {
    const from = start;
    start += sceneFrames[i];
    if (i < scenes.length - 1) boundaries.push(start);
    return <Sequence key={i} from={from} durationInFrames={sceneFrames[i]}><Scene /></Sequence>;
  });
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Audio src={staticFile('bgm.wav')} volume={0.14} />
      <Audio src={staticFile('narration.mp3')} volume={1} />
      {layers}
      {boundaries.map((b) => <Sequence key={b} from={Math.max(0, b - 6)} durationInFrames={12}><TransitionSweep /></Sequence>)}
    </AbsoluteFill>
  );
};

const Root = () => <Composition id="CrossAgentAd" component={CrossAgentAd} durationInFrames={totalFrames} fps={30} width={1080} height={1920} />;
registerRoot(Root);
