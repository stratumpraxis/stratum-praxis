import React from 'react';
import {AbsoluteFill, Composition, Easing, Sequence, interpolate, registerRoot, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import cfg from '../v4-config.json';

const C = {
  bg: cfg.colors.bg,
  bg2: cfg.colors.bg2,
  silver: cfg.colors.silver,
  white: cfg.colors.white,
  muted: cfg.colors.muted,
  blue: cfg.colors.blue,
  red: cfg.colors.red,
  card: cfg.colors.card,
  border: cfg.colors.border,
};
const clamp = {extrapolateLeft:'clamp', extrapolateRight:'clamp'};
const ease = Easing.bezier(.16,1,.3,1);
const frames = cfg.sceneFrames;
const total = frames.reduce((a,b)=>a+b,0);
const font = {fontFamily:'Arial, Helvetica, sans-serif'};

const fade = (frame,a,b) => interpolate(frame,[a,b],[0,1],{...clamp,easing:ease});

const Grid = ({pulse=false}) => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame,[0,180],[-350,1250],clamp);
  const glow = pulse ? .22 + .08*Math.sin(frame/7) : .12;
  return <AbsoluteFill style={{background:`radial-gradient(circle at 82% 18%, rgba(72,143,255,${glow}), transparent 34%),linear-gradient(180deg,${C.bg2},${C.bg} 50%,#010306)`}}>
    <AbsoluteFill style={{opacity:.30,backgroundImage:'linear-gradient(rgba(180,205,235,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(180,205,235,.055) 1px,transparent 1px)',backgroundSize:'64px 64px'}}/>
    <div style={{position:'absolute',top:-120,left:sweep,width:180,height:2160,rotate:'10deg',background:'linear-gradient(90deg,transparent,rgba(130,190,255,.09),transparent)',filter:'blur(14px)'}}/>
  </AbsoluteFill>;
};

const Shell = ({children,duration,pulse=false}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame,[0,7,duration-8,duration],[0,1,1,0],clamp);
  const y = interpolate(frame,[0,duration],[8,-8],clamp);
  return <AbsoluteFill style={{...font,color:C.white,overflow:'hidden',opacity}}>
    <Grid pulse={pulse}/>
    <div style={{position:'absolute',inset:0,translate:`0 ${y}px`}}>
      <div style={{position:'absolute',top:cfg.safeTop,left:72,fontSize:22,fontWeight:700,letterSpacing:8,color:C.silver}}>STRATUM PRAXIS</div>
      <div style={{position:'absolute',top:cfg.safeTop+54,left:72,width:160,height:3,background:'rgba(140,165,195,.22)'}}><div style={{width:52,height:3,background:C.blue,boxShadow:'0 0 16px rgba(104,170,255,.75)'}}/></div>
      {children}
    </div>
  </AbsoluteFill>;
};

const Kicker = ({children}) => <div style={{fontSize:22,color:C.blue,fontWeight:800,letterSpacing:3.2}}>{children}</div>;
const Body = ({children,width=860}) => <div style={{width,fontSize:30,lineHeight:1.42,color:C.muted}}>{children}</div>;

const AgentCard = ({name,rule,left,top,delay=0,bad=false}) => {
  const frame = useCurrentFrame();
  const p = fade(frame,delay,delay+14);
  const dx = Math.sin((frame+left)/18)*cfg.motionIntensity;
  return <div style={{position:'absolute',left,top,width:385,height:132,borderRadius:22,border:`1.5px solid ${bad?C.red:C.border}`,background:C.card,opacity:p,translate:`${dx}px 0`,padding:'22px 24px',boxShadow:bad?'0 0 34px rgba(255,105,105,.13)':'0 18px 44px rgba(0,0,0,.25)'}}>
    <div style={{display:'flex',alignItems:'center',gap:12}}><span style={{width:9,height:9,borderRadius:'50%',background:bad?C.red:C.blue,boxShadow:`0 0 12px ${bad?C.red:C.blue}`}}/><strong style={{fontSize:27}}>{name}</strong></div>
    <div style={{marginTop:14,fontSize:20,color:bad?'#ff9e9a':C.muted}}>{rule}</div>
  </div>;
};

const Hook = () => {
  const frame=useCurrentFrame();
  const slash=interpolate(frame,[12,36],[-60,950],{...clamp,easing:ease});
  return <Shell duration={frames[0]} pulse>
    <div style={{position:'absolute',left:72,top:245}}><Kicker>THE HIDDEN MULTI-AGENT FAILURE</Kicker></div>
    <div style={{position:'absolute',left:72,top:315,width:930,fontSize:cfg.hookSize,fontWeight:900,lineHeight:.94,letterSpacing:-4,opacity:fade(frame,0,10)}}>{cfg.hookLine1}<br/><span style={{color:C.blue}}>{cfg.hookLine2}</span></div>
    <div style={{position:'absolute',left:72,top:590}}><Body>{cfg.hookBody}</Body></div>
    <div style={{position:'absolute',left:72,top:930,width:880,height:2,background:'rgba(160,190,225,.17)'}}/>
    <div style={{position:'absolute',left:slash,top:870,width:150,height:140,rotate:'-18deg',background:'linear-gradient(90deg,transparent,rgba(255,105,105,.55),transparent)',filter:'blur(5px)',opacity:cfg.patternInterrupt?1:.25}}/>
    <div style={{position:'absolute',left:72,bottom:cfg.safeBottom,fontSize:20,color:C.muted}}>01 / 05</div>
  </Shell>;
};

const Drift = () => {
  const frame=useCurrentFrame();
  const flash = cfg.patternInterrupt ? interpolate(frame,[62,68,74],[0,.52,0],clamp) : 0;
  return <Shell duration={frames[1]}>
    <div style={{position:'absolute',left:72,top:235}}><Kicker>PERMISSION DRIFT</Kicker></div>
    <div style={{position:'absolute',left:72,top:305,fontSize:72,fontWeight:900,lineHeight:.98,letterSpacing:-3}}>SAME TASK.<br/>DIFFERENT RULES.</div>
    <div style={{position:'absolute',left:72,top:500}}><Body>Each agent can be individually capable while the system becomes collectively unsafe.</Body></div>
    <AgentCard name="CLAUDE" rule="Can draft + propose" left={72} top={790} delay={8}/>
    <AgentCard name="CODEX" rule="Can edit + execute" left={620} top={930} delay={18} bad/>
    <AgentCard name="CURSOR" rule="Can modify repo context" left={110} top={1170} delay={28}/>
    <AgentCard name="AGENT N" rule="Stop rule: undefined" left={610} top={1370} delay={38} bad/>
    <svg width="1080" height="1920" style={{position:'absolute',inset:0,opacity:.72}}>
      <path d="M457 855 C560 850 550 960 620 990" fill="none" stroke={C.blue} strokeWidth="2"/>
      <path d="M300 922 C330 1040 300 1110 300 1170" fill="none" stroke={C.blue} strokeWidth="2"/>
      <path d="M490 1240 C560 1260 560 1410 610 1430" fill="none" stroke={C.red} strokeWidth="2.5" strokeDasharray="10 10"/>
    </svg>
    <AbsoluteFill style={{background:`rgba(255,70,70,${flash})`,mixBlendMode:'screen'}}/>
    <div style={{position:'absolute',left:72,bottom:cfg.safeBottom,fontSize:20,color:C.muted}}>02 / 05 · Invisible until the rules collide</div>
  </Shell>;
};

const Collision = () => {
  const frame=useCurrentFrame();
  return <Shell duration={frames[2]} pulse>
    <div style={{position:'absolute',left:72,top:235}}><Kicker>WHAT BREAKS FIRST</Kicker></div>
    <div style={{position:'absolute',left:72,top:305,fontSize:70,fontWeight:900,lineHeight:.98,letterSpacing:-3}}>CONTROL FAILS<br/>BEFORE MODELS DO.</div>
    <div style={{position:'absolute',left:72,top:520}}><Body>Ownership, approvals, budgets and stop conditions need a single source of operational truth.</Body></div>
    <div style={{position:'absolute',left:72,top:720,width:936,display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
      {cfg.failureCards.map((x,i)=><div key={x.label} style={{height:205,borderRadius:24,border:`1.5px solid ${i===cfg.highlightFailure?C.red:C.border}`,background:C.card,padding:'28px',opacity:fade(frame,8+i*5,22+i*5),boxShadow:i===cfg.highlightFailure?'0 0 34px rgba(255,105,105,.12)':'0 14px 34px rgba(0,0,0,.2)'}}>
        <div style={{fontSize:18,color:i===cfg.highlightFailure?C.red:C.blue,fontWeight:800,letterSpacing:2}}>{x.label}</div>
        <div style={{fontSize:29,fontWeight:800,lineHeight:1.15,marginTop:18}}>{x.text}</div>
      </div>)}
    </div>
    <div style={{position:'absolute',left:72,bottom:cfg.safeBottom,fontSize:20,color:C.muted}}>03 / 05 · One conflict can invalidate the whole chain</div>
  </Shell>;
};

const Layer = () => {
  const frame=useCurrentFrame();
  return <Shell duration={frames[3]}>
    <div style={{position:'absolute',left:72,top:235}}><Kicker>ONE OPERATING LAYER</Kicker></div>
    <div style={{position:'absolute',left:72,top:305,fontSize:74,fontWeight:900,lineHeight:.98,letterSpacing:-3}}>ALIGN THE STACK.</div>
    <div style={{position:'absolute',left:72,top:430}}><Body>{cfg.proofLine}</Body></div>
    <div style={{position:'absolute',left:72,top:635,width:936,display:'flex',flexDirection:'column',gap:16}}>
      {cfg.features.map((x,i)=><div key={x} style={{height:120,borderRadius:22,border:`${i===2?2:1.5}px solid ${i===2?C.blue:C.border}`,background:i===2?'linear-gradient(90deg,rgba(18,54,92,.95),rgba(7,15,26,.96))':C.card,display:'flex',alignItems:'center',padding:'0 28px',gap:24,opacity:fade(frame,7+i*5,20+i*5),boxShadow:i===2?'0 0 38px rgba(104,170,255,.18)':'0 12px 30px rgba(0,0,0,.18)'}}>
        <span style={{fontSize:18,color:C.blue,fontWeight:900}}>{String(i+1).padStart(2,'0')}</span><strong style={{fontSize:29}}>{x}</strong>
      </div>)}
    </div>
    <div style={{position:'absolute',left:72,bottom:cfg.safeBottom,fontSize:20,color:C.muted}}>04 / 05 · Portable control across agents</div>
  </Shell>;
};

const CTA = () => {
  const frame=useCurrentFrame();
  const p=fade(frame,3,18);
  const buttonScale=1+Math.max(0,Math.sin((frame-35)/16))*cfg.ctaPulse;
  return <Shell duration={frames[4]} pulse>
    <div style={{position:'absolute',left:72,top:235}}><Kicker>CROSS-AGENT OPERATING KIT</Kicker></div>
    <div style={{position:'absolute',left:72,top:310,width:930,fontSize:68,fontWeight:900,lineHeight:.98,letterSpacing:-3,opacity:p}}>{cfg.ctaHeadline}</div>
    <div style={{position:'absolute',left:72,top:650,fontSize:150,fontWeight:900,letterSpacing:-7}}>$69</div>
    <div style={{position:'absolute',left:77,top:815,fontSize:24,color:C.blue,fontWeight:900,letterSpacing:3}}>PERSONAL LICENSE</div>
    <div style={{position:'absolute',left:72,top:900}}><Body>{cfg.ctaBody}</Body></div>
    <div style={{position:'absolute',left:72,top:1125,width:650,height:132,borderRadius:24,background:`linear-gradient(180deg,${C.white},${C.silver})`,color:'#03101e',display:'grid',placeItems:'center',fontSize:34,fontWeight:900,scale:buttonScale,boxShadow:'0 0 60px rgba(104,170,255,.30)'}}>SEE THE OPERATING LAYER →</div>
    <div style={{position:'absolute',left:72,top:1310,fontSize:23,color:'#96c5ff'}}>stratumpraxis.com/cross-agent-operating-kit.html</div>
    <div style={{position:'absolute',left:72,top:1380,fontSize:22,color:C.muted}}>AI-generated narration · Personal · $69</div>
    <div style={{position:'absolute',left:72,bottom:cfg.safeBottom,fontSize:20,color:C.muted}}>05 / 05 · STRATUM PRAXIS</div>
  </Shell>;
};

const PermissionDriftV4=()=>{
  const scenes=[Hook,Drift,Collision,Layer,CTA];
  let s=0;
  return <AbsoluteFill style={{background:C.bg}}>
    <Audio src={staticFile('bgm.wav')} volume={cfg.bgmVolume}/>
    <Audio src={staticFile('narration-v4.mp3')} volume={cfg.narrationVolume}/>
    {scenes.map((Scene,i)=>{const from=s;s+=frames[i];return <Sequence key={i} from={from} durationInFrames={frames[i]}><Scene/></Sequence>;})}
  </AbsoluteFill>;
};

const Root=()=> <Composition id="CrossAgentPermissionDriftV4" component={PermissionDriftV4} durationInFrames={total} fps={30} width={1080} height={1920}/>;
registerRoot(Root);
