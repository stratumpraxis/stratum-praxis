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
} from 'remotion';

const C = {
  bg: '#070b10',
  panel: '#101820',
  panel2: '#17222d',
  text: '#f3f6f8',
  muted: '#9aa7b3',
  silver: '#c9d1d9',
  cyan: '#67d9e8',
  green: '#74d9a6',
  amber: '#e2c77b',
  red: '#df7580',
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const Background = ({accent = C.cyan}) => {
  const frame = useCurrentFrame();
  const x = 46 + Math.sin(frame / 38) * 8;
  const y = 40 + Math.cos(frame / 51) * 6;
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at ${x}% ${y}%, ${accent}18 0%, transparent 38%), linear-gradient(135deg, #06090d 0%, #0a1118 55%, #070b10 100%)`}}>
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        opacity: 0.28,
        transform: `translate(${(frame % 56) - 56}px, ${(frame % 56) - 56}px)`,
      }} />
    </AbsoluteFill>
  );
};

const Kicker = ({children}) => (
  <div style={{fontFamily: 'Arial, sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: 5, color: C.cyan, textTransform: 'uppercase'}}>{children}</div>
);

const Title = ({children, size = 84}) => (
  <div style={{fontFamily: 'Arial, sans-serif', fontSize: size, fontWeight: 900, lineHeight: .98, letterSpacing: -4, color: C.text}}>{children}</div>
);

const MovingCard = ({x, y, w = 280, h = 110, text, delay = 0, speed = 1, color = C.silver}) => {
  const frame = useCurrentFrame();
  const p = spring({frame: Math.max(0, frame - delay), fps: 30, config: {damping: 16, stiffness: 125}});
  const drift = Math.sin((frame + delay) / (18 / speed)) * 10;
  return (
    <div style={{position:'absolute', left:x, top:y + drift, width:w, height:h, borderRadius:22, border:`1px solid ${color}55`, background:'rgba(16,24,32,.9)', boxShadow:`0 20px 50px ${color}12`, display:'flex', alignItems:'center', justifyContent:'center', transform:`scale(${.88 + .12*p}) rotate(${(1-p)*-3}deg)`, opacity:p}}>
      <div style={{fontFamily:'Arial, sans-serif', color:C.text, fontWeight:850, fontSize:28, textAlign:'center', padding:18}}>{text}</div>
    </div>
  );
};

const ConveyorHook = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 150], [1.12, 1], {extrapolateRight:'clamp'});
  const barrier = spring({frame: Math.max(0, frame - 45), fps:30, config:{damping:14, stiffness:120}});
  return (
    <AbsoluteFill style={{overflow:'hidden'}}>
      <Background accent={C.red} />
      <div style={{position:'absolute', inset:0, transform:`scale(${zoom})`}}>
        {[0,1,2,3,4,5].map((i) => {
          const travel = ((frame*10 + i*330) % 2200) - 300;
          return <MovingCard key={i} x={travel} y={560 + (i%2)*130} w={270} text={['EMAIL','SLIDES','IDEAS','REPORTS','CODE','CONTENT'][i]} delay={i*2} speed={1+i*.05} color={i%2?C.cyan:C.silver}/>;
        })}
        <div style={{position:'absolute', right:190, top:395, width:240, height:430, borderRadius:28, background:'rgba(223,117,128,.08)', border:`3px solid ${C.red}`, transform:`scaleY(${barrier})`, transformOrigin:'bottom'}} />
        <div style={{position:'absolute', right:210, top:485, width:200, textAlign:'center', fontFamily:'Arial,sans-serif', fontSize:94, fontWeight:900, color:C.red}}>$0</div>
      </div>
      <div style={{position:'absolute', left:105, top:88}}><Kicker>The hidden AI trap</Kicker></div>
      <div style={{position:'absolute', left:105, top:155}}><Title size={118}>FASTER <span style={{color:C.red}}>≠</span> RICHER.</Title></div>
      <div style={{position:'absolute', left:110, bottom:78, fontFamily:'Arial,sans-serif', fontSize:30, color:C.muted}}>The model may be fine. The layer you automate may be wrong.</div>
    </AbsoluteFill>
  );
};

const OutputScene = () => {
  const frame = useCurrentFrame();
  const revenueX = interpolate(frame, [0,420], [0, 1], {extrapolateRight:'clamp'});
  return (
    <AbsoluteFill style={{overflow:'hidden'}}>
      <Background />
      <div style={{position:'absolute', left:105, top:85}}><Kicker>Task-level automation</Kicker></div>
      <div style={{position:'absolute', left:105, top:145, width:1120}}><Title>OUTPUT EXPLODES.<br/>REVENUE STAYS FLAT.</Title></div>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => {
        const p = (frame*3.2 + i*155) % 1350;
        const x = 100 + p;
        const y = 530 + Math.sin((frame+i*18)/22)*120;
        return <MovingCard key={i} x={x} y={y} w={180} h={82} text={['POST','EMAIL','IDEA'][i%3]} delay={0} speed={1.2} color={i%3===0?C.cyan:C.silver}/>;
      })}
      <div style={{position:'absolute', right:110, top:330, width:520, height:360, borderRadius:28, background:'rgba(16,24,32,.92)', border:'1px solid rgba(255,255,255,.12)', padding:34}}>
        <div style={{fontFamily:'Arial,sans-serif', color:C.muted, fontSize:24, fontWeight:700}}>OUTPUT</div>
        <div style={{fontFamily:'Arial,sans-serif', color:C.green, fontSize:92, fontWeight:900}}>+{Math.floor(revenueX*940)}%</div>
        <div style={{height:1, background:'rgba(255,255,255,.12)', margin:'20px 0 26px'}} />
        <div style={{fontFamily:'Arial,sans-serif', color:C.muted, fontSize:24, fontWeight:700}}>REVENUE</div>
        <div style={{fontFamily:'Arial,sans-serif', color:C.red, fontSize:92, fontWeight:900}}>+0%</div>
      </div>
    </AbsoluteFill>
  );
};

const BottleneckScene = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame/8)*.05;
  const labels = [
    ['CONTENT', 'NO CUSTOMERS'],
    ['AI WORK', 'APPROVAL GATE'],
    ['MORE OFFERS', 'NO DEMAND'],
  ];
  return (
    <AbsoluteFill style={{overflow:'hidden'}}>
      <Background accent={C.amber} />
      <div style={{position:'absolute', left:105, top:85}}><Kicker>The real economic layer</Kicker></div>
      <div style={{position:'absolute', left:105, top:145}}><Title>PROFIT LIVES AT<br/><span style={{color:C.amber}}>THE BOTTLENECK.</span></Title></div>
      <div style={{position:'absolute', left:105, right:105, top:465, height:200}}>
        <div style={{position:'absolute', left:0, top:72, width:'100%', height:46, borderRadius:23, background:'rgba(103,217,232,.14)', border:'1px solid rgba(103,217,232,.35)'}} />
        <div style={{position:'absolute', left:'47%', top:38, width:150, height:115, borderRadius:22, border:`3px solid ${C.amber}`, background:'rgba(226,199,123,.12)', transform:`scale(${pulse})`, boxShadow:`0 0 55px ${C.amber}33`}} />
        {[0,1,2,3,4,5,6,7].map((i) => {
          const left = ((frame*6 + i*230) % 1500);
          const stop = Math.min(left, 790 + i*2);
          return <div key={i} style={{position:'absolute', left:stop, top:77, width:36, height:36, borderRadius:18, background:i%2?C.cyan:C.silver, boxShadow:`0 0 24px ${C.cyan}55`}} />;
        })}
      </div>
      <div style={{position:'absolute', left:104, right:104, bottom:88, display:'flex', gap:26}}>
        {labels.map(([a,b],i) => <div key={a} style={{flex:1, padding:'28px 32px', borderRadius:24, background:'rgba(16,24,32,.88)', border:'1px solid rgba(255,255,255,.1)', transform:`translateY(${Math.sin((frame+i*15)/16)*7}px)`}}><div style={{fontFamily:'Arial,sans-serif', color:C.text, fontSize:28, fontWeight:850}}>{a}</div><div style={{fontFamily:'Arial,sans-serif', color:C.red, fontSize:22, fontWeight:800, marginTop:8}}>→ {b}</div></div>)}
      </div>
    </AbsoluteFill>
  );
};

const VerificationScene = () => {
  const frame = useCurrentFrame();
  const count = 18;
  return (
    <AbsoluteFill style={{overflow:'hidden'}}>
      <Background accent={C.red} />
      <div style={{position:'absolute', left:105, top:85}}><Kicker>The second trap</Kicker></div>
      <div style={{position:'absolute', left:105, top:145}}><Title>THE <span style={{color:C.red}}>VERIFICATION TAX.</span></Title></div>
      <div style={{position:'absolute', left:105, top:350, width:680, fontFamily:'Arial,sans-serif', color:C.muted, fontSize:34, lineHeight:1.35}}>More AI output creates more checking, choosing, coordination, and hidden mistakes.</div>
      {Array.from({length:count}).map((_,i) => {
        const angle = i*0.72 + frame*0.018;
        const radius = 170 + i*19;
        const x = 1300 + Math.cos(angle)*radius;
        const y = 580 + Math.sin(angle)*radius*.52;
        return <div key={i} style={{position:'absolute', left:x, top:y, width:110, height:70, borderRadius:16, background:'rgba(23,34,45,.96)', border:`1px solid ${i%4===0?C.red+'aa':'rgba(255,255,255,.12)'}`, transform:`rotate(${Math.sin(angle)*8}deg)`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif', color:i%4===0?C.red:C.silver, fontWeight:800, fontSize:18}}>{i%4===0?'REVIEW':'AI'}</div>;
      })}
      <div style={{position:'absolute', right:170, bottom:90, width:520, height:90, borderRadius:45, background:'rgba(223,117,128,.10)', border:`1px solid ${C.red}66`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif', color:C.red, fontSize:28, fontWeight:900}}>SYSTEM FEELS FASTER. SYSTEM STAYS STUCK.</div>
    </AbsoluteFill>
  );
};

const ConstraintScene = () => {
  const frame = useCurrentFrame();
  const words = ['MONEY','TIME','CUSTOMERS'];
  return (
    <AbsoluteFill style={{overflow:'hidden'}}>
      <Background accent={C.green} />
      <div style={{position:'absolute', left:105, top:85}}><Kicker>Reset the question</Kicker></div>
      <div style={{position:'absolute', left:105, top:145}}><Title>START WITH<br/><span style={{color:C.green}}>ONE EXPENSIVE CONSTRAINT.</span></Title></div>
      <div style={{position:'absolute', left:110, top:450, display:'flex', gap:28}}>
        {words.map((w,i) => <div key={w} style={{width:300, height:150, borderRadius:28, background:'rgba(16,24,32,.9)', border:`1px solid ${C.green}44`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial,sans-serif', color:C.text, fontSize:30, fontWeight:900, transform:`translateY(${Math.sin((frame+i*18)/14)*12}px)`}}>{w} LEAK</div>)}
      </div>
      <div style={{position:'absolute', right:105, top:410, width:760, height:330, borderRadius:32, border:'1px solid rgba(255,255,255,.12)', background:'rgba(16,24,32,.9)', padding:38}}>
        {['SIGNAL','DECISION','ACTION','MEASURE'].map((w,i) => {
          const p = spring({frame:Math.max(0, frame-i*18), fps:30, config:{damping:17, stiffness:110}});
          return <div key={w} style={{display:'flex', alignItems:'center', gap:18, marginTop:i?25:0, opacity:p, transform:`translateX(${(1-p)*40}px)`}}><div style={{width:56,height:56,borderRadius:28,background:C.green,color:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Arial,sans-serif',fontWeight:900,fontSize:22}}>{i+1}</div><div style={{fontFamily:'Arial,sans-serif',fontWeight:900,fontSize:34,color:C.text}}>{w}</div>{i<3?<div style={{flex:1,height:2,background:`linear-gradient(90deg, ${C.green}, transparent)`}}/>:null}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const ContrastScene = () => {
  const frame = useCurrentFrame();
  const open = spring({frame:Math.max(0, frame-65), fps:30, config:{damping:14, stiffness:100}});
  return (
    <AbsoluteFill style={{overflow:'hidden'}}>
      <Background accent={C.cyan} />
      <div style={{position:'absolute', left:105, top:85}}><Kicker>Two different AI systems</Kicker></div>
      <div style={{position:'absolute', left:105, top:145}}><Title>PRODUCTIVITY <span style={{color:C.muted}}>VS.</span> PROFIT</Title></div>
      <div style={{position:'absolute', left:105, top:340, width:790, height:570, borderRadius:30, background:'rgba(16,24,32,.9)', border:'1px solid rgba(255,255,255,.1)', padding:42}}>
        <div style={{fontFamily:'Arial,sans-serif',fontSize:28,fontWeight:900,color:C.red}}>AI WRITES FASTER</div>
        {Array.from({length:8}).map((_,i)=><div key={i} style={{position:'absolute',left:55+(i%4)*165,top:150+Math.floor(i/4)*155,width:130,height:100,borderRadius:18,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.04)',transform:`translateY(${Math.sin((frame+i*7)/12)*12}px)`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Arial,sans-serif',fontWeight:800,color:C.muted}}>FILE</div>)}
        <div style={{position:'absolute',left:50,right:50,bottom:55,fontFamily:'Arial,sans-serif',fontSize:28,fontWeight:900,color:C.red}}>MORE FILES. SAME CONSTRAINT.</div>
      </div>
      <div style={{position:'absolute', right:105, top:340, width:790, height:570, borderRadius:30, background:'rgba(16,24,32,.9)', border:`1px solid ${C.green}55`, padding:42}}>
        <div style={{fontFamily:'Arial,sans-serif',fontSize:28,fontWeight:900,color:C.green}}>AI REMOVES THE REVENUE CONSTRAINT</div>
        <div style={{position:'absolute',left:85,right:85,top:245,height:54,borderRadius:27,background:'rgba(116,217,166,.15)',border:`1px solid ${C.green}66`}} />
        <div style={{position:'absolute',left:360,top:195,width:80,height:155,borderRadius:18,background:C.red,transform:`scaleY(${1-open})`,transformOrigin:'center',opacity:1-open}} />
        {Array.from({length:7}).map((_,i)=>{
          const x = 90 + ((frame*8+i*130)%610);
          return <div key={i} style={{position:'absolute',left:x,top:254,width:34,height:34,borderRadius:17,background:C.green,boxShadow:`0 0 22px ${C.green}66`,opacity:open}}/>;
        })}
        <div style={{position:'absolute',left:70,right:70,bottom:85,display:'flex',justifyContent:'space-between',fontFamily:'Arial,sans-serif',fontWeight:900,fontSize:28,color:C.text}}><span>BLOCKED</span><span style={{color:C.green}}>FLOWING →</span></div>
      </div>
    </AbsoluteFill>
  );
};

const ScoreboardScene = () => {
  const frame = useCurrentFrame();
  const p = spring({frame, fps:30, config:{damping:18, stiffness:90}});
  const score = Math.floor(interpolate(frame,[20,210],[0,37],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}));
  return (
    <AbsoluteFill style={{overflow:'hidden', alignItems:'center', justifyContent:'center'}}>
      <Background accent={C.green} />
      <div style={{width:1500,textAlign:'center',transform:`scale(${.94+.06*p})`,opacity:p}}>
        <Kicker>The real AI metric</Kicker>
        <div style={{marginTop:28}}><Title size={104}>AUTOMATE THE <span style={{color:C.green}}>BOTTLENECK.</span></Title></div>
        <div style={{fontFamily:'Arial,sans-serif',color:C.muted,fontSize:34,marginTop:26}}>Not the busywork.</div>
        <div style={{margin:'55px auto 0',width:720,height:150,borderRadius:32,border:`1px solid ${C.green}55`,background:'rgba(16,24,32,.9)',display:'flex',alignItems:'center',justifyContent:'space-around'}}>
          <div style={{fontFamily:'Arial,sans-serif',color:C.muted,fontSize:24,fontWeight:800}}>SCOREBOARD</div>
          <div style={{fontFamily:'Arial,sans-serif',color:C.green,fontSize:86,fontWeight:900}}>+{score}%</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const HiddenVideo = () => (
  <AbsoluteFill style={{background:C.bg}}>
    <Audio src={staticFile('hidden-radio-bed.wav')} volume={0.32} />
    <Audio src={staticFile('hidden-narration.mp3')} volume={1} />

    <Sequence from={0} durationInFrames={240}><ConveyorHook /></Sequence>
    <Sequence from={240} durationInFrames={480}><OutputScene /></Sequence>
    <Sequence from={720} durationInFrames={480}><BottleneckScene /></Sequence>
    <Sequence from={1200} durationInFrames={480}><VerificationScene /></Sequence>
    <Sequence from={1680} durationInFrames={450}><ConstraintScene /></Sequence>
    <Sequence from={2130} durationInFrames={420}><ContrastScene /></Sequence>
    <Sequence from={2550} durationInFrames={450}><ScoreboardScene /></Sequence>

    {[240,720,1200,1680,2130,2550].map((f)=><Sequence key={f} from={f} durationInFrames={27}><Audio src={staticFile('hidden-air-whoosh.wav')} volume={0.42}/></Sequence>)}
    {[0,720,1200,2550].map((f)=><Sequence key={`hit-${f}`} from={f} durationInFrames={20}><Audio src={staticFile('hidden-soft-hit.wav')} volume={0.5}/></Sequence>)}
    {[1680,2550].map((f)=><Sequence key={`ch-${f}`} from={f+25} durationInFrames={36}><Audio src={staticFile('hidden-chime.wav')} volume={0.55}/></Sequence>)}
  </AbsoluteFill>
);

const Root = () => (
  <Composition
    id="ForwelleHiddenBottleneck"
    component={HiddenVideo}
    durationInFrames={3000}
    fps={30}
    width={1920}
    height={1080}
  />
);

registerRoot(Root);
