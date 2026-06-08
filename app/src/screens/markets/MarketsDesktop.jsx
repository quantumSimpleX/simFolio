import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, SANS } from '../../tokens'
import { Eyebrow, MktStatus } from '../../components/Primitives'
import { TopNav } from '../../components/Nav'
import { useQuotes, isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useWatchlist } from '../../hooks/useWatchlist'
import { useSymbolSearch } from '../../hooks/useSymbolSearch'
import { INDEX_SYMBOLS } from '../../hooks/useMarketDataPreload'

const INDEX_NAMES = { SPY:'S&P 500', QQQ:'NASDAQ', DIA:'DOW' }

function fmtPrice(v) { return `$${v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}` }

function WatchRow({ sym, q, owned, onClick }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:`1px solid ${C.ink100}`, cursor:'pointer' }}>
      <div style={{ width:38, height:38, background:C.ink50, borderRadius:4, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:11, color:C.ink500 }}>{sym}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ fontFamily:SANS, fontWeight:600, fontSize:14, color:C.ink900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q?.name || sym}</div>
          {owned && <div style={{ padding:'1px 6px', background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:3, fontFamily:SANS, fontSize:10, color:C.ame600, fontWeight:600, flexShrink:0 }}>Owned</div>}
        </div>
        <div style={{ fontFamily:SANS, fontSize:11, color:C.ink400, marginTop:1 }}>{sym}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontFamily:SANS, fontWeight:600, fontSize:14, color:C.ink900 }}>{q ? fmtPrice(q.price) : '—'}</div>
        <div style={{ fontFamily:SANS, fontSize:12, color:q?.pos?C.aqua600:C.red, marginTop:1 }}>
          {q ? `${q.pos?'+':''}${q.change?.toFixed(2)} (${q.pos?'+':''}${q.pct?.toFixed(1)}%)` : '—'}
        </div>
      </div>
    </div>
  )
}

function SearchResultRow({ r, q, watching, onClick }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 10px', borderTop:`1px solid ${C.ink100}`, cursor:'pointer' }}>
      <div style={{ width:38, height:38, background:C.ink50, borderRadius:4, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:11, color:C.ink500 }}>{r.symbol}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ fontFamily:SANS, fontWeight:600, fontSize:14, color:C.ink900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.instrument_name}</div>
          {watching && <div style={{ padding:'1px 5px', background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:3, fontFamily:SANS, fontSize:10, color:C.ame600, fontWeight:600, flexShrink:0 }}>Watching</div>}
        </div>
        <div style={{ fontFamily:SANS, fontSize:11, color:C.ink400, marginTop:1 }}>{r.exchange ?? r.type}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontFamily:SANS, fontWeight:600, fontSize:14, color:C.ink900 }}>{q ? fmtPrice(q.price) : '—'}</div>
        <div style={{ fontFamily:SANS, fontSize:12, color:q?.pos?C.aqua600:C.red, marginTop:1 }}>
          {q ? `${q.pos?'+':''}${q.pct?.toFixed(1)}%` : '—'}
        </div>
      </div>
    </div>
  )
}

export default function MarketsDesktop() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const marketOpen = isMarketOpen()
  const { positions } = usePortfolio()
  const { watchlist, addToWatchlist, removeFromWatchlist, isWatching } = useWatchlist()

  const ownedTickers = new Set(positions.map(p => p.ticker))
  const query = search.trim().toUpperCase()
  const searchResults = useSymbolSearch(search.trim())
  const showDropdown = query.length > 0

  const allSymbols = [...new Set([...INDEX_SYMBOLS, ...watchlist, ...searchResults.map(r => r.symbol)])]
  const { data: quotes } = useQuotes(allSymbols)
  const quoteMap = Object.fromEntries((quotes ?? []).map(q => [q.ticker, q]))

  return (
    <div style={{ width:1440, minHeight:900, background:C.paper, display:'flex', flexDirection:'column' }}>
      <TopNav active="markets"/>

      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        {/* Left sidebar */}
        <div style={{ width:280, borderRight:`1px solid ${C.ink100}`, padding:'24px 28px', display:'flex', flexDirection:'column', gap:20, overflowY:'auto' }}>
          {/* Search */}
          <div style={{ position:'relative' }}>
            <div style={{ height:40, background:C.white, border:`1px solid ${search ? C.ame400 : C.ink200}`, borderRadius:4, display:'flex', alignItems:'center', padding:'0 12px', gap:8 }}>
              <div style={{ fontFamily:SANS, fontSize:16, color:C.ink300 }}>⌕</div>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && query) { navigate(`/stock/${query}`); setSearch('') } }}
                placeholder="Search or add…"
                style={{ flex:1, border:'none', outline:'none', fontFamily:SANS, fontSize:14, color:C.ink900, background:'transparent' }}
              />
              {search && <div onClick={() => setSearch('')} style={{ fontFamily:SANS, fontSize:16, color:C.ink300, cursor:'pointer' }}>×</div>}
            </div>
            {showDropdown && (
              <div style={{ position:'absolute', left:0, right:0, top:44, background:C.white, border:`1px solid ${C.ink100}`, borderRadius:4, boxShadow:'0 4px 12px rgba(0,0,0,0.08)', zIndex:10, overflow:'hidden' }}>
                {searchResults.map(r => (
                  <SearchResultRow
                    key={r.symbol}
                    r={r}
                    q={quoteMap[r.symbol]}
                    watching={isWatching(r.symbol)}
                    onClick={() => { navigate(`/stock/${r.symbol}`); setSearch('') }}
                  />
                ))}
                {searchResults.length > 0 && <div style={{ borderTop:`1px solid ${C.ink100}` }}/>}
                {isWatching(query) ? (
                  <div onClick={() => { removeFromWatchlist(query); setSearch('') }} style={{ padding:'8px 10px', fontFamily:SANS, fontSize:13, color:C.red, cursor:'pointer', fontWeight:600, borderBottom:`1px solid ${C.ink50}` }}>
                    Remove {query} from watchlist
                  </div>
                ) : (
                  <div onClick={() => { addToWatchlist(query); setSearch('') }} style={{ padding:'8px 10px', fontFamily:SANS, fontSize:13, color:C.ame400, cursor:'pointer', fontWeight:600, borderBottom:`1px solid ${C.ink50}` }}>
                    + Add {query} to watchlist
                  </div>
                )}
                <div onClick={() => { navigate(`/stock/${query}`); setSearch('') }} style={{ padding:'8px 10px', fontFamily:SANS, fontSize:13, color:C.ink500, cursor:'pointer' }}>
                  Go to {query} →
                </div>
              </div>
            )}
          </div>

          {/* Mini watchlist in sidebar */}
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:4 }}><Eyebrow>Watchlist</Eyebrow></div>
            {watchlist.slice(0, 8).map(sym => (
              <WatchRow
                key={sym}
                sym={sym}
                q={quoteMap[sym]}
                owned={ownedTickers.has(sym)}
                onClick={() => navigate(`/stock/${sym}`)}
              />
            ))}
            {watchlist.length === 0 && (
              <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400, paddingTop:12 }}>Search above to add stocks.</div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex:1, padding:'28px 40px', display:'flex', flexDirection:'column', gap:20, overflow:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Eyebrow>Major indices · live</Eyebrow>
            <MktStatus open={marketOpen}/>
          </div>

          {/* Index cards */}
          <div style={{ display:'flex', gap:14 }}>
            {INDEX_SYMBOLS.map(sym => {
              const q = quoteMap[sym]
              return (
                <div key={sym} style={{ flex:1, background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'12px 14px' }}>
                  <Eyebrow>{INDEX_NAMES[sym]}</Eyebrow>
                  <div style={{ fontFamily:SANS, fontWeight:700, fontSize:18, color:C.ink900, marginTop:4 }}>{q ? `$${q.price.toLocaleString('en-US',{maximumFractionDigits:0})}` : '—'}</div>
                  <div style={{ fontFamily:SANS, fontSize:13, color:q?.pos?C.aqua600:C.red, marginTop:2 }}>{q ? `${q.pos?'+':''}${q.pct?.toFixed(2)}%` : '—'}</div>
                </div>
              )
            })}
          </div>

          {/* Watchlist — 2-column grid */}
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:4 }}><Eyebrow>Watchlist</Eyebrow></div>
            {watchlist.length === 0 ? (
              <div style={{ fontFamily:SANS, fontSize:14, color:C.ink400, padding:'24px 0' }}>
                Use the search bar to add stocks to your watchlist.
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', columnGap:40 }}>
                {watchlist.map(sym => (
                  <WatchRow
                    key={sym}
                    sym={sym}
                    q={quoteMap[sym]}
                    owned={ownedTickers.has(sym)}
                    onClick={() => navigate(`/stock/${sym}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
