import { C, SANS } from '../../tokens';
import { StatusBar, Mark, SimPill, CTA, SocialBtn, LangToggle } from '../../components/Primitives';
import QSWordmark from '../../components/QSWordmark';
import { useNavigate } from 'react-router-dom';

export default function WelcomeMobile() {
  const navigate = useNavigate();
  return (
    <div style={{ width:390, height:844, background:C.paper, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <StatusBar/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'16px 32px', gap:0 }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:10 }}>
            <Mark size={48}/>
            <div style={{ display:'flex', alignItems:'center', gap:6, opacity:0.35 }}>
              <span style={{ fontFamily:SANS, fontSize:11, color:C.ink500 }}>by</span>
              <QSWordmark onDark={false} size={28}/>
            </div>
          </div>
          <div style={{ textAlign:'center', maxWidth:280 }}>
            <div style={{ fontFamily:SANS, fontSize:18, fontWeight:400, color:C.ink600, lineHeight:1.6 }}>
              Learn investing by doing it.<br/>With legendary investors as your guides.
            </div>
          </div>
          <SimPill/>
          <div style={{ display:'flex', gap:0 }}>
            {[['WB',C.ame400],['CW',C.aqua400],['RD',C.gold]].map(([init,color],i) => (
              <div key={init} style={{ width:44, height:44, borderRadius:'50%', background:`${color}10`, border:`2px solid ${C.white}`, marginLeft:i>0?-10:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:13, color, zIndex:3-i }}>
                {i<2?init:'?'}
              </div>
            ))}
            <div style={{ width:44, height:44, borderRadius:'50%', background:C.ink50, border:`2px solid ${C.white}`, marginLeft:-10, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:11, color:C.ink400, zIndex:0 }}>+7</div>
          </div>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400 }}>10 legendary investors in the library</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, paddingBottom:8 }}>
          <CTA label="Get started  →" full onClick={() => navigate('/sign-up')}/>
          <CTA label="Sign in" full ghost onClick={() => navigate('/sign-in')}/>
          <div style={{ display:'flex', gap:8 }}>
            <SocialBtn provider="Google"/>
            <SocialBtn provider="Apple"/>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:4 }}>
            <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>Tooltip language:</div>
            <LangToggle/>
          </div>
        </div>
      </div>
    </div>
  );
}
