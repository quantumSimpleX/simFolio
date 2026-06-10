import { useState } from 'react';
import { C, SANS, DISPLAY } from '../../tokens';
import { Logo, SimPill, CTA, SocialBtn, Divider, Field, LangToggle } from '../../components/Primitives';
import QSWordmark from '../../components/QSWordmark';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HEROES = [
  { initials:'WB', name:'Warren Buffett',  style:'Value investing · long-term',  color:C.ame400, quote:'"Price is what you pay. Value is what you get."' },
  { initials:'CW', name:'Cathie Wood',      style:'Disruptive technology · growth', color:C.aqua400, quote:'"Innovation solves problems. Invest in the future."' },
  { initials:'RD', name:'Ray Dalio',        style:'Macro · diversification',        color:'#B5860A',  quote:'"Diversify well and you will do well."' },
];

export default function WelcomeDesktop() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit() {
    if (!firstName || !email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, firstName);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width:1440, height:900, background:C.paper, display:'flex', overflow:'hidden' }}>
      {/* Left brand panel */}
      <div style={{ width:580, background:C.ink900, padding:'64px 72px', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <Logo size={32} color={C.white}/>
          <div style={{ display:'flex', alignItems:'center', gap:6, opacity:0.3, paddingLeft:2 }}>
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

      {/* Right sign-up panel */}
      <div style={{ flex:1, padding:'64px 72px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ maxWidth:420 }}>
          <div style={{ fontFamily:SANS, fontSize:28, fontWeight:700, color:C.ink900, letterSpacing:'-0.01em', marginBottom:6 }}>Create your account</div>
          <div style={{ fontFamily:SANS, fontSize:15, color:C.ink500, marginBottom:24 }}>Start investing in minutes. No real money involved.</div>
          <div style={{ display:'flex', gap:10, marginBottom:20 }}>
            <SocialBtn provider="Google"/>
            <SocialBtn provider="Apple"/>
          </div>
          <Divider/>
          <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:20 }}>
            <Field label="First name" placeholder="Jamie" value={firstName} onChange={e => setFirstName(e.target.value)}/>
            <Field label="Email address" placeholder="jamie@example.com" value={email} onChange={e => setEmail(e.target.value)}/>
            <Field label="Password" placeholder="••••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)}/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:C.ink50, border:`1px solid ${C.ink100}`, borderRadius:4 }}>
              <div style={{ fontFamily:SANS, fontSize:14, color:C.ink600 }}>Tooltip language</div>
              <LangToggle/>
            </div>
          </div>
          {error && <div style={{ fontFamily:SANS, fontSize:13, color:C.red, marginTop:12 }}>{error}</div>}
          <div style={{ marginTop:20 }}>
            <CTA label={loading ? 'Creating account…' : 'Create account  →'} full onClick={handleSubmit}/>
          </div>
          <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, textAlign:'center', marginTop:14 }}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </div>
          <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500, textAlign:'center', marginTop:16 }}>
            Already have an account? <span style={{ color:C.ame400, cursor:'pointer' }} onClick={() => navigate('/sign-in')}>Sign in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
