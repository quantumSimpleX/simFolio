import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getCachedQuotes, persistQuotes, getStoredFundamentals } from '../lib/marketCache'

const TD_KEY  = import.meta.env.VITE_TWELVEDATA_API_KEY
const TD_BASE = 'https://api.twelvedata.com'

// Fetches fundamentals for the given tickers from the edge function (Yahoo
// quoteSummary, server-side — free, no CORS, no rate limit) and writes them to
// the DB cache. Runs in the background; patches React Query caches when done so
// the UI fills in without a refetch. One edge call covers all tickers at once.
async function backgroundEnrichFundamentals(tickers, queryClient) {
  if (!tickers.length) return
  console.log('[Quotes] Fetching fundamentals via edge function:', tickers.join(', '))

  let rows
  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { fundamentals: true, symbols: tickers },
    })
    if (error) { console.warn('[Quotes] Fundamentals edge call failed:', error.message); return }
    rows = data?.fundamentals ?? []
  } catch (e) {
    console.warn('[Quotes] Fundamentals edge call threw:', e)
    return
  }

  // The edge function already persisted these to the DB cache (service role).
  // Here we only patch the in-memory React Query caches for instant UI update.
  const map = {}
  for (const f of rows) {
    if (f.marketCap > 0 || f.peRatio > 0) {
      map[f.ticker] = {
        marketCap: f.marketCap, peRatio: f.peRatio, eps: f.eps,
        beta: f.beta, dividendYield: f.dividendYield,
      }
    }
  }
  const got = Object.keys(map)
  if (!got.length) { console.warn('[Quotes] No fundamentals returned for:', tickers.join(', ')); return }

  if (queryClient) {
    queryClient.setQueriesData({ predicate: q => q.queryKey[0] === 'quotes' }, old => {
      if (!Array.isArray(old)) return old
      return old.map(q => map[q.ticker] ? { ...q, ...map[q.ticker] } : q)
    })
    got.forEach(t => queryClient.setQueryData(['stock-detail', t], old =>
      old ? { ...old, ...map[t] } : old
    ))
  }
}

// NYSE full-day holidays, 2026 — must match supabase/functions/_shared/execution.ts
const MARKET_HOLIDAYS = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
])

export function isMarketOpen() {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = et.getDay()
  if (day === 0 || day === 6) return false
  const iso = `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, '0')}-${String(et.getDate()).padStart(2, '0')}`
  if (MARKET_HOLIDAYS.has(iso)) return false
  const h = et.getHours(), m = et.getMinutes()
  const mins = h * 60 + m
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}

function parseQuote(ticker, q) {
  const price = parseFloat(q.close), prev = parseFloat(q.previous_close)
  const change = price - prev, pct = prev > 0 ? (change / prev) * 100 : 0
  const fw = q.fifty_two_week ?? {}
  return {
    ticker, price, change, pct,
    high:      parseFloat(q.high),
    low:       parseFloat(q.low),
    open:      parseFloat(q.open),
    prev,
    pos:       change >= 0,
    name:      q.name || null,
    exchange:  q.exchange ?? '',
    volume:    parseInt(q.volume)         || 0,
    avgVolume: parseInt(q.average_volume) || 0,
    week52Low:  parseFloat(fw.low)  || 0,
    week52High: parseFloat(fw.high) || 0,
    // fundamentals come from /statistics, not /quote
    marketCap: 0, peRatio: 0, eps: 0, beta: 0, dividendYield: 0,
    fetchedAt: Date.now(),
  }
}

async function fetchFromAPI(symbols) {
  if (TD_KEY) {
    try {
      const r = await fetch(`${TD_BASE}/quote?symbol=${symbols.join(',')}&apikey=${TD_KEY}`).then(r => r.json())
      if (r.code !== 429 && r.status !== 'error' && !(r.code >= 400)) {
        const entries = symbols.length === 1 ? [[symbols[0], r]] : Object.entries(r)
        return entries
          .filter(([, q]) => q && typeof q === 'object' && q.close)
          .map(([ticker, q]) => parseQuote(ticker, q))
      }
      console.warn('[Quotes] TD rate limited or error — falling back to edge function')
    } catch {
      console.warn('[Quotes] TD fetch failed — falling back to edge function')
    }
  }
  // Edge function fallback (Yahoo Finance, server-side)
  const { data, error } = await supabase.functions.invoke('market-data', { body: { symbols } })
  if (error) throw error
  return data.quotes
}

// Exported so useMarketDataPreload can reuse the same cache-aware path.
// queryClient is optional — pass it to get live UI updates as background stats arrive.
// persist=false → display-only: fetch for the UI but never write to the DB cache or
// enrich fundamentals (used for transient search results the user hasn't opened).
export async function fetchQuotes(symbols, queryClient = null, { persist = true } = {}) {
  const { hits, misses } = await getCachedQuotes(symbols)
  let all = hits

  if (misses.length) {
    let fresh = null
    try {
      fresh = await fetchFromAPI(misses)
    } catch (e) {
      console.warn('[Quotes] Live fetch failed — falling back to stale cache:', e.message ?? e)
    }
    if (fresh) {
      if (persist) {
        await persistQuotes(fresh)  // price/volume/52W stored; fundamentals preserved if already in DB
        const preserved = await getStoredFundamentals(misses)
        all = [...hits, ...fresh.map(q => preserved[q.ticker] ? { ...q, ...preserved[q.ticker] } : q)]
      } else {
        all = [...hits, ...fresh]
      }
    } else {
      // Live APIs unreachable (rate limit / no session) — stale data beats a blank page.
      const { hits: stale } = await getCachedQuotes(misses, { maxAgeMs: Infinity })
      all = [...hits, ...stale]
    }
  }

  // Background fundamentals enrichment writes to the cache — only for the persisted path.
  if (persist) {
    const needsFund = all.filter(q => !q.marketCap || !q.beta).map(q => q.ticker)
    if (needsFund.length) {
      backgroundEnrichFundamentals(needsFund, queryClient).catch(() => {})
    }
  }

  return all
}

export function useQuotes(symbols, { persist = true } = {}) {
  const open = isMarketOpen()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: persist ? ['quotes', symbols?.join(',')] : ['quotes-display', symbols?.join(',')],
    queryFn: () => fetchQuotes(symbols, queryClient, { persist }),
    enabled: !!symbols?.length,
    refetchInterval: open && persist ? 5 * 60_000 : false,
    staleTime: open ? 5 * 60_000 : 60 * 60_000,
  })
}
