import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const YF_BASE = 'https://query2.finance.yahoo.com'
// Standard UA avoids bot-detection rejections from Yahoo
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; SimFolio/1.0)' }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RANGE_MAP: Record<string, { interval: string; range: string }> = {
  '1W':  { interval: '1d',  range: '5d'  },
  '1M':  { interval: '1d',  range: '1mo' },
  '3M':  { interval: '1d',  range: '3mo' },
  '1Y':  { interval: '1wk', range: '1y'  },
  'All': { interval: '1mo', range: '5y'  },
}

// Short dedup cache to prevent hammering YF on burst requests within one edge-function instance
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL_MS = 10_000

async function getQuotes(symbols: string[]) {
  const cacheKey = `q:${[...symbols].sort().join(',')}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data as object[]

  const url = `${YF_BASE}/v7/finance/quote?symbols=${symbols.join(',')}`
  const res = await fetch(url, { headers: YF_HEADERS })
  if (!res.ok) throw new Error(`Yahoo Finance quote ${res.status}`)
  const json = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes = (json.quoteResponse?.result ?? []).map((q: Record<string, any>) => ({
    ticker:    q.symbol,
    price:     q.regularMarketPrice     ?? 0,
    change:    q.regularMarketChange    ?? 0,
    pct:       q.regularMarketChangePercent ?? 0,
    high:      q.regularMarketDayHigh   ?? 0,
    low:       q.regularMarketDayLow    ?? 0,
    open:      q.regularMarketOpen      ?? 0,
    prev:      q.regularMarketPreviousClose ?? 0,
    pos:       (q.regularMarketChange   ?? 0) >= 0,
    name:          q.shortName || q.longName || null,
    exchange:      q.exchange                      ?? '',
    marketCap:     q.marketCap                     ?? 0,
    peRatio:       q.trailingPE                    ?? 0,
    eps:           q.epsTrailingTwelveMonths        ?? 0,
    beta:          q.beta                          ?? 0,
    dividendYield: q.trailingAnnualDividendYield   ?? 0,
  }))

  cache.set(cacheKey, { data: quotes, ts: Date.now() })
  return quotes
}

async function getCandles(ticker: string, range: string) {
  const { interval, range: yfRange } = RANGE_MAP[range] ?? RANGE_MAP['3M']
  const url = `${YF_BASE}/v8/finance/chart/${ticker}?interval=${interval}&range=${yfRange}`
  const res = await fetch(url, { headers: YF_HEADERS })
  if (!res.ok) throw new Error(`Yahoo Finance chart ${res.status}`)
  const json = await res.json()

  const result = json.chart?.result?.[0]
  if (!result) throw new Error('No chart data')

  const timestamps: number[] = result.timestamp ?? []
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []

  return timestamps
    .map((t, i) => ({ t, c: closes[i] }))
    .filter(v => v.c != null)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { symbols, candles, range } = await req.json()

    if (candles && symbols?.length === 1) {
      const data = await getCandles(symbols[0], range ?? '3M')
      return new Response(JSON.stringify({ candles: data }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const quotes = await getQuotes(symbols as string[])
    return new Response(JSON.stringify({ quotes }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
