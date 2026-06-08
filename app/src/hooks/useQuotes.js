import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const TD_KEY  = import.meta.env.VITE_TWELVEDATA_API_KEY
const TD_BASE = 'https://api.twelvedata.com'

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
  return { ticker, price, change, pct, high: parseFloat(q.high), low: parseFloat(q.low), open: parseFloat(q.open), prev, pos: change >= 0, name: q.name || null, exchange: q.exchange ?? '' }
}

async function fetchQuotes(symbols) {
  if (TD_KEY) {
    const r = await fetch(`${TD_BASE}/quote?symbol=${symbols.join(',')}&apikey=${TD_KEY}`).then(r => r.json())
    if (r.code === 429) throw new Error('Rate limit — wait a minute and refresh')
    if (r.status === 'error' || r.code >= 400) throw new Error(r.message ?? 'API error')
    // Single symbol → object; multiple symbols → { AAPL: {...}, MSFT: {...} }
    const entries = symbols.length === 1 ? [[symbols[0], r]] : Object.entries(r)
    return entries
      .filter(([, q]) => q && typeof q === 'object' && q.close)
      .map(([ticker, q]) => parseQuote(ticker, q))
  }
  const { data, error } = await supabase.functions.invoke('market-data', { body: { symbols } })
  if (error) throw error
  return data.quotes
}

export function useQuotes(symbols) {
  const open = isMarketOpen()
  return useQuery({
    queryKey: ['quotes', symbols?.join(',')],
    queryFn: () => fetchQuotes(symbols),
    enabled: !!symbols?.length,
    refetchInterval: open ? 5 * 60_000 : false,
    staleTime: open ? 5 * 60_000 : 60 * 60_000,
  })
}
