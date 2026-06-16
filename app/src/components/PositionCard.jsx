import { cn } from '../lib/utils'
import { Eyebrow, TermUnderline } from './Primitives'

// "Your position" summary card on StockDetail.
export function PositionCard({ position }) {
  return (
    <div className="rounded-card border border-ame-100 bg-ame-50 px-4 py-3.5">
      <Eyebrow><TermUnderline>Your position</TermUnderline></Eyebrow>
      <div className="mt-1.5 font-sans text-sm text-ink-700">
        {parseFloat(position.total_qty)} shares · avg ${parseFloat(position.average_cost_basis).toFixed(2)}
      </div>
      <div className={cn('mt-0.5 font-sans text-sm', position.pos ? 'text-aqua-600' : 'text-red')}>
        {position.pos ? '+' : '−'}${Math.abs(position.pnl).toFixed(2)} ({position.pos ? '+' : '−'}{Math.abs(position.pct).toFixed(1)}%)
      </div>
    </div>
  )
}
