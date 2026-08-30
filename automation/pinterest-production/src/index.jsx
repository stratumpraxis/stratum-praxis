import React from 'react';
import {AbsoluteFill, Composition, Easing, interpolate, registerRoot, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';

const C = {
  ink: '#17202a', paper: '#f5f1e8', paper2: '#ebe4d8', blue: '#6aa8d8', jade: '#49a88d', plum: '#4a2d50', persimmon: '#e87143', wasabi: '#a7b94d', white: '#fffdf8', muted: '#69747c'
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const enter = (f, a=0, b=14) => interpolate(f,[a,b],[0,1],{...clamp,easing:ease});

const Grain = () => <AbsoluteFill style={{pointerEvents:'none',opacity:.07,backgroundImage:'radial-gradient(#17202a 0.7px, transparent 0.8px)',backgroundSize:'6px 6px',mixBlendMode:'multiply'}}/>;

const Background = ({accent=C.blue}) => {
  const f = useCurrentFrame();
  const x = 48 + Math.sin(f/42)*4;
  const y = 22 + Math.cos(f/55)*3;
  return <AbsoluteFill style={{background:`linear-gradient(145deg, ${C.paper} 0%, ${C.paper2} 100%)`,overflow:'hidden'}}>
    <div style={{position:'absolute',width:680,height:680,borderRadius:'50%',left:-260,top:520,background:accent,opacity:.16,filter:'blur(2px)',transform:`translate(${x}px,${y}px)`}}/>
    <div style={{position:'absolute',width:540,height:540,borderRadius:'46% 54% 58% 42%',right:-180,top:100,background:C.plum,opacity:.08,transform:`rotate(${f*.025}deg)`}}/>
    <div style={{position:'absolute',left:74,right:74,top:300,height:1,background:'#17202a18'}}/>
    <Grain/>
  </AbsoluteFill>;
};

const Brand = () => <div style={{position:'absolute',top:292,left:86,right:86,display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:'Arial, Helvetica, sans-serif',fontWeight:800,fontSize:22,letterSpacing:3.6,color:C.ink}}>
  <span>STRATUM PRAXIS</span><span style={{color:C.muted,fontWeight:600}}>SAVE · BUILD · CONTROL</span>
</div>;

const Pill = ({children,bg=C.ink,color=C.white}) => <div style={{display:'inline-flex',padding:'11px 18px',borderRadius:999,background:bg,color,fontFamily:'Arial, Helvetica, sans-serif',fontSize:22,fontWeight:800,letterSpacing:2.2}}>{children}</div>;

const Hook = () => {
  const f=useCurrentFrame();
  const p=enter(f,0,18);
  const line=interpolate(f,[12,55],[0,1],clamp);
  return <AbsoluteFill>
    <Background accent={C.blue}/><Brand/>
    <div style={{position:'absolute',left:86,right:86,top:390,opacity:p,transform:`translateY(${(1-p)*42}px)`}}>
      <Pill bg={C.plum}>AI WORKFLOW CHECKLIST</Pill>
      <div style={{fontFamily:'Arial, Helvetica, sans-serif',fontSize:96,lineHeight:.92,fontWeight:900,letterSpacing:-5.4,color:C.ink,marginTop:30}}>BEFORE YOU<br/>AUTOMATE<br/><span style={{color:C.persimmon}}>WITH AI.</span></div>
      <div style={{marginTop:38,fontFamily:'Georgia, serif',fontSize:39,lineHeight:1.2,color:C.muted,maxWidth:760}}>Three checks that keep agent autonomy inside useful boundaries.</div>
      <div style={{marginTop:50,width:720,height:9,borderRadius:99,background:'#17202a16',overflow:'hidden'}}><div style={{height:'100%',width:`${line*100}%`,background:C.jade}}/></div>
    </div>
  </AbsoluteFill>;
};

const CheckCard = ({number,label,question,accent,icon}) => {
  const f=useCurrentFrame();
  const {fps}=useVideoConfig();
  const s=spring({frame:f,fps,config:{damping:17,stiffness:115,mass:.8}});
  const scan=interpolate(f,[24,105],[0,1],clamp);
  return <AbsoluteFill>
    <Background accent={accent}/><Brand/>
    <div style={{position:'absolute',left:86,right:86,top:405}}>
      <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:24}}><Pill bg={accent}>{number} / 03</Pill><span style={{fontFamily:'Arial',fontSize:25,letterSpacing:2.5,fontWeight:800,color:C.muted}}>BEFORE AUTONOMY</span></div>
      <div style={{background:C.white,border:'2px solid #17202a20',borderRadius:34,padding:'42px 42px 46px',boxShadow:'0 24px 60px #17202a1c',transform:`translateY(${(1-s)*45}px) scale(${.96+.04*s})`,opacity:s}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div><div style={{fontFamily:'Arial',fontSize:76,fontWeight:900,letterSpacing:-3.5,color:C.ink}}>{label}</div><div style={{fontFamily:'Georgia, serif',fontSize:41,lineHeight:1.16,color:C.muted,maxWidth:690,marginTop:16}}>{question}</div></div>
          <div style={{width:104,height:104,borderRadius:28,display:'grid',placeItems:'center',background:`${accent}20`,fontFamily:'Arial',fontSize:56,fontWeight:900,color:accent}}>{icon}</div>
        </div>
        <div style={{position:'relative',height:178,marginTop:42,borderRadius:26,background:'#17202a08',overflow:'hidden',border:'1px solid #17202a12'}}>
          <div style={{position:'absolute',left:40,right:40,top:86,height:3,background:'#17202a20'}}/>
          {[0,1,2,3].map((i)=><div key={i} style={{position:'absolute',left:54+i*198,top:63,width:48,height:48,borderRadius:14,background:i===3?accent:C.white,border:`2px solid ${i===3?accent:'#17202a30'}`,boxShadow:'0 5px 12px #17202a12'}}/>)}
          <div style={{position:'absolute',left:54,top:64,width:594*scan,height:46,borderTop:`4px solid ${accent}`,borderRadius:12}}/>
        </div>
      </div>
    </div>
  </AbsoluteFill>;
};

const Warning = () => {
  const f=useCurrentFrame(); const p=enter(f,0,15); const pulse=1+Math.sin(f/7)*.012;
  return <AbsoluteFill>
    <Background accent={C.persimmon}/><Brand/>
    <div style={{position:'absolute',left:86,right:86,top:410,opacity:p}}>
      <Pill bg={C.persimmon}>DECISION RULE</Pill>
      <div style={{fontFamily:'Arial',fontSize:90,fontWeight:900,lineHeight:.94,letterSpacing:-4.7,color:C.ink,marginTop:30}}>CAN'T ANSWER<br/>ALL THREE?</div>
      <div style={{marginTop:30,padding:'30px 34px',borderRadius:28,background:C.plum,color:C.white,fontFamily:'Arial',fontSize:48,fontWeight:850,lineHeight:1.05,transform:`scale(${pulse})`}}>DON'T ADD MORE<br/>AUTONOMY YET.</div>
      <div style={{fontFamily:'Georgia, serif',fontSize:34,lineHeight:1.25,color:C.muted,marginTop:32}}>Scope. Approval. Stop. Define the boundary before the agent moves faster.</div>
    </div>
  </AbsoluteFill>;
};

const End = () => {
  const f=useCurrentFrame(); const p=enter(f,0,18);
  return <AbsoluteFill>
    <Background accent={C.jade}/><Brand/>
    <div style={{position:'absolute',left:86,right:86,top:390,opacity:p,transform:`translateY(${(1-p)*38}px)`}}>
      <Pill bg={C.jade}>SAVE THIS CHECKLIST</Pill>
      <div style={{fontFamily:'Arial',fontSize:82,fontWeight:900,lineHeight:.95,letterSpacing:-4.1,color:C.ink,marginTop:30}}>KEEP THE BRAIN.<br/><span style={{color:C.plum}}>CHANGE THE AGENT.</span></div>
      <div style={{marginTop:38,borderRadius:30,padding:'30px 34px',background:C.white,border:'2px solid #17202a1a',boxShadow:'0 20px 50px #17202a16'}}>
        <div style={{fontFamily:'Arial',fontSize:29,fontWeight:900,letterSpacing:.4,color:C.ink}}>CROSS-AGENT OPERATING KIT</div>
        <div style={{fontFamily:'Georgia, serif',fontSize:28,color:C.muted,marginTop:8}}>Portable policies · human gates · stop rules</div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',marginTop:22}}><span style={{fontFamily:'Arial',fontWeight:900,fontSize:35,color:C.persimmon}}>FROM $69</span><span style={{fontFamily:'Arial',fontSize:22,fontWeight:800,color:C.muted}}>stratumpraxis.com</span></div>
      </div>
    </div>
  </AbsoluteFill>;
};

const Video = () => <AbsoluteFill>
  <Sequence from={0} durationInFrames={90}><Hook/></Sequence>
  <Sequence from={90} durationInFrames={140}><CheckCard number="01" label="SCOPE" question="What can the agent touch?" accent={C.blue} icon="↔"/></Sequence>
  <Sequence from={230} durationInFrames={140}><CheckCard number="02" label="APPROVAL" question="Which actions need a human?" accent={C.jade} icon="✓"/></Sequence>
  <Sequence from={370} durationInFrames={140}><CheckCard number="03" label="STOP" question="Exactly what makes it halt?" accent={C.persimmon} icon="■"/></Sequence>
  <Sequence from={510} durationInFrames={75}><Warning/></Sequence>
  <Sequence from={585} durationInFrames={75}><End/></Sequence>
  <Audio src={staticFile('ambient.wav')} volume={0.18}/>
  <Audio src={staticFile('narration.mp3')} volume={1}/>
</AbsoluteFill>;

const Root=()=> <Composition id="PinterestWorkflowChecklist" component={Video} durationInFrames={660} fps={30} width={1080} height={1920}/>;
registerRoot(Root);
