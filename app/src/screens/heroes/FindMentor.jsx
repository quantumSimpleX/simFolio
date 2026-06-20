import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotMenu } from '../../components/DotMenu';
import { HeroSelect } from '../../components/HeroSelect';
import { useOnboardingAnswers } from '../../hooks/useOnboardingAnswers';
import { useHeroRanking } from '../../hooks/useHeroRanking';
import { useChangeHero } from '../../hooks/useChangeHero';
import { heroIdFromName, HERO_DATA } from '../../data/heroes';
import { QUESTION_LABELS } from '../onboarding/questionLabels';
import { useIsDesktop } from '../../hooks/useIsDesktop';

// Saved onboarding answers shown above the grid, so the user sees the inputs behind the
// recommendations. Uses the same labels + value formatting as the profile page.
const SUMMARY_KEYS = ['goal', 'experience', 'horizon', 'frequency', 'capital', 'heroMention'];

function formatValue(key, value) {
  if (key === 'capital') return `$${Number(value).toLocaleString('en-US')}`;
  return String(value);
}

function AnswerSummary({ answers, onChooseFromLibrary }) {
  const navigate = useNavigate();
  const rows = SUMMARY_KEYS
    .map(key => ({ key, label: QUESTION_LABELS[key], value: answers?.[key] }))
    .filter(r => r.value != null && r.value !== '' && !(Array.isArray(r.value) && r.value.length === 0));
  if (!rows.length) return null;

  return (
    <div className="rounded-card border-[1.5px] border-ink-100 bg-white p-4">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-ink-400">Your investment preferences</div>
        <DotMenu className="-mr-1 -mt-1" items={[
          { label: 'My preferences changed', onSelect: () => navigate('/onboarding', { state: { redo: true } }) },
          { label: 'Choose from the library', onSelect: onChooseFromLibrary },
        ]}/>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map(r => (
          <div key={r.key} className="flex items-baseline justify-between gap-3">
            <div className="flex-shrink-0 font-sans text-[13px] text-ink-400">{r.label}</div>
            <div className="text-right font-sans text-[13px] font-semibold text-ink-900">
              {Array.isArray(r.value)
                ? r.value.map((v, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mx-1 font-normal text-ink-300">·</span>}
                      {v}
                    </span>
                  ))
                : formatValue(r.key, r.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// "Find a new mentor" — reached from the chat header's ⋮ menu. Mirrors the last onboarding
// hero-selection page, ranking from the user's saved onboarding answers. Picking one replaces
// the current advising hero and returns to the chat. If the user named an investor they admire,
// that hero is pinned into the 8 and the LLM ranks the remaining 7; otherwise it ranks all 8.
// All heroes (minus Sage) for the "Choose from the library" view, alphabetized by first name.
const LIBRARY_IDS = Object.keys(HERO_DATA)
  .filter(id => id !== 'sage')
  .sort((a, b) => HERO_DATA[a].name.localeCompare(HERO_DATA[b].name));

export default function FindMentor() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { answers } = useOnboardingAnswers();
  const [showLibrary, setShowLibrary] = useState(false);
  const pinnedId = heroIdFromName(answers.heroMention);
  const { heroIds, isLoading } = useHeroRanking(answers, {
    includeWarren: true,
    count: pinnedId ? 7 : 8,
    pinnedId,
  });
  const { mutate: changeHero, isPending } = useChangeHero();

  function handleChoose(heroId) {
    changeHero(heroId, { onSuccess: () => navigate(isDesktop ? '/portfolio' : '/ask') });
  }

  if (showLibrary) {
    return (
      <HeroSelect
        heroIds={LIBRARY_IDS}
        onChoose={handleChoose}
        saving={isPending}
        onBack={() => setShowLibrary(false)}
        message="The full library — pick anyone you'd like to learn from."
        ctaPrefix="Make"
        ctaSuffix=" my mentor"
      />
    );
  }

  return (
    <HeroSelect
      heroIds={heroIds}
      loading={isLoading}
      onChoose={handleChoose}
      saving={isPending}
      onBack={() => navigate(-1)}
      loadingMessage="Let me look at your goals and find the legends who fit you best…"
      message="Here are the legends best suited to you."
      ctaPrefix="Make"
      ctaSuffix=" my mentor"
      summary={<AnswerSummary answers={answers} onChooseFromLibrary={() => setShowLibrary(true)} />}
    />
  );
}
