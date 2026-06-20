import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { CTA, Eyebrow, TermUnderline, MktStatus } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { WatchlistButton } from '../../components/WatchlistButton'
import { SellButton } from '../../components/SellButton'
import { PositionCard } from '../../components/PositionCard'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { ChartPanel, RangeButtons } from '../../components/Charts'
import { useStockDetail, useCandles } from '../../hooks/useStockDetail'
import { isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useWatchlist } from '../../hooks/useWatchlist'
import StatCard from '../../components/common/StatCard'

function fmtMktCap(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return '—'
}

function fmtVol(v) {
  if (!v) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toString()
}

export default function StockDetail() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const [activeRange, setActiveRange] = useState('All')

  const { data: s, isLoading } = useStockDetail(ticker)
  const { data: candles, isLoading: candlesLoading, isError: candlesError } = useCandles(ticker, activeRange)
  const { positions } = usePortfolio()
  const marketOpen = isMarketOpen()
  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist()

  const position = positions.find(p => p.ticker === ticker)
  const watching = isWatching(ticker)
  const toggleWatch = () => (watching ? removeFromWatchlist(ticker) : addToWatchlist(ticker))

  // Value colors match the watchlist fundamentals on the Markets page.
  const fundamentals = s ? [
    ['Market cap', fmtMktCap(s.marketCap),                                                  'text-ink-700'],
    ['P/E',        s.peRatio       ? s.peRatio.toFixed(1)                     : '—',        'text-ame-600'],
    ['EPS',        s.eps           ? `$${s.eps.toFixed(2)}`                   : '—',        'text-aqua-600'],
    ['Beta',       s.beta          ? s.beta.toFixed(2)                        : '—',        'text-gold'],
    ['Div yield',  s.dividendYield ? `${(s.dividendYield * 100).toFixed(2)}%` : '—',        'text-ink-900'],
  ] : []

  const stats = s ? [
    ['52W range',  s.week52Low && s.week52High ? `$${s.week52Low.toFixed(0)} – $${s.week52High.toFixed(0)}` : '—'],
    ['Volume',     fmtVol(s.volume)],
    ['Avg volume', fmtVol(s.avgVolume)],
    ['Exchange',   s.exchange ?? '—'],
  ] : []

  const priceBlock = (
    <div>
      <div onClick={() => navigate('/markets')} className="mb-2.5 cursor-pointer font-sans text-[13px] text-ame-400">← Markets</div>
      <div className="mb-1 font-sans text-sm text-ink-400">
        {isLoading ? '…' : [ticker, s?.name, s?.exchange].filter(Boolean).join(' · ')}
      </div>
      <div className={cn('flex items-end', mobile ? 'gap-2' : 'gap-3.5')}>
        <div className={cn('whitespace-nowrap font-display font-bold leading-none tracking-[-0.025em] text-ink-900', mobile ? 'text-[34px]' : 'text-5xl')}>
          {isLoading ? '…' : s?.price ? `$${s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </div>
        <div className={cn('whitespace-nowrap font-sans leading-tight', mobile ? 'text-[13px]' : 'text-lg', s?.pos ? 'text-aqua-600' : 'text-red')}>
          {s ? `${s.pos ? '+' : ''}${s.change?.toFixed(2)} (${s.pos ? '+' : ''}${s.pct?.toFixed(1)}%)` : '—'}
        </div>
        <div className="ml-auto">
          <RangeButtons range={activeRange} onRangeChange={setActiveRange}/>
        </div>
      </div>
    </div>
  )

  const fundamentalsGrid = fundamentals.length > 0 && (
    <div>
      <div className="mb-3"><Eyebrow>Fundamentals</Eyebrow></div>
      <div className={cn('grid gap-3', mobile ? 'grid-cols-2' : 'grid-cols-5')}>
        {fundamentals.map(([label, value, color]) => (
          <StatCard key={label} label={<TermUnderline>{label}</TermUnderline>} value={value} valueColor={color} mobile={mobile} />
        ))}
      </div>
    </div>
  )

  const chartCard = (
    // Mobile: full-bleed past the AppShell's 16px gutters, tucked up under the price row
    <div className={mobile
      ? 'mx-[-10px] mt-[-14px] border-y border-ink-100 bg-white px-0.5 pb-1.5 pt-2'
      : 'rounded-card border border-ink-100 bg-white px-2 pb-2 pt-5'}>
      <ChartPanel height={mobile ? 150 : 300} candles={candles} isLoading={candlesLoading} isError={candlesError} range={activeRange} onRangeChange={setActiveRange} />
    </div>
  )

  const statsGrid = stats.length > 0 && (
    <div>
      <div className="mb-3"><Eyebrow>Key stats</Eyebrow></div>
      <div className={cn('grid gap-3', mobile ? 'grid-cols-2' : 'grid-cols-4')}>
        {stats.map(([label, value]) => (
          <StatCard key={label} label={<TermUnderline>{label}</TermUnderline>} value={value} mobile={mobile} />
        ))}
      </div>
    </div>
  )

  // ── Mobile: single column + fixed action bar ────────────────────────────────
  if (mobile) {
    const footer = (
      <div className="flex gap-2 border-t border-ink-100 bg-white px-4 py-3">
        <WatchlistButton watching={watching} onClick={toggleWatch} />
        <div className="flex-1"><CTA label={`Buy ${ticker}`} full onClick={() => navigate(`/buy/${ticker}`)} /></div>
        {position && <SellButton ticker={ticker} navigate={navigate} />}
      </div>
    )
    return (
      <AppShell active="markets" footer={footer}>
        <div className="flex flex-col gap-5">
          {priceBlock}
          {chartCard}
          {fundamentalsGrid}
          {statsGrid}
          {position && <PositionCard position={position} />}
        </div>
      </AppShell>
    )
  }

  // ── Desktop/tablet: two columns ─────────────────────────────────────────────
  return (
    <AppShell active="markets" maxWidth={1200}>
      <div className="flex items-start gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {priceBlock}
          {chartCard}
          {fundamentalsGrid}
          {statsGrid}
        </div>

        <div className="sticky top-7 flex w-[340px] flex-shrink-0 flex-col gap-3.5">
          <div className="font-sans text-xl font-bold text-ink-900">Trade {ticker}</div>
          <MktStatus open={marketOpen} />
          <CTA label={`Buy ${ticker}`} full onClick={() => navigate(`/buy/${ticker}`)} />
          <WatchlistButton watching={watching} onClick={toggleWatch} full />
          {position && <SellButton ticker={ticker} navigate={navigate} full />}
          {position && <PositionCard position={position} />}
        </div>
      </div>
    </AppShell>
  )
}
