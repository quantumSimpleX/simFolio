import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchCandles } from './useStockDetail'

// Binary-search nearest price in a timestamp-sorted candle array.
// Handles any minor timestamp offsets across tickers without intersection logic.
function nearest(sorted, targetT) {
  let lo = 0, hi = sorted.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid].t < targetT) lo = mid + 1
    else hi = mid
  }
  const a = sorted[Math.max(0, lo - 1)]
  const b = sorted[Math.min(sorted.length - 1, lo)]
  return (Math.abs(a.t - targetT) <= Math.abs(b.t - targetT) ? a : b).c
}

// Full fill history, oldest first. Each row: { t, ticker, side, qty, price, fee }.
function useTransactions() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['portfolio-txns', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('executions')
        .select('filled_qty, execution_price, fees_deducted, executed_at, orders(ticker, side)')
        .eq('user_id', user.id)
        .order('executed_at', { ascending: true })
      if (error) throw error
      return (data ?? [])
        .filter(e => e.orders?.ticker)
        .map(e => ({
          t:      Math.floor(new Date(e.executed_at).getTime() / 1000),
          ticker: e.orders.ticker,
          side:   e.orders.side,
          qty:    parseFloat(e.filled_qty),
          price:  parseFloat(e.execution_price),
          fee:    parseFloat(e.fees_deducted ?? 0),
        }))
    },
    enabled: !!user,
    staleTime: 60_000,
  })
}

export function usePortfolioCandles(positions, cashBalance, range = 'All') {
  const { data: txns } = useTransactions()

  // Chart every ticker the user has ever traded (sold-out ones still shape
  // history), plus current positions as a fallback when history is empty.
  const tickers = useMemo(() => {
    const set = new Set(positions.map(p => p.ticker))
    ;(txns ?? []).forEach(tx => set.add(tx.ticker))
    return [...set]
  }, [positions, txns])

  const results = useQueries({
    queries: tickers.map(ticker => ({
      queryKey: ['candles', ticker, range],
      queryFn: () => fetchCandles(ticker, range),
      enabled: tickers.length > 0,
      staleTime: 60_000,
      retry: 1,
    })),
  })

  const isLoading = results.length > 0 && results.some(r => !r.isSuccess && !r.isError)

  const candles = useMemo(() => {
    if (tickers.length === 0) return []

    const series = results
      .map((r, i) => ({ ticker: tickers[i], data: r.data }))
      .filter(s => s.data?.length >= 2)
      .map(s => ({ ...s, sorted: [...s.data].sort((a, b) => a.t - b.t) }))

    if (!series.length) return []

    // Use longest series as the timeline reference; look up nearest price from all others.
    const ref = series.reduce((a, b) => a.data.length >= b.data.length ? a : b)

    const currentQty = {}
    positions.forEach(p => { currentQty[p.ticker] = parseFloat(p.total_qty) })

    if (txns?.length) {
      // Transaction-aware reconstruction, anchored on the current state and
      // walked backward: undo every fill that happened after time t to get
      // the shares held and cash balance at t.
      const newestFirst = [...txns].reverse()
      return ref.data.map(refPt => {
        const t = refPt.t
        const qtyAt = { ...currentQty }
        let cashAt = cashBalance ?? 0
        for (const tx of newestFirst) {
          if (tx.t <= t) break
          if (tx.side === 'BUY') {
            qtyAt[tx.ticker] = (qtyAt[tx.ticker] ?? 0) - tx.qty
            cashAt += tx.qty * tx.price + tx.fee
          } else {
            qtyAt[tx.ticker] = (qtyAt[tx.ticker] ?? 0) + tx.qty
            cashAt -= tx.qty * tx.price - tx.fee
          }
        }
        const holdings = series.reduce((sum, s) => {
          const q = qtyAt[s.ticker] ?? 0
          return q > 0 ? sum + nearest(s.sorted, t) * q : sum
        }, 0)
        return { t, c: cashAt + holdings }
      })
    }

    // No history available — assume current holdings across the whole range.
    return ref.data.map(refPt => ({
      t: refPt.t,
      c: series.reduce((sum, s) => sum + nearest(s.sorted, refPt.t) * (currentQty[s.ticker] ?? 0), cashBalance ?? 0),
    }))
  }, [results, tickers, positions, cashBalance, txns])

  const isError = !isLoading && results.length > 0 && results.every(r => r.isError)

  return { candles, isLoading, isError }
}
