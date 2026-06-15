// Asset linkification for chat messages.
//
// Hero replies mark every asset the model mentions with square brackets, e.g.
// "I admire [Apple] and [Berkshire Hathaway], especially [BRK.B]." (see the
// hero-chat edge function). This module turns those bracketed entities — and,
// in unbracketed text such as the user's own messages, explicit cashtags /
// known tickers / registry names — into clickable links that open the asset's
// detail page (`/stock/<TICKER>`), the same destination as a Markets search hit.
//
// Each span is either:
//   • TRUSTED  — ticker is known without a network call (registry, the user's
//     holdings/watchlist, or an explicit known cashtag). Links immediately.
//   • VALIDATE — a bracketed entity (or unknown cashtag) whose ticker must be
//     confirmed against live market data before linking. The whole bracketed
//     string is searched as one unit, so multi-word names just work.

// Curated registry of well-known assets: ticker -> recognizable names/aliases.
// Fast path only — anything else still resolves via live validation.
export const ASSET_REGISTRY = [
  { ticker: 'AAPL', names: ['Apple'] },
  { ticker: 'MSFT', names: ['Microsoft'] },
  { ticker: 'NVDA', names: ['NVIDIA', 'Nvidia'] },
  { ticker: 'GOOGL', names: ['Alphabet', 'Google'] },
  { ticker: 'AMZN', names: ['Amazon'] },
  { ticker: 'META', names: ['Facebook'] },
  { ticker: 'TSLA', names: ['Tesla'] },
  { ticker: 'NFLX', names: ['Netflix'] },
  { ticker: 'CRM', names: ['Salesforce'] },
  { ticker: 'NOW', names: ['ServiceNow'] },
  { ticker: 'BRK.B', names: ['Berkshire Hathaway', 'Berkshire'] },
  { ticker: 'JPM', names: ['JPMorgan', 'JP Morgan'] },
  { ticker: 'V', names: ['Visa'] },
  { ticker: 'DIS', names: ['Disney'] },
  { ticker: 'KO', names: ['Coca-Cola', 'Coca Cola'] },
  { ticker: 'SPY', names: ['S&P 500', 'S&P500'] },
  { ticker: 'QQQ', names: ['NASDAQ 100', 'Nasdaq 100'] },
  { ticker: 'VTI', names: ['Total Stock Market'] },
  { ticker: 'VOO', names: ['Vanguard S&P 500'] },
  { ticker: 'BTC', names: ['Bitcoin'] },
  { ticker: 'ETH', names: ['Ethereum'] },
]

// Uppercase tokens that look like tickers but are common words/acronyms in
// investing prose — never matched as a bare ticker in unbracketed text.
const STOPWORDS = new Set([
  'A', 'I', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'IF', 'IN', 'IS', 'IT',
  'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE', 'AM',
  'NEW', 'NOW', 'CEO', 'CFO', 'CTO', 'IPO', 'ETF', 'ETFS', 'AI', 'USA', 'GDP',
  'PE', 'EPS', 'API', 'URL', 'OK', 'ALL', 'AND', 'THE', 'FOR', 'YOU', 'BUY',
  'ROI', 'YOY', 'EBIT', 'FDA', 'SEC', 'IRA',
])

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// UPPERCASE ticker -> canonical display ticker, merging the registry with the
// user's own tickers (positions + watchlist) so personal symbols always link.
function buildTickerMap(knownTickers) {
  const map = new Map()
  for (const a of ASSET_REGISTRY) map.set(a.ticker.toUpperCase(), a.ticker)
  for (const t of knownTickers) {
    if (!t) continue
    const up = String(t).toUpperCase()
    if (!map.has(up)) map.set(up, up)
  }
  return map
}

// Lazily-built, cached name lookup (registry is static).
let NAME_LOOKUP = null   // lowercased name -> ticker
let NAME_REGEX = null
function buildNameMatcher() {
  if (NAME_LOOKUP) return
  NAME_LOOKUP = new Map()
  const names = []
  for (const a of ASSET_REGISTRY) {
    for (const n of a.names) {
      NAME_LOOKUP.set(n.toLowerCase(), a.ticker)
      names.push(n)
    }
  }
  names.sort((x, y) => y.length - x.length)   // longest first
  NAME_REGEX = new RegExp(`(?<![\\w$])(${names.map(escapeRegExp).join('|')})(?![\\w])`, 'gi')
}

// Resolve a bare entity string (bracket inner, cashtag symbol) against the
// fast-path tables. Returns a known ticker, or null if it needs validation.
function fastResolve(entity, tickerMap) {
  const stripped = entity.trim().replace(/^\$/, '')
  const byName = NAME_LOOKUP.get(stripped.toLowerCase())
  if (byName) return byName
  const up = stripped.toUpperCase()
  if (tickerMap.has(up)) return tickerMap.get(up)
  return null
}

/**
 * Analyze `text` and return ordered, non-overlapping asset spans.
 * @param {string} text
 * @param {{ knownTickers?: string[] }} [opts] user holdings/watchlist tickers
 * @returns {Array<{ start:number, end:number, display:string,
 *   ticker?:string, query?:string, vtype?:'entity'|'ticker' }>}
 */
export function findAssetSpans(text, { knownTickers = [] } = {}) {
  if (!text || typeof text !== 'string') return []
  buildNameMatcher()
  const tickerMap = buildTickerMap(knownTickers)
  const cand = []
  const brackets = []   // ranges to exclude from the unbracketed scan

  // 1. Bracketed entities marked by the LLM — the primary mechanism. The whole
  //    inner string (incl. multi-word names) is one unit; brackets are stripped.
  const bracket = /\[([^[\]]+)\]/g
  for (let m; (m = bracket.exec(text)); ) {
    const inner = m[1].trim()
    if (!inner) continue
    const span = { start: m.index, end: m.index + m[0].length, display: inner, priority: 0 }
    brackets.push([span.start, span.end])
    const known = fastResolve(inner, tickerMap)
    if (known) cand.push({ ...span, ticker: known })            // registry / owned — free
    else if (looksLikeTicker(inner)) cand.push({ ...span, vtype: 'ticker', query: inner })
    // Otherwise it's a company name with no ticker: strip the brackets and render
    // it as plain text. We deliberately do NOT fuzzy-search names against market
    // data — only ticker-shaped mentions are validated (one cheap exact lookup).
    else cand.push({ ...span })
  }

  const inBracket = (s, e) => brackets.some(([bs, be]) => s < be && e > bs)
  const pushTrusted = (start, end, ticker, priority) => {
    if (!inBracket(start, end)) cand.push({ start, end, display: text.slice(start, end), ticker, priority })
  }

  // 2. Unbracketed text (user messages, legacy replies): precise, low-noise.
  //    Cashtags — known -> trusted, unknown -> validate as a ticker.
  const cashtag = /\$([A-Za-z]{1,5}(?:\.[A-Za-z])?)\b/g
  for (let m; (m = cashtag.exec(text)); ) {
    const up = m[1].toUpperCase()
    const start = m.index, end = m.index + m[0].length
    if (inBracket(start, end)) continue
    if (tickerMap.has(up)) cand.push({ start, end, display: m[0], ticker: tickerMap.get(up), priority: 1 })
    else cand.push({ start, end, display: m[0], vtype: 'ticker', query: up, priority: 4 })
  }
  // Registry company / common names.
  for (let m; (m = NAME_REGEX.exec(text)); ) {
    const ticker = NAME_LOOKUP.get(m[1].toLowerCase())
    if (ticker) pushTrusted(m.index, m.index + m[0].length, ticker, 2)
  }
  // Bare tickers. Known symbols (registry / the user's own) link immediately;
  // unknown ALL-CAPS tokens that *look* like a ticker (>=3 letters) are flagged
  // for live validation and link only if they resolve to a real symbol. Both
  // skip common words / finance acronyms (STOPWORDS).
  const bare = /(?<![\w$])([A-Z]{1,5}(?:\.[A-Z])?)(?![\w])/g
  for (let m; (m = bare.exec(text)); ) {
    const up = m[1].toUpperCase()
    if (STOPWORDS.has(up)) continue
    const start = m.index, end = m.index + m[0].length
    if (tickerMap.has(up)) { pushTrusted(start, end, tickerMap.get(up), 3); continue }
    if (up.replace('.', '').length >= 3 && !inBracket(start, end)) {
      cand.push({ start, end, display: m[0], vtype: 'ticker', query: up, priority: 5 })
    }
  }

  // Resolve overlaps: earlier start wins; then higher priority (lower number);
  // then longer span. Greedily keep non-overlapping spans.
  cand.sort((a, b) =>
    a.start - b.start || a.priority - b.priority || (b.end - b.start) - (a.end - a.start))

  const chosen = []
  let lastEnd = -1
  for (const c of cand) {
    if (c.start < lastEnd) continue
    const { priority, ...span } = c   // eslint-disable-line no-unused-vars
    chosen.push(span)
    lastEnd = c.end
  }
  return chosen
}

// Stock-symbol format check: an ALL-CAPS ticker-shaped token (1–5 letters, with
// an optional ".X" class suffix, e.g. AAPL, GH, BRK.B). Used to decide which
// bracketed mentions are worth a market-data lookup — company names are not.
export function looksLikeTicker(s) {
  return /^[A-Z]{1,5}(?:\.[A-Z])?$/.test(String(s).trim())
}

// Stable cache key for a validation candidate.
export function resolutionKey(vtype, query) {
  return `${vtype}:${String(query).toUpperCase()}`
}
