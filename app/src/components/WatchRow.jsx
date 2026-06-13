import { StockRow } from './StockRow'
import { Fundamentals } from './Fundamentals'

function fmtPrice(v) { return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

// A watchlist entry on the Markets screen: ticker + fundamentals + quote.
export function WatchRow({ sym, q, owned, onClick }) {
  return (
    <StockRow
      ticker={sym}
      name={q?.name}
      subtitle={<Fundamentals q={q} />}
      badge={owned && <div className="flex-shrink-0 rounded-input border border-ame-100 bg-ame-50 px-1.5 py-px font-sans text-[10px] font-semibold text-ame-600">Owned</div>}
      rightTop={q ? fmtPrice(q.price) : '—'}
      rightBottom={q ? `${q.pos ? '+' : ''}${q.change?.toFixed(2)} (${q.pos ? '+' : ''}${q.pct?.toFixed(1)}%)` : '—'}
      rightBottomPos={q ? !!q.pos : null}
      onClick={onClick}
    />
  )
}
