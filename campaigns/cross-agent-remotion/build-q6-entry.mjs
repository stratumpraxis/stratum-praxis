import fs from 'node:fs';

const input = 'src/index.jsx';
const output = 'src/index-q6-runtime.jsx';
let out = fs.readFileSync(input, 'utf8');

const mustReplace = (needle, replacement, label) => {
  if (!out.includes(needle)) throw new Error(`Q6 builder: missing ${label}`);
  out = out.replace(needle, replacement);
};

const replaceBetween = (startMarker, endMarker, replacement, label) => {
  const start = out.indexOf(startMarker);
  const end = out.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Q6 builder: missing ${label}`);
  out = out.slice(0, start) + replacement + out.slice(end);
};

const atmosphere = String.raw`
const DepthAtmosphere = ({mode = 'neutral'}) => {
  const frame = useCurrentFrame();
  const tone = mode === 'conflict' ? C.red : C.blue;
  const farX = Math.sin(frame / 43) * 18;
  const farY = Math.cos(frame / 51) * 12;
  const midX = Math.sin(frame / 31 + 1.2) * 26;
  const nearX = Math.sin(frame / 19 + 2.1) * 36;
  const particles = Array.from({length:11},(_,i)=>({x:80+((i*173)%920),y:650+((i*257)%980),r:2+(i%3)*1.3,speed:.45+(i%4)*.18}));
  return <AbsoluteFill style={{pointerEvents:'none',overflow:'hidden'}}>
    <div style={{position:'absolute',left:-150+farX,top:500+farY,width:820,height:820,borderRadius:'50%',background:`radial-gradient(circle,${mode==='conflict'?'rgba(255,116,111,.075)':'rgba(104,170,255,.075)'},transparent 68%)`,filter:'blur(34px)',opacity:.78}} />
    <div style={{position:'absolute',right:-230+midX,top:700,width:720,height:900,rotate:'-11deg',background:'linear-gradient(90deg,transparent,rgba(135,190,255,.06),transparent)',filter:'blur(20px)',opacity:.78}} />
    {particles.map((p,i)=><div key={i} style={{position:'absolute',left:p.x+nearX*p.speed,top:p.y+Math.sin(frame/22+i)*9,width:p.r,height:p.r,borderRadius:'50%',background:tone,opacity:.08+(i%4)*.025,boxShadow:`0 0 ${10+i}px ${tone}`}} />)}
    <div style={{position:'absolute',inset:'58% -8% -18% -8%',background:'linear-gradient(180deg,transparent,rgba(0,0,0,.36))',filter:'blur(12px)'}} />
  </AbsoluteFill>;
};

`;
mustReplace('const Brand = () => (', atmosphere + 'const Brand = () => (', 'DepthAtmosphere insertion point');

const agentNode = String.raw`const AgentNode = ({label,left,top,delay,strong=false}) => {
  const frame=useCurrentFrame();
  const inP=interpolate(frame,[delay,delay+18],[0,1],{...clamp,easing:Easing.bezier(.16,1,.3,1)});
  const depth=strong?1.025:.985+((left%5)*.003);
  const driftX=Math.sin((frame+left)/(strong?32:24))*(strong?2:7);
  const driftY=Math.cos((frame+top)/37)*(strong?1.5:3.5);
  const highlight=.07+.025*(1+Math.sin((frame+left)/29))/2;
  return <div style={{position:'absolute',left,top,width:220,height:92,borderRadius:22,border:`1.5px solid ${strong?'rgba(104,170,255,.72)':C.border}`,background:strong?'linear-gradient(145deg,rgba(18,48,82,.97),rgba(7,18,30,.94))':'linear-gradient(145deg,rgba(15,27,43,.94),rgba(5,11,19,.96))',display:'flex',alignItems:'center',paddingLeft:28,gap:16,opacity:inP,translate:`${driftX}px ${driftY}px`,scale:depth,boxShadow:strong?'0 22px 56px rgba(0,0,0,.34),0 0 34px rgba(104,170,255,.20),inset 0 1px 0 rgba(255,255,255,.10)':`0 24px 54px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,${highlight})`,backdropFilter:'blur(7px)'}}>
    <div style={{width:9,height:9,borderRadius:'50%',background:C.blue,boxShadow:'0 0 14px rgba(104,170,255,.9)'}} />
    <div style={{fontSize:27,color:C.white}}>{label}</div>
  </div>;
};

`;
replaceBetween('const AgentNode =','const Hook =',agentNode,'AgentNode');

const infoCard = String.raw`const InfoCard = ({label,text,index}) => {
  const frame=useCurrentFrame();
  const depthScale=.985+(index%3)*.008;
  const dx=Math.sin((frame+index*17)/(28+index))*(3+(index%2)*3);
  const dy=Math.cos((frame+index*11)/34)*(1.5+(index%3));
  const surface=index%3===0?'linear-gradient(145deg,rgba(18,34,54,.96),rgba(6,13,22,.95))':index%3===1?'linear-gradient(155deg,rgba(11,23,38,.90),rgba(8,14,23,.98))':'linear-gradient(135deg,rgba(20,29,43,.93),rgba(5,11,19,.97))';
  return <Fade from={8+index*4} dy={18}>
    <div style={{height:205,borderRadius:24,border:`1.5px solid ${index===3?'rgba(255,116,111,.48)':C.border}`,background:surface,padding:'26px 28px',translate:`${dx}px ${dy}px`,scale:depthScale,boxShadow:`0 ${18+index*2}px ${42+index*3}px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.065)`,backdropFilter:'blur(8px)'}}>
      <div style={{fontSize:19,color:index===3?C.red:C.blue,letterSpacing:2,fontWeight:700}}>{label}</div>
      <div style={{fontSize:31,lineHeight:1.12,fontWeight:800,marginTop:16}}>{text}</div>
    </div>
  </Fade>;
};

`;
replaceBetween('const InfoCard =','const Scene2 =',infoCard,'InfoCard');

mustReplace('<SceneShell duration={sceneFrames[2]}>','<SceneShell duration={sceneFrames[2]} intensity={1.05}>\n    <DepthAtmosphere mode="conflict" />','Scene2 atmosphere');
mustReplace('<SceneShell duration={sceneFrames[3]} intensity={1.1}>','<SceneShell duration={sceneFrames[3]} intensity={1.1}>\n      <DepthAtmosphere mode="policy" />','Scene3 atmosphere');

const oldScene3Card = "<div style={{height: 116, borderRadius: 23, border: `${i === 2 ? 2.5 : 1.5}px solid ${i === 2 ? C.blue : C.border}`, background: i === 2 ? 'linear-gradient(90deg,rgba(18,52,88,.94),rgba(7,16,28,.96))' : C.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', boxShadow: i === 2 ? `0 0 42px rgba(104,170,255,${masterGlow})` : '0 15px 35px rgba(0,0,0,.18)'}}>";
const newScene3Card = "<div style={{height:116,borderRadius:23,border:`${i===2?2.5:1.5}px solid ${i===2?C.blue:C.border}`,background:i===2?'linear-gradient(105deg,rgba(24,67,112,.97),rgba(6,17,29,.97))':(i%2?'linear-gradient(145deg,rgba(13,25,39,.94),rgba(6,12,20,.97))':'linear-gradient(155deg,rgba(17,29,43,.92),rgba(5,11,19,.98))'),display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',translate:`${Math.sin((frame+i*9)/30)*(i===2?1.5:4)}px ${Math.cos((frame+i*13)/38)*(i===2?1:2.5)}px`,scale:i===2?1.012:.992+(i%2)*.004,boxShadow:i===2?`0 26px 62px rgba(0,0,0,.34),0 0 46px rgba(104,170,255,${masterGlow}),inset 0 1px 0 rgba(255,255,255,.10)`:'0 22px 48px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.055)',backdropFilter:'blur(8px)'}}>";
mustReplace(oldScene3Card,newScene3Card,'Scene3 material/motion');

const scene4 = String.raw`const Scene4 = () => {
  const frame=useCurrentFrame();
  const cards=[['01','Master policy'],['02','Agent adapters'],['03','Conflict checks'],['04','Human gates'],['05','Budget + quota guard'],['06','Migration score']];
  return <SceneShell duration={sceneFrames[4]} intensity={1.05}>
    <DepthAtmosphere mode="kit" />
    <div style={{position:'absolute',left:72,top:205,fontSize:24,color:C.blue,letterSpacing:3,fontWeight:700}}>INSIDE THE KIT</div>
    <Fade><div style={{position:'absolute',left:72,top:280,fontSize:82,fontWeight:900,lineHeight:1.0,letterSpacing:-3}}>BUILT FOR<br/>REAL OPERATIONS.</div></Fade>
    <div style={{position:'absolute',left:72,top:490,width:860,fontSize:30,lineHeight:1.42,color:C.mid}}>A compact control layer for teams of AI tools — not another prompt bundle.</div>
    <div style={{position:'absolute',left:72,top:650,width:936,display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
      {cards.map(([n,label],i)=>{
        const dx=Math.sin((frame+i*14)/(30+i))*4;
        const dy=Math.cos((frame+i*9)/38)*2;
        const surface=i%3===0?'linear-gradient(145deg,rgba(17,33,52,.96),rgba(5,12,20,.97))':i%3===1?'linear-gradient(155deg,rgba(11,24,39,.94),rgba(6,12,20,.98))':'linear-gradient(135deg,rgba(20,29,43,.92),rgba(5,11,19,.98))';
        return <Fade key={n} from={8+i*4} dy={18}><div style={{height:210,borderRadius:24,border:`1.5px solid ${C.border}`,background:surface,padding:27,translate:`${dx}px ${dy}px`,scale:.99+(i%2)*.006,boxShadow:'0 24px 52px rgba(0,0,0,.27),inset 0 1px 0 rgba(255,255,255,.06)',backdropFilter:'blur(8px)'}}><div style={{fontSize:18,color:C.blue,fontWeight:700}}>{n}</div><div style={{fontSize:31,fontWeight:800,marginTop:25}}>{label}</div></div></Fade>;
      })}
    </div>
    <Footer step={4} right="v1.0 · Personal license" />
  </SceneShell>;
};

`;
replaceBetween('const Scene4 = () => (','const Scene5 =',scene4,'Scene4');

fs.writeFileSync(output,out);
console.log('Q6_RUNTIME_ENTRY='+output);
console.log('SOURCE_PRESERVED='+input);
console.log('UPGRADE=mid-video depth + material + micro-motion + atmosphere');
