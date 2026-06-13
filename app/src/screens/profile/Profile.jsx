import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { PageHeader } from '../../components/Nav';
import { CTA, Eyebrow } from '../../components/Primitives';
import { Card } from '../../components/ui/card';
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { QUESTION_LABELS } from '../onboarding/questionLabels';
import { useAchievements } from '../../hooks/useAchievements';
import { cn } from '../../lib/utils';

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

      <Card className="mb-5 px-6 py-5">
        <div className="font-sans text-[18px] font-semibold text-ink-900">{firstName || 'Investor'}</div>
        {user?.email && <div className="mt-1 font-sans text-sm text-ink-400">{user.email}</div>}
      </Card>

      <Card className="mb-5 px-6 py-5">
        <div className="mb-4"><Eyebrow>Achievements</Eyebrow></div>
        <div className="mb-3.5 flex items-center gap-5">
          <div className="flex-1">
            <div className="font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-900">
              {achLoading ? '…' : `${earnedCount} badge${earnedCount !== 1 ? 's' : ''}`}
            </div>
            <div className="mt-1 font-sans text-[13px] text-ink-400">
              {toNextMedal === 10 && medalCount === 0 ? '10 badges → first medal' : `${toNextMedal} more → next medal`}
            </div>
            <div className="mt-2.5 h-[5px] rounded-[3px] bg-ink-100">
              <div className="h-full rounded-[3px] bg-ame-400" style={{ width: `${((earnedCount % 10) / 10) * 100}%` }}/>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="text-center">
              <MedalGlyph size={32} earned={medalCount > 0}/>
              <div className="mt-[3px] font-sans text-[10px] text-ink-400">{medalCount}</div>
            </div>
            <div className="text-center">
              <TrophyGlyph size={40} earned={trophyCount > 0}/>
              <div className="mt-[3px] font-sans text-[10px] text-ink-400">{trophyCount}</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {badges.map((b, i) => (
            <Card
              key={b.id}
              onClick={() => b.earned && navigate('/badge-earned', { state: { badge: b } })}
              className={cn(
                'flex flex-col items-center gap-1 bg-paper px-1.5 py-2.5',
                b.earned ? 'cursor-pointer border-ink-100 opacity-100' : 'cursor-default border-ink-50 opacity-40',
              )}
            >
              <BadgeGlyphForIndex index={i} size={28} earned={b.earned}/>
              <div className={cn('text-center font-sans text-[10px] font-semibold leading-tight', b.earned ? 'text-ink-900' : 'text-ink-400')}>{b.name}</div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="mb-5 px-6 py-5">
        <div className="mb-3.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Your onboarding answers</div>
        {rows.length === 0 ? (
          <div className="font-sans text-sm text-ink-400">No onboarding answers saved yet.</div>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div key={r.key} className={cn('flex justify-between gap-4 py-2.5', i !== 0 && 'border-t border-ink-100')}>
                <div className="flex-shrink-0 font-sans text-sm text-ink-400">{r.label}</div>
                <div className="text-right font-sans text-sm font-semibold text-ink-900">{r.value}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CTA label="Sign out" full onClick={signOut}/>
    </AppShell>
  );
}
