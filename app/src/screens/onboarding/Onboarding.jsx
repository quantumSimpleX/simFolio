import { useState } from 'react';
import { C, SANS, GOALS } from '../../tokens';
import { Logo, SimPill, CTA, GoalCard, ProgressDots, GuideAvatar } from '../../components/Primitives';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { matchHeroes } from '../../data/heroes';


// Q1 is always first; Q2–Q8 are randomized each session
const BASE_QUESTIONS = [
  {
    key: 'goal',
    q: "Good to meet you. One question to start — what's drawing you to investing right now?",
    type: 'choice',
    choices: GOALS,
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
    key: 'risk',
    q: "If your portfolio dropped 20% in a month, what would you do?",
    type: 'choice',
    choices: ["Sell everything — I can't handle that", "Sell some, keep some", "Hold and wait", "Buy more — it's a discount", "Depends what caused it"],
  },
  {
    key: 'experience',
    q: "How much experience do you have with investing or financial markets?",
    type: 'choice',
    choices: ["None — complete beginner", "I've read about it but never traded", "I've traded a little", "I trade regularly", "I have a financial background"],
  },
  {
    key: 'language',
    q: "What's your primary language for reading about money and investing?",
    type: 'choice',
    choices: ['English', '繁體中文 (Traditional Chinese)', '日本語 (Japanese)', 'Español', 'Other'],
  },
  {
    key: 'familiarity',
    q: "How familiar are you with terms like P/E ratio, ETF, or market cap?",
    type: 'choice',
    choices: ["Not at all", "I've heard them but don't really know them", "I know the basics", "Pretty comfortable", "Very familiar"],
  },
  {
    key: 'heroMention',
    q: "Anyone you've heard mentioned — from a book, podcast, or just people talking about them?",
    type: 'choice',
    choices: ['Warren Buffett', 'Cathie Wood', 'Ray Dalio', 'Peter Lynch', "I haven't heard of specific investors"],
  },
];

// Shuffle Q2–Q8 once per session
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

  function handleSelect(choice) {
    setSelected(choice);
    setTimeout(() => advance(choice), 180);
  }

  function handleContinue() {
    advance(selected);
  }

  async function handleFinish(stockList) {
    // TODO: restore — temporarily bypassing auth for UI testing
    if (!user) {
      if (stockList.length > 0) navigate(`/buy/${stockList[0]}`);
      else navigate('/portfolio');
      return;
    }
    if (saving) return;
    setSaving(true);

    const capital = parseInt(answers.capital) || 5000;
    const lang = answers.language?.includes('中文') ? 'zh-TW' : 'en';
    const heroIds = matchHeroes(answers);

    try {
      // Create user row
      await supabase.from('users').upsert({
        user_id: user.id,
        language_preference: lang,
        theme_preference: 'light',
        onboarding_done: true,
      });

      // Create balance row
      await supabase.from('user_balances').upsert({
        user_id: user.id,
        cash_balance: capital,
        starting_capital: capital,
      });

      // Persist hero selections (first match only for now; others introduced organically)
      await supabase.from('hero_selections').upsert(
        heroIds.slice(0, 1).map(id => ({ user_id: user.id, hero_id: id }))
      );

      if (stockList.length > 0) {
        navigate(`/buy/${stockList[0]}`);
      } else {
        navigate('/portfolio');
      }
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaving(false);
    }
  }

  if (showStock) {
    return <StockInterest stocks={stocks} setStocks={setStocks} onFinish={handleFinish} saving={saving}/>;
  }

  return (
    <div style={{ width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100dvh', background:C.paper, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px 14px', flexShrink:0 }}>
        <Logo size={19}/>
        <SimPill/>
      </div>
      <div style={{ padding:'0 24px 20px', flexShrink:0 }}>
        <ProgressDots step={step+1} total={8}/>
      </div>
      <div style={{ flex:1, padding:'0 24px', display:'flex', flexDirection:'column', gap:20, overflow:'auto' }}>
        <div style={{ display:'flex', gap:10 }}>
          <GuideAvatar size={34}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:SANS, fontSize:11, fontWeight:600, color:C.ink400, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>Sage</div>
            <div style={{ fontFamily:SANS, fontSize:15, color:C.ink600, lineHeight:1.55 }}>{current.q}</div>
          </div>
        </div>

        {current.type === 'number' ? (
          <div style={{ paddingLeft:46 }}>
            <div style={{ display:'flex', alignItems:'center', height:52, border:`1.5px solid ${selected ? C.ink900 : C.ink200}`, borderRadius:4, background:C.white, overflow:'hidden' }}>
              <div style={{ padding:'0 14px', fontFamily:SANS, fontSize:18, color:C.ink400, flexShrink:0 }}>$</div>
              <input
                type="number"
                min="0"
                value={selected || ''}
                onChange={e => setSelected(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && selected && handleContinue()}
                placeholder="5000"
                autoFocus
                style={{ flex:1, border:'none', outline:'none', fontFamily:SANS, fontSize:20, fontWeight:600, color:C.ink900, background:'transparent', padding:'0 14px 0 0' }}
              />
            </div>
            <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, marginTop:8 }}>Amount in USD · press Enter or tap Continue</div>
          </div>
        ) : (
          <div style={{ paddingLeft:46, display:'flex', flexDirection:'column', gap:8 }}>
            {current.choices.map(choice => (
              <GoalCard key={choice} label={choice} selected={selected===choice} onClick={() => handleSelect(choice)}/>
            ))}
          </div>
        )}
      </div>

      {current.type !== 'choice' && (
        <div style={{ padding:'16px 24px 32px', borderTop:`1px solid ${C.ink100}`, flexShrink:0 }}>
          <CTA label="Continue  →" full disabled={!selected} onClick={handleContinue}/>
        </div>
      )}
    </div>
  );
}

function StockInterest({ stocks, setStocks, onFinish, saving }) {
  const [input, setInput] = useState('');

  function addStock() {
    const val = input.trim().toUpperCase();
    if (val && !stocks.includes(val)) {
      setStocks(s => [...s, val]);
      setInput('');
    }
  }

  return (
    <div style={{ width:'100%', maxWidth:480, margin:'0 auto', minHeight:'100dvh', background:C.paper, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px 14px', flexShrink:0 }}>
        <Logo size={19}/>
        <SimPill/>
      </div>
      <div style={{ padding:'0 24px 20px', flexShrink:0 }}>
        <ProgressDots step={8} total={8}/>
      </div>
      <div style={{ flex:1, padding:'0 24px', display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', gap:10 }}>
          <GuideAvatar size={34}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:SANS, fontSize:11, fontWeight:600, color:C.ink400, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>Sage</div>
            <div style={{ fontFamily:SANS, fontSize:15, color:C.ink600, lineHeight:1.55 }}>
              Any stocks, ETFs, or crypto you're curious about? Type a ticker or company name.
            </div>
          </div>
        </div>
        {stocks.length > 0 && (
          <div style={{ paddingLeft:46, display:'flex', flexWrap:'wrap', gap:8 }}>
            {stocks.map(s => (
              <div key={s} style={{ display:'inline-flex', alignItems:'center', gap:6, background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:999, padding:'5px 12px', fontFamily:SANS, fontSize:13, fontWeight:600, color:C.ame600 }}>
                {s}
                <div onClick={() => setStocks(prev => prev.filter(x=>x!==s))} style={{ cursor:'pointer', color:C.ame400, fontSize:14 }}>×</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ paddingLeft:46 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addStock()}
              placeholder="e.g. AAPL, Tesla, QQQ…"
              style={{ flex:1, height:48, border:`1.5px solid ${C.ink200}`, borderRadius:4, padding:'0 14px', fontFamily:SANS, fontSize:15, color:C.ink900, background:C.white, outline:'none' }}
            />
            <div onClick={addStock} style={{ height:48, padding:'0 18px', background:C.ink900, color:C.white, borderRadius:4, display:'flex', alignItems:'center', fontFamily:SANS, fontSize:14, fontWeight:600, cursor:'pointer' }}>Add</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'16px 24px 32px', borderTop:`1px solid ${C.ink100}`, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
        {stocks.length > 0 ? (
          <CTA label="Let's start trading  →" full loading={saving} onClick={() => onFinish(stocks)}/>
        ) : (
          <>
            <CTA label="Skip — show me ideas  →" full loading={saving} onClick={() => onFinish([])}/>
            <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400, textAlign:'center' }}>Your hero advisor will suggest some</div>
          </>
        )}
      </div>
    </div>
  );
}
