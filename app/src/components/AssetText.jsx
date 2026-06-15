import { useNavigate } from 'react-router-dom'
import { findAssetSpans, resolutionKey } from '../lib/assetLinks'
import { useAssetResolution } from '../hooks/useAssetResolution'

// Renders chat text with any stock/ETF/crypto mention turned into a clickable,
// underlined link. Known symbols (registry + the user's holdings/watchlist via
// `extraTickers`, plus explicit cashtags) link immediately; other candidates
// (unknown tickers / company names) are confirmed against live market data and
// only link once validated. Clicking opens the asset's detail page — the same
// place a Markets search hit lands (`/stock/<TICKER>`). Pass `onAssetClick` to
// override navigation (used in tests).
export function AssetText({ text, extraTickers = [], onAssetClick }) {
  const navigate = useNavigate()
  const str = text == null ? '' : String(text)
  const spans = findAssetSpans(str, { knownTickers: extraTickers })

  const toValidate = spans
    .filter(s => s.vtype)
    .map(s => ({ query: s.query, type: s.vtype }))
  const resolved = useAssetResolution(toValidate)

  const handle = onAssetClick ?? (ticker => navigate(`/stock/${ticker}`))

  const nodes = []
  let cursor = 0
  let key = 0
  for (const s of spans) {
    // Emit the raw text before this span (preserves any non-bracket characters).
    if (s.start > cursor) nodes.push(<span key={key++}>{str.slice(cursor, s.start)}</span>)
    cursor = s.end

    const ticker = s.ticker ?? resolved.get(resolutionKey(s.vtype, s.query))
    // The display text strips brackets; show it plain when not (yet) confirmed.
    if (!ticker) { nodes.push(<span key={key++}>{s.display}</span>); continue }

    nodes.push(
      <span
        key={key++}
        role="link"
        tabIndex={0}
        data-ticker={ticker}
        onClick={e => { e.stopPropagation(); handle(ticker) }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle(ticker) }
        }}
        className="cursor-pointer font-semibold not-italic text-ame-400 underline decoration-ame-400 underline-offset-2"
      >
        {s.display}
      </span>,
    )
  }
  if (cursor < str.length) nodes.push(<span key={key}>{str.slice(cursor)}</span>)
  return nodes
}
