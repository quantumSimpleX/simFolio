import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { C, SANS, DISPLAY } from '../../tokens'
import { CTA, Eyebrow, TermUnderline, MktStatus } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { ChartPanel } from '../../components/Charts'
import { useStockDetail, useCandles } from '../../hooks/useStockDetail'
import { isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useWatchlist } from '../../hooks/useWatchlist'

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

function WatchlistButton({ watching, onClick, full }) {
  return (
    <div
      onClick={onClick}
      style={{ height: 48, padding: '0 16px', border: `1px solid ${watching ? C.ame200 : C.ink200}`, borderRadius: 4, background: watching ? C.ame50 : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 14, fontWeight: 600, color: watching ? C.ame600 : C.ink500, cursor: 'pointer', flexShrink: 0, width: full ? '100%' : undefined, transition: 'all 0.12s' }}
    >
      {watching ? 'Watching' : '+ Watchlist'}
    </div>
  )
}

function SellButton({ ticker, navigate, full }) {
  return (
    <div onClick={() => navigate(`/sell/${ticker}`)} style={{ height: 48, padding: '0 16px', border: `1px solid ${C.red}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontSize: 15, fontWeight: 600, color: C.red, cursor: 'pointer', flexShrink: 0, width: full ? '100%' : undefined }}>
      Sell
    </div>
  )
}

function PositionCard({ position }) {
  return (
    <div style={{ padding: '14px 16px', background: C.ame50, border: `1px solid ${C.ame100}`, borderRadius: 8 }}>
      <Eyebrow>Your position</Eyebrow>
      <div style={{ fontFamily: SANS, fontSize: 14, color: C.ink700, marginTop: 6 }}>
        {parseFloat(position.total_qty)} shares · avg ${parseFloat(position.average_cost_basis).toFixed(2)}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 14, color: position.pos ? C.aqua600 : C.red, marginTop: 2 }}>
        {position.pos ? '+' : '−'}${Math.abs(position.pnl).toFixed(2)} ({position.pos ? '+' : '−'}{Math.abs(position.pct).toFixed(1)}%)
      </div>
    </div>
  )
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
    ['Market cap', fmtMktCap(s.marketCap),                                                  C.ink700],
    ['P/E',        s.peRatio       ? s.peRatio.toFixed(1)                     : '—',        C.ame600],
    ['EPS',        s.eps           ? `$${s.eps.toFixed(2)}`                   : '—',        C.aqua600],
    ['Beta',       s.beta          ? s.beta.toFixed(2)                        : '—',        C.gold],
    ['Div yield',  s.dividendYield ? `${(s.dividendYield * 100).toFixed(2)}%` : '—',        C.ink900],
  ] : []

  const stats = s ? [
    ['52W range',  s.week52Low && s.week52High ? `$${s.week52Low.toFixed(0)} – $${s.week52High.toFixed(0)}` : '—'],
    ['Volume',     fmtVol(s.volume)],
    ['Avg volume', fmtVol(s.avgVolume)],
    ['Exchange',   s.exchange ?? '—'],
  ] : []

  const priceBlock = (
    <div>
      <div onClick={() => navigate('/markets')} style={{ fontFamily: SANS, fontSize: 13, color: C.ame400, cursor: 'pointer', marginBottom: 10 }}>← Markets</div>
      <div style={{ fontFamily: SANS, fontSize: 14, color: C.ink400, marginBottom: 4 }}>
        {isLoading ? '…' : `${s?.name ?? ticker} · ${s?.exchange ?? '—'}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: mobile ? 40 : 48, color: C.ink900, letterSpacing: '-0.025em', lineHeight: 1 }}>
          {isLoading ? '…' : s?.price ? `$${s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </div>
        <div style={{ fontFamily: SANS, fontSize: mobile ? 15 : 18, color: s?.pos ? C.aqua600 : C.red }}>
          {s ? `${s.pos ? '+' : ''}${s.change?.toFixed(2)} (${s.pos ? '+' : ''}${s.pct?.toFixed(1)}%)${mobile ? ' today' : ''}` : '—'}
        </div>
      </div>
    </div>
  )

  const fundamentalsGrid = fundamentals.length > 0 && (
    <div>
      <div style={{ marginBottom: 12 }}><Eyebrow>Fundamentals</Eyebrow></div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 12 }}>
        {fundamentals.map(([label, value, color]) => (
          <div key={label} style={{ background: C.white, border: `1px solid ${C.ink100}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.ink400, marginBottom: 4 }}><TermUnderline>{label}</TermUnderline></div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: mobile ? 17 : 20, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )

  const chartCard = (
    <div style={{ background: C.white, border: `1px solid ${C.ink100}`, borderRadius: 8, padding: mobile ? '12px 10px 6px' : '20px 20px 8px' }}>
      <ChartPanel height={mobile ? 150 : 300} candles={candles} isLoading={candlesLoading} isError={candlesError} range={activeRange} onRangeChange={setActiveRange} />
    </div>
  )

  const statsGrid = stats.length > 0 && (
    <div>
      <div style={{ marginBottom: 12 }}><Eyebrow>Key stats</Eyebrow></div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map(([label, value]) => (
          <div key={label} style={{ background: C.white, border: `1px solid ${C.ink100}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontFamily: SANS, fontSize: 12, color: C.ink400, marginBottom: 4 }}><TermUnderline>{label}</TermUnderline></div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: mobile ? 17 : 20, color: C.ink900 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Mobile: single column + fixed action bar ────────────────────────────────
  if (mobile) {
    const footer = (
      <div style={{ background: C.white, borderTop: `1px solid ${C.ink100}`, padding: '12px 16px', display: 'flex', gap: 8 }}>
        <WatchlistButton watching={watching} onClick={toggleWatch} />
        <div style={{ flex: 1 }}><CTA label={`Buy ${ticker}`} full onClick={() => navigate(`/buy/${ticker}`)} /></div>
        {position && <SellButton ticker={ticker} navigate={navigate} />}
      </div>
    )
    return (
      <AppShell active="markets" footer={footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {priceBlock}
          {chartCard}
          {fundamentalsGrid}
          {statsGrid}
        </div>

        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 28 }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, color: C.ink900 }}>Trade {ticker}</div>
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
