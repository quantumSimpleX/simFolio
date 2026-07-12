import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { PageHeader } from '../../components/Nav';
import { CTA, Eyebrow, LangToggle, ThemeToggle } from '../../components/Primitives';
import { Card } from '../../components/ui/card';
import { MedalGlyph, TrophyGlyph } from '../../components/Badges';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { QUESTION_LABELS } from '../onboarding/questionLabels';
import { useAchievements } from '../../hooks/useAchievements';
import { cn } from '../../lib/utils';

// One glyph + name + "3 of 4" progress in the summary shelf. Earned items go gold.
function ShelfItem({ name, earned, count, total, children }) {
  return (
    <div className="flex w-[62px] flex-col items-center text-center">
      {children}
      <div className={cn('mt-1 font-sans text-[10px] font-semibold leading-tight', earned ? 'text-gold' : 'text-ink-600')}>{name}</div>
      <div className="font-sans text-[10px] text-ink-400">{earned ? 'Earned' : `${count} of ${total}`}</div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [answers, setAnswers] = useState(null);
  const { medals, trophies, earnedCount, medalCount, isLoading: achLoading } = useAchievements();
  const trophy = trophies[0];

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

  async function handleSignOut() {
    try { await signOut(); } finally { navigate('/', { replace: true }); }
  }

  const firstName = user?.user_metadata?.first_name ?? '';
  const rows = answers
    ? Object.entries(QUESTION_LABELS)
        .map(([key, label]) => ({ key, label, value: answers[key] }))
        .filter(r => r.value != null && !(Array.isArray(r.value) && r.value.length === 0))
    : [];

  return (
    <AppShell active="profile" maxWidth={720}>
      <PageHeader title="Profile"/>

      <Card className="mb-5 px-6 py-5">
        <div className="font-sans text-[18px] font-semibold text-ink-900">{firstName || 'Investor'}</div>
        {user?.email && <div className="mt-1 font-sans text-sm text-ink-400">{user.email}</div>}
      </Card>

      <Card className="mb-5 px-6 py-5">
        <div className="mb-4"><Eyebrow>Achievements</Eyebrow></div>
        <div className="font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900">
          {achLoading ? '…' : `${earnedCount} badge${earnedCount !== 1 ? 's' : ''}`}
        </div>
        <div className="mt-1 font-sans text-[13px] text-ink-400">{medalCount} of {medals.length} medals earned</div>
        <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3">
          {medals.map((m) => (
            <ShelfItem key={m.id} name={m.name} earned={m.earned} count={m.earnedCount} total={m.threshold}>
              <MedalGlyph size={34} earned={m.earned} label={`${m.name} — ${m.earned ? 'earned' : `${m.earnedCount} of ${m.threshold}`}`}/>
            </ShelfItem>
          ))}
          {trophy && (
            <ShelfItem name={trophy.name} earned={trophy.earned} count={trophy.earnedCount} total={trophy.threshold}>
              <TrophyGlyph size={40} earned={trophy.earned} label={`${trophy.name} — ${trophy.earned ? 'earned' : `${trophy.earnedCount} of ${trophy.threshold}`}`}/>
            </ShelfItem>
          )}
        </div>
      </Card>

      <Card className="mb-5 px-6 py-5">
        <div className="mb-4"><Eyebrow>Preferences</Eyebrow></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-sans text-sm text-ink-500">Tooltip language</div>
            <LangToggle/>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="font-sans text-sm text-ink-500">Theme</div>
            <ThemeToggle/>
          </div>
        </div>
      </Card>

      <Card className="mb-5 px-6 py-5">
        <div className="mb-4"><Eyebrow>Your onboarding answers</Eyebrow></div>
        {rows.length === 0 ? (
          <div className="font-sans text-sm text-ink-400">No onboarding answers saved yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3.5">
            {rows.map(r => (
              <div key={r.key}>
                <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-ink-400">{r.label}</div>
                {Array.isArray(r.value) ? (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {r.value.map((v, i) => (
                      <div key={i} className="font-sans text-sm font-semibold text-ink-900">{v}</div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 font-sans text-sm font-semibold text-ink-900">
                    {r.key === 'capital' ? `$${Number(r.value).toLocaleString('en-US')}` : String(r.value)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <CTA label="Sign out" full onClick={handleSignOut}/>
    </AppShell>
  );
}
