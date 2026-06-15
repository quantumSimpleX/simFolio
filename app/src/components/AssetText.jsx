import { useNavigate } from 'react-router-dom'
import { findAssetSpans, resolutionKey } from '../lib/assetLinks'
import { useAssetResolution } from '../hooks/useAssetResolution'

// Split text into markdown-bold segments: "**x**" -> { text:'x', bold:true }.
// Only bold is supported — hero replies are emitted as light markdown.
function splitBold(str) {
  const segs = []
  const re = /\*\*([\s\S]+?)\*\*/g
  let last = 0
  for (let m; (m = re.exec(str)); ) {
    if (m.index > last) segs.push({ text: str.slice(last, m.index), bold: false })
    segs.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < str.length) segs.push({ text: str.slice(last), bold: false })
  return segs
}

// Renders chat text with any stock/ETF/crypto mention turned into a clickable,
// underlined link, and `**bold**` rendered as bold. Known symbols (registry + the
// user's holdings/watchlist via `extraTickers`, plus explicit cashtags) link
// immediately; other candidates (unknown tickers / bracketed company names) are
// confirmed against live market data and only link once validated. Clicking opens
// the asset's detail page (`/stock/<TICKER>`), the same place a Markets search hit
// lands. Pass `onAssetClick` to override navigation (used in tests).
export function AssetText({ text, extraTickers = [], onAssetClick }) {
  const navigate = useNavigate()
  const str = text == null ? '' : String(text)
  const segments = splitBold(str)
  const segSpans = segments.map(seg => findAssetSpans(seg.text, { knownTickers: extraTickers }))

  // One hook call across all segments — gather every validation candidate.
  const toValidate = segSpans.flat()
    .filter(s => s.vtype)
    .map(s => ({ query: s.query, type: s.vtype }))
  const resolved = useAssetResolution(toValidate)

  const handle = onAssetClick ?? (ticker => navigate(`/stock/${ticker}`))

  let key = 0
  const renderSpans = (seg, spans) => {
    const inner = []
    let cursor = 0
    for (const s of spans) {
      if (s.start > cursor) inner.push(<span key={key++}>{seg.slice(cursor, s.start)}</span>)
      cursor = s.end

      const ticker = s.ticker ?? resolved.get(resolutionKey(s.vtype, s.query))
      // The display text strips brackets; show it plain when not (yet) confirmed.
      if (!ticker) { inner.push(<span key={key++}>{s.display}</span>); continue }

      inner.push(
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
    if (cursor < seg.length) inner.push(<span key={key++}>{seg.slice(cursor)}</span>)
    return inner
  }

  const nodes = []
  segments.forEach((seg, i) => {
    const inner = renderSpans(seg.text, segSpans[i])
    if (seg.bold) nodes.push(<strong key={key++} className="font-semibold">{inner}</strong>)
    else nodes.push(...inner)
  })
  return nodes
}
