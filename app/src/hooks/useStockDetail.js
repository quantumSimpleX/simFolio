import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { isMarketOpen } from './useQuotes'

const TD_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY
const TD_BASE = 'https://api.twelvedata.com'

const RANGE_MAP = {
  '1W':  { interval: '1day',   outputsize: 7  },
  '1M':  { interval: '1day',   outputsize: 30 },
  '3M':  { interval: '1day',   outputsize: 90 },
  '1Y':  { interval: '1week',  outputsize: 52 },
  'All': { interval: '1month', outputsize: 60 },
}

async function fetchDetail(ticker) {
  if (TD_KEY) {
    const r = await fetch(`${TD_BASE}/quote?symbol=${ticker}&apikey=${TD_KEY}`).then(r => r.json())
    if (r.status === 'error') throw new Error(r.message)
    const price = parseFloat(r.close), prev = parseFloat(r.previous_close)
    const change = price - prev, pct = prev > 0 ? (change / prev) * 100 : 0
    return { ticker, price, change, pct, high: parseFloat(r.high), low: parseFloat(r.low), open: parseFloat(r.open), prev, pos: change >= 0, name: r.name ?? ticker, exchange: r.exchange ?? '', industry: '', marketCap: 0, logo: '' }
  }
  const { data, error } = await supabase.functions.invoke('market-data', { body: { symbols: [ticker] } })
  if (error) throw error
  return data.quotes?.[0] ?? null
}

export async function fetchCandles(ticker, range) {
  if (TD_KEY) {
    const { interval, outputsize } = RANGE_MAP[range] ?? RANGE_MAP['3M']
    const r = await fetch(`${TD_BASE}/time_series?symbol=${ticker}&interval=${interval}&outputsize=${outputsize}&apikey=${TD_KEY}`).then(r => r.json())
    if (r.status === 'error') throw new Error(r.message)
    const values = (r.values ?? []).reverse()
    if (!values.length) throw new Error('No candle data')
    return values.map(v => ({ t: Math.floor(new Date(v.datetime).getTime() / 1000), c: parseFloat(v.close) }))
  }
  const { data, error } = await supabase.functions.invoke('market-data', { body: { symbols: [ticker], candles: true, range } })
  if (error) throw error
  if (!data.candles?.length) throw new Error('No candle data')
  return data.candles
}

export function useStockDetail(ticker) {
  const open = isMarketOpen()
  return useQuery({
    queryKey: ['stock-detail', ticker],
    queryFn: () => fetchDetail(ticker),
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
    retry: 1,
  })
}
