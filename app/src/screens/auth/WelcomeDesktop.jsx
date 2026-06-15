import { useState } from 'react';
import { CTA, SocialBtn, Divider, Field } from '../../components/Primitives';
import AuthLayout from '../../components/AuthLayout';
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
    <AuthLayout>
      <div className="mb-1.5 font-sans text-[28px] font-bold tracking-[-0.01em] text-ink-900">Create your account</div>
      <div className="mb-6 font-sans text-[15px] text-ink-500">Start investing in minutes. No real money involved.</div>
      <div className="mb-5 flex gap-2.5">
        <SocialBtn provider="Google"/>
        <SocialBtn provider="Apple"/>
      </div>
      <Divider/>
      <div className="mt-5 flex flex-col gap-3.5">
        <Field label="First name" placeholder="Jamie" value={firstName} onChange={e => setFirstName(e.target.value)}/>
        <Field label="Email address" placeholder="jamie@example.com" value={email} onChange={e => setEmail(e.target.value)}/>
        <Field label="Password" placeholder="••••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)}/>
      </div>
      {error && <div className="mt-3 font-sans text-[13px] text-red">{error}</div>}
      <div className="mt-5">
        <CTA label={loading ? 'Creating account…' : 'Create account  →'} full onClick={handleSubmit}/>
      </div>
      <div className="mt-3.5 text-center font-sans text-xs text-ink-400">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </div>
      <div className="mt-4 text-center font-sans text-sm text-ink-500">
        Already have an account? <span className="cursor-pointer text-ame-400" onClick={() => navigate('/sign-in')}>Sign in</span>
      </div>
    </AuthLayout>
  );
}
