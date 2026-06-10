import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { isMarketOpen, fetchQuotes } from './useQuotes'

export const INDEX_SYMBOLS     = ['SPY', 'QQQ', 'DIA']
export const WATCHLIST_SYMBOLS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN']
export const PRELOAD_SYMBOLS   = [...INDEX_SYMBOLS, ...WATCHLIST_SYMBOLS]

// Fetches quotes (DB cache first, then API for misses) and seeds React Query caches.
async function preloadAndSeed(symbols, queryClient, seedBatchKey = false) {
  const quotes = await fetchQuotes(symbols, queryClient)
  if (!quotes.length) return

  const now = Date.now()
  if (seedBatchKey) {
    queryClient.setQueryData(['quotes', symbols.join(',')], quotes, { updatedAt: now })
  }
  quotes.forEach(q => {
    queryClient.setQueryData(['stock-detail', q.ticker], q, { updatedAt: now })
  })
}

// Pass the authenticated user so portfolio + watchlist tickers are preloaded on login.
export function useMarketDataPreload(user = null) {
  const queryClient   = useQueryClient()
  const staticFetched = useRef(false)
  const userFetchedId = useRef(null)

  // Phase 1 — static index + default watchlist symbols, runs once per stale window
  useEffect(() => {
    if (staticFetched.current) return
    staticFetched.current = true

    const staleMs = isMarketOpen() ? 5 * 60_000 : 60 * 60_000

    preloadAndSeed(PRELOAD_SYMBOLS, queryClient, true)
      .catch(e => { console.warn('[Preload] Static symbols failed:', e); staticFetched.current = false })
      .then(() => setTimeout(() => { staticFetched.current = false }, staleMs))
  }, [queryClient])

  // Phase 2 — user's portfolio + watchlist tickers, runs once per login
  useEffect(() => {
    if (!user || userFetchedId.current === user.id) return
    userFetchedId.current = user.id

    async function preloadUserData() {
      const { data: positions } = await supabase
        .from('positions')
        .select('ticker')
        .eq('user_id', user.id)

      const portfolioTickers = (positions ?? []).map(p => p.ticker)

      const watchlistTickers = (() => {
        try { return JSON.parse(localStorage.getItem('simfolio_watchlist') ?? '[]') }
        catch { return [] }
      })()

      // Only fetch tickers not already covered by the static preload
      const userTickers = [...new Set([...portfolioTickers, ...watchlistTickers])]
        .filter(t => !PRELOAD_SYMBOLS.includes(t))

      if (userTickers.length) {
        console.log('[Preload] User tickers to warm:', userTickers.join(', '))
        await preloadAndSeed(userTickers, queryClient, false)
      }
    }

    preloadUserData().catch(e => console.warn('[Preload] User data failed:', e))
  }, [user, queryClient])
}
