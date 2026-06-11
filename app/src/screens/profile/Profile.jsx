import { useState, useEffect } from 'react';
import { C, SANS } from '../../tokens';
import { AppShell } from '../../components/AppShell';
import { PageHeader } from '../../components/Nav';
import { CTA } from '../../components/Primitives';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { QUESTION_LABELS } from '../onboarding/questionLabels';

function formatAnswer(key, value) {
  if (value == null || (Array.isArray(value) && value.length === 0)) return null;
  if (key === 'capital') return `$${Number(value).toLocaleString('en-US')}`;
  if (Array.isArray(value)) return value.join(' · ');
  return String(value);
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [answers, setAnswers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (user) {
        try {
          const { data } = await supabase.from('users').select('onboarding_answers').eq('user_id', user.id).single();
          if (!cancelled && data?.onboarding_answers) { setAnswers(data.onboarding_answers); return; }
        } catch { /* fall through to localStorage */ }
      }
      try {
        const local = localStorage.getItem('simfolio_onboarding_answers');
        if (!cancelled && local) setAnswers(JSON.parse(local));
      } catch { /* nothing saved */ }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const firstName = user?.user_metadata?.first_name ?? '';
  const rows = answers
    ? Object.entries(QUESTION_LABELS)
        .map(([key, label]) => ({ key, label, value: formatAnswer(key, answers[key]) }))
        .filter(r => r.value != null)
    : [];

  return (
    <AppShell active="profile" maxWidth={720}>
      <PageHeader title="Profile"/>

      <div style={{ background: C.white, border: `1px solid ${C.ink100}`, borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, color: C.ink900 }}>{firstName || 'Investor'}</div>
        {user?.email && <div style={{ fontFamily: SANS, fontSize: 14, color: C.ink400, marginTop: 4 }}>{user.email}</div>}
      </div>

      <div style={{ background: C.white, border: `1px solid ${C.ink100}`, borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: C.ink400, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Your onboarding answers</div>
        {rows.length === 0 ? (
          <div style={{ fontFamily: SANS, fontSize: 14, color: C.ink400 }}>No onboarding answers saved yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((r, i) => (
              <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.ink100}` }}>
                <div style={{ fontFamily: SANS, fontSize: 14, color: C.ink400, flexShrink: 0 }}>{r.label}</div>
                <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.ink900, textAlign: 'right' }}>{r.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CTA label="Sign out" full onClick={signOut}/>
    </AppShell>
  );
}
