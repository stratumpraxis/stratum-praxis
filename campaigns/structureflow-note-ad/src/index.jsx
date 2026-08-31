import React from 'react';
import {
  registerRoot,
  Composition,
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  staticFile,
} from 'remotion';
import {Audio} from '@remotion/media';

const C = {
  bg: '#050607',
  bg2: '#0a0c0f',
  silver: '#f2f0ea',
  silver2: '#c9c6be',
  muted: '#8d8b86',
  faint: '#31343a',
  line: '#6f6c65',
  glow: '#e8ddd0',
};

const serif = '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif';
const sans = '"Noto Sans JP", "Yu Gothic", "Hiragino Sans", sans-serif';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

const Background = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, #12151a 0%, ${C.bg2} 28%, ${C.bg} 70%)`, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          opacity: 0.22,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px)',
          backgroundSize: '54px 54px',
          translate: `0 ${interpolate(f, [0, 48 * fps], [0, -54], clamp)}px`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 30,
          right: 30,
          top: 30,
          bottom: 30,
          border: '1px solid rgba(220,216,206,.35)',
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'rgba(235,229,218,.36)',
            left: 48 + i * 20,
            top: 52,
          }}
        />
      ))}
      <div style={{position: 'absolute', right: 58, top: 62, color: C.muted, fontFamily: sans, fontSize: 14, letterSpacing: 5}}>STRUCTURE / SIGNAL</div>
    </AbsoluteFill>
  );
};

const ShineLine = ({top = 900, left = 85, width = 910}) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [8, 32], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', top, left, width, height: 1, background: 'rgba(210,205,195,.42)'}}>
      <div
        style={{
          position: 'absolute',
          left: `${x * 100}%`,
          top: -4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: C.glow,
          boxShadow: '0 0 22px rgba(255,238,215,.75)',
        }}
      />
    </div>
  );
};

const Caption = ({text}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [4, 14], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom: 110,
        minHeight: 96,
        padding: '20px 26px',
        borderTop: '1px solid rgba(235,230,220,.24)',
        background: 'linear-gradient(180deg, rgba(5,6,7,0), rgba(5,6,7,.62))',
        color: '#e7e3dc',
        fontFamily: sans,
        fontSize: 28,
        lineHeight: 1.5,
        letterSpacing: 1,
        opacity: o,
      }}
    >
      {text}
    </div>
  );
};

const Kicker = ({children}) => (
  <div style={{fontFamily: sans, fontSize: 20, letterSpacing: 5, color: C.muted, marginBottom: 34}}>{children}</div>
);

const Title = ({children, size = 86, top = 210, width = 900}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        left: 82,
        top,
        width,
        color: C.silver,
        fontFamily: serif,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.26,
        letterSpacing: -3,
        textShadow: '0 1px 0 #fff, 0 0 24px rgba(240,235,225,.10)',
        opacity: interpolate(f, [0, 16], [0, 1], clamp),
        translate: `0 ${interpolate(f, [0, 18], [26, 0], {...clamp, easing: Easing.bezier(.16, 1, .3, 1)})}px`,
      }}
    >
      {children}
    </div>
  );
};

const Orbit = ({centerY = 1200, labels = ['GENERATE', 'INSPECT', 'REPAIR', 'SHIP']}) => {
  const f = useCurrentFrame();
  const rot = interpolate(f, [0, 300], [-8, 15], clamp);
  const pulse = 1 + Math.sin(f / 14) * 0.015;
  const points = [
    [540, centerY - 230],
    [790, centerY],
    [540, centerY + 230],
    [290, centerY],
  ];
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div
        style={{
          position: 'absolute',
          left: 220,
          top: centerY - 320,
          width: 640,
          height: 640,
          borderRadius: '50%',
          border: '1px solid rgba(220,215,205,.32)',
          rotate: `${rot}deg`,
          scale: pulse,
          boxShadow: 'inset 0 0 90px rgba(255,255,255,.02), 0 0 50px rgba(230,220,205,.05)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 356,
          top: centerY - 184,
          width: 368,
          height: 368,
          borderRadius: '50%',
          border: '1px dotted rgba(220,215,205,.24)',
          display: 'grid',
          placeItems: 'center',
          color: C.silver2,
          fontFamily: serif,
          fontSize: 28,
          textAlign: 'center',
          lineHeight: 1.45,
        }}
      >
        価値は<br/>どこで生まれる？
      </div>
      {points.map(([x, y], i) => (
        <div
          key={labels[i]}
          style={{
            position: 'absolute',
            left: x - 92,
            top: y - 54,
            width: 184,
            height: 108,
            borderRadius: 60,
            border: '1px solid rgba(230,225,214,.48)',
            background: 'rgba(9,11,13,.86)',
            color: C.silver2,
            display: 'grid',
            placeItems: 'center',
            fontFamily: sans,
            fontSize: 17,
            letterSpacing: 2,
            boxShadow: i === 1 ? '0 0 35px rgba(240,230,215,.15)' : 'none',
          }}
        >
          {labels[i]}
        </div>
      ))}
    </div>
  );
};

const Funnel = ({top = 940}) => {
  const f = useCurrentFrame();
  const spread = interpolate(f, [0, 80], [1.06, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 82, right: 82, top, height: 520}}>
      <div style={{position: 'absolute', left: 0, top: 20, color: C.muted, fontFamily: sans, fontSize: 16, letterSpacing: 4}}>MANY OUTPUTS</div>
      <div style={{position: 'absolute', right: 0, top: 20, color: C.muted, fontFamily: sans, fontSize: 16, letterSpacing: 4}}>LIMITED REVIEW</div>
      {Array.from({length: 9}).map((_, row) =>
        Array.from({length: 5}).map((__, col) => (
          <div
            key={`${row}-${col}`}
            style={{
              position: 'absolute',
              left: col * 56,
              top: 80 + row * 38,
              width: 16,
              height: 16,
              border: '1px solid rgba(220,215,205,.40)',
              rotate: '45deg',
              opacity: 0.7,
            }}
          />
        )),
      )}
      {Array.from({length: 14}).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 315,
            top: 110 + i * 22,
            width: 475,
            height: 1,
            transformOrigin: 'right center',
            rotate: `${(i - 6.5) * 2.15 * spread}deg`,
            background: 'linear-gradient(90deg, rgba(215,210,202,.20), rgba(235,228,215,.75))',
          }}
        />
      ))}
      <div style={{position: 'absolute', right: 60, top: 212, width: 126, height: 126, borderRadius: '50%', border: '1px solid rgba(235,230,220,.5)', display: 'grid', placeItems: 'center', fontFamily: sans, fontSize: 18, color: C.silver2, boxShadow: '0 0 28px rgba(230,220,205,.13)'}}>REVIEW</div>
    </div>
  );
};

const LayerStack = ({top = 900}) => {
  const f = useCurrentFrame();
  const layers = [
    ['MODEL', 'INTELLIGENCE'],
    ['ENVIRONMENT', 'ACCESS'],
    ['EVALUATION', 'SYSTEM'],
  ];
  return (
    <div style={{position: 'absolute', left: 100, right: 100, top, height: 610}}>
      {layers.map(([a, b], i) => {
        const y = 40 + i * 170;
        const glow = interpolate(f, [20 + i * 18, 42 + i * 18], [0, 1], clamp);
        return (
          <React.Fragment key={a}>
            <div
              style={{
                position: 'absolute',
                left: 340,
                top: y,
                width: 200,
                height: 112,
                borderRadius: 60,
                border: '1px solid rgba(230,225,214,.48)',
                background: 'rgba(8,10,12,.82)',
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                fontFamily: sans,
                fontSize: 16,
                lineHeight: 1.35,
                letterSpacing: 2,
                color: C.silver2,
                boxShadow: `0 0 ${34 * glow}px rgba(235,225,210,.16)`,
              }}
            >
              <div>{a}<br/>{b}</div>
            </div>
            {i < 2 ? <div style={{position: 'absolute', left: 439, top: y + 112, width: 1, height: 58, background: 'rgba(220,215,205,.45)'}} /> : null}
            <div style={{position: 'absolute', left: 150, right: 150, top: y + 55, height: 1, background: 'linear-gradient(90deg, transparent, rgba(220,215,205,.24), transparent)'}} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Scene1 = () => (
  <AbsoluteFill style={{color: C.silver}}>
    <Background/>
    <div style={{position: 'absolute', left: 82, top: 145}}><Kicker>INVESTIGATIVE NOTE / 01</Kicker></div>
    <Title top={245} size={91}>「最強AI」を<br/>追うほど、<br/>見落とす。</Title>
    <ShineLine top={735}/>
    <div style={{position: 'absolute', left: 82, top: 800, width: 900, fontFamily: serif, fontSize: 47, lineHeight: 1.5, color: C.silver2}}>2026年、AIの価値は<br/><span style={{fontSize: 61, color: C.silver}}>生成から品質管理へ</span></div>
    <Orbit centerY={1320}/>
    <Caption text="最強のAIを追いかけている間に、価値の中心は別の場所へ動き始めています。"/>
  </AbsoluteFill>
);

const Scene2 = () => (
  <AbsoluteFill style={{color: C.silver}}>
    <Background/>
    <div style={{position: 'absolute', left: 82, top: 145}}><Kicker>BOTTLENECK / 02</Kicker></div>
    <Title top={245} size={72}>生成できるAIは増えた。<br/>だが、確認できる人間は<br/><span style={{fontSize: 86}}>増えていない。</span></Title>
    <ShineLine top={705}/>
    <div style={{position: 'absolute', left: 82, top: 770, width: 900, textAlign: 'center', fontFamily: serif, color: C.silver2, fontSize: 36, lineHeight: 1.6}}>量産の先で、<br/>何が本当のボトルネックになるのか。</div>
    <Funnel top={980}/>
    <Caption text="生成できるAIは増えた。だが、確認できる人間は増えていない。量産の先で、本当のボトルネックになるのは何か。"/>
  </AbsoluteFill>
);

const Scene3 = () => (
  <AbsoluteFill style={{color: C.silver}}>
    <Background/>
    <div style={{position: 'absolute', left: 82, top: 145}}><Kicker>HIDDEN AXIS / 03</Kicker></div>
    <Title top={240} size={74}>見えない競争軸は、<br/><span style={{fontSize: 88}}>「最強モデル」の外にある。</span></Title>
    <ShineLine top={635}/>
    <div style={{position: 'absolute', left: 82, top: 700, width: 900, fontFamily: sans, fontSize: 23, lineHeight: 1.55, color: C.silver2, letterSpacing: 2, textAlign: 'center'}}>MODEL INTELLIGENCE / ENVIRONMENT ACCESS / EVALUATION SYSTEM</div>
    <div style={{position: 'absolute', left: 82, top: 790, width: 900, fontFamily: serif, fontSize: 31, lineHeight: 1.6, color: C.muted, textAlign: 'center'}}>価値が生まれる場所は、もう「生成」だけではない。</div>
    <LayerStack top={930}/>
    <Caption text="そして、モデル性能だけを見ていると、見えない競争軸がある。"/>
  </AbsoluteFill>
);

const Scene4 = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{color: C.silver}}>
      <Background/>
      <div style={{position: 'absolute', left: 82, top: 145}}><Kicker>SIGNAL / 04</Kicker></div>
      <Title top={250} size={77}>これは、単なる<br/>便利機能の追加ではない。</Title>
      <ShineLine top={640}/>
      <div style={{position: 'absolute', left: 82, top: 730, width: 900, fontFamily: serif, fontSize: 38, lineHeight: 1.65, color: C.silver2, textAlign: 'center'}}>同じ兆候が、<br/>別々の制作現場で同時に現れている。</div>
      <div style={{position: 'absolute', left: 132, top: 980, width: 816, display: 'grid', gridTemplateColumns: '1fr', gap: 24}}>
        {['開発', 'デザイン', '動画制作'].map((label, i) => (
          <div key={label} style={{height: 130, border: '1px solid rgba(225,220,210,.32)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 34px', background: 'rgba(12,14,17,.58)', opacity: interpolate(f, [10 + i * 12, 24 + i * 12], [0, 1], clamp)}}>
            <span style={{fontFamily: serif, fontSize: 41}}>{label}</span>
            <span style={{fontFamily: sans, fontSize: 18, color: C.muted, letterSpacing: 4}}>SIGNAL DETECTED</span>
          </div>
        ))}
      </div>
      <Caption text="すでにその兆候は、開発、デザイン、動画制作の現場で同時に現れています。これは単なる便利機能の追加ではありません。"/>
    </AbsoluteFill>
  );
};

const Scene5 = () => {
  const f = useCurrentFrame();
  const glow = interpolate(f, [25, 90], [0, 1], clamp);
  return (
    <AbsoluteFill style={{color: C.silver}}>
      <Background/>
      <div style={{position: 'absolute', left: 82, top: 145}}><Kicker>FINAL NOTE / 05</Kicker></div>
      <Title top={300} size={88}>AIエージェントの<br/>次に来るもの。</Title>
      <ShineLine top={665}/>
      <div style={{position: 'absolute', left: 82, top: 750, width: 900, fontFamily: serif, fontSize: 61, lineHeight: 1.48, color: C.silver2, textAlign: 'center'}}>真相は、まだ<br/><span style={{color: C.silver}}>表に出ていない。</span></div>
      <div style={{position: 'absolute', left: 170, top: 1110, width: 740, height: 220, borderRadius: '50%', border: '1px solid rgba(225,220,210,.25)', boxShadow: `0 0 ${80 * glow}px rgba(235,225,210,.10), inset 0 0 80px rgba(235,225,210,.03)`, display: 'grid', placeItems: 'center'}}>
        <div style={{fontFamily: serif, fontSize: 48, color: C.silver}}>続きは note で。</div>
      </div>
      <div style={{position: 'absolute', left: 82, right: 82, top: 1405, borderTop: '1px solid rgba(225,220,210,.25)', paddingTop: 32, textAlign: 'center', fontFamily: sans, fontSize: 24, lineHeight: 1.55, color: C.silver2, letterSpacing: 1}}>note.com/structureflow/n/nbc342c6fd359</div>
      <div style={{position: 'absolute', left: 82, right: 82, top: 1508, textAlign: 'center', fontFamily: serif, fontSize: 24, lineHeight: 1.55, color: C.muted}}>「生成」から「自己検品・修正」へ移るAIの裏構造</div>
      <Caption text="AIエージェントの次に来るもの。その裏構造を、noteで掘り下げました。"/>
    </AbsoluteFill>
  );
};

const sceneFrames = [240, 270, 300, 270, 360];
const scenes = [Scene1, Scene2, Scene3, Scene4, Scene5];

const StructureflowNoteAd = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Audio src={staticFile('bgm.wav')} volume={0.13}/>
      <Audio src={staticFile('narration.mp3')} volume={1}/>
      {scenes.map((Scene, i) => {
        const from = start;
        start += sceneFrames[i];
        return (
          <Sequence key={i} from={from} durationInFrames={sceneFrames[i]}>
            <Scene/>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition
    id="StructureflowNoteAd"
    component={StructureflowNoteAd}
    durationInFrames={sceneFrames.reduce((a, b) => a + b, 0)}
    fps={30}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
