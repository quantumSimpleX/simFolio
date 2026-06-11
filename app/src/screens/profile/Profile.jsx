import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { C, SANS, DISPLAY } from '../../tokens';
import { AppShell } from '../../components/AppShell';
import { PageHeader } from '../../components/Nav';
import { CTA, Eyebrow } from '../../components/Primitives';
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { QUESTION_LABELS } from '../onboarding/questionLabels';
import { useAchievements } from '../../hooks/useAchievements';

function formatAnswer(key, value) {
  if (value == null || (Array.isArray(value) && value.length === 0)) return null;
  if (key === 'capital') return `$${Number(value).toLocaleString('en-US')}`;
  if (Array.isArray(value)) return value.join(' · ');
  return String(value);
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [answers, setAnswers] = useState(null);
  const { badges, earnedCount, medalCount, trophyCount, isLoading: achLoading } = useAchievements();
  const toNextMedal = 10 - (earnedCount % 10);

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
        <div style={{ marginBottom: 16 }}><Eyebrow>Achievements</Eyebrow></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, color: C.ink900, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {achLoading ? '…' : `${earnedCount} badge${earnedCount !== 1 ? 's' : ''}`}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 13, color: C.ink400, marginTop: 4 }}>
              {toNextMedal === 10 && medalCount === 0 ? '10 badges → first medal' : `${toNextMedal} more → next medal`}
            </div>
            <div style={{ marginTop: 10, height: 5, background: C.ink100, borderRadius: 3 }}>
              <div style={{ width: `${((earnedCount % 10) / 10) * 100}%`, height: '100%', background: C.ame400, borderRadius: 3 }}/>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'center' }}>
              <MedalGlyph size={32} earned={medalCount > 0}/>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.ink400, marginTop: 3 }}>{medalCount}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <TrophyGlyph size={40} earned={trophyCount > 0}/>
              <div style={{ fontFamily: SANS, fontSize: 10, color: C.ink400, marginTop: 3 }}>{trophyCount}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {badges.map((b, i) => (
            <div
              key={b.id}
              onClick={() => b.earned && navigate('/badge-earned', { state: { badge: b } })}
              style={{ background: C.paper, border: `1px solid ${b.earned ? C.ink100 : C.ink50}`, borderRadius: 8, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: b.earned ? 1 : 0.4, cursor: b.earned ? 'pointer' : 'default' }}
            >
              <BadgeGlyphForIndex index={i} size={28} earned={b.earned}/>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10, color: b.earned ? C.ink900 : C.ink400, textAlign: 'center', lineHeight: 1.2 }}>{b.name}</div>
            </div>
          ))}
        </div>
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
