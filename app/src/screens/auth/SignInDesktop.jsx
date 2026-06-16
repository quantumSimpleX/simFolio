import { useState } from 'react';
import { CTA, SocialBtn, Divider, Field } from '../../components/Primitives';
import AuthLayout from '../../components/AuthLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isOnboardingComplete } from '../../lib/onboarding';

export default function SignInDesktop() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await signIn(email, password);
      const complete = await isOnboardingComplete(data.user.id);
      navigate(complete ? '/portfolio' : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mb-1.5 font-sans text-[28px] font-bold tracking-[-0.01em] text-ink-900">Welcome back</div>
      <div className="mb-6 font-sans text-[15px] text-ink-500">Sign in to your account.</div>
      <div className="mb-5 flex gap-2.5">
        <SocialBtn provider="Google"/>
        <SocialBtn provider="Apple"/>
      </div>
      <Divider/>
      <div className="mt-5 flex flex-col gap-3.5">
        <Field label="Email address" placeholder="jamie@example.com" value={email} onChange={e => setEmail(e.target.value)}/>
        <div>
          <Field label="Password" placeholder="••••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)}/>
          <div className="mt-2 flex justify-end">
            <div className="cursor-pointer font-sans text-[13px] text-ame-400">Forgot password?</div>
          </div>
        </div>
      </div>
      {error && <div className="mt-3 font-sans text-[13px] text-red">{error}</div>}
      <div className="mt-5">
        <CTA label={loading ? 'Signing in…' : 'Sign in  →'} full onClick={handleSubmit}/>
      </div>
      <div className="mt-4 text-center font-sans text-sm text-ink-500">
        New here? <span className="cursor-pointer text-ame-400" onClick={() => navigate('/sign-up')}>Create an account</span>
      </div>
    </AuthLayout>
  );
}
