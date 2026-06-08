import { useState } from 'react';
import { C, SANS } from '../../tokens';
import { StatusBar, CTA, SocialBtn, Divider, Field } from '../../components/Primitives';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/portfolio');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width:390, background:C.paper, display:'flex', flexDirection:'column', minHeight:720 }}>
      <StatusBar/>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'0 24px 14px', borderBottom:`1px solid ${C.ink100}` }}>
        <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer' }}>← Back</div>
        <div style={{ flex:1, textAlign:'center', fontFamily:SANS, fontSize:17, fontWeight:700, color:C.ink900 }}>Sign in</div>
        <div style={{ width:40 }}/>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'28px 24px' }}>
        <div style={{ display:'flex', gap:8 }}>
          <SocialBtn provider="Google"/>
          <SocialBtn provider="Apple"/>
        </div>
        <Divider/>
        <Field label="Email address" placeholder="jamie@example.com" value={email} onChange={e => setEmail(e.target.value)}/>
        <div>
          <Field label="Password" placeholder="••••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)}/>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
            <div style={{ fontFamily:SANS, fontSize:13, color:C.ame400, cursor:'pointer' }}>Forgot password?</div>
          </div>
        </div>
        {error && <div style={{ fontFamily:SANS, fontSize:13, color:C.red }}>{error}</div>}
        <CTA label="Sign in  →" full loading={loading} onClick={handleSubmit}/>
        <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500, textAlign:'center' }}>
          New here? <span style={{ color:C.ame400, cursor:'pointer' }} onClick={() => navigate('/sign-up')}>Create an account</span>
        </div>
      </div>
    </div>
  );
}
