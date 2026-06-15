import { useNavigate } from 'react-router-dom'
import { splitTextWithAssets } from '../lib/assetLinks'

// Renders chat text with any stock/ETF/crypto mention turned into a clickable,
// underlined link. Clicking opens the asset's detail page — the same place a
// Markets search hit lands (`/stock/<TICKER>`). Pass `extraTickers` (the user's
// holdings + watchlist) so personal symbols always light up; pass `onAssetClick`
// to override navigation (used in tests).
export function AssetText({ text, extraTickers = [], onAssetClick }) {
  const navigate = useNavigate()
  const segments = splitTextWithAssets(text, { extraTickers })
  const handle = onAssetClick ?? (ticker => navigate(`/stock/${ticker}`))

  return segments.map((seg, i) =>
    seg.ticker ? (
      <span
        key={i}
        role="link"
        tabIndex={0}
        data-ticker={seg.ticker}
        onClick={e => { e.stopPropagation(); handle(seg.ticker) }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle(seg.ticker) }
        }}
        className="cursor-pointer font-semibold not-italic text-ame-400 underline decoration-ame-400 underline-offset-2"
      >
        {seg.text}
      </span>
    ) : (
      <span key={i}>{seg.text}</span>
    ),
  )
}
