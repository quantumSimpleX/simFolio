import { useState, useEffect } from 'react';
import { C, SANS } from '../../tokens';
import { Logo, SimPill, CTA, GoalCard, ProgressDots, GuideAvatar } from '../../components/Primitives';
import BrandPanel from '../../components/BrandPanel';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { matchHeroes, rankHeroesForSelection, HERO_DATA } from '../../data/heroes';

const NONE_GOAL = 'None of the above';

const GOAL_CHOICES = [
  { title: 'Shielding purchasing power from inflation', desc: '' },
  { title: 'Harnessing exponential compound wealth growth', desc: '' },
  { title: 'Generating reliable passive dividend income', desc: '' },
  { title: 'Spreading risk through asset diversification', desc: '' },
  { title: 'Owning pieces of profitable global corporations', desc: '' },
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
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showStock, setShowStock] = useState(false);
  const [showHeroes, setShowHeroes] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [saving, setSaving] = useState(false);

  const current = QUESTIONS[step];

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
    if (!user) {
      if (stockList.length > 0) navigate(`/buy/${stockList[0]}`);
      else navigate('/portfolio');
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
      await supabase.from('user_balances').upsert({
        user_id: user.id,
        cash_balance: capital,
        starting_capital: capital,
      });
      await supabase.from('hero_selections').upsert(
        heroIds.slice(0, 1).map(id => ({ user_id: user.id, hero_id: id }))
      );
      if (stockList.length > 0) navigate(`/buy/${stockList[0]}`);
      else navigate('/portfolio');
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaving(false);
    }
  }

  if (showHeroes) {
    return <HeroSelect heroIds={rankHeroesForSelection(answers)} onChoose={handleHeroChosen} saving={saving} onBack={() => setShowHeroes(false)}/>;
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
      <div style={{ width: '100%', height: '100dvh', background: C.paper, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: '45%', minWidth: 420, maxWidth: 620, flexShrink: 0 }}>
          <BrandPanel/>
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '56px 48px 48px' }}>
          <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 28, height: 'fit-content' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', width: '100%', background: C.paper, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        borderBottom: `1px solid ${C.ink100}`,
        background: C.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        flexShrink: 0,
      }}>
        <Logo size={19}/>
        <SimPill/>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 24px 32px' }}>
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
      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: SANS, fontSize: fluid(13, 15), fontWeight: 600, color: C.ink400 }}
    >
      ← Back
    </div>
  );
}

function OnboardingShell({ step, total, current, selected, onSelect, onContinue, onBack }) {
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;

  const choiceGrid = isDesktop && current.type === 'choice' && current.choices.length >= 4
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
    : { display: 'flex', flexDirection: 'column', gap: 8 };

  return (
    <ScreenShell>
          {/* Progress */}
          {onBack && <BackButton onBack={onBack}/>}
          <ProgressDots step={step + 1} total={total}/>

          {/* Sage message */}
          <div style={{ display: 'flex', gap: isDesktop ? 18 : 10, alignItems: 'flex-start' }}>
            <GuideAvatar size={avatarSize}/>
            <div style={{ flex: 1, paddingTop: isDesktop ? 4 : 0 }}>
              <div style={{ fontFamily: SANS, fontSize: fluid(11, 13), fontWeight: 600, color: C.ink400, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: isDesktop ? 8 : 6 }}>Sage</div>
              <div style={{ fontFamily: SANS, fontSize: fluid(15, 22), color: C.ink600, lineHeight: 1.5 }}>{current.q}</div>
            </div>
          </div>

          {/* Answer area */}
          <div style={{ paddingLeft: isDesktop ? avatarSize + 18 : avatarSize + 10 }}>
            {current.type === 'number' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', height: 52, border: `1.5px solid ${selected ? C.ink900 : C.ink200}`, borderRadius: 4, background: C.white, overflow: 'hidden' }}>
                  <div style={{ padding: '0 14px', fontFamily: SANS, fontSize: fluid(16, 20), color: C.ink400, flexShrink: 0 }}>$</div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={selected ? Number(selected).toLocaleString('en-US') : ''}
                    onChange={e => onSelect(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && selected && onContinue()}
                    placeholder="5000"
                    autoFocus
                    style={{ flex: 1, border: 'none', outline: 'none', fontFamily: SANS, fontSize: fluid(18, 24), fontWeight: 600, color: C.ink900, background: 'transparent', padding: '0 14px 0 0' }}
                  />
                </div>
                <div style={{ fontFamily: SANS, fontSize: fluid(12, 14), color: C.ink400, marginTop: 8 }}>Amount in USD · press Enter or tap Continue</div>
              </div>
            ) : current.type === 'multi' ? (
              <MultiGoalPicker choices={current.choices} value={selected} onChange={onSelect}/>
            ) : (
              <div style={choiceGrid}>
                {current.choices.map((choice, i) => (
                  <div key={choice} style={isDesktop && current.choices.length % 2 !== 0 && i === current.choices.length - 1 ? { gridColumn: '1 / span 2' } : undefined}>
                    <GoalCard label={choice} selected={selected === choice} onClick={() => onSelect(choice)}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA for number and multi-select inputs */}
          {current.type !== 'choice' && (
            <div style={{ paddingLeft: isDesktop ? avatarSize + 18 : avatarSize + 10 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {choices.map(({ title, desc }) => {
        const isNone = title === NONE_GOAL;
        const checked = picks.includes(title);
        const disabled = (isNone && picks.length > 0 && !noneSelected) || (!isNone && noneSelected);
        return (
          <div
            key={title}
            onClick={() => toggle(title)}
            style={{
              border: `1.5px solid ${checked ? C.ame400 : C.ink200}`,
              borderRadius: 8,
              background: checked ? C.ame50 : C.white,
              padding: '14px 16px',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.4 : 1,
              pointerEvents: disabled ? 'none' : 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 18, height: 18, flexShrink: 0, borderRadius: 4,
                border: `1.5px solid ${checked ? C.ame400 : C.ink200}`,
                background: checked ? C.ame400 : C.white,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.white, fontSize: 12, fontFamily: SANS, fontWeight: 700,
              }}>{checked ? '✓' : ''}</div>
              <div style={{ fontFamily: SANS, fontSize: fluid(15, 18), fontWeight: 600, color: C.ink900 }}>{title}</div>
            </div>
            {desc && (
              <div style={{ fontFamily: SANS, fontSize: fluid(13, 15), color: C.ink400, lineHeight: 1.5, marginTop: 6, paddingLeft: 28 }}>{desc}</div>
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
          style={{
            border: `1.5px solid ${C.ink200}`, borderRadius: 4, padding: '12px 14px',
            fontFamily: SANS, fontSize: fluid(15, 17), color: C.ink900, background: C.white,
            outline: 'none', resize: 'vertical',
          }}
        />
      )}
    </div>
  );
}

function HeroSelect({ heroIds, onChoose, saving, onBack }) {
  const [picked, setPicked] = useState(null);
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;

  return (
    <ScreenShell>
          <BackButton onBack={onBack}/>

          <div style={{ display: 'flex', gap: isDesktop ? 18 : 10, alignItems: 'flex-start' }}>
            <GuideAvatar size={avatarSize}/>
            <div style={{ flex: 1, paddingTop: isDesktop ? 4 : 0 }}>
              <div style={{ fontFamily: SANS, fontSize: fluid(11, 13), fontWeight: 600, color: C.ink400, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: isDesktop ? 8 : 6 }}>Sage</div>
              <div style={{ fontFamily: SANS, fontSize: fluid(15, 22), color: C.ink600, lineHeight: 1.5 }}>
                Maybe you can ask some of these experts to help you?
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {heroIds.map(id => {
              const h = HERO_DATA[id];
              const isPicked = picked === id;
              return (
                <div
                  key={id}
                  onClick={() => setPicked(id)}
                  style={{
                    border: `1.5px solid ${isPicked ? C.ame400 : C.ink200}`,
                    borderRadius: 8,
                    background: isPicked ? C.ame50 : C.white,
                    padding: '14px 14px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: h.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.white, fontFamily: SANS, fontSize: 14, fontWeight: 700,
                  }}>{h.initials}</div>
                  <div style={{ fontFamily: SANS, fontSize: fluid(15, 17), fontWeight: 600, color: C.ink900 }}>{h.name}</div>
                  <div style={{ fontFamily: SANS, fontSize: fluid(12, 14), color: C.ink400, lineHeight: 1.4 }}>{h.style}</div>
                </div>
              );
            })}
          </div>

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

          <div style={{ display: 'flex', gap: isDesktop ? 18 : 10, alignItems: 'flex-start' }}>
            <GuideAvatar size={avatarSize}/>
            <div style={{ flex: 1, paddingTop: isDesktop ? 4 : 0 }}>
              <div style={{ fontFamily: SANS, fontSize: fluid(11, 13), fontWeight: 600, color: C.ink400, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: isDesktop ? 8 : 6 }}>Sage</div>
              <div style={{ fontFamily: SANS, fontSize: fluid(15, 22), color: C.ink600, lineHeight: 1.5 }}>
                Any stocks, ETFs, or crypto you're curious about? Type a ticker or company name.
              </div>
            </div>
          </div>

          <div style={{ paddingLeft: avatarSize + (isDesktop ? 18 : 10), display: 'flex', flexDirection: 'column', gap: 16 }}>
            {stocks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stocks.map(s => (
                  <div key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.ame50, border: `1px solid ${C.ame100}`, borderRadius: 999, padding: '5px 12px', fontFamily: SANS, fontSize: fluid(13, 15), fontWeight: 600, color: C.ame600 }}>
                    {s}
                    <div onClick={() => setStocks(prev => prev.filter(x => x !== s))} style={{ cursor: 'pointer', color: C.ame400, fontSize: fluid(13, 15) }}>×</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStock()}
                placeholder="e.g. AAPL, Tesla, QQQ…"
                style={{ flex: 1, height: 48, border: `1.5px solid ${C.ink200}`, borderRadius: 4, padding: '0 14px', fontFamily: SANS, fontSize: fluid(15, 17), color: C.ink900, background: C.white, outline: 'none' }}
              />
              <div onClick={addStock} style={{ height: 48, padding: '0 18px', background: C.ink900, color: C.white, borderRadius: 4, display: 'flex', alignItems: 'center', fontFamily: SANS, fontSize: fluid(14, 16), fontWeight: 600, cursor: 'pointer' }}>Add</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
