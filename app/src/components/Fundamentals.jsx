// Inline fundamentals summary (market cap · P/E · EPS · β) used as the
// subtitle of a watchlist StockRow on the Markets screen.
import { TermUnderline } from './Primitives'

function fmtMktCap(v) {
  if (!v) return null
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
  return null
}

export function Fundamentals({ q }) {
  if (!q) return '—'
  const cap = fmtMktCap(q.marketCap)
  const metrics = [
    cap            ? { label: null,  value: cap,                  color: 'text-ink-700'  } : null,
    q.peRatio > 0  ? { label: 'P/E', value: q.peRatio.toFixed(1), color: 'text-ame-600'  } : null,
    q.eps          ? { label: 'EPS', value: q.eps.toFixed(2),     color: 'text-aqua-600' } : null,
    q.beta         ? { label: 'β',   value: q.beta.toFixed(2),    color: 'text-gold'     } : null,
  ].filter(Boolean)
  if (!metrics.length) return '—'
  return metrics.map((m, i) => (
    <span key={m.label ?? 'cap'}>
      {i > 0 && <span className="mx-0.5 text-ink-200">·</span>}
      {m.label && <span className="text-ink-400"><TermUnderline>{m.label}</TermUnderline>:</span>}
      <span className={`font-semibold ${m.color}`}>{m.value}</span>
    </span>
  ))
}
