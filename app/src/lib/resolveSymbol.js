// Confirms whether a chat-text candidate (an unknown cashtag, ALL-CAPS token,
// or capitalized proper noun) is a real tradable asset, using the same
// TwelveData symbol_search the Markets page uses. Returns the canonical ticker
// to link to, or null if it isn't a recognized US stock/ETF.
//
// Results (including negatives) are memoized in localStorage so a given word is
// only ever looked up once — symbols are stable and the free API tier is rate
// limited.

const API_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY
const LS_KEY = 'simfolio_asset_resolve'

function loadCache() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function saveCache(cache) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cache)) } catch { /* quota / disabled */ }
}

// Pick the ticker a candidate resolves to from filtered symbol_search rows.
export function matchRows(rows, query, type) {
  const us = rows.filter(d =>
    (d.instrument_type === 'Common Stock' || d.instrument_type === 'ETF') &&
    d.country === 'United States')
  if (type === 'ticker' || type === 'cashtag') {
    const up = String(query).toUpperCase()
    const hit = us.find(r => String(r.symbol).toUpperCase() === up)
    return hit ? String(hit.symbol).toUpperCase() : null
  }
  // name: require the instrument name to start with the candidate (word-ish),
  // falling back to a contains match — avoids linking incidental words.
  const q = String(query).toLowerCase()
  const hit = us.find(r => (r.instrument_name || '').toLowerCase().startsWith(q)) ||
              us.find(r => (r.instrument_name || '').toLowerCase().includes(q))
  return hit ? String(hit.symbol).toUpperCase() : null
}

export async function resolveSymbol(query, type) {
  const key = `${type}:${String(query).toUpperCase()}`
  const cache = loadCache()
  if (key in cache) return cache[key]

  let ticker = null
  try {
    const res = await fetch(
      `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${API_KEY}`,
    )
    const json = await res.json()
    ticker = matchRows(json.data ?? [], query, type)
  } catch {
    /* network / parse error — leave ticker null */
  }

  cache[key] = ticker
  saveCache(cache)
  return ticker
}
