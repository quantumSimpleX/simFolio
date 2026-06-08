import { C, SANS, DISPLAY } from '../../tokens';
import { StatusBar, CTA } from '../../components/Primitives';
import { useNavigate } from 'react-router-dom';

export default function ReturningUser() {
  const navigate = useNavigate();
  return (
    <div style={{ width:390, background:C.paper, display:'flex', flexDirection:'column', minHeight:680 }}>
      <StatusBar/>
      <div style={{ display:'flex', flexDirection:'column', gap:24, padding:'28px 28px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:30, color:C.ink900, letterSpacing:'-0.02em' }}>Welcome back, Jamie.</div>
          <div style={{ fontFamily:SANS, fontSize:16, color:C.ink500, lineHeight:1.5 }}>
            Your portfolio is up <span style={{ color:C.aqua600, fontWeight:600 }}>+$1,120</span> since your last visit.
          </div>
        </div>

        <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'0 20px' }}>
          {[
            { label:'Portfolio value', value:'$28,340' },
            { label:'Pending orders',  value:'2' },
            { label:'Last visited',    value:'3 days ago' },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:i<arr.length-1?`1px solid ${C.ink100}`:'none' }}>
              <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500 }}>{label}</div>
              <div style={{ fontFamily:SANS, fontSize:14, fontWeight:600, color:C.ink900 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, padding:'12px 16px', background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:8 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:`${C.ame400}12`, border:`1.5px solid ${C.ame400}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:11, color:C.ame400, flexShrink:0 }}>WB</div>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ink600, fontStyle:'italic', lineHeight:1.5 }}>
            "The market is a device for transferring money from the impatient to the patient. How are you feeling about your TSLA position?"
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ height:48, border:`1px solid ${C.ink200}`, borderRadius:4, display:'flex', alignItems:'center', gap:12, padding:'0 18px', background:C.white, cursor:'pointer' }}>
            <div style={{ width:20, height:20, background:C.ink100, borderRadius:2, flexShrink:0 }}/>
            <div style={{ fontFamily:SANS, fontSize:14, fontWeight:500, color:C.ink700 }}>Sign in with Face ID</div>
          </div>
          <CTA label="Go to my portfolio  →" full onClick={() => navigate('/portfolio')}/>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400, textAlign:'center', cursor:'pointer' }}>Sign out</div>
        </div>
      </div>
    </div>
  );
}
