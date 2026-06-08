import { useState, useEffect } from 'react'

const API_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY

export function useSymbolSearch(query) {
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${API_KEY}`
        )
        const json = await res.json()
        setResults(
          (json.data ?? [])
            .filter(d => (d.type === 'Common Stock' || d.type === 'ETF') && d.country === 'United States')
            .slice(0, 6)
        )
      } catch {
        setResults([])
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  return results
}
