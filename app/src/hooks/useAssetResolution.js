import { useQueries } from '@tanstack/react-query'
import { resolveSymbol } from '../lib/resolveSymbol'
import { resolutionKey } from '../lib/assetLinks'

// Resolves a batch of validation candidates (unknown cashtags / tickers /
// proper nouns) to real tickers via the symbol API, deduped and cached by
// React Query (results are also memoized in localStorage). Returns a Map of
// resolutionKey(vtype, query) -> ticker | null (null = pending or not an asset).
export function useAssetResolution(candidates) {
  const seen = new Set()
  const uniq = []
  for (const c of candidates) {
    const key = resolutionKey(c.type, c.query)
    if (seen.has(key)) continue
    seen.add(key)
    uniq.push({ key, query: c.query, type: c.type })
  }

  const results = useQueries({
    queries: uniq.map(c => ({
      queryKey: ['asset-resolve', c.type, String(c.query).toUpperCase()],
      queryFn: () => resolveSymbol(c.query, c.type),
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    })),
  })

  const map = new Map()
  uniq.forEach((c, i) => map.set(c.key, results[i]?.data ?? null))
  return map
}
