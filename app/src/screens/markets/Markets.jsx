import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { Eyebrow, MktStatus } from '../../components/Primitives'
import { WatchRow } from '../../components/WatchRow'
import { SearchResultRow } from '../../components/SearchResultRow'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/Nav'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { useQuotes, isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useWatchlist } from '../../hooks/useWatchlist'
import { useSymbolSearch } from '../../hooks/useSymbolSearch'
import { INDEX_SYMBOLS } from '../../hooks/useMarketDataPreload'

const INDEX_NAMES = { SPY: 'S&P 500', QQQ: 'NASDAQ', DIA: 'DOW' }

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
      <div className="relative mb-6 max-w-[560px]">
        <div className={cn('flex h-11 items-center gap-2.5 rounded-input border bg-white px-3.5', search ? 'border-ame-400' : 'border-ink-200')}>
          <div className="font-sans text-lg text-ink-300">⌕</div>
          <input
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
      <div className="mb-2"><Eyebrow>Major indices</Eyebrow></div>
      <div className="mb-7 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {INDEX_SYMBOLS.map(sym => {
          const q = quoteMap[sym]
          return (
            <div key={sym} className="rounded-card border border-ink-100 bg-white px-4 py-3">
              <Eyebrow>{INDEX_NAMES[sym]}</Eyebrow>
              <div className="mt-1 font-sans text-xl font-bold text-ink-900">
                {q ? `$${q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
              </div>
              <div className={cn('mt-0.5 font-sans text-[13px]', q?.pos ? 'text-aqua-600' : 'text-red')}>
                {q ? `${q.pos ? '+' : ''}${q.pct?.toFixed(2)}%` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Watchlist — single column on mobile, two columns on wider screens */}
      <div className="mb-1"><Eyebrow>Watchlist</Eyebrow></div>
      {watchlist.length === 0 ? (
        <div className="py-5 font-sans text-sm text-ink-400">
          Search above to add stocks to your watchlist.
        </div>
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
    </AppShell>
  )
}
