// Asset linkification for chat messages.
//
// Scans free-form chat text (hero replies + user questions) for stock / ETF /
// crypto mentions and reports their positions so the UI can render them as
// clickable links. A click opens the same destination as a Markets search hit:
// the stock detail page (`/stock/<TICKER>`).
//
// Detection produces two kinds of spans:
//   • TRUSTED — we already know the ticker without a network call: explicit
//     cashtags for known symbols, recognized company/common names from the
//     registry, and bare tickers that match the registry or the user's own
//     holdings/watchlist. These link immediately.
//   • VALIDATE — a candidate that *looks* like an asset but isn't in the
//     registry: an unknown cashtag, an unknown ALL-CAPS token, or a
//     capitalized proper noun (e.g. "Palantir"). These carry a `query` to be
//     confirmed against live market data before linking (see
//     `lib/resolveSymbol.js` + `hooks/useAssetResolution.js`).

// Curated registry of well-known assets: ticker -> recognizable names/aliases.
// This is a fast-path only — anything outside it can still link via live
// validation; the registry just avoids a lookup for the obvious cases.
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
// investing prose — never treated as a bare-ticker candidate.
const STOPWORDS = new Set([
  'A', 'I', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'IF', 'IN', 'IS', 'IT',
  'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE', 'AM',
  'NEW', 'NOW', 'CEO', 'CFO', 'CTO', 'IPO', 'ETF', 'ETFS', 'AI', 'USA', 'GDP',
  'PE', 'EPS', 'API', 'URL', 'OK', 'ALL', 'AND', 'THE', 'FOR', 'YOU', 'BUY',
  'ROI', 'YOY', 'EBIT', 'FDA', 'SEC', 'IRA', 'Q1', 'Q2', 'Q3', 'Q4',
])

// Frequent English words that are often capitalized (sentence starts, etc.) but
// are not companies. Filtering them keeps us from spending a live lookup on
// obvious non-assets. Live validation is the real filter — this is just thrift.
const COMMON_WORDS = new Set([
  'the', 'and', 'but', 'for', 'nor', 'yet', 'this', 'that', 'these', 'those',
  'with', 'from', 'into', 'over', 'your', 'you', 'they', 'them', 'their',
  'what', 'when', 'where', 'why', 'how', 'who', 'which', 'while', 'would',
  'could', 'should', 'will', 'shall', 'may', 'might', 'must', 'can', 'are',
  'was', 'were', 'has', 'have', 'had', 'his', 'her', 'its', 'our', 'one',
  'two', 'three', 'many', 'much', 'more', 'most', 'some', 'any', 'all', 'not',
  'now', 'then', 'than', 'here', 'there', 'about', 'after', 'before', 'because',
  'think', 'thought', 'consider', 'remember', 'imagine', 'look', 'looking',
  'great', 'good', 'better', 'best', 'value', 'price', 'market', 'markets',
  'stock', 'stocks', 'share', 'shares', 'company', 'companies', 'business',
  'invest', 'investing', 'investment', 'money', 'cash', 'risk', 'return',
  'returns', 'growth', 'income', 'asset', 'assets', 'fund', 'funds', 'index',
  'portfolio', 'dividend', 'dividends', 'earnings', 'profit', 'loss', 'losses',
  'buy', 'sell', 'hold', 'own', 'long', 'short', 'term', 'years', 'year',
  'first', 'last', 'next', 'never', 'always', 'every', 'each', 'both',
  'warren', 'buffett', 'charlie', 'munger', 'peter', 'lynch', 'sage',
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

/**
 * Analyze `text` and return ordered, non-overlapping asset spans.
 * @param {string} text
 * @param {{ knownTickers?: string[] }} [opts] user holdings/watchlist tickers
 * @returns {Array<{ start:number, end:number,
 *   kind:'trusted'|'validate', ticker?:string, query?:string,
 *   vtype?:'cashtag'|'ticker'|'name' }>}
 */
export function findAssetSpans(text, { knownTickers = [] } = {}) {
  if (!text || typeof text !== 'string') return []
  buildNameMatcher()
  const tickerMap = buildTickerMap(knownTickers)
  const cand = []

  // 1. Cashtags: $AAPL, $BRK.B. Known symbol -> trusted; otherwise validate.
  const cashtag = /\$([A-Za-z]{1,5}(?:\.[A-Za-z])?)\b/g
  for (let m; (m = cashtag.exec(text)); ) {
    const up = m[1].toUpperCase()
    const span = { start: m.index, end: m.index + m[0].length }
    if (tickerMap.has(up)) cand.push({ ...span, kind: 'trusted', ticker: tickerMap.get(up), priority: 0 })
    else cand.push({ ...span, kind: 'validate', vtype: 'cashtag', query: up, priority: 3 })
  }

  // 2. Registry company / common names -> trusted.
  for (let m; (m = NAME_REGEX.exec(text)); ) {
    const ticker = NAME_LOOKUP.get(m[1].toLowerCase())
    if (ticker) cand.push({ start: m.index, end: m.index + m[0].length, kind: 'trusted', ticker, priority: 1 })
  }

  // 3. Bare uppercase tokens. Known -> trusted; unknown 2-5 letters -> validate.
  const bare = /(?<![\w$])([A-Z]{1,5}(?:\.[A-Z])?)(?![\w])/g
  for (let m; (m = bare.exec(text)); ) {
    const up = m[1].toUpperCase()
    if (STOPWORDS.has(up)) continue
    const span = { start: m.index, end: m.index + m[0].length }
    if (tickerMap.has(up)) cand.push({ ...span, kind: 'trusted', ticker: tickerMap.get(up), priority: 2 })
    else if (m[1].length >= 2) cand.push({ ...span, kind: 'validate', vtype: 'ticker', query: up, priority: 4 })
  }

  // 4. Capitalized proper nouns (e.g. "Palantir") -> validate as a name.
  const proper = /(?<![\w$])([A-Z][a-z]{2,})(?![\w])/g
  for (let m; (m = proper.exec(text)); ) {
    if (COMMON_WORDS.has(m[1].toLowerCase())) continue
    cand.push({ start: m.index, end: m.index + m[0].length, kind: 'validate', vtype: 'name', query: m[1], priority: 5 })
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

// Stable cache key for a validation candidate.
export function resolutionKey(vtype, query) {
  return `${vtype}:${String(query).toUpperCase()}`
}
