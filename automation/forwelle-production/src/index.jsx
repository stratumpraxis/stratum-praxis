import React from 'react';
import {AbsoluteFill, Composition, interpolate, registerRoot, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';

const bg = '#08090c';
const fg = '#f5f7fb';
const muted = '#8e98a8';
const accent = '#d9dde5';
const fade = (frame, start, end) => interpolate(frame, [start, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const Grid = () => {
  const frame = useCurrentFrame();
  const y = (frame * 1.1) % 80;
  return <AbsoluteFill style={{opacity:0.12,backgroundImage:`linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,backgroundSize:'80px 80px',backgroundPosition:`0 ${y}px`}} />;
};

const Frame = ({eyebrow,title,body,index}) => {
  const frame = useCurrentFrame();
  const enter = fade(frame,0,12);
  const rise = interpolate(frame,[0,18],[70,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <AbsoluteFill style={{backgroundColor:bg,color:fg,fontFamily:'Arial, Helvetica, sans-serif',padding:'150px 92px 130px',justifyContent:'center'}}>
    <Grid />
    <div style={{position:'absolute',top:88,left:92,right:92,display:'flex',justifyContent:'space-between',fontSize:28,letterSpacing:5,color:muted}}><span>// FORWELLE</span><span>0{index}</span></div>
    <div style={{position:'relative',opacity:enter,transform:`translateY(${rise}px)`}}>
      <div style={{fontSize:32,letterSpacing:5,color:muted,marginBottom:34,textTransform:'uppercase'}}>{eyebrow}</div>
      <div style={{fontSize:96,lineHeight:0.98,fontWeight:850,letterSpacing:-5,maxWidth:900}}>{title}</div>
      <div style={{width:150,height:8,backgroundColor:accent,margin:'44px 0 36px'}} />
      <div style={{fontSize:42,lineHeight:1.28,maxWidth:860,color:'#d8dce4'}}>{body}</div>
    </div>
  </AbsoluteFill>;
};

const Gates = () => {
  const frame = useCurrentFrame();
  const items = ['MONEY', 'PUBLISHING', 'PERMISSIONS', 'DELETION'];
  return <AbsoluteFill style={{backgroundColor:bg,color:fg,fontFamily:'Arial, Helvetica, sans-serif',padding:'150px 80px'}}>
    <Grid />
    <div style={{fontSize:30,letterSpacing:5,color:muted,marginBottom:62}}>// HUMAN GATES</div>
    {items.map((item,i)=>{
      const p=fade(frame,i*16,i*16+12);
      return <div key={item} style={{display:'flex',alignItems:'center',gap:28,marginBottom:34,opacity:p,transform:`translateX(${interpolate(p,[0,1],[55,0])}px)`}}>
        <div style={{width:80,height:80,border:`2px solid ${accent}`,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,fontWeight:800}}>0{i+1}</div>
        <div style={{fontSize:54,fontWeight:780,letterSpacing:-1}}>{item}</div>
      </div>;
    })}
    <div style={{marginTop:'auto',fontSize:30,color:muted}}>Do not review everything. Review what matters.</div>
  </AbsoluteFill>;
};

const End = () => {
  const frame=useCurrentFrame();
  const p=fade(frame,0,18);
  const pulse=1+Math.sin(frame/8)*0.015;
  return <AbsoluteFill style={{backgroundColor:bg,color:fg,fontFamily:'Arial, Helvetica, sans-serif',alignItems:'center',justifyContent:'center',textAlign:'center',padding:90}}>
    <Grid />
    <div style={{opacity:p,transform:`scale(${pulse})`}}>
      <div style={{fontSize:34,letterSpacing:7,color:muted,marginBottom:28}}>// FORWELLE</div>
      <div style={{fontSize:90,fontWeight:850,lineHeight:1.02,letterSpacing:-4}}>SELECTIVE GATES.<br/>REAL CONTROL.</div>
      <div style={{fontSize:34,color:'#c7ccd5',marginTop:42}}>Human judgment belongs at irreversible edges.</div>
    </div>
  </AbsoluteFill>;
};

const Short=()=> <AbsoluteFill>
  <Sequence from={0} durationInFrames={180}><Frame index={1} eyebrow="The hidden failure mode" title="APPROVAL EVERYWHERE IS NOT CONTROL." body="Too many prompts create approval fatigue." /></Sequence>
  <Sequence from={180} durationInFrames={210}><Frame index={2} eyebrow="A better pattern" title="LET LOW-RISK ACTIONS RUN." body="Save human attention for the points where mistakes become expensive." /></Sequence>
  <Sequence from={390} durationInFrames={210}><Gates /></Sequence>
  <Sequence from={600} durationInFrames={180}><End /></Sequence>
  <Audio src={staticFile('narration.mp3')} />
</AbsoluteFill>;

const Root=()=> <Composition id="ForwelleShort" component={Short} durationInFrames={780} fps={30} width={1080} height={1920} />;
registerRoot(Root);
