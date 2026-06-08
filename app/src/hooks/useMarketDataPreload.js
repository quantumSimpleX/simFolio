import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isMarketOpen } from './useQuotes'

const TD_KEY  = import.meta.env.VITE_TWELVEDATA_API_KEY
const TD_BASE = 'https://api.twelvedata.com'

// Single source of truth for symbols — imported by markets pages to ensure cache keys match
export const INDEX_SYMBOLS    = ['SPY', 'QQQ', 'DIA']
export const WATCHLIST_SYMBOLS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN']
export const PRELOAD_SYMBOLS  = [...INDEX_SYMBOLS, ...WATCHLIST_SYMBOLS] // 8 total — within free tier limit

function parseQuote(ticker, q) {
  if (!q?.close) return null
  const price = parseFloat(q.close), prev = parseFloat(q.previous_close)
  const change = price - prev, pct = prev > 0 ? (change / prev) * 100 : 0
  return {
    ticker, price, change, pct,
    high: parseFloat(q.high), low: parseFloat(q.low),
    open: parseFloat(q.open), prev,
    pos: change >= 0,
    name: q.name ?? ticker, exchange: q.exchange ?? '',
    industry: '', marketCap: 0, logo: '',
  }
}

export function useMarketDataPreload() {
  const queryClient = useQueryClient()
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current || !TD_KEY) return
    fetched.current = true

    async function preload() {
      try {
        const r = await fetch(`${TD_BASE}/quote?symbol=${PRELOAD_SYMBOLS.join(',')}&apikey=${TD_KEY}`)
          .then(res => res.json())

        if (r.code === 429) { console.warn('Market preload: rate limited'); return }
        if (r.status === 'error') { console.warn('Market preload error:', r.message); return }

        // Twelve Data returns { AAPL: {...}, MSFT: {...} } for multiple symbols
        const quotes = Object.entries(r)
          .map(([ticker, q]) => parseQuote(ticker, q))
          .filter(Boolean)

        const now = Date.now()
        const staleMs = isMarketOpen() ? 5 * 60_000 : 60 * 60_000

        // Seed batch cache — used by markets page useQuotes(PRELOAD_SYMBOLS)
        queryClient.setQueryData(['quotes', PRELOAD_SYMBOLS.join(',')], quotes, { updatedAt: now })

        // Seed individual stock-detail caches — used by stock detail + buy screens
        quotes.forEach(q => {
          queryClient.setQueryData(['stock-detail', q.ticker], q, { updatedAt: now })
        })

        // Schedule one auto-refresh after staleMs
        setTimeout(() => { fetched.current = false }, staleMs)
      } catch (e) {
        console.warn('Market preload failed:', e)
        fetched.current = false
      }
    }

    preload()
  }, [queryClient])
}
