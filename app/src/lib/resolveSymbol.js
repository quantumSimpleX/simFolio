// Confirms whether a chat-text candidate (an unknown cashtag, ALL-CAPS token,
// or bracketed company/fund name) is a real tradable asset, returning the
// canonical ticker to link to, or null if it isn't a recognized US stock/ETF.
//
// Primary source is Yahoo Finance (free, same provider as our quotes), reached
// through the `market-data` edge function because Yahoo blocks direct browser
// calls. If Yahoo errors or rate-limits, we fall back to TwelveData's
// symbol_search (a direct, CORS-friendly browser call).
//
// Results (including negatives) are memoized in localStorage so a given word is
// only ever looked up once — symbols are stable and the free tiers are rate limited.
import { supabase } from '@/lib/supabase'

const API_KEY = import.meta.env.VITE_TWELVEDATA_API_KEY
const LS_KEY = 'simfolio_asset_resolve'

// Primary: Yahoo symbol search via the market-data edge function. Throws when
// the function errors (incl. Yahoo rate-limit) so resolveSymbol can fall back.
async function searchYahoo(query) {
  const { data, error } = await supabase.functions.invoke('market-data', { body: { search: query } })
  if (error) throw error
  return Array.isArray(data?.data) ? data.data : []
}

// Fallback: TwelveData symbol_search, a direct browser fetch.
async function searchTwelveData(query) {
  const res = await fetch(
    `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${API_KEY}`,
  )
  const json = await res.json()
  return Array.isArray(json?.data) ? json.data : []
}

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
// Connector words that carry no identifying weight when matching a name.
const CONNECTORS = new Set(['and', 'the', 'of', 'a', 'an', 'for', 'to'])

// Tokenize a name for comparison: lowercase, treat "&" as "and", split on any
// non-alphanumeric run, and drop connector words. Word order, punctuation, and
// "&" vs "and" no longer matter — only the set of meaningful tokens.
function nameTokens(s) {
  return new Set(
    String(s).toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/)
      .filter(t => t && !CONNECTORS.has(t)),
  )
}

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

  // entity: prefer an exact symbol, else a token-subset name match — every
  // meaningful token in the query must appear in the candidate's name. The rows
  // arrive in the provider's relevance order, so the first such row is the best
  // match. This tolerates "&" vs "and", word order, punctuation, and extra
  // descriptors (e.g. "Inc", "ETF") on either side.
  if (bySymbol) return String(bySymbol.symbol).toUpperCase()
  const qt = [...nameTokens(cleaned)]
  if (!qt.length) return null
  const byName = us.find(r => {
    const nt = nameTokens(r.instrument_name)
    return qt.every(t => nt.has(t))
  })
  return byName ? String(byName.symbol).toUpperCase() : null
}

export async function resolveSymbol(query, type) {
  const key = `${type}:${String(query).toUpperCase()}`
  const cache = loadCache()
  if (key in cache) return cache[key]

  let rows
  try {
    rows = await searchYahoo(query)              // primary
  } catch {
    try {
      rows = await searchTwelveData(query)       // fallback on Yahoo error / rate-limit
    } catch {
      rows = []                                  // both failed — treat as no match
    }
  }

  const ticker = matchRows(rows, query, type)
  cache[key] = ticker
  saveCache(cache)
  return ticker
}
