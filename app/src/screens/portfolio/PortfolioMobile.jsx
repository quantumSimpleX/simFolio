import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Eyebrow, TermUnderline } from '../../components/Primitives';
import { BottomNav, TopNav } from '../../components/Nav';
import { ChartPanel, RangeButtons } from '../../components/Charts';
import { HoldingRow } from '../../components/HoldingRow';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { usePortfolioCandles } from '../../hooks/usePortfolioCandles';
import { useCandles } from '../../hooks/useStockDetail';

function fmt(n) {
  return n?.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) ?? '—';
}

export default function PortfolioMobile() {
  const navigate = useNavigate();
  const [activeRange, setActiveRange] = useState('All');
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const { positions, cashBalance, totalValue, totalPnl, totalPct, loading } = usePortfolio();

  const displayHoldings = positions;
  const displayCash     = cashBalance ?? 0;
  const displayTotal    = totalValue;
  const displayPnl      = totalPnl;
  const displayPct      = totalPct;

  const { data: overlayCandles } = useCandles(hoveredTicker, activeRange);
  const { candles, isLoading: candlesLoading, isError: candlesError } = usePortfolioCandles(
    positions,
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
        {!loading && displayHoldings.length === 0 && (
          <div className="pb-2 pt-1 text-center font-sans text-[13px] text-ink-300">
            Make your first trade to see performance over time
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-2.5 pt-4">
        <div className="flex">
          {[['Cash', `$${fmt(displayCash)}`, null], ['Positions', String(displayHoldings.length), 'position'], ['All-time', `${pnlPos?'+':''}${displayPct.toFixed(1)}%`, null]].map(([label,value,key],i,arr) => (
            <div key={label} className={cn('flex-1', i<arr.length-1 && 'border-r border-ink-100 pr-4', i>0 && 'pl-4')}>
              <div className="mb-[3px] font-sans text-[11px] uppercase tracking-[0.14em] text-ink-400">{key ? <TermUnderline termKey={key}>{label}</TermUnderline> : label}</div>
              <div className="font-sans text-base font-semibold text-ink-900">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2.5 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow><TermUnderline>Holdings</TermUnderline></Eyebrow>
          <div onClick={() => navigate('/markets')} className="cursor-pointer font-sans text-[13px] text-ame-400">+ Add</div>
        </div>
        {loading && positions.length === 0 && (
          <div className="py-5 font-sans text-sm text-ink-400">Loading positions…</div>
        )}
        {!loading && displayHoldings.length === 0 && (
          <div className="py-5 font-sans text-sm text-ink-400">No holdings yet. Buy a stock from Markets to get started.</div>
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
