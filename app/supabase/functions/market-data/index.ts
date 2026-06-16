import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Service-role client — writes fundamentals to the cache server-side, bypassing
// RLS and any client-side write fragility. Env vars are injected automatically.
const db = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const YF_BASE = 'https://query2.finance.yahoo.com'
// A real browser UA is required — Yahoo rejects generic agents on the cookie/crumb handshake
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' }

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// ── Yahoo crumb + cookie handshake ────────────────────────────────────────────
// quoteSummary requires a crumb tied to a session cookie. Fetch once and reuse;
// refresh on expiry (401). Cached per warm edge-function instance.
let crumbCache: { crumb: string; cookie: string; ts: number } | null = null
const CRUMB_TTL_MS = 30 * 60 * 1000

async function getCrumb(force = false): Promise<{ crumb: string; cookie: string }> {
  if (!force && crumbCache && Date.now() - crumbCache.ts < CRUMB_TTL_MS) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie }
  }
  const cookieRes = await fetch('https://fc.yahoo.com', { headers: YF_HEADERS })
  const rawCookie = cookieRes.headers.get('set-cookie') ?? ''
  const m = rawCookie.match(/A[13]=[^;]+/)              // the session cookie Yahoo ties the crumb to
  const cookie = m ? m[0] : rawCookie.split(';')[0]
  const crumbRes = await fetch(`${YF_BASE}/v1/test/getcrumb`, {
    headers: { ...YF_HEADERS, Cookie: cookie },
  })
  const crumb = (await crumbRes.text()).trim()
  crumbCache = { crumb, cookie, ts: Date.now() }
  return { crumb, cookie }
}

// Fetches one quoteSummary, transparently refreshing the crumb if it expired.
async function quoteSummary(symbol: string, modules: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { crumb, cookie } = await getCrumb(attempt > 0)
    const url = `${YF_BASE}/v10/finance/quoteSummary/${symbol}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`
    const res = await fetch(url, { headers: { ...YF_HEADERS, Cookie: cookie } })
    if (res.status === 401 && attempt === 0) continue  // stale crumb → force-refresh and retry once
    if (!res.ok) return null
    const data = await res.json()
    return data.quoteSummary?.result?.[0] ?? null
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const raw = (v: any) => (typeof v?.raw === 'number' ? v.raw : 0)

// ── Fundamentals (marketCap, P/E, EPS, beta, dividend yield) ──────────────────
interface Fundamentals {
  ticker: string; marketCap: number; peRatio: number; eps: number; beta: number; dividendYield: number
}

async function getFundamentals(symbols: string[]): Promise<Fundamentals[]> {
  return Promise.all(symbols.map(async (ticker) => {
    try {
      const r = await quoteSummary(ticker, 'price,summaryDetail,defaultKeyStatistics')
      if (!r) return { ticker, marketCap: 0, peRatio: 0, eps: 0, beta: 0, dividendYield: 0 }
      const pr = r.price ?? {}, sd = r.summaryDetail ?? {}, dks = r.defaultKeyStatistics ?? {}
      return {
        ticker,
        marketCap:     raw(pr.marketCap)     || raw(sd.marketCap),
        peRatio:       raw(sd.trailingPE),
        eps:           raw(dks.trailingEps),
        beta:          raw(sd.beta)          || raw(dks.beta),
        dividendYield: raw(sd.dividendYield),
      }
    } catch {
      return { ticker, marketCap: 0, peRatio: 0, eps: 0, beta: 0, dividendYield: 0 }
    }
  }))
}

// Writes the non-zero fundamentals to the cache, one upsert covering all tickers.
// Each field is written only when present so a missing metric never nulls a good one.
async function persistFundamentals(rows: Fundamentals[]) {
  const patches = rows.map((r) => {
    const p: Record<string, unknown> = { ticker: r.ticker }
    if (r.marketCap     > 0) p.market_cap     = r.marketCap
    if (r.peRatio       > 0) p.pe_ratio       = r.peRatio
    if (r.eps             )  p.eps            = r.eps
    if (r.beta          > 0) p.beta           = r.beta
    if (r.dividendYield > 0) p.dividend_yield = r.dividendYield
    return p
  }).filter((p) => Object.keys(p).length > 1)
  if (!patches.length) return
  const { error } = await db.from('market_data_cache').upsert(patches, { onConflict: 'ticker' })
  if (error) console.error('[market-data] persistFundamentals error:', error.message)
  else       console.log('[market-data] persisted fundamentals:', patches.map((p) => p.ticker).join(', '))
}

// ── Quotes (price + fundamentals in one shot) ─────────────────────────────────
// Yahoo's old /v7/finance/quote is dead (401), so quotes also come from quoteSummary.
async function getQuotes(symbols: string[]) {
  return (await Promise.all(symbols.map(async (ticker) => {
    const r = await quoteSummary(ticker, 'price,summaryDetail,defaultKeyStatistics')
    if (!r) return null
    const pr = r.price ?? {}, sd = r.summaryDetail ?? {}, dks = r.defaultKeyStatistics ?? {}
    const change = raw(pr.regularMarketChange)
    return {
      ticker,
      price:     raw(pr.regularMarketPrice),
      change,
      pct:       raw(pr.regularMarketChangePercent) * 100,
      high:      raw(pr.regularMarketDayHigh),
      low:       raw(pr.regularMarketDayLow),
      open:      raw(pr.regularMarketOpen),
      prev:      raw(pr.regularMarketPreviousClose),
      pos:       change >= 0,
      name:      pr.longName || pr.shortName || null,
      exchange:  pr.exchangeName ?? '',
      volume:    raw(pr.regularMarketVolume),
      avgVolume: raw(sd.averageVolume) || raw(sd.averageDailyVolume10Day),
      week52Low:  raw(sd.fiftyTwoWeekLow),
      week52High: raw(sd.fiftyTwoWeekHigh),
      marketCap:     raw(pr.marketCap) || raw(sd.marketCap),
      peRatio:       raw(sd.trailingPE),
      eps:           raw(dks.trailingEps),
      beta:          raw(sd.beta) || raw(dks.beta),
      dividendYield: raw(sd.dividendYield),
    }
  }))).filter(Boolean)
}

// US-listing exchange codes Yahoo returns in search results.
const US_EXCHANGES = new Set(['NMS', 'NYQ', 'NGM', 'NCM', 'NIM', 'ASE', 'PCX', 'BATS', 'OQB', 'OQX', 'PNK'])
// Map Yahoo quoteType -> the instrument_type the client's matchRows expects.
const QUOTE_TYPE: Record<string, string> = { EQUITY: 'Common Stock', ETF: 'ETF' }

// Free Yahoo symbol search (no crumb needed). Normalized to the same row shape
// the client's matchRows expects from TwelveData: { symbol, instrument_name,
// instrument_type, country }. Throws on a non-OK response so the client can
// fall back to its secondary provider (e.g. when Yahoo rate-limits).
async function searchSymbols(query: string) {
  // Yahoo's search wants every query token to appear in the asset name and
  // treats "&" and connector words ("and", "the", "of"…) as literal tokens, so
  // a name written "ARK Autonomous Technology and Robotics ETF" matches nothing
  // against the canonical "… & Robotics ETF". Drop "&" and connector words so
  // only the distinctive tokens drive the search.
  const term = String(query)
    .replace(/&/g, ' ')
    .replace(/\b(and|the|of|for|to)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || String(query)
  const url = `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(term)}&quotesCount=10&newsCount=0&listsCount=0`
  const res = await fetch(url, { headers: YF_HEADERS })
  if (!res.ok) throw new Error(`Yahoo search ${res.status}`)
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes = (data.quotes ?? []) as any[]
  return quotes.map((q) => ({
    symbol: q.symbol,
    instrument_name: q.longname || q.shortname || q.symbol,
    instrument_type: QUOTE_TYPE[q.quoteType] ?? q.quoteType ?? '',
    country: US_EXCHANGES.has(q.exchange) ? 'United States' : (q.exchange ?? ''),
  }))
}

async function getCandles(ticker: string, range: string) {
  const { interval, range: yfRange } = RANGE_MAP[range] ?? RANGE_MAP['3M']
  const url = `${YF_BASE}/v8/finance/chart/${ticker}?interval=${interval}&range=${yfRange}`
  const res = await fetch(url, { headers: YF_HEADERS })
  if (!res.ok) throw new Error(`Yahoo Finance chart ${res.status}`)
  const data = await res.json()
  const result = data.chart?.result?.[0]
  if (!result) throw new Error('No chart data')
  const timestamps: number[] = result.timestamp ?? []
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
  return timestamps.map((t, i) => ({ t, c: closes[i] })).filter(v => v.c != null)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { symbols, candles, range, fundamentals, search } = await req.json()

    if (search) {
      return json({ data: await searchSymbols(String(search)) })
    }
    if (fundamentals && symbols?.length) {
      const data = await getFundamentals(symbols as string[])
      await persistFundamentals(data)   // write server-side (service role) — authoritative
      return json({ fundamentals: data })
    }
    if (candles && symbols?.length === 1) {
      return json({ candles: await getCandles(symbols[0], range ?? '3M') })
    }
    return json({ quotes: await getQuotes(symbols as string[]) })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
