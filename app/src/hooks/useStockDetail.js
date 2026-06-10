import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { isMarketOpen } from './useQuotes'
import { getCachedQuotes, persistQuotes, getStoredFundamentals } from '../lib/marketCache'

const TD_KEY  = import.meta.env.VITE_TWELVEDATA_API_KEY
const TD_BASE = 'https://api.twelvedata.com'
// In dev, Yahoo is reached via the Vite proxy (no CORS headers on their API).
const YF_BASE = import.meta.env.DEV ? '/yf' : 'https://query2.finance.yahoo.com'

const TD_RANGE_MAP = {
  '1W':  { interval: '1day',   outputsize: 7  },
  '1M':  { interval: '1day',   outputsize: 30 },
  '3M':  { interval: '1day',   outputsize: 90 },
  '1Y':  { interval: '1week',  outputsize: 52 },
  'All': { interval: '1month', outputsize: 60 },
}

const YF_RANGE_MAP = {
  '1W':  { interval: '1d',  range: '5d'  },
  '1M':  { interval: '1d',  range: '1mo' },
  '3M':  { interval: '1d',  range: '3mo' },
  '1Y':  { interval: '1wk', range: '1y'  },
  'All': { interval: '1mo', range: '5y'  },
}

// Fetches fundamentals for one ticker from the edge function (Yahoo quoteSummary,
// server-side — free, no CORS, no rate limit). Returns null on any failure.
async function fetchStatsDirect(ticker) {
  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { fundamentals: true, symbols: [ticker] },
    })
    if (error) return null
    const f = data?.fundamentals?.[0]
    if (!f?.marketCap) return null
    return {
      marketCap:     f.marketCap,
      peRatio:       f.peRatio,
      eps:           f.eps,
      beta:          f.beta,
      dividendYield: f.dividendYield,
    }
  } catch {
    return null
  }
}

async function fetchDetail(ticker, queryClient = null) {
  const { hits, misses } = await getCachedQuotes([ticker])
  let quote
  if (!misses.length) {
    quote = { ...hits[0], industry: '', logo: '' }
  } else {
    if (TD_KEY) {
      try {
        const r = await fetch(`${TD_BASE}/quote?symbol=${ticker}&apikey=${TD_KEY}`).then(r => r.json())
        if (r.status !== 'error' && r.code !== 429 && !(r.code >= 400)) {
          const price = parseFloat(r.close), prev = parseFloat(r.previous_close)
          const change = price - prev, pct = prev > 0 ? (change / prev) * 100 : 0
          const fw = r.fifty_two_week ?? {}
          quote = {
            ticker, price, change, pct,
            high: parseFloat(r.high), low: parseFloat(r.low), open: parseFloat(r.open), prev,
            pos: change >= 0, name: r.name || null, exchange: r.exchange ?? '',
            volume: parseInt(r.volume) || 0, avgVolume: parseInt(r.average_volume) || 0,
            week52Low: parseFloat(fw.low) || 0, week52High: parseFloat(fw.high) || 0,
            marketCap: 0, peRatio: 0, eps: 0, beta: 0, dividendYield: 0,
            industry: '', logo: '',
          }
        } else {
          console.warn('[StockDetail] TD rate limited or error — falling back to edge function')
        }
      } catch {
        console.warn('[StockDetail] TD fetch failed — falling back to edge function')
      }
    }
    if (!quote) {
      const { data, error } = await supabase.functions.invoke('market-data', { body: { symbols: [ticker] } })
      if (error) throw error
      quote = data.quotes?.[0] ? { ...data.quotes[0], industry: '', logo: '' } : null
    }
    if (quote) await persistQuotes([quote])
    // Restore any previously stored fundamentals for this ticker
    const preserved = await getStoredFundamentals([ticker])
    if (preserved[ticker]) quote = { ...quote, ...preserved[ticker] }
  }

  // If fundamentals are missing, fetch them in the background. The edge function
  // persists to the DB cache itself (service role); we only patch the RQ cache here.
  if (quote && (!quote.marketCap || !quote.beta)) {
    fetchStatsDirect(ticker).then(fund => {
      if (!fund || !queryClient) return
      queryClient.setQueryData(['stock-detail', ticker], old =>
        old ? { ...old, ...fund } : old
      )
    }).catch(() => {})
  }

  return quote
}

async function fetchCandlesFromYF(ticker, range) {
  const { interval, range: yfRange } = YF_RANGE_MAP[range] ?? YF_RANGE_MAP['3M']
  const res = await fetch(`${YF_BASE}/v8/finance/chart/${ticker}?interval=${interval}&range=${yfRange}`)
  if (!res.ok) throw new Error(`YF chart ${res.status}`)
  const json = await res.json()
  const result = json.chart?.result?.[0]
  if (!result) throw new Error('No chart data')
  const timestamps = result.timestamp ?? []
  const closes = result.indicators?.quote?.[0]?.close ?? []
  const candles = timestamps.map((t, i) => ({ t, c: closes[i] })).filter(v => v.c != null)
  if (!candles.length) throw new Error('Empty candle data')
  return candles
}

async function fetchCandlesFromTD(ticker, range) {
  if (!TD_KEY) throw new Error('No TD key')
  const { interval, outputsize } = TD_RANGE_MAP[range] ?? TD_RANGE_MAP['3M']
  const r = await fetch(`${TD_BASE}/time_series?symbol=${ticker}&interval=${interval}&outputsize=${outputsize}&apikey=${TD_KEY}`).then(r => r.json())
  if (r.status === 'error') throw new Error(r.message)
  const values = (r.values ?? []).reverse()
  if (!values.length) throw new Error('No candle data')
  return values.map(v => ({ t: Math.floor(new Date(v.datetime).getTime() / 1000), c: parseFloat(v.close) }))
}

export async function fetchCandles(ticker, range) {
  // Try Yahoo Finance v8/chart first (no credit cost)
  try {
    return await fetchCandlesFromYF(ticker, range)
  } catch (e) {
    console.warn('[Candles] YF failed, falling back to TD:', e.message)
  }
  // Reliable fallback: Twelve Data time_series (1 credit, cached 5h in React Query)
  return fetchCandlesFromTD(ticker, range)
}

export function useStockDetail(ticker) {
  const open = isMarketOpen()
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['stock-detail', ticker],
    queryFn: () => fetchDetail(ticker, queryClient),
    enabled: !!ticker,
    staleTime: open ? 5 * 60_000 : 60 * 60_000,
  })
}

export function useCandles(ticker, range = '3M') {
  return useQuery({
    queryKey: ['candles', ticker, range],
    queryFn: () => fetchCandles(ticker, range),
    enabled: !!ticker,
    staleTime: 60_000,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
  })
}
