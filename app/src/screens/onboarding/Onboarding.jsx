import { useState } from 'react';
import { CTA, GoalCard, HeroAvatar, TermUnderline } from '../../components/Primitives';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOnboardingAnswers } from '../../hooks/useOnboardingAnswers';
import { supabase } from '../../lib/supabase';
import { matchHeroes, resolveSelectionHeroes, heroIdFromName, HERO_DATA } from '../../data/heroes';
import { useHeroRanking } from '../../hooks/useHeroRanking';
import { cn } from '../../lib/utils';
import { ScreenShell, SageHeader, BackButton, OnboardingProgress } from './shell';
import { fluid } from '../../lib/fluid';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { HeroSelect } from '../../components/HeroSelect';

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
  const { state: navState } = useLocation();
  // Set by the "My preferences changed" menu. A redo prefills from saved answers and
  // refreshes preferences/mentor without resetting the user's existing balance.
  const isRedo = !!navState?.redo;
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showStock, setShowStock] = useState(false);
  const [showHeroes, setShowHeroes] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const { answers: savedAnswers } = useOnboardingAnswers();
  // On a redo the starting-capital question is skipped — their existing balance is kept,
  // so re-asking "how much to invest" would be meaningless.
  const questions = isRedo ? QUESTIONS.filter(q => q.key !== 'capital') : QUESTIONS;
  const current = questions[step];

  // Prefill once when redoing onboarding, as soon as the saved answers have loaded.
  // Adjusting state during render (rather than in an effect) is React's recommended
  // pattern here and avoids an extra commit. Seeds the first step's selection, the
  // full answer map, and any previously entered stocks.
  if (isRedo && !seeded && savedAnswers && Object.keys(savedAnswers).length > 0) {
    setSeeded(true);
    setAnswers(savedAnswers);
    setSelected(restoreSelected(questions[0], savedAnswers[questions[0].key]));
    if (Array.isArray(savedAnswers.stocks)) setStocks(savedAnswers.stocks);
  }

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
    if (step < questions.length - 1) {
      const next = step + 1;
      setStep(next);
      // Restore any prefilled answer for the next step (null for first-time users).
      setSelected(restoreSelected(questions[next], newAnswers[questions[next].key]));
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
    setSelected(restoreSelected(questions[prev], answers[questions[prev].key]));
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
      // Only seed the balance on first onboarding. A redo updates preferences/mentor
      // without resetting the user's existing cash or wiping their portfolio.
      if (!isRedo) {
        await supabase.from('user_balances').upsert({
          user_id: user.id,
          cash_balance: capital,
          starting_capital: capital,
        });
      }
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
    return (
      <HeroSelect
        heroIds={selectionHeroIds}
        loading={rankingLoading}
        onChoose={handleHeroChosen}
        saving={saving}
        onBack={() => setShowHeroes(false)}
        loadingMessage="Let me make some calls to find a few experts who could help you…"
        message="Maybe you can ask some of these experts to help you?"
      />
    );
  }

  if (showStock) {
    return <StockInterest stocks={stocks} setStocks={setStocks} onFinish={handleFinish} saving={saving} onBack={handleBack} total={questions.length + 1}/>;
  }

  return <OnboardingShell step={step} total={questions.length + 1} current={current} selected={selected} onSelect={handleSelect} onContinue={handleContinue} onBack={step > 0 ? handleBack : null}/>;
}

function OnboardingShell({ step, total, current, selected, onSelect, onContinue, onBack }) {
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;
  const answerPad = avatarSize + (isDesktop ? 18 : 10);

  const isGridChoice = isDesktop && current.type === 'choice' && current.choices.length >= 4;

  return (
    <ScreenShell>
      {onBack && <BackButton onBack={onBack}/>}
      <OnboardingProgress step={step + 1} total={total}/>

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
          // Single-select: real radio-group semantics for keyboard arrow-key nav and
          // screen readers. The native radios are visually hidden; GoalCard supplies the
          // styling and the label wrapper makes the whole card the radio's hit target.
          <fieldset className={cn('border-none p-0', isGridChoice ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2')}>
            <legend className="sr-only">{current.q}</legend>
            {current.choices.map((choice, i) => (
              <label key={choice} className={cn('block cursor-pointer rounded-card focus-within:ring-2 focus-within:ring-ame-400', isGridChoice && current.choices.length % 2 !== 0 && i === current.choices.length - 1 && 'col-span-2')}>
                <input
                  type="radio"
                  name={current.key}
                  value={choice}
                  checked={selected === choice}
                  onChange={() => onSelect(choice)}
                  onClick={() => { if (selected === choice) onSelect(choice); }}
                  className="sr-only"
                />
                <GoalCard label={choice} selected={selected === choice}/>
              </label>
            ))}
          </fieldset>
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
          <button
            key={title}
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={title}
            disabled={disabled}
            // Ignore clicks that originate inside a portalled tooltip (mobile bottom
            // sheet) — React bubbles portal events through the component tree, but those
            // targets live outside this card's DOM, so the goal must not toggle.
            onClick={e => { if (e.currentTarget.contains(e.target)) toggle(title); }}
            className={cn(
              'flex min-h-[80px] w-full items-center rounded-card border-[1.5px] px-4 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ame-400',
              checked ? 'border-ame-400 bg-ame-50' : 'border-ink-200 bg-white',
              disabled ? 'pointer-events-none cursor-default opacity-40' : 'cursor-pointer',
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-input border-[1.5px]',
                checked ? 'border-ame-400 bg-ame-400' : 'border-ink-200 bg-white',
              )}>
                {checked && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="font-sans leading-snug text-ink-900" style={{ fontSize: fluid(15, 18) }}>
                <span className="font-semibold">
                  {termKey ? <TermUnderline termKey={termKey}>{title}</TermUnderline> : title}
                </span>
                {desc && <span className="font-normal text-ink-400">: {desc}</span>}
              </div>
            </div>
          </button>
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
        Given your answers, {h.name} feels like a natural fit — what do you think?
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

function StockInterest({ stocks, setStocks, onFinish, saving, onBack, total }) {
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
      <OnboardingProgress step={total} total={total}/>

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
