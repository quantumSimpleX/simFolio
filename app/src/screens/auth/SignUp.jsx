import { useState } from 'react';
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
    <div className="flex min-h-[calc(100dvh/var(--zoom))] w-full max-w-[390px] flex-col bg-paper">
      <StatusBar/>
      <div className="flex items-center gap-3.5 border-b border-ink-100 px-6 pb-3.5">
        <div onClick={() => navigate(-1)} className="cursor-pointer font-sans text-sm text-ame-400">← Back</div>
        <div className="flex-1 text-center font-sans text-[17px] font-bold text-ink-900">Create account</div>
        <div className="w-10"/>
      </div>
      <div className="flex flex-col gap-3.5 px-6 py-6">
        <div className="flex gap-2">
          <SocialBtn provider="Google"/>
          <SocialBtn provider="Apple"/>
        </div>
        <Divider/>
        <Field label="First name" placeholder="Jamie" value={firstName} onChange={e => setFirstName(e.target.value)}/>
        <Field label="Email address" placeholder="jamie@example.com" value={email} onChange={e => setEmail(e.target.value)}/>
        <Field label="Password" placeholder="••••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)}/>
        {error && <div className="font-sans text-[13px] text-red">{error}</div>}
        <div className="flex items-center justify-between rounded-input border border-ink-100 bg-ink-50 px-4 py-2.5">
          <div className="font-sans text-sm text-ink-600">Tooltip language</div>
          <LangToggle/>
        </div>
        <CTA label="Create account  →" full loading={loading} onClick={handleSubmit}/>
        <div className="text-center font-sans text-xs text-ink-400">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </div>
        <div className="text-center font-sans text-sm text-ink-500">
          Already have an account? <span className="cursor-pointer text-ame-400" onClick={() => navigate('/sign-in')}>Sign in</span>
        </div>
      </div>
    </div>
  );
}
