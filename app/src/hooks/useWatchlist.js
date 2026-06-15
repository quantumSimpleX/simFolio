import { useState, useEffect } from 'react'

// Bumped to _v2 so previously-seeded defaults (MSFT/TSLA/…) in old localStorage
// are dropped and users start with an empty watchlist.
const KEY = 'simfolio_watchlist_v2'

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
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
