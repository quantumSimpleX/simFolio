import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const API_KEY = Deno.env.get('TWELVEDATA_API_KEY') ?? ''
const BASE    = 'https://api.twelvedata.com'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL_MS = 15_000

// Twelve Data interval + outputsize per chart range
const RANGE_MAP: Record<string, { interval: string; outputsize: number }> = {
  '1W':  { interval: '1day',  outputsize: 7   },
  '1M':  { interval: '1day',  outputsize: 30  },
  '3M':  { interval: '1day',  outputsize: 90  },
  '1Y':  { interval: '1week', outputsize: 52  },
  'All': { interval: '1month',outputsize: 60  },
}

async function td(path: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams({ ...params, apikey: API_KEY } as Record<string, string>).toString()
  const res = await fetch(`${BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`TwelveData ${res.status}: ${path}`)
  return res.json()
}

async function getQuote(ticker: string) {
  const cacheKey = `q:${ticker}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const q = await td('/quote', { symbol: ticker })
  if (q.status === 'error') throw new Error(q.message)

  const price  = parseFloat(q.close)
  const prev   = parseFloat(q.previous_close)
  const change = parseFloat(q.change)
  const pct    = parseFloat(q.percent_change)

  const data = {
    ticker,
    price,
    change,
    pct,
    high:      parseFloat(q.high),
    low:       parseFloat(q.low),
    open:      parseFloat(q.open),
    prev,
    pos:       change >= 0,
    name:      q.name ?? ticker,
    exchange:  q.exchange ?? '',
    industry:  '',
    marketCap: 0,
    logo:      '',
  }

  cache.set(cacheKey, { data, ts: Date.now() })
  return data
}

async function getCandles(ticker: string, range: string) {
  const { interval, outputsize } = RANGE_MAP[range] ?? RANGE_MAP['3M']
  const r = await td('/time_series', { symbol: ticker, interval, outputsize })
  if (r.status === 'error') throw new Error(r.message)

  // Twelve Data returns newest-first — reverse to get chronological order
  const values: Array<{ datetime: string; close: string }> = (r.values ?? []).reverse()
  return values.map(v => ({
    t: Math.floor(new Date(v.datetime).getTime() / 1000),
    c: parseFloat(v.close),
  }))
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

    const quotes = await Promise.all((symbols as string[]).map(getQuote))
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
