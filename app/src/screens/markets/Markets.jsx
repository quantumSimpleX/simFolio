import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, SANS } from '../../tokens'
import { Eyebrow, MktStatus } from '../../components/Primitives'
import { StockRow } from '../../components/StockRow'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/Nav'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { useQuotes, isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useWatchlist } from '../../hooks/useWatchlist'
import { useSymbolSearch } from '../../hooks/useSymbolSearch'
import { INDEX_SYMBOLS } from '../../hooks/useMarketDataPreload'

const INDEX_NAMES = { SPY: 'S&P 500', QQQ: 'NASDAQ', DIA: 'DOW' }

function fmtPrice(v) { return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

function fmtMktCap(v) {
  if (!v) return null
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return null
}

function Fundamentals({ q }) {
  if (!q) return '—'
  const cap = fmtMktCap(q.marketCap)
  const metrics = [
    cap            ? { label: null,  value: cap,                  color: C.ink700  } : null,
    q.peRatio > 0  ? { label: 'P/E', value: q.peRatio.toFixed(1), color: C.ame600  } : null,
    q.eps          ? { label: 'EPS', value: q.eps.toFixed(2),     color: C.aqua600 } : null,
    q.beta         ? { label: 'β',   value: q.beta.toFixed(2),    color: C.gold    } : null,
  ].filter(Boolean)
  if (!metrics.length) return '—'
  return metrics.map((m, i) => (
    <span key={m.label ?? 'cap'}>
      {i > 0 && <span style={{ color: C.ink200, margin: '0 2px' }}>·</span>}
      {m.label && <span style={{ color: C.ink400 }}>{m.label}:</span>}
      <span style={{ color: m.color, fontWeight: 600 }}>{m.value}</span>
    </span>
  ))
}

function WatchRow({ sym, q, owned, onClick }) {
  return (
    <StockRow
      ticker={sym}
      name={q?.name}
      subtitle={<Fundamentals q={q} />}
      badge={owned && <div style={{ padding: '1px 6px', background: C.ame50, border: `1px solid ${C.ame100}`, borderRadius: 3, fontFamily: SANS, fontSize: 10, color: C.ame600, fontWeight: 600, flexShrink: 0 }}>Owned</div>}
      rightTop={q ? fmtPrice(q.price) : '—'}
      rightBottom={q ? `${q.pos ? '+' : ''}${q.change?.toFixed(2)} (${q.pos ? '+' : ''}${q.pct?.toFixed(1)}%)` : '—'}
      rightBottomPos={q ? !!q.pos : null}
      onClick={onClick}
    />
  )
}

function SearchResultRow({ r, q, watching, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderTop: `1px solid ${C.ink100}`, cursor: 'pointer' }}>
      <div style={{ width: 38, height: 38, background: C.ink50, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 11, color: C.ink500 }}>{r.symbol}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: C.ink900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.instrument_name}</div>
          {watching && <div style={{ padding: '1px 5px', background: C.ame50, border: `1px solid ${C.ame100}`, borderRadius: 3, fontFamily: SANS, fontSize: 10, color: C.ame600, fontWeight: 600, flexShrink: 0 }}>Watching</div>}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 11, color: C.ink400, marginTop: 1 }}>{r.exchange ?? r.type}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, color: C.ink900 }}>{q ? fmtPrice(q.price) : '—'}</div>
        <div style={{ fontFamily: SANS, fontSize: 12, color: q?.pos ? C.aqua600 : C.red, marginTop: 1 }}>
          {q ? `${q.pos ? '+' : ''}${q.pct?.toFixed(1)}%` : '—'}
        </div>
      </div>
    </div>
  )
}

export default function Markets() {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const [search, setSearch] = useState('')
  const { positions } = usePortfolio()
  const { watchlist, addToWatchlist, removeFromWatchlist, isWatching } = useWatchlist()
  const marketOpen = isMarketOpen()

  const ownedTickers = new Set(positions.map(p => p.ticker))
  const query = search.trim().toUpperCase()
  const searchResults = useSymbolSearch(search.trim())
  const showDropdown = query.length > 0

  // Indices + watchlist are intentional holdings → cached. Search results are
  // transient and fetched display-only (never written) until the user opens one.
  const stableSymbols = [...new Set([...INDEX_SYMBOLS, ...watchlist])]
  const searchSymbols = searchResults.map(r => r.symbol).filter(s => !stableSymbols.includes(s))
  const { data: stableQuotes } = useQuotes(stableSymbols)
  const { data: searchQuotes } = useQuotes(searchSymbols, { persist: false })
  const quoteMap = Object.fromEntries([...(stableQuotes ?? []), ...(searchQuotes ?? [])].map(q => [q.ticker, q]))

  return (
    <AppShell active="markets">
      <PageHeader title="Markets" right={<MktStatus open={marketOpen} />} />

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 560, marginBottom: 24 }}>
        <div style={{ height: 44, background: C.white, border: `1px solid ${search ? C.ame400 : C.ink200}`, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10 }}>
          <div style={{ fontFamily: SANS, fontSize: 18, color: C.ink300 }}>⌕</div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query) { const dest = searchResults[0]?.symbol ?? query; navigate(`/stock/${dest}`); setSearch('') } }}
            placeholder="Search ticker or company name…"
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: SANS, fontSize: 15, color: C.ink900, background: 'transparent', minWidth: 0 }}
          />
          {search && <div onClick={() => setSearch('')} style={{ fontFamily: SANS, fontSize: 18, color: C.ink300, cursor: 'pointer' }}>×</div>}
        </div>

        {showDropdown && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 52, background: C.white, border: `1px solid ${C.ink100}`, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 20, overflow: 'hidden' }}>
            {searchResults.map(r => (
              <SearchResultRow
                key={r.symbol}
                r={r}
                q={quoteMap[r.symbol]}
                watching={isWatching(r.symbol)}
                onClick={() => { navigate(`/stock/${r.symbol}`); setSearch('') }}
              />
            ))}
            {searchResults.length === 0 && (
              <div style={{ padding: '12px', fontFamily: SANS, fontSize: 13, color: C.ink400 }}>
                No results for "{search.trim()}"
              </div>
            )}
            {searchResults.length === 0 && query.length <= 6 && (
              <>
                <div style={{ borderTop: `1px solid ${C.ink100}` }} />
                {isWatching(query) ? (
                  <div onClick={() => { removeFromWatchlist(query); setSearch('') }} style={{ padding: '10px 12px', fontFamily: SANS, fontSize: 13, color: C.red, cursor: 'pointer', fontWeight: 600, borderBottom: `1px solid ${C.ink50}` }}>
                    Remove {query} from watchlist
                  </div>
                ) : (
                  <div onClick={() => { addToWatchlist(query); setSearch('') }} style={{ padding: '10px 12px', fontFamily: SANS, fontSize: 13, color: C.ame400, cursor: 'pointer', fontWeight: 600, borderBottom: `1px solid ${C.ink50}` }}>
                    + Add {query} to watchlist
                  </div>
                )}
                <div onClick={() => { navigate(`/stock/${query}`); setSearch('') }} style={{ padding: '10px 12px', fontFamily: SANS, fontSize: 13, color: C.ink500, cursor: 'pointer' }}>
                  Go to {query} →
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Indices — fluid grid */}
      <div style={{ marginBottom: 8 }}><Eyebrow>Major indices</Eyebrow></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        {INDEX_SYMBOLS.map(sym => {
          const q = quoteMap[sym]
          return (
            <div key={sym} style={{ background: C.white, border: `1px solid ${C.ink100}`, borderRadius: 8, padding: '12px 16px' }}>
              <Eyebrow>{INDEX_NAMES[sym]}</Eyebrow>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, color: C.ink900, marginTop: 4 }}>
                {q ? `$${q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: q?.pos ? C.aqua600 : C.red, marginTop: 2 }}>
                {q ? `${q.pos ? '+' : ''}${q.pct?.toFixed(2)}%` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Watchlist — single column on mobile, two columns on wider screens */}
      <div style={{ marginBottom: 4 }}><Eyebrow>Watchlist</Eyebrow></div>
      {watchlist.length === 0 ? (
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.ink400, padding: '20px 0' }}>
          Search above to add stocks to your watchlist.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2, 1fr)', columnGap: 32 }}>
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
    </AppShell>
  )
}
