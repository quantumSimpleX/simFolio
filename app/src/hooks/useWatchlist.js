import { useState, useEffect } from 'react'

const KEY = 'simfolio_watchlist'
const DEFAULTS = ['MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL']

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored ? JSON.parse(stored) : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const add    = t => setWatchlist(prev => prev.includes(t.toUpperCase()) ? prev : [...prev, t.toUpperCase()])
  const remove = t => setWatchlist(prev => prev.filter(x => x !== t.toUpperCase()))
  const has    = t => watchlist.includes(t.toUpperCase())

  return { watchlist, addToWatchlist: add, removeFromWatchlist: remove, isWatching: has }
}
