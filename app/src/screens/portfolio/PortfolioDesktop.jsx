import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Eyebrow } from '../../components/Primitives';
import { AppShell } from '../../components/AppShell';
import { ChartPanel, RangeButtons } from '../../components/Charts';
import { HoldingRow } from '../../components/HoldingRow';
import { HeroSidebar } from '../../components/HeroSidebar';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { usePortfolioCandles } from '../../hooks/usePortfolioCandles';
import { useCandles } from '../../hooks/useStockDetail';

function fmt(n) {
  return n?.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) ?? '—';
}

export default function PortfolioDesktop() {
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
            {!loading && displayHoldings.length === 0 ? (
              <div className="py-5 font-sans text-sm text-ink-400">No holdings yet. Buy a stock from Markets to get started.</div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Right: hero sidebar — sticky card, like the Trade sidebar on StockDetail */}
        <HeroSidebar />
      </div>
    </AppShell>
  );
}
