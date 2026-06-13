import { useState } from 'react';
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
    <div className="flex min-h-[720px] w-[390px] flex-col bg-paper">
      <StatusBar/>
      <div className="flex items-center gap-3.5 border-b border-ink-100 px-6 pb-3.5">
        <div onClick={() => navigate(-1)} className="cursor-pointer font-sans text-sm text-ame-400">← Back</div>
        <div className="flex-1 text-center font-sans text-[17px] font-bold text-ink-900">Sign in</div>
        <div className="w-10"/>
      </div>
      <div className="flex flex-col gap-4 px-6 py-7">
        <div className="flex gap-2">
          <SocialBtn provider="Google"/>
          <SocialBtn provider="Apple"/>
        </div>
        <Divider/>
        <Field label="Email address" placeholder="jamie@example.com" value={email} onChange={e => setEmail(e.target.value)}/>
        <div>
          <Field label="Password" placeholder="••••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)}/>
          <div className="mt-2 flex justify-end">
            <div className="cursor-pointer font-sans text-[13px] text-ame-400">Forgot password?</div>
          </div>
        </div>
        {error && <div className="font-sans text-[13px] text-red">{error}</div>}
        <CTA label="Sign in  →" full loading={loading} onClick={handleSubmit}/>
        <div className="text-center font-sans text-sm text-ink-500">
          New here? <span className="cursor-pointer text-ame-400" onClick={() => navigate('/sign-up')}>Create an account</span>
        </div>
      </div>
    </div>
  );
}
