import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
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

export function usePortfolioCandles(positions, cashBalance, range = 'All') {
  const results = useQueries({
    queries: positions.map(p => ({
      queryKey: ['candles', p.ticker, range],
      queryFn: () => fetchCandles(p.ticker, range),
      enabled: positions.length > 0,
      staleTime: 60_000,
      retry: 1,
    })),
  })

  // In RQ v5 isPending = "no data yet"; covers both the pre-fetch frame and active fetch.
  // Fall back to checking !isSuccess && !isError for maximum compatibility.
  const isLoading = results.length > 0 && results.some(r => !r.isSuccess && !r.isError)

  const candles = useMemo(() => {
    if (positions.length === 0) return []

    const series = results
      .map((r, i) => ({ data: r.data, qty: parseFloat(positions[i].total_qty) }))
      .filter(s => s.data?.length >= 2)

    if (!series.length) return []

    // Use longest series as the timeline reference; look up nearest price from all others.
    const ref = series.reduce((a, b) => a.data.length >= b.data.length ? a : b)
    const others = series.map(s => ({
      sorted: [...s.data].sort((a, b) => a.t - b.t),
      qty: s.qty,
    }))

    return ref.data.map(refPt => ({
      t: refPt.t,
      c: others.reduce((sum, { sorted, qty }) => sum + nearest(sorted, refPt.t) * qty, cashBalance ?? 0),
    }))
  }, [results, positions, cashBalance])

  const isError = !isLoading && results.length > 0 && results.every(r => r.isError)

  return { candles, isLoading, isError }
}
