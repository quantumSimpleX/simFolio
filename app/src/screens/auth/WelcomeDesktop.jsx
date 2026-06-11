import { useState } from 'react';
import { C, SANS } from '../../tokens';
import { CTA, SocialBtn, Divider, Field, LangToggle } from '../../components/Primitives';
import BrandPanel from '../../components/BrandPanel';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
      <div style={{ width:580, flexShrink:0 }}>
        <BrandPanel/>
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
