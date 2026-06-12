import { useState, useRef, useEffect } from 'react';
import { C, SANS, DISPLAY } from '../../tokens';
import { Eyebrow } from '../../components/Primitives';
import { AppShell } from '../../components/AppShell';
import { ChartPanel, RangeButtons } from '../../components/Charts';
import { HoldingRow } from '../../components/HoldingRow';
import { HeroMessage, UserMessage } from '../../components/HeroMessage';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { usePortfolioCandles } from '../../hooks/usePortfolioCandles';
import { useCandles } from '../../hooks/useStockDetail';
import { useHeroSelections } from '../../hooks/useHeroSelections';
import { useHeroChat, useHeroHistory } from '../../hooks/useHeroChat';

const QUICK_PROMPTS = ['Review my picks','Too concentrated?','Am I diversified?'];

// Dev mock: ~$10k per position at mid-2025 prices
// AAPL $213 · NVDA $138 · NOW $1,048 · SFDC $295
// Cost basis uses avg buy prices; starting capital $50k
const DEV_HOLDINGS = [
  { ticker:'AAPL', name:'Apple Inc.',      total_qty:'47', average_cost_basis:'175', price:213,  value:10011, cost:8225, pnl:1786, pct:21.7, pos:true },
  { ticker:'NVDA', name:'NVIDIA Corp.',    total_qty:'73', average_cost_basis:'92',  price:138,  value:10074, cost:6716, pnl:3358, pct:50.0, pos:true },
  { ticker:'NOW',  name:'ServiceNow Inc.', total_qty:'10', average_cost_basis:'820', price:1048, value:10480, cost:8200, pnl:2280, pct:27.8, pos:true },
  { ticker:'CRM',  name:'Salesforce Inc.', total_qty:'34', average_cost_basis:'230', price:295,  value:10030, cost:7820, pnl:2210, pct:28.3, pos:true },
];
const DEV_CASH     = 19039;
const DEV_STARTING = 50000;

function fmt(n) {
  return n?.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) ?? '—';
}

export default function PortfolioDesktop() {
  const navigate = useNavigate();
  const [activeRange, setActiveRange] = useState('All');
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const { positions, cashBalance, totalValue, totalPnl, totalPct, loading } = usePortfolio();

  const useDev          = !loading && positions.length === 0;
  const displayHoldings = useDev ? DEV_HOLDINGS : positions;
  const displayCash     = useDev ? DEV_CASH : (cashBalance ?? 0);
  const displayTotal    = useDev ? DEV_CASH + DEV_HOLDINGS.reduce((s,h) => s + h.value, 0) : totalValue;
  const displayPnl      = useDev ? displayTotal - DEV_STARTING : totalPnl;
  const displayPct      = useDev ? (displayPnl / DEV_STARTING) * 100 : totalPct;

  const { data: overlayCandles } = useCandles(hoveredTicker, activeRange);
  const { candles, isLoading: candlesLoading, isError: candlesError } = usePortfolioCandles(
    useDev ? DEV_HOLDINGS : positions,
    displayCash,
    activeRange,
  );
  const { heroes } = useHeroSelections();

  const primaryHero = heroes[0];
  const heroId = primaryHero?.id ?? 'sage';

  const portfolioContext = positions.length
    ? `Cash: $${cashBalance?.toFixed(2) ?? 0}. Holdings: ${positions.map(p => `${p.ticker} (${parseFloat(p.total_qty)} shares @ avg $${parseFloat(p.average_cost_basis).toFixed(2)}, current $${p.price?.toFixed(2) ?? '?'})`).join(', ')}.`
    : 'No positions yet.';

  const { data: history } = useHeroHistory(heroId);
  const { mutate: sendMessage, isPending } = useHeroChat(heroId, portfolioContext);

  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('Council');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [history]);

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || isPending) return;
    setInput('');
    sendMessage(msg);
  }

  const pnlPos = displayPnl >= 0;
  const councilNames = heroes.map(h => h.name.split(' ')[0]).join(' · ');

  return (
    <AppShell active="portfolio" maxWidth={1280}>
      <div style={{ display:'flex', gap:32, alignItems:'flex-start' }}>
        {/* Left: portfolio data */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:48, color:C.ink900, letterSpacing:'-0.025em', lineHeight:1 }}>
                {loading ? '…' : `$${fmt(displayTotal)}`}
              </div>
              <div style={{ fontFamily:SANS, fontSize:16, color:pnlPos?C.aqua600:C.red, marginTop:6 }}>
                {pnlPos?'+':''}{fmt(displayPnl)} · {pnlPos?'+':''}{displayPct.toFixed(1)}% all time
              </div>
            </div>
            <RangeButtons range={activeRange} onRangeChange={setActiveRange}/>
          </div>

          <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'20px 8px 8px' }}>
            <ChartPanel
              height={300}
              candles={candles}
              isLoading={loading || candlesLoading}
              isError={candlesError}
              range={activeRange}
              onRangeChange={setActiveRange}
              overlayCandles={overlayCandles ?? null}
            />
          </div>

          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <Eyebrow>Holdings</Eyebrow>
              <div onClick={() => navigate('/markets')} style={{ height:32, padding:'0 14px', border:`1px solid ${C.ink100}`, borderRadius:4, display:'flex', alignItems:'center', fontFamily:SANS, fontSize:13, color:C.ame400, cursor:'pointer' }}>+ Add position</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', columnGap:32 }}>
            {displayHoldings.map(h => (
              <HoldingRow
                key={h.ticker}
                ticker={h.ticker}
                name={h.name}
                qty={parseFloat(h.total_qty)}
                value={h.value}
                pnl={h.pnl}
                pct={h.pct}
                pos={h.pos}
                highlighted={h.ticker === hoveredTicker}
                onClick={() => navigate(`/stock/${h.ticker}`)}
                onMouseEnter={() => setHoveredTicker(h.ticker)}
                onMouseLeave={() => setHoveredTicker(null)}
              />
            ))}
            </div>
          </div>
        </div>

        {/* Right: hero sidebar — sticky card, like the Trade sidebar on StockDetail */}
        <div style={{ width:380, flexShrink:0, border:`1px solid ${C.ink100}`, borderRadius:8, background:C.white, display:'flex', flexDirection:'column', overflow:'hidden', position:'sticky', top:28, height:'calc(100dvh - 130px)' }}>
          <div style={{ height:52, borderBottom:`1px solid ${C.ink100}`, display:'flex', alignItems:'stretch' }}>
            {['Council', ...heroes.map(h => h.name.split(' ')[0])].slice(0,3).map(t => (
              <div key={t} onClick={() => setActiveTab(t)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:13, fontWeight:activeTab===t?600:400, color:activeTab===t?C.ink900:C.ink400, borderBottom:activeTab===t?`2px solid ${C.ink900}`:'2px solid transparent', cursor:'pointer' }}>{t}</div>
            ))}
          </div>
          <div style={{ padding:'18px 24px 14px', display:'flex', gap:10, alignItems:'center', borderBottom:`1px solid ${C.ink100}` }}>
            <div style={{ display:'flex' }}>
              {heroes.slice(0,3).map((h,i) => (
                <div key={h.id} style={{ width:30, height:30, borderRadius:'50%', background:`${h.color}12`, border:`1.5px solid ${h.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:11, color:h.color, marginLeft:i>0?-8:0 }}>{h.initials}</div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily:SANS, fontSize:14, fontWeight:600, color:C.ink900 }}>{councilNames || 'Sage'}</div>
              <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>{heroes.length} of 3 council slots · watching your portfolio</div>
            </div>
          </div>
          <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.ink100}`, display:'flex', flexWrap:'wrap', gap:6 }}>
            {QUICK_PROMPTS.map(p => (
              <div key={p} onClick={() => handleSend(p)} style={{ padding:'5px 12px', background:C.ink50, border:`1px solid ${C.ink100}`, borderRadius:999, fontFamily:SANS, fontSize:12, color:C.ink700, cursor:'pointer' }}>{p}</div>
            ))}
          </div>
          <div style={{ flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:18, overflow:'auto' }}>
            {(history ?? []).map((msg, i) => (
              msg.role === 'user'
                ? <UserMessage key={i} text={msg.content}/>
                : <HeroMessage key={i} hero={heroId} text={`"${msg.content}"`}/>
            ))}
            {isPending && <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400, fontStyle:'italic' }}>Thinking…</div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding:'14px 24px 20px', borderTop:`1px solid ${C.ink100}` }}>
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleSend()}
                placeholder="Ask your council…"
                style={{ flex:1, height:44, border:`1px solid ${C.ink200}`, borderRadius:4, padding:'0 14px', fontFamily:SANS, fontSize:14, color:C.ink900, background:C.white, outline:'none' }}
              />
              <div onClick={() => handleSend()} style={{ width:44, height:44, background:C.ink900, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', color:C.white, cursor:'pointer', fontSize:18, opacity:isPending?0.5:1 }}>→</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
