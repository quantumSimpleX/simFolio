import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { Eyebrow, MktStatus, TermUnderline } from '../../components/Primitives'
import { WatchRow } from '../../components/WatchRow'
import { SearchResultRow } from '../../components/SearchResultRow'
import { AppShell } from '../../components/AppShell'
import { HeroSidebar } from '../../components/HeroSidebar'
import { PageHeader } from '../../components/Nav'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { useQuotes, isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useWatchlist } from '../../hooks/useWatchlist'
import { useSymbolSearch } from '../../hooks/useSymbolSearch'
import { INDEX_SYMBOLS } from '../../hooks/useMarketDataPreload'

const INDEX_NAMES = { SPY: 'S&P 500', QQQ: 'NASDAQ', DIA: 'DOW' }

const STALE_AFTER_MS = 60 * 60 * 1000 // 1h

// A quote is "stale" when its cache row was fetched over an hour ago. Requires the
// quote to carry a `fetchedAt` timestamp (ISO string or epoch ms); absent that, we
// can't judge age and render no badge.
function isStaleQuote(q) {
  if (!q?.fetchedAt) return false
  const t = typeof q.fetchedAt === 'number' ? q.fetchedAt : Date.parse(q.fetchedAt)
  return Number.isFinite(t) && Date.now() - t > STALE_AFTER_MS
}

export default function Markets() {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const [search, setSearch] = useState('')
  const searchInputRef = useRef(null)
  const { positions } = usePortfolio()
  const { watchlist, addToWatchlist, removeFromWatchlist, isWatching } = useWatchlist()
  const marketOpen = isMarketOpen()

  const ownedTickers = new Set(positions.map(p => p.ticker))
  const query = search.trim().toUpperCase()
  const rawSearchResults = useSymbolSearch(search.trim())
  // Some providers return the same ticker twice (e.g. AAPD on an "AAPL" query) —
  // keep only the first occurrence of each symbol so the dropdown has no dupes.
  const searchResults = rawSearchResults.filter((r, i, arr) => arr.findIndex(x => x.symbol === r.symbol) === i)
  const showDropdown = query.length > 0

  // Indices + watchlist are intentional holdings → cached. Search results are
  // transient and fetched display-only (never written) until the user opens one.
  const stableSymbols = [...new Set([...INDEX_SYMBOLS, ...watchlist])]
  const searchSymbols = searchResults.map(r => r.symbol).filter(s => !stableSymbols.includes(s))
  const { data: stableQuotes } = useQuotes(stableSymbols)
  const { data: searchQuotes } = useQuotes(searchSymbols, { persist: false })
  const quoteMap = Object.fromEntries([...(stableQuotes ?? []), ...(searchQuotes ?? [])].map(q => [q.ticker, q]))

  return (
    <AppShell active="markets" maxWidth={mobile ? 1100 : 1280}>
      <div className={cn(!mobile && 'flex items-start gap-8')}>
        <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader title="Markets" right={<MktStatus open={marketOpen} />} />

      {/* Search */}
      <div className="relative mb-6 max-w-[560px]">
        <div className={cn('flex h-11 items-center gap-2.5 rounded-input border bg-white px-3.5', search ? 'border-ame-400' : 'border-ink-200')}>
          <div className="font-sans text-lg text-ink-300">⌕</div>
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query) { const dest = searchResults[0]?.symbol ?? query; navigate(`/stock/${dest}`); setSearch('') } }}
            placeholder="Search ticker or company name…"
            className="min-w-0 flex-1 border-none bg-transparent font-sans text-[15px] text-ink-900 outline-none"
          />
          {search && <div onClick={() => setSearch('')} className="cursor-pointer font-sans text-lg text-ink-300">×</div>}
        </div>

        {showDropdown && (
          <div className="absolute inset-x-0 top-[52px] z-20 overflow-hidden rounded-input border border-ink-100 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
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
              <div className="p-3 font-sans text-[13px] text-ink-400">
                No results for "{search.trim()}"
              </div>
            )}
            {searchResults.length === 0 && query.length <= 6 && (
              <>
                <div className="border-t border-ink-100" />
                {isWatching(query) ? (
                  <div onClick={() => { removeFromWatchlist(query); setSearch('') }} className="cursor-pointer border-b border-ink-50 px-3 py-2.5 font-sans text-[13px] font-semibold text-red">
                    Remove {query} from watchlist
                  </div>
                ) : (
                  <div onClick={() => { addToWatchlist(query); setSearch('') }} className="cursor-pointer border-b border-ink-50 px-3 py-2.5 font-sans text-[13px] font-semibold text-ame-400">
                    + Add {query} to watchlist
                  </div>
                )}
                <div onClick={() => { navigate(`/stock/${query}`); setSearch('') }} className="cursor-pointer px-3 py-2.5 font-sans text-[13px] text-ink-500">
                  Go to {query} →
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Indices — fluid grid */}
      <div className="mb-2"><Eyebrow><TermUnderline>Major indices</TermUnderline></Eyebrow></div>
      <div className="mb-7 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {INDEX_SYMBOLS.map(sym => {
          const q = quoteMap[sym]
          return (
            <div key={sym} className="rounded-card border border-ink-100 bg-white px-4 py-3">
              <Eyebrow>{INDEX_NAMES[sym]}</Eyebrow>
              <div className="mt-1 flex items-center gap-2">
                <div className="font-sans text-xl font-bold text-ink-900">
                  {q ? `$${q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                </div>
                {isStaleQuote(q) && (
                  <span
                    title="Data may be outdated"
                    className="rounded-pill border border-gold/30 bg-goldBg px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-gold"
                  >
                    stale
                  </span>
                )}
              </div>
              <div className={cn('mt-0.5 font-sans text-[13px]', q?.pos ? 'text-aqua-600' : 'text-red')}>
                {q ? `${q.pos ? '+' : ''}${q.pct?.toFixed(2)}%` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Watchlist — single column on mobile, two columns on wider screens */}
      <div className="mb-1"><Eyebrow><TermUnderline>Watchlist</TermUnderline></Eyebrow></div>
      {watchlist.length === 0 ? (
        <button
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          className="py-5 text-left font-sans text-sm text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ame-400"
        >
          Search above to add stocks to your watchlist.
        </button>
      ) : (
        <div className={cn('grid gap-x-8', mobile ? 'grid-cols-1' : 'grid-cols-2')}>
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

        {!mobile && <HeroSidebar />}
      </div>
    </AppShell>
  )
}
