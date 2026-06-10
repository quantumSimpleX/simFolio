import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { C, SANS, DISPLAY } from '../../tokens'

function fmtMktCap(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return '—'
}
import { StatusBar, CTA, Eyebrow, TermUnderline, MktStatus } from '../../components/Primitives'
import { TopNav, BackHeader } from '../../components/Nav'
import { ChartPanel } from '../../components/Charts'
import { useStockDetail, useCandles } from '../../hooks/useStockDetail'
import { isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useWatchlist } from '../../hooks/useWatchlist'

export default function StockDetail() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const [activeRange, setActiveRange] = useState('All')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const { data: s, isLoading } = useStockDetail(ticker)
  const { data: candles, isLoading: candlesLoading, isError: candlesError } = useCandles(ticker, activeRange)
  const { positions } = usePortfolio()
  const marketOpen = isMarketOpen()
  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist()

  const position = positions.find(p => p.ticker === ticker)
  const watching = isWatching(ticker)

  function fmtVol(v) {
    if (!v) return '—'
    if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
    return v.toString()
  }

  const stats = s ? [
    ['Market cap',   fmtMktCap(s.marketCap)],
    ['P/E ratio',    s.peRatio       ? s.peRatio.toFixed(1)                  : '—'],
    ['EPS (TTM)',    s.eps           ? `$${s.eps.toFixed(2)}`                : '—'],
    ['Beta',         s.beta          ? s.beta.toFixed(2)                     : '—'],
    ['Div. yield',   s.dividendYield ? `${(s.dividendYield * 100).toFixed(2)}%` : '—'],
    ['52W range',    s.week52Low && s.week52High ? `$${s.week52Low.toFixed(0)} – $${s.week52High.toFixed(0)}` : '—'],
    ['Volume',       fmtVol(s.volume)],
    ['Avg volume',   fmtVol(s.avgVolume)],
    ['Exchange',     s.exchange ?? '—'],
  ] : []

  if (!isMobile) return <StockDetailDesktop ticker={ticker} s={s} isLoading={isLoading} candles={candles} candlesLoading={candlesLoading} candlesError={candlesError} activeRange={activeRange} setActiveRange={setActiveRange} navigate={navigate} stats={stats} marketOpen={marketOpen} position={position} watching={watching} onToggleWatch={() => watching ? removeFromWatchlist(ticker) : addToWatchlist(ticker)}/>

  return (
    <div style={{ width:390, minHeight:844, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar/>
      <BackHeader title={ticker} right={<MktStatus open={marketOpen}/>}/>

      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ padding:'16px 24px', background:C.white, borderBottom:`1px solid ${C.ink100}` }}>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400, marginBottom:4 }}>
            {isLoading ? '…' : `${s?.name ?? ticker} · ${s?.exchange ?? '—'}`}
          </div>
          <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:38, color:C.ink900, letterSpacing:'-0.025em', lineHeight:1 }}>
            {isLoading ? '…' : s?.price ? `$${s.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—'}
          </div>
          <div style={{ fontFamily:SANS, fontSize:14, color:s?.pos?C.aqua600:C.red, marginTop:4 }}>
            {s ? `${s.pos?'+':''}${s.change?.toFixed(2)} (${s.pos?'+':''}${s.pct?.toFixed(1)}%) today` : '—'}
          </div>
        </div>

        <div style={{ padding:'16px 24px 0', background:C.white }}>
          <ChartPanel height={220} candles={candles} isLoading={candlesLoading} isError={candlesError} range={activeRange} onRangeChange={setActiveRange}/>
        </div>

        {stats.length > 0 && (
          <div style={{ padding:'16px 24px' }}>
            <div style={{ marginBottom:12 }}><Eyebrow>Key stats</Eyebrow></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {stats.map(([label, value]) => (
                <div key={label} style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, marginBottom:3 }}><TermUnderline>{label}</TermUnderline></div>
                  <div style={{ fontFamily:SANS, fontWeight:700, fontSize:17, color:C.ink900 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {position && (
          <div style={{ margin:'0 24px', padding:'12px 16px', background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:8, marginBottom:16 }}>
            <Eyebrow>Your position</Eyebrow>
            <div style={{ marginTop:6, fontFamily:SANS, fontSize:14, color:C.ink700 }}>
              {parseFloat(position.total_qty)} shares · avg ${parseFloat(position.average_cost_basis).toFixed(2)} · {position.pos?'+':''}${position.pnl?.toFixed(2)} ({position.pos?'+':'−'}{Math.abs(position.pct).toFixed(1)}%)
            </div>
          </div>
        )}

        <div style={{ height:20 }}/>
      </div>

      <div style={{ padding:'12px 24px 24px', borderTop:`1px solid ${C.ink100}`, flexShrink:0, display:'flex', gap:8 }}>
        <div
          onClick={() => watching ? removeFromWatchlist(ticker) : addToWatchlist(ticker)}
          style={{ height:48, padding:'0 14px', border:`1px solid ${watching?C.ame200:C.ink200}`, borderRadius:4, background:watching?C.ame50:'transparent', display:'flex', alignItems:'center', fontFamily:SANS, fontSize:13, fontWeight:600, color:watching?C.ame600:C.ink500, cursor:'pointer', flexShrink:0, transition:'all 0.12s' }}
        >{watching ? 'Watching' : 'Watchlist'}</div>
        <div style={{ flex:1 }}><CTA label={`Buy ${ticker}`} full onClick={() => navigate(`/buy/${ticker}`)}/></div>
        {position && (
          <div onClick={() => navigate(`/sell/${ticker}`)} style={{ height:48, padding:'0 16px', border:`1px solid ${C.red}`, borderRadius:4, display:'flex', alignItems:'center', fontFamily:SANS, fontSize:15, fontWeight:600, color:C.red, cursor:'pointer', flexShrink:0 }}>Sell</div>
        )}
      </div>
    </div>
  )
}

function StockDetailDesktop({ ticker, s, isLoading, candles, candlesLoading, candlesError, activeRange, setActiveRange, navigate, stats, marketOpen, position, watching, onToggleWatch }) {
  return (
    <div style={{ width:1440, minHeight:900, background:C.paper, display:'flex', flexDirection:'column' }}>
      <TopNav active="markets"/>
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        <div style={{ flex:1, padding:'36px 48px', display:'flex', flexDirection:'column', gap:24, overflow:'auto' }}>
          <div>
            <div onClick={() => navigate('/markets')} style={{ fontFamily:SANS, fontSize:13, color:C.ame400, cursor:'pointer', marginBottom:12 }}>← Markets</div>
            <div style={{ fontFamily:SANS, fontSize:14, color:C.ink400, marginBottom:4 }}>{s?.name ?? ticker} · {s?.exchange ?? '—'}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:16 }}>
              <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:48, color:C.ink900, letterSpacing:'-0.025em', lineHeight:1 }}>
                {isLoading ? '…' : s?.price ? `$${s.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—'}
              </div>
              <div style={{ fontFamily:SANS, fontSize:18, color:s?.pos?C.aqua600:C.red }}>
                {s ? `${s.pos?'+':''}${s.change?.toFixed(2)} (${s.pos?'+':''}${s.pct?.toFixed(1)}%)` : '—'}
              </div>
            </div>
          </div>

          <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'20px 24px 8px' }}>
            <ChartPanel height={300} candles={candles} isLoading={candlesLoading} isError={candlesError} range={activeRange} onRangeChange={setActiveRange}/>
          </div>

          {stats.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {stats.map(([label, value]) => (
                <div key={label} style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'14px 18px' }}>
                  <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, marginBottom:4 }}><TermUnderline>{label}</TermUnderline></div>
                  <div style={{ fontFamily:SANS, fontWeight:700, fontSize:20, color:C.ink900 }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ width:360, borderLeft:`1px solid ${C.ink100}`, padding:'36px 32px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ fontFamily:SANS, fontWeight:700, fontSize:20, color:C.ink900 }}>Trade {ticker}</div>
          <MktStatus open={marketOpen}/>
          <CTA label={`Buy ${ticker}`} full onClick={() => navigate(`/buy/${ticker}`)}/>
          <div
            onClick={onToggleWatch}
            style={{ height:48, border:`1px solid ${watching?C.ame200:C.ink200}`, borderRadius:4, background:watching?C.ame50:'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:14, fontWeight:600, color:watching?C.ame600:C.ink500, cursor:'pointer', transition:'all 0.12s' }}
          >{watching ? 'Watching — remove' : '+ Add to watchlist'}</div>
          {position && (
            <div onClick={() => navigate(`/sell/${ticker}`)} style={{ height:48, border:`1px solid ${C.red}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:15, fontWeight:600, color:C.red, cursor:'pointer' }}>Sell {ticker}</div>
          )}
          {position && (
            <div style={{ padding:'14px 16px', background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:8 }}>
              <Eyebrow>Your position</Eyebrow>
              <div style={{ fontFamily:SANS, fontSize:14, color:C.ink700, marginTop:6 }}>
                {parseFloat(position.total_qty)} shares · avg ${parseFloat(position.average_cost_basis).toFixed(2)}
              </div>
              <div style={{ fontFamily:SANS, fontSize:14, color:position.pos?C.aqua600:C.red, marginTop:2 }}>
                {position.pos?'+':'−'}${Math.abs(position.pnl).toFixed(2)} ({position.pos?'+':'−'}{Math.abs(position.pct).toFixed(1)}%)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
