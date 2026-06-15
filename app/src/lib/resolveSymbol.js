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
// `type`:
//   'ticker' / 'cashtag' — match an exact US symbol only.
//   'entity' (a bracketed mention) — try an exact symbol first, then match by
//     company-name prefix/contains; handles both "AAPL" and "Berkshire Hathaway".
export function matchRows(rows, query, type) {
  const us = rows.filter(d =>
    (d.instrument_type === 'Common Stock' || d.instrument_type === 'ETF') &&
    d.country === 'United States')
  const cleaned = String(query).trim().replace(/^\$/, '')

  const up = cleaned.toUpperCase()
  const bySymbol = us.find(r => String(r.symbol).toUpperCase() === up)
  if (type === 'ticker' || type === 'cashtag') {
    return bySymbol ? String(bySymbol.symbol).toUpperCase() : null
  }

  // entity: prefer an exact symbol, else match the instrument name.
  if (bySymbol) return String(bySymbol.symbol).toUpperCase()
  const q = cleaned.toLowerCase()
  const byName = us.find(r => (r.instrument_name || '').toLowerCase().startsWith(q)) ||
                 us.find(r => (r.instrument_name || '').toLowerCase().includes(q))
  return byName ? String(byName.symbol).toUpperCase() : null
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
