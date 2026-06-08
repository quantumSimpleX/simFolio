import { useState } from 'react';
import { C, SANS } from '../../tokens';
import { StatusBar, CTA, SocialBtn, Divider, Field, LangToggle } from '../../components/Primitives';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit() {
    if (!firstName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
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
    <div style={{ width:390, background:C.paper, display:'flex', flexDirection:'column', minHeight:844 }}>
      <StatusBar/>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'0 24px 14px', borderBottom:`1px solid ${C.ink100}` }}>
        <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer' }}>← Back</div>
        <div style={{ flex:1, textAlign:'center', fontFamily:SANS, fontSize:17, fontWeight:700, color:C.ink900 }}>Create account</div>
        <div style={{ width:40 }}/>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14, padding:'24px 24px' }}>
        <div style={{ display:'flex', gap:8 }}>
          <SocialBtn provider="Google"/>
          <SocialBtn provider="Apple"/>
        </div>
        <Divider/>
        <Field label="First name" placeholder="Jamie" value={firstName} onChange={e => setFirstName(e.target.value)}/>
        <Field label="Email address" placeholder="jamie@example.com" value={email} onChange={e => setEmail(e.target.value)}/>
        <Field label="Password" placeholder="••••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)}/>
        {error && <div style={{ fontFamily:SANS, fontSize:13, color:C.red }}>{error}</div>}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', background:C.ink50, border:`1px solid ${C.ink100}`, borderRadius:4 }}>
          <div style={{ fontFamily:SANS, fontSize:14, color:C.ink600 }}>Tooltip language</div>
          <LangToggle/>
        </div>
        <CTA label="Create account  →" full loading={loading} onClick={handleSubmit}/>
        <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, textAlign:'center' }}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </div>
        <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500, textAlign:'center' }}>
          Already have an account? <span style={{ color:C.ame400, cursor:'pointer' }} onClick={() => navigate('/sign-in')}>Sign in</span>
        </div>
      </div>
    </div>
  );
}
