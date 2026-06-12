import { C, SANS, DISPLAY } from '../tokens';
import { Logo, SimPill } from './Primitives';
import QSWordmark from './QSWordmark';

const HEROES = [
  { initials:'WB', name:'Warren Buffett',  style:'Value investing · long-term',  color:C.ame400, quote:'"Price is what you pay. Value is what you get."' },
  { initials:'CW', name:'Cathie Wood',      style:'Disruptive technology · growth', color:C.aqua400, quote:'"Innovation solves problems. Invest in the future."' },
  { initials:'RD', name:'Ray Dalio',        style:'Macro · diversification',        color:C.gold,    quote:'"Diversify well and you will do well."' },
];

// Dark branding panel shared by the desktop welcome and onboarding layouts
export default function BrandPanel() {
  return (
    <div style={{ height:'100%', background:C.ink900, padding:'64px 72px', display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <Logo size={32} color={C.white}/>
        <div style={{ display:'flex', alignItems:'center', gap:6, opacity:0.3, paddingLeft:43 }}>
          <span style={{ fontFamily:SANS, fontSize:11, color:C.white }}>by</span>
          <QSWordmark onDark={true} size={28}/>
        </div>
      </div>
      <div style={{ marginTop:'auto', marginBottom:40 }}>
        <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:52, color:C.white, letterSpacing:'-0.025em', lineHeight:1.05, marginBottom:20 }}>
          Learn investing<br/>by doing it.
        </div>
        <div style={{ fontFamily:SANS, fontSize:18, color:C.ink400, maxWidth:380, lineHeight:1.6 }}>
          With legendary investors as your guides. No real money involved.
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {HEROES.map(h => (
          <div key={h.initials} style={{ display:'flex', gap:14, padding:'14px 18px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', background:`${h.color}20`, border:`1.5px solid ${h.color}50`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:13, color:h.color, flexShrink:0 }}>{h.initials}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:SANS, fontSize:15, fontWeight:600, color:C.white }}>{h.name}</div>
              <div style={{ fontFamily:SANS, fontSize:13, color:h.color }}>{h.style}</div>
            </div>
            <div style={{ fontFamily:SANS, fontSize:12, fontStyle:'italic', color:'rgba(255,255,255,0.3)', maxWidth:160, textAlign:'right', lineHeight:1.4 }}>{h.quote}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily:SANS, fontSize:13, color:'rgba(255,255,255,0.25)', textAlign:'center', marginTop:4 }}>and 7 more in the library</div>
      <div style={{ marginTop:32 }}><SimPill/></div>
    </div>
  );
}
