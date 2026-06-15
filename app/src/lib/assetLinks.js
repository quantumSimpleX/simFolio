// Asset linkification for chat messages.
//
// Scans free-form chat text (hero replies + user questions) for stock / ETF /
// crypto mentions and reports their positions so the UI can render them as
// clickable links. A click opens the same destination as a Markets search hit:
// the stock detail page (`/stock/<TICKER>`).
//
// Three detection signals, in priority order:
//   1. Cashtags — an explicit `$AAPL` is always treated as an asset.
//   2. Company / common names — distinctive aliases from the registry below.
//   3. Bare tickers — uppercase tokens that match a known ticker (registry or
//      the user's own holdings/watchlist), excluding common English/finance
//      acronyms so prose like "AI" or "CEO" never lights up.

// Curated registry of common assets: ticker -> recognizable names/aliases.
// Names must be distinctive enough to match case-insensitively without false
// positives (e.g. "Apple", not "now").
export const ASSET_REGISTRY = [
  // Stocks
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
  // ETFs
  { ticker: 'SPY', names: ['S&P 500', 'S&P500'] },
  { ticker: 'QQQ', names: ['NASDAQ 100', 'Nasdaq 100'] },
  { ticker: 'VTI', names: ['Total Stock Market'] },
  { ticker: 'VOO', names: ['Vanguard S&P 500'] },
  // Crypto
  { ticker: 'BTC', names: ['Bitcoin'] },
  { ticker: 'ETH', names: ['Ethereum'] },
]

// Uppercase tokens that look like tickers but are common words/acronyms in
// investing prose. Never auto-linked as a bare ticker (a cashtag like `$IT`
// still wins, since that is explicit).
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

// Build a Map of UPPERCASE ticker -> canonical display ticker, merging the
// registry with any extra tickers (e.g. the user's positions + watchlist).
function buildTickerMap(extraTickers) {
  const map = new Map()
  for (const a of ASSET_REGISTRY) map.set(a.ticker.toUpperCase(), a.ticker)
  for (const t of extraTickers) {
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
  // Longest first so "Berkshire Hathaway" wins over "Berkshire".
  names.sort((x, y) => y.length - x.length)
  NAME_REGEX = new RegExp(`(?<![\\w$])(${names.map(escapeRegExp).join('|')})(?![\\w])`, 'gi')
}

/**
 * Find non-overlapping asset mentions in `text`.
 * @param {string} text
 * @param {{ extraTickers?: string[] }} [opts]
 * @returns {Array<{ start:number, end:number, ticker:string }>} ordered by position
 */
export function findAssetMentions(text, { extraTickers = [] } = {}) {
  if (!text || typeof text !== 'string') return []
  buildNameMatcher()
  const tickerMap = buildTickerMap(extraTickers)
  const candidates = []

  // 1. Cashtags: $AAPL, $BRK.B — always linked (explicit), priority 0.
  const cashtag = /\$([A-Za-z]{1,5}(?:\.[A-Za-z])?)\b/g
  for (let m; (m = cashtag.exec(text)); ) {
    const up = m[1].toUpperCase()
    candidates.push({ start: m.index, end: m.index + m[0].length, ticker: tickerMap.get(up) ?? up, priority: 0 })
  }

  // 2. Company / common names, priority 1.
  for (let m; (m = NAME_REGEX.exec(text)); ) {
    const ticker = NAME_LOOKUP.get(m[1].toLowerCase())
    if (ticker) candidates.push({ start: m.index, end: m.index + m[0].length, ticker, priority: 1 })
  }

  // 3. Bare uppercase tickers known to the registry / user, priority 2.
  const bare = /(?<![\w$])([A-Z]{1,5}(?:\.[A-Z])?)(?![\w])/g
  for (let m; (m = bare.exec(text)); ) {
    const up = m[1].toUpperCase()
    if (STOPWORDS.has(up)) continue
    if (!tickerMap.has(up)) continue
    candidates.push({ start: m.index, end: m.index + m[0].length, ticker: tickerMap.get(up), priority: 2 })
  }

  // Resolve overlaps: prefer earlier start, then higher priority (lower number),
  // then longer span. Greedily keep non-overlapping matches.
  candidates.sort((a, b) =>
    a.start - b.start || a.priority - b.priority || (b.end - b.start) - (a.end - a.start))

  const chosen = []
  let lastEnd = -1
  for (const c of candidates) {
    if (c.start < lastEnd) continue
    chosen.push({ start: c.start, end: c.end, ticker: c.ticker })
    lastEnd = c.end
  }
  return chosen
}

/**
 * Split `text` into ordered segments for rendering.
 * @returns {Array<{ text:string, ticker:(string|null) }>} ticker set on asset segments
 */
export function splitTextWithAssets(text, opts) {
  const str = text == null ? '' : String(text)
  const mentions = findAssetMentions(str, opts)
  if (mentions.length === 0) return str ? [{ text: str, ticker: null }] : []

  const out = []
  let cursor = 0
  for (const m of mentions) {
    if (m.start > cursor) out.push({ text: str.slice(cursor, m.start), ticker: null })
    out.push({ text: str.slice(m.start, m.end), ticker: m.ticker })
    cursor = m.end
  }
  if (cursor < str.length) out.push({ text: str.slice(cursor), ticker: null })
  return out
}
