import { supabase } from './supabase'

const CACHE_MAX_AGE_MS = 5 * 60 * 60 * 1000 // 5 hours

function rowToQuote(row) {
  return {
    ticker:        row.ticker,
    price:         parseFloat(row.price),
    change:        parseFloat(row.change_amount),
    pct:           parseFloat(row.change_pct),
    high:          parseFloat(row.high),
    low:           parseFloat(row.low),
    open:          parseFloat(row.open_price),
    prev:          parseFloat(row.prev_close),
    pos:           parseFloat(row.change_amount) >= 0,
    name:          row.name ?? null,
    exchange:      row.exchange ?? '',
    volume:        row.volume        ? Number(row.volume)        : 0,
    avgVolume:     row.avg_volume    ? Number(row.avg_volume)    : 0,
    week52Low:     row.week52_low    ? parseFloat(row.week52_low)  : 0,
    week52High:    row.week52_high   ? parseFloat(row.week52_high) : 0,
    // fundamentals — fetched once via /statistics, preserved across quote refreshes
    marketCap:     row.market_cap    ? Number(row.market_cap)    : 0,
    peRatio:       row.pe_ratio      ? parseFloat(row.pe_ratio)  : 0,
    eps:           row.eps           ? parseFloat(row.eps)       : 0,
    beta:          row.beta          ? parseFloat(row.beta)      : 0,
    dividendYield: row.dividend_yield ? parseFloat(row.dividend_yield) : 0,
  }
}

function quoteToRow(q) {
  const row = {
    ticker:        q.ticker,
    price:         q.price,
    change_amount: q.change,
    change_pct:    q.pct,
    high:          q.high,
    low:           q.low,
    open_price:    q.open,
    prev_close:    q.prev,
    name:          q.name ?? null,
    exchange:      q.exchange ?? '',
    fetched_at:    new Date().toISOString(),
  }
  // Price-tier fields — always present from /quote
  if (q.volume    > 0) row.volume     = q.volume
  if (q.avgVolume > 0) row.avg_volume = q.avgVolume
  if (q.week52Low  > 0) row.week52_low  = q.week52Low
  if (q.week52High > 0) row.week52_high = q.week52High
  // Fundamentals — omit when 0 so ON CONFLICT DO UPDATE preserves existing DB values
  if (q.marketCap     > 0) row.market_cap     = q.marketCap
  if (q.peRatio       > 0) row.pe_ratio       = q.peRatio
  if (q.eps           > 0) row.eps            = q.eps
  if (q.beta          > 0) row.beta           = q.beta
  if (q.dividendYield > 0) row.dividend_yield = q.dividendYield
  return row
}

// Returns stored fundamentals for tickers — no time check, they survive quote refreshes.
export async function getStoredFundamentals(tickers) {
  if (!tickers?.length) return {}
  const { data } = await supabase
    .from('market_data_cache')
    .select('ticker, market_cap, pe_ratio, eps, beta, dividend_yield')
    .in('ticker', tickers)
  const map = {}
  data?.forEach(r => {
    map[r.ticker] = {
      marketCap:     r.market_cap     ? Number(r.market_cap)         : 0,
      peRatio:       r.pe_ratio       ? parseFloat(r.pe_ratio)       : 0,
      eps:           r.eps            ? parseFloat(r.eps)            : 0,
      beta:          r.beta           ? parseFloat(r.beta)           : 0,
      dividendYield: r.dividend_yield ? parseFloat(r.dividend_yield) : 0,
    }
  })
  return map
}

// Returns cached quotes younger than 5 hours and the list of tickers that were not found.
export async function getCachedQuotes(tickers) {
  if (!tickers?.length) return { hits: [], misses: [] }

  const cutoff = new Date(Date.now() - CACHE_MAX_AGE_MS).toISOString()
  const { data, error } = await supabase
    .from('market_data_cache')
    .select('*')
    .in('ticker', tickers)
    .gte('fetched_at', cutoff)

  if (error) {
    console.warn('[MarketCache] DB read error:', error.message)
    return { hits: [], misses: tickers }
  }

  const hitSet = new Set()
  const hits   = []
  const incomplete = []

  ;(data ?? []).forEach(r => {
    if (r.price != null) {
      hitSet.add(r.ticker)
      hits.push(rowToQuote(r))
    } else {
      incomplete.push(r.ticker)
    }
  })

  const misses = [...tickers.filter(t => !hitSet.has(t)), ...incomplete]

  if (hits.length)      console.log('[MarketCache] DB hit:', hits.map(h => h.ticker).join(', '))
  if (incomplete.length) console.log('[MarketCache] DB incomplete → API:', incomplete.join(', '))
  if (misses.length)    console.log('[MarketCache] DB miss → API:', misses.join(', '))

  return { hits, misses }
}

// Upserts quotes into the cache with the current timestamp.
export async function persistQuotes(quotes) {
  if (!quotes?.length) return
  const rows = quotes.map(quoteToRow)
  console.log('[MarketCache] Persisting:', quotes.map(q => `${q.ticker}=${q.name ?? 'NO_NAME'}`).join(', '))
  const { error } = await supabase
    .from('market_data_cache')
    .upsert(rows, { onConflict: 'ticker' })
  if (error) console.warn('[MarketCache] DB write error:', error.message)
  else       console.log('[MarketCache] Persisted to DB:', quotes.map(q => q.ticker).join(', '))
}
