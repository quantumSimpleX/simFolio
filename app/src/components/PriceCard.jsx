import { cn } from '../lib/utils'
import { MktStatus } from './Primitives'

// Price header card for the Buy screen: hero price + day change on the left,
// ticker/exchange + market status on the right.
export function PriceCard({ price, change, pct, pos, isLoading, ticker, exchange, canExec, mobile }) {
  return (
    <div className="flex items-center justify-between rounded-card border border-ink-100 bg-white px-5 py-4">
      <div>
        <div className={cn('font-display font-bold tracking-[-0.02em] text-ink-900', mobile ? 'text-[28px]' : 'text-[32px]')}>
          {isLoading ? '…' : `$${price.toLocaleString()}`}
        </div>
        <div className={cn('mt-[3px] font-sans text-[13px]', pos ? 'text-aqua-600' : 'text-red')}>
          {!isLoading ? `${pos ? '+' : ''}${change?.toFixed(2)} · ${pos ? '+' : ''}${pct?.toFixed(1)}% today` : '—'}
        </div>
      </div>
      <div className="text-right">
        <div className="font-sans text-xs text-ink-400">{ticker} · {exchange}</div>
        <div className="mt-1 flex justify-end"><MktStatus open={canExec}/></div>
      </div>
    </div>
  )
}
