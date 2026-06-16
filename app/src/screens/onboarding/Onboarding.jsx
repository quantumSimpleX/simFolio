import { useState, useEffect } from 'react';
import { Logo, SimPill, CTA, GoalCard, ProgressDots, GuideAvatar, HeroAvatar, TermUnderline } from '../../components/Primitives';
import BrandPanel from '../../components/BrandPanel';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { matchHeroes, resolveSelectionHeroes, heroIdFromName, HERO_DATA } from '../../data/heroes';
import { useHeroRanking } from '../../hooks/useHeroRanking';
import { cn } from '../../lib/utils';

const NONE_GOAL = 'None of the above';

const GOAL_CHOICES = [
  { title: 'Beat Inflation',  termKey: 'beat_inflation',  desc: 'Making sure your savings grow as fast as store prices rise so you can still afford the same stuff' },
  { title: 'Grow Wealth',     termKey: 'grow_wealth',     desc: 'Your saved money earning extra money, which then earns its own money like a growing snowball' },
  { title: 'Passive Income',  termKey: 'passive_income',  desc: 'Getting regular "thank you" cash payments from a company just for letting them use your money' },
  { title: 'Diversify Risk',  termKey: 'diversify_risk',  desc: 'Not putting all your eggs in one basket so if one breaks, you do not lose everything' },
  { title: 'Stock Ownership', termKey: 'stock_ownership', desc: 'Owning a tiny slice of famous companies like Apple or Disney and sharing in their success' },
  { title: NONE_GOAL, desc: '' },
];

const BASE_QUESTIONS = [
  {
    key: 'goal',
    q: "Good to meet you. One question to start — what's drawing you to investing right now? Select all that apply.",
    type: 'multi',
    choices: GOAL_CHOICES,
  },
];

const RANDOM_QUESTIONS = [
  {
    key: 'capital',
    q: "How much are you thinking of putting in to start? There's no wrong answer — just helps me understand.",
    type: 'number',
  },
  {
    key: 'horizon',
    q: "How long are you thinking of keeping money invested before you'd want to use it?",
    type: 'choice',
    choices: ['Less than a year', '1 – 3 years', '3 – 10 years', '10+ years', "I haven't decided"],
  },
  {
    key: 'frequency',
    q: "How often do you see yourself trading or adjusting your investments?",
    type: 'choice',
    choices: ['Most days', 'A few times a week', 'A few times a month', 'A few times a year', 'Whenever it feels right'],
  },
  {
    key: 'experience',
    q: "How much experience do you have with investing or financial markets?",
    type: 'choice',
    choices: ["None — complete beginner", "I've read about it but never traded", "I've traded a little", "I trade regularly", "I have a financial background"],
  },
  {
    key: 'heroMention',
    q: "Is there a famous investor you admire — someone whose approach you'd want to learn from?",
    type: 'choice',
    choices: ['Warren Buffett', 'Cathie Wood', 'Ray Dalio', 'Peter Lynch', "I don't follow any particular investor"],
  },
];

function buildQuestions() {
  const shuffled = [...RANDOM_QUESTIONS].sort(() => Math.random() - 0.5);
  return [...BASE_QUESTIONS, ...shuffled];
}

const QUESTIONS = buildQuestions();

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showStock, setShowStock] = useState(false);
  const [showHeroes, setShowHeroes] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [saving, setSaving] = useState(false);

  const current = QUESTIONS[step];

  // Hero selection grid: when the user named an investor we recognise, pin that hero right after
  // Warren (no LLM call); otherwise rank the pool via the LLM. The hook always resolves to a
  // complete Warren-first list, falling back to deterministic ranking if the model is unavailable.
  const mentionId = heroIdFromName(answers.heroMention);
  const useLLM = !mentionId;
  const { heroIds: rankedHeroIds, isLoading: rankingLoading } =
    useHeroRanking(answers, { enabled: showHeroes && useLLM });
  const selectionHeroIds = useLLM
    ? rankedHeroIds
    : resolveSelectionHeroes({ llmIds: [mentionId], answers });

  function advance(value) {
    const newAnswers = { ...answers, [current.key]: value };
    setAnswers(newAnswers);
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
      setSelected(null);
    } else {
      setShowStock(true);
    }
  }

  // Rebuild the `selected` state for a question from its saved answer
  function restoreSelected(q, saved) {
    if (saved == null) return null;
    if (q.type === 'multi') {
      if (Array.isArray(saved)) return { picks: saved, other: '' };
      return { picks: [NONE_GOAL], other: saved === NONE_GOAL ? '' : saved };
    }
    return saved;
  }

  function handleBack() {
    if (showStock) {
      setShowStock(false);
      setSelected(restoreSelected(current, answers[current.key]));
      return;
    }
    if (step === 0) return;
    const prev = step - 1;
    setStep(prev);
    setSelected(restoreSelected(QUESTIONS[prev], answers[QUESTIONS[prev].key]));
  }

  function handleSelect(choice) {
    if (current.type !== 'choice') {
      setSelected(choice);
      return;
    }
    setSelected(choice);
    setTimeout(() => advance(choice), 180);
  }

  function handleContinue() {
    if (current.type === 'multi') {
      const { picks = [], other = '' } = selected || {};
      advance(picks.includes(NONE_GOAL) ? (other.trim() || NONE_GOAL) : picks);
      return;
    }
    advance(selected);
  }

  function handleFinish(stockList) {
    if (stockList.length === 0) {
      // No stock ideas — let the user pick an expert to ask
      setShowHeroes(true);
      return;
    }
    completeOnboarding(stockList, matchHeroes(answers));
  }

  function handleHeroChosen(heroId) {
    completeOnboarding([], [heroId]);
  }

  async function completeOnboarding(stockList, heroIds) {
    const fullAnswers = { ...answers, stocks: stockList };
    // Always keep a local copy so the profile page works even if the DB save fails
    try { localStorage.setItem('simfolio_onboarding_answers', JSON.stringify(fullAnswers)); } catch { /* ignore */ }

    // After picking a hero (no stocks), land where the user can chat: the portfolio page on
    // desktop (hero sidebar), the dedicated Ask page on mobile.
    const heroDest = isDesktop ? '/portfolio' : '/ask';

    if (!user) {
      if (stockList.length > 0) navigate(`/buy/${stockList[0]}`);
      else navigate(heroDest);
      return;
    }
    if (saving) return;
    setSaving(true);

    const capital = parseInt(answers.capital) || 5000;

    try {
      await supabase.from('users').upsert({
        user_id: user.id,
        theme_preference: 'light',
        onboarding_done: true,
      });
      // Separate call so a missing onboarding_answers column can't block onboarding
      try {
        await supabase.from('users').update({ onboarding_answers: fullAnswers }).eq('user_id', user.id);
      } catch { /* column may not exist yet; localStorage copy still works */ }
      await supabase.from('user_balances').upsert({
        user_id: user.id,
        cash_balance: capital,
        starting_capital: capital,
      });
      await supabase.from('hero_selections').upsert(
        heroIds.slice(0, 1).map(id => ({ user_id: user.id, hero_id: id }))
      );
      if (stockList.length > 0) navigate(`/buy/${stockList[0]}`);
      else navigate(heroDest);
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaving(false);
    }
  }

  if (showHeroes) {
    // Named a recognised investor → introduce just that one hero, no grid to choose from.
    if (mentionId) {
      return <HeroIntro heroId={mentionId} onContinue={() => handleHeroChosen(mentionId)} saving={saving} onBack={() => setShowHeroes(false)}/>;
    }
    return <HeroSelect heroIds={selectionHeroIds} loading={rankingLoading} onChoose={handleHeroChosen} saving={saving} onBack={() => setShowHeroes(false)}/>;
  }

  if (showStock) {
    return <StockInterest stocks={stocks} setStocks={setStocks} onFinish={handleFinish} saving={saving} onBack={handleBack}/>;
  }

  return <OnboardingShell step={step} total={QUESTIONS.length + 1} current={current} selected={selected} onSelect={handleSelect} onContinue={handleContinue} onBack={step > 0 ? handleBack : null}/>;
}

// Fluid type: scales linearly from `min`px at 480px viewport to `max`px at 1280px viewport
function fluid(min, max) {
  return `clamp(${min}px, calc(${min}px + ${max - min} * ((100vw - 480px) / 800)), ${max}px)`;
}

// Desktop: persistent brand panel on the left, content on the right.
// Mobile: top nav bar with content below.
function ScreenShell({ children }) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className="flex h-[100dvh] w-full overflow-hidden bg-paper">
        <div className="w-[45%] min-w-[420px] max-w-[620px] flex-shrink-0">
          <BrandPanel/>
        </div>
        <div className="flex flex-1 justify-center overflow-auto px-12 pb-12 pt-14">
          <div className="flex h-fit w-full max-w-[640px] flex-col gap-7">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-paper">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-100 bg-white px-6 py-3.5">
        <Logo size={19}/>
        <SimPill/>
      </div>
      <div className="flex flex-1 justify-center overflow-auto">
        <div className="flex w-full max-w-[480px] flex-col gap-5 px-6 pb-8 pt-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function BackButton({ onBack }) {
  return (
    <div
      onClick={onBack}
      className="flex cursor-pointer items-center gap-1.5 self-start font-sans font-semibold text-ink-400"
      style={{ fontSize: fluid(13, 15) }}
    >
      ← Back
    </div>
  );
}

function SageHeader({ avatarSize, isDesktop, children }) {
  return (
    <div className="flex items-start" style={{ gap: isDesktop ? 18 : 10 }}>
      <GuideAvatar size={avatarSize}/>
      <div className={cn('flex-1', isDesktop && 'pt-1')}>
        <div
          className="font-sans font-semibold uppercase tracking-[0.14em] text-ink-400"
          style={{ fontSize: fluid(11, 13), marginBottom: isDesktop ? 8 : 6 }}
        >Sage</div>
        <div className="font-sans leading-normal text-ink-600" style={{ fontSize: fluid(15, 22) }}>{children}</div>
      </div>
    </div>
  );
}

function OnboardingShell({ step, total, current, selected, onSelect, onContinue, onBack }) {
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;
  const answerPad = avatarSize + (isDesktop ? 18 : 10);

  const isGridChoice = isDesktop && current.type === 'choice' && current.choices.length >= 4;

  return (
    <ScreenShell>
      {onBack && <BackButton onBack={onBack}/>}
      <ProgressDots step={step + 1} total={total}/>

      <SageHeader avatarSize={avatarSize} isDesktop={isDesktop}>{current.q}</SageHeader>

      {/* Answer area */}
      <div style={{ paddingLeft: answerPad }}>
        {current.type === 'number' ? (
          <div>
            <div className={cn('flex h-[52px] items-center overflow-hidden rounded-input border-[1.5px] bg-white', selected ? 'border-ink-900' : 'border-ink-200')}>
              <div className="flex-shrink-0 px-3.5 font-sans text-ink-400" style={{ fontSize: fluid(16, 20) }}>$</div>
              <input
                type="text"
                inputMode="numeric"
                value={selected ? Number(selected).toLocaleString('en-US') : ''}
                onChange={e => onSelect(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && selected && onContinue()}
                placeholder="5000"
                autoFocus
                className="flex-1 border-none bg-transparent pr-3.5 font-sans font-semibold text-ink-900 outline-none"
                style={{ fontSize: fluid(18, 24) }}
              />
            </div>
            <div className="mt-2 font-sans text-ink-400" style={{ fontSize: fluid(12, 14) }}>Amount in USD · press Enter or tap Continue</div>
          </div>
        ) : current.type === 'multi' ? (
          <MultiGoalPicker choices={current.choices} value={selected} onChange={onSelect}/>
        ) : (
          <div className={isGridChoice ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2'}>
            {current.choices.map((choice, i) => (
              <div key={choice} className={isGridChoice && current.choices.length % 2 !== 0 && i === current.choices.length - 1 ? 'col-span-2' : undefined}>
                <GoalCard label={choice} selected={selected === choice} onClick={() => onSelect(choice)}/>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA for number and multi-select inputs */}
      {current.type !== 'choice' && (
        <div style={{ paddingLeft: answerPad }}>
          <CTA
            label="Continue  →"
            full
            disabled={current.type === 'multi' ? !(selected?.picks?.length > 0) : !selected}
            onClick={onContinue}
          />
        </div>
      )}
    </ScreenShell>
  );
}

function MultiGoalPicker({ choices, value, onChange }) {
  const { picks = [], other = '' } = value || {};
  const noneSelected = picks.includes(NONE_GOAL);

  function toggle(title) {
    const isNone = title === NONE_GOAL;
    // None of the above is exclusive with the real goals
    if ((isNone && picks.length > 0 && !noneSelected) || (!isNone && noneSelected)) return;
    const next = picks.includes(title) ? picks.filter(t => t !== title) : [...picks, title];
    onChange({ picks: next, other });
  }

  return (
    <div className="flex flex-col gap-2">
      {choices.map(({ title, termKey, desc }) => {
        const isNone = title === NONE_GOAL;
        const checked = picks.includes(title);
        const disabled = (isNone && picks.length > 0 && !noneSelected) || (!isNone && noneSelected);
        return (
          <div
            key={title}
            onClick={() => toggle(title)}
            className={cn(
              'rounded-card border-[1.5px] px-4 py-1.5',
              checked ? 'border-ame-400 bg-ame-50' : 'border-ink-200 bg-white',
              disabled ? 'pointer-events-none cursor-default opacity-40' : 'cursor-pointer',
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-input border-[1.5px] font-sans text-xs font-bold text-white',
                checked ? 'border-ame-400 bg-ame-400' : 'border-ink-200 bg-white',
              )}>{checked ? '✓' : ''}</div>
              <div className="font-sans font-semibold text-ink-900" style={{ fontSize: fluid(15, 18) }}>
                {termKey
                  ? <span onClick={e => e.stopPropagation()}><TermUnderline termKey={termKey}>{title}</TermUnderline></span>
                  : title}
              </div>
            </div>
            {desc && (
              <div className="mt-1.5 pl-7 font-sans leading-normal text-ink-400" style={{ fontSize: fluid(13, 15) }}>{desc}</div>
            )}
          </div>
        );
      })}

      {noneSelected && (
        <textarea
          value={other}
          onChange={e => onChange({ picks, other: e.target.value })}
          placeholder="Tell me in your own words — what's drawing you to investing?"
          rows={3}
          autoFocus
          className="resize-y rounded-input border-[1.5px] border-ink-200 bg-white px-3.5 py-3 font-sans text-ink-900 outline-none"
          style={{ fontSize: fluid(15, 17) }}
        />
      )}
    </div>
  );
}

// Single-hero intro: shown when the user named an investor we recognise. One detailed card,
// then Continue straight to the chat (no grid to pick from).
function HeroIntro({ heroId, onContinue, saving, onBack }) {
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;
  const h = HERO_DATA[heroId];

  return (
    <ScreenShell>
      <BackButton onBack={onBack}/>

      <SageHeader avatarSize={avatarSize} isDesktop={isDesktop}>
        Look who we got here? {h.name} is here to help you.
      </SageHeader>

      <div className="flex flex-col gap-4 rounded-card border-[1.5px] border-ame-400 bg-ame-50 p-5">
        <div className="flex items-center gap-4">
          <HeroAvatar id={heroId} initials={h.initials} color={h.color} size={isDesktop ? 104 : 80}/>
          <div className="font-sans font-semibold text-ink-900" style={{ fontSize: fluid(22, 28) }}>{h.name}</div>
        </div>
        <div>
          <div className="mb-1 font-sans text-[11px] uppercase tracking-[0.14em] text-ink-400">Investment style</div>
          <div className="font-sans leading-snug text-ink-900" style={{ fontSize: fluid(14, 16) }}>{h.style}</div>
        </div>
        {h.knownFor && (
          <div>
            <div className="mb-1 font-sans text-[11px] uppercase tracking-[0.14em] text-ink-400">Known for</div>
            <div className="font-sans leading-snug text-ink-900" style={{ fontSize: fluid(14, 16) }}>{h.knownFor}</div>
          </div>
        )}
      </div>

      <CTA label={`Ask ${h.name}  →`} full loading={saving} onClick={onContinue}/>
    </ScreenShell>
  );
}

function HeroSelect({ heroIds, loading, onChoose, saving, onBack }) {
  const [picked, setPicked] = useState(null);
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;

  return (
    <ScreenShell>
      <BackButton onBack={onBack}/>

      <SageHeader avatarSize={avatarSize} isDesktop={isDesktop}>
        {loading ? 'Let me make some calls to find a few experts who could help you…' : 'Maybe you can ask some of these experts to help you?'}
      </SageHeader>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-card border-[1.5px] border-ink-100 bg-ink-50"/>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-2.5">
        {heroIds.map(id => {
          const h = HERO_DATA[id];
          const isPicked = picked === id;
          return (
            <div
              key={id}
              onClick={() => setPicked(id)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-card border-[1.5px] p-3',
                isPicked ? 'border-ame-400 bg-ame-50' : 'border-ink-200 bg-white',
              )}
            >
              <HeroAvatar id={id} initials={h.initials} color={h.color} size={isDesktop ? 64 : 52}/>
              <div className="min-w-0 flex-1">
                <div className="font-sans font-semibold text-ink-900" style={{ fontSize: fluid(15, 17) }}>{h.name}</div>
                <div className="mt-0.5 font-sans leading-snug text-ink-400" style={{ fontSize: fluid(12, 14) }}>{h.style}</div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <CTA
        label={picked ? `Ask ${HERO_DATA[picked].name}  →` : 'Pick an expert to continue'}
        full
        loading={saving}
        disabled={!picked}
        onClick={() => picked && onChoose(picked)}
      />
    </ScreenShell>
  );
}

function StockInterest({ stocks, setStocks, onFinish, saving, onBack }) {
  const [input, setInput] = useState('');
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;
  const answerPad = avatarSize + (isDesktop ? 18 : 10);

  function addStock() {
    const val = input.trim().toUpperCase();
    if (val && !stocks.includes(val)) {
      setStocks(s => [...s, val]);
      setInput('');
    }
  }

  return (
    <ScreenShell>
      {onBack && <BackButton onBack={onBack}/>}
      <ProgressDots step={QUESTIONS.length + 1} total={QUESTIONS.length + 1}/>

      <SageHeader avatarSize={avatarSize} isDesktop={isDesktop}>
        Any stocks, ETFs, or crypto you're curious about? Type a ticker or company name.
      </SageHeader>

      <div className="flex flex-col gap-4" style={{ paddingLeft: answerPad }}>
        {stocks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stocks.map(s => (
              <div
                key={s}
                className="inline-flex items-center gap-1.5 rounded-pill border border-ame-100 bg-ame-50 px-3 py-[5px] font-sans font-semibold text-ame-600"
                style={{ fontSize: fluid(13, 15) }}
              >
                {s}
                <div onClick={() => setStocks(prev => prev.filter(x => x !== s))} className="cursor-pointer text-ame-400" style={{ fontSize: fluid(13, 15) }}>×</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStock()}
            placeholder="e.g. AAPL, Tesla, QQQ…"
            className="h-12 flex-1 rounded-input border-[1.5px] border-ink-200 bg-white px-3.5 font-sans text-ink-900 outline-none"
            style={{ fontSize: fluid(15, 17) }}
          />
          <div
            onClick={addStock}
            className="flex h-12 cursor-pointer items-center rounded-input bg-ink-900 px-[18px] font-sans font-semibold text-white"
            style={{ fontSize: fluid(14, 16) }}
          >Add</div>
        </div>

        <div className="flex flex-col gap-2.5">
          {stocks.length > 0 ? (
            <CTA label="Now let's go buy some stocks  →" full loading={saving} onClick={() => onFinish(stocks)}/>
          ) : (
            <CTA label="I have no idea  →" full loading={saving} onClick={() => onFinish([])}/>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}

function useIsDesktop() {
  const [wide, setWide] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = e => setWide(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return wide;
}
