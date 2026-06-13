import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Eyebrow } from '../../components/Primitives';
import { AppShell } from '../../components/AppShell';
import { ChartPanel, RangeButtons } from '../../components/Charts';
import { HoldingRow } from '../../components/HoldingRow';
import { QuickPrompts, ChatComposer, ChatMessages } from '../../components/HeroChatPanel';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { usePortfolioCandles } from '../../hooks/usePortfolioCandles';
import { useCandles } from '../../hooks/useStockDetail';
import { useHeroSelections } from '../../hooks/useHeroSelections';
import { useHeroChat, useHeroHistory } from '../../hooks/useHeroChat';

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
      <div className="flex items-start gap-8">
        {/* Left: portfolio data */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-5xl font-bold leading-none tracking-[-0.025em] text-ink-900">
                {loading ? '…' : `$${fmt(displayTotal)}`}
              </div>
              <div className={cn('mt-1.5 font-sans text-base', pnlPos ? 'text-aqua-600' : 'text-red')}>
                {pnlPos?'+':''}{fmt(displayPnl)} · {pnlPos?'+':''}{displayPct.toFixed(1)}% all time
              </div>
            </div>
            <RangeButtons range={activeRange} onRangeChange={setActiveRange}/>
          </div>

          <div className="rounded-card border border-ink-100 bg-white p-2">
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

          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <Eyebrow>Holdings</Eyebrow>
              <div onClick={() => navigate('/markets')} className="flex h-8 cursor-pointer items-center rounded-input border border-ink-100 px-3.5 font-sans text-[13px] text-ame-400">+ Add position</div>
            </div>
            <div className="grid grid-cols-2 gap-x-8">
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
        <div className="sticky top-7 flex w-[380px] flex-shrink-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-white [height:calc(100dvh/var(--zoom)-100px)]">
          <div className="flex h-11 items-stretch border-b border-ink-100">
            {['Council', ...heroes.map(h => h.name.split(' ')[0])].slice(0,3).map(t => (
              <div key={t} onClick={() => setActiveTab(t)} className={cn('flex flex-1 cursor-pointer items-center justify-center border-b-2 font-sans text-[15px]', activeTab===t ? 'border-ink-900 font-semibold text-ink-900' : 'border-transparent font-normal text-ink-400')}>{t}</div>
            ))}
          </div>
          <div className="flex items-center gap-2.5 border-b border-ink-100 px-3 py-2">
            <div className="flex">
              {heroes.slice(0,3).map((h,i) => (
                <div key={h.id} className="flex h-[30px] w-[30px] items-center justify-center rounded-pill font-sans text-[11px] font-bold" style={{ background:`${h.color}12`, border:`1.5px solid ${h.color}35`, color:h.color, marginLeft:i>0?-8:0 }}>{h.initials}</div>
              ))}
            </div>
            <div>
              <div className="font-sans text-[17px] font-semibold text-ink-900">{councilNames || 'Sage'}</div>
              <div className="font-sans text-sm text-ink-400">{heroes.length} of 3 council slots · watching your portfolio</div>
            </div>
          </div>
          <QuickPrompts onPick={handleSend} className="border-b border-ink-100 px-3 py-1.5"/>
          <ChatMessages
            className="flex-1 px-3 py-2.5"
            history={history}
            heroId={heroId}
            isPending={isPending}
          />
          <div className="border-t border-ink-100 px-3 pb-3 pt-2">
            <ChatComposer value={input} onChange={setInput} onSend={() => handleSend()} isPending={isPending}/>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
