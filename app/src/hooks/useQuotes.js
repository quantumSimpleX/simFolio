import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getCachedQuotes, persistQuotes, updateFundamentals, getStoredFundamentals } from '../lib/marketCache'

const TD_KEY  = import.meta.env.VITE_TWELVEDATA_API_KEY
const TD_BASE = 'https://api.twelvedata.com'

// Fetches statistics for a single ticker. Returns null on any failure.
async function fetchOneStat(ticker) {
  // Try Twelve Data /statistics first (most complete, costs 30 credits)
  if (TD_KEY) {
    try {
      const r = await fetch(`${TD_BASE}/statistics?symbol=${ticker}&apikey=${TD_KEY}`).then(r => r.json())
      const vm = r.statistics?.valuations_metrics ?? {}
      const ss = r.statistics?.stock_price_summary ?? {}
      const fi = r.statistics?.financials?.income_statement ?? {}
      const dd = r.statistics?.dividends_and_splits ?? {}
      const cap = vm.market_capitalization
      if (cap) return {
        marketCap:     cap,
        peRatio:       vm.trailing_pe                   || 0,
        eps:           fi.diluted_eps_ttm               || 0,
        beta:          ss.beta                          || 0,
        dividendYield: dd.forward_annual_dividend_yield || 0,
      }
    } catch {}
  }
  // Fallback: edge function → Yahoo Finance (avoids browser CORS block)
  try {
    const { data, error } = await supabase.functions.invoke('market-data', { body: { symbols: [ticker] } })
    if (error) return null
    const q = data.quotes?.[0]
    if (!q?.marketCap) return null
    return {
      marketCap:     q.marketCap     || 0,
      peRatio:       q.peRatio       || 0,
      eps:           q.eps           || 0,
      beta:          q.beta          || 0,
      dividendYield: q.dividendYield || 0,
    }
  } catch {
    return null
  }
}

// Fetches fundamentals for tickers that need them, one at a time with 8-second gaps
// to stay within TD's 8-requests/minute free-tier limit. Runs in the background —
// does NOT block the quote return. React Query will pick up the DB updates on next stale
// window, or the caller can invalidate.
async function backgroundEnrichFundamentals(tickers, queryClient) {
  if (!tickers.length) return
  console.log('[Quotes] Background fundamentals fetch starting for:', tickers.join(', '))
  // TD free tier: max 8 req/min — throttle only when using TD key directly
  const INTERVAL_MS = TD_KEY ? 8_000 : 0
  for (let i = 0; i < tickers.length; i++) {
    if (i > 0 && INTERVAL_MS) await new Promise(res => setTimeout(res, INTERVAL_MS))
    const ticker = tickers[i]
    const fund = await fetchOneStat(ticker)
    if (!fund) { console.log(`[Quotes] No stats for ${ticker}`); continue }
    await updateFundamentals({ [ticker]: fund })
    console.log(`[Quotes] Fundamentals stored for ${ticker}: mktcap=${fund.marketCap}`)
    // Patch the in-memory React Query cache so the UI updates without a full refetch
    if (queryClient) {
      queryClient.setQueriesData({ predicate: q => q.queryKey[0] === 'quotes' }, old => {
        if (!Array.isArray(old)) return old
        return old.map(q => q.ticker === ticker ? { ...q, ...fund } : q)
      })
      queryClient.setQueryData(['stock-detail', ticker], old =>
        old ? { ...old, ...fund } : old
      )
    }
  }
}

export function isMarketOpen() {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = et.getDay()
  if (day === 0 || day === 6) return false
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
  }
}

async function fetchFromAPI(symbols) {
  if (TD_KEY) {
    const r = await fetch(`${TD_BASE}/quote?symbol=${symbols.join(',')}&apikey=${TD_KEY}`).then(r => r.json())
    if (r.code === 429) throw new Error('Rate limit — wait a minute and refresh')
    if (r.status === 'error' || r.code >= 400) throw new Error(r.message ?? 'API error')
    const entries = symbols.length === 1 ? [[symbols[0], r]] : Object.entries(r)
    return entries
      .filter(([, q]) => q && typeof q === 'object' && q.close)
      .map(([ticker, q]) => parseQuote(ticker, q))
  }
  // Edge function fallback
  const { data, error } = await supabase.functions.invoke('market-data', { body: { symbols } })
  if (error) throw error
  return data.quotes
}

// Exported so useMarketDataPreload can reuse the same cache-aware path.
// queryClient is optional — pass it to get live UI updates as background stats arrive.
export async function fetchQuotes(symbols, queryClient = null) {
  const { hits, misses } = await getCachedQuotes(symbols)
  let all = hits

  if (misses.length) {
    const fresh = await fetchFromAPI(misses)
    await persistQuotes(fresh)  // price/volume/52W stored; fundamentals preserved if already in DB
    // Read back any fundamentals that survived the upsert (previously stored from /statistics)
    const preserved = await getStoredFundamentals(misses)
    all = [...hits, ...fresh.map(q => preserved[q.ticker] ? { ...q, ...preserved[q.ticker] } : q)]
  }

  // Kick off background statistics fetch for tickers missing any fundamental.
  // !marketCap → never fetched. !beta → has old partial data (only marketCap stored), needs full set.
  // Returns immediately — UI updates ticker-by-ticker as each stat call completes.
  const needsFund = all.filter(q => !q.marketCap || !q.beta).map(q => q.ticker)
  if (needsFund.length) {
    backgroundEnrichFundamentals(needsFund, queryClient).catch(() => {})
  }

  return all
}

export function useQuotes(symbols) {
  const open = isMarketOpen()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['quotes', symbols?.join(',')],
    queryFn: () => fetchQuotes(symbols, queryClient),
    enabled: !!symbols?.length,
    refetchInterval: open ? 5 * 60_000 : false,
    staleTime: open ? 5 * 60_000 : 60 * 60_000,
  })
}
