import { C, SANS } from '../tokens';
import { HeroAvatar } from './Primitives';

const HERO_MAP = {
  warren: { initials:'WB', name:'Warren Buffett', color:C.ame400 },
  cathie:  { initials:'CW', name:'Cathie Wood',    color:C.aqua400 },
  ray:     { initials:'RD', name:'Ray Dalio',      color:C.gold },
};

export function HeroMessage({ hero='warren', text, time, isNew=false }) {
  const h = HERO_MAP[hero];
  return (
    <div style={{ display:'flex', gap:10 }}>
      <HeroAvatar initials={h.initials} color={h.color} size={30}/>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <div style={{ fontFamily:SANS, fontSize:13, fontWeight:600, color:C.ink700 }}>{h.name}</div>
          {time && <div style={{ fontFamily:SANS, fontSize:11, color:C.ink300 }}>{time}</div>}
          {isNew && <div style={{ width:6, height:6, borderRadius:'50%', background:C.ame400, marginLeft:'auto' }}/>}
        </div>
        <div style={{ fontFamily:SANS, fontSize:14, color:C.ink600, lineHeight:1.55, fontStyle:'italic' }}>{text}</div>
      </div>
    </div>
  );
}

export function UserMessage({ text }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-end' }}>
      <div style={{ maxWidth:'80%', background:C.ink900, color:C.white, padding:'10px 14px', borderRadius:'8px 8px 2px 8px', fontFamily:SANS, fontSize:14, lineHeight:1.5 }}>{text}</div>
    </div>
  );
}

export function SageMsg({ text, compact=false }) {
  const size = compact ? 28 : 36;
  return (
    <div style={{ display:'flex', gap:10 }}>
      <div style={{ width:size, height:size, borderRadius:'50%', background:C.aqua50, border:`1.5px solid ${C.aqua400}40`, display:'flex', alignItems:'center', justifyContent:'center', color:C.aqua400, fontSize:size*0.44, flexShrink:0 }}>◇</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:SANS, fontSize:11, fontWeight:600, color:C.ink400, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>Sage</div>
        <div style={{ fontFamily:SANS, fontSize:compact?13:15, color:C.ink600, lineHeight:1.55 }}>{text}</div>
      </div>
    </div>
  );
}
