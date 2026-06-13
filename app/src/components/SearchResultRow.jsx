import { cn } from '../lib/utils'

function fmtPrice(v) { return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

// A row in the Markets search dropdown.
export function SearchResultRow({ r, q, watching, onClick }) {
  return (
    <div onClick={onClick} className="flex cursor-pointer items-center gap-3 border-t border-ink-100 px-3 py-2.5">
      <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-input bg-ink-50 font-sans text-[11px] font-bold text-ink-500">{r.symbol}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="truncate font-sans text-sm font-semibold text-ink-900">{r.instrument_name}</div>
          {watching && <div className="flex-shrink-0 rounded-input border border-ame-100 bg-ame-50 px-[5px] py-px font-sans text-[10px] font-semibold text-ame-600">Watching</div>}
        </div>
        <div className="mt-px font-sans text-[11px] text-ink-400">{r.exchange ?? r.type}</div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="font-sans text-sm font-semibold text-ink-900">{q ? fmtPrice(q.price) : '—'}</div>
        <div className={cn('mt-px font-sans text-xs', q?.pos ? 'text-aqua-600' : 'text-red')}>
          {q ? `${q.pos ? '+' : ''}${q.pct?.toFixed(1)}%` : '—'}
        </div>
      </div>
    </div>
  )
}
