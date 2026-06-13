import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Eyebrow } from '../../components/Primitives';
import { BottomNav, TopNav } from '../../components/Nav';
import { ChartPanel, RangeButtons } from '../../components/Charts';
import { HoldingRow } from '../../components/HoldingRow';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { usePortfolioCandles } from '../../hooks/usePortfolioCandles';
import { useCandles } from '../../hooks/useStockDetail';

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

export default function PortfolioMobile() {
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

  const pnlPos = displayPnl >= 0;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-paper">
      <TopNav active="portfolio"/>
      <div className="flex-shrink-0 px-2.5 pt-2">
        <div className="flex items-end gap-3">
          <div className="font-display text-[38px] font-bold leading-none tracking-[-0.02em] text-ink-900">
            {loading ? '…' : `$${fmt(displayTotal)}`}
          </div>
          <div className={cn('font-sans text-sm font-medium leading-tight', pnlPos ? 'text-aqua-600' : 'text-red')}>
            {pnlPos?'+':''}{fmt(displayPnl)} ({pnlPos?'+':''}{displayPct.toFixed(1)}%)
          </div>
          <div className="ml-auto">
            <RangeButtons range={activeRange} onRangeChange={setActiveRange}/>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-b border-ink-100 bg-white px-1.5 pt-3">
        <ChartPanel
          height={168}
          candles={candles}
          isLoading={loading || candlesLoading}
          isError={candlesError}
          range={activeRange}
          onRangeChange={setActiveRange}
          overlayCandles={overlayCandles ?? null}
        />
      </div>

      <div className="flex-shrink-0 px-2.5 pt-4">
        <div className="flex">
          {[['Cash', `$${fmt(displayCash)}`], ['Positions', String(displayHoldings.length)], ['All-time', `${pnlPos?'+':''}${displayPct.toFixed(1)}%`]].map(([label,value],i,arr) => (
            <div key={label} className={cn('flex-1', i<arr.length-1 && 'border-r border-ink-100 pr-4', i>0 && 'pl-4')}>
              <div className="mb-[3px] font-sans text-[11px] uppercase tracking-[0.1em] text-ink-400">{label}</div>
              <div className="font-sans text-base font-semibold text-ink-900">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2.5 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow>Holdings</Eyebrow>
          <div onClick={() => navigate('/markets')} className="cursor-pointer font-sans text-[13px] text-ame-400">+ Add</div>
        </div>
        {loading && positions.length === 0 && (
          <div className="py-5 font-sans text-sm text-ink-400">Loading positions…</div>
        )}
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
            compact
            highlighted={h.ticker === hoveredTicker}
            onClick={() => navigate(`/stock/${h.ticker}`)}
            onMouseEnter={() => setHoveredTicker(h.ticker)}
            onMouseLeave={() => setHoveredTicker(null)}
          />
        ))}
      </div>

      <BottomNav active="portfolio"/>
    </div>
  );
}
